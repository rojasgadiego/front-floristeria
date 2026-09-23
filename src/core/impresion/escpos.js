/**
 * core/impresion/escpos.js
 * =========================================================================
 * La boleta en ESC/POS: el idioma nativo de las impresoras térmicas de
 * tickets (Epson, Xprinter, Bixolon y compatibles).
 *
 * Existe para imprimir SIN el diálogo del navegador desde el celular: se
 * arman los bytes acá y se le pasan a RawBT, que los manda por Bluetooth.
 * El contenido es el mismo que TicketBoleta.vue muestra en pantalla.
 *
 * Texto en Windows-1252 (ESC t 16), que cubre las tildes y la ñ en la
 * mayoría de estas impresoras. Si alguna saca símbolos raros en vez de
 * tildes, es la tabla de caracteres: se cambia CODEPAGE.
 * =========================================================================
 */

const ESC = 0x1b
const GS = 0x1d
const LF = 0x0a

/* ESC t 16 = WPC1252 en Epson y la mayoría de los clones. */
const CODEPAGE = 16

/* Caracteres por línea con la fuente normal (Font A). */
export const COLUMNAS = { 80: 48, 58: 32 }

/* Lo que no existe en Windows-1252 se reemplaza por su pariente más cercano
   en vez de imprimir un "?". Los emoji se descartan. */
const REEMPLAZOS = {
  '−': '-', '–': '-', '—': '-',
  '‘': "'", '’': "'", '“': '"', '”': '"',
  '…': '...', ' ': ' ', ' ': ' '
}

const aBytes = (texto) => {
  const out = []
  for (const ch of String(texto ?? '')) {
    const r = REEMPLAZOS[ch]
    if (r) { for (const c of r) out.push(c.charCodeAt(0)); continue }
    const cp = ch.codePointAt(0)
    if (cp < 0x80 || (cp >= 0xa0 && cp <= 0xff)) out.push(cp)   // ASCII y Latin-1 = 1252
    else if (cp > 0xffff) continue                               // emoji: fuera
    else out.push(0x3f)                                          // "?"
  }
  return out
}

const clp = (n) => '$' + Math.round(n || 0).toLocaleString('es-CL')

const fecha = (iso) => (iso
  ? new Date(iso).toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      hour12: false
    })
  : '')

const MEDIOS = { efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito', transferencia: 'Transferencia' }

/**
 * Arma la boleta completa. `ticket` es lo que devuelve /api/ventas/{id}/ticket:
 * { venta, local, configuracion }. Devuelve un Uint8Array listo para enviar.
 */
export function boletaEscPos (ticket, { ancho = 80 } = {}) {
  const cols = COLUMNAS[ancho] || COLUMNAS[80]
  const v = ticket?.venta ?? {}
  const local = ticket?.local ?? {}
  const cfg = ticket?.configuracion ?? {}

  const b = []
  const cmd = (...xs) => b.push(...xs)
  const texto = (t) => b.push(...aBytes(t))
  const linea = (t = '') => { texto(t); b.push(LF) }

  const alinear = (n) => cmd(ESC, 0x61, n)          // 0 izq · 1 centro
  const negrita = (on) => cmd(ESC, 0x45, on ? 1 : 0)
  const tamano = (n) => cmd(GS, 0x21, n)            // 0x00 normal · 0x11 doble

  const separador = () => linea('-'.repeat(cols))

  /* Texto a la izquierda y monto a la derecha, en una línea del ancho justo.
     Si el nombre no cabe, se corta: el monto nunca se pierde. */
  const par = (izq, der) => {
    const d = String(der)
    const i = String(izq)
    const espacio = cols - d.length - 1
    const cabe = i.length > espacio ? i.slice(0, Math.max(espacio, 0)) : i
    linea(cabe + ' '.repeat(Math.max(cols - cabe.length - d.length, 1)) + d)
  }

  /* Parte un texto largo en líneas del ancho, sin cortar palabras. */
  const envolver = (t, ancho = cols) => {
    const palabras = String(t ?? '').split(/\s+/).filter(Boolean)
    const lineas = []
    let actual = ''
    for (const p of palabras) {
      if (!actual) actual = p
      else if ((actual + ' ' + p).length <= ancho) actual += ' ' + p
      else { lineas.push(actual); actual = p }
    }
    if (actual) lineas.push(actual)
    return lineas
  }

  /* ─── Inicio ─── */
  cmd(ESC, 0x40)                  // reset
  cmd(ESC, 0x74, CODEPAGE)        // tabla de caracteres

  /* ─── Encabezado del local ─── */
  alinear(1)
  negrita(true); tamano(0x11)
  envolver(local.nombre || 'Floristería', Math.floor(cols / 2)).forEach(linea)
  tamano(0); negrita(false)
  if (local.giro) envolver(local.giro).forEach(linea)
  if (local.direccion) {
    envolver(local.direccion + (local.comuna ? `, ${local.comuna}` : '')).forEach(linea)
  }
  if (local.telefono) linea(`WhatsApp ${local.telefono}`)
  if (local.rut) linea(`RUT ${local.rut}`)

  /* El número de atención es lo que se grita en el mesón: en grande. */
  linea()
  linea('TICKET DE ATENCION')
  negrita(true); tamano(0x11)
  linea(`#${v.numeroAtencion ?? ''}`)
  tamano(0); negrita(false)

  alinear(0)
  separador()
  par('Boleta', v.folio ?? '')
  par('Fecha', fecha(v.creadoEn))
  par('Atendió', v.usuario || '-')
  if (v.cliente) par('Cliente', v.cliente)
  separador()

  /* ─── Líneas ─── */
  /* El nombre largo sigue en la línea de abajo en vez de cortarse: el
     monto va siempre en la primera, a la derecha. */
  for (const i of v.items || []) {
    const monto = clp(i.subtotal)
    const [primera, ...resto] = envolver(`${i.cantidad}x ${i.nombre}`, cols - monto.length - 1)
    par(primera || '', monto)
    resto.forEach(l => linea(`   ${l}`))
    if (i.cantidad > 1) linea(`   ${clp(i.precioUnitario)} c/u`)
  }
  separador()

  /* ─── Totales ─── */
  if (v.descuentoPromo) par(v.promocion || 'Promoción', '-' + clp(v.descuentoPromo))
  if (v.descuentoManual) par('Descuento', '-' + clp(v.descuentoManual))
  if (v.descuentoCanje) par(`${v.puntosCanjeados} puntos`, '-' + clp(v.descuentoCanje))
  if (v.abonoPrevio) par('Abonado antes', '-' + clp(v.abonoPrevio))

  par('Neto', clp(v.neto))
  par(`IVA ${Number(v.ivaTasa || 0).toFixed(0)}%`, clp(v.ivaMonto))

  negrita(true); cmd(GS, 0x21, 0x01)       // doble alto: se lee de lejos
  par('TOTAL', clp(v.total))
  tamano(0); negrita(false)

  par(MEDIOS[v.medioPago] || v.medioPago || '', '')
  if (v.recibido) {
    par('Recibido', clp(v.recibido))
    par('Vuelto', clp(v.vuelto))
  }

  if (cfg.mostrarPuntos && v.puntosGanados) {
    separador()
    par('Puntos de esta compra', String(v.puntosGanados))
  }

  /* Una boleta anulada se imprime diciendo que lo está. */
  if (v.anulada) {
    separador()
    alinear(1)
    negrita(true); tamano(0x11)
    linea('ANULADA')
    tamano(0); negrita(false)
    if (v.motivoAnulacion) envolver(v.motivoAnulacion).forEach(linea)
    alinear(0)
  }

  /* ─── Pie ─── */
  separador()
  alinear(1)
  if (cfg.mensaje) { negrita(true); envolver(cfg.mensaje).forEach(linea); negrita(false) }
  if (cfg.leyenda) envolver(cfg.leyenda).forEach(linea)
  if (local.instagram) linea(local.instagram)

  /* Avance y corte: GS V 66 n avanza n líneas y corta (las que no tienen
     cuchilla lo ignoran). */
  cmd(ESC, 0x64, 3)
  cmd(GS, 0x56, 66, 0)

  return Uint8Array.from(b)
}

/** Base64 de los bytes, en tramos: con fromCharCode(...todo) una boleta
    larga revienta la pila del navegador. */
export function aBase64 (bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 4096) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 4096))
  }
  return btoa(bin)
}
