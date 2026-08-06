/**
 * features/compras/services/compras.service.js
 * =========================================================================
 * Órdenes de compra y su recepción. Es la única puerta por la que entra
 * stock de un producto controlado por lote.
 *
 * Leer es de VerInventario; crear, editar, recibir y anular, de la política
 * Inventario (admin y bodega).
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'
import { aPagina } from '@/core/http/respuesta'
import { aDateOnly } from '@/core/utils/fechas'

const RUTA = '/compras'

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

export const comprasService = {
  /** CompraFiltro: buscar, proveedorId, estado, desde, hasta + paginación */
  async listar (filtro = {}, { signal } = {}) {
    const params = limpiar({
      ...filtro,
      desde: filtro.desde ? aDateOnly(filtro.desde) : undefined,
      hasta: filtro.hasta ? aDateOnly(filtro.hasta) : undefined
    })
    return aPagina(await pedir(http.get(RUTA, { params, signal })))
  },

  /**
   * Detalle con sus líneas y, si ya se recibió, los lotes que generó.
   * Cada línea trae `costoAnterior`: el costo por vara de la compra previa
   * del mismo producto, para ver de inmediato si el proveedor subió.
   */
  obtener (id, { signal } = {}) {
    return pedir(http.get(`${RUTA}/${id}`, { signal }))
  },

  /**
   * Crea en borrador. NO mueve stock: eso ocurre al recibir.
   *
   * `costoUnitario` de cada línea es lo que cuesta UNA caja o UN paquete,
   * no una vara. El sistema calcula las varas desde la presentación y
   * reparte el costo entre ellas.
   */
  crear (peticion) {
    return pedir(http.post(RUTA, peticion))
  },

  /** Solo borradores: una compra recibida ya no se toca. */
  actualizar (id, peticion) {
    return pedir(http.put(`${RUTA}/${id}`, peticion))
  },

  /**
   * Recibe la mercadería y genera los lotes, cada uno con su código QR, su
   * vencimiento —calculado desde los días de vida del producto— y su costo
   * por vara. Devuelve los códigos para imprimir las etiquetas.
   */
  recibir (id) {
    return pedir(http.post(`${RUTA}/${id}/recibir`))
  },

  /**
   * Solo borradores. Una compra ya recibida no se anula: para revertirla hay
   * que registrar la merma de sus lotes indicando devolución al proveedor.
   */
  anular (id) {
    return pedir(http.post(`${RUTA}/${id}/anular`))
  },

  /** Cómo se movió el costo por vara de un producto entre compras. */
  evolucionCosto (productoId, { signal } = {}) {
    return pedir(http.get(`${RUTA}/evolucion-costo/${productoId}`, { signal }))
  }
}