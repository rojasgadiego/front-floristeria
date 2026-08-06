/**
 * features/inventario/store/inventario.module.js
 * =========================================================================
 * Kardex, alertas y categorías. Los productos van en su propio módulo:
 * son otro controller y otro ciclo de vida.
 *
 * Este módulo NO calcula nada. En el mock, `valorCosto`, `disponible`,
 * `margenDe` y `posiblesDeArmar` eran getters que recorrían el arreglo
 * completo. Ahora ProductoDto los trae resueltos desde el servidor, que es
 * el único que ve los lotes y sabe repartir el costo.
 * =========================================================================
 */

import { inventarioService } from '../services/inventario.service'

/* Clase de etiqueta por tipo de movimiento. Los tipos salen del backend
   (MovimientoFiltro los enumera); el color es decisión de la interfaz. */
export const CLASE_MOVIMIENTO = {
    alta: 'et-azul',
    entrada: 'et-verde',
    armado: 'et-verde',
    salida: 'et-rosa',
    venta: 'et-rosa',
    consumo: 'et-ambar',
    ajuste: 'et-ambar',
    merma: 'et-rosa',
    baja: 'et-gris'
}

export const claseMovimiento = (tipo) => CLASE_MOVIMIENTO[tipo] || 'et-gris'

const filtroInicial = () => ({
    productoId: null,
    loteId: null,
    tipo: null,
    desde: null,
    hasta: null,
    pagina: 1,
    porPagina: 30
})

export default {
    namespaced: true,

    state: () => ({
        movimientos: [],
        totalMovimientos: 0,
        filtroMovimientos: filtroInicial(),
        categorias: [],
        bajoMinimo: [],
        cargandoMovimientos: false,
        cargandoCategorias: false,
        error: null
    }),

    mutations: {
        SET_MOVIMIENTOS(state, { items, total, pagina }) {
            state.movimientos = items
            state.totalMovimientos = total
            state.filtroMovimientos.pagina = pagina
        },
        SET_FILTRO_MOVIMIENTOS(state, cambios) {
            state.filtroMovimientos = {
                ...state.filtroMovimientos, ...cambios, pagina: cambios.pagina ?? 1
            }
        },
        SET_CATEGORIAS(state, c) { state.categorias = c || [] },
        SET_BAJO_MINIMO(state, p) { state.bajoMinimo = p || [] },
        SET_CARGANDO_MOVIMIENTOS(state, v) { state.cargandoMovimientos = v },
        SET_CARGANDO_CATEGORIAS(state, v) { state.cargandoCategorias = v },
        SET_ERROR(state, e) { state.error = e },
        AGREGAR_CATEGORIA(state, c) {
            state.categorias = [...state.categorias, c].sort((a, b) => a.orden - b.orden)
        }
    },

    actions: {
        async cargarMovimientos({ commit, state }, { signal } = {}) {
            commit('SET_CARGANDO_MOVIMIENTOS', true)
            try {
                commit('SET_MOVIMIENTOS',
                    await inventarioService.movimientos(state.filtroMovimientos, { signal }))
            } catch (error) {
                if (!error.esCancelado) commit('SET_ERROR', error.message)
            } finally {
                commit('SET_CARGANDO_MOVIMIENTOS', false)
            }
        },

        async filtrarMovimientos({ commit, dispatch }, cambios) {
            commit('SET_FILTRO_MOVIMIENTOS', cambios)
            await dispatch('cargarMovimientos')
        },

        /**
         * Las categorías cambian poco. Se cargan una vez y se reutilizan: son la
         * fuente del select del formulario de producto, así que las necesita
         * cualquier pantalla que cree o edite uno.
         */
        async cargarCategorias({ commit, state }, { signal, forzar = false } = {}) {
            if (state.categorias.length && !forzar) return state.categorias

            commit('SET_CARGANDO_CATEGORIAS', true)
            try {
                const categorias = await inventarioService.categorias({ signal })
                commit('SET_CATEGORIAS', categorias)
                return categorias
            } catch (error) {
                if (!error.esCancelado) commit('SET_ERROR', error.message)
                return []
            } finally {
                commit('SET_CARGANDO_CATEGORIAS', false)
            }
        },

        async crearCategoria({ commit }, { nombre, orden = 0 }) {
            const creada = await inventarioService.crearCategoria({ nombre, orden })
            commit('AGREGAR_CATEGORIA', creada)
            return creada
        },

        async cargarBajoMinimo({ commit }, { signal } = {}) {
            try {
                commit('SET_BAJO_MINIMO', await inventarioService.bajoMinimo({ signal }))
            } catch (error) {
                if (!error.esCancelado) commit('SET_BAJO_MINIMO', [])
            }
        }
    },

    getters: {
        movimientos: state => state.movimientos,
        totalMovimientos: state => state.totalMovimientos,
        filtroMovimientos: state => state.filtroMovimientos,
        cargandoMovimientos: state => state.cargandoMovimientos,

        categorias: state => state.categorias,
        categoriaPorId: state => (id) => state.categorias.find(c => c.id === id) || null,

        bajoMinimo: state => state.bajoMinimo,
        hayFaltantes: state => state.bajoMinimo.length > 0,

        error: state => state.error
    }
}