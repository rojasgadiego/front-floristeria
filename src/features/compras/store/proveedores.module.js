/**
 * features/compras/store/proveedores.module.js
 * =========================================================================
 * Los proveedores cambian poco y los necesita el formulario de compra, así
 * que se cargan una vez y se reutilizan.
 * =========================================================================
 */

import { proveedoresService } from "../service/proveedores.service"

const filtroInicial = () => ({
    buscar: '',
    activo: true,
    pagina: 1,
    porPagina: 100
})

export default {
    namespaced: true,

    state: () => ({
        lista: [],
        total: 0,
        filtro: filtroInicial(),
        cargada: false,
        cargando: false,
        guardando: false,
        error: null
    }),

    mutations: {
        SET_PAGINA(state, { items, total, pagina }) {
            state.lista = items
            state.total = total
            state.filtro.pagina = pagina
            state.cargada = true
        },
        SET_FILTRO(state, cambios) {
            state.filtro = { ...state.filtro, ...cambios, pagina: cambios.pagina ?? 1 }
        },
        SET_CARGANDO(state, v) { state.cargando = v },
        SET_GUARDANDO(state, v) { state.guardando = v },
        SET_ERROR(state, e) { state.error = e },
        UPSERT(state, proveedor) {
            const i = state.lista.findIndex(p => p.id === proveedor.id)
            if (i === -1) state.lista = [...state.lista, proveedor]
            else state.lista.splice(i, 1, { ...state.lista[i], ...proveedor })
        }
    },

    actions: {
        async cargar({ commit, state }, { signal, forzar = false } = {}) {
            if (state.cargada && !forzar) return state.lista

            commit('SET_CARGANDO', true)
            commit('SET_ERROR', null)
            try {
                commit('SET_PAGINA', await proveedoresService.listar(state.filtro, { signal }))
                return state.lista
            } catch (error) {
                if (!error.esCancelado) commit('SET_ERROR', error.message)
                return []
            } finally {
                commit('SET_CARGANDO', false)
            }
        },

        async filtrar({ commit, dispatch }, cambios) {
            commit('SET_FILTRO', cambios)
            await dispatch('cargar', { forzar: true })
        },

        async crear({ commit }, peticion) {
            commit('SET_GUARDANDO', true)
            try {
                const proveedor = await proveedoresService.crear(peticion)
                commit('UPSERT', proveedor)
                return proveedor
            } finally {
                commit('SET_GUARDANDO', false)
            }
        },

        async actualizar({ commit }, { id, ...peticion }) {
            commit('SET_GUARDANDO', true)
            try {
                const proveedor = await proveedoresService.actualizar(id, peticion)
                commit('UPSERT', proveedor)
                return proveedor
            } finally {
                commit('SET_GUARDANDO', false)
            }
        },

        /* No hay baja definitiva: las compras y los lotes lo referencian. */
        async cambiarEstado({ commit }, { id, activo }) {
            const proveedor = activo
                ? await proveedoresService.activar(id)
                : await proveedoresService.desactivar(id)
            commit('UPSERT', proveedor)
            return proveedor
        }
    },

    getters: {
        proveedores: state => state.lista,
        activos: state => state.lista.filter(p => p.activo),
        total: state => state.total,
        filtro: state => state.filtro,
        cargando: state => state.cargando,
        guardando: state => state.guardando,
        error: state => state.error,
        porId: state => (id) => state.lista.find(p => p.id === id) || null
    }
}