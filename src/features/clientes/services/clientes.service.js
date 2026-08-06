/**
 * features/clientes/services/clientes.service.js
 * =========================================================================
 * El controller es de la política Caja: quien atiende el mesón necesita
 * buscar y crear fichas sobre la marcha. Desactivar, reactivar y ajustar
 * puntos son solo de administración.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'
import { aPagina } from '@/core/http/respuesta'

const RUTA = '/clientes'

async function pedir(promesa) {
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

export const clientesService = {
    /**
     * ClienteFiltro: buscar, activo, conPuntos, cumpleMes, sinComprarDias
     * más la paginación heredada de ParametrosPagina.
     *
     * `buscar` recorre nombre, RUT, teléfono y correo, y normaliza el RUT:
     * da lo mismo con puntos, sin puntos o con guion.
     */
    async listar(filtro = {}, { signal } = {}) {
        return aPagina(await pedir(http.get(RUTA, { params: limpiar(filtro), signal })))
    },

    /** ClienteDetalleDto: ficha + últimas compras + libro de puntos + frecuentes */
    detalle(id, { signal } = {}) {
        return pedir(http.get(`${RUTA}/${id}`, { signal }))
    },

    /**
     * Para el punto de venta. Devuelve null con 200 si no existe: en el mesón
     * lo normal es que el cliente no esté registrado, y eso no es un error.
     */
    porRut(rut, { signal } = {}) {
        return pedir(http.get(`${RUTA}/rut/${encodeURIComponent(rut)}`, { signal }))
    },

    crear(cliente) {
        return pedir(http.post(RUTA, cliente))
    },

    actualizar(id, cliente) {
        return pedir(http.put(`${RUTA}/${id}`, cliente))
    },

    /* Dos endpoints, sin body. No hay DELETE: las boletas históricas
       referencian la ficha. */
    desactivar(id) {
        return pedir(http.patch(`${RUTA}/${id}/desactivar`))
    },

    reactivar(id) {
        return pedir(http.patch(`${RUTA}/${id}/reactivar`))
    },

    /** Cantidad con signo: positiva regala, negativa descuenta. Motivo obligatorio. */
    ajustarPuntos(id, { cantidad, motivo }) {
        return pedir(http.post(`${RUTA}/${id}/ajustar-puntos`, { cantidad, motivo }))
    },

    async compras(id, parametros = {}, { signal } = {}) {
        return aPagina(await pedir(
            http.get(`${RUTA}/${id}/compras`, { params: limpiar(parametros), signal })
        ))
    },

    async movimientosPuntos(id, parametros = {}, { signal } = {}) {
        return aPagina(await pedir(
            http.get(`${RUTA}/${id}/puntos`, { params: limpiar(parametros), signal })
        ))
    },

    /** Sin mes toma el actual. diasFaltantes viene negativo si ya pasó. */
    cumpleanos(mes = null, { signal } = {}) {
        return pedir(http.get(`${RUTA}/cumpleanos`, {
            params: mes ? { mes } : {},
            signal
        }))
    }
}