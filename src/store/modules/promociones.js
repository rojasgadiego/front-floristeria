/**
 * Módulo de promociones — Floristería Colibrí
 * =========================================================================
 * Una promoción NO guarda un monto de descuento: guarda una regla.
 * El monto se recalcula cada vez que cambia la boleta.
 *
 * Por qué importa: si guardaras el monto, un 10% calculado sobre $30.000
 * seguiría descontando $3.000 después de que el cliente quitó la mitad
 * de los productos. Y si sacara todo, el descuento podría superar el total.
 *
 * ALCANCE: la promoción puede aplicar a toda la boleta, a una categoría
 * (por ejemplo 20% en flor suelta) o a un producto puntual. El porcentaje
 * se calcula sobre esa base, no sobre el total.
 *
 * VIGENCIA: además de estar activa, puede tener fechas y días de la semana.
 * Un "martes de tallos" solo debe aparecer los martes.
 *
 * Se aplica UNA promoción por boleta. Acumular descuentos es la vía más
 * rápida a vender bajo el costo sin darse cuenta.
 * =========================================================================
 */

const esperar = (ms = 180) => new Promise(resolve => setTimeout(resolve, ms))

export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export const ALCANCES = [
  { valor: 'boleta', texto: 'Toda la boleta' },
  { valor: 'categoria', texto: 'Una categoría' },
  { valor: 'producto', texto: 'Un producto puntual' }
]

/** Suma sobre la que se calcula el descuento, según el alcance */
export function baseAplicable (promo, items, porId) {
  if (promo.alcance === 'boleta') {
    return items.reduce((t, i) => t + i.precio * i.cantidad, 0)
  }

  return items.reduce((t, i) => {
    if (!i.productoId) return t // servicios nunca entran en promoción
    const p = porId(i.productoId)
    if (!p) return t

    if (promo.alcance === 'categoria' && p.categoria !== promo.categoria) return t
    if (promo.alcance === 'producto' && p.id !== Number(promo.productoId)) return t

    return t + i.precio * i.cantidad
  }, 0)
}

/** ¿La promoción corre hoy? Considera estado, fechas y día de la semana. */
export function estaVigente (promo, fecha = new Date()) {
  if (!promo.activa) return false

  const hoy = fecha.toISOString().slice(0, 10)
  if (promo.desde && hoy < promo.desde) return false
  if (promo.hasta && hoy > promo.hasta) return false

  if (promo.dias && promo.dias.length && !promo.dias.includes(fecha.getDay())) return false

  return true
}

/**
 * Descuento que corresponde AHORA para esta boleta.
 * Devuelve 0 si no califica: nunca lanza error, así la UI puede
 * mostrar la promo en gris con el motivo.
 */
export function calcularDescuento (promo, items, porId, fecha = new Date()) {
  if (!promo || !estaVigente(promo, fecha)) return 0

  const bruto = items.reduce((t, i) => t + i.precio * i.cantidad, 0)
  if (bruto < (promo.minimo || 0)) return 0

  const base = baseAplicable(promo, items, porId)
  if (base <= 0) return 0

  const descuento = promo.tipo === 'porcentaje'
    ? Math.round(base * promo.valor / 100)
    : promo.valor

  // Nunca puede superar la base sobre la que aplica
  return Math.min(descuento, base)
}

/** Explica por qué una promoción no se puede aplicar todavía */
export function motivoNoAplica (promo, items, porId, fecha = new Date()) {
  if (!promo.activa) return 'Pausada'
  if (!estaVigente(promo, fecha)) {
    const hoy = fecha.toISOString().slice(0, 10)
    if (promo.desde && hoy < promo.desde) return `Empieza el ${promo.desde}`
    if (promo.hasta && hoy > promo.hasta) return `Venció el ${promo.hasta}`
    if (promo.dias && promo.dias.length) {
      return 'Solo ' + promo.dias.map(d => DIAS_SEMANA[d]).join(', ')
    }
    return 'Fuera de vigencia'
  }

  const bruto = items.reduce((t, i) => t + i.precio * i.cantidad, 0)
  if (bruto < (promo.minimo || 0)) return `Faltan ${promo.minimo - bruto} para el mínimo`

  if (baseAplicable(promo, items, porId) <= 0) {
    return promo.alcance === 'categoria'
      ? `Sin productos de ${promo.categoria} en la boleta`
      : 'El producto de la promoción no está en la boleta'
  }

  return null
}

const SEMILLA = [
  {
    id: 1, nombre: 'Especial San Valentín', descripcion: '10% en compras sobre $20.000',
    tipo: 'porcentaje', valor: 10, alcance: 'boleta', minimo: 20000,
    categoria: '', productoId: null, desde: '', hasta: '', dias: [],
    activa: true, usos: 0
  },
  {
    id: 2, nombre: 'Bienvenida al club', descripcion: '$3.000 de rebaja sobre $15.000',
    tipo: 'monto', valor: 3000, alcance: 'boleta', minimo: 15000,
    categoria: '', productoId: null, desde: '', hasta: '', dias: [],
    activa: true, usos: 0
  },
  {
    id: 3, nombre: 'Martes de tallos', descripcion: '20% en flor suelta, solo los martes',
    tipo: 'porcentaje', valor: 20, alcance: 'categoria', minimo: 0,
    categoria: 'Tallos', productoId: null, desde: '', hasta: '', dias: [2],
    activa: true, usos: 0
  },
  {
    id: 4, nombre: 'Liquidación de peonías', descripcion: '30% en peonías por fin de temporada',
    tipo: 'porcentaje', valor: 30, alcance: 'producto', minimo: 0,
    categoria: '', productoId: 5, desde: '', hasta: '', dias: [],
    activa: false, usos: 0
  }
]

const state = () => ({
  promociones: [],
  cargando: false,
  error: null
})

const getters = {
  promociones: (s) => s.promociones,
  cargando: (s) => s.cargando,
  error: (s) => s.error,

  porId: (s) => (id) => s.promociones.find(p => p.id === Number(id)) || null,
  activas: (s) => s.promociones.filter(p => p.activa),
  vigentesHoy: (s) => s.promociones.filter(p => estaVigente(p)),

  /**
   * Promociones evaluadas contra una boleta concreta.
   * Cada una viene con su descuento actual y, si no aplica, el motivo.
   */
  evaluarPara: (s, g, rootState, rootGetters) => (items) => {
    const porId = rootGetters['inventario/porId']
    return s.promociones
      .filter(p => p.activa)
      .map(p => ({
        promo: p,
        descuento: calcularDescuento(p, items, porId),
        motivo: motivoNoAplica(p, items, porId)
      }))
      .sort((a, b) => b.descuento - a.descuento)
  },

  masUsadas: (s) => [...s.promociones].sort((a, b) => b.usos - a.usos).filter(p => p.usos > 0)
}

const mutations = {
  SET_CARGANDO (s, v) { s.cargando = v },
  SET_ERROR (s, v) { s.error = v },
  SET_PROMOCIONES (s, lista) { s.promociones = lista },
  AGREGAR (s, p) { s.promociones.push(p) },
  ACTUALIZAR (s, p) {
    const i = s.promociones.findIndex(x => x.id === p.id)
    if (i !== -1) s.promociones.splice(i, 1, p)
  },
  QUITAR (s, id) { s.promociones = s.promociones.filter(p => p.id !== id) },
  SUMAR_USO (s, { id, cantidad = 1 }) {
    const p = s.promociones.find(x => x.id === Number(id))
    if (p) p.usos = Math.max(0, (p.usos || 0) + cantidad)
  }
}

const actions = {
  async cargarPromociones ({ commit, state }, { forzar = false } = {}) {
    if (state.promociones.length && !forzar) return state.promociones

    commit('SET_CARGANDO', true)
    try {
      // API real:  const { data } = await api.get('/promociones')
      await esperar()
      commit('SET_PROMOCIONES', JSON.parse(JSON.stringify(SEMILLA)))
      return state.promociones
    } catch (e) {
      commit('SET_ERROR', 'No se pudieron cargar las promociones.')
      throw e
    } finally {
      commit('SET_CARGANDO', false)
    }
  },

  async guardarPromocion ({ commit, state }, datos) {
    if (!datos.nombre?.trim()) throw new Error('Ponle un nombre a la promoción.')
    if (!datos.valor || datos.valor <= 0) throw new Error('El valor debe ser mayor que cero.')
    if (datos.tipo === 'porcentaje' && datos.valor > 100) {
      throw new Error('Un porcentaje no puede superar 100.')
    }
    if (datos.alcance === 'categoria' && !datos.categoria) {
      throw new Error('Elige la categoría a la que aplica.')
    }
    if (datos.alcance === 'producto' && !datos.productoId) {
      throw new Error('Elige el producto al que aplica.')
    }
    if (datos.desde && datos.hasta && datos.desde > datos.hasta) {
      throw new Error('La fecha de término no puede ser anterior a la de inicio.')
    }

    // API real:  await api.post('/promociones', datos)  /  api.put(...)
    await esperar(150)

    if (datos.id) {
      commit('ACTUALIZAR', { ...datos })
      return datos
    }

    const nueva = {
      ...datos,
      id: Math.max(0, ...state.promociones.map(p => p.id)) + 1,
      usos: 0,
      activa: datos.activa !== undefined ? datos.activa : true
    }
    commit('AGREGAR', nueva)
    return nueva
  },

  async cambiarEstado ({ commit, getters }, { id, activa }) {
    const p = getters.porId(id)
    if (!p) throw new Error('La promoción no existe.')
    await esperar(100)
    commit('ACTUALIZAR', { ...p, activa })
  },

  async eliminarPromocion ({ commit, getters }, id) {
    const p = getters.porId(id)
    if (!p) throw new Error('La promoción no existe.')
    if (p.usos > 0) {
      throw new Error(`Se usó en ${p.usos} boleta(s). Púsala en vez de eliminarla, para no perder el historial.`)
    }
    await esperar(120)
    commit('QUITAR', Number(id))
  },

  registrarUso ({ commit }, { id, cantidad = 1 }) {
    commit('SUMAR_USO', { id, cantidad })
  }
}

export default { namespaced: true, state, getters, mutations, actions }