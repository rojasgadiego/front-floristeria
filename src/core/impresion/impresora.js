/**
 * core/impresion/impresora.js
 * =========================================================================
 * Cómo imprime la boleta ESTE equipo. Se guarda por equipo (localStorage)
 * porque el PC del mesón y el celular de un vendedor imprimen distinto:
 *
 *   navegador  → el diálogo de impresión. En el PC del mesón, con Chrome
 *                abierto con --kiosk-printing, sale directo a la térmica
 *                sin preguntar (ver scripts/POS-meson.bat).
 *   rawbt      → Android con impresora térmica Bluetooth: la boleta se
 *                arma en ESC/POS y se le pasa a la app RawBT, que la
 *                imprime al instante, sin diálogo.
 * =========================================================================
 */

import { boletaEscPos, aBase64 } from './escpos'

const CLAVE = 'colibri.impresion'

export const MODOS = [
  { valor: 'navegador', texto: 'Este equipo (PC / diálogo)' },
  { valor: 'rawbt-80', texto: 'Bluetooth 80mm (RawBT)' },
  { valor: 'rawbt-58', texto: 'Bluetooth 58mm (RawBT)' }
]

export const esAndroid = () => /android/i.test(navigator.userAgent || '')

export function leerModo () {
  try {
    const m = localStorage.getItem(CLAVE)
    if (MODOS.some(x => x.valor === m)) return m
  } catch {
    /* almacenamiento bloqueado: se usa el modo por defecto */
  }
  return 'navegador'
}

export function guardarModo (modo) {
  try {
    localStorage.setItem(CLAVE, modo)
  } catch {
    /* modo privado: vale solo para esta sesión */
  }
}

/**
 * Manda la boleta a RawBT, que la imprime por Bluetooth sin diálogo. Si la
 * app no está instalada, Android no tiene a quién entregar el enlace y no
 * pasa nada visible: la ayuda del modal explica qué instalar.
 */
export function imprimirConRawBT (ticket, { ancho = 80 } = {}) {
  const datos = aBase64(boletaEscPos(ticket, { ancho }))
  window.location.href = `rawbt:base64,${datos}`
}
