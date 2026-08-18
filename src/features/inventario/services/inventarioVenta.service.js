/**
 * features/inventario/services/inventarioVenta.service.js
 * =========================================================================
 * El mostrador: lo que está adelante y se puede vender.
 *
 * Ver es de cualquiera con VerInventario. Traspasar, retornar y contar son
 * de administración: definen cuánto puede vender el equipo en el día.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'

const RUTA = '/inventario-venta'

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
     * Resumen agrupado por producto, con valores y aviso de reposición.
     *
     * Ojo con `hayQueReponer`: compara contra lo que hay en el MOSTRADOR, no
     * en bodega. Es el aviso de qué bajar al frente, no de qué comprar.
     */
    estado ({ signal } = {}) {
        return pedir(http.get(RUTA, { signal }))
    },

    /** El catálogo del vendedor: partida por partida, con su precio resuelto. */
    vendibles ({ signal } = {}) {
        return pedir(http.get(`${RUTA}/vendibles`, { signal }))
    },

    /**
     * Baja mercadería de la cámara al mostrador.
     *
     * Devuelve una partida por cada lote que se tocó: pedir 100 varas puede
     * vaciar un lote de 40 y empezar otro, y cada partida conserva el costo y
     * el vencimiento del suyo.
     */
    traspasar ({ productoId, cantidad, loteId = null }) {
        return pedir(http.post(`${RUTA}/traspasar`, { productoId, cantidad, loteId }))
    },

    /** Devuelve a la cámara lo que se bajó de más. Vuelve a su lote de origen. */
    retornar ({ loteVentaId, cantidad }) {
        return pedir(http.post(`${RUTA}/retornar`, { loteVentaId, cantidad }))
    },

    /**
     * Conteo físico. Reemplaza al ajuste manual.
     *
     * `contado` es lo que hay en el balde, NO la diferencia. El servidor
     * calcula la resta y deja registrado lo que él creía, que es lo que
     * convierte esto en una auditoría y no en una corrección anónima.
     */
    contar ({ loteId, contado, detalle = null }) {
        return pedir(http.post(`${RUTA}/conteo`, { loteId, contado, detalle }))
    }
}