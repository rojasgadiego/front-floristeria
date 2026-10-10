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
     * Un reporte: una cosa (puntual) o varias (incidente), con 1 a 3 fotos
     * en base64. El costo lo pone el sistema y se congela al registrar.
     */
    registrarReporte(peticion) {
        return pedir(http.post(`${RUTA}/reportes`, peticion))
    },

    /** Solo quien lo registró, dentro de 10 minutos. */
    deshacer(reporteId) {
        return pedir(http.post(`${RUTA}/reportes/${reporteId}/deshacer`))
    },

    /** Reportes que la administración todavía no revisa. */
    pendientes({ signal } = {}) {
        return pedir(http.get(`${RUTA}/revision`, { signal }))
    },

    marcarRevisado(reporteId, nota = null) {
        return pedir(http.post(`${RUTA}/reportes/${reporteId}/revisado`, { nota }))
    },

    /** Las fotos de un reporte, sin los bytes. */
    evidencias(reporteId, { signal } = {}) {
        return pedir(http.get(`${RUTA}/reportes/${reporteId}/evidencias`, { signal }))
    },

    /**
     * La foto como Blob. No va directo en un <img src>: la ruta pide la
     * sesión, y una etiqueta <img> no manda el token.
     */
    evidenciaBlob(id, { signal } = {}) {
        return pedir(http.get(`${RUTA}/evidencias/${id}`, { responseType: 'blob', signal }))
    },

    /**
     * Manda a la administración un código para autorizar una merma sobre el
     * umbral. Solo sirve en esta sesión. `valor` va en el correo para que
     * quien lo dicta sepa qué aprueba.
     */
    solicitarCodigo(valor) {
        return pedir(http.post(`${RUTA}/solicitar-codigo`, { valor }))
    },

    /** Da de baja el lote con lo que le quede. Es el destino de los rezagados. */
    descartarLote(loteId, { motivo, detalle = null, esDevolucionProveedor = false }) {
        return pedir(http.post(`${RUTA}/lote/${loteId}/descartar`, {
            motivo, detalle, esDevolucionProveedor
        }))
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
     * la receta: cada vara tiene que tener un destino. Sobre el umbral
     * necesita `autorizacion` ({ codigo } que la administración recibió por correo),
     * igual que una merma suelta.
     */
    desarmar(productoId, { cantidad, motivo, detalle = null, lineas, fotos, autorizacion = null }) {
        return pedir(http.post(`${RUTA}/desarme/${productoId}`, {
            cantidad, motivo, detalle, lineas, fotos, autorizacion
        }))
    },

    /* ---------------- Escaneo y control ---------------- */

    /**
     * Lee un lote o una partida (el código o el QR completo). 200 aunque no
     * se pueda mermar: viene `puedeMermar` y el porqué. 404 si no existe.
     */
    escanear(codigo, { signal } = {}) {
        return pedir(http.get(`${RUTA}/escanear/${encodeURIComponent(codigo)}`, { signal }))
    },

    /** Desde cuánto una merma necesita la firma de una administradora. */
    umbral({ signal } = {}) {
        return pedir(http.get(`${RUTA}/umbral`, { signal }))
    },

    /** Quién merma sin escanear, a qué hora, y las registradas a mano. Solo admin. */
    patrones({ desde, hasta } = {}, { signal } = {}) {
        const params = limpiar({
            desde: desde ? aDateOnly(desde) : undefined,
            hasta: hasta ? aDateOnly(hasta) : undefined
        })
        return pedir(http.get(`${RUTA}/patrones`, { params, signal }))
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
     * El catálogo de motivos. Se ofrecen en un select en vez de dejar el
     * campo libre: "marchita", "Marchita" y "se marchitó" serían tres
     * categorías distintas en el reporte. `todos` incluye los apagados; la
     * API solo lo respeta para una administradora.
     */
    motivos({ todos = false, signal } = {}) {
        return pedir(http.get(`${RUTA}/motivos`, { params: todos ? { todos } : undefined, signal }))
    },

    /** { nombre, categoria, requiereDetalle, destinoSugerido } */
    crearMotivo(motivo) {
        return pedir(http.post(`${RUTA}/motivos`, motivo))
    },

    /** Igual que crear, más `activo` y `orden`. Lo ya registrado no cambia. */
    actualizarMotivo(id, motivo) {
        return pedir(http.put(`${RUTA}/motivos/${id}`, motivo))
    }
}