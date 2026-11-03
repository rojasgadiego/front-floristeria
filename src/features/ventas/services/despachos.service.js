/**
 * features/ventas/services/despachos.service.js
 * =========================================================================
 * Las entregas de un día. El servidor no devuelve montos: esta pantalla la
 * usa cualquier vendedor, y el ramo lo puede vender uno y entregarlo otro.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'

const RUTA = '/despachos'

async function pedir (promesa) {
  try {
    const { data } = await promesa
    return data
  } catch (e) {
    throw normalizarError(e)
  }
}

export const despachosService = {
  listar (fecha, { signal } = {}) {
    return pedir(http.get(RUTA, { params: { fecha }, signal }))
  },

  cambiarEstado (ventaId, estado) {
    return pedir(http.patch(`${RUTA}/${ventaId}/estado`, { estado }))
  }
}
