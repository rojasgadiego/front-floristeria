/**
 * Módulo de clientes y fidelización — Floristería Colibrí
 * =========================================================================
 * El club de puntos es simple a propósito:
 *
 *   - Se gana 1 punto por cada $1.000 de compra (sobre el total pagado,
 *     no sobre el bruto: no se premian los descuentos).
 *   - Cada punto vale $50 al canjear, con un mínimo de 50 puntos.
 *   - Los puntos se mueven junto con la venta. Si la boleta se anula,
 *     los ganados se restan y los canjeados se devuelven.
 *
 * El cumpleaños no es decoración: en una florería es el dato que más
 * ventas genera. Por eso hay un getter de cumpleaños del mes.
 * =========================================================================
 */

const esperar = (ms = 200) => new Promise(resolve => setTimeout(resolve, ms))

export const PUNTOS_POR_PESO = 1000  // $1.000 de compra = 1 punto
export const VALOR_PUNTO = 50        // cada punto vale $50 al canjear
export const CANJE_MINIMO = 50       // no se canjea menos que esto

/**
 * Valida un RUT chileno con dígito verificador (módulo 11).
 * Acepta con o sin puntos y guion.
 */
export function validarRut(rut) {
  if (!rut) return false
  const limpio = String(rut).replace(/[.\-\s]/g, '').toUpperCase()
  if (limpio.length < 2) return false

  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  if (!/^\d+$/.test(cuerpo)) return false

  let suma = 0
  let multiplo = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }

  const resto = 11 - (suma % 11)
  const dvEsperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto)
  return dv === dvEsperado
}

/** Formatea 123456789 como 12.345.678-9 */
export function formatearRut(rut) {
  const limpio = String(rut || '').replace(/[.\-\s]/g, '').toUpperCase()
  if (limpio.length < 2) return limpio
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
}

const SEMILLA = [
  { id: 1, rut: '12.345.678-5', nombre: 'María González', telefono: '+56 9 8765 4321', correo: 'maria@correo.cl', direccion: 'Av. Providencia 2100, dpto 41', cumple: '03-14', notas: 'Prefiere tonos pastel. Compra para su madre cada mes.', puntos: 120, activo: true },
  { id: 2, rut: '9.876.543-3', nombre: 'Juan Pérez', telefono: '+56 9 1122 3344', correo: '', direccion: '', cumple: '07-02', notas: '', puntos: 45, activo: true },
  { id: 3, rut: '16.482.907-9', nombre: 'Carolina Soto', telefono: '+56 9 5544 3322', correo: 'csoto@empresa.cl', direccion: 'Los Militares 4500, of. 802', cumple: '11-28', notas: 'Cuenta corporativa: pide arreglos para recepción cada lunes.', puntos: 380, activo: true }
]

const state = () => ({
  clientes: [],
  cargando: false,
  error: null
})

const getters = {
  clientes: (s) => s.clientes,
  cargando: (s) => s.cargando,
  error: (s) => s.error,

  activos: (s) => s.clientes.filter(c => c.activo),
  porId: (s) => (id) => s.clientes.find(c => c.id === Number(id)) || null,
  porRut: (s) => (rut) => {
    const limpio = String(rut || '').replace(/[.\-\s]/g, '').toUpperCase()
    return s.clientes.find(c => String(c.rut).replace(/[.\-\s]/g, '').toUpperCase() === limpio) || null
  },

  puntosEnCirculacion: (s) => s.clientes.reduce((t, c) => t + c.puntos, 0),

  /** Lo que costaría si todos canjearan hoy */
  pasivoPuntos: (s, g) => g.puntosEnCirculacion * VALOR_PUNTO,

  /** Cumpleaños del mes en curso, ordenados por día */
  cumpleanosDelMes: (s) => {
    const mes = String(new Date().getMonth() + 1).padStart(2, '0')
    return s.clientes
      .filter(c => c.activo && c.cumple && c.cumple.startsWith(mes))
      .sort((a, b) => a.cumple.localeCompare(b.cumple))
  }
}

const mutations = {
  SET_CARGANDO(s, v) { s.cargando = v },
  SET_ERROR(s, v) { s.error = v },
  SET_CLIENTES(s, lista) { s.clientes = lista },
  AGREGAR_CLIENTE(s, c) { s.clientes.push(c) },
  ACTUALIZAR_CLIENTE(s, c) {
    const i = s.clientes.findIndex(x => x.id === c.id)
    if (i !== -1) s.clientes.splice(i, 1, c)
  },
  SUMAR_PUNTOS(s, { id, puntos }) {
    const c = s.clientes.find(x => x.id === Number(id))
    if (c) c.puntos = Math.max(0, c.puntos + puntos)
  }
}

const actions = {
  async cargarClientes({ commit, state }, { forzar = false } = {}) {
    if (state.clientes.length && !forzar) return state.clientes

    commit('SET_CARGANDO', true)
    commit('SET_ERROR', null)
    try {
      // API real:  const { data } = await api.get('/clientes')
      await esperar()
      const data = JSON.parse(JSON.stringify(SEMILLA))
      commit('SET_CLIENTES', data)
      return data
    } catch (e) {
      commit('SET_ERROR', 'No se pudieron cargar los clientes.')
      throw e
    } finally {
      commit('SET_CARGANDO', false)
    }
  },

  async crearCliente({ commit, state, getters }, datos) {
    if (!datos.nombre?.trim()) throw new Error('El nombre es obligatorio.')
    if (!datos.rut?.trim()) throw new Error('El RUT es obligatorio.')
    if (!validarRut(datos.rut)) throw new Error('El RUT no es válido: revisa el dígito verificador.')
    if (getters.porRut(datos.rut)) throw new Error('Ya hay un cliente con ese RUT.')

    // API real:  const { data } = await api.post('/clientes', datos)
    await esperar(150)

    const cliente = {
      ...datos,
      id: Math.max(0, ...state.clientes.map(c => c.id)) + 1,
      rut: formatearRut(datos.rut),
      puntos: Math.max(0, Math.round(datos.puntos || 0)),
      activo: true,
      creado: new Date().toISOString()
    }
    commit('AGREGAR_CLIENTE', cliente)
    return cliente
  },

  async actualizarCliente({ commit, getters }, datos) {
    if (!datos.nombre?.trim()) throw new Error('El nombre es obligatorio.')
    if (!validarRut(datos.rut)) throw new Error('El RUT no es válido: revisa el dígito verificador.')

    const repetido = getters.porRut(datos.rut)
    if (repetido && repetido.id !== datos.id) throw new Error('Ya hay otro cliente con ese RUT.')

    // API real:  await api.put(`/clientes/${datos.id}`, datos)
    await esperar(150)

    commit('ACTUALIZAR_CLIENTE', { ...datos, rut: formatearRut(datos.rut) })
  },

  async cambiarEstado({ commit, getters }, { id, activo }) {
    const c = getters.porId(id)
    if (!c) throw new Error('El cliente no existe.')
    await esperar(120)
    commit('ACTUALIZAR_CLIENTE', { ...c, activo })
  },

  /**
   * Se llama desde la venta. Primero descuenta lo canjeado, después
   * acumula lo ganado sobre el total efectivamente pagado.
   */
  registrarCompra({ commit, getters, rootGetters }, { clienteId, total, puntosCanjeados = 0 }) {
    const cliente = getters.porId(clienteId)
    if (!cliente) return 0

    // La regla sale de Configuración; si no está registrada, se usa la constante
    if (rootGetters['configuracion/clubActivo'] === false) return 0
    const porPeso = rootGetters['configuracion/puntosPorPeso'] ?? PUNTOS_POR_PESO

    if (puntosCanjeados > 0) {
      commit('SUMAR_PUNTOS', { id: clienteId, puntos: -puntosCanjeados })
    }

    const ganados = Math.floor(total / porPeso)
    if (ganados > 0) commit('SUMAR_PUNTOS', { id: clienteId, puntos: ganados })

    return ganados
  },

  /** Deshace lo anterior cuando se anula la boleta */
  revertirCompra({ commit, getters }, { clienteId, puntosGanados = 0, puntosCanjeados = 0 }) {
    if (!getters.porId(clienteId)) return
    commit('SUMAR_PUNTOS', { id: clienteId, puntos: puntosCanjeados - puntosGanados })
  },

  /** Corrección manual de puntos, solo para administración */
  async ajustarPuntos({ commit, getters }, { id, puntos, motivo }) {
    const c = getters.porId(id)
    if (!c) throw new Error('El cliente no existe.')
    if (!puntos) throw new Error('Indica una cantidad distinta de cero.')
    if (c.puntos + puntos < 0) throw new Error(`No puedes descontar ${Math.abs(puntos)}: solo tiene ${c.puntos}.`)
    if (!motivo?.trim()) throw new Error('Indica el motivo del ajuste.')

    await esperar(120)
    commit('SUMAR_PUNTOS', { id, puntos })
  }
}

export default { namespaced: true, state, getters, mutations, actions }