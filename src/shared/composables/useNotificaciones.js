import { ref, readonly } from 'vue'

/**
 * Sistema de notificaciones de la app.
 *
 * El estado vive a nivel de MÓDULO, no dentro de la función: es un
 * singleton. Cualquier vista puede empujar un mensaje sin props ni
 * eventos, y el mensaje sobrevive a la navegación porque no pertenece a
 * ningún componente.
 *
 *   const notificar = useNotificaciones()
 *   notificar.exito('Boleta emitida')
 *   notificar.error('No se pudo guardar')
 *
 * Con acción de deshacer:
 *
 *   notificar.exito('Merma registrada', {
 *     accion: { texto: 'Deshacer', al: () => revertir(m.id) }
 *   })
 *
 * El contenedor (ToastContainer.vue) se monta UNA sola vez en App.vue,
 * fuera del <router-view>. Si se monta dentro de MainLayout se desmonta
 * en cada cambio de ruta y el toast se pierde justo cuando más importa:
 * al avisar algo y navegar acto seguido.
 */

/* ---------------- Estado del módulo ---------------- */

const notificaciones = ref([])
const temporizadores = new Map()

let siguienteId = 0

/* Un error hay que alcanzar a leerlo; un "guardado" no. */
const DURACIONES = {
    exito: 3000,
    info: 3500,
    alerta: 4500,
    error: 6000
}

/* Con acción hay que dar tiempo a decidir */
const MINIMO_CON_ACCION = 6000

/* Tres es el techo: en un celular de 640px de alto, cuatro toasts tapan
 * media pantalla. */
const MAXIMO = 3

/* ---------------- Temporizadores ---------------- */

const buscar = (id) => notificaciones.value.find(n => n.id === id)

const detener = (id) => {
    const t = temporizadores.get(id)
    if (!t) return null
    if (t.idTimeout) clearTimeout(t.idTimeout)
    temporizadores.delete(id)
    return t
}

const programar = (id, ms) => {
    const idTimeout = setTimeout(() => cerrar(id), ms)
    temporizadores.set(id, { idTimeout, vence: Date.now() + ms, restante: ms })
}

/* ---------------- Operaciones ---------------- */

const cerrar = (id) => {
    detener(id)
    const ix = notificaciones.value.findIndex(n => n.id === id)
    if (ix !== -1) notificaciones.value.splice(ix, 1)
}

const limpiar = () => {
    notificaciones.value.forEach(n => detener(n.id))
    notificaciones.value = []
}

/**
 * Pausa el auto-cierre.
 *
 * `pausado` se guarda EN LA NOTIFICACIÓN, no se deduce de :hover. En un
 * celular el hover no existe, así que la versión anterior nunca pausaba
 * al tocar. Ahora el mismo estado lo usan el mouse (mouseenter), el dedo
 * (pointerdown) y la barra de progreso.
 */
const pausar = (id) => {
    const n = buscar(id)
    if (!n || n.pausado) return
    n.pausado = true

    const t = detener(id)
    if (!t) return
    temporizadores.set(id, {
        idTimeout: null,
        vence: null,
        restante: Math.max(600, t.vence - Date.now())
    })
}

const reanudar = (id) => {
    const n = buscar(id)
    if (!n || !n.pausado) return
    n.pausado = false

    const t = temporizadores.get(id)
    if (!t || t.idTimeout) return
    temporizadores.delete(id)
    programar(id, t.restante)
}

/**
 * @param {string} texto
 * @param {object} opciones
 * @param {'exito'|'error'|'alerta'|'info'} opciones.tipo
 * @param {number} opciones.duracion   ms; 0 = no se cierra solo
 * @param {{texto: string, al: Function}} opciones.accion
 */
const notificar = (texto, opciones = {}) => {
    const { tipo = 'info', accion = null } = opciones

    /*
     * Si el mismo mensaje ya está en pantalla, se reinicia su reloj en vez
     * de apilar un duplicado. Evita la cascada de toasts idénticos cuando
     * alguien pulsa un botón tres veces seguidas.
     */
    const repetido = notificaciones.value.find(n => n.texto === texto && n.tipo === tipo)
    if (repetido && !accion) {
        detener(repetido.id)
        repetido.pausado = false
        if (repetido.duracion > 0) programar(repetido.id, repetido.duracion)
        return repetido.id
    }

    let duracion = opciones.duracion ?? DURACIONES[tipo] ?? DURACIONES.info
    if (accion && duracion > 0) duracion = Math.max(duracion, MINIMO_CON_ACCION)

    const id = ++siguienteId

    notificaciones.value.unshift({
        id,
        texto,
        tipo,
        duracion,
        pausado: false,
        accion: accion ? { texto: accion.texto, al: accion.al } : null
    })

    /* Se descartan los más viejos, no los recién llegados */
    while (notificaciones.value.length > MAXIMO) {
        cerrar(notificaciones.value[notificaciones.value.length - 1].id)
    }

    if (duracion > 0) programar(id, duracion)

    return id
}

/** Ejecuta la acción y cierra. Si la acción falla, avisa el error. */
const ejecutarAccion = async (n) => {
    const accion = n.accion
    cerrar(n.id)
    try {
        await accion.al()
    } catch (e) {
        notificar(e?.message || 'No se pudo completar la acción', { tipo: 'error' })
    }
}

/* ---------------- API ---------------- */

export function useNotificaciones() {
    return {
        /* Solo lectura: la lista se modifica con los métodos, no a mano */
        notificaciones: readonly(notificaciones),

        notificar,
        exito: (texto, op = {}) => notificar(texto, { ...op, tipo: 'exito' }),
        error: (texto, op = {}) => notificar(texto, { ...op, tipo: 'error' }),
        alerta: (texto, op = {}) => notificar(texto, { ...op, tipo: 'alerta' }),
        info: (texto, op = {}) => notificar(texto, { ...op, tipo: 'info' }),

        cerrar,
        limpiar,
        pausar,
        reanudar,
        ejecutarAccion
    }
}