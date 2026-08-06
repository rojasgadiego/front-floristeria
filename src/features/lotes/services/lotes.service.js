/**
 * features/lotes/services/lotes.service.js
 * =========================================================================
 * El paquete físico que se recibe, se etiqueta con QR y se consume.
 * Consultar y escanear es de VerInventario; mover de ubicación, de Admin y
 * Bodega.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'
import { aPagina } from '@/core/http/respuesta'
import { aDateOnly } from '@/core/utils/fechas'

const RUTA = '/lotes'

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

export const lotesService = {
    /**
     * Lotes con existencias. `ordenFifo` marca la posición en la fila de
     * consumo: el 1 es el que debería venderse ahora.
     */
    async listar(filtro = {}, { signal } = {}) {
        return aPagina(await pedir(http.get(RUTA, { params: limpiar(filtro), signal })))
    },

    /** Incluye agotados y descartados. */
    async historial(filtro = {}, { signal } = {}) {
        const params = limpiar({
            ...filtro,
            desde: filtro.desde ? aDateOnly(filtro.desde) : undefined,
            hasta: filtro.hasta ? aDateOnly(filtro.hasta) : undefined
        })
        return aPagina(await pedir(http.get(`${RUTA}/historial`, { params, signal })))
    },

    obtener(id, { signal } = {}) {
        return pedir(http.get(`${RUTA}/${id}`, { signal }))
    },

    /** Lo que abre la URL del QR, y lo que sirve si se tipea el código a mano. */
    porCodigo(codigo, { signal } = {}) {
        return pedir(http.get(`${RUTA}/codigo/${encodeURIComponent(codigo)}`, { signal }))
    },

    /**
     * Respuesta del escaneo en el punto de venta. Es informativo: la
     * validación que manda ocurre al cobrar, cuando las filas se bloquean.
     */
    validar({ codigo, cantidad = 1 }) {
        return pedir(http.post(`${RUTA}/validar`, { codigo, cantidad }))
    },

    /** Lotes viejos que quedaron atrás. Si no se liquidan, terminan en merma. */
    rezagados({ signal } = {}) {
        return pedir(http.get(`${RUTA}/rezagados`, { signal }))
    },

    porVencer(dias = 3, { signal } = {}) {
        return pedir(http.get(`${RUTA}/por-vencer`, { params: { dias }, signal }))
    },

    /** El balde aparte: no entra en el reparto automático, hay que escanearlo. */
    recuperados({ signal } = {}) {
        return pedir(http.get(`${RUTA}/recuperados`, { signal }))
    },

    costoPromedio({ signal } = {}) {
        return pedir(http.get(`${RUTA}/costo-promedio`, { signal }))
    },

    /** Lo único editable de un lote: las varas se mueven de otras formas. */
    actualizarUbicacion(id, ubicacion) {
        return pedir(http.patch(`${RUTA}/${id}/ubicacion`, { ubicacion }))
    },

    /* ---------------- Etiquetas ---------------- */

    /**
     * ASP.NET Core espera `ids=1&ids=2`. Axios, por defecto, serializa un
     * arreglo como `ids[]=1&ids[]=2`, que el binder ignora: el array llegaría
     * vacío sin ningún error. Por eso la query se arma a mano.
     */
    etiquetas(ids = [], { signal } = {}) {
        const query = new URLSearchParams()
        ids.forEach(id => query.append('ids', id))
        return pedir(http.get(`${RUTA}/etiquetas?${query.toString()}`, { signal }))
    },

    /** El flujo real: se imprimen al recibir la compra y se pegan antes de guardar. */
    etiquetasDeCompra(compraId, { signal } = {}) {
        return pedir(http.get(`${RUTA}/etiquetas/compra/${compraId}`, { signal }))
    },

    /**
     * PNG del QR.
     *
     * NO sirve poner la ruta directo en el src de un <img>: la etiqueta no
     * manda el header Authorization y el endpoint exige VerInventario, así
     * que la imagen saldría rota. Se trae como blob con el cliente
     * autenticado y se entrega una URL de objeto.
     *
     * Quien la use debe llamar a liberarQr() al desmontar: cincuenta
     * etiquetas sin revocar son cincuenta blobs retenidos en memoria.
     */
    async qr(codigo, { signal } = {}) {
        try {
            const { data } = await http.get(`${RUTA}/${encodeURIComponent(codigo)}/qr`, {
                responseType: 'blob',
                signal
            })
            return URL.createObjectURL(data)
        } catch (e) {
            throw normalizarError(e)
        }
    },

    liberarQr(url) {
        if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
    }
}