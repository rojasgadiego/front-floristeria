/**
 * features/reportes/store/reportes.module.js
 * =========================================================================
 * El panel se separa del resto a propósito: lo ve todo el equipo y se pide
 * al entrar, mientras que resultado, productos y equipo son de
 * administración y se piden solo al abrir esa pantalla.
 * =========================================================================
 */

import { reportesService } from '../services/reportes.service'
import { haceDias, hoy } from '@/core/utils/fechas'

/*
 * Las rutas que manda el backend en `alerta.ruta` describen su propia
 * navegación, que no coincide con la del front. Mapear por `tipo` —que es
 * estable— evita mandar a nadie a una URL que no existe.
 *
 * Las que apuntan a cotizaciones quedan en null hasta que esa feature esté:
 * la alerta se muestra igual, solo que sin enlace.
 */
const DESTINOS = {
  lote_vencido: { name: 'Lotes', query: { alerta: 'vencido' } },
  lote_por_vencer: { name: 'Lotes', query: { alerta: 'por vencer' } },
  lote_rezagado: { name: 'Lotes', query: { rezagados: 'true' } },
  bajo_minimo: { name: 'Inventario', query: { bajoMinimo: 'true' } },
  cobro_vencido: null,
  evento_sin_stock: null
}

export const destinoAlerta = (tipo) => DESTINOS[tipo] ?? null

export const CLASE_URGENCIA = {
  alta: 'urg-alta',
  media: 'urg-media',
  baja: 'urg-baja'
}

const rangoInicial = () => ({ desde: haceDias(30), hasta: hoy() })

export default {
  namespaced: true,

  state: () => ({
    panel: null,
    resultado: null,
    productos: null,
    inventario: null,
    equipo: null,
    rango: rangoInicial(),
    cargandoPanel: false,
    cargando: false,
    error: null,
    /* Cuándo se trajo el panel: sirve para revalidar al volver a la pestaña
       sin pedirlo en cada foco. */
    panelEn: null
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
    SET_RANGO (state, r) { state.rango = { ...state.rango, ...r } },
    SET_CARGANDO_PANEL (state, v) { state.cargandoPanel = v },
    SET_CARGANDO (state, v) { state.cargando = v },
    SET_ERROR (state, e) { state.error = e }
  },

  actions: {
    async cargarPanel ({ commit }, { signal } = {}) {
      commit('SET_CARGANDO_PANEL', true)
      commit('SET_ERROR', null)
      try {
        commit('SET_PANEL', await reportesService.panel({ signal }))
      } catch (error) {
        if (!error.esCancelado) commit('SET_ERROR', error.message)
      } finally {
        commit('SET_CARGANDO_PANEL', false)
      }
    },

    /* El panel envejece rápido: la caja y las alertas cambian con cada venta.
       Se revalida al volver a la pestaña, pero no más de una vez por minuto. */
    revalidarPanel ({ state, dispatch }) {
      if (!state.panelEn || Date.now() - state.panelEn > 60000) {
        return dispatch('cargarPanel')
      }
    },

    /**
     * Resultado, productos y equipo son de administración. Se piden juntos
     * porque comparten el rango y la pantalla los muestra a la vez; pedirlos
     * por separado haría que el período quede desincronizado entre bloques
     * mientras cargan.
     */
    async cargarAnalisis ({ commit, state }, { signal } = {}) {
      commit('SET_CARGANDO', true)
      commit('SET_ERROR', null)

      const { desde, hasta } = state.rango

      try {
        const [resultado, productos, equipo, inventario] = await Promise.all([
          reportesService.resultado({ desde, hasta, signal }),
          reportesService.productos({ desde, hasta, signal }),
          reportesService.equipo({ desde, hasta, signal }),
          reportesService.inventario({ signal })
        ])
        commit('SET_RESULTADO', resultado)
        commit('SET_PRODUCTOS', productos)
        commit('SET_EQUIPO', equipo)
        commit('SET_INVENTARIO', inventario)
      } catch (error) {
        if (!error.esCancelado) commit('SET_ERROR', error.message)
      } finally {
        commit('SET_CARGANDO', false)
      }
    },

    async cambiarRango ({ commit, dispatch }, rango) {
      commit('SET_RANGO', rango)
      await dispatch('cargarAnalisis')
    },

    /** Para VerInventario: no exige ser admin. */
    async cargarInventario ({ commit }, { signal } = {}) {
      try {
        commit('SET_INVENTARIO', await reportesService.inventario({ signal }))
      } catch (error) {
        if (!error.esCancelado) commit('SET_INVENTARIO', null)
      }
    },

    turno (_, { cajaId, signal } = {}) {
      return reportesService.turno(cajaId, { signal })
    }
  },

  getters: {
    panel: state => state.panel,
    hoy: state => state.panel?.hoy ?? null,
    semanaPasada: state => state.panel?.semanaPasada ?? null,
    variacionSemanal: state => state.panel?.variacionSemanal ?? null,
    caja: state => state.panel?.caja ?? null,
    cajaAbierta: state => !!state.panel?.caja?.abierta,

    /* Ya vienen ordenadas por urgencia desde el servidor. */
    alertas: state => state.panel?.alertas ?? [],
    alertasAltas: state => (state.panel?.alertas ?? []).filter(a => a.urgencia === 'alta'),
    proximosEventos: state => state.panel?.proximosEventos ?? [],

    resultado: state => state.resultado,
    serie: state => state.resultado?.serie ?? [],
    porDiaSemana: state => state.resultado?.porDiaSemana ?? [],
    porMedioPago: state => state.resultado?.porMedioPago ?? [],

    top: state => state.productos?.top ?? [],
    sinMovimiento: state => state.productos?.sinMovimiento ?? [],
    porCategoria: state => state.productos?.porCategoria ?? [],

    inventario: state => state.inventario,
    vendedores: state => state.equipo?.vendedores ?? [],

    rango: state => state.rango,
    cargandoPanel: state => state.cargandoPanel,
    cargando: state => state.cargando,
    error: state => state.error
  }
}