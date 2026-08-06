/**
 * features/configuracion/services/configuracion.service.js
 * =========================================================================
 * GET es para cualquier rol autenticado: el punto de venta necesita los
 * datos del local para el ticket y el valor del punto para mostrar el saldo
 * del cliente en pesos.
 *
 * Los PUT son solo de administración.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'

const RUTA = '/configuracion'

async function pedir (promesa) {
  try {
    const { data } = await promesa
    return data
  } catch (e) {
    throw normalizarError(e)
  }
}

export const configuracionService = {
  /** ConfiguracionDto: { local, ticket, venta, club, actualizadoEn, actualizadoPor } */
  obtener ({ signal } = {}) {
    return pedir(http.get(RUTA, { signal }))
  },

  guardarLocal (local) {
    return pedir(http.put(`${RUTA}/local`, local))
  },

  guardarTicket (ticket) {
    return pedir(http.put(`${RUTA}/ticket`, ticket))
  },

  guardarVenta (venta) {
    return pedir(http.put(`${RUTA}/venta`, venta))
  },

  /**
   * Cambiar el valor del punto revalúa todos los saldos vigentes. Si hay
   * puntos en circulación, la API rechaza con 400 hasta que llegue
   * confirmaRevaluacion en true.
   */
  guardarClub (club, confirmaRevaluacion = false) {
    return pedir(http.put(`${RUTA}/club`, { ...club, confirmaRevaluacion }))
  },

  /** Qué mueve el cambio, antes de aplicarlo. */
  impactoClub (valorPunto, { signal } = {}) {
    return pedir(http.get(`${RUTA}/club/impacto`, { params: { valorPunto }, signal }))
  }
}