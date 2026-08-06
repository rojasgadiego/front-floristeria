/**
 * features/reportes/services/reportes.service.js
 * =========================================================================
 * Ojo con los permisos: el controller es Politicas.Admin, pero /panel tiene
 * [Authorize] a secas y /inventario pide VerInventario. Es decir: el panel
 * lo ve todo el equipo, y resultado, productos y equipo son solo de
 * administración. Un vendedor pidiéndolos recibe 403.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'
import { aDateOnly } from '@/core/utils/fechas'

const RUTA = '/reportes'

async function pedir(promesa) {
    try {
        const { data } = await promesa
        return data
    } catch (e) {
        throw normalizarError(e)
    }
}

const rango = (desde, hasta) => {
    const p = {}
    if (desde) p.desde = aDateOnly(desde)
    if (hasta) p.hasta = aDateOnly(hasta)
    return p
}

export const reportesService = {
    /** PanelDto. Lo ve cualquier rol autenticado. */
    panel({ signal } = {}) {
        return pedir(http.get(`${RUTA}/panel`, { signal }))
    },

    /** ResultadoPeriodoDto. Solo admin. Sin fechas, últimos 30 días; máximo un año. */
    resultado({ desde, hasta, signal } = {}) {
        return pedir(http.get(`${RUTA}/resultado`, { params: rango(desde, hasta), signal }))
    },

    /** RendimientoProductosDto. Solo admin. El top va por utilidad, no por ingresos. */
    productos({ desde, hasta, signal } = {}) {
        return pedir(http.get(`${RUTA}/productos`, { params: rango(desde, hasta), signal }))
    },

    /** ValorInventarioDto. Cualquiera con VerInventario. Sin rango: es la foto de hoy. */
    inventario({ signal } = {}) {
        return pedir(http.get(`${RUTA}/inventario`, { signal }))
    },

    /** RendimientoEquipoDto. Solo admin: muestra diferencias de caja por persona. */
    equipo({ desde, hasta, signal } = {}) {
        return pedir(http.get(`${RUTA}/equipo`, { params: rango(desde, hasta), signal }))
    },

    /** DesgloseTurnoDto. Política Caja. 404 si la caja no existe. */
    turno(cajaId, { signal } = {}) {
        return pedir(http.get(`${RUTA}/turno/${cajaId}`, { signal }))
    }
}