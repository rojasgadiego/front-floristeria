/**
 * shared/composables/useEscanerQr.js
 * =========================================================================
 * La cámara del celular como lector de QR, sobre qr-scanner 1.4.
 *
 * Es la mitad "sin pantalla" de EscanerQr.vue, y expone exactamente lo que
 * ese componente usa: el <video>, el estado del visor, las cámaras, la
 * linterna, el zoom y la lectura desde una foto. Antes exponía otra API y
 * el componente llamaba funciones que no existían: la cámara del POS nunca
 * llegaba a abrirse.
 *
 * El worker de decodificación lo carga qr-scanner solo (import dinámico que
 * webpack empaqueta). El viejo `QrScanner.WORKER_PATH` es de la 1.3.
 *
 *   const { video, estado, iniciar, ... } = useEscanerQr({ onCodigo })
 *   <video ref="video" muted playsinline />
 *
 * `onCodigo` puede ser async: mientras no termina, no se lee otro código.
 * =========================================================================
 */

import { ref, shallowRef, onScopeDispose } from 'vue'
import QrScanner from 'qr-scanner'

/* Tras una lectura el visor descansa un momento: en modo continuo, el mismo
   balde sigue en cuadro y se leería diez veces por segundo. */
const ENFRIAMIENTO_MS = 900

/* El mismo código dentro de esta ventana es el mismo balde todavía frente a
   la cámara, no uno nuevo. */
const MISMO_CODIGO_MS = 2500

export function useEscanerQr ({ onCodigo } = {}) {
  const video = ref(null)

  /** 'inicial' | 'abriendo' | 'activo' | 'pausado' | 'error' */
  const estado = ref('inicial')
  /** { nombre, mensaje } del último fallo, o null */
  const error = ref(null)
  const enfriando = ref(false)

  const camaras = ref([])
  const camaraId = ref(null)

  const tieneLuz = ref(false)
  const luzEncendida = ref(false)

  const zoom = ref(1)
  const zoomMin = ref(1)
  const zoomMax = ref(1)

  const escaner = shallowRef(null)

  let ocupado = false
  let ultimoTexto = ''
  let ultimoEn = 0
  let tmrEnfriar = null

  /* ---------- Lecturas ---------- */

  const alLeer = async (resultado) => {
    const texto = String(typeof resultado === 'string' ? resultado : resultado?.data || '').trim()
    if (!texto || ocupado || enfriando.value) return
    if (texto === ultimoTexto && Date.now() - ultimoEn < MISMO_CODIGO_MS) return

    ocupado = true
    try {
      await onCodigo?.(texto)
    } finally {
      ocupado = false
      ultimoTexto = texto
      ultimoEn = Date.now()
      enfriando.value = true
      clearTimeout(tmrEnfriar)
      tmrEnfriar = setTimeout(() => { enfriando.value = false }, ENFRIAMIENTO_MS)
    }
  }

  /* El recuadro de lectura: el 70 % central. Leer el cuadro entero hace
     que tome el QR del balde de al lado. */
  const regionEscaneo = (v) => {
    const lado = Math.round(Math.min(v.videoWidth, v.videoHeight) * 0.7)
    return {
      x: Math.round((v.videoWidth - lado) / 2),
      y: Math.round((v.videoHeight - lado) / 2),
      width: lado,
      height: lado,
      downScaledWidth: 480,
      downScaledHeight: 480
    }
  }

  /* ---------- Errores ---------- */

  /* qr-scanner a veces rechaza con un string ("Camera not found.") en vez
     de un Error. Se normaliza a lo que entiende EscanerQr.vue. */
  const normalizarFalla = (e) => {
    const mensaje = typeof e === 'string' ? e : (e?.message || '')
    let nombre = e?.name || ''
    if (!nombre && /not found|no camera/i.test(mensaje)) nombre = 'NotFoundError'
    if (!nombre && /permission|denied/i.test(mensaje)) nombre = 'NotAllowedError'
    return { nombre, mensaje: mensaje || 'No se pudo abrir la cámara.' }
  }

  /* ---------- Capacidades de la cámara abierta ---------- */

  const pista = () => video.value?.srcObject?.getVideoTracks?.()[0] || null

  const leerCapacidades = async () => {
    try {
      tieneLuz.value = await escaner.value.hasFlash()
    } catch {
      tieneLuz.value = false
    }
    luzEncendida.value = false

    zoom.value = 1
    zoomMin.value = 1
    zoomMax.value = 1

    const t = pista()
    if (!t || typeof t.getCapabilities !== 'function') return
    try {
      const cap = t.getCapabilities() || {}
      if (cap.zoom) {
        zoomMin.value = cap.zoom.min ?? 1
        zoomMax.value = Math.min(cap.zoom.max ?? 1, 4)
        zoom.value = t.getSettings?.().zoom ?? zoomMin.value
      }
    } catch {
      /* Safari viejo y algunos WebView lanzan al consultar capacidades */
    }
  }

  /* ---------- Ciclo de vida ---------- */

  const iniciar = async () => {
    error.value = null

    if (!navigator.mediaDevices?.getUserMedia) {
      error.value = { nombre: 'SecurityError', mensaje: 'insecure: la cámara requiere https' }
      estado.value = 'error'
      return
    }
    if (!video.value) return

    estado.value = 'abriendo'
    try {
      if (!escaner.value) {
        escaner.value = new QrScanner(video.value, alLeer, {
          returnDetailedScanResult: true,
          preferredCamera: camaraId.value || 'environment',
          maxScansPerSecond: 12,
          highlightScanRegion: false,
          highlightCodeOutline: false,
          calculateScanRegion: regionEscaneo
        })
      }

      await escaner.value.start()
      estado.value = 'activo'

      /* Con el permiso ya dado, los nombres de las cámaras sí vienen. */
      try {
        camaras.value = await QrScanner.listCameras(true)
      } catch {
        camaras.value = []
      }
      await leerCapacidades()
    } catch (e) {
      error.value = normalizarFalla(e)
      estado.value = 'error'
      destruir()
    }
  }

  const pausar = async () => {
    if (!escaner.value || estado.value !== 'activo') return
    try {
      await escaner.value.pause()
    } catch {
      /* ya estaba detenido */
    }
    luzEncendida.value = false
    estado.value = 'pausado'
  }

  const reanudar = async () => {
    if (!escaner.value) return iniciar()
    try {
      await escaner.value.start()
      estado.value = 'activo'
      await leerCapacidades()
    } catch (e) {
      error.value = normalizarFalla(e)
      estado.value = 'error'
    }
  }

  const alternarLuz = async () => {
    if (!escaner.value || !tieneLuz.value) return
    try {
      await escaner.value.toggleFlash()
      luzEncendida.value = escaner.value.isFlashOn()
    } catch {
      /* dijo tener linterna pero no la enciende: se oculta el botón */
      tieneLuz.value = false
      luzEncendida.value = false
    }
  }

  const cambiarCamara = async (id) => {
    if (!escaner.value || !id) return
    try {
      await escaner.value.setCamera(id)
      camaraId.value = id
      await leerCapacidades()
    } catch (e) {
      error.value = normalizarFalla(e)
    }
  }

  const aplicarZoom = async (valor) => {
    const t = pista()
    if (!t || zoomMax.value <= 1) return
    const v = Math.min(Math.max(valor, zoomMin.value), zoomMax.value)
    try {
      await t.applyConstraints({ advanced: [{ zoom: v }] })
      zoom.value = v
    } catch {
      /* la cámara rechazó el zoom: se queda con el anterior */
    }
  }

  /**
   * Lee un QR desde una foto: para la etiqueta mojada o arrugada que la
   * cámara en vivo no toma. Devuelve true si encontró un código.
   */
  const leerImagen = async (archivo) => {
    try {
      const r = await QrScanner.scanImage(archivo, { returnDetailedScanResult: true })
      const texto = String(r?.data || '').trim()
      if (!texto) return false
      ultimoTexto = ''   // una foto es intencional: no se descarta por repetida
      await alLeer(texto)
      return true
    } catch {
      return false
    }
  }

  const destruir = () => {
    clearTimeout(tmrEnfriar)
    if (!escaner.value) return
    try {
      /* La linterna se apaga antes de soltar la cámara: en Android el LED
         quedaba prendido. */
      if (luzEncendida.value) escaner.value.turnFlashOff()
    } catch {
      /* ya se estaba cerrando */
    }
    try {
      escaner.value.destroy()
    } catch {
      /* ya destruido */
    }
    escaner.value = null
    luzEncendida.value = false
  }

  /* El modal del POS se cierra con v-if: al desmontarse el componente se
     suelta la cámara sola. */
  onScopeDispose(destruir)

  return {
    video, estado, error, enfriando,
    camaras, camaraId, tieneLuz, luzEncendida, zoom, zoomMax,
    iniciar, pausar, reanudar, alternarLuz, cambiarCamara, aplicarZoom, leerImagen
  }
}
