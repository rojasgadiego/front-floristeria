/**
 * features/ventas/store/caja.module.js
 * =========================================================================
 * Sin caja abierta no se vende, y tampoco se abonan cotizaciones. Por eso
 * este módulo se consulta al cargar el punto de venta: la primera pregunta
 * no es qué vender sino si se puede.
 * =========================================================================
 */

import { cajaService } from '../services/caja.service'

export default {
  namespaced: true,

  state: () => ({
    actual: null,
    historial: [],
    total: 0,
    filtro: { desde: null, hasta: null, pagina: 1, porPagina: 30 },
    cargando: false,
    guardando: false,
    error: null
  }),

  mutations: {
    SET_ACTUAL (state, c) { state.actual = c },
    SET_HISTORIAL (state, { items, total, pagina }) {
      state.historial = items
      state.total = total
      state.filtro.pagina = pagina
    },
    SET_FILTRO (state, cambios) {
      state.filtro = { ...state.filtro, ...cambios, pagina: cambios.pagina ?? 1 }
    },
    SET_CARGANDO (state, v) { state.cargando = v },
    SET_GUARDANDO (state, v) { state.guardando = v },
    SET_ERROR (state, e) { state.error = e }
  },

  actions: {
    async cargarActual ({ commit }, { signal } = {}) {
      commit('SET_CARGANDO', true)
      try {
        /* Devuelve null cuando no hay turno abierto: no es un error, es el
           estado normal antes de que alguien abra. */
        commit('SET_ACTUAL', await cajaService.actual({ signal }))
      } catch (error) {
        if (!error.esCancelado) commit('SET_ERROR', error.message)
      } finally {
        commit('SET_CARGANDO', false)
      }
    },

    async abrir ({ commit, dispatch }, fondoInicial) {
      commit('SET_GUARDANDO', true)
      try {
        await cajaService.abrir(Math.round(fondoInicial || 0))
        /* Se recarga el resumen en vez de usar lo que devolvió abrir: el
           CajaDto de la apertura no trae los totales del turno. */
        await dispatch('cargarActual')
        return true
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    async cerrar ({ commit }, { efectivoContado, nota }) {
      commit('SET_GUARDANDO', true)
      try {
        const resumen = await cajaService.cerrar({
          efectivoContado: Math.round(efectivoContado || 0),
          nota: (nota || '').trim() || null
        })
        commit('SET_ACTUAL', null)
        return resumen
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    /** Refresca los totales del turno tras cada venta. */
    async refrescar ({ commit, state }) {
      if (!state.actual) return
      try {
        commit('SET_ACTUAL', await cajaService.resumen(state.actual.id))
      } catch {
        /* Silencioso: es un refresco de fondo, no una acción del usuario. */
      }
    },

    resumen (_, { id, signal } = {}) {
      return cajaService.resumen(id, { signal })
    },

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

    async filtrarHistorial ({ commit, dispatch }, cambios) {
      commit('SET_FILTRO', cambios)
      await dispatch('cargarHistorial')
    }
  },

  getters: {
    caja: state => state.actual,
    abierta: state => !!state.actual && state.actual.estado === 'abierta',
    cajaId: state => state.actual?.id ?? null,

    /* Lo que debería haber físicamente en el cajón ahora mismo. */
    enCajon: state => state.actual?.enCajon ?? 0,
    efectivo: state => state.actual?.efectivo ?? 0,
    fondoInicial: state => state.actual?.fondoInicial ?? 0,
    totalVendido: state => state.actual?.totalVendido ?? 0,
    boletas: state => state.actual?.boletas ?? 0,

    historial: state => state.historial,
    total: state => state.total,
    filtro: state => state.filtro,
    cargando: state => state.cargando,
    guardando: state => state.guardando,
    error: state => state.error,

    /* Turnos cerrados con diferencia: lo que conviene revisar. */
    descuadrados: state => state.historial.filter(c => (c.diferencia ?? 0) !== 0)
  }
}