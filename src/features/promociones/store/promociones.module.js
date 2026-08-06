/**
 * features/promociones/store/promociones.module.js
 * =========================================================================
 * Una promoción activa no es lo mismo que una promoción vigente: puede estar
 * activa pero fuera de fecha, o fuera del día habilitado. El backend
 * distingue las dos cosas y manda `motivoNoVigente`, que es lo que evita que
 * alguien mire la lista y no entienda por qué el POS no la ofrece.
 * =========================================================================
 */

import { promocionesService } from '../services/promociones.service'

export const TIPOS = [
    { valor: 'porcentaje', texto: 'Porcentaje', sufijo: '%' },
    { valor: 'monto', texto: 'Monto fijo', sufijo: '$' }
]

export const ALCANCES = [
    {
        valor: 'boleta',
        texto: 'Toda la boleta',
        ayuda: 'Descuenta sobre el total de la compra.'
    },
    {
        valor: 'categoria',
        texto: 'Una categoría',
        ayuda: 'Solo sobre los productos de esa categoría.'
    },
    {
        valor: 'producto',
        texto: 'Un producto',
        ayuda: 'Solo sobre ese producto en particular.'
    }
]

/* 0 = domingo, según lo que espera el backend */
export const DIAS = [
    { valor: 0, texto: 'Dom' },
    { valor: 1, texto: 'Lun' },
    { valor: 2, texto: 'Mar' },
    { valor: 3, texto: 'Mié' },
    { valor: 4, texto: 'Jue' },
    { valor: 5, texto: 'Vie' },
    { valor: 6, texto: 'Sáb' }
]

export const textoTipo = (v) => TIPOS.find(t => t.valor === v)?.texto ?? v
export const textoAlcance = (v) => ALCANCES.find(a => a.valor === v)?.texto ?? v

/** "10%" o "$2.000", según el tipo. */
export function valorLegible(promo) {
    if (!promo) return ''
    return promo.tipo === 'porcentaje'
        ? `${promo.valor}%`
        : new Intl.NumberFormat('es-CL', {
            style: 'currency', currency: 'CLP', maximumFractionDigits: 0
        }).format(promo.valor)
}

const filtroInicial = () => ({
    buscar: '',
    activa: null,
    soloVigentes: false,
    alcance: null,
    pagina: 1,
    porPagina: 50
})

export default {
    namespaced: true,

    state: () => ({
        lista: [],
        total: 0,
        totalPaginas: 0,
        filtro: filtroInicial(),
        detalles: {},
        vigentes: [],
        simulacion: null,
        cargando: false,
        simulando: false,
        guardando: false,
        error: null
    }),

    mutations: {
        SET_PAGINA(state, { items, total, pagina, totalPaginas }) {
            state.lista = items
            state.total = total
            state.totalPaginas = totalPaginas
            state.filtro.pagina = pagina
        },
        SET_FILTRO(state, cambios) {
            state.filtro = { ...state.filtro, ...cambios, pagina: cambios.pagina ?? 1 }
        },
        SET_VIGENTES(state, v) { state.vigentes = v || [] },
        SET_DETALLE(state, d) { state.detalles = { ...state.detalles, [d.id]: d } },
        INVALIDAR_DETALLE(state, id) {
            const copia = { ...state.detalles }
            delete copia[id]
            state.detalles = copia
        },
        SET_SIMULACION(state, s) { state.simulacion = s },
        SET_CARGANDO(state, v) { state.cargando = v },
        SET_SIMULANDO(state, v) { state.simulando = v },
        SET_GUARDANDO(state, v) { state.guardando = v },
        SET_ERROR(state, e) { state.error = e },
        UPSERT(state, promo) {
            const i = state.lista.findIndex(p => p.id === promo.id)
            if (i !== -1) state.lista.splice(i, 1, { ...state.lista[i], ...promo })
        },
        QUITAR(state, id) {
            state.lista = state.lista.filter(p => p.id !== id)
        }
    },

    actions: {
        async cargar({ commit, state }, { signal } = {}) {
            commit('SET_CARGANDO', true)
            commit('SET_ERROR', null)
            try {
                commit('SET_PAGINA', await promocionesService.listar(state.filtro, { signal }))
            } catch (error) {
                if (!error.esCancelado) commit('SET_ERROR', error.message)
            } finally {
                commit('SET_CARGANDO', false)
            }
        },

        async filtrar({ commit, dispatch }, cambios) {
            commit('SET_FILTRO', cambios)
            await dispatch('cargar')
        },

        /** Para el POS: lo único que puede ofrecer ahora mismo. */
        async cargarVigentes({ commit }, { signal } = {}) {
            try {
                commit('SET_VIGENTES', await promocionesService.vigentes({ signal }))
            } catch {
                commit('SET_VIGENTES', [])
            }
        },

        async cargarDetalle({ commit, state }, { id, forzar = false, signal } = {}) {
            if (state.detalles[id] && !forzar) return state.detalles[id]
            const detalle = await promocionesService.obtener(id, { signal })
            commit('SET_DETALLE', detalle)
            return detalle
        },

        async crear({ commit, dispatch }, peticion) {
            commit('SET_GUARDANDO', true)
            try {
                const promo = await promocionesService.crear(peticion)
                commit('SET_DETALLE', promo)
                await Promise.all([dispatch('cargar'), dispatch('cargarVigentes')])
                return promo
            } finally {
                commit('SET_GUARDANDO', false)
            }
        },

        async actualizar({ commit, dispatch }, { id, ...peticion }) {
            commit('SET_GUARDANDO', true)
            try {
                const promo = await promocionesService.actualizar(id, peticion)
                commit('UPSERT', promo)
                commit('SET_DETALLE', promo)
                dispatch('cargarVigentes')
                return promo
            } finally {
                commit('SET_GUARDANDO', false)
            }
        },

        async cambiarEstado({ commit, dispatch }, { id, activa }) {
            const promo = activa
                ? await promocionesService.activar(id)
                : await promocionesService.desactivar(id)
            commit('UPSERT', promo)
            commit('INVALIDAR_DETALLE', id)
            dispatch('cargarVigentes')
            return promo
        },

        async eliminar({ commit }, id) {
            await promocionesService.eliminar(id)
            commit('QUITAR', id)
            commit('INVALIDAR_DETALLE', id)
        },

        /**
         * Simula sin guardar. Se usa desde el formulario, con la promoción a
         * medio escribir: es la respuesta a "¿cuánto me va a costar esto?" en el
         * momento en que se está decidiendo, no un mes después.
         */
        async simular({ commit }, { promocion, periodoDesde, periodoHasta } = {}) {
            commit('SET_SIMULANDO', true)
            commit('SET_SIMULACION', null)
            try {
                const simulacion = await promocionesService.simular(promocion, {
                    periodoDesde, periodoHasta
                })
                commit('SET_SIMULACION', simulacion)
                return simulacion
            } finally {
                commit('SET_SIMULANDO', false)
            }
        },

        limpiarSimulacion({ commit }) { commit('SET_SIMULACION', null) }
    },

    getters: {
        promociones: state => state.lista,
        total: state => state.total,
        totalPaginas: state => state.totalPaginas,
        filtro: state => state.filtro,
        vigentes: state => state.vigentes,
        simulacion: state => state.simulacion,
        cargando: state => state.cargando,
        simulando: state => state.simulando,
        guardando: state => state.guardando,
        error: state => state.error,

        detalleDe: state => (id) => state.detalles[id] || null,

        /* Activas que igual no corren hoy: es el caso que más confunde, porque
           en la lista se ven "encendidas" y el POS no las ofrece. */
        activasNoVigentes: state =>
            state.lista.filter(p => p.activa && !p.vigenteHoy),

        descuentoAcumulado: state =>
            state.lista.reduce((t, p) => t + (p.descuentoAcumulado || 0), 0)
    }
}