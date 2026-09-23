<template>
  <div class="escaner">
    <!-- El campo va primero y con el foco puesto: los lectores de código
         teclean y mandan Enter, así que si el cursor no está acá, el código
         se escribe en cualquier otra parte. -->
    <div class="campo-codigo" :class="{ leyendo: camara }">
      <span aria-hidden="true">🏷️</span>
      <input ref="entrada" v-model="codigo" :placeholder="camara ? 'O escribe el código…' : 'Escanea o escribe el código'"
        aria-label="Código de lote o partida" autocomplete="off" spellcheck="false"
        @input="alTeclear" @paste="pegado = true" @keyup.enter="buscar">
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

    <!-- El mismo visor del punto de venta (qr-scanner): funciona en iPhone y
         en Android, con linterna, cambio de cámara, zoom y lectura desde una
         foto. Antes se usaba BarcodeDetector, que Safari no trae: en iPhone
         la cámara no abría y todo terminaba registrado "a mano".
         Se monta solo si se pide: tenerlo encendido gasta batería. -->
    <EscanerQr v-if="camara" ref="visor" autoiniciar :continuo="false" :con-manual="false"
      @detectado="alDetectar" />

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script>
import { ref, onMounted, nextTick, defineAsyncComponent } from 'vue'

/* qr-scanner pesa: se carga recién al abrir la cámara, como en el POS. */
const EscanerQr = defineAsyncComponent(() => import('@/features/ventas/components/EscanerQr.vue'))

/* Una pistola lectora "teclea" el código entero en milisegundos; una
   persona tarda bastante más por carácter. Bajo este promedio se asume
   lector: el código se leyó de la etiqueta, no se inventó. */
const MS_POR_CARACTER_LECTOR = 35

export default {
  name: 'EscanerCodigo',
  components: { EscanerQr },
  emits: ['leido'],

  setup(_, { emit }) {
    const codigo = ref('')
    const camara = ref(false)
    const buscando = ref(false)
    const error = ref('')
    const entrada = ref(null)
    const visor = ref(null)

    /* Para saber si el campo lo llenó una pistola o una persona. */
    const pegado = ref(false)
    let primeraTecla = 0

    onMounted(async () => {
      await nextTick()
      entrada.value?.focus()
    })

    /**
     * Emite el código leído. Quien lo recibe decide qué hacer con él; este
     * componente solo sabe leer.
     *
     * `escaneado` distingue la lectura de la etiqueta (cámara, foto o
     * pistola) del tipeo: es el dato que después permite ver quién registra
     * con el balde en la mano y quién no.
     */
    const emitir = (valor, escaneado) => {
      buscando.value = true
      emit('leido', { codigo: valor.trim(), escaneado })
      setTimeout(() => { buscando.value = false }, 600)
    }

    const alTeclear = () => {
      if (codigo.value.length <= 1) primeraTecla = Date.now()
      if (!codigo.value) pegado.value = false
    }

    const fueLector = () => {
      const largo = codigo.value.trim().length
      if (pegado.value || largo < 4 || !primeraTecla) return false
      return (Date.now() - primeraTecla) / largo < MS_POR_CARACTER_LECTOR
    }

    const buscar = () => {
      error.value = ''
      if (!codigo.value.trim()) return
      emitir(codigo.value, fueLector())
    }

    const limpiar = () => {
      codigo.value = ''
      pegado.value = false
      primeraTecla = 0
      error.value = ''
      entrada.value?.focus()
    }

    const abrirCamara = () => {
      error.value = ''
      camara.value = true
    }

    const cerrarCamara = () => {
      camara.value = false
    }

    /* Cámara o foto: se leyó la etiqueta. El visor queda en pausa hasta que
       el padre diga si el código sirve. */
    const alDetectar = (valor, origen) => {
      codigo.value = valor
      emitir(valor, origen !== 'manual')
    }

    /* Para que el padre pueda mostrar un error del servidor acá abajo. Si la
       cámara está abierta, vuelve a leer: el código no servía y lo natural es
       apuntar al balde correcto sin tocar nada más. */
    const mostrarError = (msg) => {
      error.value = msg
      if (camara.value) visor.value?.reanudar()
    }

    const reiniciar = async () => {
      codigo.value = ''
      pegado.value = false
      primeraTecla = 0
      error.value = ''
      buscando.value = false
      await nextTick()
      entrada.value?.focus()
    }

    return {
      codigo, camara, buscando, error, entrada, visor, pegado,
      alTeclear, buscar, limpiar, abrirCamara, cerrarCamara, alDetectar,
      mostrarError, reiniciar
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

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
</style>
