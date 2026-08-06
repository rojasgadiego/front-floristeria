/**
 * core/utils/rut.js
 * =========================================================================
 * El backend valida el RUT con módulo 11. Replicarlo acá no lo reemplaza:
 * evita que alguien guarde, espere el viaje de ida y vuelta, y recién ahí
 * se entere de que se comió un dígito.
 * =========================================================================
 */

/** Deja solo dígitos y el verificador, en mayúscula. */
export const limpiarRut = (rut) =>
  String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase()

/** Calcula el dígito verificador de un cuerpo numérico. */
export function digitoVerificador (cuerpo) {
  let suma = 0
  let multiplo = 2

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }

  const resto = 11 - (suma % 11)
  if (resto === 11) return '0'
  if (resto === 10) return 'K'
  return String(resto)
}

/** Vacío se considera válido: el RUT del local es opcional. */
export function rutValido (rut) {
  const limpio = limpiarRut(rut)
  if (!limpio) return true
  if (limpio.length < 2) return false

  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)

  if (!/^\d+$/.test(cuerpo)) return false
  return digitoVerificador(cuerpo) === dv
}

/** 123456789 → 12.345.678-9 */
export function formatearRut (rut) {
  const limpio = limpiarRut(rut)
  if (limpio.length < 2) return limpio

  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`
}