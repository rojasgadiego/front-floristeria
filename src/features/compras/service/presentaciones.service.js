/**
 * features/compras/services/presentaciones.service.js
 * =========================================================================
 * Cómo llega cada flor del proveedor. La equivalencia en varas depende de la
 * especie —25 por paquete en rosas, 10 en maule— así que vive por producto y
 * no en una constante del sistema.
 *
 * Las rutas cuelgan del producto para crear y listar, pero de la propia
 * presentación para editar y borrar.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'

const RUTA = '/presentaciones'

async function pedir(promesa) {
    try {
        const { data } = await promesa
        return data
    } catch (e) {
        throw normalizarError(e)
    }
}

export const presentacionesService = {
    /** Lista completa del producto, sin paginar: son dos o tres por especie. */
    listar(productoId, { signal } = {}) {
        return pedir(http.get(`${RUTA}/producto/${productoId}`, { signal }))
    },

    crear(productoId, peticion) {
        return pedir(http.post(`${RUTA}/producto/${productoId}`, peticion))
    },

    /**
     * Si la presentación ya se usó en una compra, su equivalencia en varas
     * queda congelada: cambiarla recalcularía mal los lotes que ya
     * ingresaron, y la API lo rechaza con 400.
     */
    actualizar(id, peticion) {
        return pedir(http.put(`${RUTA}/${id}`, peticion))
    },

    /** Si ya se usó en una compra, el servidor la desactiva en vez de borrarla. */
    eliminar(id) {
        return pedir(http.delete(`${RUTA}/${id}`))
    }
}