import { ref, reactive, nextTick, onUnmounted } from 'vue'

export function useTemporizadores() {
  const pendientes = new Set()

  /** Pausa registrada: se cancela sola si el componente se desmonta. */
  const espera = (ms) => new Promise((resolve) => {
    const id = setTimeout(() => {
      pendientes.delete(id)
      resolve()
    }, ms)
    pendientes.add(id)
  })

  const cancelarTodo = () => {
    pendientes.forEach(clearTimeout)
    pendientes.clear()
  }

  onUnmounted(cancelarTodo)

  /**
   * Flash sobre un monto que se recalculó solo.
   *
   *   const dTotal = usarDestello()
   *   watch(miTotal, dTotal.alCambiar)
   *   <b :class="{ destella: dTotal.activo }">
   *
   * El apagar -> nextTick -> prender es obligatorio: sin eso, dos cambios
   * seguidos no reinician la animación porque la clase nunca se quitó.
   */
  const usarDestello = (duracion = 460) => {
    const activo = ref(false)
    let turno = 0

    const disparar = async () => {
      const mio = ++turno
      activo.value = false
      await nextTick()
      if (turno !== mio) return
      activo.value = true
      await espera(duracion)
      if (turno === mio) activo.value = false
    }

    const alCambiar = (nuevo, viejo) => {
      if (nuevo !== viejo) disparar()
    }

    return reactive({ activo, disparar, alCambiar })
  }

  /**
   * Marca temporalmente el registro que acaba de cambiar de estado.
   *
   *   const resalte = usarResalte()
   *   resalte.marcar(id)
   *   <tr :class="{ resaltada: resalte.id === fila.id }">
   */
  const usarResalte = (duracion = 1400) => {
    const id = ref(null)

    const marcar = async (valor) => {
      id.value = valor
      await espera(duracion)
      if (id.value === valor) id.value = null
    }

    return reactive({ id, marcar })
  }

  /**
   * Toast. Devuelve refs crudas: se destructura para que queden en el
   * primer nivel del return de setup().
   *
   *   const { aviso, avisar } = usarAviso()
   *
   * El contador de turno evita que un aviso viejo apague uno nuevo
   * cuando llegan dos seguidos.
   */
  const usarAviso = (duracion = 2600) => {
    const aviso = ref(null)
    let turno = 0

    const avisar = async (texto, malo = false) => {
      const mio = ++turno
      aviso.value = { texto, malo }
      await espera(duracion)
      if (turno === mio) aviso.value = null
    }

    return { aviso, avisar }
  }

  /**
   * Esqueleto de carga con las dos guardas que evitan el parpadeo: no
   * aparece si la carga tarda menos que `retraso`, y una vez visible se
   * queda al menos `minimo`.
   *
   *   const esqueleto = usarEsqueleto()
   *   await esqueleto.envolver(() => store.dispatch('x/cargar'), enFrio)
   *   <div v-if="esqueleto.visible">
   *
   * `envolver` nunca propaga el error de la tarea: si el dispatch falla,
   * el esqueleto igual se apaga y la vista muestra su estado de error.
   * El error queda en consola y se devuelve `false`.
   */
  const usarEsqueleto = (retraso = 160, minimo = 420) => {
    const visible = ref(false)

    const envolver = async (tarea, mostrar = true) => {
      let apareceEn = 0
      let ok = true

      const disparo = setTimeout(() => {
        pendientes.delete(disparo)
        if (mostrar) {
          visible.value = true
          apareceEn = performance.now()
        }
      }, retraso)
      pendientes.add(disparo)

      try {
        await tarea()
      } catch (e) {
        ok = false
        console.error('Error durante la carga:', e)
      } finally {
        clearTimeout(disparo)
        pendientes.delete(disparo)

        if (visible.value) {
          const resta = minimo - (performance.now() - apareceEn)
          if (resta > 0) await espera(resta)
        }
        visible.value = false
      }

      return ok
    }

    return reactive({ visible, envolver })
  }

  return { espera, cancelarTodo, usarDestello, usarResalte, usarAviso, usarEsqueleto }
}

/**
 * Hook @before-leave para TransitionGroup sobre una GRILLA.
 *
 * Un hijo de grid con position:absolute pierde su posición estática y
 * salta a la esquina superior izquierda. Hay que fijarle caja y
 * coordenadas antes de sacarlo del flujo para que el FLIP del resto se
 * vea bien.
 *
 * OJO: esto no sirve en tablas. Sacar un <tr> del flujo rompe el reparto
 * de columnas — ahí se anima solo la entrada.
 */
export function fijarCajaAntesDeSalir(el) {
  el.style.width = `${el.offsetWidth}px`
  el.style.height = `${el.offsetHeight}px`
  el.style.left = `${el.offsetLeft}px`
  el.style.top = `${el.offsetTop}px`
}