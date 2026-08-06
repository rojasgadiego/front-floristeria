/**
 * features/auth/store/auth.module.js
 * =========================================================================
 * Solo la sesión propia. La gestión de cuentas ajenas vive en
 * features/usuarios.
 *
 * Contrato público conservado del módulo mock, para no tocar router,
 * layout ni vistas:
 *   acciones : login, logout, initAuth
 *   getters  : isLoading, loginError, currentUser, isAuthenticated, userRoles
 *   mutación : SET_LOGIN_ERROR   (LoginView la commitea directo)
 * =========================================================================
 */

import { authService } from '../services/auth.service'
import { tokenStorage } from '@/core/auth/token-storage'
import { onSesionExpirada } from '@/core/auth/eventos'

const estadoInicial = () => ({
  user: null,
  loginError: null,
  loading: false,
  saludo: null,
  expiraEn: 0,
  /* initAuth ya corrió. El guard la mira para no patear al login a alguien
     cuya sesión todavía se está restaurando. */
  iniciada: false
})

export default {
  namespaced: true,

  state: estadoInicial,

  mutations: {
    SET_USER (state, user) { state.user = user },
    SET_LOADING (state, v) { state.loading = v },
    SET_LOGIN_ERROR (state, e) { state.loginError = e },
    SET_SALUDO (state, s) { state.saludo = s },
    SET_EXPIRA (state, ms) { state.expiraEn = ms },
    SET_INICIADA (state, v) { state.iniciada = v },
    RESET (state) { Object.assign(state, estadoInicial(), { iniciada: true }) }
  },

  actions: {
    /**
     * Devuelve boolean en vez de tirar: LoginView usa el valor para elegir
     * entre la animación de éxito y la sacudida de error.
     */
    async login ({ commit }, { email, password, remember = false }) {
      commit('SET_LOADING', true)
      commit('SET_LOGIN_ERROR', null)

      try {
        const { token, expiraEn, usuario, saludo } =
          await authService.login({ email, password })

        tokenStorage.guardar({ token, expiraEn }, remember)

        commit('SET_USER', usuario)
        commit('SET_EXPIRA', new Date(expiraEn).getTime())
        commit('SET_SALUDO', saludo)
        commit('SET_INICIADA', true)
        return true
      } catch (error) {
        commit('SET_LOGIN_ERROR', mensajeDeLogin(error))
        return false
      } finally {
        commit('SET_LOADING', false)
      }
    },

    /**
     * No hay endpoint de logout: la API no guarda estado de sesión. Salir
     * es tirar el token. El token sigue siendo técnicamente válido hasta
     * ExpiraEn, pero ya no existe en ningún lado desde donde usarlo.
     */
    logout ({ commit }) {
      tokenStorage.limpiar()
      commit('RESET')
      return true
    },

    /**
     * Restaura la sesión al arrancar. Mismo nombre que en el mock para no
     * tocar main.js ni el router.
     */
    async initAuth ({ commit, state, dispatch }) {
      if (state.iniciada) return !!state.user

      if (!tokenStorage.obtener() || tokenStorage.vencido()) {
        tokenStorage.limpiar()
        commit('SET_INICIADA', true)
        return false
      }

      commit('SET_EXPIRA', tokenStorage.expiraEn())

      try {
        return await dispatch('revalidar')
      } finally {
        commit('SET_INICIADA', true)
      }
    },

    /**
     * Vuelve a preguntar quién soy. Es el único momento en que se entera de
     * que la cuenta fue bloqueada o le cambiaron el rol después de emitido
     * el token — ver el remark de UsuariosController.Bloquear.
     */
    async revalidar ({ commit }) {
      try {
        commit('SET_USER', await authService.yo())
        return true
      } catch (error) {
        if (error.esCancelado) return true

        /* 401 sesión muerta, 403 cuenta bloqueada, 404 cuenta borrada */
        tokenStorage.limpiar()
        commit('SET_USER', null)
        return false
      }
    },

    async cambiarPassword (_, { passwordActual, passwordNueva }) {
      await authService.cambiarPassword({ passwordActual, passwordNueva })
    },

    /** Lo dispara el interceptor ante un 401 en medio de la sesión. */
    expirar ({ commit }) {
      tokenStorage.limpiar()
      commit('RESET')
      commit('SET_LOGIN_ERROR', 'Tu sesión expiró. Ingresá de nuevo.')
    },

    consumirSaludo ({ commit }) { commit('SET_SALUDO', null) }
  },

  getters: {
    isLoading: state => state.loading,
    loginError: state => state.loginError,
    currentUser: state => state.user,
    isAuthenticated: state => !!state.user,
    saludo: state => state.saludo,

    /* La API manda `rol` singular; se envuelve en array para que el router
       y el layout sigan recibiendo lo mismo que antes. */
    userRoles: state => (state.user?.role ? [state.user.role] : []),

    /* Permisos tal como los mandó el servidor. */
    permisos: state => state.user?.permisos ?? [],

    esAdmin: (state, g) => g.userRoles.includes('admin'),
    tieneRol: (state, g) => (...roles) => roles.some(r => g.userRoles.includes(r)),
    puede: (state, g) => (permiso) =>
      g.permisos.includes('*') || g.permisos.includes(permiso),

    minutosParaExpirar: state =>
      state.expiraEn ? Math.max(0, Math.round((state.expiraEn - Date.now()) / 60000)) : null
  }
}

/*
 * El 401 se traduce a un mensaje genérico a propósito: distinguir "no existe
 * ese correo" de "la clave está mal" le confirma a cualquiera qué cuentas
 * existen en el sistema.
 *
 * El 429 sí merece mensaje propio — el login está limitado a 8 intentos por
 * minuto y por IP, y sin explicación la persona cree que el sistema se rompió.
 */
function mensajeDeLogin (error) {
  if (error.status === 401) return 'Correo o contraseña incorrectos.'
  if (error.status === 429) return 'Demasiados intentos. Esperá un minuto antes de volver a probar.'
  if (error.esDeRed) return 'No se pudo conectar con el servidor.'
  return error.message
}

/* Se llama una vez desde store/index.js. El interceptor no puede importar el
   store (ciclo de imports), así que avisa por el bus. */
export function conectarEventosAuth (store) {
  onSesionExpirada(() => store.dispatch('auth/expirar'))
}