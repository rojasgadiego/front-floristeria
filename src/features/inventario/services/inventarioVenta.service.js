/**
 * features/inventario/services/inventarioVenta.service.js
 * =========================================================================
 * Mover stock entre bodega y mostrador. Cada movimiento deja huella en el
 * libro mayor: eso lo hace el SP, no hay que pedirlo aparte.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'

const RUTA = '/inventario'

async function pedir (promesa) {
  try {
    const { data } = await promesa
    return data
  } catch (e) {
    throw normalizarError(e)
  }
}

export const inventarioVentaService = {
  /**
   * Baja de bodega al mostrador. Devuelve cómo quedó cada lado, para
   * actualizar la fila sin recargar la grilla entera.
   */
  traspasar ({ productoId, cantidad, detalle = null }) {
    return pedir(http.post(`${RUTA}/traspasos`, { productoId, cantidad, detalle }))
  },

  /**
   * Devuelve del mostrador a bodega. Existe porque bajar de más pasa: se
   * bajaron 50, se vendieron 12, el resto vuelve a cámara al cerrar.
   */
  retornar ({ productoId, cantidad, detalle = null }) {
    return pedir(http.post(`${RUTA}/retornos`, { productoId, cantidad, detalle }))
  }
}