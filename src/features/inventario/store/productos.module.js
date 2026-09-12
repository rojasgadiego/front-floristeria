/**
 * features/inventario/store/productos.module.js
 * =========================================================================
 * El catálogo lo comparten inventario y el POS, y cada uno lo mira
 * distinto: bodega quiere todo —incluido lo que está en cero, que es
 * justo lo que hay que reponer— y el mesón solo lo que puede entregar.
 *
 * Por eso cada vista fija el filtro COMPLETO al montar en vez de asumir que
 * viene limpio: sin eso, entrar a bodega después del POS muestra el
 * mostrador hasta que llega la respuesta.
 * =========================================================================
 */

import { productosService } from '../services/productos.service'

export const TIPOS = [
  {
    valor: 'simple',
    texto: 'Simple',
    descripcion: 'Una flor, un insumo, algo que se compra y se vende'
  },
  {
    valor: 'armado',
    texto: 'Armado',
    descripcion: 'Un ramo o arreglo que se monta con otros productos'
  }
]

const filtroInicial = () => ({
  buscar: '',
  categoriaId: null,
  tipo: null,
  activo: true,
  bajoMinimo: false,
  controlaLotes: null,
  soloEnVenta: false,
  pagina: 1,
  tamano: 100
})

export default {
  namespaced: true,

  state: () => ({
    lista: [],
    total: 0,
    totalPaginas: 0,
    filtro: filtroInicial(),

    /* El producto que está abierto en el formulario. null = cerrado.
       Se guarda el objeto completo, no solo el id: el modal necesita los
       valores actuales para pre-llenarse sin otro viaje. */
    editando: null,
    formularioAbierto: false,

    cargando: false,
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

      /* La lista se vacía al cambiar el filtro: si no, la grilla muestra el
         resultado anterior hasta que llega el nuevo, y al pasar del POS a
         bodega eso significa ver el mostrador en la pantalla de bodega. */
      state.lista = []
    },

    RESET_FILTRO(state) { state.filtro = filtroInicial() },

    ABRIR_FORMULARIO(state, producto) {
      state.editando = producto
      state.formularioAbierto = true
    },
    CERRAR_FORMULARIO(state) {
      state.editando = null
      state.formularioAbierto = false
    },

    UPSERT(state, producto) {
      const i = state.lista.findIndex(p => p.id === producto.id)
      if (i !== -1) state.lista.splice(i, 1, { ...state.lista[i], ...producto })
    },

    SET_CARGANDO(state, v) { state.cargando = v },
    SET_GUARDANDO(state, v) { state.guardando = v },
    SET_ERROR(state, e) { state.error = e }
  },

  actions: {
    async cargar({ commit, state }, payload) {
      commit('SET_CARGANDO', true)
      commit('SET_ERROR', null)
      try {
        commit('SET_PAGINA', await productosService.listar(state.filtro, {
          signal: payload?.signal
        }))
      } catch (error) {
        if (!error.esCancelado) commit('SET_ERROR', error.message)
      } finally {
        commit('SET_CARGANDO', false)
      }
    },

    /**
     * El commit va ANTES del dispatch: vacía la lista en el mismo tick, y la
     * grilla pasa directo de nada a "cargando". Si se pidiera primero, habría
     * un render con los datos de la vista anterior.
     */
    async filtrar({ commit, dispatch }, cambios) {
      commit('SET_FILTRO', cambios)
      await dispatch('cargar')
    },

    /* ---------------- Formulario ---------------- */

    abrirFormulario({ commit }, producto = null) {
      commit('ABRIR_FORMULARIO', producto)
    },

    cerrarFormulario({ commit }) { commit('CERRAR_FORMULARIO') },

    async crear({ commit, dispatch }, datos) {
      commit('SET_GUARDANDO', true)
      try {
        const p = await productosService.crear(datos)
        /* Recarga en vez de push: la lista viene ordenada y paginada por el
           servidor, e insertar a mano la desincroniza del total. */
        await dispatch('cargar')
        return p
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    async actualizar({ commit }, { id, ...datos }) {
      commit('SET_GUARDANDO', true)
      try {
        const p = await productosService.actualizar(id, datos)
        commit('UPSERT', p)
        return p
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    async cambiarEstado({ commit }, { id, activo }) {
      const p = await productosService.cambiarEstado(id, activo)
      commit('UPSERT', p)
      return p
    },

    /**
     * Para el lector del mesón. Devuelve null si no existe en vez de lanzar:
     * en el POS, escanear algo que no está en el catálogo es un caso
     * esperado, no una falla.
     */
    async porCodigo(_, { codigo, signal } = {}) {
      try {
        return await productosService.porCodigo(codigo, { signal })
      } catch (e) {
        if (e.status === 404) return null
        throw e
      }
    }
  },

  getters: {
    productos: state => state.lista,
    total: state => state.total,
    totalPaginas: state => state.totalPaginas,
    filtro: state => state.filtro,

    editando: state => state.editando,
    formularioAbierto: state => state.formularioAbierto,

    cargando: state => state.cargando,
    guardando: state => state.guardando,
    error: state => state.error,

    /* Lo que se puede vender en el mesón ahora mismo. */
    enMostrador: state => state.lista.filter(p => (p.enVenta ?? 0) > 0),

    /* Lo que hay que comprar. Es la lista con la que se va al terminal. */
    bajoMinimo: state => state.lista.filter(p => p.bajoMinimo && p.activo),

    /* Los armados: son los únicos que llevan receta y los únicos que se
       pueden desarmar. */
    armados: state => state.lista.filter(p => p.tipo === 'armado'),

    /* Margen bajo el 25%: en una florería la merma se come esa diferencia
       antes de fin de mes. */
    margenBajo: state => state.lista.filter(p => p.activo && p.margen != null && p.margen < 25),

    porId: state => (id) => state.lista.find(p => p.id === id) ?? null
  }
}
