/**
 * features/inventario/services/productos.service.js
 * =========================================================================
 * El catálogo. Leer es de VerInventario —el POS necesita los precios—;
 * escribir es de Admin y Bodega.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'
import { aPagina } from '@/core/http/respuesta'

const RUTA = '/productos'

async function pedir (promesa) {
  try {
    const { data } = await promesa
    return data
  } catch (e) {
    throw normalizarError(e)
  }
}

/* Saca null, undefined y '' — conserva `false`, que en los filtros
   booleanos significa algo distinto de "sin filtro". */
const limpiar = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '')
  )

export const productosService = {
  /**
   * ProductoFiltro: buscar, categoriaId, tipo, activo, bajoMinimo,
   * controlaLotes, soloEnVenta, más la paginación.
   *
   * `soloEnVenta` es lo que usa el POS: trae únicamente lo que está en el
   * mesón. Sin ese filtro llegarían los 17 del catálogo, incluidos los que
   * están en bodega y el vendedor no puede entregar.
   */
  async listar (filtro = {}, { signal } = {}) {
    return aPagina(await pedir(http.get(RUTA, { params: limpiar(filtro), signal })))
  },

  obtener (id, { signal } = {}) {
    return pedir(http.get(`${RUTA}/${id}`, { signal }))
  },

  /**
   * Para el lector de barras del mesón. A diferencia del escaneo de
   * partidas, esto busca en el catálogo: sirve para lo que no tiene
   * partida —un jarrón, una cinta— y para cuando la etiqueta del balde
   * está rota.
   */
  porCodigo (codigo, { signal } = {}) {
    return pedir(http.get(`${RUTA}/codigo/${encodeURIComponent(codigo)}`, { signal }))
  },

  crear (producto) {
    return pedir(http.post(RUTA, producto))
  },

  /**
   * No recibe tipo, controlaLotes ni stock, y el SP tampoco.
   *
   * Cambiar el tipo rompería la unión discriminada —un simple vive en
   * costo/stock, un armado en costoArmado/stockListo—. Quitar el control de
   * lotes dejaría huérfanos los que ya existen. Y el stock se mueve por
   * compras y ventas: si se editara a mano, dejaría de cuadrar con la suma
   * de sus lotes.
   */
  actualizar (id, producto) {
    return pedir(http.put(`${RUTA}/${id}`, producto))
  },

  /* Dar de baja es desactivar: lo saca del punto de venta y conserva su
     historial. El backend expone una ruta por sentido, sin body. */
  cambiarEstado (id, activo) {
    return pedir(http.patch(`${RUTA}/${id}/${activo ? 'activar' : 'desactivar'}`))
  },

  /* ---------------- Recetas ---------------- */

  /**
   * Qué componentes lleva un armado. Trae el costo de cada uno para poder
   * sugerir el costo del producto: la suma de sus partes.
   */
  receta (id, { signal } = {}) {
    return pedir(http.get(`${RUTA}/${id}/receta`, { signal }))
  },

  /**
   * Los productos simples que pueden entrar en una receta.
   *
   * Solo simples: un armado dentro de otro obligaría a resolver el costo de
   * forma recursiva, y ese cálculo se desincroniza al primer cambio de
   * precio de un componente de tercer nivel.
   */
  componentes ({ signal } = {}) {
    return pedir(http.get(`${RUTA}/componentes`, { signal }))
  },

  /**
   * Reemplaza la receta completa. Se manda entera en vez de por diferencias
   * porque son cinco líneas, y el reemplazo hace imposible que quede un
   * componente fantasma de una versión anterior.
   */
  guardarReceta (id, { lineas }) {
    return pedir(http.put(`${RUTA}/${id}/receta`, { lineas }))
  },

  /* ---------------- Armado ---------------- */

  /**
   * Se consulta ANTES de armar. Separa lo que alcanza solo con flor de
   * primera de lo que alcanzaría usando también la recuperada, y sugiere
   * qué lotes cubrirían el faltante.
   */
  disponibilidadArmado (id, cantidad = 1, { signal } = {}) {
    return pedir(http.get(`${RUTA}/${id}/disponibilidad-armado`, {
      params: { cantidad }, signal
    }))
  },

  /**
   * Los ingredientes con lote se consumen por FIFO. `lotesAutorizados`
   * habilita flor recuperada, que de otro modo queda fuera del reparto:
   * se consume primero y abarata la producción.
   */
  armar (id, { cantidad, lotesAutorizados = [] }) {
    return pedir(http.post(`${RUTA}/${id}/armar`, { cantidad, lotesAutorizados }))
  }
}
