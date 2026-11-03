/**
 * core/impresion/comprobanteDespacho.js
 * =========================================================================
 * El papel que se lleva el repartidor: a quién, dónde, qué y la tarjeta.
 * Sin precios: el que recibe suele no ser quien pagó.
 *
 * Imprime como la boleta en cada equipo: diálogo del navegador en el PC y
 * RawBT en el celular con térmica Bluetooth (ver impresora.js).
 * =========================================================================
 */

import { aBase64, despachoEscPos } from './escpos'
import { leerModo } from './impresora'

const ANCHO_MM = 80

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]))

export const fechaEntrega = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

function bloque (titulo, texto) {
  if (!texto) return ''
  return `<section><h2>${esc(titulo)}</h2><p>${esc(texto)}</p></section>`
}

function html (d) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Despacho ${esc(d.folio)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #fff; color: #000; }
  body { width: ${ANCHO_MM}mm; padding: 4mm; font: 13px/1.4 Arial, Helvetica, sans-serif; }
  h1 { margin: 0; font-size: 18px; text-align: center; }
  .cuando { margin: 4px 0 8px; text-align: center; font-size: 15px; font-weight: 700; }
  section { padding: 7px 0; border-top: 1px dashed #000; }
  h2 { margin: 0 0 2px; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; }
  p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  .grande { font-size: 15px; font-weight: 700; }
  footer { padding-top: 7px; border-top: 1px dashed #000; font-size: 11px; text-align: center; }
</style>
</head>
<body>
  <h1>DESPACHO</h1>
  <div class="cuando">${esc(fechaEntrega(d.fecha))}${d.hora ? ` · ${esc(d.hora)}` : ''}</div>
  <section>
    <h2>Recibe</h2>
    <p class="grande">${esc(d.recibe)}</p>
    <p>${esc(d.telefono)}</p>
  </section>
  ${bloque('Dirección', d.direccion)}
  ${bloque('Indicaciones', d.indicaciones)}
  ${bloque('Productos', d.productos)}
  ${bloque('Mensaje de la tarjeta', d.mensaje)}
  <footer>Boleta ${esc(d.folio)} · Atención #${esc(d.numeroAtencion)}</footer>
</body>
</html>`
}

/* En un iframe aislado, igual que la boleta: el documento contiene solo el
   comprobante y su @page sí se respeta. */
function imprimirEnNavegador (d) {
  const marco = document.createElement('iframe')
  marco.setAttribute('aria-hidden', 'true')
  marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(marco)

  const ventana = marco.contentWindow
  const doc = ventana.document
  doc.open()
  doc.write(html(d))
  doc.close()

  let quitado = false
  const quitar = () => {
    if (quitado) return
    quitado = true
    marco.remove()
  }
  ventana.addEventListener('afterprint', () => setTimeout(quitar, 100))
  setTimeout(quitar, 60_000)

  setTimeout(() => {
    const altoMm = Math.ceil(doc.body.scrollHeight * 25.4 / 96) + 2
    const pagina = doc.createElement('style')
    pagina.textContent = `@page { size: ${ANCHO_MM}mm ${altoMm}mm; margin: 0; }`
    doc.head.appendChild(pagina)
    ventana.focus()
    ventana.print()
  }, 50)
}

export function imprimirComprobante (despacho) {
  const modo = leerModo()
  if (modo.startsWith('rawbt')) {
    const ancho = modo === 'rawbt-58' ? 58 : 80
    window.location.href = `rawbt:base64,${aBase64(despachoEscPos(despacho, { ancho, fechaTexto: fechaEntrega(despacho.fecha) }))}`
    return
  }
  imprimirEnNavegador(despacho)
}
