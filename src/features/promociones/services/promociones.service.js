/**
 * features/promociones/services/promociones.service.js
 * =========================================================================
 * Consultarlas es de la política Caja —el punto de venta las ofrece—;
 * crearlas y editarlas, solo de administración: definen cuánto se regala.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'
import { aPagina } from '@/core/http/respuesta'
import { aDateOnly } from '@/core/utils/fechas'

const RUTA = '/promociones'

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

export const promocionesService = {
    /** PromocionFiltro: buscar, activa, soloVigentes, alcance + paginación */
    async listar(filtro = {}, { signal } = {}) {
        return aPagina(await pedir(http.get(RUTA, { params: limpiar(filtro), signal })))
    },

    /** Las que corren hoy: es lo que el punto de venta puede ofrecer. */
    vigentes({ signal } = {}) {
        return pedir(http.get(`${RUTA}/vigentes`, { signal }))
    },

    /** PromocionDetalleDto: rendimiento más las promociones con las que se pisa. */
    obtener(id, { signal } = {}) {
        return pedir(http.get(`${RUTA}/${id}`, { signal }))
    },

    crear(peticion) {
        return pedir(http.post(RUTA, peticion))
    },

    /** No reescribe boletas ya emitidas: cada venta guardó su descuento. */
    actualizar(id, peticion) {
        return pedir(http.put(`${RUTA}/${id}`, peticion))
    },

    activar(id) {
        return pedir(http.patch(`${RUTA}/${id}/activar`))
    },

    desactivar(id) {
        return pedir(http.patch(`${RUTA}/${id}/desactivar`))
    },

    /** Se rechaza si ya se aplicó en alguna boleta. */
    eliminar(id) {
        return pedir(http.delete(`${RUTA}/${id}`))
    },

    /**
     * Simula contra las ventas reales del período, con la misma regla que usa
     * el cobro. No guarda nada: sirve para probar una promoción que todavía no
     * existe.
     *
     * Ojo con los dos rangos: `desde`/`hasta` son la vigencia de la promoción,
     * `periodoDesde`/`periodoHasta` son las ventas pasadas contra las que se
     * la mide. Son cosas distintas y es fácil confundirlas.
     */
    simular(promocion, { periodoDesde, periodoHasta } = {}) {
        return pedir(http.post(`${RUTA}/simular`, {
            ...promocion,
            periodoDesde: periodoDesde ? aDateOnly(periodoDesde) : null,
            periodoHasta: periodoHasta ? aDateOnly(periodoHasta) : null
        }))
    }
}