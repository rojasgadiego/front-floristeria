/**
 * features/usuarios/services/usuarios.service.js
 * =========================================================================
 * Contra UsuariosController. Todo el controller es
 * [Authorize(Policy = Politicas.Admin)]: para un vendedor o bodega, cada
 * llamada de acá es un 403.
 *
 * UsuarioFiltro solo acepta rol y activo (más la paginación heredada de
 * ParametrosPagina). NO hay búsqueda por texto: cualquier `buscar` que se
 * mande se descarta en silencio del lado del servidor. El filtro por
 * nombre/correo se resuelve en el store, sobre la página cargada.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'
import { aPagina } from '@/core/http/respuesta'

const RUTA = '/usuarios'

/*
 * UsuarioDto habla en español; las vistas leen name/role porque así estaba
 * el mock. La traducción vive acá, en el borde.
 *
 * Los campos de actividad (ultimoAcceso, boletas, vendido) se mapean
 * explícitos: son los que hacen útil la tabla de equipo, no un extra.
 */
const aUsuario = (dto) => ({
  id: dto.id,
  name: dto.nombre ?? '',
  email: dto.email ?? '',
  role: String(dto.rol ?? '').toLowerCase(),
  activo: dto.activo !== false,
  ultimoAcceso: dto.ultimoAcceso ?? null,
  creadoEn: dto.creadoEn ?? null,
  boletas: dto.boletas ?? 0,
  vendido: dto.vendido ?? 0
})

async function pedir (promesa) {
  try {
    const { data } = await promesa
    return data
  } catch (e) {
    throw normalizarError(e)
  }
}

/* Saca null, undefined y '' — pero conserva `false`, que en el filtro de
   activo significa "solo bloqueadas" y no "sin filtro". */
const limpiar = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '')
  )

export const usuariosService = {
  /**
   * >>> VERIFICAR: los nombres de página salen de
   *     Common/Paginacion/ParametrosPagina.cs. Asumo `pagina` y `porPagina`
   *     por consistencia con Pagina<T>. Si difieren, el backend usa sus
   *     valores por defecto y la paginación no responde.
   */
  async listar ({ rol, activo, pagina, porPagina } = {}, { signal } = {}) {
    const respuesta = await pedir(
      http.get(RUTA, { params: limpiar({ rol, activo, pagina, porPagina }), signal })
    )
    const pag = aPagina(respuesta)
    return { ...pag, items: pag.items.map(aUsuario) }
  },

  async obtener (id, { signal } = {}) {
    return aUsuario(await pedir(http.get(`${RUTA}/${id}`, { signal })))
  },

  async crear ({ name, email, password, role }) {
    return aUsuario(await pedir(http.post(RUTA, {
      nombre: name,
      email,
      password,
      rol: role
    })))
  },

  /* El PUT no toca el rol: ese endpoint es aparte, a propósito. */
  async actualizar (id, { name, email }) {
    return aUsuario(await pedir(http.put(`${RUTA}/${id}`, {
      nombre: name,
      email
    })))
  },

  async cambiarRol (id, rol) {
    return aUsuario(await pedir(http.patch(`${RUTA}/${id}/rol`, { rol })))
  },

  /* Dos endpoints distintos, ninguno lleva body. */
  async bloquear (id) {
    return aUsuario(await pedir(http.patch(`${RUTA}/${id}/bloquear`)))
  },

  async reactivar (id) {
    return aUsuario(await pedir(http.patch(`${RUTA}/${id}/reactivar`)))
  },

  /* Devuelve 204. El campo es `password`, igual que en CrearUsuarioRequest. */
  async restablecerPassword (id, password) {
    await pedir(http.post(`${RUTA}/${id}/restablecer-password`, { password }))
  }
}