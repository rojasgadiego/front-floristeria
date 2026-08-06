/**
 * features/configuracion/store/configuracion.module.js
 * =========================================================================
 * La configuración se guarda por secciones, cada una con su endpoint. El
 * store refleja eso: `guardando` es el nombre de la sección en curso, no un
 * booleano, así solo se bloquea el botón que corresponde.
 *
 * NO hay "restaurar valores por defecto": la API no lo expone. Simularlo
 * mandando cuatro PUT con valores inventados dejaría la configuración a
 * medias si uno falla.
 * =========================================================================
 */

import { configuracionService } from '../services/configuracion.service'

/* Espejo de los valores por defecto de los DTOs. Solo para que la vista
   tenga algo que pintar antes de que llegue la primera respuesta. */
const configInicial = () => ({
  local: {
    nombre: '', giro: '', rut: '', direccion: '',
    comuna: '', ciudad: '', telefono: '', correo: '', instagram: ''
  },
  ticket: {
    mensaje: '',
    leyenda: '',
    mostrarPuntos: true
  },
  venta: {
    iva: 19,
    descuentoSinAutorizacion: 5000
  },
  club: {
    activo: true,
    puntosPorPeso: 1000,
    valorPunto: 50,
    canjeMinimo: 50
  },
  actualizadoEn: null,
  actualizadoPor: null
})

export default {
  namespaced: true,

  state: () => ({
    config: configInicial(),
    cargada: false,
    cargando: false,
    /* Nombre de la sección que se está guardando, o null */
    guardando: null,
    error: null,
    /* Último ImpactoClubDto consultado, para mostrarlo junto al campo */
    impacto: null,
    /* Datos pendientes de confirmar la revaluación de puntos */
    confirmacionClub: null
  }),

  mutations: {
    SET_CONFIG (state, config) {
      state.config = { ...configInicial(), ...config }
      state.cargada = true
    },
    SET_SECCION (state, { seccion, datos }) {
      state.config = { ...state.config, [seccion]: datos }
    },
    SET_CARGANDO (state, v) { state.cargando = v },
    SET_GUARDANDO (state, seccion) { state.guardando = seccion },
    SET_ERROR (state, e) { state.error = e },
    SET_IMPACTO (state, i) { state.impacto = i },
    SET_CONFIRMACION_CLUB (state, c) { state.confirmacionClub = c }
  },

  actions: {
    async cargar ({ commit, state }, { signal, forzar = false } = {}) {
      if (state.cargada && !forzar) return state.config

      commit('SET_CARGANDO', true)
      commit('SET_ERROR', null)
      try {
        const config = await configuracionService.obtener({ signal })
        commit('SET_CONFIG', config)
        return config
      } catch (error) {
        if (!error.esCancelado) commit('SET_ERROR', error.message)
        return null
      } finally {
        commit('SET_CARGANDO', false)
      }
    },

    async guardarLocal ({ commit }, local) {
      commit('SET_GUARDANDO', 'local')
      try {
        commit('SET_SECCION', { seccion: 'local', datos: await configuracionService.guardarLocal(local) })
      } finally {
        commit('SET_GUARDANDO', null)
      }
    },

    async guardarTicket ({ commit }, ticket) {
      commit('SET_GUARDANDO', 'ticket')
      try {
        commit('SET_SECCION', { seccion: 'ticket', datos: await configuracionService.guardarTicket(ticket) })
      } finally {
        commit('SET_GUARDANDO', null)
      }
    },

    async guardarVenta ({ commit }, venta) {
      commit('SET_GUARDANDO', 'venta')
      try {
        commit('SET_SECCION', { seccion: 'venta', datos: await configuracionService.guardarVenta(venta) })
      } finally {
        commit('SET_GUARDANDO', null)
      }
    },

    /**
     * Guardado del club en dos tiempos.
     *
     * Si cambia el valor del punto y hay saldos vigentes, la API rechaza con
     * 400 hasta recibir la confirmación. En vez de mostrar ese 400 como un
     * error —que es lo que parece pero no es— se traduce a una confirmación
     * con el impacto a la vista, y la vista decide si reenvía.
     *
     * Devuelve 'guardado' o 'requiere-confirmacion'.
     *
     * >>> Si el backend expone un `codigo` en el ApiResponse de ese 400,
     *     conviene detectarlo por ahí en vez de por el cambio de valor.
     */
    async guardarClub ({ commit, state, dispatch }, { datos, confirmar = false }) {
      const valorPrevio = state.config.club.valorPunto
      const cambiaValor = datos.valorPunto !== valorPrevio

      commit('SET_GUARDANDO', 'club')
      try {
        const guardado = await configuracionService.guardarClub(datos, confirmar)
        commit('SET_SECCION', { seccion: 'club', datos: guardado })
        commit('SET_CONFIRMACION_CLUB', null)
        commit('SET_IMPACTO', null)
        return 'guardado'
      } catch (error) {
        if (error.status === 400 && cambiaValor && !confirmar) {
          /* Trae el detalle para que la confirmación muestre números, no
             solo una pregunta de sí o no. */
          const impacto = await dispatch('consultarImpacto', datos.valorPunto)

          commit('SET_CONFIRMACION_CLUB', {
            datos,
            mensaje: error.message,
            impacto
          })
          return 'requiere-confirmacion'
        }
        throw error
      } finally {
        commit('SET_GUARDANDO', null)
      }
    },

    cancelarConfirmacionClub ({ commit }) {
      commit('SET_CONFIRMACION_CLUB', null)
    },

    /** Se consulta mientras la persona escribe, no al guardar. */
    async consultarImpacto ({ commit }, valorPunto) {
      if (!valorPunto || valorPunto < 1) {
        commit('SET_IMPACTO', null)
        return null
      }

      try {
        const impacto = await configuracionService.impactoClub(valorPunto)
        commit('SET_IMPACTO', impacto)
        return impacto
      } catch {
        /* El impacto es informativo: si falla, no vale la pena molestar. */
        commit('SET_IMPACTO', null)
        return null
      }
    }
  },

  getters: {
    config: state => state.config,
    local: state => state.config.local,
    ticket: state => state.config.ticket,
    venta: state => state.config.venta,
    club: state => state.config.club,

    cargada: state => state.cargada,
    cargando: state => state.cargando,
    error: state => state.error,
    impacto: state => state.impacto,
    confirmacionClub: state => state.confirmacionClub,

    guardando: state => state.guardando,
    guardandoSeccion: state => (seccion) => state.guardando === seccion,

    /* El POS los necesita: total con IVA incluido y saldo de puntos en pesos */
    tasaIva: state => state.config.venta.iva,
    valorPunto: state => state.config.club.valorPunto,
    clubActivo: state => state.config.club.activo
  }
}