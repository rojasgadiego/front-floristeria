import { ref, onMounted, onUnmounted } from 'vue'

/*
 * Avisa cuando hay una versión nueva publicada.
 *
 * Cada build deja el bundle con un hash en el nombre (js/index.3e46c863.js)
 * y Dokploy publica solo al hacer push. Basta con volver a pedir index.html
 * sin caché y comparar ese nombre con el que está cargado: si cambió, lo que
 * corre en esta pestaña quedó viejo. No hace falta tocar el build.
 *
 * Se revisa al volver a la app —en el teléfono la app no se cierra, se
 * deja en segundo plano días enteros— y cada tantos minutos con la pestaña
 * a la vista. No recarga sola: con una venta a medio cobrar, recargar
 * borraría el carrito. Lo decide la persona.
 */

const CADA_MS = 5 * 60 * 1000
const PATRON = /\/js\/index\.[0-9a-f]+\.js/

/* El bundle que está corriendo. En desarrollo no tiene hash y no hay nada
   que vigilar. */
const actual = (() => {
  const s = [...document.scripts].find(x => PATRON.test(x.src))
  return s ? s.src.match(PATRON)[0] : null
})()

export function useVersionNueva () {
  const hayNueva = ref(false)
  let intervalo = null
  let revisando = false
  let callado = false

  const revisar = async () => {
    if (!actual || hayNueva.value || revisando || callado) return
    revisando = true
    try {
      const r = await fetch('/index.html', { cache: 'no-store' })
      if (!r.ok) return
      const publicada = (await r.text()).match(PATRON)?.[0]
      /* Sin match es una respuesta rara (un 502 con página propia, un
         portal cautivo): mejor no avisar que avisar en falso. */
      if (publicada && publicada !== actual) hayNueva.value = true
    } catch {
      /* Sin red no hay nada que decir: se vuelve a probar en la próxima. */
    } finally {
      revisando = false
    }
  }

  const alCambiarVisibilidad = () => {
    if (document.visibilityState === 'visible') revisar()
  }

  const actualizar = () => window.location.reload()

  /* "Después" solo calla el aviso hasta la próxima vez que se abra la app:
     la versión vieja sigue siendo vieja. */
  const descartar = () => {
    hayNueva.value = false
    callado = true
  }

  onMounted(() => {
    if (!actual) return
    document.addEventListener('visibilitychange', alCambiarVisibilidad)
    intervalo = setInterval(() => {
      if (document.visibilityState === 'visible') revisar()
    }, CADA_MS)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', alCambiarVisibilidad)
    clearInterval(intervalo)
  })

  return { hayNueva, actualizar, descartar }
}
