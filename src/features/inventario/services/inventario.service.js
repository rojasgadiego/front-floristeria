/**
 * features/inventario/services/inventario.service.js
 * =========================================================================
 * Lo transversal del inventario: kardex, alertas y categorías.
 * Los productos van en productos.service.js — son otro controller.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'
import { aPagina } from '@/core/http/respuesta'
import { aDateOnly } from '@/core/utils/fechas'

const RUTA = '/inventario'

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

export const inventarioService = {
    /**
     * Libro mayor: toda entrada y salida con su motivo y su responsable.
     * Es lo que permite reconstruir por qué faltan seis rosas.
     *
     * Tipos: alta, entrada, salida, ajuste, venta, consumo, armado, merma, baja.
     */
    async movimientos(filtro = {}, { signal } = {}) {
        const params = limpiar({
            ...filtro,
            desde: filtro.desde ? aDateOnly(filtro.desde) : undefined,
            hasta: filtro.hasta ? aDateOnly(filtro.hasta) : undefined
        })
        return aPagina(await pedir(http.get(`${RUTA}/movimientos`, { params, signal })))
    },

    /** Lista completa, sin paginar: son pocos y se muestran todos. */
    bajoMinimo({ signal } = {}) {
        return pedir(http.get(`${RUTA}/bajo-minimo`, { signal }))
    },

    categorias({ signal } = {}) {
        return pedir(http.get(`${RUTA}/categorias`, { signal }))
    },

    /** Requiere política Inventario (admin o bodega). */
    crearCategoria({ nombre, orden = 0 }) {
        return pedir(http.post(`${RUTA}/categorias`, { nombre, orden }))
    }
}