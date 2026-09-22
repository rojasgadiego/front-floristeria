import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'

const RUTA = '/usuarios'

const ROL_DESDE_NUMERO = {
  1: 'admin',
  2: 'vendedor',
  3: 'bodega'
}

function limpiar (obj = {}) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '')
  )
}

function extraerPayload (respuesta) {
  if (respuesta == null) return respuesta

  // Si RespuestaFilter ya desenvuelve, esto simplemente devuelve respuesta.
  // Si llega ResponseDto, intenta extraer el payload real.
  return (
    respuesta.data ??
    respuesta.datos ??
    respuesta.resultado ??
    respuesta.result ??
    respuesta.payload ??
    respuesta
  )
}

async function pedir (promesa) {
  try {
    const { data } = await promesa
    return extraerPayload(data)
  } catch (e) {
    throw normalizarError(e)
  }
}

function normalizarTexto (valor) {
  return String(valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizarRolEntrada (rol) {
  if (rol === null || rol === undefined || rol === '') return rol

  if (typeof rol === 'number') {
    return ROL_DESDE_NUMERO[rol] ?? String(rol)
  }

  const valor = String(rol).trim()

  if (valor !== '' && !Number.isNaN(Number(valor))) {
    return ROL_DESDE_NUMERO[Number(valor)] ?? valor
  }

  const normalizado = normalizarTexto(valor)

  const mapa = {
    admin: 'admin',
    administrador: 'admin',

    vendedor: 'vendedor',
    venta: 'vendedor',
    ventas: 'vendedor',

    // Compatibilidad con pantallas antiguas.
    usuario: 'vendedor',

    bodega: 'bodega',
    bodeguero: 'bodega',
    almacen: 'bodega',
    almacenista: 'bodega',

    // Compatibilidad si antes se usaba supervisor.
    supervisor: 'bodega'
  }

  return mapa[normalizado] ?? normalizado
}

function normalizarRolSalida (rol) {
  if (rol === null || rol === undefined) return ''

  if (typeof rol === 'number') {
    return ROL_DESDE_NUMERO[rol] ?? String(rol)
  }

  const valor = String(rol).trim()

  if (valor !== '' && !Number.isNaN(Number(valor))) {
    return ROL_DESDE_NUMERO[Number(valor)] ?? valor
  }

  const normalizado = normalizarTexto(valor)

  const mapa = {
    admin: 'admin',
    administrador: 'admin',

    vendedor: 'vendedor',
    venta: 'vendedor',
    ventas: 'vendedor',
    usuario: 'vendedor',

    bodega: 'bodega',
    bodeguero: 'bodega',
    almacen: 'bodega',
    almacenista: 'bodega',
    supervisor: 'bodega'
  }

  return mapa[normalizado] ?? normalizado
}

function aUsuario (dto = {}) {
  if (!dto || typeof dto !== 'object') return dto

  const rolNormalizado = normalizarRolSalida(dto.role ?? dto.rol ?? dto.Rol)

  return {
    id: dto.id ?? dto.usuarioId ?? dto.Id ?? null,
    name: dto.name ?? dto.nombre ?? dto.Nombre ?? '',
    nombre: dto.nombre ?? dto.name ?? dto.Nombre ?? '',
    email: dto.email ?? dto.Email ?? '',
    role: rolNormalizado,
    rol: rolNormalizado,
    activo: dto.activo ?? dto.Activo ?? true,
    ultimoAcceso: dto.ultimoAcceso ?? dto.UltimoAcceso ?? null,
    creadoEn: dto.creadoEn ?? dto.CreadoEn ?? null,
    actualizadoEn: dto.actualizadoEn ?? dto.ActualizadoEn ?? null,
    boletas: dto.boletas ?? dto.Boletas ?? 0,
    vendido: dto.vendido ?? dto.Vendido ?? 0
  }
}

function aUsuarioBackend (usuario = {}) {
  return limpiar({
    id: usuario.id,
    nombre: usuario.nombre ?? usuario.name,
    email: usuario.email,
    password: usuario.password,
    rol: normalizarRolEntrada(usuario.rol ?? usuario.role),
    activo: usuario.activo
  })
}

function aPaginaUsuarios (respuesta, parametros = {}) {
  const paginaSolicitada = Number(parametros.pagina ?? 1)
  const porPaginaSolicitado = Number(parametros.porPagina ?? parametros.pageSize ?? 20)

  // Caso 1: API devuelve array directo.
  if (Array.isArray(respuesta)) {
    const items = respuesta.map(aUsuario)

    return {
      items,
      total: items.length,
      pagina: paginaSolicitada,
      porPagina: porPaginaSolicitado,
      totalPaginas: 1
    }
  }

  // Caso 2: API devuelve objeto paginado.
  const itemsOriginales =
    respuesta?.items ??
    respuesta?.registros ??
    respuesta?.usuarios ??
    respuesta?.data ??
    respuesta?.datos ??
    []

  const items = Array.isArray(itemsOriginales)
    ? itemsOriginales.map(aUsuario)
    : []

  const total =
    respuesta?.total ??
    respuesta?.totalRegistros ??
    respuesta?.count ??
    items.length

  const pagina =
    respuesta?.pagina ??
    respuesta?.page ??
    paginaSolicitada

  const porPagina =
    respuesta?.porPagina ??
    respuesta?.pageSize ??
    respuesta?.limite ??
    porPaginaSolicitado

  const totalPaginas =
    respuesta?.totalPaginas ??
    respuesta?.pages ??
    Math.max(1, Math.ceil(total / porPagina))

  return {
    ...respuesta,
    items,
    total,
    pagina,
    porPagina,
    totalPaginas
  }
}

export const usuariosService = {
  /**
   * API:
   * GET /api/usuarios?busqueda=&rol=&activo=
   *
   * Nota:
   * La API actual acepta busqueda, rol y activo.
   * pagina y porPagina se conservan solo para compatibilidad del frontend,
   * pero no se envían si el backend no los usa.
   */
  async listar (
    {
      busqueda,
      search,
      q,
      rol,
      role,
      activo,
      pagina,
      porPagina
    } = {},
    { signal } = {}
  ) {
    const textoBusqueda = busqueda ?? search ?? q

    const params = limpiar({
      busqueda: textoBusqueda,
      rol: normalizarRolEntrada(rol ?? role),
      activo
    })

    const respuesta = await pedir(
      http.get(RUTA, {
        params,
        signal
      })
    )

    return aPaginaUsuarios(respuesta, { pagina, porPagina })
  },

  /**
   * Alias para compatibilidad si alguna pantalla usa buscar.
   */
  async buscar (filtros = {}, opciones = {}) {
    return this.listar(filtros, opciones)
  },

  /**
   * API:
   * GET /api/usuarios/{id}
   */
  async obtener (id, { signal } = {}) {
    const respuesta = await pedir(
      http.get(`${RUTA}/${id}`, { signal })
    )

    return aUsuario(respuesta)
  },

  /**
   * API:
   * POST /api/usuarios
   */
  async crear (usuario) {
    const body = aUsuarioBackend(usuario)

    const respuesta = await pedir(
      http.post(RUTA, body)
    )

    return aUsuario(respuesta)
  },

  /**
   * API:
   * PUT /api/usuarios/{id}
   */
  async actualizar (id, usuario) {
    const body = aUsuarioBackend(usuario)

    const respuesta = await pedir(
      http.put(`${RUTA}/${id}`, body)
    )

    return aUsuario(respuesta)
  },

  /**
   * No existe endpoint PATCH /api/usuarios/{id}/rol en la API entregada.
   *
   * Este método queda como compatibilidad y usa PUT /api/usuarios/{id}.
   * Funciona solamente si tu ActualizarUsuarioRequest acepta actualización parcial
   * o permite enviar únicamente rol.
   */
  async cambiarRol (id, rolOUsuario, nuevoRol) {
    const esUsuarioCompleto =
      rolOUsuario &&
      typeof rolOUsuario === 'object' &&
      !Array.isArray(rolOUsuario)

    const body = esUsuarioCompleto
      ? aUsuarioBackend({
        ...rolOUsuario,
        rol: nuevoRol ?? rolOUsuario.rol ?? rolOUsuario.role
      })
      : {
        rol: normalizarRolEntrada(nuevoRol ?? rolOUsuario)
      }

    const respuesta = await pedir(
      http.put(`${RUTA}/${id}`, body)
    )

    return aUsuario(respuesta)
  },

  /**
   * API:
   * PATCH /api/usuarios/{id}/activar
   */
  async activar (id) {
    const respuesta = await pedir(
      http.patch(`${RUTA}/${id}/activar`)
    )

    return respuesta?.id ? aUsuario(respuesta) : respuesta
  },

  /**
   * API:
   * PATCH /api/usuarios/{id}/desactivar
   */
  async desactivar (id) {
    const respuesta = await pedir(
      http.patch(`${RUTA}/${id}/desactivar`)
    )

    return respuesta?.id ? aUsuario(respuesta) : respuesta
  },

  /**
   * Alias para compatibilidad con pantallas antiguas.
   */
  async bloquear (id) {
    return this.desactivar(id)
  },

  /**
   * Alias para compatibilidad con pantallas antiguas.
   */
  async reactivar (id) {
    return this.activar(id)
  },

  /**
   * API:
   * POST /api/usuarios/{id}/resetear-password
   *
   * Se envían password y nuevaPassword para soportar ambos nombres
   * en caso de que el DTO backend use uno u otro.
   */
  async resetearPassword (id, password) {
    return pedir(
      http.post(`${RUTA}/${id}/resetear-password`, {
        password,
        nuevaPassword: password
      })
    )
  },

  /**
   * Alias para compatibilidad con frontend antiguo.
   */
  async restablecerPassword (id, password) {
    return this.resetearPassword(id, password)
  }
}

export default usuariosService
