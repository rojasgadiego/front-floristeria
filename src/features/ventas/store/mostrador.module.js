/**
 * features/ventas/store/mostrador.module.js
 * =========================================================================
 * Las partidas del mesón: lo que bajó de un balde concreto, con su código y
 * su QR.
 *
 * El escaneo no guarda nada en el state: el resultado vive en el carrito,
 * que es quien decide si sirve. Acá solo pasa la consulta.
 * =========================================================================
 */

import { mostradorService } from '../services/mostrador.service'

const filtroInicial = () => ({
  buscar: '',
  productoId: null,
  incluirAgotadas: false,
  pagina: 1,
  tamano: 50
})

export default {
  namespaced: true,

  state: () => ({
    lista: [],
    total: 0,
    totalPaginas: 0,
    filtro: filtroInicial(),
    cargando: false,
    error: null
  }),

  mutations: {
    SET_PAGINA (state, { items, total, pagina, totalPaginas }) {
      state.lista = items
      state.total = total
      state.totalPaginas = totalPaginas
      state.filtro.pagina = pagina
    },
    SET_FILTRO (state, cambios) {
      state.filtro = { ...state.filtro, ...cambios, pagina: cambios.pagina ?? 1 }
    },
    SET_CARGANDO (state, v) { state.cargando = v },
    SET_ERROR (state, e) { state.error = e }
  },

  actions: {
    async cargar ({ commit, state }, payload) {
      commit('SET_CARGANDO', true)
      commit('SET_ERROR', null)
      try {
        commit('SET_PAGINA', await mostradorService.listar(state.filtro, {
          signal: payload?.signal
        }))
      } catch (error) {
        if (!error.esCancelado) commit('SET_ERROR', error.message)
      } finally {
        commit('SET_CARGANDO', false)
      }
    },

    async filtrar ({ commit, dispatch }, cambios) {
      commit('SET_FILTRO', cambios)
      await dispatch('cargar')
    },

    /**
     * Lo que llama el POS al escanear. Acepta el código pelado o el QR
     * completo.
     *
     * No toca el state: el resultado va directo al carrito. Guardarlo acá
     * dejaría "la última partida escaneada" viva después de la venta, que no
     * significa nada.
     */
    escanear (_, codigo) {
      return mostradorService.escanear(codigo)
    }
  },

  getters: {
    partidas: state => state.lista,
    total: state => state.total,
    totalPaginas: state => state.totalPaginas,
    filtro: state => state.filtro,
    cargando: state => state.cargando,
    error: state => state.error,

    /* Las que vencen hoy o mañana: son las que hay que empujar. */
    porVencer: state => state.lista.filter(
      p => p.diasParaVencer != null && p.diasParaVencer <= 1 && p.cantidadDisponible > 0
    ),

    /* Las que llevan más de dos días adelante sin agotarse. Si no rotan,
       terminan en merma. */
    estancadas: state => state.lista.filter(
      p => p.diasEnMeson > 2 && p.cantidadDisponible > 0
    )
  }
}