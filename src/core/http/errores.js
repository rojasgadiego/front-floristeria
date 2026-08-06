/**
 * core/http/errores.js
 * =========================================================================
 * Todo error de red o de API sale de acá como ApiError. Las vistas nunca
 * ven un AxiosError ni tienen que saber si el mensaje vino en `detail`
 * (ProblemDetails) o en `mensaje` (ApiResponse).
 * =========================================================================
 */

import axios from 'axios'

export class ApiError extends Error {
  constructor ({ mensaje, status = 0, codigo = 'desconocido', validacion = null, original = null }) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
    this.codigo = codigo
    this.validacion = validacion
    this.original = original
  }

  get esCancelado () { return this.codigo === 'cancelado' }
  get esDeRed () { return this.codigo === 'sin_conexion' }
  get esNoAutenticado () { return this.status === 401 }
  get esSinPermiso () { return this.status === 403 }
  get esDeNegocio () { return this.status === 400 || this.status === 409 }
}

const PORDEFECTO = {
  400: 'Los datos enviados no son válidos.',
  401: 'Tu sesión expiró. Ingresá de nuevo.',
  403: 'No tenés permiso para esta acción.',
  404: 'No se encontró lo que buscabas.',
  409: 'La operación choca con el estado actual del registro.',
  422: 'Los datos enviados no son válidos.',
  429: 'Demasiados intentos. Esperá un momento.',
  500: 'Error en el servidor. Intentá de nuevo en un momento.',
  503: 'El servicio no está disponible en este momento.'
}

/* ApiResponse trae `errores`; ProblemDetails de validación trae `errors`. */
function primerError (data) {
  const lista = data?.errores
  if (Array.isArray(lista) && lista.length) {
    return typeof lista[0] === 'string' ? lista[0] : lista[0]?.mensaje
  }

  const dict = data?.errors
  if (dict && typeof dict === 'object') {
    const primera = Object.values(dict).flat()[0]
    if (typeof primera === 'string') return primera
  }

  return null
}

export function normalizarError (error) {
  if (error instanceof ApiError) return error

  if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') {
    return new ApiError({ mensaje: 'Petición cancelada', codigo: 'cancelado', original: error })
  }

  if (error?.code === 'ECONNABORTED') {
    return new ApiError({
      mensaje: 'La operación tardó demasiado. Revisá tu conexión.',
      codigo: 'timeout',
      original: error
    })
  }

  if (!error?.response) {
    return new ApiError({
      mensaje: 'No se pudo conectar con el servidor.',
      codigo: 'sin_conexion',
      original: error
    })
  }

  const { status, data } = error.response

  /*
   * Orden a propósito: primero lo que el backend escribió pensando en el
   * usuario (`mensaje` de ApiResponse, `detail` de ProblemDetails), después
   * los errores de validación, y recién al final el texto genérico por
   * status. El `title` de ProblemDetails va casi último porque suele ser
   * "One or more validation errors occurred", que no le dice nada a nadie.
   */
  const mensaje =
    data?.mensaje ||
    data?.detail ||
    primerError(data) ||
    (typeof data === 'string' && data.trim()) ||
    PORDEFECTO[status] ||
    data?.title ||
    'Ocurrió un error inesperado.'

  return new ApiError({
    mensaje,
    status,
    codigo: data?.codigo || `http_${status}`,
    validacion: data?.errors || null,
    original: error
  })
}