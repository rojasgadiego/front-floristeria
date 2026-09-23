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

/* En qué estado vuelve la flor recuperada. Las tres crean un lote NUEVO
   con precio rebajado y vencimiento recortado: esa flor ya gastó vida
   útil, y devolverla a su lote original le regalaría días que no tiene. */
export const CALIDADES = [
  {
    valor: 'optima',
    texto: 'Óptima',
    descripcion: '20% menos · le quedan 3 días'
  },
  {
    valor: 'buena',
    texto: 'Buena',
    descripcion: '40% menos · le quedan 2 días'
  },
  {
    valor: 'limitada',
    texto: 'Limitada',
    descripcion: '60% menos · le queda 1 día'
  }
]

/* Las familias de motivos. Separarlas es lo que deja ver en el reporte si
   se pierde por la flor, por un accidente, por cómo se trabaja, por lo que
   manda el proveedor, por decisiones de venta o porque algo desapareció. */
export const CATEGORIAS = [
  { valor: 'natural', texto: 'La flor', descripcion: 'Marchita, deshidratada, hongos' },
  { valor: 'accidente', texto: 'Accidente', descripcion: 'Quebrada, golpeada, caída, siniestro' },
  { valor: 'operacional', texto: 'El local', descripcion: 'Refrigeración, sobrantes de armado' },
  { valor: 'proveedor', texto: 'Proveedor', descripcion: 'Llegó en mal estado' },
  { valor: 'comercial', texto: 'Venta', descripcion: 'No se vendió, reclamos, cortesías, uso interno' },
  { valor: 'faltante', texto: 'Faltante', descripcion: 'No está y no se sabe por qué' },
  { valor: 'otro', texto: 'Otro', descripcion: 'Lo que no calza en lo anterior' }
]

export const textoCategoria = (v) => CATEGORIAS.find(c => c.valor === v)?.texto ?? v

export const textoDestino = (v) => DESTINOS.find(d => d.valor === v)?.texto ?? v
export const textoCalidad = (v) => CALIDADES.find(c => c.valor === v)?.texto ?? v

/* Respaldo por si /mermas/motivos falla: el formulario tiene que servir
   igual, y un campo libre ensucia el reporte para siempre. Son motivos
   que el catálogo trae de fábrica, así que la API los acepta.
   Misma forma que la API. */
const MOTIVOS_RESPALDO = [
    { motivo: 'Marchita', categoria: 'natural', requiereDetalle: false, destinoSugerido: null, usos: 0 },
    { motivo: 'Deshidratada', categoria: 'natural', requiereDetalle: false, destinoSugerido: null, usos: 0 },
    { motivo: 'Quebrada', categoria: 'accidente', requiereDetalle: false, destinoSugerido: null, usos: 0 },
    { motivo: 'Golpeada', categoria: 'accidente', requiereDetalle: false, destinoSugerido: null, usos: 0 },
    { motivo: 'Sobrante de armado', categoria: 'operacional', requiereDetalle: false, destinoSugerido: null, usos: 0 },
    { motivo: 'Llegó en mal estado', categoria: 'proveedor', requiereDetalle: false, destinoSugerido: 'devolucion_proveedor', usos: 0 },
    { motivo: 'No se alcanzó a vender', categoria: 'comercial', requiereDetalle: false, destinoSugerido: null, usos: 0 },
    { motivo: 'Otro', categoria: 'otro', requiereDetalle: true, destinoSugerido: null, usos: 0 }
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
    tamano: 50
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
        /* El mismo valor por defecto que la base: si /umbral falla, el
           formulario pide firma igual que lo haría la API. */
        umbral: 15000,
        patrones: null,
        cargandoPatrones: false,
        errorPatrones: null,
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
        SET_UMBRAL(state, u) { if (Number.isFinite(u)) state.umbral = u },
        SET_PATRONES(state, p) { state.patrones = p },
        SET_CARGANDO_PATRONES(state, v) { state.cargandoPatrones = v },
        SET_ERROR_PATRONES(state, e) { state.errorPatrones = e },
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

        async cargarUmbral({ commit }, { signal } = {}) {
            try {
                commit('SET_UMBRAL', (await mermasService.umbral({ signal }))?.umbral)
            } catch {
                /* Queda el de respaldo. */
            }
        },

        /**
         * Lo que se escaneó, o null si el código no existe. Cualquier otro
         * error se lanza: "no existe" y "no hay conexión" piden cosas distintas.
         */
        async escanear(_, codigo) {
            try {
                return await mermasService.escanear(codigo)
            } catch (error) {
                if (error.status === 404) return null
                throw error
            }
        },

        /* El control mira el mismo periodo que el registro. */
        async cargarPatrones({ commit, state }, { signal } = {}) {
            commit('SET_CARGANDO_PATRONES', true)
            commit('SET_ERROR_PATRONES', null)
            try {
                commit('SET_PATRONES', await mermasService.patrones(
                    { desde: state.filtro.desde, hasta: state.filtro.hasta },
                    { signal }
                ))
            } catch (error) {
                if (!error.esCancelado) commit('SET_ERROR_PATRONES', error.message)
            } finally {
                commit('SET_CARGANDO_PATRONES', false)
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

        async desarmar({ commit, dispatch }, { productoId, cantidad, motivo, detalle, lineas, autorizacion }) {
            commit('SET_GUARDANDO', true)
            try {
                const resultado = await mermasService.desarmar(productoId, {
                    cantidad, motivo, detalle, lineas, autorizacion
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
        umbralAutorizacion: state => state.umbral,
        patrones: state => state.patrones,
        cargandoPatrones: state => state.cargandoPatrones,
        errorPatrones: state => state.errorPatrones,
        cargando: state => state.cargando,
        cargandoResumen: state => state.cargandoResumen,
        guardando: state => state.guardando,
        error: state => state.error,

        /* Solo los nombres, para el select. El conteo de usos sirve para
        ordenarlos, no para mostrarlos. */
        nombresMotivo: state => state.motivos.map(m => m.motivo),

        /* Para el <select> con <optgroup>: las categorías en su orden, cada
           una con sus motivos, y sin grupos vacíos. */
        motivosPorCategoria: state => CATEGORIAS
            .map(c => ({ ...c, motivos: state.motivos.filter(m => (m.categoria || 'otro') === c.valor) }))
            .filter(c => c.motivos.length),

        motivoPorNombre: state => (nombre) => state.motivos.find(m => m.motivo === nombre) ?? null,
        /* Atajos al resumen, con cero por defecto para que la vista no tenga
           que preguntar si ya llegó. */
        costoPerdido: state => state.resumen?.costoPerdido ?? 0,
        costoRecuperado: state => state.resumen?.costoRecuperado ?? 0,
        costoBotado: state => state.resumen?.costoBotado ?? 0,
        costoDesvalorizado: state => state.resumen?.costoDesvalorizado ?? 0,
        unidadesPerdidas: state => state.resumen?.unidadesPerdidas ?? 0,
        unidadesRecuperadas: state => state.resumen?.unidadesRecuperadas ?? 0,
        /* Null para quien no es administrador: las ventas del local no son
           suyas, y la API no las manda. */
        porcentajeSobreVentas: state => state.resumen?.porcentajeSobreVentas ?? null,

        porDestino: state => state.resumen?.porDestino ?? [],
        porProducto: state => state.resumen?.porProducto ?? [],
        porMotivo: state => state.resumen?.porMotivo ?? [],
        porCategoria: state => state.resumen?.porCategoria ?? [],

        motivoPrincipal: state => state.resumen?.porMotivo?.[0] ?? null,

        /* Sobre 5% en una florería es señal de que se compra más de lo que se
           alcanza a vender. */
        mermaAlta: state => (state.resumen?.porcentajeSobreVentas ?? 0) > 5
    }
}