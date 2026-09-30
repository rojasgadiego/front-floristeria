/**
 * shared/composables/useFotosProducto.js
 * =========================================================================
 * El mapa producto → versión de foto, compartido por toda la app: se pide
 * una vez y lo leen el inventario, el POS y los modales. Al subir o quitar
 * una foto se actualiza acá y todas las vistas lo ven al instante.
 *
 * Donde no hay foto, urlFoto devuelve null y la vista muestra el emoji.
 * =========================================================================
 */

import { reactive } from 'vue'
import { imagenesService } from '@/features/inventario/services/imagenes.service'

const versiones = reactive({})
let pedido = null

function cargar ({ forzar = false } = {}) {
  if (pedido && !forzar) return pedido
  pedido = imagenesService.versiones()
    .then((lista) => {
      for (const k of Object.keys(versiones)) delete versiones[k]
      for (const { productoId, version } of lista || []) versiones[productoId] = version
    })
    .catch(() => {
      /* Sin fotos la app sigue funcionando con emojis; se reintenta la
         próxima vez que alguien lo pida. */
      pedido = null
    })
  return pedido
}

const urlFoto = (productoId) =>
  versiones[productoId] ? imagenesService.url(productoId, versiones[productoId]) : null

const registrar = (productoId, version) => { versiones[productoId] = version }
const olvidar = (productoId) => { delete versiones[productoId] }

export function useFotosProducto () {
  return { cargar, urlFoto, registrar, olvidar }
}
