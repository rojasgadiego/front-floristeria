<template>
  <div class="escaner">

    <div class="visor" :class="{ 'visor--ok': enfriando, 'visor--malo': sacudiendo }">
      <video ref="video" class="visor__video" muted playsinline></video>

      <!-- Compuerta previa: no pedimos la cámara de una.
           En iOS un permiso denegado no se puede volver a pedir desde la
           web, así que primero explicamos y recién ahí pedimos.
           El toque también desbloquea el AudioContext para el pitido. -->
      <button v-if="estado === 'inicial'" class="capa capa--boton" @click="arrancar">
        <span class="capa__icono">📷</span>
        <span class="capa__titulo">Activar la cámara</span>
        <span class="capa__detalle">Se usa solo para leer el código. No se guarda ninguna imagen.</span>
      </button>

      <div v-else-if="estado === 'abriendo'" class="capa">
        <span class="spinner"></span>
        <p class="capa__detalle">Abriendo la cámara…</p>
      </div>

      <div v-else-if="estado === 'error'" class="capa capa--error">
        <span class="capa__icono">⚠️</span>
        <p class="capa__titulo">{{ falla.titulo }}</p>
        <p class="capa__detalle">{{ falla.detalle }}</p>
        <button v-if="falla.reintentable" class="btn btn-mini" @click="arrancar">Reintentar</button>
      </div>

      <div v-else-if="estado === 'pausado'" class="capa">
        <span class="capa__icono">⏸</span>
        <button class="btn btn-mini" @click="reanudar">Seguir escaneando</button>
      </div>

      <!-- Confirmación en el visor: el operario mira la cámara, no la
           lista. El acierto se canta acá y dura lo que el enfriamiento. -->
      <Transition name="acuse">
        <div v-if="enfriando && ultimo" class="acuse">
          <span class="acuse__tic">✓</span>
          <span class="acuse__texto">{{ recortar(ultimo) }}</span>
        </div>
      </Transition>

      <!-- Pista contextual: solo aparece si pasaron unos segundos sin
           leer nada. Un cartel permanente se vuelve invisible. -->
      <Transition name="pista">
        <p v-if="mostrarPista" class="pista">
          {{ pista }}
        </p>
      </Transition>

      <!-- Controles flotando sobre el video: la mano ya está ahí. -->
      <div v-if="estado === 'activo'" class="flotantes">
        <button v-if="tieneLuz" class="fab" :class="{ on: luzEncendida }"
                :aria-pressed="luzEncendida" title="Linterna" @click="alternarLuz">💡</button>
        <button v-if="camaras.length > 1" class="fab" title="Cambiar de cámara" @click="rotarCamara">🔄</button>
      </div>
    </div>

    <!-- Zoom: para QR chicos, acercar el equipo arruina el foco macro.
         Con zoom óptico/digital se lee sin mover la mano. -->
    <label v-if="zoomMax > 1 && estado === 'activo'" class="zoom">
      <span aria-hidden="true">🔍</span>
      <input type="range" min="1" :max="zoomMax" step="0.1"
             :value="zoom" @input="aplicarZoom(+$event.target.value)"
             aria-label="Acercar">
      <b>{{ zoom.toFixed(1) }}×</b>
    </label>

    <div class="acciones">
      <button class="enlace-boton" @click="archivo.click()">Leer desde una foto</button>
      <button class="enlace-boton" @click="abrirManual">Ingresar a mano</button>
    </div>

    <input ref="archivo" class="oculto" type="file" accept="image/*" @change="alElegirFoto">

    <form v-if="manual" class="manual" @submit.prevent="enviarManual">
      <input ref="campoManual" v-model="textoManual" class="campo chico"
             placeholder="Pegá o tipeá el código" autocomplete="off" enterkeyhint="done">
      <button class="btn btn-mini" type="submit" :disabled="!textoManual.trim()">Usar</button>
    </form>

    <!-- Los lectores de pantalla no ven el visor. Este canal les cuenta. -->
    <p class="sr-solo" role="status" aria-live="polite">{{ anuncio }}</p>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useEscanerQr } from '@/shared/composables/useEscanerQr.js'

const props = defineProps({
  continuo:  { type: Boolean, default: true },
  /* Validador sync o async. Si devuelve false no se emite y el visor
     sacude en rojo: el error se ve antes de mirar el carrito. */
  validar:   { type: Function, default: null },
  autoiniciar: { type: Boolean, default: false }
})
const emit = defineEmits(['detectado', 'rechazado', 'error'])

const {
  video, estado, error, enfriando,
  camaras, camaraId, tieneLuz, luzEncendida, zoom, zoomMax,
  iniciar, pausar, reanudar, alternarLuz, cambiarCamara, aplicarZoom, leerImagen
} = useEscanerQr({ onCodigo: procesar })

const ultimo      = ref('')
const sacudiendo  = ref(false)
const anuncio     = ref('')
const manual      = ref(false)
const textoManual = ref('')
const campoManual = ref(null)
const archivo     = ref(null)

/* ── Procesar una lectura ─────────────────────────────────────────── */
async function procesar (valor) {
  const codigo = valor.trim()
  if (!codigo) return

  if (props.validar && !(await props.validar(codigo))) {
    rechazar(codigo)
    return
  }

  ultimo.value = codigo
  aceptar()
  anuncio.value = `Código leído: ${codigo}`
  emit('detectado', codigo)
  if (!props.continuo) pausar()
}

function rechazar (codigo) {
  emit('rechazado', codigo)
  anuncio.value = 'Código no reconocido'
  navigator.vibrate?.([25, 45, 25])
  pitar(220, 0.18, 'sawtooth')
  sacudiendo.value = true
  setTimeout(() => { sacudiendo.value = false }, 340)
}

function aceptar () {
  navigator.vibrate?.(35)
  pitar(920, 0.1, 'square')
}

/* ── Pista progresiva ─────────────────────────────────────────────── */
const segundosSinLeer = ref(0)
let reloj
onMounted(() => {
  reloj = setInterval(() => {
    segundosSinLeer.value = estado.value === 'activo' ? segundosSinLeer.value + 1 : 0
  }, 1000)
  if (props.autoiniciar) arrancar()
})
onUnmounted(() => clearInterval(reloj))
watch(enfriando, v => { if (v) segundosSinLeer.value = 0 })

const mostrarPista = computed(() => estado.value === 'activo' && segundosSinLeer.value >= 4)
const pista = computed(() => {
  if (segundosSinLeer.value < 9)  return 'Centrá el código en el recuadro'
  if (segundosSinLeer.value < 15) return 'Separá un poco el equipo, unos 15 cm'
  if (tieneLuz.value && !luzEncendida.value) return 'Poca luz: probá con la linterna 💡'
  return 'Si el código está dañado, usá “Leer desde una foto”'
})

/* ── Errores en lenguaje humano ───────────────────────────────────── */
const MENSAJES = {
  NotAllowedError: ['Permiso denegado', 'Habilitá la cámara para este sitio en los ajustes del navegador y recargá.', false],
  NotFoundError:   ['Sin cámara', 'Este equipo no tiene ninguna cámara disponible.', false],
  NotReadableError:['Cámara ocupada', 'Otra aplicación la está usando. Cerrala y reintentá.', true],
  OverconstrainedError: ['Cámara no disponible', 'Probá cambiando de cámara.', true],
  AbortError:      ['Se interrumpió', 'La cámara se cerró sola. Reintentá.', true]
}
const falla = computed(() => {
  const e = error.value
  if (!e) return {}
  if (/insecure|https/i.test(e.mensaje)) {
    return { titulo: 'Conexión no segura', detalle: 'La cámara solo funciona por HTTPS o en localhost.', reintentable: false }
  }
  const [titulo, detalle, reintentable] = MENSAJES[e.nombre] ?? ['No se pudo abrir la cámara', e.mensaje || 'Error desconocido.', true]
  return { titulo, detalle, reintentable }
})
watch(error, e => { if (e) { manual.value = true; emit('error', e) } })

/* ── Acciones ─────────────────────────────────────────────────────── */
async function arrancar () {
  desbloquearAudio()
  await iniciar()
}

function rotarCamara () {
  const i = camaras.value.findIndex(c => c.id === camaraId.value)
  cambiarCamara(camaras.value[(i + 1) % camaras.value.length].id)
}

async function alElegirFoto (ev) {
  const f = ev.target.files?.[0]
  ev.target.value = ''
  if (!f) return
  if (!(await leerImagen(f))) rechazar('')
}

async function abrirManual () {
  manual.value = true
  await nextTick()
  campoManual.value?.focus()
}

async function enviarManual () {
  const v = textoManual.value.trim()
  if (!v) return
  await procesar(v)
  textoManual.value = ''
}

/* Suelta la cámara cuando la pestaña se va al fondo: en iOS el video se
   congela igual, pero además evita el LED prendido y el consumo. */
function alCambiarVisibilidad () {
  if (document.hidden) pausar()
  else if (estado.value === 'pausado' && props.continuo) reanudar()
}
onMounted(() => document.addEventListener('visibilitychange', alCambiarVisibilidad))
onUnmounted(() => document.removeEventListener('visibilitychange', alCambiarVisibilidad))

/* ── Sonido ───────────────────────────────────────────────────────── */
let audio
function desbloquearAudio () {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)()
    if (audio.state === 'suspended') audio.resume()
  } catch {}
}
function pitar (hz, dur, tipo) {
  if (!audio) return
  try {
    const osc = audio.createOscillator(), vol = audio.createGain()
    osc.type = tipo; osc.frequency.value = hz
    vol.gain.setValueAtTime(0.05, audio.currentTime)
    vol.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur)
    osc.connect(vol).connect(audio.destination)
    osc.start(); osc.stop(audio.currentTime + dur)
  } catch {}
}
onUnmounted(() => audio?.close?.())

const recortar = v => (v.length > 34 ? v.slice(0, 32) + '…' : v)

defineExpose({ arrancar, pausar, reanudar, abrirManual })
</script>

<style scoped>
.escaner { display: flex; flex-direction: column; gap: 10px; }

/* Visor cuadrado: el QR es cuadrado y un visor 16:9 hace que la gente
   aleje el equipo de más buscando encuadrar. */
.visor {
  position: relative;
  aspect-ratio: 1;
  max-height: 62dvh;
  overflow: hidden;
  border-radius: var(--r-md);
  background: #000;
  border: 2px solid var(--border);
  transition: border-color .18s ease;
}
.visor--ok   { border-color: var(--success); }
.visor--malo { border-color: var(--danger); animation: sacudir .34s ease; }

@keyframes sacudir {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}

.visor__video { width: 100%; height: 100%; object-fit: cover; display: block; }

/* Marco y contorno los inyecta qr-scanner ya alineados con la región
   real de lectura: el recuadro muestra dónde efectivamente lee, no una
   decoración. Solo los revestimos con los tokens del tema. */
.visor :deep(.scan-region-highlight-svg) {
  stroke: #fff !important;
  stroke-width: 4 !important;
  opacity: .85;
}
.visor :deep(.code-outline-highlight) {
  stroke: var(--success) !important;
  stroke-width: 5 !important;
}

/* ── Capas ── */
.capa {
  position: absolute; inset: 0; z-index: 2;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 22px; text-align: center;
  background: color-mix(in srgb, #000 74%, transparent);
  color: #fff; backdrop-filter: blur(3px);
}
.capa--boton { border: 0; width: 100%; cursor: pointer; font: inherit; }
.capa--boton:hover { background: color-mix(in srgb, #000 66%, transparent); }
.capa__icono   { font-size: 2.2rem; }
.capa__titulo  { font-size: .95rem; font-weight: 700; }
.capa__detalle { font-size: .82rem; opacity: .82; line-height: 1.5; max-width: 32ch; }

/* ── Acuse de lectura ── */
.acuse {
  position: absolute; left: 10px; right: 10px; bottom: 10px; z-index: 3;
  display: flex; align-items: center; gap: 8px;
  padding: 9px 12px; border-radius: var(--r-sm);
  background: color-mix(in srgb, var(--success) 92%, #000);
  color: #fff; font-size: .86rem; font-weight: 600;
}
.acuse__tic { font-size: 1.05rem; }
.acuse__texto { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acuse-enter-active, .acuse-leave-active { transition: opacity .16s, transform .16s; }
.acuse-enter-from, .acuse-leave-to { opacity: 0; transform: translateY(8px); }

/* ── Pista ── */
.pista {
  position: absolute; left: 10px; right: 10px; top: 10px; z-index: 3;
  padding: 7px 11px; border-radius: var(--r-sm);
  background: color-mix(in srgb, #000 66%, transparent);
  color: #fff; font-size: .8rem; text-align: center;
}
.pista-enter-active, .pista-leave-active { transition: opacity .3s; }
.pista-enter-from, .pista-leave-to { opacity: 0; }

/* ── Controles sobre el video ── */
.flotantes { position: absolute; right: 10px; top: 10px; z-index: 3; display: grid; gap: 8px; }
.fab {
  width: 42px; height: 42px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,.28);
  background: color-mix(in srgb, #000 55%, transparent);
  color: #fff; font-size: 1.05rem; cursor: pointer;
  display: grid; place-items: center;
}
.fab.on { background: var(--warn); color: #1a1a1a; border-color: var(--warn); }

.zoom { display: flex; align-items: center; gap: 10px; font-size: .82rem; color: var(--text-2); }
.zoom input { flex: 1; }
.zoom b { min-width: 3.2ch; text-align: right; }

.acciones { display: flex; gap: 14px; justify-content: space-between; }
.manual { display: flex; gap: 8px; }
.manual .campo { flex: 1; min-width: 0; }
.oculto { display: none; }

.sr-solo {
  position: absolute; width: 1px; height: 1px;
  overflow: hidden; clip-path: inset(50%); white-space: nowrap;
}

.spinner {
  width: 22px; height: 22px; border: 2px solid #fff; border-top-color: transparent;
  border-radius: 50%; animation: girar .6s linear infinite;
}
@keyframes girar { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .visor--malo { animation: none; }
  .spinner { animation-duration: 1.8s; }
}
</style>
