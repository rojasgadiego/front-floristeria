/**
 * Módulo de ventas y caja — Floristería Colibrí
 * =========================================================================
 * CÓMO SE DESCUENTA EL STOCK AL VENDER
 *
 * Vender un ramo no es restar 1 de un número. El ramo puede salir de dos
 * lugares y el orden importa:
 *
 *   1. De los que YA ESTÁN ARMADOS en la cámara (stockListo). Esos ya
 *      consumieron sus tallos cuando se armaron: solo se descuenta la unidad.
 *   2. Si no quedan armados, se arma en el momento y se descuentan los
 *      tallos de la receta.
 *
 * Primero se agotan los armados. Si no fuera así, quedarían ramos hechos
 * pudriéndose en la cámara mientras se consumen tallos frescos.
 *
 * EL PROBLEMA MENOS OBVIO: dos ramos distintos comparten ingredientes.
 * "Ramo 12 rosas" y "Arreglo en jarrón" usan las mismas rosas. Validar
 * cada producto por separado dejaría vender 3 de cada uno aunque no
 * alcancen las rosas para ambos. Por eso planificarConsumo() calcula la
 * demanda de TODA la boleta junta antes de aceptar nada.
 * =========================================================================
 */

import { VALOR_PUNTO } from './clientes'
import { calcularDescuento } from './promociones'

const esperar = (ms = 200) => new Promise(resolve => setTimeout(resolve, ms))

export const IVA = 0.19
export const MEDIOS_PAGO = ['Efectivo', 'Débito', 'Crédito', 'Transferencia']

/**
 * Calcula qué se consume para una lista de líneas de boleta.
 * Devuelve el plan y los faltantes; no modifica nada.
 */
export function planificarConsumo (items, porId) {
  const usarListos = {}   // idProducto -> unidades ya armadas a consumir
  const usarSimples = {}  // idProducto -> unidades de stock simple a consumir

  items.forEach(item => {
    if (!item.productoId) return // servicios: despachos, traslados
    const p = porId(item.productoId)
    if (!p) return

    if (p.tipo === 'simple') {
      usarSimples[p.id] = (usarSimples[p.id] || 0) + item.cantidad
      return
    }

    // Primero los que ya están armados
    const listosLibres = (p.stockListo || 0) - (usarListos[p.id] || 0)
    const desdeListos = Math.min(item.cantidad, Math.max(0, listosLibres))
    if (desdeListos > 0) {
      usarListos[p.id] = (usarListos[p.id] || 0) + desdeListos
    }

    // El resto se arma al momento, descontando la receta
    const porArmar = item.cantidad - desdeListos
    if (porArmar > 0) {
      (p.receta || []).forEach(linea => {
        usarSimples[linea.productoId] =
          (usarSimples[linea.productoId] || 0) + linea.cantidad * porArmar
      })
    }
  })

  // Recién ahora se compara la demanda total contra el stock real
  const faltantes = []
  Object.keys(usarSimples).forEach(id => {
    const p = porId(Number(id))
    if (!p) return
    if (usarSimples[id] > p.stock) {
      faltantes.push({
        nombre: p.nombre,
        requerido: usarSimples[id],
        disponible: p.stock
      })
    }
  })

  return { usarListos, usarSimples, faltantes }
}

const state = () => ({
  ventas: [],
  cierres: [],
  caja: { abierta: false, fondo: 0, hora: '', usuario: '', aperturaTs: 0 },
  cargando: false,
  error: null
})

/* ========================================================================
   GETTERS
   ======================================================================== */
const getters = {
  ventas: (s) => s.ventas,
  cierres: (s) => s.cierres,
  caja: (s) => s.caja,
  cargando: (s) => s.cargando,
  error: (s) => s.error,

  ventasValidas: (s) => s.ventas.filter(v => !v.anulada),

  ventasDelTurno: (s, g) => g.ventasValidas.filter(v => v.ts >= s.caja.aperturaTs),

  folioSiguiente: (s) => 'B-' + String(1000 + s.ventas.length + 1),
  numeroAtencion: (s) => '#' + String(s.ventas.length + 1).padStart(4, '0'),

  totalDelTurno: (s, g) => g.ventasDelTurno.reduce((t, v) => t + v.total, 0),

  efectivoDelTurno: (s, g) => g.ventasDelTurno
    .filter(v => v.pago === 'Efectivo')
    .reduce((t, v) => t + v.total, 0),

  efectivoEsperado: (s, g) => s.caja.fondo + g.efectivoDelTurno,

  totalPorMedio: (s, g) => (medio) => g.ventasDelTurno
    .filter(v => v.pago === medio)
    .reduce((t, v) => t + v.total, 0),

  /** Plan de consumo de una boleta tentativa. Se usa para validar antes de cobrar. */
  planDe: (s, g, rootState, rootGetters) => (items) =>
    planificarConsumo(items, rootGetters['inventario/porId'])
}

/* ========================================================================
   MUTATIONS
   ======================================================================== */
const mutations = {
  SET_CARGANDO (s, v) { s.cargando = v },
  SET_ERROR (s, v) { s.error = v },

  ABRIR_CAJA (s, datos) { s.caja = { ...datos, abierta: true } },
  CERRAR_CAJA (s) { s.caja = { abierta: false, fondo: 0, hora: '', usuario: '', aperturaTs: 0 } },
  AGREGAR_CIERRE (s, cierre) { s.cierres.unshift(cierre) },

  AGREGAR_VENTA (s, venta) { s.ventas.unshift(venta) },

  ANULAR_VENTA (s, { id, motivo, usuario }) {
    const v = s.ventas.find(x => x.id === id)
    if (v) {
      v.anulada = true
      v.motivoAnulacion = motivo
      v.anuladaPor = usuario
      v.fechaAnulacion = new Date().toLocaleString('es-CL')
    }
  }
}

/* ========================================================================
   ACTIONS
   ======================================================================== */
let secuencia = 5000
const ahoraId = () => ++secuencia

const movimiento = (datos) => ({
  id: ahoraId(),
  fecha: new Date().toISOString(),
  hora: new Date().toLocaleString('es-CL'),
  ...datos
})

const actions = {
  abrirCaja ({ commit, rootGetters }, { fondo }) {
    const monto = Number(fondo)
    if (isNaN(monto) || monto < 0) throw new Error('Indica un fondo inicial válido.')

    commit('ABRIR_CAJA', {
      fondo: Math.round(monto),
      hora: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      usuario: rootGetters['auth/currentUser']?.email || 'sistema',
      aperturaTs: Date.now()
    })
  },

  cerrarCaja ({ commit, state, getters, rootGetters }, { contado, nota = '' }) {
    if (!state.caja.abierta) throw new Error('La caja no está abierta.')
    const monto = Number(contado)
    if (isNaN(monto) || monto < 0) throw new Error('Indica el efectivo contado.')

    commit('AGREGAR_CIERRE', {
      id: ahoraId(),
      hora: new Date().toLocaleString('es-CL'),
      usuario: rootGetters['auth/currentUser']?.email || 'sistema',
      fondo: state.caja.fondo,
      esperado: getters.efectivoEsperado,
      contado: Math.round(monto),
      diferencia: Math.round(monto) - getters.efectivoEsperado,
      boletas: getters.ventasDelTurno.length,
      totalVendido: getters.totalDelTurno,
      nota: nota.trim()
    })
    commit('CERRAR_CAJA')
  },

  /**
   * Emite la boleta: valida, descuenta stock, deja movimientos y registra la venta.
   * El plan de consumo queda guardado dentro de la venta para que una
   * anulación pueda devolver exactamente lo mismo que se sacó.
   */
  async registrarVenta ({ commit, dispatch, state, getters, rootGetters }, datos) {
    const {
      items, pago, recibido = null, descuento = 0, autorizadoPor = '',
      clienteId = null, puntosCanjeados = 0, promoId = null
    } = datos

    if (!state.caja.abierta) throw new Error('Abre la caja antes de cobrar.')
    if (!items || !items.length) throw new Error('La boleta está vacía.')
    if (!MEDIOS_PAGO.includes(pago)) throw new Error('Selecciona un medio de pago.')

    const porId = rootGetters['inventario/porId']
    const plan = planificarConsumo(items, porId)

    if (plan.faltantes.length) {
      const detalle = plan.faltantes
        .map(f => `${f.nombre} (necesita ${f.requerido}, hay ${f.disponible})`)
        .join('; ')
      throw new Error(`No alcanza el stock: ${detalle}.`)
    }

    const bruto = items.reduce((t, i) => t + i.precio * i.cantidad, 0)

    // El descuento de la promoción se recalcula acá con la boleta final.
    // No se acepta el monto que venga de la pantalla: pudo quedar obsoleto
    // si el cliente agregó o quitó productos después de aplicarla.
    const valorPunto = rootGetters['configuracion/valorPunto'] ?? VALOR_PUNTO
    const ivaTasa = rootGetters['configuracion/iva'] ?? IVA

    const promo = promoId ? rootGetters['promociones/porId'](promoId) : null
    const rebajaPromo = promo ? calcularDescuento(promo, items, porId) : 0

    const rebajaManual = Math.min(Math.max(0, Math.round(descuento)), bruto - rebajaPromo)

    // El canje se valida contra los puntos reales del cliente, no contra
    // lo que diga la pantalla: la pantalla se puede manipular.
    const canje = Math.max(0, Math.round(puntosCanjeados))
    if (canje > 0) {
      const cliente = rootGetters['clientes/porId'](clienteId)
      if (!cliente) throw new Error('Selecciona el cliente antes de canjear puntos.')
      if (canje > cliente.puntos) throw new Error(`El cliente solo tiene ${cliente.puntos} puntos.`)
      if (canje * valorPunto > bruto - rebajaPromo - rebajaManual) {
        throw new Error('El canje no puede superar el total de la boleta.')
      }
    }

    const rebaja = rebajaPromo + rebajaManual + canje * valorPunto
    const total = bruto - rebaja
    const neto = Math.round(total / (1 + ivaTasa))

    if (pago === 'Efectivo' && recibido !== null && Number(recibido) < total) {
      throw new Error('El efectivo recibido no alcanza para cubrir el total.')
    }

    // API real:  const { data } = await api.post('/ventas', payload)
    await esperar()

    const usuario = rootGetters['auth/currentUser']?.email || 'sistema'

    // 1. Descontar los ramos ya armados
    Object.keys(plan.usarListos).forEach(id => {
      const cantidad = plan.usarListos[id]
      commit('inventario/SUMAR_STOCK_LISTO', { id: Number(id), cantidad: -cantidad }, { root: true })
      commit('inventario/REGISTRAR_MOVIMIENTO', movimiento({
        tipo: 'venta',
        productoId: Number(id),
        producto: porId(Number(id))?.nombre,
        cantidad: -cantidad,
        motivo: 'Venta de unidad armada',
        usuario
      }), { root: true })
    })

    // 2. Descontar los tallos e insumos (venta directa o armado al momento)
    Object.keys(plan.usarSimples).forEach(id => {
      const cantidad = plan.usarSimples[id]
      commit('inventario/SUMAR_STOCK', { id: Number(id), cantidad: -cantidad }, { root: true })
      commit('inventario/REGISTRAR_MOVIMIENTO', movimiento({
        tipo: 'venta',
        productoId: Number(id),
        producto: porId(Number(id))?.nombre,
        cantidad: -cantidad,
        motivo: 'Salida por venta',
        usuario
      }), { root: true })
    })

    // Los puntos se mueven junto con la venta: primero se descuenta el
    // canje, después se acumula sobre el total efectivamente pagado.
    const cliente = clienteId ? rootGetters['clientes/porId'](clienteId) : null
    const puntosGanados = cliente
      ? await dispatch('clientes/registrarCompra',
          { clienteId, total, puntosCanjeados: canje }, { root: true })
      : 0

    const fecha = new Date()
    const venta = {
      id: ahoraId(),
      ts: fecha.getTime(),
      folio: getters.folioSiguiente,
      atencion: getters.numeroAtencion,
      hora: fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      fechaLarga: fecha.toLocaleString('es-CL'),
      items: items.map(i => ({ ...i })),
      consumo: { usarListos: { ...plan.usarListos }, usarSimples: { ...plan.usarSimples } },
      bruto,
      descuento: rebaja,
      neto,
      iva: total - neto,
      total,
      pago,
      recibido: pago === 'Efectivo' && recibido !== null ? Math.round(Number(recibido)) : null,
      vuelto: pago === 'Efectivo' && recibido !== null ? Math.round(Number(recibido)) - total : null,
      autorizadoPor,
      vendedor: usuario,
      clienteId: cliente ? cliente.id : null,
      clienteNombre: cliente ? cliente.nombre : '',
      puntosGanados,
      puntosCanjeados: canje,
      descuentoManual: rebajaManual,
      descuentoCanje: canje * valorPunto,
      descuentoPromo: rebajaPromo,
      promoId: promo ? promo.id : null,
      promoNombre: promo ? promo.nombre : '',
      anulada: false
    }

    if (promo && rebajaPromo > 0) {
      dispatch('promociones/registrarUso', { id: promo.id }, { root: true })
    }

    commit('AGREGAR_VENTA', venta)
    return venta
  },

  /**
   * Devuelve al inventario exactamente lo que la venta sacó.
   * La boleta no se borra: queda marcada, para que el cierre de caja cuadre.
   */
  async anularVenta ({ commit, dispatch, state, rootGetters }, { id, motivo }) {
    const venta = state.ventas.find(v => v.id === id)
    if (!venta) throw new Error('La boleta no existe.')
    if (venta.anulada) throw new Error('Esta boleta ya estaba anulada.')
    if (!motivo || !motivo.trim()) throw new Error('Escribe el motivo de la anulación.')

    // API real:  await api.post(`/ventas/${id}/anular`, { motivo })
    await esperar(150)

    const porId = rootGetters['inventario/porId']
    const usuario = rootGetters['auth/currentUser']?.email || 'sistema'
    const consumo = venta.consumo || { usarListos: {}, usarSimples: {} }

    Object.keys(consumo.usarListos).forEach(pid => {
      commit('inventario/SUMAR_STOCK_LISTO',
        { id: Number(pid), cantidad: consumo.usarListos[pid] }, { root: true })
      commit('inventario/REGISTRAR_MOVIMIENTO', movimiento({
        tipo: 'entrada',
        productoId: Number(pid),
        producto: porId(Number(pid))?.nombre,
        cantidad: consumo.usarListos[pid],
        motivo: `Anulación de boleta ${venta.folio}`,
        usuario
      }), { root: true })
    })

    Object.keys(consumo.usarSimples).forEach(pid => {
      commit('inventario/SUMAR_STOCK',
        { id: Number(pid), cantidad: consumo.usarSimples[pid] }, { root: true })
      commit('inventario/REGISTRAR_MOVIMIENTO', movimiento({
        tipo: 'entrada',
        productoId: Number(pid),
        producto: porId(Number(pid))?.nombre,
        cantidad: consumo.usarSimples[pid],
        motivo: `Anulación de boleta ${venta.folio}`,
        usuario
      }), { root: true })
    })

    if (venta.promoId && venta.descuentoPromo > 0) {
      dispatch('promociones/registrarUso', { id: venta.promoId, cantidad: -1 }, { root: true })
    }

    // Devolver los puntos al estado anterior a la venta
    if (venta.clienteId) {
      await dispatch('clientes/revertirCompra', {
        clienteId: venta.clienteId,
        puntosGanados: venta.puntosGanados || 0,
        puntosCanjeados: venta.puntosCanjeados || 0
      }, { root: true })
    }

    commit('ANULAR_VENTA', { id, motivo: motivo.trim(), usuario })
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}