/**
 * features/mermas/services/mermas.service.js
 * =========================================================================
 * Salidas de inventario. Leer es de VerInventario; registrar, de Admin y
 * Bodega; revertir, solo de Admin, porque deshace un registro de pérdida.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'
import { aPagina } from '@/core/http/respuesta'
import { aDateOnly } from '@/core/utils/fechas'

const RUTA = '/mermas'

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

export const mermasService = {
    async listar(filtro = {}, { signal } = {}) {
        const params = limpiar({
            ...filtro,
            desde: filtro.desde ? aDateOnly(filtro.desde) : undefined,
            hasta: filtro.hasta ? aDateOnly(filtro.hasta) : undefined
        })
        return aPagina(await pedir(http.get(RUTA, { params, signal })))
    },

    obtener(id, { signal } = {}) {
        return pedir(http.get(`${RUTA}/${id}`, { signal }))
    },

    /**
     * El costo se congela al registrar: si el proveedor sube el precio la
     * semana que viene, la pérdida de hoy sigue valiendo lo que valía hoy.
     */
    registrar(peticion) {
        return pedir(http.post(RUTA, peticion))
    },

    /** Da de baja el lote con lo que le quede. Es el destino de los rezagados. */
    descartarLote(loteId, { motivo, detalle = null, esDevolucionProveedor = false }) {
        return pedir(http.post(`${RUTA}/lote/${loteId}/descartar`, {
            motivo, detalle, esDevolucionProveedor
        }))
    },

    /**
     * Las varas vuelven al lote del que salieron con su costo y su
     * vencimiento. Si hubo reingreso y esas varas ya se vendieron, la API
     * rechaza: no hay forma de deshacerlo sin inventar stock.
     */
    revertir(id, motivo) {
        return pedir(http.post(`${RUTA}/${id}/revertir`, { motivo }))
    },

    /* ---------------- Desarme ---------------- */

    /** Plan pre-llenado: qué varas salen y de qué lote vinieron. */
    planDesarme(productoId, cantidad = 1, { signal } = {}) {
        return pedir(http.get(`${RUTA}/desarme/${productoId}/plan`, {
            params: { cantidad }, signal
        }))
    },

    /**
     * Las cantidades de cada componente deben sumar exactamente lo que dice
     * la receta: cada vara tiene que tener un destino.
     */
    desarmar(productoId, { cantidad, motivo, detalle = null, lineas }) {
        return pedir(http.post(`${RUTA}/desarme/${productoId}`, {
            cantidad, motivo, detalle, lineas
        }))
    },

    /* ---------------- Reporte ---------------- */

    /** Sin fechas toma los últimos 30 días. */
    resumen({ desde, hasta } = {}, { signal } = {}) {
        const params = limpiar({
            desde: desde ? aDateOnly(desde) : undefined,
            hasta: hasta ? aDateOnly(hasta) : undefined
        })
        return pedir(http.get(`${RUTA}/resumen`, { params, signal }))
    },

    /**
     * Motivos habituales. Se ofrecen en un select en vez de dejar el campo
     * libre: "marchita", "Marchita" y "se marchitó" serían tres categorías
     * distintas en el reporte.
     */
    motivos({ signal } = {}) {
        return pedir(http.get(`${RUTA}/motivos`, { signal }))
    }
}