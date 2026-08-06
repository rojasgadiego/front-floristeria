/**
 * features/compras/services/proveedores.service.js
 * =========================================================================
 * Leer es de VerInventario; crear, editar y cambiar estado, de Inventario.
 * No hay DELETE: las compras históricas y los lotes referencian al proveedor.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'
import { aPagina } from '@/core/http/respuesta'

const RUTA = '/proveedores'

async function pedir(promesa) {
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

export const proveedoresService = {
    /** ProveedorFiltro: buscar, activo + paginación */
    async listar(filtro = {}, { signal } = {}) {
        return aPagina(await pedir(http.get(RUTA, { params: limpiar(filtro), signal })))
    },

    obtener(id, { signal } = {}) {
        return pedir(http.get(`${RUTA}/${id}`, { signal }))
    },

    crear(peticion) {
        return pedir(http.post(RUTA, peticion))
    },

    actualizar(id, peticion) {
        return pedir(http.put(`${RUTA}/${id}`, peticion))
    },

    activar(id) {
        return pedir(http.patch(`${RUTA}/${id}/activar`))
    },

    desactivar(id) {
        return pedir(http.patch(`${RUTA}/${id}/desactivar`))
    }
}