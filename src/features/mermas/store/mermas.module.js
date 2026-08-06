/**
 * features/mermas/store/mermas.module.js
 * =========================================================================
 * Los totales ya NO se calculan sumando la lista: vienen de /mermas/resumen,
 * que separa lo que se perdió de lo que volvió al inventario. Sin esa
 * distinción, un arreglo devuelto en perfecto estado aparecía como pérdida
 * total y el porcentaje del mes dejaba de servir para decidir cuánto comprar.
 * =========================================================================
 */

import { mermasService } from '../services/mermas.service'

/* Qué pasó con lo que salió del inventario. */
export const DESTINOS = [
    {
        valor: 'perdida',
        texto: 'Se perdió',
        descripcion: 'Se botó. Es costo completo.'
    },
    {
        valor: 'reingreso',
        texto: 'Vuelve al stock',
        descripcion: 'Parte se recupera. Se clasifica por calidad.'
    },
    {
        valor: 'devolucion_proveedor',
        texto: 'Devolución al proveedor',
        descripcion: 'Sale del stock pero no es costo: se abona.'
    }
]

/* En qué estado vuelve la flor recuperada. */
export const CALIDADES = [
    {
        valor: 'optima',
        texto: 'Óptima',
        descripcion: 'Vuelve a su lote original, con su costo y su vencimiento.'
    },
    {
        valor: 'buena',
        texto: 'Buena',
        descripcion: 'Va a un lote de recuperación con precio propio.'
    },
    {
        valor: 'limitada',
        texto: 'Limitada',
        descripcion: 'Lote de recuperación, fuera del reparto automático.'
    }
]

export const textoDestino = (v) => DESTINOS.find(d => d.valor === v)?.texto ?? v
export const textoCalidad = (v) => CALIDADES.find(c => c.valor === v)?.texto ?? v

/* Respaldo por si /mermas/motivos falla: el formulario tiene que servir
   igual, y un campo libre ensucia el reporte para siempre. */
const MOTIVOS_RESPALDO = [
    'Marchita', 'Quebrada', 'Deshidratada', 'Golpeada',
    'Sobrante de armado', 'Regalo o cortesía', 'Error de digitación'
]

const filtroInicial = () => ({
    buscar: '',
    productoId: null,
    loteId: null,
    motivo: null,
    destino: null,
    /* false excluye las revertidas: una merma revertida no es una pérdida,
       y mezclarlas hace que los números no cuadren con el resumen. */
    revertida: false,
    desde: null,
    hasta: null,
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
        resumen: null,
        motivos: MOTIVOS_RESPALDO,
        planDesarme: null,
        cargando: false,
        cargandoResumen: false,
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
        SET_RESUMEN(state, r) { state.resumen = r },
        SET_MOTIVOS(state, m) { if (m?.length) state.motivos = m },
        SET_PLAN(state, p) { state.planDesarme = p },
        SET_CARGANDO(state, v) { state.cargando = v },
        SET_CARGANDO_RESUMEN(state, v) { state.cargandoResumen = v },
        SET_GUARDANDO(state, v) { state.guardando = v },
        SET_ERROR(state, e) { state.error = e },
        UPSERT(state, merma) {
            const i = state.lista.findIndex(m => m.id === merma.id)
            if (i !== -1) state.lista.splice(i, 1, merma)
        }
    },

    actions: {
        async cargar({ commit, state }, { signal } = {}) {
            commit('SET_CARGANDO', true)
            commit('SET_ERROR', null)
            try {
                commit('SET_PAGINA', await mermasService.listar(state.filtro, { signal }))
            } catch (error) {
                if (!error.esCancelado) commit('SET_ERROR', error.message)
            } finally {
                commit('SET_CARGANDO', false)
            }
        },

        async cargarResumen({ commit, state }, { signal } = {}) {
            commit('SET_CARGANDO_RESUMEN', true)
            try {
                commit('SET_RESUMEN', await mermasService.resumen(
                    { desde: state.filtro.desde, hasta: state.filtro.hasta },
                    { signal }
                ))
            } catch (error) {
                if (!error.esCancelado) commit('SET_RESUMEN', null)
            } finally {
                commit('SET_CARGANDO_RESUMEN', false)
            }
        },

        async cargarMotivos({ commit }, { signal } = {}) {
            try {
                commit('SET_MOTIVOS', await mermasService.motivos({ signal }))
            } catch {
                /* Queda el respaldo: el formulario tiene que servir igual. */
            }
        },

        /** Filtros de fecha afectan también al resumen, así que recarga ambos. */
        async filtrar({ commit, dispatch, state }, cambios) {
            const cambiaPeriodo = 'desde' in cambios || 'hasta' in cambios
            commit('SET_FILTRO', cambios)
            await dispatch('cargar')
            if (cambiaPeriodo) await dispatch('cargarResumen')
            return state.filtro
        },

        async registrar({ commit, dispatch }, peticion) {
            commit('SET_GUARDANDO', true)
            try {
                const merma = await mermasService.registrar(peticion)
                /* El resumen es del servidor: recalcularlo a mano sería adivinar
                   cómo reparte costo perdido, recuperado y desvalorizado. */
                await Promise.all([dispatch('cargar'), dispatch('cargarResumen')])
                return merma
            } finally {
                commit('SET_GUARDANDO', false)
            }
        },

        async descartarLote({ commit, dispatch }, { loteId, motivo, detalle, esDevolucionProveedor }) {
            commit('SET_GUARDANDO', true)
            try {
                const merma = await mermasService.descartarLote(loteId, {
                    motivo, detalle, esDevolucionProveedor
                })
                await Promise.all([dispatch('cargar'), dispatch('cargarResumen')])
                return merma
            } finally {
                commit('SET_GUARDANDO', false)
            }
        },

        /**
         * El motivo es obligatorio y con mínimo de largo: revertir deshace un
         * registro de pérdida, y dentro de seis meses alguien va a querer saber
         * por qué.
         */
        async revertir({ commit, dispatch }, { id, motivo }) {
            const limpio = (motivo || '').trim()
            if (limpio.length < 5) {
                throw new Error('Explica por qué se revierte, con al menos 5 caracteres.')
            }

            commit('SET_GUARDANDO', true)
            try {
                const merma = await mermasService.revertir(id, limpio)
                commit('UPSERT', merma)
                await dispatch('cargarResumen')
                return merma
            } finally {
                commit('SET_GUARDANDO', false)
            }
        },

        /* ---------------- Desarme ---------------- */

        async cargarPlanDesarme({ commit }, { productoId, cantidad = 1, signal } = {}) {
            try {
                const plan = await mermasService.planDesarme(productoId, cantidad, { signal })
                commit('SET_PLAN', plan)
                return plan
            } catch (error) {
                if (!error.esCancelado) commit('SET_ERROR', error.message)
                return null
            }
        },

        limpiarPlan({ commit }) { commit('SET_PLAN', null) },

        async desarmar({ commit, dispatch }, { productoId, cantidad, motivo, detalle, lineas }) {
            commit('SET_GUARDANDO', true)
            try {
                const resultado = await mermasService.desarmar(productoId, {
                    cantidad, motivo, detalle, lineas
                })
                await Promise.all([dispatch('cargar'), dispatch('cargarResumen')])
                return resultado
            } finally {
                commit('SET_GUARDANDO', false)
            }
        }
    },

    getters: {
        mermas: state => state.lista,
        total: state => state.total,
        filtro: state => state.filtro,
        motivos: state => state.motivos,
        resumen: state => state.resumen,
        planDesarme: state => state.planDesarme,
        cargando: state => state.cargando,
        cargandoResumen: state => state.cargandoResumen,
        guardando: state => state.guardando,
        error: state => state.error,

        /* Atajos al resumen, con cero por defecto para que la vista no tenga
           que preguntar si ya llegó. */
        costoPerdido: state => state.resumen?.costoPerdido ?? 0,
        costoRecuperado: state => state.resumen?.costoRecuperado ?? 0,
        costoBotado: state => state.resumen?.costoBotado ?? 0,
        costoDesvalorizado: state => state.resumen?.costoDesvalorizado ?? 0,
        unidadesPerdidas: state => state.resumen?.unidadesPerdidas ?? 0,
        unidadesRecuperadas: state => state.resumen?.unidadesRecuperadas ?? 0,
        porcentajeSobreVentas: state => state.resumen?.porcentajeSobreVentas ?? 0,

        porDestino: state => state.resumen?.porDestino ?? [],
        porProducto: state => state.resumen?.porProducto ?? [],
        porMotivo: state => state.resumen?.porMotivo ?? [],

        motivoPrincipal: state => state.resumen?.porMotivo?.[0] ?? null,

        /* Sobre 5% en una florería es señal de que se compra más de lo que se
           alcanza a vender. */
        mermaAlta: state => (state.resumen?.porcentajeSobreVentas ?? 0) > 5
    }
}