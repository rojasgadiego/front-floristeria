import { ref, computed, onMounted, onUnmounted } from 'vue'

const BP_CAJON = '(max-width: 768px)'
const BP_HOVER = '(hover: hover) and (pointer: fine)'
const STORAGE_KEY = 'sidebarState'

const esCajon = ref(false)
const permiteHover = ref(true)
const colapsado = ref(true) // solo tiene sentido en escritorio
const cajonAbierto = ref(false)

let mqCajon = null
let mqHover = null
let timer = null
let refs = 0 // cuántos componentes usan el composable (para montar listeners 1 vez)

function escuchar (mq, fn) {
  if (!mq) return
  mq.addEventListener ? mq.addEventListener('change', fn) : mq.addListener(fn)
}

function dejarEscuchar (mq, fn) {
  if (!mq) return
  mq.removeEventListener ? mq.removeEventListener('change', fn) : mq.removeListener(fn)
}

function leerGuardado () {
  try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
}

function guardar (estado) {
  try { localStorage.setItem(STORAGE_KEY, estado) } catch { /* Safari privado */ }
}

function bloquearScroll (activar) {
  if (typeof document === 'undefined') return
  document.body.style.overflow = activar ? 'hidden' : ''
}

/* Al cruzar el umbral de tamaño hay que dejar todo consistente. */
function onCajonChange (e) {
  esCajon.value = e.matches
  if (e.matches) {
    // Entramos a móvil: el sidebar es un cajón, parte cerrado.
    cajonAbierto.value = false
    bloquearScroll(false)
  } else {
    // Volvemos a escritorio: soltar scroll y respetar la preferencia guardada.
    cajonAbierto.value = false
    bloquearScroll(false)
    const g = leerGuardado()
    colapsado.value = g ? g === 'collapsed' : true
  }
}

function onHoverChange (e) {
  permiteHover.value = e.matches
}

export function useLayout () {
  const puedeMQ = typeof window !== 'undefined' && typeof window.matchMedia === 'function'

  onMounted(() => {
    if (!puedeMQ) return

    if (refs === 0) {
      mqCajon = window.matchMedia(BP_CAJON)
      mqHover = window.matchMedia(BP_HOVER)

      esCajon.value = mqCajon.matches
      permiteHover.value = mqHover.matches

      escuchar(mqCajon, onCajonChange)
      escuchar(mqHover, onHoverChange)

      // El estado guardado solo aplica en escritorio.
      if (!esCajon.value) {
        const g = leerGuardado()
        colapsado.value = g ? g === 'collapsed' : true
      }
    }

    refs++
  })

  onUnmounted(() => {
    refs = Math.max(0, refs - 1)
    if (refs === 0) {
      dejarEscuchar(mqCajon, onCajonChange)
      dejarEscuchar(mqHover, onHoverChange)
      clearTimeout(timer)
      timer = null
      bloquearScroll(false)
    }
  })

  /* -------- Escritorio: colapso automático -------- */
  function cancelarColapso () {
    clearTimeout(timer)
    timer = null
  }

  function programarColapso (ms = 2000) {
    if (esCajon.value) return
    cancelarColapso()
    timer = setTimeout(() => { colapsado.value = true }, ms)
  }

  function expandir () {
    cancelarColapso()
    colapsado.value = false
    if (!esCajon.value) guardar('expanded')
  }

  function colapsar (ms = 300) {
    programarColapso(ms)
    // Guardamos la intención; el timer aplicará el colapso visual.
    if (!esCajon.value) guardar('collapsed')
  }

  /* -------- Móvil: cajón -------- */
  function abrirCajon () {
    if (!esCajon.value) return
    cajonAbierto.value = true
    bloquearScroll(true)
  }

  function cerrarCajon () {
    cajonAbierto.value = false
    bloquearScroll(false)
  }

  function toggleMenu () {
    if (esCajon.value) {
      cajonAbierto.value ? cerrarCajon() : abrirCajon()
    } else {
      colapsado.value ? expandir() : colapsar(0)
    }
  }

  /* -------- Navegación / foco ventana -------- */
  function alNavegar () {
    if (esCajon.value) cerrarCajon()
    else programarColapso(2000)
  }

  function alEnfocarVentana () {
    programarColapso(2000)
  }

  /* -------- Derivados -------- */
  // En cajón hay 280px reales: colapsar (puros iconos) no aplica ahí.
  const colapsadoVisual = computed(() => colapsado.value && !esCajon.value)

  return {
    esCajon,
    permiteHover,
    cajonAbierto,
    colapsado,
    colapsadoVisual,
    expandir,
    colapsar,
    abrirCajon,
    cerrarCajon,
    toggleMenu,
    programarColapso,
    cancelarColapso,
    alNavegar,
    alEnfocarVentana
  }
}
