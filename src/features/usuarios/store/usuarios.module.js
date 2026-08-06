/**
 * features/usuarios/store/usuarios.module.js
 * =========================================================================
 * Cuentas ajenas. Separado de `auth` porque son cosas distintas: auth es mi
 * sesión, esto es un CRUD con permiso de admin. Estaban juntas en el mock
 * solo porque compartían el array fakeUsers.
 *
 * BÚSQUEDA: UsuarioFiltro no tiene campo de texto, así que el buscador
 * filtra en el cliente sobre lo que ya se trajo. Para un equipo de
 * florería (entre 3 y 20 cuentas) traer todo de una es más simple y más
 * rápido que paginar. Si esto crece a cientos, agregá `Buscar` a
 * UsuarioFiltro y mové `usuariosVisibles` al servidor.
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
  if (!limpio) throw new Error('El nombre es obligatorio.')
  if (limpio.length < LARGO_MINIMO_NOMBRE || limpio.length > LARGO_MAXIMO_NOMBRE) {
    throw new Error(`El nombre debe tener entre ${LARGO_MINIMO_NOMBRE} y ${LARGO_MAXIMO_NOMBRE} caracteres.`)
  }
  return limpio
}

function validarEmail (email) {
  const limpio = (email || '').trim().toLowerCase()
  if (!limpio) throw new Error('El correo es obligatorio.')
  if (!EMAIL_RE.test(limpio)) throw new Error('El correo no tiene un formato válido.')
  return limpio
}

function validarPassword (password) {
  if (!password || password.length < LARGO_MINIMO_PASSWORD) {
    throw new Error(`La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`)
  }
  return password
}

export default {
  namespaced: true,

  state: () => ({
    lista: [],
    total: 0,
    totalPaginas: 0,
    filtro: filtroInicial(),
    /* Separado del filtro porque no viaja al servidor. */
    busqueda: '',
    cargando: false,
    guardando: false,
    error: null
  }),

  mutations: {
    SET_PAGINA (state, { items, total, pagina, totalPaginas }) {
      state.lista = items
      state.total = total
      state.totalPaginas = totalPaginas
      state.filtro.pagina = pagina
    },
    SET_FILTRO (state, cambios) {
      /* Cualquier cambio de filtro vuelve a la página 1: si estabas en la 3
         y filtrás, la 3 del resultado nuevo puede no existir y verías una
         tabla vacía sin entender por qué. */
      state.filtro = { ...state.filtro, ...cambios, pagina: cambios.pagina ?? 1 }
    },
    SET_BUSQUEDA (state, texto) { state.busqueda = texto },
    RESET_FILTRO (state) {
      state.filtro = filtroInicial()
      state.busqueda = ''
    },
    SET_CARGANDO (state, v) { state.cargando = v },
    SET_GUARDANDO (state, v) { state.guardando = v },
    SET_ERROR (state, e) { state.error = e },
    UPSERT (state, usuario) {
      const i = state.lista.findIndex(u => u.id === usuario.id)
      if (i !== -1) state.lista.splice(i, 1, { ...state.lista[i], ...usuario })
    }
  },

  actions: {
    async cargar ({ commit, state }, { signal } = {}) {
      commit('SET_CARGANDO', true)
      commit('SET_ERROR', null)
      try {
        commit('SET_PAGINA', await usuariosService.listar(state.filtro, { signal }))
      } catch (error) {
        if (!error.esCancelado) commit('SET_ERROR', error.message)
      } finally {
        commit('SET_CARGANDO', false)
      }
    },

    /* Filtros que sí viajan (rol, activo) → recarga. */
    async filtrar ({ commit, dispatch }, cambios) {
      commit('SET_FILTRO', cambios)
      await dispatch('cargar')
    },

    /* Búsqueda por texto → local, sin request. Por eso no necesita debounce. */
    buscar ({ commit }, texto) {
      commit('SET_BUSQUEDA', texto ?? '')
    },

    /*
     * De acá para abajo los errores se propagan: la vista los muestra en el
     * modal. Ahora el mensaje puede venir del servidor (409 correo
     * duplicado, 400 última admin) en vez de un throw local.
     */
    async crearUsuario ({ commit, dispatch }, datos) {
      const name = validarNombre(datos.name)
      const email = validarEmail(datos.email)
      const password = validarPassword(datos.password)
      if (!esRolValido(datos.role)) throw new Error('Selecciona un rol válido.')

      commit('SET_GUARDANDO', true)
      try {
        const creado = await usuariosService.crear({ name, email, password, role: datos.role })
        /* Recarga en vez de push: la lista viene ordenada por el servidor;
           insertar a mano la desincroniza del total. */
        await dispatch('cargar')
        return creado
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    /**
     * El PUT solo actualiza nombre y correo. Si además cambió el rol va por
     * su endpoint: en la API son dos operaciones porque tienen consecuencias
     * distintas.
     */
    async actualizarUsuario ({ commit, state }, datos) {
      const name = validarNombre(datos.name)
      const email = validarEmail(datos.email)
      const actual = state.lista.find(u => u.id === datos.id)

      commit('SET_GUARDANDO', true)
      try {
        let usuario = await usuariosService.actualizar(datos.id, { name, email })

        if (datos.role && actual && datos.role !== actual.role) {
          usuario = await usuariosService.cambiarRol(datos.id, datos.role)
        }

        commit('UPSERT', usuario)
        return usuario
      } finally {
        commit('SET_GUARDANDO', false)
      }
    },

    async cambiarRolUsuario ({ commit, state, rootGetters }, { id, role }) {
      const usuario = state.lista.find(u => u.id === id)
      if (!usuario) throw new Error('La cuenta no existe.')
      if (!esRolValido(role)) throw new Error('Rol no válido.')

      /* La base protege que no quede ninguna admin, no que no te
         desloguees vos. Quitarte tu propio rol te saca de esta pantalla en
         la siguiente navegación; avisarlo antes es más barato que
         explicarlo después. */
      if (id === rootGetters['auth/currentUser']?.id && role !== ROL.ADMIN) {
        throw new Error('Estás cambiando tu propio rol: vas a perder el acceso a esta pantalla.')
      }

      commit('UPSERT', await usuariosService.cambiarRol(id, role))
    },

    /**
     * Bloquear / reactivar. Se conserva el nombre de la acción para no tocar
     * la vista, aunque por dentro sean dos endpoints.
     *
     * Bloquear no corta la sesión abierta: el token sigue válido hasta
     * ExpiraEn y el corte ocurre cuando ese front consulta /auth/me.
     */
    async cambiarEstadoUsuario ({ commit, state, rootGetters }, { id, activo }) {
      const usuario = state.lista.find(u => u.id === id)
      if (!usuario) throw new Error('La cuenta no existe.')

      if (!activo && id === rootGetters['auth/currentUser']?.id) {
        throw new Error('No podés bloquear tu propia cuenta.')
      }

      const actualizado = activo
        ? await usuariosService.reactivar(id)
        : await usuariosService.bloquear(id)

      commit('UPSERT', actualizado)
    },

    /* La clave nunca vuelve del servidor ni toca el state. */
    async restablecerPassword (_, { id, password }) {
      validarPassword(password)
      await usuariosService.restablecerPassword(id, password)
    }
  },

  getters: {
    /** Lo que trajo el servidor, sin filtrar por texto. */
    usuarios: state => state.lista,

    /** Lo que va a la tabla. La búsqueda es local: ver la nota de arriba. */
    usuariosVisibles: (state) => {
      const q = state.busqueda.trim().toLowerCase()
      if (!q) return state.lista
      return state.lista.filter(u =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      )
    },

    total: state => state.total,
    totalPaginas: state => state.totalPaginas,
    filtro: state => state.filtro,
    busqueda: state => state.busqueda,
    cargando: state => state.cargando,
    guardando: state => state.guardando,
    error: state => state.error,

    hayFiltroActivo: state =>
      !!state.busqueda || state.filtro.rol !== null || state.filtro.activo !== null,

    /* Para deshabilitar el botón de bloquear en la última admin. Cuenta
       sobre lo cargado, así que es orientativo: la regla real es de la base. */
    adminsActivas: state =>
      state.lista.filter(u => u.role === ROL.ADMIN && u.activo).length
  }
}

/* =========================================================================
 * NO existe `eliminarUsuario`: UsuariosController no tiene DELETE, y está
 * bien que no lo tenga. ventas.usuario_id y cajas.abierta_por apuntan a
 * esta tabla y ReportesService.EquipoAsync los lee para el histórico.
 * En la vista, "Eliminar" pasa a "Bloquear".
 * ========================================================================= */