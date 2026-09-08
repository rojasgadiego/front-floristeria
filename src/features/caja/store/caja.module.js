/**
 * features/ventas/store/caja.module.js
 * =========================================================================
 * El turno de caja. Solo puede haber uno abierto a la vez, y sin él no se
 * vende: el POS pregunta por `abierta` antes de habilitar el cobro.
 *
 * Se carga una vez al entrar y se refresca después de cada venta, porque
 * el arqueo cambia con cada boleta.
 * =========================================================================
 */

import { cajaService } from '../services/caja.service'

const filtroInicial = () => ({
  desde: null,
  hasta: null,
  pagina: 1,
  porPagina: 30
})

export default {
  namespaced: true,

  state: () => ({
    /* El turno abierto con su arqueo al momento. null = no hay ninguno. */
    actual: null,

    historial: [],
    total: 0,
    filtro: filtroInicial(),

    /* El resumen que se muestra justo después de cerrar. Vive aparte de
       `actual` porque ese pasa a null al cerrar, y la pantalla necesita
       seguir mostrando la diferencia. */
    cierre: null,

    cargando: false,
    guardando: false,
    error: null
  }),

  mutations: {
    SET_ACTUAL (state, caja) { state.actual = caja },
    SET_HISTORIAL (state, { items, total, pagina }) {
      state.historial = items
      state.total = total
      state.filtro.pagina = pagina
    },
    SET_FILTRO (state, cambios) {
      state.filtro = { ...state.filtro, ...cambios, pagina: cambios.pagina ?? 1 }
    },
    SET_CIERRE (state, caja) { state.cierre = caja },
    SET_CARGANDO (state, v) { state.cargando = v },
    SET_GUARDANDO (state, v) { state.guardando = v },
    SET_ERROR (state, e) { state.error = e }
  },

  actions: {
    /**
     * Devuelve null sin error cuando no hay turno: es el estado normal
     * antes de que alguien abra por la mañana, no una falla.
     */
    async cargar ({ commit }, { signal } = {}) {
      commit('SET_CARGANDO', true)
      commit('SET_ERROR', null)
      try {
        const caja = await cajaService.actual({ signal })
        commit('SET_ACTUAL', caja)
        return caja
      } catch (error) {
        if (!error.esCancelado) commit('SET_ERROR', error.message)
        return null
      } finally {
        commit('SET_CARGANDO', false)
      }
    },

    async abrir ({ commit }, fondoInicial) {
      commit('SET_GUARDANDO', true)
      try {
        const caja = await cajaService.abrir(fondoInicial)
        commit('SET_ACTUAL', caja)
        commit('SET_CIERRE', null)
        return caja
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    /**
     * Al cerrar, `actual` pasa a null y el resumen queda en `cierre`: la
     * pantalla tiene que seguir mostrando la diferencia después de que el
     * turno dejó de existir.
     */
    async cerrar ({ commit }, { efectivoContado, nota = null }) {
      commit('SET_GUARDANDO', true)
      try {
        const caja = await cajaService.cerrar({ efectivoContado, nota })
        commit('SET_CIERRE', caja)
        commit('SET_ACTUAL', null)
        return caja
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    limpiarCierre ({ commit }) { commit('SET_CIERRE', null) },

    async cargarHistorial ({ commit, state }, { signal } = {}) {
      commit('SET_CARGANDO', true)
      try {
        commit('SET_HISTORIAL', await cajaService.historial(state.filtro, { signal }))
      } catch (error) {
        if (!error.esCancelado) commit('SET_ERROR', error.message)
      } finally {
        commit('SET_CARGANDO', false)
      }
    },

    async filtrar ({ commit, dispatch }, cambios) {
      commit('SET_FILTRO', cambios)
      await dispatch('cargarHistorial')
    },

    /** Después de cada venta: el arqueo cambió. */
    refrescar ({ dispatch }) { return dispatch('cargar') }
  },

  getters: {
    actual: state => state.actual,
    abierta: state => !!state.actual,

    /* Lo que el POS pregunta antes de habilitar el cobro. */
    puedeVender: state => !!state.actual,

    historial: state => state.historial,
    total: state => state.total,
    filtro: state => state.filtro,
    cierre: state => state.cierre,
    cargando: state => state.cargando,
    guardando: state => state.guardando,
    error: state => state.error,

    /* Cuánto lleva abierta, para el encabezado. */
    horasAbierta: state => {
      if (!state.actual) return 0
      return Math.floor((Date.now() - new Date(state.actual.abiertaEn)) / 3600000)
    }
  }
}
