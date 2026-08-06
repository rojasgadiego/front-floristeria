/**
 * features/lotes/store/lotes.module.js
 * =========================================================================
 * Los lotes son entidad propia, no un detalle del producto: tienen QR,
 * etiqueta, ubicación física, vencimiento y una fila de consumo.
 *
 * `costoPromedio` es la fuente real del valor del inventario. Multiplicar
 * stock por costo de ficha da otro número: con lotes de $900 y $800
 * mezclados, lo que vale la cámara depende de cuántas varas quedan de cada
 * uno.
 * =========================================================================
 */

import { lotesService } from '../services/lotes.service'

export const ALERTAS = {
    normal: { texto: 'Normal', clase: 'et-verde' },
    'por vencer': { texto: 'Por vencer', clase: 'et-ambar' },
    vencido: { texto: 'Vencido', clase: 'et-rojo' },
    'resto por liquidar': { texto: 'Resto por liquidar', clase: 'et-gris' }
}

export const claseAlerta = (a) => ALERTAS[a]?.clase || 'et-gris'
export const textoAlerta = (a) => ALERTAS[a]?.texto || a

const filtroInicial = () => ({
    buscar: '',
    productoId: null,
    proveedorId: null,
    alerta: null,
    soloRezagados: false,
    pagina: 1,
    porPagina: 50
})

export default {
    namespaced: true,

    state: () => ({
        lista: [],
        total: 0,
        filtro: filtroInicial(),
        detalles: {},
        rezagados: [],
        porVencer: [],
        recuperados: [],
        costoPromedio: [],
        /* URLs de objeto de los QR ya traídos, por código. Se revocan al salir. */
        qr: {},
        cargando: false,
        error: null
    }),

    mutations: {
        SET_PAGINA(state, { items, total, pagina }) {
            state.lista = items
            state.total = total
            state.filtro.pagina = pagina
        },
        SET_FILTRO(state, cambios) {
            state.filtro = { ...state.filtro, ...cambios, pagina: cambios.pagina ?? 1 }
        },
        SET_DETALLE(state, d) { state.detalles = { ...state.detalles, [d.id]: d } },
        SET_REZAGADOS(state, l) { state.rezagados = l || [] },
        SET_POR_VENCER(state, l) { state.porVencer = l || [] },
        SET_RECUPERADOS(state, l) { state.recuperados = l || [] },
        SET_COSTO_PROMEDIO(state, l) { state.costoPromedio = l || [] },
        SET_QR(state, { codigo, url }) { state.qr = { ...state.qr, [codigo]: url } },
        LIMPIAR_QR(state) {
            Object.values(state.qr).forEach(lotesService.liberarQr)
            state.qr = {}
        },
        SET_CARGANDO(state, v) { state.cargando = v },
        SET_ERROR(state, e) { state.error = e },
        UPSERT(state, lote) {
            const i = state.lista.findIndex(l => l.id === lote.id)
            if (i !== -1) state.lista.splice(i, 1, { ...state.lista[i], ...lote })
        }
    },

    actions: {
        async cargar({ commit, state }, { signal } = {}) {
            commit('SET_CARGANDO', true)
            commit('SET_ERROR', null)
            try {
                commit('SET_PAGINA', await lotesService.listar(state.filtro, { signal }))
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

        async cargarDetalle({ commit, state }, { id, forzar = false, signal } = {}) {
            if (state.detalles[id] && !forzar) return state.detalles[id]
            const detalle = await lotesService.obtener(id, { signal })
            commit('SET_DETALLE', detalle)
            return detalle
        },

        porCodigo(_, { codigo, signal } = {}) {
            return lotesService.porCodigo(codigo, { signal })
        },

        /**
         * Escaneo del QR. Informativo: la validación que manda ocurre al cobrar,
         * cuando las filas se bloquean. Si otra caja se llevó el stock
         * entremedio, la venta falla ahí, no acá.
         */
        validar(_, { codigo, cantidad = 1 }) {
            return lotesService.validar({ codigo, cantidad })
        },

        /* ---------------- Alertas ---------------- */

        async cargarAlertas({ commit }, { dias = 3, signal } = {}) {
            const [rezagados, porVencer] = await Promise.all([
                lotesService.rezagados({ signal }).catch(() => []),
                lotesService.porVencer(dias, { signal }).catch(() => [])
            ])
            commit('SET_REZAGADOS', rezagados)
            commit('SET_POR_VENCER', porVencer)
        },

        async cargarRecuperados({ commit }, { signal } = {}) {
            try {
                commit('SET_RECUPERADOS', await lotesService.recuperados({ signal }))
            } catch {
                commit('SET_RECUPERADOS', [])
            }
        },

        async cargarCostoPromedio({ commit }, { signal } = {}) {
            try {
                commit('SET_COSTO_PROMEDIO', await lotesService.costoPromedio({ signal }))
            } catch {
                commit('SET_COSTO_PROMEDIO', [])
            }
        },

        async actualizarUbicacion({ commit }, { id, ubicacion }) {
            const lote = await lotesService.actualizarUbicacion(id, ubicacion)
            commit('UPSERT', lote)
            return lote
        },

        /* ---------------- Etiquetas ---------------- */

        etiquetas(_, { ids, signal } = {}) {
            return lotesService.etiquetas(ids, { signal })
        },

        etiquetasDeCompra(_, { compraId, signal } = {}) {
            return lotesService.etiquetasDeCompra(compraId, { signal })
        },

        /**
         * El QR viene como PNG protegido, así que no se puede poner la ruta en
         * el src de un <img>: la etiqueta no manda el bearer. Se trae como blob
         * y se cachea la URL de objeto.
         */
        async cargarQr({ commit, state }, { codigo, signal } = {}) {
            if (state.qr[codigo]) return state.qr[codigo]
            const url = await lotesService.qr(codigo, { signal })
            commit('SET_QR', { codigo, url })
            return url
        },

        /* Llamar al desmontar la pantalla de etiquetas: cincuenta blobs sin
           revocar son cincuenta imágenes retenidas en memoria. */
        liberarQr({ commit }) { commit('LIMPIAR_QR') }
    },

    getters: {
        lotes: state => state.lista,
        total: state => state.total,
        filtro: state => state.filtro,
        cargando: state => state.cargando,
        error: state => state.error,

        detalleDe: state => (id) => state.detalles[id] || null,
        qrDe: state => (codigo) => state.qr[codigo] || null,

        rezagados: state => state.rezagados,
        porVencer: state => state.porVencer,
        recuperados: state => state.recuperados,
        costoPromedio: state => state.costoPromedio,

        vencidos: state => state.lista.filter(l => l.alerta === 'vencido'),

        /* El valor real de la cámara: promedio ponderado por lote, no stock por
           costo de ficha. */
        valorInventario: state =>
            state.costoPromedio.reduce((t, c) => t + (c.valorTotal || 0), 0),

        varasEnCamara: state =>
            state.costoPromedio.reduce((t, c) => t + (c.varas || 0), 0),

        /* Lo que exige atención hoy, sin repetir un lote que esté en las dos */
        criticos: state => {
            const vistos = new Set()
            return [...state.porVencer, ...state.rezagados].filter(l => {
                if (vistos.has(l.id)) return false
                vistos.add(l.id)
                return true
            })
        }
    }
}