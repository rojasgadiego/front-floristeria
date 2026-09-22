/**
 * features/usuarios/store/usuarios.module.js
 * =========================================================================
 * Cuentas ajenas. Separado de `auth` porque son cosas distintas: auth es mi
 * sesión, esto es un CRUD con permiso de admin.
 *
 * API actual:
 *   GET    /api/usuarios?busqueda=&rol=&activo=
 *   GET    /api/usuarios/{id}
 *   POST   /api/usuarios
 *   PUT    /api/usuarios/{id}
 *   PATCH  /api/usuarios/{id}/activar
 *   PATCH  /api/usuarios/{id}/desactivar
 *   POST   /api/usuarios/{id}/resetear-password
 *
 * BÚSQUEDA:
 * La API actual sí soporta `busqueda`, así que el texto viaja al servidor.
 * Igual se conserva `busqueda` separado de `filtro` para no romper la vista
 * actual y porque conceptualmente es el texto del buscador.
 *
 * PAGINACIÓN:
 * El backend actual no pagina usuarios. Se conserva `pagina` y `porPagina`
 * en el estado para no tocar la tabla ni la UI, pero el service ya evita
 * enviar esos parámetros si la API no los soporta.
 *
 * ROL:
 * No existe PATCH /usuarios/{id}/rol. Para cambiar rol se usa PUT
 * /usuarios/{id}, enviando el usuario con el nuevo rol.
 * =========================================================================
 */

import { usuariosService } from '../services/usuarios.service'
import { ROL, esRolValido } from '@/core/constantes/roles'

/* Mismo mínimo que CrearUsuarioRequest y RestablecerPasswordRequest. */
export const LARGO_MINIMO_PASSWORD = 8
export const LARGO_MAXIMO_NOMBRE = 120
export const LARGO_MINIMO_NOMBRE = 2

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const filtroInicial = () => ({
  rol: null,
  activo: null,
  pagina: 1,
  porPagina: 100
})

/* Valida lo mismo que las DataAnnotations del backend. No lo reemplaza:
   evita el viaje de ida y vuelta para errores obvios. */
function validarNombre (nombre) {
  const limpio = (nombre || '').trim()

  if (!limpio) {
    throw new Error('El nombre es obligatorio.')
  }

  if (limpio.length < LARGO_MINIMO_NOMBRE || limpio.length > LARGO_MAXIMO_NOMBRE) {
    throw new Error(`El nombre debe tener entre ${LARGO_MINIMO_NOMBRE} y ${LARGO_MAXIMO_NOMBRE} caracteres.`)
  }

  return limpio
}

function validarEmail (email) {
  const limpio = (email || '').trim().toLowerCase()

  if (!limpio) {
    throw new Error('El correo es obligatorio.')
  }

  if (!EMAIL_RE.test(limpio)) {
    throw new Error('El correo no tiene un formato válido.')
  }

  return limpio
}

function validarPassword (password) {
  if (!password || password.length < LARGO_MINIMO_PASSWORD) {
    throw new Error(`La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`)
  }

  return password
}

function mismaCuenta (a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return false
  return String(a) === String(b)
}

export default {
  namespaced: true,

  state: () => ({
    lista: [],
    total: 0,
    totalPaginas: 0,

    filtro: filtroInicial(),

    /*
     * Separado del filtro para mantener compatibilidad con la vista actual.
     * Al cargar, se manda junto con rol/activo.
     */
    busqueda: '',

    cargando: false,
    guardando: false,
    error: null
  }),

  mutations: {
    SET_PAGINA (state, { items, total, pagina, porPagina, totalPaginas }) {
      state.lista = Array.isArray(items) ? items : []
      state.total = total ?? state.lista.length
      state.totalPaginas = totalPaginas ?? 1

      state.filtro.pagina = pagina ?? state.filtro.pagina
      state.filtro.porPagina = porPagina ?? state.filtro.porPagina
    },

    SET_FILTRO (state, cambios = {}) {
      /*
       * Cualquier cambio de filtro vuelve a la página 1, salvo que el cambio
       * sea explícitamente de página.
       */
      state.filtro = {
        ...state.filtro,
        ...cambios,
        pagina: cambios.pagina ?? 1
      }
    },

    SET_BUSQUEDA (state, texto) {
      state.busqueda = texto ?? ''
      state.filtro.pagina = 1
    },

    RESET_FILTRO (state) {
      state.filtro = filtroInicial()
      state.busqueda = ''
    },

    SET_CARGANDO (state, v) {
      state.cargando = v
    },

    SET_GUARDANDO (state, v) {
      state.guardando = v
    },

    SET_ERROR (state, e) {
      state.error = e
    },

    UPSERT (state, usuario) {
      if (!usuario || usuario.id === null || usuario.id === undefined) return

      const i = state.lista.findIndex(u => mismaCuenta(u.id, usuario.id))

      if (i !== -1) {
        state.lista.splice(i, 1, {
          ...state.lista[i],
          ...usuario
        })
      } else {
        state.lista.unshift(usuario)
        state.total += 1
      }
    },

    SET_ACTIVO_LOCAL (state, { id, activo }) {
      const i = state.lista.findIndex(u => mismaCuenta(u.id, id))

      if (i !== -1) {
        state.lista.splice(i, 1, {
          ...state.lista[i],
          activo
        })
      }
    }
  },

  actions: {
    async cargar ({ commit, state }, { signal } = {}) {
      commit('SET_CARGANDO', true)
      commit('SET_ERROR', null)

      try {
        const pagina = await usuariosService.listar(
          {
            ...state.filtro,
            busqueda: state.busqueda
          },
          { signal }
        )

        commit('SET_PAGINA', pagina)

        return pagina
      } catch (error) {
        if (!error.esCancelado) {
          commit('SET_ERROR', error.message || 'No se pudieron cargar los usuarios.')
        }

        throw error
      } finally {
        commit('SET_CARGANDO', false)
      }
    },

    /*
     * Filtros que viajan al servidor: rol y activo.
     */
    async filtrar ({ commit, dispatch }, cambios = {}) {
      commit('SET_FILTRO', cambios)
      return dispatch('cargar')
    },

    /*
     * Búsqueda por texto.
     *
     * Antes era local. La API actual soporta `busqueda`, así que recarga.
     * Si la vista llama esto en cada tecla, conviene que la vista tenga
     * debounce para evitar demasiadas requests.
     */
    async buscar ({ commit, dispatch }, texto) {
      commit('SET_BUSQUEDA', texto ?? '')
      return dispatch('cargar')
    },

    async resetearFiltros ({ commit, dispatch }) {
      commit('RESET_FILTRO')
      return dispatch('cargar')
    },

    /*
     * De acá para abajo los errores se propagan: la vista los muestra en el
     * modal. Ahora el mensaje puede venir del servidor, por ejemplo:
     * 409 correo duplicado, 400 última admin, etc.
     */
    async crearUsuario ({ commit, dispatch }, datos) {
      const name = validarNombre(datos.name)
      const email = validarEmail(datos.email)
      const password = validarPassword(datos.password)

      if (!esRolValido(datos.role)) {
        throw new Error('Selecciona un rol válido.')
      }

      commit('SET_GUARDANDO', true)
      commit('SET_ERROR', null)

      try {
        const creado = await usuariosService.crear({
          name,
          email,
          password,
          role: datos.role
        })

        /*
         * Recarga en vez de push: si el servidor ordena la lista, insertar a
         * mano puede desincronizar orden, total o filtros.
         */
        await dispatch('cargar')

        return creado
      } catch (error) {
        commit('SET_ERROR', error.message || 'No se pudo crear el usuario.')
        throw error
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    /**
     * Actualiza nombre, correo y rol usando PUT /usuarios/{id}.
     *
     * La API actual no tiene endpoint PATCH /usuarios/{id}/rol, así que el
     * cambio de rol no se separa en otra request.
     */
    async actualizarUsuario ({ commit, state }, datos) {
      const name = validarNombre(datos.name)
      const email = validarEmail(datos.email)

      const actual = state.lista.find(u => mismaCuenta(u.id, datos.id))
      const role = datos.role ?? actual?.role

      if (role && !esRolValido(role)) {
        throw new Error('Selecciona un rol válido.')
      }

      commit('SET_GUARDANDO', true)
      commit('SET_ERROR', null)

      try {
        const usuario = await usuariosService.actualizar(datos.id, {
          name,
          email,
          role
        })

        commit('UPSERT', usuario)

        return usuario
      } catch (error) {
        commit('SET_ERROR', error.message || 'No se pudo actualizar el usuario.')
        throw error
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    /**
     * Cambiar rol.
     *
     * No usa usuariosService.cambiarRol porque en la API real no existe
     * PATCH /usuarios/{id}/rol. Para evitar un PUT parcial, reconstruimos el
     * usuario actual y mandamos nombre, correo y rol.
     */
    async cambiarRolUsuario ({ commit, state, rootGetters }, { id, role }) {
      const usuario = state.lista.find(u => mismaCuenta(u.id, id))

      if (!usuario) {
        throw new Error('La cuenta no existe.')
      }

      if (!esRolValido(role)) {
        throw new Error('Rol no válido.')
      }

      /*
       * La base protege que no quede ninguna admin, no que no te desloguees
       * vos. Quitarte tu propio rol te saca de esta pantalla en la siguiente
       * navegación; avisarlo antes es más barato que explicarlo después.
       */
      if (
        mismaCuenta(id, rootGetters['auth/currentUser']?.id) &&
        role !== ROL.ADMIN
      ) {
        throw new Error('Estás cambiando tu propio rol: vas a perder el acceso a esta pantalla.')
      }

      commit('SET_GUARDANDO', true)
      commit('SET_ERROR', null)

      try {
        const actualizado = await usuariosService.actualizar(id, {
          name: usuario.name,
          email: usuario.email,
          role
        })

        commit('UPSERT', actualizado)

        return actualizado
      } catch (error) {
        commit('SET_ERROR', error.message || 'No se pudo cambiar el rol del usuario.')
        throw error
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    /**
     * Bloquear / reactivar.
     *
     * Se conserva el nombre de la acción para no tocar la vista, aunque por
     * dentro la API actual usa:
     *
     *   PATCH /usuarios/{id}/desactivar
     *   PATCH /usuarios/{id}/activar
     *
     * Bloquear no corta necesariamente una sesión ya abierta: el token puede
     * seguir válido hasta su expiración o hasta que ese frontend consulte
     * /auth/me, según cómo esté implementada la validación.
     */
    async cambiarEstadoUsuario ({ commit, state, rootGetters }, { id, activo }) {
      const usuario = state.lista.find(u => mismaCuenta(u.id, id))

      if (!usuario) {
        throw new Error('La cuenta no existe.')
      }

      if (!activo && mismaCuenta(id, rootGetters['auth/currentUser']?.id)) {
        throw new Error('No podés bloquear tu propia cuenta.')
      }

      commit('SET_GUARDANDO', true)
      commit('SET_ERROR', null)

      try {
        const actualizado = activo
          ? await usuariosService.reactivar(id)
          : await usuariosService.bloquear(id)

        /*
         * Algunos endpoints de activar/desactivar devuelven el usuario; otros
         * solo devuelven un mensaje o true. Soportamos ambos casos.
         */
        if (actualizado?.id !== null && actualizado?.id !== undefined) {
          commit('UPSERT', actualizado)
        } else {
          commit('SET_ACTIVO_LOCAL', { id, activo })
        }

        return actualizado
      } catch (error) {
        commit('SET_ERROR', error.message || 'No se pudo cambiar el estado del usuario.')
        throw error
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    /*
     * La clave nunca vuelve del servidor ni toca el state.
     */
    async restablecerPassword ({ commit }, { id, password }) {
      validarPassword(password)

      commit('SET_GUARDANDO', true)
      commit('SET_ERROR', null)

      try {
        return await usuariosService.restablecerPassword(id, password)
      } catch (error) {
        commit('SET_ERROR', error.message || 'No se pudo restablecer la contraseña.')
        throw error
      } finally {
        commit('SET_GUARDANDO', false)
      }
    }
  },

  getters: {
    /**
     * Lo que trajo el servidor.
     */
    usuarios: state => state.lista,

    /**
     * Lo que va a la tabla.
     *
     * Como la búsqueda ahora viaja al servidor, devolvemos directamente la
     * lista. Se conserva el getter para no tocar la vista.
     */
    usuariosVisibles: state => state.lista,

    total: state => state.total,

    totalPaginas: state => state.totalPaginas,

    filtro: state => state.filtro,

    busqueda: state => state.busqueda,

    cargando: state => state.cargando,

    guardando: state => state.guardando,

    error: state => state.error,

    hayFiltroActivo: state =>
      !!state.busqueda ||
      state.filtro.rol !== null ||
      state.filtro.activo !== null,

    /*
     * Para deshabilitar el botón de bloquear en la última admin.
     * Cuenta sobre lo cargado, así que es orientativo: la regla real es de la
     * base/backend.
     */
    adminsActivas: state =>
      state.lista.filter(u => u.role === ROL.ADMIN && u.activo).length
  }
}
