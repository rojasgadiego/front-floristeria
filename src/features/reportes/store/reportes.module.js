/**
 * features/reportes/store/reportes.module.js
 * =========================================================================
 * El panel es la primera pantalla del día y lo ve todo el equipo. Los demás
 * reportes son de administración: un vendedor pidiéndolos recibe 403, y ese
 * 403 no se trata como error —es la respuesta correcta para ese rol.
 * =========================================================================
 */

import { reportesService } from '../services/reportes.service'

/**
 * A dónde lleva cada alerta.
 *
 * Una alerta que no lleva a ninguna parte es ruido: después de tres días
 * nadie las mira. Por eso cada tipo tiene su destino, y el que no lo tenga
 * se muestra sin botón en vez de con uno que no hace nada.
 *
 * Los tres últimos los emite el SP pero no estaban contemplados en la
 * versión anterior de la vista.
 */
const RUTAS_ALERTA = {
  lote_vencido:    { name: 'Lotes', query: { estado: 'vencido' } },
  lote_por_vencer: { name: 'Lotes', query: { estado: 'por_vencer' } },
  lote_rezagado:   { name: 'Lotes', query: { rezagados: '1' } },
  bajo_minimo:     { name: 'InventarioBodega', query: { bajoMinimo: '1' } },
  caja_sin_cerrar: { name: 'PuntoDeVenta' },
  merma_alta:      { name: 'Mermas' },
  cumpleanos:      { name: 'Clientes', query: { cumpleMes: String(new Date().getMonth() + 1) } }
}

export const destinoAlerta = (tipo) => RUTAS_ALERTA[tipo] ?? null

/* Cuánto vale un dato del panel antes de volver a pedirlo. Un minuto: en el
   mesón la pantalla queda abierta horas, y refrescar en cada foco de
   ventana sería una consulta cada vez que alguien vuelve del navegador. */
const VIGENCIA_MS = 60_000

export default {
  namespaced: true,

  state: () => ({
    panel: null,
    panelEn: 0,

    resultado: null,
    productos: null,
    inventario: null,
    equipo: null,
    turnos: {},

    /* El rango que comparten resultado, productos y equipo. Vive acá y no en
       cada vista para que cambiar el periodo en una se refleje en las otras:
       es el mismo periodo del que se está hablando. */
    rango: { desde: null, hasta: null },

    cargandoPanel: false,
    cargandoResultado: false,
    cargandoProductos: false,
    cargandoInventario: false,
    cargandoEquipo: false,

    error: null,

    /* Un 403 no es un error: es la respuesta correcta para un vendedor. Se
       marca aparte para que la vista oculte la sección en vez de mostrar un
       mensaje rojo. */
    sinPermiso: false
  }),

  mutations: {
    SET_PANEL (state, p) {
      state.panel = p
      state.panelEn = Date.now()
    },
    SET_RESULTADO (state, r) { state.resultado = r },
    SET_PRODUCTOS (state, p) { state.productos = p },
    SET_INVENTARIO (state, i) { state.inventario = i },
    SET_EQUIPO (state, e) { state.equipo = e },
    SET_TURNO (state, t) { state.turnos = { ...state.turnos, [t.cajaId]: t } },

    SET_RANGO (state, r) { state.rango = { ...state.rango, ...r } },

    SET_CARGANDO (state, { que, valor }) { state[`cargando${que}`] = valor },
    SET_ERROR (state, e) { state.error = e },
    SET_SIN_PERMISO (state, v) { state.sinPermiso = v },

    /* Al cambiar el rango, lo cacheado dejó de corresponder. */
    INVALIDAR (state) {
      state.resultado = null
      state.productos = null
      state.equipo = null
    }
  },

  actions: {
    /* ---------------- Panel ---------------- */

    async cargarPanel ({ commit }, payload) {
      const signal = payload?.signal

      commit('SET_CARGANDO', { que: 'Panel', valor: true })
      commit('SET_ERROR', null)
      try {
        commit('SET_PANEL', await reportesService.panel({ signal }))
      } catch (error) {
        if (!error.esCancelado) commit('SET_ERROR', error.message)
      } finally {
        commit('SET_CARGANDO', { que: 'Panel', valor: false })
      }
    },

    /**
     * Se llama al volver el foco a la ventana. Solo pide si el dato ya
     * caducó: alguien que alterna entre pestañas no debería disparar una
     * consulta cada vez.
     */
    revalidarPanel ({ state, dispatch }) {
      if (Date.now() - state.panelEn < VIGENCIA_MS) return
      return dispatch('cargarPanel')
    },

    /* ---------------- Rango compartido ---------------- */

    async cambiarRango ({ commit, dispatch }, { desde, hasta }) {
      commit('SET_RANGO', { desde, hasta })
      commit('INVALIDAR')
      await dispatch('cargarResultado')
    },

    /* ---------------- Reportes de administración ---------------- */

    async cargarResultado ({ commit, state }, payload) {
      commit('SET_CARGANDO', { que: 'Resultado', valor: true })
      try {
        commit('SET_RESULTADO', await reportesService.resultado({
          ...state.rango, signal: payload?.signal
        }))
        commit('SET_SIN_PERMISO', false)
      } catch (error) {
        if (error.esCancelado) return
        /* 403: el rol no alcanza. La vista oculta la sección en vez de
           mostrar un error, porque no hay nada que el usuario pueda hacer. */
        if (error.status === 403) commit('SET_SIN_PERMISO', true)
        else commit('SET_ERROR', error.message)
      } finally {
        commit('SET_CARGANDO', { que: 'Resultado', valor: false })
      }
    },

    async cargarProductos ({ commit, state }, payload) {
      commit('SET_CARGANDO', { que: 'Productos', valor: true })
      try {
        commit('SET_PRODUCTOS', await reportesService.productos({
          ...state.rango, signal: payload?.signal
        }))
      } catch (error) {
        if (error.esCancelado) return
        if (error.status === 403) commit('SET_SIN_PERMISO', true)
        else commit('SET_ERROR', error.message)
      } finally {
        commit('SET_CARGANDO', { que: 'Productos', valor: false })
      }
    },

    /* Sin rango: el inventario es lo que hay ahora, no lo que hubo entre dos
       fechas. */
    async cargarInventario ({ commit }, payload) {
      commit('SET_CARGANDO', { que: 'Inventario', valor: true })
      try {
        commit('SET_INVENTARIO', await reportesService.inventario({
          signal: payload?.signal
        }))
      } catch (error) {
        if (!error.esCancelado) commit('SET_ERROR', error.message)
      } finally {
        commit('SET_CARGANDO', { que: 'Inventario', valor: false })
      }
    },

    async cargarEquipo ({ commit, state }, payload) {
      commit('SET_CARGANDO', { que: 'Equipo', valor: true })
      try {
        commit('SET_EQUIPO', await reportesService.equipo({
          ...state.rango, signal: payload?.signal
        }))
      } catch (error) {
        if (error.esCancelado) return
        if (error.status === 403) commit('SET_SIN_PERMISO', true)
        else commit('SET_ERROR', error.message)
      } finally {
        commit('SET_CARGANDO', { que: 'Equipo', valor: false })
      }
    },

    /* Cacheado por caja: un turno cerrado no cambia. */
    async cargarTurno ({ commit, state }, { cajaId, forzar = false, signal } = {}) {
      if (state.turnos[cajaId] && !forzar) return state.turnos[cajaId]

      const t = await reportesService.turno(cajaId, { signal })
      commit('SET_TURNO', t)
      return t
    }
  },

  getters: {
    /* ---------------- Panel ---------------- */
    panel: state => state.panel,
    hoy: state => state.panel?.hoy ?? null,
    semanaPasada: state => state.panel?.semanaPasada ?? null,
    variacionSemanal: state => state.panel?.variacionSemanal ?? 0,
    caja: state => state.panel?.caja ?? null,
    contexto: state => state.panel?.contexto ?? null,
    alertas: state => state.panel?.alertas ?? [],
    proximosEventos: state => state.panel?.proximosEventos ?? [],

    hayCajaAbierta: state => !!state.panel?.caja,

    /* Lo que no puede esperar. Si hay una de estas, el resto del panel es
       secundario. */
    alertasAltas: state => (state.panel?.alertas ?? []).filter(a => a.urgencia === 'alta'),

    /* Lo que está en juego entre todas las alertas: es el número que hace
       que alguien las mire en vez de cerrarlas. */
    montoEnRiesgo: state =>
      (state.panel?.alertas ?? []).reduce((t, a) => t + (a.monto || 0), 0),

    /* Positiva = mejor que el mismo día de la semana pasada. */
    vaMejor: state => (state.panel?.variacionSemanal ?? 0) > 0,

    /* Los eventos de los próximos tres días: lo demás es contexto. */
    eventosInmediatos: state =>
      (state.panel?.proximosEventos ?? []).filter(e => e.dias <= 3),

    /* ---------------- Reportes ---------------- */
    resultado: state => state.resultado,
    productos: state => state.productos?.productos ?? [],
    categoriasProducto: state => state.productos?.categorias ?? [],
    inventario: state => state.inventario,
    equipo: state => state.equipo?.personas ?? [],
    turnoDe: state => (id) => state.turnos[id] ?? null,

    rango: state => state.rango,

    /* Atajos al resultado, con cero por defecto para que la vista no tenga
       que preguntar si ya llegó. */
    ingresos: state => state.resultado?.ingresos ?? 0,
    costoVentas: state => state.resultado?.costoVentas ?? 0,
    utilidadBruta: state => state.resultado?.utilidadBruta ?? 0,
    margen: state => state.resultado?.margen ?? 0,
    mermaPeriodo: state => state.resultado?.merma ?? 0,

    /* Utilidad bruta menos merma. NO es utilidad contable: faltan arriendo,
       sueldos y todo lo que este sistema no sabe. */
    resultadoNeto: state => state.resultado?.resultado ?? 0,

    porDia: state => state.resultado?.porDia ?? [],
    porCategoria: state => state.resultado?.porCategoria ?? [],

    /* El que más utilidad deja, que no siempre es el que más factura. */
    productoTop: state => state.productos?.productos?.[0] ?? null,

    /* Productos que se venden pero con margen bajo: son los que conviene
       revisar de precio o de proveedor. */
    productosMargenBajo: state =>
      (state.productos?.productos ?? []).filter(p => p.margen < 25 && p.unidades > 0),

    /* Quiénes acumulan diferencias de caja. La absoluta importa más que la
       acumulada: cinco turnos de +2.000 y −2.000 suman cero, y eso no es lo
       mismo que cinco turnos exactos. */
    conDiferencias: state =>
      (state.equipo?.personas ?? [])
        .filter(p => p.turnosDescuadrados > 0)
        .sort((a, b) => b.diferenciaAbsoluta - a.diferenciaAbsoluta),

    cargandoPanel: state => state.cargandoPanel,
    cargandoResultado: state => state.cargandoResultado,
    cargandoProductos: state => state.cargandoProductos,
    cargandoInventario: state => state.cargandoInventario,
    cargandoEquipo: state => state.cargandoEquipo,

    error: state => state.error,
    sinPermiso: state => state.sinPermiso
  }
}