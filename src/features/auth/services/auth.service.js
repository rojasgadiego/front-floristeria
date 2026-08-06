/**
 * features/auth/services/auth.service.js
 * =========================================================================
 * Contra AuthController: login, me y cambiar-password. Nada más — no hay
 * refresh ni logout en la API.
 * =========================================================================
 */

import { http, httpPublico } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'

const RUTA = '/auth'

/*
 * SesionDto habla en español (Nombre, Rol); las vistas leen name/role
 * porque así estaba el mock. La traducción vive acá, en el borde, para no
 * repetirla en cada vista.
 *
 * `permisos` se deja tal cual: viene del servidor y es la lista de módulos
 * que este rol puede ver.
 */
const aUsuario = (dto) => {
  if (!dto) return null
  return {
    id: dto.id,
    name: dto.nombre ?? '',
    email: dto.email ?? '',
    role: String(dto.rol ?? '').toLowerCase(),
    permisos: dto.permisos ?? []
  }
}

export const authService = {
  /**
   * Devuelve { token, expiraEn, usuario, saludo }.
   * `saludo` es el mensaje del sobre ("Hola, Rosa"), útil para el toast de
   * bienvenida.
   */
  async login ({ email, password }) {
    try {
      const respuesta = await httpPublico.post(`${RUTA}/login`, { email, password })
      const { token, expiraEn, usuario } = respuesta.data

      return {
        token,
        expiraEn,
        usuario: aUsuario(usuario),
        saludo: respuesta.mensaje ?? null
      }
    } catch (e) {
      throw normalizarError(e)
    }
  },

  /**
   * La verdad sobre quién soy ahora. El token dice lo que era cierto cuando
   * se emitió; esto detecta que la cuenta fue bloqueada después.
   */
  async yo ({ signal } = {}) {
    try {
      const { data } = await http.get(`${RUTA}/me`, { signal })
      return aUsuario(data)
    } catch (e) {
      throw normalizarError(e)
    }
  },

  /**
   * Cambio de clave propio: exige la actual. Distinto del
   * restablecer-password de UsuariosController, que es la admin reseteando
   * la de otra persona sin conocerla.
   *
   * El backend exige mínimo 8 caracteres (MinLength en
   * CambiarPasswordRequest). Ojo: el login todavía valida 6.
   */
  async cambiarPassword ({ passwordActual, passwordNueva }) {
    try {
      await http.post(`${RUTA}/cambiar-password`, { passwordActual, passwordNueva })
    } catch (e) {
      throw normalizarError(e)
    }
  }
}