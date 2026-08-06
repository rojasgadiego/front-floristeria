/**
 * core/http/respuesta.js
 * =========================================================================
 * Desenvuelve ApiResponse<T> y normaliza Pagina<T>.
 *
 * Formas reales del backend:
 *   ApiResponse<T> → { exito, datos, mensaje, errores }
 *   Pagina<T>      → { items, total, pagina_, porPagina, totalPaginas }
 * =========================================================================
 */

export function esSobre (cuerpo) {
  return (
    cuerpo != null &&
    typeof cuerpo === 'object' &&
    !Array.isArray(cuerpo) &&
    'exito' in cuerpo &&
    'datos' in cuerpo
  )
}

export function desenvolver (cuerpo) {
  return esSobre(cuerpo) ? cuerpo.datos : cuerpo
}

/**
 * Pagina<T> se normaliza a { items, total, pagina, porPagina, totalPaginas }.
 *
 * Ojo con `Pagina_`: en C# lleva guion bajo porque la clase ya se llama
 * Pagina, y sale en el JSON como `pagina_`. Se renombra acá para que ese
 * detalle del backend no se filtre a las vistas.
 */
export function aPagina (respuesta) {
  if (Array.isArray(respuesta)) {
    return {
      items: respuesta,
      total: respuesta.length,
      pagina: 1,
      porPagina: respuesta.length,
      totalPaginas: 1
    }
  }

  const items = respuesta?.items ?? []

  return {
    items,
    total: respuesta?.total ?? items.length,
    pagina: respuesta?.pagina_ ?? respuesta?.pagina ?? 1,
    porPagina: respuesta?.porPagina ?? items.length,
    totalPaginas: respuesta?.totalPaginas ?? 1
  }
}