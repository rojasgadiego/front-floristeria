/**
 * features/inventario/services/imagenes.service.js
 * =========================================================================
 * Fotos de productos. Subir y quitar es de Admin y Bodega; ver la foto es
 * público (la landing la muestra sin sesión), por eso la URL cuelga de
 * /publico y no lleva token: un <img> no puede mandar el bearer.
 *
 * La URL lleva ?v=version: cambia con cada foto nueva, así el navegador
 * puede cachearla para siempre y aun así mostrar la nueva al reemplazarla.
 * =========================================================================
 */

import { http, httpPublico } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'

async function pedir (promesa) {
  try {
    const { data } = await promesa
    return data
  } catch (e) {
    throw normalizarError(e)
  }
}

export const imagenesService = {
  /** [{ productoId, version }]: qué productos tienen foto. */
  versiones ({ signal } = {}) {
    return pedir(http.get('/productos/imagenes', { signal }))
  },

  /** El cuerpo ES la foto, sin multipart. Devuelve { productoId, version }. */
  subir (productoId, blob) {
    return pedir(http.put(`/productos/${productoId}/imagen`, blob, {
      headers: { 'Content-Type': blob.type || 'image/jpeg' }
    }))
  },

  quitar (productoId) {
    return pedir(http.delete(`/productos/${productoId}/imagen`))
  },

  url (productoId, version) {
    return `${http.defaults.baseURL}/publico/productos/${productoId}/imagen?v=${version}`
  },

  /** Lo activo y con foto, para la landing. Sin sesión. */
  catalogo ({ signal } = {}) {
    return pedir(httpPublico.get('/publico/catalogo', { signal }))
  }
}
