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
    guardando: false,
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
    SET_GUARDANDO (state, v) { state.guardando = v },
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
    },

    /** En orden de consumo: lo que vence antes sale primero. */
    deProducto (_, { productoId, signal } = {}) {
      return mostradorService.deProducto(productoId, { signal })
    },

    /**
     * Baja varas de un lote al mesón. Devuelve la partida con su código y
     * su QR, que es lo que hay que imprimir y pegar al balde.
     */
    async traspasar ({ commit, dispatch }, { lote, cantidad, notas = null }) {
      commit('SET_GUARDANDO', true)
      try {
        const partida = await mostradorService.traspasar({ lote, cantidad, notas })
        await dispatch('cargar')
        /* El stock del producto cambió de lugar: salió de bodega y entró al
           mesón. La grilla de inventario tiene que reflejarlo. */
        dispatch('productos/cargar', {}, { root: true })
        return partida
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    /** Para lo que no controla lotes: jarrones, cintas, tarjetas. */
    async traspasarProducto ({ commit, dispatch }, { productoId, cantidad, notas = null }) {
      commit('SET_GUARDANDO', true)
      try {
        const partida = await mostradorService.traspasarProducto({
          productoId, cantidad, notas
        })
        await dispatch('cargar')
        dispatch('productos/cargar', {}, { root: true })
        return partida
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    /** Devuelve al lote del que salió. Bajar de más pasa. */
    async retornar ({ commit, dispatch }, { partida, cantidad, notas = null }) {
      commit('SET_GUARDANDO', true)
      try {
        const r = await mostradorService.retornar({ partida, cantidad, notas })
        await dispatch('cargar')
        dispatch('productos/cargar', {}, { root: true })
        return r
      } finally {
        commit('SET_GUARDANDO', false)
      }
    }
  },

  getters: {
    partidas: state => state.lista,
    total: state => state.total,
    totalPaginas: state => state.totalPaginas,
    filtro: state => state.filtro,
    cargando: state => state.cargando,
    guardando: state => state.guardando,
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