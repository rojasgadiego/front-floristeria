/**
 * Módulo de cotizaciones y eventos — Floristería Colibrí
 * =========================================================================
 * Un matrimonio no es una venta: es un compromiso a futuro. El presupuesto
 * se arma con semanas de anticipación, se aprueba, y recién el día del
 * evento se cobra y sale la flor.
 *
 * ESTADOS
 *   borrador  → se está armando, no compromete nada
 *   aprobada  → el cliente aceptó; compromete flor para esa fecha
 *   cobrada   → pasó por caja; ahí recién se descuenta el stock
 *   anulada   → se cayó
 *
 * SOBRE LA "RESERVA" DE STOCK
 * Una cotización aprobada NO bloquea el inventario, y es a propósito.
 * Un matrimonio del día 20 se abastece con flor que todavía no se compra;
 * bloquear hoy 200 rosas dejaría al local sin poder vender por el mostrador
 * durante dos semanas. Lo que sí hace el sistema es MOSTRAR el compromiso:
 * cuánta flor hay comprometida por evento y si el stock actual la cubre.
 * Es un aviso para comprar a tiempo, no un candado.
 * =========================================================================
 */

const esperar = (ms = 200) => new Promise(resolve => setTimeout(resolve, ms))

export const TIPOS_EVENTO = [
    'Matrimonio', 'Graduación', 'Cumpleaños', 'Corporativo',
    'Funeral', 'Bautizo', 'Aniversario', 'Otro'
]

export const ESTADOS = {
    borrador: { texto: 'Borrador', clase: 'et-gris' },
    aprobada: { texto: 'Aprobada', clase: 'et-verde' },
    cobrada: { texto: 'Cobrada', clase: 'et-azul' },
    anulada: { texto: 'Anulada', clase: 'et-rosa' }
}

const SEMILLA = [
    {
        id: 1, folio: 'COT-101', cliente: 'Matrimonio Rojas–Pino', clienteId: null,
        tipo: 'Matrimonio', fecha: '', contacto: '+56 9 7788 9900',
        items: [
            { productoId: 101, nombre: 'Ramo 12 rosas rojas', precio: 24990, cantidad: 1 },
            { productoId: 1, nombre: 'Rosa roja (tallo)', precio: 2490, cantidad: 60 },
            { productoId: 6, nombre: 'Follaje de eucalipto', precio: 1200, cantidad: 30 },
            { productoId: null, nombre: 'Arco floral a medida', precio: 180000, cantidad: 1 }
        ],
        traslado: 45000, montaje: 60000, notas: 'Paleta blanco y verde. Montaje 8:00 en el salón.',
        estado: 'aprobada', abono: 150000, creadaPor: 'admin@admin.com'
    }
]

const state = () => ({
    cotizaciones: [],
    enCaja: null,       // cotización cargada en el punto de venta
    cargando: false,
    error: null
})

const getters = {
    cotizaciones: (s) => s.cotizaciones,
    cargando: (s) => s.cargando,
    error: (s) => s.error,
    enCaja: (s) => s.enCaja,

    porId: (s) => (id) => s.cotizaciones.find(c => c.id === Number(id)) || null,

    activas: (s) => s.cotizaciones.filter(c => c.estado === 'borrador' || c.estado === 'aprobada'),
    aprobadas: (s) => s.cotizaciones.filter(c => c.estado === 'aprobada'),
    pendientes: (s, g) => g.activas.length,

    montoComprometido: (s, g) => g.aprobadas.reduce((t, c) => t + c.total, 0),
    abonosRecibidos: (s, g) => g.activas.reduce((t, c) => t + (c.abono || 0), 0),

    /**
     * Flor comprometida por las cotizaciones aprobadas, producto por producto.
     * No descuenta stock: sirve para saber qué hay que comprar.
     */
    comprometidoPorProducto: (s, g) => {
        const acum = {}
        g.aprobadas.forEach(c => {
            c.items.forEach(i => {
                if (!i.productoId) return
                acum[i.productoId] = (acum[i.productoId] || 0) + i.cantidad
            })
        })
        return acum
    },

    comprometidoDe: (s, g) => (productoId) => g.comprometidoPorProducto[productoId] || 0,

    /** Productos comprometidos que el stock actual no alcanza a cubrir */
    faltantesParaEventos: (s, g, rootState, rootGetters) => {
        const porId = rootGetters['inventario/porId']
        const disponible = rootGetters['inventario/disponible']
        if (!porId || !disponible) return []

        return Object.keys(g.comprometidoPorProducto).map(id => {
            const p = porId(Number(id))
            if (!p) return null
            const requerido = g.comprometidoPorProducto[id]
            const hay = disponible(p)
            return hay < requerido ? { producto: p, requerido, hay, faltan: requerido - hay } : null
        }).filter(Boolean)
    }
}

const mutations = {
    SET_CARGANDO(s, v) { s.cargando = v },
    SET_ERROR(s, v) { s.error = v },
    SET_COTIZACIONES(s, lista) { s.cotizaciones = lista },
    AGREGAR(s, c) { s.cotizaciones.unshift(c) },
    ACTUALIZAR(s, c) {
        const i = s.cotizaciones.findIndex(x => x.id === c.id)
        if (i !== -1) s.cotizaciones.splice(i, 1, c)
    },
    QUITAR(s, id) { s.cotizaciones = s.cotizaciones.filter(c => c.id !== id) },
    SET_EN_CAJA(s, id) { s.enCaja = id }
}

/** Total = ítems + traslado + montaje */
export function totalDe(cotizacion) {
    const items = (cotizacion.items || []).reduce(
        (t, i) => t + (i.precio || 0) * (i.cantidad || 0), 0
    )
    return items + (Number(cotizacion.traslado) || 0) + (Number(cotizacion.montaje) || 0)
}

const actions = {
    async cargarCotizaciones({ commit, state }, { forzar = false } = {}) {
        if (state.cotizaciones.length && !forzar) return state.cotizaciones

        commit('SET_CARGANDO', true)
        try {
            // API real:  const { data } = await api.get('/cotizaciones')
            await esperar()
            const data = JSON.parse(JSON.stringify(SEMILLA)).map(c => ({ ...c, total: totalDe(c) }))
            commit('SET_COTIZACIONES', data)
            return data
        } catch (e) {
            commit('SET_ERROR', 'No se pudieron cargar las cotizaciones.')
            throw e
        } finally {
            commit('SET_CARGANDO', false)
        }
    },

    async guardarCotizacion({ commit, state, rootGetters }, datos) {
        if (!datos.cliente?.trim()) throw new Error('Indica el cliente o el nombre del evento.')
        if (!datos.items || !datos.items.length) throw new Error('Agrega al menos un ítem al presupuesto.')
        if (datos.items.some(i => !i.cantidad || i.cantidad < 1)) {
            throw new Error('Todas las cantidades deben ser al menos 1.')
        }
        if ((datos.abono || 0) > totalDe(datos)) {
            throw new Error('El abono no puede superar el total del presupuesto.')
        }

        // API real:  await api.post('/cotizaciones', datos)
        await esperar(180)

        const preparada = { ...datos, total: totalDe(datos) }

        if (datos.id) {
            const actual = state.cotizaciones.find(c => c.id === datos.id)
            if (actual && actual.estado === 'cobrada') {
                throw new Error('Una cotización ya cobrada no se puede editar.')
            }
            commit('ACTUALIZAR', preparada)
            return preparada
        }

        const nueva = {
            ...preparada,
            id: Math.max(0, ...state.cotizaciones.map(c => c.id)) + 1,
            folio: 'COT-' + (100 + state.cotizaciones.length + 1),
            estado: 'borrador',
            creadaPor: rootGetters['auth/currentUser']?.email || 'sistema',
            creada: new Date().toISOString()
        }
        commit('AGREGAR', nueva)
        return nueva
    },

    async cambiarEstado({ commit, getters }, { id, estado }) {
        const c = getters.porId(id)
        if (!c) throw new Error('La cotización no existe.')
        if (c.estado === 'cobrada') throw new Error('Una cotización cobrada ya no cambia de estado.')
        if (!ESTADOS[estado]) throw new Error('Estado no válido.')

        await esperar(150)
        commit('ACTUALIZAR', { ...c, estado })
    },

    async registrarAbono({ commit, getters }, { id, monto }) {
        const c = getters.porId(id)
        if (!c) throw new Error('La cotización no existe.')
        const nuevo = (c.abono || 0) + Math.round(monto)
        if (nuevo < 0) throw new Error('El abono no puede quedar negativo.')
        if (nuevo > c.total) throw new Error('El abono no puede superar el total del presupuesto.')

        await esperar(150)
        commit('ACTUALIZAR', { ...c, abono: nuevo })
    },

    async eliminarCotizacion({ commit, getters }, id) {
        const c = getters.porId(id)
        if (!c) throw new Error('La cotización no existe.')
        if (c.estado === 'cobrada') throw new Error('Una cotización cobrada no se elimina: queda en el historial.')
        if (c.abono > 0) throw new Error('Tiene un abono registrado. Anúlala en vez de eliminarla.')

        await esperar(150)
        commit('QUITAR', Number(id))
    },

    /** Deja la cotización lista para que el POS la cargue en la boleta */
    enviarACaja({ commit, getters }, id) {
        const c = getters.porId(id)
        if (!c) throw new Error('La cotización no existe.')
        if (c.estado !== 'aprobada') throw new Error('Solo se cobran las cotizaciones aprobadas.')
        commit('SET_EN_CAJA', c.id)
    },

    limpiarCaja({ commit }) { commit('SET_EN_CAJA', null) },

    /** La llama el POS cuando la boleta del evento se emite */
    marcarCobrada({ commit, getters }, id) {
        const c = getters.porId(id)
        if (c) commit('ACTUALIZAR', { ...c, estado: 'cobrada', fechaCobro: new Date().toISOString() })
        commit('SET_EN_CAJA', null)
    }
}

export default { namespaced: true, state, getters, mutations, actions }