<template>
  <div class="escaner">
    <!-- El campo va primero y con el foco puesto: los lectores de código
         teclean y mandan Enter, así que si el cursor no está acá, el código
         se escribe en cualquier otra parte. -->
    <div class="campo-codigo" :class="{ leyendo: camara }">
      <span aria-hidden="true">🏷️</span>
      <input ref="entrada" v-model="codigo" :placeholder="camara ? 'Apunta al código…' : 'Escanea o escribe el código'"
        aria-label="Código de lote o partida" autocomplete="off" spellcheck="false" @keyup.enter="buscar">
      <span v-if="buscando" class="spinner" aria-hidden="true"></span>
      <button v-else-if="codigo" class="btn-icono chico" @click="limpiar" aria-label="Limpiar">✕</button>
    </div>

    <div class="acciones">
      <button v-if="!camara" class="btn btn-linea" :disabled="buscando" @click="abrirCamara">
        📷 Usar la cámara
      </button>
      <button v-else class="btn btn-linea" @click="cerrarCamara">
        Cerrar cámara
      </button>

      <button class="btn" :disabled="!codigo || buscando" @click="buscar">
        {{ buscando ? 'Buscando…' : 'Buscar' }}
      </button>
    </div>

    <!-- El visor solo aparece si se pidió la cámara: tenerlo siempre
         encendido gasta batería y enciende la luz del teléfono sin motivo. -->
    <div v-if="camara" class="visor">
      <video ref="video" playsinline muted></video>
      <div class="mira" aria-hidden="true"></div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <p v-if="!camara && !soportaCamara" class="ayuda">
      Este equipo no permite usar la cámara desde el navegador. Escribe el
      código que aparece bajo el QR de la etiqueta.
    </p>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

export default {
  name: 'EscanerCodigo',
  emits: ['leido'],

  setup(_, { emit }) {
    const codigo = ref('')
    const camara = ref(false)
    const buscando = ref(false)
    const error = ref('')
    const entrada = ref(null)
    const video = ref(null)

    /* BarcodeDetector es nativo en Chrome y Edge. Donde no está queda el
       tipeo manual: es preferible eso a cargar una librería de 300 KB que
       casi nadie va a usar. */
    const soportaCamara = typeof window !== 'undefined' && 'BarcodeDetector' in window

    let stream = null
    let detector = null
    let bucle = null

    onMounted(async () => {
      await nextTick()
      entrada.value?.focus()
    })

    onUnmounted(() => cerrarCamara())

    /**
     * Emite el código leído. Quien lo recibe decide qué hacer con él; este
     * componente solo sabe leer.
     *
     * `escaneado` distingue la cámara del tipeo: es el dato que después
     * permite ver quién registra con el balde en la mano y quién no.
     */
    const emitir = (valor, escaneado) => {
      buscando.value = true
      emit('leido', { codigo: valor.trim(), escaneado })
      setTimeout(() => { buscando.value = false }, 600)
    }

    const buscar = () => {
      error.value = ''
      if (!codigo.value.trim()) return
      emitir(codigo.value, false)
    }

    const limpiar = () => {
      codigo.value = ''
      error.value = ''
      entrada.value?.focus()
    }

    const abrirCamara = async () => {
      error.value = ''

      if (!soportaCamara) {
        error.value = 'Este navegador no permite leer códigos con la cámara.'
        return
      }

      try {
        detector = new window.BarcodeDetector({ formats: ['qr_code'] })

        /* facingMode environment: la cámara trasera. Con la frontal habría
           que dar vuelta el teléfono para apuntar al balde. */
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        })

        camara.value = true
        await nextTick()

        video.value.srcObject = stream
        await video.value.play()

        leerContinuo()
      } catch (e) {
        camara.value = false
        error.value = e.name === 'NotAllowedError'
          ? 'Diste permiso denegado a la cámara. Puedes escribir el código a mano.'
          : 'No se pudo abrir la cámara. Escribe el código a mano.'
      }
    }

    /* Se lee cada 300ms en vez de en cada frame: un QR no se mueve tan
       rápido, y detectar a 60fps calienta el teléfono sin leer más. */
    const leerContinuo = () => {
      bucle = setInterval(async () => {
        if (!video.value || video.value.readyState !== 4) return

        try {
          const codigos = await detector.detect(video.value)
          if (!codigos.length) return

          const valor = codigos[0].rawValue
          codigo.value = valor
          cerrarCamara()

          /* Vibra si el equipo puede: confirma la lectura sin mirar la
             pantalla, que es lo que pasa con el teléfono apuntando al balde. */
          if (navigator.vibrate) navigator.vibrate(60)

          emitir(valor, true)
        } catch {
          /* Un frame borroso no es un error: el siguiente probablemente sirve. */
        }
      }, 300)
    }

    const cerrarCamara = () => {
      clearInterval(bucle)
      bucle = null

      stream?.getTracks().forEach(t => t.stop())
      stream = null
      camara.value = false
    }

    /* Para que el padre pueda mostrar un error del servidor acá abajo. */
    const mostrarError = (msg) => { error.value = msg }

    const reiniciar = async () => {
      codigo.value = ''
      error.value = ''
      buscando.value = false
      await nextTick()
      entrada.value?.focus()
    }

    return {
      codigo, camara, buscando, error, entrada, video, soportaCamara,
      buscar, limpiar, abrirCamara, cerrarCamara, mostrarError, reiniciar
    }
  }
}
</script>

<style scoped>
.escaner {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* El campo marcado con el color de acento: es por donde entra el escáner,
   y en el mesón conviene que se distinga de cualquier otro input. */
.campo-codigo {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 0 14px;
  background: var(--accent-soft);
  border: 1.5px solid var(--accent);
  border-radius: var(--r-sm);
  transition: border-color var(--t-fast), background-color var(--t-fast);
}

.campo-codigo.leyendo {
  background: var(--success-soft);
  border-color: var(--success);
}

.campo-codigo input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  color: var(--text);
  font-family: var(--font-mono);
  /* 16px mínimo: bajo eso iOS hace zoom al enfocar y descuadra el modal. */
  font-size: max(1rem, 16px);
  font-weight: 600;
  letter-spacing: .02em;
}

.acciones {
  display: flex;
  gap: 8px;
}

.acciones .btn {
  flex: 1;
}

.visor {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: var(--r-sm);
  overflow: hidden;
  background: #000;
}

.visor video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* La mira dice dónde apuntar: sin ella la gente acerca el teléfono hasta
   pegarlo al balde, que es justo donde el QR sale desenfocado. */
.mira {
  position: absolute;
  inset: 22%;
  border: 2px solid rgba(255, 255, 255, .85);
  border-radius: var(--r-sm);
  box-shadow: 0 0 0 100vmax rgba(0, 0, 0, .35);
}

.spinner {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border: 2px solid var(--accent-text);
  border-top-color: transparent;
  border-radius: 50%;
  animation: girar .7s linear infinite;
}

@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: .65rem 1rem;
  border: none;
  border-radius: var(--r-sm);
  background: var(--accent);
  color: var(--accent-contrast);
  font: inherit;
  font-size: .9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--t-fast);
}

.btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.btn-linea {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.btn-linea:hover:not(:disabled) {
  background: var(--surface-2);
  color: var(--text);
}

.btn-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  font-size: .8rem;
  cursor: pointer;
}

.error {
  padding: 10px 13px;
  border-radius: var(--r-sm);
  background: var(--danger-soft);
  border-left: 3px solid var(--danger);
  color: var(--danger);
  font-size: .84rem;
  line-height: 1.5;
}

.ayuda {
  font-size: .78rem;
  color: var(--text-faint);
  line-height: 1.55;
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
</style>
