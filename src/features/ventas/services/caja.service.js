/**
 * features/ventas/services/caja.service.js
 * =========================================================================
 * Turnos de caja. Solo puede haber uno abierto a la vez.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'
import { aPagina } from '@/core/http/respuesta'
import { aDateOnly } from '@/core/utils/fechas'

const RUTA = '/caja'

async function pedir(promesa) {
    try {
        const { data } = await promesa
        return data
    } catch (e) {
        throw normalizarError(e)
    }
}

export const cajaService = {
    /** Turno abierto con su resumen al momento, o null si no hay ninguno. */
    actual({ signal } = {}) {
        return pedir(http.get(`${RUTA}/actual`, { signal }))
    },

    /** 409 si ya hay una caja abierta. */
    abrir(fondoInicial) {
        return pedir(http.post(`${RUTA}/abrir`, { fondoInicial }))
    },

    /**
     * Solo se informa lo contado en el cajón: el efectivo esperado lo calcula
     * el sistema desde las boletas. Si se pudiera dictar, la diferencia
     * dejaría de significar algo.
     */
    cerrar({ efectivoContado, nota = null }) {
        return pedir(http.post(`${RUTA}/cerrar`, { efectivoContado, nota }))
    },

    resumen(id, { signal } = {}) {
        return pedir(http.get(`${RUTA}/${id}/resumen`, { signal }))
    },

    async historial(filtro = {}, { signal } = {}) {
        const params = {
            ...filtro,
            desde: filtro.desde ? aDateOnly(filtro.desde) : undefined,
            hasta: filtro.hasta ? aDateOnly(filtro.hasta) : undefined
        }
        return aPagina(await pedir(http.get(`${RUTA}/historial`, { params, signal })))
    }
}