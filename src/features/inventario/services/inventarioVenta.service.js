/**
 * features/inventario/services/inventarioVenta.service.js
 * =========================================================================
 * Mover stock entre bodega y mostrador. Cada movimiento deja huella en el
 * libro mayor: eso lo hace el SP, no hay que pedirlo aparte.
 *
 * Lo que baja al mesón baja como PARTIDA: sale de un lote concreto y lleva
 * su propia etiqueta QR. Por eso el retorno también es por partida: así las
 * varas vuelven al balde del que salieron y no a uno cualquiera.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'

const RUTA = '/mostrador'

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
   * Baja varas de un lote al mesón. Devuelve la partida creada con su
   * código, el lote de origen y cuánto quedó en bodega.
   */
  traspasar ({ lote, cantidad, notas = null }) {
    return pedir(http.post(`${RUTA}/traspasos`, { lote, cantidad, notas }))
  },

  /** Para lo que no controla lotes: jarrones, cintas, tarjetas. */
  traspasarProducto ({ productoId, cantidad, notas = null }) {
    return pedir(http.post(`${RUTA}/traspasos/producto`, { productoId, cantidad, notas }))
  },

  /** Las partidas que el producto tiene en el mesón, en orden de consumo. */
  partidasDeProducto (productoId, { signal } = {}) {
    return pedir(http.get(`${RUTA}/producto/${productoId}`, { signal }))
  },

  /**
   * Devuelve del mostrador a bodega, al lote del que salió la partida.
   * Existe porque bajar de más pasa: se bajaron 50, se vendieron 12, el
   * resto vuelve a cámara al cerrar.
   */
  retornar ({ partida, cantidad, notas = null }) {
    return pedir(http.post(`${RUTA}/retornos`, { partida, cantidad, notas }))
  }
}
