/**
 * features/ventas/services/ventas.service.js
 * =========================================================================
 * El servidor NO acepta montos del cliente: lee los precios de la base,
 * recalcula la promoción con sus reglas y arma el total de cero. Lo que la
 * pantalla envía son productos, cantidades y el lote escaneado.
 *
 * Por eso el total del carrito es una previsualización. Si difiere del que
 * devuelve la boleta, manda el de la boleta.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'
import { aPagina } from '@/core/http/respuesta'
import { aDateOnly } from '@/core/utils/fechas'

const RUTA = '/ventas'

async function pedir (promesa) {
  try {
    const { data } = await promesa
    return data
  } catch (e) {
    throw normalizarError(e)
  }
}

const limpiar = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '')
  )

export const ventasService = {
  /**
   * Cobra la boleta. Necesita caja abierta.
   *
   * `autorizacion` lleva correo y contraseña de quien autoriza un descuento
   * sobre el umbral: se verifican contra la base, no alcanza con que la
   * pantalla diga que alguien autorizó.
   */
  registrar (peticion) {
    return pedir(http.post(RUTA, peticion))
  },

  async listar (filtro = {}, { signal } = {}) {
    const params = limpiar({
      ...filtro,
      desde: filtro.desde ? aDateOnly(filtro.desde) : undefined,
      hasta: filtro.hasta ? aDateOnly(filtro.hasta) : undefined
    })
    return aPagina(await pedir(http.get(RUTA, { params, signal })))
  },

  /** Incluye el plan de consumo: qué salió, de qué lote y a qué costo real. */
  obtener (id, { signal } = {}) {
    return pedir(http.get(`${RUTA}/${id}`, { signal }))
  },

  ticket (id, { signal } = {}) {
    return pedir(http.get(`${RUTA}/${id}/ticket`, { signal }))
  },

  /**
   * Promociones que aplican a ESTE carrito, con el descuento ya calculado y
   * ordenadas por conveniencia. Al cobrar se recalcula: lo que se muestre
   * acá no compromete el monto final.
   *
   * El cuerpo es la lista de líneas, sin envolver.
   */
  promocionesAplicables (items, { signal } = {}) {
    return pedir(http.post(`${RUTA}/promociones-aplicables`, items, { signal }))
  },

  /**
   * Devuelve al inventario exactamente lo que sacó: las varas vuelven al
   * lote del que salieron con su costo y su vencimiento. Es posible porque
   * la venta guardó su plan de consumo. Solo admin.
   */
  anular (id, motivo) {
    return pedir(http.post(`${RUTA}/${id}/anular`, { motivo }))
  }
}