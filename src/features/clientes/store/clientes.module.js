/**
 * features/clientes/store/clientes.module.js
 * =========================================================================
 * Las constantes del club (valor del punto, puntos por peso, canje mínimo)
 * ya NO viven acá: vienen de la configuración del servidor. Tenerlas
 * hardcodeadas significaba que cambiar el valor del punto en Configuración
 * no se reflejaba en esta pantalla.
 *
 * La ficha detallada se cachea por id: abrir y cerrar el acordeón tres
 * veces no debería pedir lo mismo tres veces.
 * =========================================================================
 */

import { clientesService } from '../services/clientes.service'

export const MOTIVO_MINIMO = 5

const filtroInicial = () => ({
    buscar: '',
    activo: true,
    conPuntos: false,
    cumpleMes: null,
    sinComprarDias: null,
    pagina: 1,
    /* Alto a propósito: una florería maneja decenas de fichas, no miles, y
       traerlas de una permite ordenar en el cliente (ClienteFiltro no tiene
       parámetro de orden). Si esto crece, hay que pedirlo al backend. */
    porPagina: 100
})

export default {
    namespaced: true,

    state: () => ({
        lista: [],
        total: 0,
        totalPaginas: 0,
        filtro: filtroInicial(),
        detalles: {},
        cumpleanos: [],
        cargando: false,
        cargandoDetalle: null,
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
        SET_ERROR(state, e) { state.error = e },
        SET_CUMPLEANOS(state, lista) { state.cumpleanos = lista },
        SET_DETALLE(state, detalle) {
            state.detalles = { ...state.detalles, [detalle.id]: detalle }
        },
        /* Al cambiar la ficha, el detalle cacheado queda viejo */
        INVALIDAR_DETALLE(state, id) {
            const copia = { ...state.detalles }
            delete copia[id]
            state.detalles = copia
        },
        UPSERT(state, cliente) {
            const i = state.lista.findIndex(c => c.id === cliente.id)
            if (i !== -1) state.lista.splice(i, 1, { ...state.lista[i], ...cliente })
        }
    },

    actions: {
        async cargar({ commit, state }, { signal } = {}) {
            commit('SET_CARGANDO', true)
            commit('SET_ERROR', null)
            try {
                commit('SET_PAGINA', await clientesService.listar(state.filtro, { signal }))
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

        async cargarCumpleanos({ commit }, { mes = null, signal } = {}) {
            try {
                commit('SET_CUMPLEANOS', await clientesService.cumpleanos(mes, { signal }) || [])
            } catch {
                /* Es un adorno de campaña: si falla, la pantalla sigue sirviendo. */
                commit('SET_CUMPLEANOS', [])
            }
        },

        /** Se llama al abrir el acordeón. Cacheado por id. */
        async cargarDetalle({ commit, state }, { id, forzar = false, signal } = {}) {
            if (state.detalles[id] && !forzar) return state.detalles[id]

            commit('SET_CARGANDO_DETALLE', id)
            try {
                const detalle = await clientesService.detalle(id, { signal })
                commit('SET_DETALLE', detalle)
                return detalle
            } catch (error) {
                if (!error.esCancelado) commit('SET_ERROR', error.message)
                return null
            } finally {
                commit('SET_CARGANDO_DETALLE', null)
            }
        },

        async crearCliente({ dispatch }, datos) {
            const creado = await clientesService.crear(datos)
            /* Recarga en vez de push: la lista viene ordenada y paginada por el
               servidor; insertar a mano la desincroniza del total. */
            await dispatch('cargar')
            return creado
        },

        async actualizarCliente({ commit }, { id, ...datos }) {
            const actualizado = await clientesService.actualizar(id, datos)
            commit('UPSERT', actualizado)
            commit('INVALIDAR_DETALLE', id)
            return actualizado
        },

        async cambiarEstado({ commit }, { id, activo }) {
            const actualizado = activo
                ? await clientesService.reactivar(id)
                : await clientesService.desactivar(id)
            commit('UPSERT', actualizado)
            return actualizado
        },

        /**
         * Cantidad con signo. El motivo es obligatorio y con mínimo de largo:
         * los puntos son dinero, y un saldo que no cuadra tiene que poder
         * explicarse seis meses después.
         */
        async ajustarPuntos({ commit }, { id, cantidad, motivo }) {
            const limpio = (motivo || '').trim()
            if (limpio.length < MOTIVO_MINIMO) {
                throw new Error(`Explica el motivo con al menos ${MOTIVO_MINIMO} caracteres.`)
            }
            if (!cantidad) throw new Error('La cantidad no puede ser cero.')

            const actualizado = await clientesService.ajustarPuntos(id, { cantidad, motivo: limpio })
            commit('UPSERT', actualizado)
            commit('INVALIDAR_DETALLE', id)
            return actualizado
        },

        /** Para el POS: devuelve null si no hay ficha, sin tratarlo como error. */
        buscarPorRut(_, { rut, signal } = {}) {
            return clientesService.porRut(rut, { signal })
        }
    },

    getters: {
        clientes: state => state.lista,
        total: state => state.total,
        filtro: state => state.filtro,
        cargando: state => state.cargando,
        error: state => state.error,
        cumpleanos: state => state.cumpleanos,

        detalleDe: state => (id) => state.detalles[id] || null,
        cargandoDetalle: state => state.cargandoDetalle,

        activos: state => state.lista.filter(c => c.activo),

        /* Suma sobre lo cargado. Con `parcial` en true el número es un piso,
           no el total del sistema. */
        puntosEnCirculacion: state => state.lista.reduce((t, c) => t + (c.puntos || 0), 0),
        pasivoPuntos: state => state.lista.reduce((t, c) => t + (c.valorPuntos || 0), 0),

        parcial: state => state.total > state.lista.length
    }
}