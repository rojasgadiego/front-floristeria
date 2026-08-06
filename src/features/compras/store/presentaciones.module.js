/**
 * features/compras/store/presentaciones.module.js
 * =========================================================================
 * Cacheadas por producto: el formulario de compra las pide cada vez que se
 * elige un producto en una línea, y en una compra de ocho líneas eso serían
 * ocho peticiones repetidas.
 * =========================================================================
 */

import { presentacionesService } from "../service/presentaciones.service" 

export const TIPOS_PRESENTACION = [
  { valor: 'vara', texto: 'Vara', ayuda: 'Se compra de a una.' },
  { valor: 'paquete', texto: 'Paquete', ayuda: 'Atado de varias varas.' },
  { valor: 'caja', texto: 'Caja', ayuda: 'Varios paquetes juntos.' }
]

export default {
  namespaced: true,

  state: () => ({
    /* { [productoId]: PresentacionDto[] } */
    porProducto: {},
    cargando: null,
    guardando: false,
    error: null
  }),

  mutations: {
    SET_LISTA (state, { productoId, lista }) {
      state.porProducto = { ...state.porProducto, [productoId]: lista || [] }
    },
    INVALIDAR (state, productoId) {
      const copia = { ...state.porProducto }
      delete copia[productoId]
      state.porProducto = copia
    },
    SET_CARGANDO (state, id) { state.cargando = id },
    SET_GUARDANDO (state, v) { state.guardando = v },
    SET_ERROR (state, e) { state.error = e }
  },

  actions: {
    async cargar ({ commit, state }, { productoId, forzar = false, signal } = {}) {
      if (state.porProducto[productoId] && !forzar) return state.porProducto[productoId]

      commit('SET_CARGANDO', productoId)
      try {
        const lista = await presentacionesService.listar(productoId, { signal })
        commit('SET_LISTA', { productoId, lista })
        return lista
      } catch (error) {
        if (!error.esCancelado) commit('SET_ERROR', error.message)
        return []
      } finally {
        commit('SET_CARGANDO', null)
      }
    },

    async crear ({ commit, dispatch }, { productoId, ...peticion }) {
      commit('SET_GUARDANDO', true)
      try {
        const creada = await presentacionesService.crear(productoId, peticion)
        /* Recarga en vez de push: marcar una como predeterminada desmarca la
           anterior, y eso ocurre en la base. */
        await dispatch('cargar', { productoId, forzar: true })
        return creada
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    async actualizar ({ commit, dispatch }, { id, productoId, ...peticion }) {
      commit('SET_GUARDANDO', true)
      try {
        const actualizada = await presentacionesService.actualizar(id, peticion)
        await dispatch('cargar', { productoId, forzar: true })
        return actualizada
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    async eliminar ({ dispatch }, { id, productoId }) {
      await presentacionesService.eliminar(id)
      await dispatch('cargar', { productoId, forzar: true })
    }
  },

  getters: {
    de: state => (productoId) => state.porProducto[productoId] || [],

    activasDe: (state, getters) => (productoId) =>
      getters.de(productoId).filter(p => p.activa),

    /* La que el formulario de compra elige sola al agregar una línea. */
    predeterminadaDe: (state, getters) => (productoId) =>
      getters.activasDe(productoId).find(p => p.predeterminada) ||
      getters.activasDe(productoId)[0] || null,

    cargando: state => state.cargando,
    guardando: state => state.guardando,
    error: state => state.error
  }
}