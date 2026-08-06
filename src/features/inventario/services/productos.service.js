/**
 * features/inventario/services/productos.service.js
 * =========================================================================
 * Catálogo, recetas y movimientos de stock. Consultar es de VerInventario;
 * modificar, de Admin y Bodega; eliminar definitivo, solo de Admin.
 * =========================================================================
 */

import { http } from '@/core/http/client'
import { normalizarError } from '@/core/http/errores'
import { aPagina } from '@/core/http/respuesta'

const RUTA = '/productos'

async function pedir(promesa) {
    try {
        const { data } = await promesa
        return data
    } catch (e) {
        throw normalizarError(e)
    }
}

/* Conserva `false`: en bajoMinimo y controlaLotes significa algo distinto
   de "sin filtro". */
const limpiar = (obj) =>
    Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '')
    )

export const productosService = {
    /** ProductoFiltro: buscar, tipo, categoriaId, activo, bajoMinimo, controlaLotes */
    async listar(filtro = {}, { signal } = {}) {
        return aPagina(await pedir(http.get(RUTA, { params: limpiar(filtro), signal })))
    },

    /** ProductoDetalleDto: incluye receta y, en los simples, en qué ramos se usa. */
    obtener(id, { signal } = {}) {
        return pedir(http.get(`${RUTA}/${id}`, { signal }))
    },

    /** Por código de barras, para el punto de venta. */
    porCodigo(codigo, { signal } = {}) {
        return pedir(http.get(`${RUTA}/codigo/${encodeURIComponent(codigo)}`, { signal }))
    },

    /**
     * Un simple necesita costo; un armado necesita receta. Si controla lotes,
     * el stock inicial se ignora: las existencias entran recibiendo una compra,
     * que es lo que genera el lote con su procedencia y su vencimiento.
     */
    crear(peticion) {
        return pedir(http.post(RUTA, peticion))
    },

    /** El tipo y el stock no se tocan acá: uno es inmutable, el otro se mueve. */
    actualizar(id, peticion) {
        return pedir(http.put(`${RUTA}/${id}`, peticion))
    },

    activar(id) {
        return pedir(http.patch(`${RUTA}/${id}/activar`))
    },

    /* Se rechaza si el producto es ingrediente de algún ramo. */
    desactivar(id) {
        return pedir(http.patch(`${RUTA}/${id}/desactivar`))
    },

    /* Solo para productos creados por error: con movimientos, ventas o lotes
       se rechaza. Devuelve 204. */
    eliminar(id) {
        return pedir(http.delete(`${RUTA}/${id}`))
    },

    /* ---------------- Recetas ---------------- */

    receta(id, { signal } = {}) {
        return pedir(http.get(`${RUTA}/${id}/receta`, { signal }))
    },

    /**
     * Reemplaza la receta completa. Solo acepta productos simples como
     * ingredientes: no puede haber ramos dentro de ramos.
     */
    guardarReceta(id, ingredientes) {
        return pedir(http.put(`${RUTA}/${id}/receta`, { ingredientes }))
    },

    /* ---------------- Movimientos ---------------- */

    /**
     * Ajuste manual. Solo para productos SIN control por lote: jarrones,
     * papel, tarjetas. En una flor las existencias pertenecen a un lote
     * concreto, y sumar unidades sueltas dejaría stock sin procedencia ni
     * vencimiento.
     */
    ajustarStock(id, { cantidad, motivo, detalle = null }) {
        return pedir(http.post(`${RUTA}/${id}/ajustar-stock`, { cantidad, motivo, detalle }))
    },

    /**
     * Qué se puede armar hoy y con qué. Separa lo que alcanza con flor de
     * primera de lo que alcanzaría usando también la recuperada, y sugiere
     * qué lotes cubrirían el faltante.
     */
    disponibilidadArmado(id, cantidad = 1, { signal } = {}) {
        return pedir(http.get(`${RUTA}/${id}/disponibilidad-armado`, {
            params: { cantidad }, signal
        }))
    },

    /**
     * Los ingredientes con lote se consumen por FIFO. `lotesAutorizados`
     * habilita flor recuperada, que de otro modo queda fuera del reparto:
     * se consume primero y abarata la producción.
     */
    armar(id, { cantidad, lotesAutorizados = [] }) {
        return pedir(http.post(`${RUTA}/${id}/armar`, { cantidad, lotesAutorizados }))
    }
}