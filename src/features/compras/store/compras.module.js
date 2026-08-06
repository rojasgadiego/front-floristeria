/**
 * features/compras/store/compras.module.js
 * =========================================================================
 * Una compra tiene dos vidas: borrador —editable, sin efecto en el stock— y
 * recibida, que es cuando nacen los lotes y ya no se toca nada.
 *
 * Esa frontera es lo que ordena toda la pantalla: mientras sea borrador se
 * corrige libremente; después, la única forma de revertir es registrar la
 * merma de sus lotes como devolución al proveedor.
 * =========================================================================
 */

import { comprasService } from "../service/compras.service"

export const ESTADOS = {
  borrador: { texto: 'Borrador', clase: 'et-ambar' },
  recibida: { texto: 'Recibida', clase: 'et-verde' },
  anulada: { texto: 'Anulada', clase: 'et-gris' }
}

export const textoEstado = (e) => ESTADOS[e]?.texto || e
export const claseEstado = (e) => ESTADOS[e]?.clase || 'et-gris'

const filtroInicial = () => ({
  buscar: '',
  proveedorId: null,
  estado: null,
  desde: null,
  hasta: null,
  pagina: 1,
  porPagina: 30
})

export default {
  namespaced: true,

  state: () => ({
    lista: [],
    total: 0,
    totalPaginas: 0,
    hayAnterior: false,
    haySiguiente: false,
    filtro: filtroInicial(),
    detalles: {},
    /* Resultado de la última recepción: son los códigos que hay que
       imprimir antes de guardar los paquetes en cámara. */
    recepcion: null,
    cargando: false,
    guardando: false,
    error: null
  }),

  mutations: {
    SET_PAGINA (state, p) {
      state.lista = p.items
      state.total = p.total
      state.totalPaginas = p.totalPaginas
      state.hayAnterior = p.hayAnterior
      state.haySiguiente = p.haySiguiente
      state.filtro.pagina = p.pagina
    },
    SET_FILTRO (state, cambios) {
      state.filtro = { ...state.filtro, ...cambios, pagina: cambios.pagina ?? 1 }
    },
    SET_DETALLE (state, d) { state.detalles = { ...state.detalles, [d.id]: d } },
    INVALIDAR_DETALLE (state, id) {
      const copia = { ...state.detalles }
      delete copia[id]
      state.detalles = copia
    },
    SET_RECEPCION (state, r) { state.recepcion = r },
    SET_CARGANDO (state, v) { state.cargando = v },
    SET_GUARDANDO (state, v) { state.guardando = v },
    SET_ERROR (state, e) { state.error = e },
    UPSERT (state, compra) {
      const i = state.lista.findIndex(c => c.id === compra.id)
      if (i !== -1) state.lista.splice(i, 1, { ...state.lista[i], ...compra })
    }
  },

  actions: {
    async cargar ({ commit, state }, { signal } = {}) {
      commit('SET_CARGANDO', true)
      commit('SET_ERROR', null)
      try {
        commit('SET_PAGINA', await comprasService.listar(state.filtro, { signal }))
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

    async cargarDetalle ({ commit, state }, { id, forzar = false, signal } = {}) {
      if (state.detalles[id] && !forzar) return state.detalles[id]
      const detalle = await comprasService.obtener(id, { signal })
      commit('SET_DETALLE', detalle)
      return detalle
    },

    async crear ({ commit, dispatch }, peticion) {
      commit('SET_GUARDANDO', true)
      try {
        const compra = await comprasService.crear(peticion)
        commit('SET_DETALLE', compra)
        await dispatch('cargar')
        return compra
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    async actualizar ({ commit }, { id, ...peticion }) {
      commit('SET_GUARDANDO', true)
      try {
        const compra = await comprasService.actualizar(id, peticion)
        commit('UPSERT', compra)
        commit('SET_DETALLE', compra)
        return compra
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    /**
     * Recibir es irreversible: nacen los lotes y el stock se sincroniza
     * solo. El resultado se guarda en `recepcion` porque lo que sigue es
     * imprimir las etiquetas — pegarlas antes de meter los paquetes a la
     * cámara es lo que hace que el QR sirva para algo.
     */
    async recibir ({ commit, dispatch }, id) {
      commit('SET_GUARDANDO', true)
      try {
        const resultado = await comprasService.recibir(id)
        commit('SET_RECEPCION', resultado)
        commit('INVALIDAR_DETALLE', id)
        await dispatch('cargar')

        /* Entró stock: el catálogo y las alertas de lote quedaron viejos */
        dispatch('productos/cargar', {}, { root: true })
        dispatch('lotes/cargarAlertas', {}, { root: true })
        dispatch('lotes/cargarCostoPromedio', {}, { root: true })

        return resultado
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    limpiarRecepcion ({ commit }) { commit('SET_RECEPCION', null) },

    async anular ({ commit }, id) {
      const compra = await comprasService.anular(id)
      commit('UPSERT', compra)
      commit('INVALIDAR_DETALLE', id)
      return compra
    },

    evolucionCosto (_, { productoId, signal } = {}) {
      return comprasService.evolucionCosto(productoId, { signal })
    }
  },

  getters: {
    compras: state => state.lista,
    total: state => state.total,
    totalPaginas: state => state.totalPaginas,
    hayAnterior: state => state.hayAnterior,
    haySiguiente: state => state.haySiguiente,
    filtro: state => state.filtro,
    cargando: state => state.cargando,
    guardando: state => state.guardando,
    error: state => state.error,
    recepcion: state => state.recepcion,

    detalleDe: state => (id) => state.detalles[id] || null,

    borradores: state => state.lista.filter(c => c.estado === 'borrador'),

    /* Solo un borrador se edita, se recibe o se anula. */
    esEditable: () => (compra) => compra?.estado === 'borrador'
  }
}