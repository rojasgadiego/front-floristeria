/**
 * features/ventas/store/ventas.module.js
 * =========================================================================
 * El carrito vive acá y NO calcula el total definitivo. Los precios, la
 * promoción y el IVA los arma el servidor de cero al cobrar; lo de acá es
 * una previsualización para que quien atiende pueda decir un número en voz
 * alta mientras cobra.
 *
 * Si el total de la boleta difiere del previsualizado, manda el de la
 * boleta.
 * =========================================================================
 */

import { ventasService } from '../services/ventas.service'

export const MEDIOS_PAGO = [
  { valor: 'efectivo', texto: 'Efectivo', icono: '💵' },
  { valor: 'debito', texto: 'Débito', icono: '💳' },
  { valor: 'credito', texto: 'Crédito', icono: '💳' },
  { valor: 'transferencia', texto: 'Transferencia', icono: '📲' }
]

export const textoMedioPago = (v) => MEDIOS_PAGO.find(m => m.valor === v)?.texto ?? v

const filtroInicial = () => ({
  buscar: '',
  cajaId: null,
  clienteId: null,
  usuarioId: null,
  medioPago: null,
  anulada: false,
  desde: null,
  hasta: null,
  pagina: 1,
  porPagina: 30
})

let contadorLinea = 0

export default {
  namespaced: true,

  state: () => ({
    /* ---------- Carrito ---------- */
    carrito: [],
    clienteId: null,
    cliente: null,
    promocionId: null,
    promocionesAplicables: [],
    descuentoManual: 0,
    motivoDescuento: '',
    puntosACanjear: 0,
    cotizacionId: null,

    /* ---------- Historial ---------- */
    lista: [],
    total: 0,
    totalPaginas: 0,
    filtro: filtroInicial(),
    detalles: {},
    ultimaVenta: null,

    cobrando: false,
    cargando: false,
    error: null
  }),

  mutations: {
    /* ---------- Carrito ---------- */
    AGREGAR (state, linea) {
      state.carrito = [...state.carrito, { uid: ++contadorLinea, ...linea }]
    },
    ACTUALIZAR_LINEA (state, { uid, cambios }) {
      const i = state.carrito.findIndex(l => l.uid === uid)
      if (i !== -1) state.carrito.splice(i, 1, { ...state.carrito[i], ...cambios })
    },
    QUITAR_LINEA (state, uid) {
      state.carrito = state.carrito.filter(l => l.uid !== uid)
    },
    VACIAR (state) {
      state.carrito = []
      state.clienteId = null
      state.cliente = null
      state.promocionId = null
      state.promocionesAplicables = []
      state.descuentoManual = 0
      state.motivoDescuento = ''
      state.puntosACanjear = 0
      state.cotizacionId = null
    },
    SET_CLIENTE (state, cliente) {
      state.cliente = cliente
      state.clienteId = cliente?.id ?? null
      /* Sin cliente no hay puntos que canjear */
      if (!cliente) state.puntosACanjear = 0
    },
    SET_PROMOCION (state, id) { state.promocionId = id },
    SET_APLICABLES (state, lista) { state.promocionesAplicables = lista || [] },
    SET_DESCUENTO (state, { monto, motivo }) {
      state.descuentoManual = monto
      state.motivoDescuento = motivo
    },
    SET_PUNTOS (state, p) { state.puntosACanjear = p },
    SET_COTIZACION (state, id) { state.cotizacionId = id },

    /* ---------- Historial ---------- */
    SET_PAGINA (state, { items, total, pagina, totalPaginas }) {
      state.lista = items
      state.total = total
      state.totalPaginas = totalPaginas
      state.filtro.pagina = pagina
    },
    SET_FILTRO (state, cambios) {
      state.filtro = { ...state.filtro, ...cambios, pagina: cambios.pagina ?? 1 }
    },
    SET_DETALLE (state, d) { state.detalles = { ...state.detalles, [d.id]: d } },
    SET_ULTIMA (state, v) { state.ultimaVenta = v },
    UPSERT (state, venta) {
      const i = state.lista.findIndex(v => v.id === venta.id)
      if (i !== -1) state.lista.splice(i, 1, { ...state.lista[i], ...venta })
    },

    SET_COBRANDO (state, v) { state.cobrando = v },
    SET_CARGANDO (state, v) { state.cargando = v },
    SET_ERROR (state, e) { state.error = e }
  },

  actions: {
    /* ================= Carrito ================= */

    /**
     * Agrega un producto. Si ya está en el carrito sin lote escaneado, se
     * suma la cantidad; con lote escaneado va como línea aparte, porque cada
     * lote tiene su propio costo y puede tener su propio precio.
     */
    agregarProducto ({ state, commit, dispatch }, { producto, cantidad = 1, loteId = null }) {
      const existente = !loteId && state.carrito.find(
        l => l.productoId === producto.id && !l.loteId && !l.esServicio
      )

      if (existente) {
        commit('ACTUALIZAR_LINEA', {
          uid: existente.uid,
          cambios: { cantidad: existente.cantidad + cantidad }
        })
      } else {
        commit('AGREGAR', {
          productoId: producto.id,
          nombre: producto.nombre,
          emoji: producto.emoji,
          precio: producto.precio,
          cantidad,
          loteId,
          loteCodigo: producto.loteCodigo ?? null,
          lotesAutorizados: [],
          esServicio: false,
          disponible: producto.disponible ?? null
        })
      }

      dispatch('consultarPromociones')
    },

    /** Servicios: no tocan inventario y llevan nombre y precio propios. */
    agregarServicio ({ commit, dispatch }, { nombre, precio, cantidad = 1 }) {
      commit('AGREGAR', {
        productoId: null, nombre, emoji: '🚚', precio, cantidad,
        loteId: null, loteCodigo: null, lotesAutorizados: [],
        esServicio: true, disponible: null
      })
      dispatch('consultarPromociones')
    },

    cambiarCantidad ({ commit, dispatch }, { uid, cantidad }) {
      if (cantidad < 1) {
        commit('QUITAR_LINEA', uid)
      } else {
        commit('ACTUALIZAR_LINEA', { uid, cambios: { cantidad } })
      }
      dispatch('consultarPromociones')
    },

    quitarLinea ({ commit, dispatch }, uid) {
      commit('QUITAR_LINEA', uid)
      dispatch('consultarPromociones')
    },

    vaciar ({ commit }) { commit('VACIAR') },

    elegirCliente ({ commit, dispatch }, cliente) {
      commit('SET_CLIENTE', cliente)
      dispatch('consultarPromociones')
    },

    elegirPromocion ({ commit }, id) { commit('SET_PROMOCION', id) },

    aplicarDescuento ({ commit }, { monto, motivo }) {
      commit('SET_DESCUENTO', { monto: Math.round(monto || 0), motivo: (motivo || '').trim() })
    },

    canjearPuntos ({ commit }, puntos) { commit('SET_PUNTOS', Math.max(0, Math.round(puntos || 0))) },

    /**
     * Pregunta al servidor qué promociones aplican a este carrito, con el
     * descuento ya calculado. Se llama tras cada cambio: una promoción por
     * monto mínimo puede activarse al agregar la tercera rosa, y no
     * ofrecerla sería regalarle plata al local en contra del cliente.
     *
     * Elige sola la más conveniente si no hay una elegida a mano.
     */
    async consultarPromociones ({ state, commit }) {
      if (!state.carrito.length) {
        commit('SET_APLICABLES', [])
        commit('SET_PROMOCION', null)
        return
      }

      try {
        const items = state.carrito.map(l => ({
          productoId: l.productoId,
          cantidad: l.cantidad,
          loteId: l.loteId,
          lotesAutorizados: l.lotesAutorizados,
          esServicio: l.esServicio,
          nombre: l.nombre,
          precio: l.esServicio ? l.precio : null
        }))

        const aplicables = await ventasService.promocionesAplicables(items)
        commit('SET_APLICABLES', aplicables)

        /* Vienen ordenadas por conveniencia: la primera es la mejor. */
        const elegida = state.promocionId
        const sigueValiendo = aplicables.some(p => p.id === elegida)
        if (!sigueValiendo) commit('SET_PROMOCION', aplicables[0]?.id ?? null)
      } catch {
        commit('SET_APLICABLES', [])
      }
    },

    /* ================= Cobro ================= */

    /**
     * Cobra. Lo que viaja son productos, cantidades y lotes: los montos los
     * arma el servidor.
     *
     * `autorizacion` solo se manda si el descuento supera el umbral. La API
     * responde 403 si las credenciales no corresponden a una administradora.
     */
    async cobrar ({ state, commit, dispatch }, { medioPago, recibido = null, autorizacion = null }) {
      commit('SET_COBRANDO', true)
      commit('SET_ERROR', null)

      try {
        const venta = await ventasService.registrar({
          clienteId: state.clienteId,
          promocionId: state.promocionId,
          cotizacionId: state.cotizacionId,
          items: state.carrito.map(l => ({
            productoId: l.productoId,
            cantidad: l.cantidad,
            loteId: l.loteId,
            lotesAutorizados: l.lotesAutorizados,
            esServicio: l.esServicio,
            nombre: l.esServicio ? l.nombre : null,
            precio: l.esServicio ? l.precio : null
          })),
          medioPago,
          recibido: medioPago === 'efectivo' ? recibido : null,
          descuentoManual: state.descuentoManual,
          motivoDescuento: state.motivoDescuento || null,
          puntosACanjear: state.puntosACanjear,
          autorizacion
        })

        commit('SET_ULTIMA', venta)
        commit('SET_DETALLE', venta)
        commit('VACIAR')

        /* El turno cambió y el stock también */
        dispatch('caja/refrescar', null, { root: true })
        dispatch('productos/cargar', {}, { root: true })

        return venta
      } finally {
        commit('SET_COBRANDO', false)
      }
    },

    limpiarUltima ({ commit }) { commit('SET_ULTIMA', null) },

    /* ================= Historial ================= */

    async cargar ({ commit, state }, { signal } = {}) {
      commit('SET_CARGANDO', true)
      commit('SET_ERROR', null)
      try {
        commit('SET_PAGINA', await ventasService.listar(state.filtro, { signal }))
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
      const detalle = await ventasService.obtener(id, { signal })
      commit('SET_DETALLE', detalle)
      return detalle
    },

    ticket (_, { id, signal } = {}) {
      return ventasService.ticket(id, { signal })
    },

    /**
     * Devuelve al inventario exactamente lo que sacó, lote por lote. Solo
     * admin: mueve dinero y stock.
     */
    async anular ({ commit, dispatch }, { id, motivo }) {
      const limpio = (motivo || '').trim()
      if (limpio.length < 5) throw new Error('Explica el motivo, con al menos 5 caracteres.')

      const venta = await ventasService.anular(id, limpio)
      commit('UPSERT', venta)
      commit('SET_DETALLE', { ...venta, items: [], consumos: [] })
      dispatch('caja/refrescar', null, { root: true })
      return venta
    }
  },

  getters: {
    /* ---------- Carrito ---------- */
    carrito: state => state.carrito,
    hayCarrito: state => state.carrito.length > 0,
    cliente: state => state.cliente,
    promocionId: state => state.promocionId,
    promocionesAplicables: state => state.promocionesAplicables,
    descuentoManual: state => state.descuentoManual,
    motivoDescuento: state => state.motivoDescuento,
    puntosACanjear: state => state.puntosACanjear,
    cobrando: state => state.cobrando,

    unidades: state => state.carrito.reduce((t, l) => t + l.cantidad, 0),

    /* Previsualización. El total real lo arma el servidor al cobrar. */
    bruto: state => state.carrito.reduce((t, l) => t + l.precio * l.cantidad, 0),

    descuentoPromo: state => {
      const p = state.promocionesAplicables.find(x => x.id === state.promocionId)
      return p?.descuento ?? 0
    },

    promocionElegida: state =>
      state.promocionesAplicables.find(p => p.id === state.promocionId) ?? null,

    /* Líneas que piden más de lo que hay. El servidor las rechaza al cobrar;
       marcarlas antes evita descubrirlo con el cliente esperando. */
    lineasSinStock: state => state.carrito.filter(
      l => !l.esServicio && l.disponible != null && l.cantidad > l.disponible
    ),

    /* ---------- Historial ---------- */
    ventas: state => state.lista,
    total: state => state.total,
    totalPaginas: state => state.totalPaginas,
    filtro: state => state.filtro,
    cargando: state => state.cargando,
    error: state => state.error,
    ultimaVenta: state => state.ultimaVenta,
    detalleDe: state => (id) => state.detalles[id] || null
  }
}