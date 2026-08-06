import { cotizacionesService } from '../services/cotizaciones.service'

export const ESTADOS = {
    borrador: { texto: 'Borrador', clase: 'et-gris', ayuda: 'Todavía no compromete nada.' },
    aprobada: { texto: 'Aprobada', clase: 'et-verde', ayuda: 'En la agenda, recibiendo abonos.' },
    cobrada: { texto: 'Cobrada', clase: 'et-azul', ayuda: 'Entregada y con boleta final.' },
    anulada: { texto: 'Anulada', clase: 'et-rojo', ayuda: 'Sin efecto. Los abonos quedan a favor.' }
}

export const textoEstado = (e) => ESTADOS[e]?.texto ?? e
export const claseEstado = (e) => ESTADOS[e]?.clase ?? 'et-gris'

export const MEDIOS_PAGO = [
    { valor: 'efectivo', texto: 'Efectivo' },
    { valor: 'debito', texto: 'Débito' },
    { valor: 'credito', texto: 'Crédito' },
    { valor: 'transferencia', texto: 'Transferencia' }
]

export const TIPOS_EVENTO = [
    'Matrimonio', 'Cumpleaños', 'Funeral', 'Aniversario',
    'Corporativo', 'Bautizo', 'Graduación', 'Otro'
]

const filtroInicial = () => ({
    buscar: '',
    estado: null,
    clienteId: null,
    soloVencidas: false,
    proximosDias: null,
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
        porCobrar: [],
        agenda: [],
        preparacion: null,
        cargando: false,
        guardando: false,
        error: null
    }),

    mutations: {
        SET_PAGINA(state, p) {
            state.lista = p.items
            state.total = p.total
            state.totalPaginas = p.totalPaginas
            state.hayAnterior = p.hayAnterior
            state.haySiguiente = p.haySiguiente
            state.filtro.pagina = p.pagina
        },
        SET_FILTRO(state, cambios) {
            state.filtro = { ...state.filtro, ...cambios, pagina: cambios.pagina ?? 1 }
        },
        RESET_FILTRO(state) { state.filtro = filtroInicial() },
        SET_DETALLE(state, d) { state.detalles = { ...state.detalles, [d.id]: d } },
        INVALIDAR_DETALLE(state, id) {
            const copia = { ...state.detalles }
            delete copia[id]
            state.detalles = copia
        },
        SET_POR_COBRAR(state, l) { state.porCobrar = l || [] },
        SET_AGENDA(state, l) { state.agenda = l || [] },
        SET_PREPARACION(state, p) { state.preparacion = p },
        SET_CARGANDO(state, v) { state.cargando = v },
        SET_GUARDANDO(state, v) { state.guardando = v },
        SET_ERROR(state, e) { state.error = e },
        UPSERT(state, cot) {
            const i = state.lista.findIndex(c => c.id === cot.id)
            if (i !== -1) state.lista.splice(i, 1, { ...state.lista[i], ...cot })
        }
    },

    actions: {
        async cargar({ commit, state }, { signal } = {}) {
            commit('SET_CARGANDO', true)
            commit('SET_ERROR', null)
            try {
                commit('SET_PAGINA', await cotizacionesService.listar(state.filtro, { signal }))
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
            const detalle = await cotizacionesService.obtener(id, { signal })
            commit('SET_DETALLE', detalle)
            return detalle
        },

        /** Los dos paneles de seguimiento: a quién llamar y qué viene. */
        async cargarSeguimiento({ commit }, { dias = 30, signal } = {}) {
            const [porCobrar, agenda] = await Promise.all([
                cotizacionesService.porCobrar({ signal }).catch(() => []),
                cotizacionesService.agenda(dias, { signal }).catch(() => [])
            ])
            commit('SET_POR_COBRAR', porCobrar)
            commit('SET_AGENDA', agenda)
        },

        async crear({ commit, dispatch }, peticion) {
            commit('SET_GUARDANDO', true)
            try {
                const cot = await cotizacionesService.crear(peticion)
                commit('SET_DETALLE', cot)
                await dispatch('cargar')
                return cot
            } finally {
                commit('SET_GUARDANDO', false)
            }
        },

        async actualizar({ commit }, { id, ...peticion }) {
            commit('SET_GUARDANDO', true)
            try {
                const cot = await cotizacionesService.actualizar(id, peticion)
                commit('UPSERT', cot)
                commit('SET_DETALLE', cot)
                return cot
            } finally {
                commit('SET_GUARDANDO', false)
            }
        },

        /** Pasa a la agenda y al compromiso de stock, pero no aparta nada. */
        async aprobar({ commit, dispatch }, id) {
            const cot = await cotizacionesService.aprobar(id)
            commit('UPSERT', cot)
            commit('INVALIDAR_DETALLE', id)
            dispatch('cargarSeguimiento')
            return cot
        },

        async anular({ commit, dispatch }, { id, motivo }) {
            const limpio = (motivo || '').trim()
            if (limpio.length < 5) throw new Error('Explica el motivo, con al menos 5 caracteres.')

            const cot = await cotizacionesService.anular(id, limpio)
            commit('UPSERT', cot)
            commit('INVALIDAR_DETALLE', id)
            dispatch('cargarSeguimiento')
            return cot
        },

        /* ---------------- Pagos ---------------- */

        /**
         * Necesita caja abierta: el abono es una venta real. Si no hay caja, la
         * API responde 400 y ese mensaje es el que hay que mostrar tal cual —es
         * accionable, no un error técnico.
         */
        async registrarPago({ commit, dispatch }, { id, ...pago }) {
            commit('SET_GUARDANDO', true)
            try {
                const registrado = await cotizacionesService.registrarPago(id, pago)
                commit('INVALIDAR_DETALLE', id)
                await Promise.all([dispatch('cargar'), dispatch('cargarDetalle', { id, forzar: true })])
                dispatch('cargarSeguimiento')
                return registrado
            } finally {
                commit('SET_GUARDANDO', false)
            }
        },

        async anularPago({ commit, dispatch }, { id, pagoId, motivo }) {
            const limpio = (motivo || '').trim()
            if (limpio.length < 5) throw new Error('Explica el motivo, con al menos 5 caracteres.')

            const pago = await cotizacionesService.anularPago(id, pagoId, limpio)
            commit('INVALIDAR_DETALLE', id)
            await Promise.all([dispatch('cargar'), dispatch('cargarDetalle', { id, forzar: true })])
            return pago
        },

        /* ---------------- Cuotas ---------------- */

        async guardarCuotas({ commit, dispatch }, { id, cuotas }) {
            commit('SET_GUARDANDO', true)
            try {
                const plan = await cotizacionesService.guardarCuotas(id, cuotas)
                commit('INVALIDAR_DETALLE', id)
                await dispatch('cargarDetalle', { id, forzar: true })
                return plan
            } finally {
                commit('SET_GUARDANDO', false)
            }
        },

        async generarCuotas({ commit, dispatch }, { id, ...opciones }) {
            commit('SET_GUARDANDO', true)
            try {
                const plan = await cotizacionesService.generarCuotas(id, opciones)
                commit('INVALIDAR_DETALLE', id)
                await dispatch('cargarDetalle', { id, forzar: true })
                return plan
            } finally {
                commit('SET_GUARDANDO', false)
            }
        },

        /* ---------------- Cobro ---------------- */

        /**
         * Trae la sugerencia editable. El cobro en sí ocurre en Ventas: hay que
         * mandar estas líneas —ajustadas si la flor que salió fue otra— a
         * POST /ventas con cotizacionId.
         */
        async prepararCobro({ commit }, { id, signal } = {}) {
            commit('SET_CARGANDO', true)
            try {
                const preparacion = await cotizacionesService.prepararCobro(id, { signal })
                commit('SET_PREPARACION', preparacion)
                return preparacion
            } finally {
                commit('SET_CARGANDO', false)
            }
        },

        limpiarPreparacion({ commit }) { commit('SET_PREPARACION', null) }
    },

    getters: {
        cotizaciones: state => state.lista,
        total: state => state.total,
        totalPaginas: state => state.totalPaginas,
        hayAnterior: state => state.hayAnterior,
        haySiguiente: state => state.haySiguiente,
        filtro: state => state.filtro,
        cargando: state => state.cargando,
        guardando: state => state.guardando,
        error: state => state.error,
        preparacion: state => state.preparacion,

        detalleDe: state => (id) => state.detalles[id] || null,

        porCobrar: state => state.porCobrar,
        agenda: state => state.agenda,

        /* Lo que se debe hoy y no está pagado. Es el número que decide a quién
           llamar antes que a quién. */
        totalVencido: state => state.porCobrar.reduce((t, c) => t + (c.vencido || 0), 0),

        /* Eventos de la agenda a los que les falta flor. Es la alerta con
           tiempo de reacción: después del evento ya no sirve. */
        agendaSinStock: state => state.agenda.filter(c => c.diasParaEvento >= 0),

        comprometido: state => state.agenda.reduce((t, c) => t + (c.saldo || 0), 0),

        esEditable: () => (cot) => cot?.estado === 'borrador',
        seCobra: () => (cot) => cot?.estado === 'aprobada',

        hayFiltro: state =>
            !!state.filtro.buscar || !!state.filtro.estado ||
            state.filtro.soloVencidas || state.filtro.proximosDias != null
    }
}