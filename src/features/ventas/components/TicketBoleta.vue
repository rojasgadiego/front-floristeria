<template>
  <div class="fondo" @click.self="cerrarModal">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="ticket-titulo">

      <!-- La cabecera es de la pantalla, no del papel: al imprimir se va. -->
      <div class="modal-cab no-imprimir">
        <div class="min0">
          <h3 id="ticket-titulo">Boleta {{ venta.folio }}</h3>
          <p>Atención #{{ venta.numeroAtencion }} · {{ formatFecha(venta.creadoEn) }}</p>
        </div>
        <button class="btn-icono" @click="cerrarModal" aria-label="Cerrar">✕</button>
      </div>

      <div class="modal-cuerpo">
        <!-- El papel con ancho de rollo térmico: se ve en pantalla igual que
             va a salir impreso, sin sorpresas al apretar imprimir. -->
        <div class="papel" ref="papel">
          <div class="cen">
            <div class="logo" aria-hidden="true">🌸</div>
            <h4>{{ local.nombre }}</h4>
            <div v-if="local.giro" class="chico">{{ local.giro }}</div>
            <div v-if="local.direccion" class="chico">
              {{ local.direccion }}<template v-if="local.comuna">, {{ local.comuna }}</template>
            </div>
            <div v-if="local.telefono" class="chico">WhatsApp {{ local.telefono }}</div>
            <div v-if="local.rut" class="chico">RUT {{ local.rut }}</div>

            <!-- El número de atención es lo único que se lee a un metro: es
                 lo que se grita cuando el pedido está listo. -->
            <div class="atencion">
              <span class="chico">TICKET DE ATENCIÓN</span>
              <b>#{{ venta.numeroAtencion }}</b>
            </div>
          </div>

          <div class="sep"></div>

          <div class="dato-linea"><span>Boleta</span><span>{{ venta.folio }}</span></div>
          <div class="dato-linea"><span>Fecha</span><span>{{ formatFecha(venta.creadoEn) }}</span></div>
          <div class="dato-linea"><span>Atendió</span><span>{{ venta.usuario || '—' }}</span></div>
          <div v-if="venta.cliente" class="dato-linea">
            <span>Cliente</span><span>{{ venta.cliente }}</span>
          </div>

          <div class="sep"></div>

          <table class="items">
            <tbody>
              <tr v-for="i in venta.items" :key="i.id">
                <td class="cant">{{ i.cantidad }}×</td>
                <td class="nom">
                  {{ i.nombre }}
                  <div v-if="i.cantidad > 1" class="unit">{{ moneda(i.precioUnitario) }} c/u</div>
                </td>
                <td class="der">{{ moneda(i.subtotal) }}</td>
              </tr>
            </tbody>
          </table>

          <div class="sep"></div>

          <div v-if="venta.descuentoPromo" class="tot">
            <span>{{ venta.promocion || 'Promoción' }}</span>
            <span>−{{ moneda(venta.descuentoPromo) }}</span>
          </div>
          <div v-if="venta.descuentoManual" class="tot">
            <span>Descuento</span><span>−{{ moneda(venta.descuentoManual) }}</span>
          </div>
          <div v-if="venta.descuentoCanje" class="tot">
            <span>{{ venta.puntosCanjeados }} puntos</span>
            <span>−{{ moneda(venta.descuentoCanje) }}</span>
          </div>

          <div class="tot"><span>Neto</span><span>{{ moneda(venta.neto) }}</span></div>
          <div class="tot">
            <span>IVA {{ Number(venta.ivaTasa).toFixed(0) }}%</span>
            <span>{{ moneda(venta.ivaMonto) }}</span>
          </div>

          <div class="tot grande"><span>TOTAL</span><span>{{ moneda(venta.total) }}</span></div>

          <div class="tot"><span>{{ textoMedio(venta.medioPago) }}</span><span></span></div>

          <template v-if="venta.recibido">
            <div class="tot"><span>Recibido</span><span>{{ moneda(venta.recibido) }}</span></div>
            <div class="tot"><span>Vuelto</span><span>{{ moneda(venta.vuelto) }}</span></div>
          </template>

          <template v-if="configuracion.mostrarPuntos && venta.puntosGanados">
            <div class="sep"></div>
            <div class="tot chico">
              <span>Puntos de esta compra</span><span>{{ venta.puntosGanados }}</span>
            </div>
          </template>

          <!-- Una boleta anulada se imprime diciendo que lo está: si alguien
               guardó el papel, el papel tiene que decir la verdad. -->
          <template v-if="venta.anulada">
            <div class="sep"></div>
            <div class="cen sello">ANULADA</div>
            <div class="cen chico">{{ venta.motivoAnulacion }}</div>
          </template>

          <div class="sep"></div>

          <div class="cen chico pie-papel">
            <b v-if="configuracion.mensaje">{{ configuracion.mensaje }}</b>
            <template v-if="configuracion.mensaje && configuracion.leyenda"><br></template>
            <span v-if="configuracion.leyenda">{{ configuracion.leyenda }}</span>
            <template v-if="local.instagram"><br>{{ local.instagram }}</template>
          </div>
        </div>
      </div>

      <div class="modal-pie no-imprimir">
        <button class="btn btn-linea" @click="cerrarModal">Listo</button>
        <button class="btn" @click="imprimir">🖨️ Imprimir</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

const MEDIOS = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia'
}

export default {
  name: 'TicketBoleta',
  props: {
    /* Lo que devuelve /api/ventas/{id}/ticket, ya desenvuelto por el
       interceptor: { venta, local, configuracion }. */
    ticket: { type: Object, required: true }
  },
  emits: ['cerrar'],

  setup (props, { emit }) {
    const venta = computed(() => props.ticket?.venta ?? {})

    /* Los datos del local salen de la configuración, no de constantes: el
       día que cambie el teléfono, cambia en la base y sale impreso sin
       tocar código. */
    const local = computed(() => props.ticket?.local ?? {})
    const configuracion = computed(() => props.ticket?.configuracion ?? {})

    /* El nodo del papel: es lo único que se copia al imprimir. */
    const papel = ref(null)

    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })

    /* maximumFractionDigits en 0: sin eso, Intl con CLP muestra $9.960,00 y
       esos dos ceros en cada línea del ticket son ruido. */
    const moneda = (n) => fmt.format(Math.round(n || 0))

    const formatFecha = (iso) => (iso
      ? new Date(iso).toLocaleString('es-CL', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      : '—')

    const textoMedio = (m) => MEDIOS[m] ?? m

    /**
     * Imprime en un iframe aislado en vez de con window.print() directo.
     *
     * Ocultar el resto de la aplicación con CSS obliga a enumerar cada
     * contenedor de cada vista, y siempre queda uno afuera: basta una
     * pantalla nueva para que la boleta salga con la lista de ventas
     * detrás. Acá el documento contiene SOLO el ticket, así que no hay
     * nada que esconder.
     *
     * Y el @page de 80mm sí se respeta: es el documento raíz del iframe,
     * no una regla dentro de un componente.
     */
    const imprimir = () => {
      const contenido = papel.value?.innerHTML
      if (!contenido) return

      const marco = document.createElement('iframe')
      marco.setAttribute('aria-hidden', 'true')
      marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
      document.body.appendChild(marco)

      const doc = marco.contentWindow.document
      doc.open()
      doc.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${venta.value.folio ?? 'Boleta'}</title>
<style>
  /* Rollo térmico de 80mm, el estándar en punto de venta. Si la
     impresora es de 58mm, cambiar los dos números. */
  @page { size: 80mm auto; margin: 3mm; }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    width: 74mm;
    /* Monoespaciada: las columnas de precios se alinean solas, que es
       lo que hace legible un ticket angosto. */
    font-family: "Courier New", Courier, monospace;
    font-size: 9pt;
    line-height: 1.45;
    color: #000;
    background: #fff;
  }

  .cen { text-align: center; }
  .der { text-align: right; }
  .chico { font-size: 7.5pt; }

  .logo { font-size: 16pt; line-height: 1.2; }

  h4 {
    font-size: 11pt;
    font-weight: 700;
    margin: 3px 0 2px;
    letter-spacing: .02em;
  }

  .atencion {
    margin-top: 8px;
    padding: 5px;
    border: 1px dashed #000;
  }

  /* Lo único que se lee a un metro: es lo que se grita en el mesón. */
  .atencion b { display: block; font-size: 20pt; line-height: 1.15; }

  .sep { border-top: 1px dashed #000; margin: 7px 0; }

  .dato-linea, .tot {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  .items { width: 100%; border-collapse: collapse; }
  .items td { padding: 2px 0; vertical-align: top; }
  .cant { width: 2.6em; font-weight: 700; }
  .nom { padding-right: 6px; }
  .unit { font-size: 7pt; }

  .tot.grande {
    font-size: 12pt;
    font-weight: 700;
    margin: 5px 0;
    padding: 5px 0;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
  }

  .sello {
    font-size: 13pt;
    font-weight: 700;
    letter-spacing: .3em;
    border: 2px solid #000;
    padding: 4px;
    margin: 6px 0;
  }

  .pie-papel { line-height: 1.6; }

  /* El ticket no se parte en dos hojas. */
  body, .items, .items tr { page-break-inside: avoid; }
</style>
</head>
<body>${contenido}</body>
</html>`)
      doc.close()

      /* onload en vez de llamar directo: sin esto Chrome imprime el
         documento antes de aplicar los estilos, y sale en Times New Roman
         a ancho carta. */
      marco.onload = () => {
        marco.contentWindow.focus()
        marco.contentWindow.print()

        /* El iframe se saca después de que el diálogo se cierra. Un
           segundo alcanza; quitarlo antes cancela la impresión en
           Firefox. */
        setTimeout(() => marco.remove(), 1000)
      }
    }

    /* El emit sale del contexto: en setup no hay `this`, y usarlo deja el
       botón de cerrar muerto sin ningún error visible. */
    const cerrarModal = () => emit('cerrar')

    return {
      Number,
      papel,
      venta, local, configuracion,
      moneda, formatFecha, textoMedio, imprimir, cerrarModal
    }
  }
}
</script>

<style scoped>
.fondo {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--overlay);
}

.modal {
  width: 100%;
  max-width: 380px;
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.min0 {
  min-width: 0;
}

.modal-cab {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.modal-cab h3 {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
}

.modal-cab p {
  font-size: .8rem;
  color: var(--text-muted);
  margin-top: 3px;
}

.modal-cuerpo {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
  /* Fondo distinto al papel: da la sensación de que el ticket está
     apoyado, no de que es la pantalla entera. */
  background: var(--bg);
}

.modal-pie {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}

.modal-pie .btn {
  flex: 1;
}

/* ─── El papel ─── */

.papel {
  max-width: 300px;
  margin: 0 auto;
  padding: 18px 16px;
  background: var(--surface);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-sm);
  font-family: var(--font-mono);
  font-size: .76rem;
  line-height: 1.5;
  color: var(--text);
}

.cen {
  text-align: center;
}

.der {
  text-align: right;
}

.chico {
  font-size: .68rem;
}

.logo {
  font-size: 1.7rem;
  line-height: 1.2;
}

.papel h4 {
  font-size: .92rem;
  font-weight: 700;
  margin: 4px 0 3px;
  letter-spacing: .02em;
}

.atencion {
  margin-top: 12px;
  padding: 8px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-sm);
}

/* Lo único que se lee a un metro de distancia. */
.atencion b {
  display: block;
  font-size: 1.8rem;
  line-height: 1.15;
  letter-spacing: -.02em;
}

.sep {
  border-top: 1px dashed var(--border-strong);
  margin: 10px 0;
}

.dato-linea,
.tot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.dato-linea span:first-child {
  color: var(--text-muted);
}

.items {
  width: 100%;
  border-collapse: collapse;
}

.items td {
  padding: 3px 0;
  vertical-align: top;
  border: 0;
}

.cant {
  width: 2.6em;
  font-weight: 700;
}

.nom {
  padding-right: 8px;
}

.unit {
  font-size: .66rem;
  color: var(--text-faint);
}

.items .der {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.tot {
  font-variant-numeric: tabular-nums;
}

.tot.grande {
  font-size: 1rem;
  font-weight: 700;
  margin: 7px 0;
  padding: 7px 0;
  border-top: 1px solid var(--border-strong);
  border-bottom: 1px solid var(--border-strong);
}

.sello {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: .3em;
  color: var(--danger);
  border: 2px solid var(--danger);
  padding: 5px;
  margin: 8px 0;
}

.pie-papel {
  line-height: 1.6;
}

/* ─── Botones ─── */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: .65rem 1.15rem;
  border: none;
  border-radius: var(--r-sm);
  background: var(--accent);
  color: var(--accent-contrast);
  font: inherit;
  font-size: .92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--t-fast);
}

.btn:hover {
  background: var(--accent-hover);
}

.btn-linea {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.btn-linea:hover {
  background: var(--surface-2);
  color: var(--text);
}

.btn-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  cursor: pointer;
  transition: border-color var(--t-fast), color var(--t-fast);
}

.btn-icono:hover {
  border-color: var(--danger);
  color: var(--danger);
}

/* ─── Móvil ─── */

@media (max-width: 480px) {
  .fondo {
    padding: 0;
    align-items: flex-end;
  }

  /* A pantalla completa desde abajo: en un teléfono, un modal flotante con
     márgenes desperdicia el alto que el ticket necesita. */
  .modal {
    max-width: none;
    max-height: 100dvh;
    height: 100dvh;
    border: none;
    border-radius: 0;
  }

  .modal-pie {
    padding-bottom: calc(14px + env(safe-area-inset-bottom, 0));
  }
}
</style>