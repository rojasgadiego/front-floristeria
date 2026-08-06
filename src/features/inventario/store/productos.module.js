/**
 * features/inventario/store/productos.module.js
 * =========================================================================
 * Este módulo NO calcula nada.
 *
 * En el mock, `disponible`, `costoDe`, `margenDe`, `posiblesDeArmar` y
 * `valorCosto` eran getters que recorrían el arreglo. ProductoDto ya los
 * trae resueltos, y con razón: el costo real depende de qué lotes hay en
 * cámara y a qué precio entró cada uno. El front no ve eso.
 * =========================================================================
 */

import { productosService } from '../services/productos.service'

export const TIPOS = [
    { valor: 'simple', texto: 'Simple', ayuda: 'Tallo, planta o insumo.' },
    { valor: 'armado', texto: 'Armado', ayuda: 'Ramo o arreglo con receta.' }
]

/* El backend no expone una lista de motivos para ajustes, a diferencia de
   mermas. Se ofrecen en un select igual, para que el kardex no termine con
   "conteo", "Conteo" y "conteo fisico" como tres motivos distintos. */
export const MOTIVOS_AJUSTE = [
    'Conteo físico',
    'Recepción de compra',
    'Corrección de carga',
    'Devolución de cliente',
    'Uso interno',
    'Traslado entre locales'
]

const filtroInicial = () => ({
    buscar: '',
    tipo: null,
    categoriaId: null,
    activo: true,
    bajoMinimo: false,
    controlaLotes: null,
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
        /* Detalle cacheado por id: trae receta y "usado en", que la lista no
           incluye. Se invalida al guardar. */
        detalles: {},
        disponibilidad: null,
        cargando: false,
        cargandoDetalle: null,
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
        RESET_FILTRO(state) { state.filtro = filtroInicial() },
        SET_CARGANDO(state, v) { state.cargando = v },
        SET_CARGANDO_DETALLE(state, id) { state.cargandoDetalle = id },
        SET_GUARDANDO(state, v) { state.guardando = v },
        SET_ERROR(state, e) { state.error = e },
        SET_DETALLE(state, d) { state.detalles = { ...state.detalles, [d.id]: d } },
        INVALIDAR_DETALLE(state, id) {
            const copia = { ...state.detalles }
            delete copia[id]
            state.detalles = copia
        },
        SET_DISPONIBILIDAD(state, d) { state.disponibilidad = d },
        UPSERT(state, producto) {
            const i = state.lista.findIndex(p => p.id === producto.id)
            if (i !== -1) state.lista.splice(i, 1, { ...state.lista[i], ...producto })
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
                commit('SET_PAGINA', await productosService.listar(state.filtro, { signal }))
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

        /** Se llama al abrir la receta o el formulario de edición. */
        async cargarDetalle({ commit, state }, { id, forzar = false, signal } = {}) {
            if (state.detalles[id] && !forzar) return state.detalles[id]

            commit('SET_CARGANDO_DETALLE', id)
            try {
                const detalle = await productosService.obtener(id, { signal })
                commit('SET_DETALLE', detalle)
                return detalle
            } catch (error) {
                if (!error.esCancelado) commit('SET_ERROR', error.message)
                return null
            } finally {
                commit('SET_CARGANDO_DETALLE', null)
            }
        },

        async crear({ commit, dispatch }, peticion) {
            commit('SET_GUARDANDO', true)
            try {
                const creado = await productosService.crear(peticion)
                commit('SET_DETALLE', creado)
                /* Recarga: la lista viene ordenada y paginada por el servidor. */
                await dispatch('cargar')
                return creado
            } finally {
                commit('SET_GUARDANDO', false)
            }
        },

        async actualizar({ commit }, { id, ...peticion }) {
            commit('SET_GUARDANDO', true)
            try {
                const actualizado = await productosService.actualizar(id, peticion)
                commit('UPSERT', actualizado)
                commit('SET_DETALLE', actualizado)
                return actualizado
            } finally {
                commit('SET_GUARDANDO', false)
            }
        },

        /**
         * La receta va por su propio endpoint y reemplaza la lista completa.
         * Al crear un armado viaja dentro del POST; al editarlo, aparte.
         */
        async guardarReceta({ commit }, { id, ingredientes }) {
            commit('SET_GUARDANDO', true)
            try {
                const actualizado = await productosService.guardarReceta(id, ingredientes)
                commit('UPSERT', actualizado)
                commit('SET_DETALLE', actualizado)
                return actualizado
            } finally {
                commit('SET_GUARDANDO', false)
            }
        },

        async cambiarEstado({ commit }, { id, activo }) {
            const actualizado = activo
                ? await productosService.activar(id)
                : await productosService.desactivar(id)
            commit('UPSERT', actualizado)
            return actualizado
        },

        async eliminar({ commit }, id) {
            await productosService.eliminar(id)
            commit('QUITAR', id)
            commit('INVALIDAR_DETALLE', id)
        },

        /**
         * Solo para productos sin control por lote. En una flor, las existencias
         * pertenecen a un lote concreto: sumar unidades sueltas dejaría stock
         * sin procedencia ni vencimiento, y la API lo rechaza.
         */
        async ajustarStock({ commit, dispatch }, { id, cantidad, motivo, detalle }) {
            if (!cantidad) throw new Error('La cantidad no puede ser cero.')
            if ((motivo || '').trim().length < 3) {
                throw new Error('Indica el motivo del ajuste.')
            }

            commit('SET_GUARDANDO', true)
            try {
                const producto = await productosService.ajustarStock(id, {
                    cantidad, motivo: motivo.trim(), detalle
                })
                commit('UPSERT', producto)
                commit('INVALIDAR_DETALLE', id)
                /* El kardex vive en el otro módulo y acaba de cambiar */
                dispatch('inventario/cargarMovimientos', {}, { root: true })
                return producto
            } finally {
                commit('SET_GUARDANDO', false)
            }
        },

        /* ---------------- Armado ---------------- */

        /**
         * Se consulta ANTES de armar. Dice cuántas unidades alcanzan solo con
         * flor de primera y cuántas sumando la recuperada, con los lotes que
         * cubrirían el faltante para que la persona decida.
         */
        async consultarDisponibilidad({ commit }, { id, cantidad = 1, signal } = {}) {
            try {
                const disp = await productosService.disponibilidadArmado(id, cantidad, { signal })
                commit('SET_DISPONIBILIDAD', disp)
                return disp
            } catch (error) {
                if (!error.esCancelado) commit('SET_DISPONIBILIDAD', null)
                return null
            }
        },

        limpiarDisponibilidad({ commit }) { commit('SET_DISPONIBILIDAD', null) },

        /**
         * `lotesAutorizados` va vacío salvo que la persona haya marcado lotes de
         * flor recuperada. Que sea explícito es el punto: un ramo de matrimonio
         * probablemente no debería llevarla.
         */
        async armar({ commit, dispatch }, { id, cantidad, lotesAutorizados = [] }) {
            commit('SET_GUARDANDO', true)
            try {
                const resultado = await productosService.armar(id, { cantidad, lotesAutorizados })
                /* El armado consume varias líneas de stock: recargar es más barato
                   que reconstruir a mano qué quedó en cada ingrediente. */
                await dispatch('cargar')
                commit('SET_DISPONIBILIDAD', null)
                dispatch('inventario/cargarMovimientos', {}, { root: true })
                return resultado
            } finally {
                commit('SET_GUARDANDO', false)
            }
        },

        /** Para el punto de venta: lector de código de barras. */
        porCodigo(_, { codigo, signal } = {}) {
            return productosService.porCodigo(codigo, { signal })
        }
    },

    getters: {
        productos: state => state.lista,
        total: state => state.total,
        totalPaginas: state => state.totalPaginas,
        filtro: state => state.filtro,
        cargando: state => state.cargando,
        cargandoDetalle: state => state.cargandoDetalle,
        guardando: state => state.guardando,
        error: state => state.error,
        disponibilidad: state => state.disponibilidad,

        porId: state => (id) => state.lista.find(p => p.id === id) || null,
        detalleDe: state => (id) => state.detalles[id] || null,
        recetaDe: state => (id) => state.detalles[id]?.receta || [],

        /* Para el selector de ingredientes: solo simples y activos, porque no
           puede haber ramos dentro de ramos. */
        simples: state => state.lista.filter(p => p.tipo === 'simple' && p.activo),
        armados: state => state.lista.filter(p => p.tipo === 'armado'),

        /* Valores del período cargado, no del catálogo entero. Con el catálogo
           paginado, sumar la página y llamarlo "valor del inventario" sería
           falso: el número real sale de /lotes/costo-promedio. */
        faltantesEnPagina: state => state.lista.filter(p => p.bajoMinimo),

        hayFiltro: state =>
            !!state.filtro.buscar || !!state.filtro.tipo || !!state.filtro.categoriaId ||
            state.filtro.bajoMinimo || state.filtro.activo === null
    }
}