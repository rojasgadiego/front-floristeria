/**
 * features/ventas/services/mostrador.service.js
 * =========================================================================
 * Las partidas del mesón: lo que bajó de un balde concreto, con su propio
 * código y su QR.
 *
 * El traspaso exige un LOTE, no un producto: la partida recuerda de dónde
 * vino, y eso es lo que permite devolver las varas al balde correcto si se
 * anula una venta.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'
import { aPagina } from '@/core/http/respuesta'

const RUTA = '/mostrador'

async function pedir (promesa) {
  try {
    const { data } = await promesa
    return data
  } catch (e) {
    throw normalizarError(e)
  }
}

export const mostradorService = {
  async listar (filtro = {}, { signal } = {}) {
    return aPagina(await pedir(http.get(`${RUTA}/partidas`, { params: filtro, signal })))
  },

  /**
   * Lo que llama el POS al escanear. Devuelve `vendible` y, cuando es no,
   * el motivo ya redactado para mostrar.
   *
   * Acepta el código pelado o el contenido completo del QR.
   */
  escanear (codigo, { signal } = {}) {
    return pedir(http.get(`${RUTA}/partidas/${encodeURIComponent(codigo)}`, { signal }))
  },

  /** En orden de consumo: lo que vence antes sale primero. */
  deProducto (productoId, { signal } = {}) {
    return pedir(http.get(`${RUTA}/producto/${productoId}`, { signal }))
  },

  /** Devuelve la partida creada con su código y su QR. */
  traspasar ({ lote, cantidad, notas = null }) {
    return pedir(http.post(`${RUTA}/traspasos`, { lote, cantidad, notas }))
  },

  /** Para lo que no controla lotes: jarrones, cintas, tarjetas. */
  traspasarProducto ({ productoId, cantidad, notas = null }) {
    return pedir(http.post(`${RUTA}/traspasos/producto`, { productoId, cantidad, notas }))
  },

  /** Devuelve al lote del que salió. Bajar de más pasa. */
  retornar ({ partida, cantidad, notas = null }) {
    return pedir(http.post(`${RUTA}/retornos`, { partida, cantidad, notas }))
  }
}