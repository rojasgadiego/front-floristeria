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
  }
}