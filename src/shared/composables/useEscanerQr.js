import { ref, shallowRef } from 'vue'
import QrScanner from 'qr-scanner'

// Worker servido como estático (vue-cli / webpack).
// Requiere: copy node_modules\qr-scanner\qr-scanner-worker.min.js public\
QrScanner.WORKER_PATH = (process.env.BASE_URL || '/') + 'qr-scanner-worker.min.js'

export function useEscanerQr () {
  const escaner = shallowRef(null)
  const pista = shallowRef(null)          // MediaStreamTrack de video
  const videoEl = shallowRef(null)        // referencia al <video> para limpieza

  const error = ref('')
  const activo = ref(false)
  const pausado = ref(false)

  const zoom = ref(1)
  const zoomMin = ref(1)
  const zoomMax = ref(1)

  const tieneFlash = ref(false)
  const flashActivo = ref(false)

  let audioCtx = null

  /* ---------- audio ---------- */

  const tono = (hz, ms, vol = 0.08) => {
    try {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext
        if (!AC) return
        audioCtx = new AC()
      }
      if (audioCtx.state === 'suspended') audioCtx.resume()

      const osc = audioCtx.createOscillator()
      const gan = audioCtx.createGain()
      osc.type = 'square'
      osc.frequency.value = hz
      gan.gain.value = vol
      osc.connect(gan).connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + ms / 1000)
    } catch {
      /* el audio es feedback secundario: nunca debe romper el escaneo */
    }
  }

  const beepOk = () => tono(920, 90)
  const beepError = () => tono(220, 220)

  /* ---------- región de escaneo ---------- */

  const regionEscaneo = (video) => {
    const lado = Math.round(Math.min(video.videoWidth, video.videoHeight) * 0.72)
    return {
      x: Math.round((video.videoWidth - lado) / 2),
      y: Math.round((video.videoHeight - lado) / 2),
      width: lado,
      height: lado,
      downScaledWidth: 500,
      downScaledHeight: 500
    }
  }

  /* ---------- capacidades de la pista ---------- */

  const leerCapacidades = () => {
    const t = pista.value
    if (!t || typeof t.getCapabilities !== 'function') return

    let cap = {}
    try {
      cap = t.getCapabilities() || {}
    } catch {
      // Safari < 16 y algunos WebView lanzan al consultar capacidades
      return
    }

    if (cap.zoom) {
      zoomMin.value = cap.zoom.min ?? 1
      zoomMax.value = Math.min(cap.zoom.max ?? 1, 4)
      const s = t.getSettings?.() || {}
      zoom.value = s.zoom ?? zoomMin.value
    }
    tieneFlash.value = Array.isArray(cap.torch) ? cap.torch.includes(true) : !!cap.torch
  }

  const aplicarZoom = async (valor) => {
    const t = pista.value
    if (!t || zoomMax.value <= 1) return
    const v = Math.min(Math.max(valor, zoomMin.value), zoomMax.value)
    try {
      await t.applyConstraints({ advanced: [{ zoom: v }] })
      zoom.value = v
    } catch {
      /* la cámara rechazó el zoom: se mantiene el valor anterior */
    }
  }

  const alternarFlash = async () => {
    const t = pista.value
    if (!t || !tieneFlash.value) return
    try {
      await t.applyConstraints({ advanced: [{ torch: !flashActivo.value }] })
      flashActivo.value = !flashActivo.value
    } catch {
      // reportó torch pero no lo aplica: ocultamos el botón
      tieneFlash.value = false
      flashActivo.value = false
    }
  }

  /* ---------- ciclo de vida ---------- */

  const iniciarCamara = async (video, alDetectar) => {
    error.value = ''

    if (!video) {
      error.value = 'No se encontró el elemento de video.'
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      error.value = 'La cámara requiere HTTPS. Abre el sitio con https://'
      return
    }

    videoEl.value = video

    try {
      escaner.value = new QrScanner(
        video,
        (r) => {
          const texto = typeof r === 'string' ? r : r?.data
          if (texto) alDetectar(texto)
        },
        {
          maxScansPerSecond: 15,
          highlightScanRegion: false,
          highlightCodeOutline: false,
          preferredCamera: 'environment',
          returnDetailedScanResult: true,
          calculateScanRegion: regionEscaneo
        }
      )

      await escaner.value.start()
      activo.value = true
      pausado.value = false

      pista.value = video.srcObject?.getVideoTracks?.()[0] || null
      leerCapacidades()
    } catch (e) {
      const n = e?.name || ''
      if (n === 'NotAllowedError' || n === 'SecurityError') {
        error.value = 'Permiso de cámara denegado. Habilítalo en el navegador.'
      } else if (n === 'NotFoundError' || n === 'OverconstrainedError') {
        error.value = 'No se detectó ninguna cámara en este dispositivo.'
      } else if (n === 'NotReadableError') {
        error.value = 'La cámara está en uso por otra aplicación.'
      } else {
        error.value = 'No se pudo iniciar la cámara.'
      }
      detenerCamara()
    }
  }

  const pausar = () => {
    if (!escaner.value || pausado.value) return
    escaner.value.pause()
    pausado.value = true
  }

  const reanudar = async () => {
    if (!escaner.value || !pausado.value) return
    try {
      await escaner.value.start()
      pausado.value = false
    } catch {
      /* la pista murió mientras estaba pausada: el usuario reactiva a mano */
    }
  }

  const detenerCamara = () => {
    // Apagar el torch ANTES de soltar la pista, o el LED queda encendido en Android.
    const t = pista.value
    if (flashActivo.value && t) {
      try {
        t.applyConstraints({ advanced: [{ torch: false }] })
          .catch(() => { /* la pista ya se está cerrando */ })
      } catch {
        /* applyConstraints no disponible */
      }
      flashActivo.value = false
    }

    if (escaner.value) {
      try {
        escaner.value.stop()
      } catch {
        /* ya estaba detenido */
      }
      try {
        escaner.value.destroy()
      } catch {
        /* ya estaba destruido */
      }
      escaner.value = null
    }

    // Red de seguridad: si start() falló a medias, el stream puede seguir vivo.
    const stream = videoEl.value?.srcObject
    if (stream?.getTracks) {
      stream.getTracks().forEach((pt) => {
        try {
          pt.stop()
        } catch {
          /* pista ya detenida */
        }
      })
      videoEl.value.srcObject = null
    }

    pista.value = null
    videoEl.value = null
    activo.value = false
    pausado.value = false
    zoom.value = 1
    zoomMin.value = 1
    zoomMax.value = 1
    tieneFlash.value = false
    flashActivo.value = false

    if (audioCtx && audioCtx.state !== 'closed') {
      try {
        audioCtx.close()
      } catch {
        /* contexto ya cerrado por el navegador */
      }
      audioCtx = null
    }
  }

  return {
    iniciarCamara, detenerCamara, pausar, reanudar,
    aplicarZoom, alternarFlash,
    beepOk, beepError,
    zoom, zoomMin, zoomMax,
    tieneFlash, flashActivo,
    error, activo, pausado
  }
}
