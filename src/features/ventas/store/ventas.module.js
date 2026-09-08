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
 *
 * ── QUÉ IDENTIFICA UNA LÍNEA ──
 *
 * La PARTIDA, no el lote. Una partida es lo que bajó de un balde concreto
 * al mesón, con su propio código y su QR: el servidor descuenta de esa
 * partida exacta y guarda su lote en venta_consumos, que es lo que permite
 * devolver las varas al balde correcto si se anula la boleta.
 *
 * Sin partida se manda solo el producto y el servidor reparte por FIFO
 * entre lo que hay adelante. Sirve para lo que no se escanea —un jarrón—
 * pero pierde el precio propio de un lote rebajado.
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
  clienteId: null,
  usuarioId: null,
  medioPago: null,
  incluirAnuladas: false,
  desde: null,
  hasta: null,
  pagina: 1,
  tamano: 30
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
    SET_DESCUENTO (state, monto) { state.descuentoManual = monto },
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
     * Agrega un producto al carrito.
     *
     * Con `partida` va como línea aparte SIEMPRE, aunque el producto ya
     * esté: dos partidas del mismo producto pueden tener precios distintos
     * —una de flor recuperada, otra normal— y sumarlas ocultaría eso.
     *
     * Sin partida, se acumula sobre la línea existente del mismo producto.
     */
    agregarProducto ({ state, commit, dispatch }, { producto, cantidad = 1, partida = null }) {
      const existente = !partida && state.carrito.find(
        l => l.productoId === producto.id && !l.partida && !l.esServicio
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
          /* El código de la partida: PAR-000001. Es lo que viaja al cobrar. */
          partida,
          loteCodigo: producto.loteCodigo ?? null,
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
        partida: null, loteCodigo: null,
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

    aplicarDescuento ({ commit }, monto) {
      commit('SET_DESCUENTO', Math.max(0, Math.round(monto || 0)))
    },

    canjearPuntos ({ commit }, puntos) {
      commit('SET_PUNTOS', Math.max(0, Math.round(puntos || 0)))
    },

    /**
     * Pregunta al servidor qué promociones aplican a este carrito, con el
     * descuento ya calculado. Se llama tras cada cambio: una promo por monto
     * mínimo puede activarse al agregar la tercera rosa, y no ofrecerla sería
     * cobrarle de más al cliente sin que nadie se diera cuenta.
     *
     * El servidor solo necesita producto, cantidad y subtotal: con eso
     * resuelve el alcance —boleta, categoría o producto— y el mínimo.
     */
    async consultarPromociones ({ state, commit }) {
      if (!state.carrito.length) {
        commit('SET_APLICABLES', [])
        commit('SET_PROMOCION', null)
        return
      }

      try {
        /* Los servicios no entran: no tienen producto contra el que evaluar
           categoría ni alcance. */
        const items = state.carrito
          .filter(l => !l.esServicio && l.productoId)
          .map(l => ({
            productoId: l.productoId,
            cantidad: l.cantidad,
            subtotal: l.precio * l.cantidad
          }))

        if (!items.length) {
          commit('SET_APLICABLES', [])
          commit('SET_PROMOCION', null)
          return
        }

        const aplicables = await ventasService.promocionesAplicables(items)
        commit('SET_APLICABLES', aplicables)

        /* Vienen ordenadas por conveniencia: la primera es la mejor. Si la
           que estaba elegida dejó de aplicar, se cambia sola. */
        const sigueValiendo = aplicables.some(p => p.id === state.promocionId)
        if (!sigueValiendo) commit('SET_PROMOCION', aplicables[0]?.id ?? null)
      } catch {
        commit('SET_APLICABLES', [])
      }
    },

    /* ================= Cobro ================= */

    /**
     * Cobra. Lo que viaja son partidas, productos y cantidades: los montos
     * los arma el servidor leyendo los precios de la base.
     *
     * `autorizacion` solo se manda si el descuento supera el umbral
     * (configuracion.venta.descuentoSinAutorizacion). La API verifica el
     * correo y la clave contra la base y exige que sea una administradora.
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
            /* Uno de los dos: la partida manda si está. */
            partida: l.partida,
            productoId: l.partida ? null : l.productoId,
            cantidad: l.cantidad
          })),
          medioPago,
          recibido: medioPago === 'efectivo' ? recibido : null,
          descuentoManual: state.descuentoManual,
          puntosCanjeados: state.puntosACanjear,
          autorizacion
        })

        commit('SET_ULTIMA', venta)
        commit('SET_DETALLE', venta)
        commit('VACIAR')

        /* El turno cambió y el mostrador también: las partidas que se
           vendieron tienen menos varas o se agotaron. */
        dispatch('caja/cargarActual', null, { root: true })
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
     * Devuelve al inventario exactamente lo que sacó, lote por lote. Las
     * varas vuelven a BODEGA, no al mostrador: la partida pudo haberse
     * agotado y reabrirla sería inventar una historia que no ocurrió.
     *
     * Solo admin, y solo si la caja del turno sigue abierta: anular una
     * boleta de un arqueo ya firmado lo descuadraría.
     */
    async anular ({ commit, dispatch }, { id, motivo }) {
      const limpio = (motivo || '').trim()
      if (limpio.length < 5) throw new Error('Explica el motivo, con al menos 5 caracteres.')

      const resultado = await ventasService.anular(id, limpio)

      /* La API devuelve el resumen de la anulación, no la boleta completa:
         hay que releer el detalle para reflejar el estado nuevo. */
      commit('UPSERT', { id, anulada: true, motivoAnulacion: limpio })
      await dispatch('cargarDetalle', { id, forzar: true })
      dispatch('caja/cargarActual', null, { root: true })

      return resultado
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