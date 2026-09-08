import { ref, onMounted, onUnmounted } from 'vue'

/*
 * Tema claro/oscuro. Reglas:
 *  1. Solo se escribe en localStorage cuando la persona elige (alternar()).
 *  2. Sin elección explícita, seguimos al sistema en vivo.
 *  3. El estado inicial ya lo aplica el script de index.html: acá no hay
 *     parpadeo, solo leemos y sincronizamos.
 */

const esOscuro = ref(false)
let mq = null
let refs = 0

function leer () {
  try { return localStorage.getItem('theme') } catch { return null }
}

function guardar (tema) {
  try { localStorage.setItem('theme', tema) } catch { /* Safari privado */ }
}

function aplicar (oscuro) {
  esOscuro.value = oscuro
  document.documentElement.setAttribute('data-theme', oscuro ? 'dark' : 'light')
}

function onSistema (e) {
  if (!leer()) aplicar(e.matches)
}

export function useTheme () {
  onMounted(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    if (refs === 0) {
      const guardado = leer()
      mq = window.matchMedia('(prefers-color-scheme: dark)')
      aplicar(guardado ? guardado === 'dark' : mq.matches)
      mq.addEventListener
        ? mq.addEventListener('change', onSistema)
        : mq.addListener(onSistema)
    }
    refs++
  })

  onUnmounted(() => {
    refs = Math.max(0, refs - 1)
    if (refs === 0 && mq) {
      mq.removeEventListener
        ? mq.removeEventListener('change', onSistema)
        : mq.removeListener(onSistema)
    }
  })

  function alternar () {
    const oscuro = !esOscuro.value
    aplicar(oscuro)
    guardar(oscuro ? 'dark' : 'light') // decisión explícita
  }

  return { esOscuro, alternar }
}
