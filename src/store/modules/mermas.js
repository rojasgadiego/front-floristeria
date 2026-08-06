/**
 * Módulo de mermas — Floristería Colibrí
 * =========================================================================
 * Una merma es una salida de stock que NO es una venta: flor que se marchitó,
 * un tallo quebrado al armar, una devolución que ya no se puede vender.
 *
 * Por qué tiene módulo propio y no es un ajuste más:
 *
 *   1. Se valoriza a costo. Sirve para saber cuánta plata se está perdiendo,
 *      no solo cuántas unidades faltan.
 *   2. Se puede mermar un ramo YA ARMADO. El ajuste de inventario solo toca
 *      productos simples; acá un ramo hecho que se echó a perder descuenta
 *      de stockListo, no de la receta (sus tallos ya se consumieron al armarlo).
 *   3. Necesita su propio registro para reportar por motivo y por producto.
 *
 * Sin este registro, cuando el inventario no cuadre no hay forma de saber
 * si faltan seis rosas porque se vendieron, se pudrieron o se las robaron.
 * =========================================================================
 */

const esperar = (ms = 180) => new Promise(resolve => setTimeout(resolve, ms))

export const MOTIVOS_MERMA = [
  'Se marchitó',
  'Daño en manipulación',
  'Error de armado',
  'Devolución no vendible',
  'Regalo o muestra',
  'Vencimiento de planta',
  'Otro'
]

const state = () => ({
  mermas: [],
  cargando: false,
  error: null
})

const getters = {
  mermas: (s) => s.mermas,
  cargando: (s) => s.cargando,
  error: (s) => s.error,

  vigentes: (s) => s.mermas.filter(m => !m.revertida),

  totalCosto: (s, g) => g.vigentes.reduce((t, m) => t + m.costo, 0),
  totalUnidades: (s, g) => g.vigentes.reduce((t, m) => t + m.cantidad, 0),

  /** Pérdida agrupada por motivo, de mayor a menor */
  porMotivo: (s, g) => {
    const acum = {}
    g.vigentes.forEach(m => {
      if (!acum[m.motivo]) acum[m.motivo] = { motivo: m.motivo, costo: 0, unidades: 0 }
      acum[m.motivo].costo += m.costo
      acum[m.motivo].unidades += m.cantidad
    })
    return Object.values(acum).sort((a, b) => b.costo - a.costo)
  },

  /** Productos que más se están perdiendo */
  porProducto: (s, g) => {
    const acum = {}
    g.vigentes.forEach(m => {
      if (!acum[m.productoId]) {
        acum[m.productoId] = { productoId: m.productoId, nombre: m.producto, costo: 0, unidades: 0 }
      }
      acum[m.productoId].costo += m.costo
      acum[m.productoId].unidades += m.cantidad
    })
    return Object.values(acum).sort((a, b) => b.costo - a.costo)
  },

  motivoPrincipal: (s, g) => g.porMotivo[0] || null
}

const mutations = {
  SET_CARGANDO (s, v) { s.cargando = v },
  SET_ERROR (s, v) { s.error = v },
  AGREGAR_MERMA (s, merma) { s.mermas.unshift(merma) },
  REVERTIR_MERMA (s, { id, usuario }) {
    const m = s.mermas.find(x => x.id === id)
    if (m) {
      m.revertida = true
      m.revertidaPor = usuario
      m.fechaReversion = new Date().toLocaleString('es-CL')
    }
  }
}

let secuencia = 8000
const nuevoId = () => ++secuencia

const actions = {
  /**
   * Registra la pérdida y descuenta del inventario.
   * En un producto armado descuenta unidades ya hechas (stockListo);
   * sus tallos no se devuelven, porque se consumieron al armarlo.
   */
  async registrarMerma ({ commit, rootGetters }, { productoId, cantidad, motivo, detalle = '' }) {
    const porId = rootGetters['inventario/porId']
    const producto = porId(Number(productoId))

    if (!producto) throw new Error('Selecciona un producto.')
    if (!cantidad || cantidad < 1) throw new Error('La cantidad debe ser al menos 1.')
    if (!motivo) throw new Error('Indica el motivo de la merma.')

    const esArmado = producto.tipo === 'armado'
    const existencias = esArmado ? (producto.stockListo || 0) : producto.stock

    if (cantidad > existencias) {
      throw new Error(
        esArmado
          ? `Solo hay ${existencias} unidad(es) ya armada(s). Un ramo que todavía no existe no se puede mermar.`
          : `Solo hay ${existencias} unidad(es) en stock.`
      )
    }

    // API real:  await api.post('/mermas', { productoId, cantidad, motivo, detalle })
    await esperar()

    const usuario = rootGetters['auth/currentUser']?.email || 'sistema'
    const costoUnitario = rootGetters['inventario/costoDe'](producto)

    if (esArmado) {
      commit('inventario/SUMAR_STOCK_LISTO', { id: producto.id, cantidad: -cantidad }, { root: true })
    } else {
      commit('inventario/SUMAR_STOCK', { id: producto.id, cantidad: -cantidad }, { root: true })
    }

    const merma = {
      id: nuevoId(),
      ts: Date.now(),
      hora: new Date().toLocaleString('es-CL'),
      productoId: producto.id,
      producto: producto.nombre,
      tipo: producto.tipo,
      cantidad: Math.round(cantidad),
      motivo,
      detalle: detalle.trim(),
      costoUnitario,
      costo: costoUnitario * Math.round(cantidad),
      usuario,
      revertida: false
    }

    commit('inventario/REGISTRAR_MOVIMIENTO', {
      id: nuevoId(),
      fecha: new Date().toISOString(),
      hora: merma.hora,
      tipo: 'merma',
      productoId: producto.id,
      producto: producto.nombre,
      cantidad: -merma.cantidad,
      motivo: `Merma: ${motivo}`,
      usuario
    }, { root: true })

    commit('AGREGAR_MERMA', merma)
    return merma
  },

  /**
   * Deshace una merma mal registrada. No la borra: la marca,
   * para que quede el rastro de la corrección.
   */
  async revertirMerma ({ commit, state, rootGetters }, { id }) {
    const merma = state.mermas.find(m => m.id === id)
    if (!merma) throw new Error('La merma no existe.')
    if (merma.revertida) throw new Error('Esta merma ya fue revertida.')

    // API real:  await api.post(`/mermas/${id}/revertir`)
    await esperar(150)

    const usuario = rootGetters['auth/currentUser']?.email || 'sistema'

    if (merma.tipo === 'armado') {
      commit('inventario/SUMAR_STOCK_LISTO', { id: merma.productoId, cantidad: merma.cantidad }, { root: true })
    } else {
      commit('inventario/SUMAR_STOCK', { id: merma.productoId, cantidad: merma.cantidad }, { root: true })
    }

    commit('inventario/REGISTRAR_MOVIMIENTO', {
      id: nuevoId(),
      fecha: new Date().toISOString(),
      hora: new Date().toLocaleString('es-CL'),
      tipo: 'entrada',
      productoId: merma.productoId,
      producto: merma.producto,
      cantidad: merma.cantidad,
      motivo: 'Reversión de merma mal registrada',
      usuario
    }, { root: true })

    commit('REVERTIR_MERMA', { id, usuario })
  }
}

export default { namespaced: true, state, getters, mutations, actions }