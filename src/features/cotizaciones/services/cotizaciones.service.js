/**
 * features/cotizaciones/services/cotizaciones.service.js
 * =========================================================================
 * Presupuestos de eventos, sus abonos y su plan de pago. Todo el módulo es
 * de la política Caja; anular la cotización y anular un abono son de Admin.
 *
 * Cada abono registra una venta real: entra por caja, con folio y medio de
 * pago. Por eso registrar un pago necesita caja abierta.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'
import { aPagina } from '@/core/http/respuesta'
import { aDateOnly } from '@/core/utils/fechas'

const RUTA = '/cotizaciones'

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

export const cotizacionesService = {
    /** CotizacionFiltro: buscar, estado, clienteId, soloVencidas, proximosDias, desde, hasta */
    async listar(filtro = {}, { signal } = {}) {
        const params = limpiar({
            ...filtro,
            desde: filtro.desde ? aDateOnly(filtro.desde) : undefined,
            hasta: filtro.hasta ? aDateOnly(filtro.hasta) : undefined
        })
        return aPagina(await pedir(http.get(RUTA, { params, signal })))
    },

    /** CotizacionDetalleDto: líneas, pagos, cuotas, faltantes y resultado. */
    obtener(id, { signal } = {}) {
        return pedir(http.get(`${RUTA}/${id}`, { signal }))
    },

    /**
     * El precio de un producto de catálogo lo pone el servidor: un presupuesto
     * con precios inventados es una promesa que después no se puede cumplir.
     * Solo las líneas `aMedida` llevan precio propio.
     */
    crear(peticion) {
        return pedir(http.post(RUTA, peticion))
    },

    actualizar(id, peticion) {
        return pedir(http.put(`${RUTA}/${id}`, peticion))
    },

    /** Aprobar NO reserva inventario: solo lo pone en la agenda. */
    aprobar(id) {
        return pedir(http.patch(`${RUTA}/${id}/aprobar`))
    },

    /**
     * No toca los abonos recibidos: quedan como saldo a favor del cliente.
     * Si hay que devolverlos, se anulan esas boletas desde Ventas.
     */
    anular(id, motivo) {
        return pedir(http.post(`${RUTA}/${id}/anular`, { motivo }))
    },

    /* ---------------- Pagos ---------------- */

    /**
     * Genera una venta con línea de servicio en la caja abierta. El medio de
     * pago va en cada abono, no en la cotización: se puede abonar en efectivo
     * y pagar las cuotas con crédito.
     */
    registrarPago(id, { monto, medioPago, recibido = null, notas = null }) {
        return pedir(http.post(`${RUTA}/${id}/pagos`, { monto, medioPago, recibido, notas }))
    },

    /** Anula el abono y su boleta a la vez: si la plata se devuelve, la venta
        deja de existir y el arqueo de ese día cambia. */
    anularPago(id, pagoId, motivo) {
        return pedir(http.post(`${RUTA}/${id}/pagos/${pagoId}/anular`, { motivo }))
    },

    /* ---------------- Cuotas ---------------- */

    /**
     * Reemplaza el plan completo. Las cuotas deben sumar exactamente el saldo
     * pendiente. Lista vacía borra el plan: sin cuotas, el saldo vence el día
     * del evento.
     */
    guardarCuotas(id, cuotas) {
        return pedir(http.put(`${RUTA}/${id}/cuotas`, {
            cuotas: cuotas.map(c => ({
                monto: c.monto,
                vence: aDateOnly(c.vence),
                notas: c.notas || null
            }))
        }))
    },

    /** Reparte el saldo en cuotas iguales; el redondeo va en la primera. */
    generarCuotas(id, { cantidad = 3, primerVencimiento = null, cadaDias = 30 }) {
        return pedir(http.post(`${RUTA}/${id}/cuotas/generar`, {
            cantidad,
            primerVencimiento: primerVencimiento ? aDateOnly(primerVencimiento) : null,
            cadaDias
        }))
    },

    /* ---------------- Cobro ---------------- */

    /**
     * Prepara la boleta final. NO cobra: devuelve las líneas sugeridas, el
     * abono previo y el saldo. Para cerrar el evento hay que mandar esas
     * líneas —ajustadas si hace falta— a POST /ventas con cotizacionId.
     */
    prepararCobro(id, { signal } = {}) {
        return pedir(http.get(`${RUTA}/${id}/preparar-cobro`, { signal }))
    },

    /* ---------------- Seguimiento ---------------- */

    /** Del más atrasado al menos: es la lista de a quiénes llamar. */
    porCobrar({ signal } = {}) {
        return pedir(http.get(`${RUTA}/por-cobrar`, { signal }))
    },

    /** Lo que se mira para decidir cuánta flor comprar esta semana. */
    agenda(dias = 30, { signal } = {}) {
        return pedir(http.get(`${RUTA}/agenda`, { params: { dias }, signal }))
    }
}