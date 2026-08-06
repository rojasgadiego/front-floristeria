/**
 * Módulo de inventario — Floristería Colibrí
 * =========================================================================
 * MODELO DE DATOS
 *
 * Hay dos tipos de producto:
 *
 *   'simple'  → tallos, plantas, accesorios e insumos. Tienen stock real.
 *               Se venden solos y además alimentan a los ramos.
 *
 *   'armado'  → ramos y arreglos. NO tienen stock independiente: se definen
 *               por una receta de productos simples. Su disponibilidad es
 *               "los que ya están armados" + "los que alcanzo a armar con
 *               lo que hay en cámara".
 *
 * Por qué importa: las 12 rosas de un ramo son las mismas rosas que vendes
 * por tallo. Si el ramo tuviera stock propio, venderías el mismo tallo dos
 * veces y el inventario dejaría de cuadrar.
 *
 * REGLA: una receta solo puede contener productos simples. Así se evita
 * la recursión (ramos dentro de ramos) y el cálculo se mantiene directo.
 *
 * -------------------------------------------------------------------------
 * CONEXIÓN AL BACKEND
 * Las acciones simulan la API con un retardo. Cada una lleva un comentario
 * con la llamada real que la reemplaza cuando tengas los endpoints.
 * =========================================================================
 */

// Simula la latencia de la red mientras no hay backend
const esperar = (ms = 260) => new Promise(resolve => setTimeout(resolve, ms))

const SEMILLA_PRODUCTOS = [
  // ---------- Tallos ----------
  { id: 1,  codigo: '780001', nombre: 'Rosa roja (tallo)',      categoria: 'Tallos',     tipo: 'simple', costo: 900,   precio: 2490,  stock: 180, minimo: 60, emoji: '🌹', activo: true },
  { id: 2,  codigo: '780002', nombre: 'Girasol (tallo)',        categoria: 'Tallos',     tipo: 'simple', costo: 1100,  precio: 2490,  stock: 60,  minimo: 24, emoji: '🌻', activo: true },
  { id: 3,  codigo: '780003', nombre: 'Tulipán holandés',       categoria: 'Tallos',     tipo: 'simple', costo: 1400,  precio: 3290,  stock: 48,  minimo: 24, emoji: '🌷', activo: true },
  { id: 4,  codigo: '780004', nombre: 'Lilium blanco',          categoria: 'Tallos',     tipo: 'simple', costo: 1900,  precio: 4500,  stock: 36,  minimo: 12, emoji: '🌼', activo: true },
  { id: 5,  codigo: '780005', nombre: 'Peonía',                 categoria: 'Tallos',     tipo: 'simple', costo: 3200,  precio: 6900,  stock: 18,  minimo: 20, emoji: '🌸', activo: true },
  { id: 6,  codigo: '780006', nombre: 'Follaje de eucalipto',   categoria: 'Follaje',    tipo: 'simple', costo: 400,   precio: 1200,  stock: 90,  minimo: 30, emoji: '🌿', activo: true },

  // ---------- Plantas ----------
  { id: 7,  codigo: '780007', nombre: 'Orquídea en maceta',     categoria: 'Plantas',    tipo: 'simple', costo: 12000, precio: 26990, stock: 6,   minimo: 2,  emoji: '🪴', activo: true },
  { id: 8,  codigo: '780008', nombre: 'Suculenta chica',        categoria: 'Plantas',    tipo: 'simple', costo: 2200,  precio: 5990,  stock: 19,  minimo: 6,  emoji: '🌵', activo: true },

  // ---------- Insumos y accesorios ----------
  { id: 9,  codigo: '780009', nombre: 'Papel kraft (pliego)',   categoria: 'Insumos',    tipo: 'simple', costo: 250,   precio: 900,   stock: 200, minimo: 50, emoji: '📄', activo: true },
  { id: 10, codigo: '780010', nombre: 'Cinta satinada (metro)', categoria: 'Insumos',    tipo: 'simple', costo: 180,   precio: 600,   stock: 300, minimo: 60, emoji: '🎀', activo: true },
  { id: 11, codigo: '780011', nombre: 'Jarrón de vidrio',       categoria: 'Accesorios', tipo: 'simple', costo: 3500,  precio: 8900,  stock: 15,  minimo: 4,  emoji: '🫙', activo: true },
  { id: 12, codigo: '780012', nombre: 'Tarjeta escrita a mano', categoria: 'Accesorios', tipo: 'simple', costo: 300,   precio: 1500,  stock: 60,  minimo: 15, emoji: '💌', activo: true },

  // ---------- Ramos armados ----------
  {
    id: 101, codigo: '790001', nombre: 'Ramo 12 rosas rojas', categoria: 'Ramos', tipo: 'armado',
    precio: 24990, minimo: 2, emoji: '💐', activo: true,
    stockListo: 2,        // ya armados y en la cámara
    costoArmado: 3000,    // mano de obra
    receta: [
      { productoId: 1,  cantidad: 12 },
      { productoId: 6,  cantidad: 3 },
      { productoId: 9,  cantidad: 1 },
      { productoId: 10, cantidad: 2 }
    ]
  },
  {
    id: 102, codigo: '790002', nombre: 'Ramo mixto primavera', categoria: 'Ramos', tipo: 'armado',
    precio: 18900, minimo: 2, emoji: '🌺', activo: true,
    stockListo: 1, costoArmado: 3000,
    receta: [
      { productoId: 2,  cantidad: 4 },
      { productoId: 3,  cantidad: 6 },
      { productoId: 6,  cantidad: 4 },
      { productoId: 9,  cantidad: 1 },
      { productoId: 10, cantidad: 2 }
    ]
  },
  {
    id: 103, codigo: '790003', nombre: 'Caja de peonías', categoria: 'Ramos', tipo: 'armado',
    precio: 38900, minimo: 1, emoji: '🌸', activo: true,
    stockListo: 0, costoArmado: 4500,
    receta: [
      { productoId: 5, cantidad: 9 },
      { productoId: 6, cantidad: 3 }
    ]
  },
  {
    id: 104, codigo: '790004', nombre: 'Arreglo en jarrón', categoria: 'Arreglos', tipo: 'armado',
    precio: 32500, minimo: 1, emoji: '🏺', activo: true,
    stockListo: 1, costoArmado: 5000,
    receta: [
      { productoId: 1,  cantidad: 8 },
      { productoId: 4,  cantidad: 5 },
      { productoId: 6,  cantidad: 5 },
      { productoId: 11, cantidad: 1 }
    ]
  }
]

export const MOTIVOS_AJUSTE = [
  'Compra a proveedor',
  'Conteo físico',
  'Devolución de cliente',
  'Corrección de error',
  'Traslado desde otro local'
]

const state = () => ({
  productos: [],
  movimientos: [],
  cargando: false,
  error: null
})

/* ========================================================================
   GETTERS
   ======================================================================== */
const getters = {
  productos: (s) => s.productos,
  cargando: (s) => s.cargando,
  error: (s) => s.error,
  movimientos: (s) => s.movimientos,

  porId: (s) => (id) => s.productos.find(p => p.id === Number(id)) || null,

  simples: (s) => s.productos.filter(p => p.tipo === 'simple'),
  armados: (s) => s.productos.filter(p => p.tipo === 'armado'),

  categorias: (s) => [...new Set(s.productos.map(p => p.categoria))].sort(),

  /**
   * Cuántas unidades de un armado se pueden fabricar con el stock actual.
   * Es el mínimo entre lo que alcanza para cada ingrediente.
   */
  posiblesDeArmar: (s, g) => (producto) => {
    if (producto.tipo !== 'armado' || !producto.receta || !producto.receta.length) return 0

    return producto.receta.reduce((menor, linea) => {
      const comp = g.porId(linea.productoId)
      if (!comp || linea.cantidad <= 0) return 0
      return Math.min(menor, Math.floor(comp.stock / linea.cantidad))
    }, Infinity) || 0
  },

  /** Unidades vendibles hoy */
  disponible: (s, g) => (producto) => {
    if (producto.tipo === 'simple') return producto.stock
    return (producto.stockListo || 0) + g.posiblesDeArmar(producto)
  },

  /** Costo unitario: para un armado, la suma de su receta más la mano de obra */
  costoDe: (s, g) => (producto) => {
    if (producto.tipo === 'simple') return producto.costo || 0

    const insumos = (producto.receta || []).reduce((total, linea) => {
      const comp = g.porId(linea.productoId)
      return total + (comp ? (comp.costo || 0) * linea.cantidad : 0)
    }, 0)

    return insumos + (producto.costoArmado || 0)
  },

  /** Margen en porcentaje sobre el precio de venta */
  margenDe: (s, g) => (producto) => {
    const costo = g.costoDe(producto)
    if (!producto.precio) return 0
    return ((producto.precio - costo) / producto.precio) * 100
  },

  bajoMinimo: (s, g) => s.productos.filter(p =>
    p.activo && g.disponible(p) <= (p.minimo || 0)
  ),

  /** Solo los simples tienen existencias físicas que valorizar */
  valorCosto: (s) => s.productos
    .filter(p => p.tipo === 'simple' && p.activo)
    .reduce((total, p) => total + (p.costo || 0) * p.stock, 0),

  valorVenta: (s) => s.productos
    .filter(p => p.tipo === 'simple' && p.activo)
    .reduce((total, p) => total + (p.precio || 0) * p.stock, 0),

  /** Productos que usan a otro en su receta (para no borrar un ingrediente en uso) */
  recetasQueUsan: (s) => (productoId) => s.productos.filter(p =>
    p.tipo === 'armado' && (p.receta || []).some(l => l.productoId === Number(productoId))
  )
}

/* ========================================================================
   MUTATIONS
   ======================================================================== */
const mutations = {
  SET_CARGANDO (s, valor) { s.cargando = valor },
  SET_ERROR (s, valor) { s.error = valor },
  SET_PRODUCTOS (s, lista) { s.productos = lista },

  AGREGAR_PRODUCTO (s, producto) { s.productos.push(producto) },

  ACTUALIZAR_PRODUCTO (s, producto) {
    const i = s.productos.findIndex(p => p.id === producto.id)
    if (i !== -1) s.productos.splice(i, 1, producto)
  },

  QUITAR_PRODUCTO (s, id) {
    s.productos = s.productos.filter(p => p.id !== id)
  },

  SUMAR_STOCK (s, { id, cantidad }) {
    const p = s.productos.find(x => x.id === id)
    if (p) p.stock = Math.max(0, (p.stock || 0) + cantidad)
  },

  SUMAR_STOCK_LISTO (s, { id, cantidad }) {
    const p = s.productos.find(x => x.id === id)
    if (p) p.stockListo = Math.max(0, (p.stockListo || 0) + cantidad)
  },

  REGISTRAR_MOVIMIENTO (s, movimiento) {
    s.movimientos.unshift(movimiento)
    if (s.movimientos.length > 300) s.movimientos.pop()
  }
}

/* ========================================================================
   ACTIONS
   ======================================================================== */
let secuenciaId = 1000

const nuevoMovimiento = (datos) => ({
  id: ++secuenciaId,
  fecha: new Date().toISOString(),
  hora: new Date().toLocaleString('es-CL'),
  ...datos
})

const actions = {
  async cargarProductos ({ commit, state }, { forzar = false } = {}) {
    if (state.productos.length && !forzar) return state.productos

    commit('SET_CARGANDO', true)
    commit('SET_ERROR', null)
    try {
      // API real:  const { data } = await api.get('/productos')
      await esperar()
      const data = JSON.parse(JSON.stringify(SEMILLA_PRODUCTOS))
      commit('SET_PRODUCTOS', data)
      return data
    } catch (error) {
      commit('SET_ERROR', 'No se pudo cargar el inventario.')
      throw error
    } finally {
      commit('SET_CARGANDO', false)
    }
  },

  async crearProducto ({ commit, state, rootGetters }, datos) {
    // API real:  const { data } = await api.post('/productos', datos)
    await esperar(180)

    const producto = {
      ...datos,
      id: Math.max(0, ...state.productos.map(p => p.id)) + 1,
      activo: true
    }
    commit('AGREGAR_PRODUCTO', producto)
    commit('REGISTRAR_MOVIMIENTO', nuevoMovimiento({
      tipo: 'alta',
      productoId: producto.id,
      producto: producto.nombre,
      cantidad: producto.tipo === 'simple' ? (producto.stock || 0) : 0,
      motivo: 'Alta de producto',
      usuario: rootGetters['auth/currentUser']?.email || 'sistema'
    }))
    return producto
  },

  async actualizarProducto ({ commit, rootGetters }, datos) {
    // API real:  await api.put(`/productos/${datos.id}`, datos)
    await esperar(180)
    commit('ACTUALIZAR_PRODUCTO', { ...datos })
    commit('REGISTRAR_MOVIMIENTO', nuevoMovimiento({
      tipo: 'edicion',
      productoId: datos.id,
      producto: datos.nombre,
      cantidad: 0,
      motivo: 'Edición de ficha',
      usuario: rootGetters['auth/currentUser']?.email || 'sistema'
    }))
    return datos
  },

  /**
   * Baja lógica por defecto. El borrado definitivo se bloquea si el
   * producto es ingrediente de alguna receta: si no, el ramo quedaría
   * apuntando a un id inexistente.
   */
  async eliminarProducto ({ commit, getters, rootGetters }, { id, definitivo = false }) {
    const producto = getters.porId(id)
    if (!producto) throw new Error('El producto no existe.')

    const enUso = getters.recetasQueUsan(id)
    if (definitivo && enUso.length) {
      throw new Error(
        `No se puede eliminar: es ingrediente de ${enUso.map(p => p.nombre).join(', ')}.`
      )
    }

    // API real:  await api.delete(`/productos/${id}`)
    await esperar(180)

    if (definitivo) {
      commit('QUITAR_PRODUCTO', id)
    } else {
      commit('ACTUALIZAR_PRODUCTO', { ...producto, activo: false })
    }

    commit('REGISTRAR_MOVIMIENTO', nuevoMovimiento({
      tipo: 'baja',
      productoId: id,
      producto: producto.nombre,
      cantidad: 0,
      motivo: definitivo ? 'Eliminación definitiva' : 'Producto desactivado',
      usuario: rootGetters['auth/currentUser']?.email || 'sistema'
    }))
  },

  async reactivarProducto ({ commit, getters }, id) {
    const producto = getters.porId(id)
    if (producto) commit('ACTUALIZAR_PRODUCTO', { ...producto, activo: true })
  },

  /**
   * Entrada, salida o corrección de stock. Siempre deja un movimiento:
   * sin rastro, cuando el inventario no cuadre no hay cómo averiguar por qué.
   */
  async ajustarStock ({ commit, getters, rootGetters }, { id, cantidad, motivo, detalle = '' }) {
    const producto = getters.porId(id)
    if (!producto) throw new Error('El producto no existe.')
    if (producto.tipo !== 'simple') throw new Error('Los ramos armados no se ajustan: se arman o se venden.')
    if (!cantidad) throw new Error('Indica una cantidad distinta de cero.')
    if (producto.stock + cantidad < 0) {
      throw new Error(`No puedes descontar ${Math.abs(cantidad)}: solo hay ${producto.stock} en stock.`)
    }

    // API real:  await api.post(`/productos/${id}/movimientos`, { cantidad, motivo })
    await esperar(150)

    commit('SUMAR_STOCK', { id, cantidad })
    commit('REGISTRAR_MOVIMIENTO', nuevoMovimiento({
      tipo: cantidad > 0 ? 'entrada' : 'salida',
      productoId: id,
      producto: producto.nombre,
      cantidad,
      motivo,
      detalle,
      usuario: rootGetters['auth/currentUser']?.email || 'sistema'
    }))
  },

  /**
   * Arma N ramos: descuenta los ingredientes y suma unidades listas.
   * Es el momento en que la flor suelta se convierte en producto terminado.
   */
  async armarProducto ({ commit, getters, rootGetters }, { id, cantidad }) {
    const producto = getters.porId(id)
    if (!producto) throw new Error('El producto no existe.')
    if (producto.tipo !== 'armado') throw new Error('Solo los ramos armados se pueden armar.')
    if (!cantidad || cantidad < 1) throw new Error('Indica cuántas unidades vas a armar.')

    const posibles = getters.posiblesDeArmar(producto)
    if (cantidad > posibles) {
      throw new Error(`Con el stock actual solo alcanza para ${posibles} unidad(es).`)
    }

    // API real:  await api.post(`/productos/${id}/armar`, { cantidad })
    await esperar(200)

    const usuario = rootGetters['auth/currentUser']?.email || 'sistema'

    producto.receta.forEach(linea => {
      const comp = getters.porId(linea.productoId)
      const consumo = linea.cantidad * cantidad
      commit('SUMAR_STOCK', { id: comp.id, cantidad: -consumo })
      commit('REGISTRAR_MOVIMIENTO', nuevoMovimiento({
        tipo: 'consumo',
        productoId: comp.id,
        producto: comp.nombre,
        cantidad: -consumo,
        motivo: `Armado de ${producto.nombre}`,
        usuario
      }))
    })

    commit('SUMAR_STOCK_LISTO', { id, cantidad })
    commit('REGISTRAR_MOVIMIENTO', nuevoMovimiento({
      tipo: 'armado',
      productoId: id,
      producto: producto.nombre,
      cantidad,
      motivo: 'Producción',
      usuario
    }))
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}