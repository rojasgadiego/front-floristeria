<template>
  <div class="ventas">
    <header class="cabecera">
      <h1>Ventas y caja</h1>
      <!-- <p class="ayuda">
        Qué se vendió y cómo cerró cada turno. Anular una boleta devuelve al
        inventario exactamente lo que sacó, lote por lote.
      </p> -->
    </header>

    <nav class="pestanas">
      <button :class="{ on: pestana === 'boletas' }" @click="pestana = 'boletas'">Boletas</button>
      <button :class="{ on: pestana === 'turnos' }" @click="irATurnos">Turnos de caja</button>
    </nav>

    <div v-if="error" class="banda banda-error">
      <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      <button class="btn btn-mini" @click="recargar">Reintentar</button>
    </div>

    <!-- ═══════════════ BOLETAS ═══════════════ -->
    <template v-if="pestana === 'boletas'">
      <!-- CAMBIO 1: buscador separado de filtros secundarios, alturas homogéneas -->
      <div class="filtros">
        <div class="buscador">
          <input v-model="busqueda" placeholder="Folio, cliente o RUT…" aria-label="Buscar boleta">
          <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
        </div>

        <select class="campo corto" :value="filtro.medioPago ?? ''"
          @change="filtrar({ medioPago: $event.target.value || null })" aria-label="Medio de pago">
          <option value="">Todos los medios</option>
          <option v-for="m in MEDIOS_PAGO" :key="m.valor" :value="m.valor">{{ m.texto }}</option>
        </select>

        <label class="campo-fecha">
          <span>Desde</span>
          <input type="date" :value="filtro.desde ?? ''" @change="filtrar({ desde: $event.target.value || null })">
        </label>

        <label class="campo-fecha">
          <span>Hasta</span>
          <input type="date" :value="filtro.hasta ?? ''" @change="filtrar({ hasta: $event.target.value || null })">
        </label>

        <label class="check">
          <input type="checkbox" :checked="filtro.incluirAnuladas"
            @change="filtrar({ incluirAnuladas: $event.target.checked })">
          <span>Ver anuladas</span>
        </label>
      </div>


      <!-- Un vendedor solo ve sus boletas: el servidor lo decide desde el
           token y este filtro ni siquiera se le muestra. -->
      <div v-if="esAdmin && resumen" class="tiras">
        <div class="tira">
          <span class="rot">{{ resumen.boletas }} boleta(s)</span>
          <b class="dato">{{ clp(resumen.total) }}</b>
        </div>
        <div v-if="resumen.descuentos" class="tira">
          <span class="rot">Descuentos</span>
          <b class="dato">−{{ clp(resumen.descuentos) }}</b>
        </div>
        <div v-if="resumen.anuladas" class="tira alerta">
          <span class="rot">Anuladas</span>
          <b class="dato">{{ resumen.anuladas }}</b>
        </div>
      </div>

      <div v-if="cargando && !ventas.length" class="vacio">Cargando boletas…</div>

      <div v-else-if="!ventas.length" class="vacio">
        <strong>{{ hayFiltro ? 'Ninguna boleta coincide' : 'Sin ventas todavía' }}</strong>
        {{ hayFiltro ? 'Prueba con otro texto o quita los filtros.' : 'Las boletas aparecen acá al cobrar.' }}
      </div>

      <div v-else class="tabla-envoltura" :class="{ atenuada: cargando }">
        <table>
          <caption class="sr-only">Listado de boletas de venta</caption>
          <thead>
            <tr>
              <th class="izq">Folio</th>
              <th class="izq">Fecha</th>
              <th class="izq">Vendedor</th>
              <th class="izq">Cliente</th>
              <th class="izq">Pago</th>
              <th>Descuentos</th>
              <th>Total</th>
              <th class="acciones-col"></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="v in ventas" :key="v.id">
              <!-- CAMBIO 3: fila accesible por teclado -->
              <tr class="fila" :class="{ anulada: v.anulada, abierta: detalleId === v.id }" tabindex="0" role="button"
                :aria-expanded="detalleId === v.id" @click="alternarDetalle(v.id)"
                @keydown.enter.prevent="alternarDetalle(v.id)" @keydown.space.prevent="alternarDetalle(v.id)">

                <td data-label="Folio" class="izq">
                  <div class="folio">{{ v.folio }}</div>
                  <div class="desglose">
                    #{{ v.numeroAtencion }} · {{ v.lineas }} línea(s)
                    <span v-if="v.anulada" class="etiqueta et-roja">anulada</span>
                  </div>
                </td>

                <!-- La API devuelve creadoEn, no fecha: es el momento exacto
                     del cobro, con hora. -->
                <td data-label="Fecha" class="izq suave">
                  <div>{{ fecha(v.creadoEn) }}</div>
                  <div class="desglose">{{ hora(v.creadoEn) }}</div>
                </td>

                <td data-label="Vendedor" class="izq suave">{{ v.usuario || '—' }}</td>

                <td data-label="Cliente" class="izq suave">
                  <span v-if="v.cliente">{{ v.cliente }}</span>
                  <span v-else class="tenue">sin ficha</span>
                </td>

                <td data-label="Pago" class="izq">
                  <span class="chip" :class="'pago-' + v.medioPago">
                    {{ textoMedioPago(v.medioPago) }}
                  </span>
                </td>

                <td data-label="Descuentos" class="der">
                  <span v-if="v.descuentoTotal" class="dato verde">−{{ clp(v.descuentoTotal) }}</span>
                  <span v-else class="tenue">—</span>
                </td>

                <td data-label="Total" class="der dato grande">{{ clp(v.total) }}</td>

                <td class="acciones-col der">
                  <span class="flecha" :class="{ girada: detalleId === v.id }" aria-hidden="true">›</span>
                </td>
              </tr>

              <!-- ═══ Detalle ═══ -->
              <tr v-if="detalleId === v.id" class="fila-detalle">
                <td :colspan="8">
                  <div v-if="cargandoDetalle" class="cargando">Cargando detalle…</div>

                  <div v-else-if="detalle" class="detalle">
                    <div class="detalle-cols">

                      <!-- Lo que se vendió -->
                      <section>
                        <h4>Qué se vendió</h4>
                        <div v-for="i in detalle.items" :key="i.id" class="item">
                          <span class="emoji" aria-hidden="true">{{ i.emoji }}</span>
                          <div class="min0">
                            <div class="item-nombre">{{ i.nombre }}</div>
                            <div class="desglose">{{ i.cantidad }} × {{ clp(i.precioUnitario) }}</div>
                          </div>
                          <b class="dato">{{ clp(i.subtotal) }}</b>
                        </div>
                      </section>

                      <!-- De dónde salió -->
                      <!-- Es lo que hace posible anular devolviendo las varas
                           al balde exacto, y lo que dice cuánto se ganó de
                           verdad: el costo real, no el de ficha. -->
                      <section v-if="detalle.consumos?.length">
                        <h4>De qué lote salió</h4>
                        <div v-for="c in detalle.consumos" :key="c.id" class="item">
                          <div class="min0">
                            <div class="item-nombre">{{ c.producto }}</div>
                            <div class="desglose">
                              <span v-if="c.loteCodigo" class="mono">{{ c.loteCodigo }}</span>
                              <span v-else class="tenue">armado en local</span>
                              · {{ c.cantidad }} × {{ clp(c.costoUnitario) }}
                            </div>
                          </div>
                          <b class="dato suave">{{ clp(c.costoTotal) }}</b>
                        </div>
                      </section>

                      <!-- Los números -->
                      <section class="numeros">
                        <h4>Totales</h4>
                        <div class="fila-num"><span>Bruto</span><b class="dato">{{ clp(detalle.bruto) }}</b></div>

                        <div v-if="detalle.descuentoPromo" class="fila-num verde">
                          <span>{{ detalle.promocion || 'Promoción' }}</span>
                          <b class="dato">−{{ clp(detalle.descuentoPromo) }}</b>
                        </div>

                        <div v-if="detalle.descuentoManual" class="fila-num verde">
                          <span>
                            A mano
                            <span v-if="detalle.autorizadoPor" class="desglose">
                              · autorizó {{ detalle.autorizadoPor }}
                            </span>
                          </span>
                          <b class="dato">−{{ clp(detalle.descuentoManual) }}</b>
                        </div>

                        <div v-if="detalle.descuentoCanje" class="fila-num verde">
                          <span>{{ detalle.puntosCanjeados }} puntos</span>
                          <b class="dato">−{{ clp(detalle.descuentoCanje) }}</b>
                        </div>

                        <div class="fila-num"><span>Neto</span><b class="dato">{{ clp(detalle.neto) }}</b></div>
                        <div class="fila-num">
                          <span>IVA {{ detalle.ivaTasa }}%</span>
                          <b class="dato">{{ clp(detalle.ivaMonto) }}</b>
                        </div>

                        <div class="fila-num total">
                          <span>Total</span><b class="dato">{{ clp(detalle.total) }}</b>
                        </div>

                        <template v-if="detalle.recibido">
                          <div class="fila-num"><span>Recibido</span><b class="dato">{{ clp(detalle.recibido) }}</b>
                          </div>
                          <div class="fila-num"><span>Vuelto</span><b class="dato">{{ clp(detalle.vuelto) }}</b></div>
                        </template>

                        <!-- El margen sale de los consumos: lo que realmente
                             valían las varas que salieron de la cámara, no el
                             costo que dice la ficha del producto. -->
                        <div v-if="esAdmin && detalle.margen != null" class="fila-num margen">
                          <span>Margen real</span>
                          <b class="dato" :class="detalle.margen < 25 ? 'rojo' : 'verde'">
                            {{ Number(detalle.margen).toFixed(0) }}%
                          </b>
                        </div>
                      </section>
                    </div>

                    <div v-if="detalle.anulada" class="banda banda-error">
                      <span aria-hidden="true">🚫</span>
                      <span>
                        Anulada por <b>{{ detalle.anulador }}</b> el {{ fecha(detalle.anuladaEn) }}
                        · {{ detalle.motivoAnulacion }}
                      </span>
                    </div>

                    <div class="detalle-pie">
                      <button class="btn btn-linea btn-mini" @click.stop="verTicket(v.id)">
                        🧾 Ver ticket
                      </button>
                      <button v-if="esAdmin && !detalle.anulada" class="btn btn-linea btn-mini peligro"
                        @click.stop="abrirAnulacion(detalle)">
                        Anular boleta
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <p v-if="totalPaginas > 1" class="paginador">
        <button class="btn btn-linea btn-mini" :disabled="filtro.pagina <= 1"
          @click="filtrar({ pagina: filtro.pagina - 1 })">Anterior</button>
        <span class="mini suave">Página {{ filtro.pagina }} de {{ totalPaginas }} · {{ total }} boletas</span>
        <button class="btn btn-linea btn-mini" :disabled="filtro.pagina >= totalPaginas"
          @click="filtrar({ pagina: filtro.pagina + 1 })">Siguiente</button>
      </p>
    </template>

    <!-- ═══════════════ TURNOS ═══════════════ -->
    <template v-else>
      <div v-if="cargandoCaja && !turnos.length" class="vacio">Cargando turnos…</div>

      <div v-else-if="!turnos.length" class="vacio">
        <strong>Sin turnos registrados</strong>
        Los turnos aparecen acá al cerrarse.
      </div>

      <div v-else class="tabla-envoltura">
        <table>
          <caption class="sr-only">Historial de turnos de caja</caption>
          <thead>
            <tr>
              <th class="izq">Turno</th>
              <th class="izq">Responsable</th>
              <th>Boletas</th>
              <th>Vendido</th>
              <th>Efectivo</th>
              <th>Otros medios</th>
              <th>Diferencia</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in turnos" :key="c.id" class="fila-turno">
              <td data-label="Turno" class="izq">
                <div class="folio">{{ fecha(c.abiertaEn) }}</div>
                <div class="desglose">
                  {{ hora(c.abiertaEn) }} — {{ c.cerradaEn ? hora(c.cerradaEn) : 'abierta' }}
                </div>
              </td>
              <td data-label="Responsable" class="izq suave">{{ c.abiertaPor || '—' }}</td>
              <td data-label="Boletas" class="der dato">
                {{ c.boletas }}
                <span v-if="c.anuladas" class="desglose rojo">{{ c.anuladas }} anulada(s)</span>
              </td>
              <td data-label="Vendido" class="der dato">{{ clp(c.totalVendido) }}</td>
              <td data-label="Efectivo" class="der dato">{{ clp(c.efectivo) }}</td>
              <td data-label="Otros medios" class="der dato suave">
                {{ clp(c.debito + c.credito + c.transferencia) }}
              </td>
              <td data-label="Diferencia" class="der">
                <span v-if="c.diferencia === null" class="tenue">abierta</span>
                <span v-else class="chip" :class="claseDiferencia(c.diferencia)">
                  {{ c.diferencia === 0 ? 'exacto' : clp(c.diferencia) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ═══ Modal de anulación ═══ -->
    <!-- CAMBIO 5: cierre con Escape -->
    <div v-if="anulando" class="fondo" @click.self="anulando = null" @keydown.esc="anulando = null">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-anulacion">
        <div class="modal-cab">
          <h3 id="titulo-anulacion">Anular boleta {{ anulando.folio }}</h3>
          <p>{{ clp(anulando.total) }} · {{ fecha(anulando.creadoEn) }}</p>
        </div>

        <div class="modal-cuerpo">
          <div v-if="anulando.error" class="error">{{ anulando.error }}</div>

          <!-- Lo que va a volver al inventario. Verlo antes de confirmar
               evita anular la boleta equivocada, que después no se deshace. -->
          <div class="devolucion">
            <div class="rot">Vuelve al inventario</div>
            <div v-for="c in anulando.consumos" :key="c.id" class="item">
              <div class="min0">
                <div class="item-nombre">{{ c.cantidad }} × {{ c.producto }}</div>
                <div class="desglose">
                  <span v-if="c.loteCodigo" class="mono">al lote {{ c.loteCodigo }}</span>
                  <span v-else class="tenue">a unidades armadas</span>
                </div>
              </div>
            </div>
          </div>

          <p class="ayuda">
            Las varas vuelven a <b>bodega</b>, no al mostrador: la partida pudo
            haberse agotado. Si hay que volver a venderlas, se bajan de nuevo.
          </p>

          <div class="grupo">
            <label for="a-motivo">¿Por qué se anula?</label>
            <input id="a-motivo" ref="campoMotivo" class="campo" v-model="anulando.motivo" maxlength="200"
              placeholder="El cliente se arrepintió, se cobró de más…" @keyup.enter="confirmarAnulacion">
          </div>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" @click="anulando = null">Cancelar</button>
          <button class="btn peligro" :disabled="anulandoAhora" @click="confirmarAnulacion">
            {{ anulandoAhora ? 'Anulando…' : 'Anular boleta' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ Ticket ═══ -->
    <TicketBoleta v-if="ticket" :ticket="ticket" @cerrar="ticket = null" />

    <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import { MEDIOS_PAGO, textoMedioPago } from '@/features/ventas/store/ventas.module'
import TicketBoleta from '@/features/ventas/components/TicketBoleta.vue'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'

export default {
  name: 'VentasView',
  components: { TicketBoleta },

  setup() {
    const store = useStore()
    const { usarAviso } = useTemporizadores()
    const { aviso, avisar } = usarAviso()

    const esAdmin = computed(() => store.getters['auth/esAdmin'])

    const pestana = ref('boletas')

    /* ---------------- Boletas ---------------- */
    const ventas = computed(() => store.getters['ventas/ventas'])
    const total = computed(() => store.getters['ventas/total'])
    const totalPaginas = computed(() => store.getters['ventas/totalPaginas'])
    const filtro = computed(() => store.getters['ventas/filtro'])
    const cargando = computed(() => store.getters['ventas/cargando'])
    const error = computed(() => store.getters['ventas/error'])

    const hayFiltro = computed(() => {
      const f = filtro.value
      return !!(f.buscar || f.medioPago || f.desde || f.hasta || f.incluirAnuladas)
    })

    /* Resumen de lo que se está viendo. Se calcula sobre la página actual, no
       sobre el total: es una referencia rápida, no un reporte. */
    const resumen = computed(() => {
      if (!ventas.value.length) return null
      const vivas = ventas.value.filter(v => !v.anulada)
      return {
        boletas: vivas.length,
        total: vivas.reduce((t, v) => t + v.total, 0),
        descuentos: vivas.reduce((t, v) => t + v.descuentoTotal, 0),
        anuladas: ventas.value.filter(v => v.anulada).length
      }
    })

    const busqueda = ref(filtro.value.buscar || '')
    let tmr = null
    watch(busqueda, (v) => {
      clearTimeout(tmr)
      tmr = setTimeout(() => filtrar({ buscar: v.trim() }), 350)
    })

    const filtrar = (cambios) => store.dispatch('ventas/filtrar', cambios)
    const recargar = () => store.dispatch('ventas/cargar')

    /* ---------------- Detalle ---------------- */
    const detalleId = ref(null)
    const detalle = ref(null)
    const cargandoDetalle = ref(false)

    /* El detalle se pide al abrir, no al cargar la lista: son dos consultas
       más por boleta —líneas y consumos— y traerlas para veinte filas que
       nadie va a expandir sería trabajo perdido. */
    const alternarDetalle = async (id) => {
      if (detalleId.value === id) {
        detalleId.value = null
        detalle.value = null
        return
      }

      detalleId.value = id
      detalle.value = null
      cargandoDetalle.value = true

      try {
        detalle.value = await store.dispatch('ventas/cargarDetalle', { id })
      } catch (e) {
        avisar(e.message, true)
        detalleId.value = null
      } finally {
        cargandoDetalle.value = false
      }
    }

    /* ---------------- Ticket ---------------- */
    const ticket = ref(null)

    const verTicket = async (id) => {
      try {
        ticket.value = await store.dispatch('ventas/ticket', { id })
      } catch (e) {
        avisar(e.message, true)
      }
    }

    /* ---------------- Anulación ---------------- */
    const anulando = ref(null)
    const anulandoAhora = ref(false)
    const campoMotivo = ref(null)

    const abrirAnulacion = (d) => {
      anulando.value = {
        id: d.id,
        folio: d.folio,
        total: d.total,
        creadoEn: d.creadoEn,
        consumos: d.consumos || [],
        motivo: '',
        error: ''
      }
      nextTick(() => campoMotivo.value?.focus())
    }

    const confirmarAnulacion = async () => {
      const a = anulando.value
      a.error = ''

      if (a.motivo.trim().length < 5) {
        return (a.error = 'Explica el motivo, con al menos 5 caracteres.')
      }

      anulandoAhora.value = true
      try {
        const r = await store.dispatch('ventas/anular', { id: a.id, motivo: a.motivo })
        avisar(`Boleta ${r.folio} anulada · ${r.devuelto} unidad(es) devuelta(s)`)
        anulando.value = null

        /* El detalle abierto quedó obsoleto: se relee para que muestre el
           sello de anulada. */
        if (detalleId.value === a.id) {
          detalle.value = await store.dispatch('ventas/cargarDetalle', { id: a.id, forzar: true })
        }
      } catch (e) {
        /* El mensaje viene del RAISE: "La caja de esta boleta ya se cerró.
           Anularla descuadraría ese arqueo." */
        a.error = e.message
      } finally {
        anulandoAhora.value = false
      }
    }

    /* ---------------- Turnos ---------------- */
    const turnos = computed(() => store.getters['caja/historial'])
    const cargandoCaja = computed(() => store.getters['caja/cargando'])

    const irATurnos = () => {
      pestana.value = 'turnos'
      store.dispatch('caja/cargarHistorial')
    }

    const claseDiferencia = (d) => (d === 0 ? 'exacto' : d > 0 ? 'sobra' : 'falta')

    /* ---------------- Carga ---------------- */
    let control = null

    onMounted(() => {
      control = new AbortController()
      store.dispatch('ventas/cargar', { signal: control.signal })
    })

    onUnmounted(() => {
      control?.abort()
      clearTimeout(tmr)
    })

    /* ---------------- Utilidades ---------------- */
    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    const fecha = (iso) => (iso
      ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
      : '—')

    const hora = (iso) => (iso
      ? new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
      : '—')

    return {
      Number, MEDIOS_PAGO, textoMedioPago,
      esAdmin, pestana, irATurnos,
      ventas, total, totalPaginas, filtro, cargando, error, hayFiltro, resumen,
      busqueda, filtrar, recargar,
      detalleId, detalle, cargandoDetalle, alternarDetalle,
      ticket, verTicket,
      anulando, anulandoAhora, campoMotivo, abrirAnulacion, confirmarAnulacion,
      turnos, cargandoCaja, claseDiferencia,
      aviso, clp, fecha, hora
    }
  }
}
</script>

<style scoped>
.ventas {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.min0 {
  min-width: 0;
}

.izq {
  text-align: left;
}

.der {
  text-align: right;
}

.suave {
  color: var(--text-muted);
}

.tenue {
  color: var(--text-faint);
}

.mini {
  font-size: .78rem;
}

.rojo {
  color: var(--danger);
}

.verde {
  color: var(--success);
}

.mono {
  font-family: var(--font-mono);
  font-size: .95em;
}

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.dato.grande {
  font-size: 1rem;
}

.rot {
  font-size: .66rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.desglose {
  font-size: .72rem;
  color: var(--text-faint);
  margin-top: 1px;
}

.ayuda {
  font-size: .82rem;
  color: var(--text-muted);
  line-height: 1.55;
  margin-top: 6px;
}

/* Solo para lectores de pantalla */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ─── Cabecera ─── */

h1 {
  font-size: clamp(1.2rem, 5vw, 1.5rem);
  font-weight: 700;
  letter-spacing: -.02em;
}

.cabecera .ayuda {
  max-width: 60ch;
}

.pestanas {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border);
}

.pestanas button {
  padding: 10px 18px;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--text-muted);
  font: inherit;
  font-size: .9rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: -1px;
  transition: color var(--t-fast), border-color var(--t-fast);
}

.pestanas button:hover {
  color: var(--text);
}

.pestanas button.on {
  color: var(--accent-text);
  border-bottom-color: var(--accent);
}

.pestanas button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--r-sm);
}

/* ─── Filtros ─── */
/* CAMBIO 1: alturas homogéneas, buscador separado de filtros secundarios */

.filtros {
  display: flex;
  flex-wrap: nowrap;      /* fuerza fila única en desktop */
  align-items: flex-end;  /* alinea por la base (las fechas tienen label arriba) */
  gap: 12px;
}

.buscador {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 auto;         /* absorbe el espacio sobrante */
  min-width: 200px;
  height: 44px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  padding: 0 12px;
  transition: border-color var(--t-fast), box-shadow var(--t-fast);
}

.buscador:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.buscador input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  color: var(--text);
  font: inherit;
  font-size: max(.9rem, 16px);
}

/* Elimina la clase .filtros-grupo (ya no existe) */

.campo {
  height: 44px;           /* altura fija, no min-height, para alinear exacto */
  padding: 0 .75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: max(.9rem, 16px);
  transition: border-color var(--t-fast), box-shadow var(--t-fast);
}

/* El campo del modal necesita padding vertical */
.grupo .campo {
  width: 100%;
  height: auto;
  min-height: 44px;
  padding: .6rem .75rem;
}

.campo:focus {
  outline: 0;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.campo.corto {
  flex: 0 0 auto;
  width: 170px;
}

.campo-fecha {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 0 0 auto;
}

.campo-fecha > span {
  font-size: .66rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.campo-fecha input {
  height: 44px;
  width: 150px;
  padding: 0 .6rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: max(.85rem, 16px);
  transition: border-color var(--t-fast), box-shadow var(--t-fast);
}

.campo-fecha input:focus {
  outline: 0;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 44px;
  flex: 0 0 auto;
  padding: 0 4px;
  font-size: .85rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
}

.check input {
  width: 17px;
  height: 17px;
  accent-color: var(--accent);
  cursor: pointer;
}

/* ─── Tiras de resumen ─── */
/* CAMBIO 4: total como protagonista, alerta diferenciada */

.tiras {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tira {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 18px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  min-width: 140px;
}

/* La primera tira (total vendido) es la protagonista */
.tira:first-child {
  background: color-mix(in srgb, var(--accent) 6%, var(--surface));
  border-color: var(--accent-soft);
}

.tira:first-child .dato {
  font-size: 1.15rem;
}

.tira.alerta {
  background: var(--danger-soft);
  border-color: var(--danger-border);
  color: var(--danger);
}

.tira.alerta .rot {
  color: inherit;
  opacity: .8;
}

/* ─── Tabla ─── */

.tabla-envoltura {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  overflow: auto;
  transition: opacity .14s ease;
}

.tabla-envoltura.atenuada {
  opacity: .45;
}

table {
  width: 100%;
  min-width: 860px;
  border-collapse: separate;
  border-spacing: 0;
}

th {
  position: sticky;
  top: 0;
  z-index: 2;
  text-align: right;
  padding: 10px 12px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  font-size: .66rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
}

th.izq {
  text-align: left;
}

td {
  padding: 11px 12px;
  border-bottom: 1px solid var(--border);
  font-size: .86rem;
  vertical-align: middle;
  white-space: nowrap;
}

tbody tr:last-child td {
  border-bottom: 0;
}

/* La fila entera abre el detalle: en una tabla de boletas, buscar un botón
   chiquito para ver qué se vendió es fricción sin motivo. */
.fila {
  cursor: pointer;
}

.fila:hover td {
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}

/* CAMBIO 3: foco visible para navegación por teclado */
.fila:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.fila.abierta td {
  background: var(--surface-2);
  border-bottom-color: transparent;
}

/* Una boleta anulada se atenúa pero no se esconde: el folio existe y el
   hueco en el correlativo tiene que poder explicarse. */
.fila.anulada {
  opacity: .55;
}

.fila.anulada .folio {
  text-decoration: line-through;
}

.folio {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: .85rem;
}

.flecha {
  display: inline-block;
  color: var(--text-faint);
  font-size: 1.1rem;
  transition: transform var(--t-fast);
}

.flecha.girada {
  transform: rotate(90deg);
}

.acciones-col {
  width: 1%;
}

/* ─── Detalle ─── */

.fila-detalle td {
  padding: 0;
  background: var(--surface-2);
  white-space: normal;
}

.detalle {
  padding: 18px 20px 16px;
  border-bottom: 2px solid var(--accent-soft);
}

.detalle-cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.detalle h4 {
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-faint);
  margin-bottom: 8px;
}

.item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 5px 0;
  font-size: .84rem;
}

.item .emoji {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.item .min0 {
  flex: 1;
}

.item-nombre {
  font-weight: 600;
}

.numeros .fila-num {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 3px 0;
  font-size: .84rem;
  color: var(--text-muted);
}

.fila-num.verde {
  color: var(--success);
}

.fila-num.total {
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  color: var(--text);
  font-weight: 700;
  font-size: .95rem;
}

.fila-num.margen {
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-strong);
}

.detalle-pie {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.cargando {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  font-size: .85rem;
}

/* ─── Chips ─── */

.chip {
  display: inline-block;
  padding: 3px 10px;
  border-radius: var(--r-full);
  font-size: .74rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Cada medio con su color: en una lista larga, el efectivo se distingue de
   la transferencia sin leer. */
.pago-efectivo {
  background: var(--success-soft);
  color: var(--success);
}

.pago-debito {
  background: var(--info-soft);
  color: var(--info);
}

.pago-credito {
  background: var(--accent-soft);
  color: var(--accent-text);
}

.pago-transferencia {
  background: var(--surface-2);
  color: var(--text-muted);
}

.chip.exacto {
  background: var(--success-soft);
  color: var(--success);
}

.chip.sobra {
  background: var(--info-soft);
  color: var(--info);
}

.chip.falta {
  background: var(--danger-soft);
  color: var(--danger);
}

.etiqueta {
  display: inline-block;
  padding: 1px 7px;
  border-radius: var(--r-full);
  font-size: .62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
  margin-left: 5px;
}

.et-roja {
  background: var(--danger-soft);
  color: var(--danger);
}

/* ─── Modal ─── */

.fondo {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 16px;
  background: var(--overlay);
}

.modal {
  width: 100%;
  max-width: 420px;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal-cab {
  padding: 20px 22px 14px;
  border-bottom: 1px solid var(--border);
}

.modal-cab h3 {
  font-size: 1.1rem;
  font-weight: 700;
}

.modal-cab p {
  font-size: .82rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.modal-cuerpo {
  flex: 1;
  overflow-y: auto;
  padding: 20px 22px;
}

.modal-pie {
  display: flex;
  gap: 10px;
  padding: 16px 22px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}

.modal-pie .btn {
  flex: 1;
}

.grupo {
  margin-top: 16px;
}

.grupo label {
  display: block;
  font-size: .8rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.devolucion {
  padding: 14px 16px;
  background: var(--surface-2);
  border-radius: var(--r-sm);
}

.devolucion .rot {
  margin-bottom: 6px;
}

/* ─── Botones y bandas ─── */

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

.btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.btn:disabled {
  opacity: .55;
  cursor: not-allowed;
}

/* Anular es irreversible y mueve stock: va en peligro, no en acento. */
.btn.peligro {
  background: var(--danger);
}

.btn.peligro:hover:not(:disabled) {
  background: var(--danger);
  filter: brightness(.92);
}

.btn-linea {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.btn-linea:hover:not(:disabled) {
  background: var(--surface-2);
  color: var(--text);
}

.btn-linea.peligro {
  background: transparent;
  border-color: var(--danger-border);
  color: var(--danger);
}

.btn-linea.peligro:hover:not(:disabled) {
  background: var(--danger-soft);
  filter: none;
}

.btn-mini {
  min-height: 34px;
  padding: .35rem .8rem;
  font-size: .82rem;
}

.btn-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-icono.chico {
  width: 26px;
  height: 26px;
  font-size: .78rem;
}

.banda {
  display: flex;
  align-items: center;
  gap: 11px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: var(--r-sm);
  font-size: .85rem;
}

.banda-error {
  background: var(--danger-soft);
  border: 1px solid var(--danger-border);
  color: var(--danger);
}

.detalle .banda {
  margin-top: 14px;
}

.banda .btn {
  margin-left: auto;
}

.error {
  padding: 11px 13px;
  margin-bottom: 14px;
  border-radius: var(--r-sm);
  border-left: 4px solid var(--danger);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: .85rem;
}

.vacio {
  text-align: center;
  padding: 44px 20px;
  color: var(--text-muted);
  font-size: .88rem;
  background: var(--surface);
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-md);
}

.vacio strong {
  display: block;
  color: var(--text);
  font-size: 1.02rem;
  margin-bottom: 5px;
}

.paginador {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 0;
  color: var(--text-muted);
}

.aviso {
  position: fixed;
  left: 50%;
  bottom: calc(24px + env(safe-area-inset-bottom, 0));
  transform: translateX(-50%);
  z-index: 200;
  padding: 12px 22px;
  border-radius: var(--r-full);
  background: var(--success);
  color: #fff;
  font-size: .88rem;
  font-weight: 600;
  box-shadow: var(--shadow-lg);
}

.aviso.malo {
  background: var(--danger);
}

/* ─── Móvil ─── */
/* CAMBIO 2: detalle unido a su card + CAMBIO 5: zona muerta */

@media (max-width: 860px) {

    /* Bajo el breakpoint sí se apilan: en móvil una sola fila no cabe */
  .filtros {
    flex-wrap: wrap;
  }

  .buscador { flex: 1 1 100%; }

  .campo.corto,
  .campo-fecha,
  .campo-fecha input {
    flex: 1 1 100%;
    width: 100%;
  }

  .check { flex: 1 1 100%; }


  table,
  thead,
  tbody,
  tr,
  td {
    display: block;
    width: 100%;
    min-width: 0;
  }

  /* sin scroll horizontal bajo el breakpoint */
  table {
    min-width: 0;
  }

  thead {
    display: none;
  }

  /* Filas de boleta (interactivas) y de turno (estáticas) como card */
  tbody tr.fila,
  tbody tr.fila-turno {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    margin-bottom: 10px;
    padding: 12px 14px;
  }

  tbody tr.fila td,
  tbody tr.fila-turno td {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 14px;
    padding: 5px 0;
    border: none;
    white-space: normal;
  }

  tbody tr.fila td::before,
  tbody tr.fila-turno td::before {
    content: attr(data-label) ":";
    font-size: .76rem;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  td[data-label="Folio"],
  td[data-label="Turno"] {
    display: block;
    padding-bottom: 10px;
    margin-bottom: 4px;
    border-bottom: 1px solid var(--border);
  }

  td[data-label="Folio"]::before,
  td[data-label="Turno"]::before {
    content: none;
  }

  .acciones-col {
    display: none;
  }

  /* La fila abierta se une visualmente con su detalle */
  tbody tr.fila.abierta {
    margin-bottom: 0;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  /* ✅ El detalle: continuación de la card de arriba, no card suelta */
  tbody tr.fila-detalle {
    margin-top: 0;
    margin-bottom: 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-top: none;
    border-radius: 0 0 var(--r-sm) var(--r-sm);
    padding: 0;
  }

  tbody tr.fila-detalle td {
    display: block;
    padding: 0;
    border: none;
  }

  tbody tr.fila-detalle td::before {
    content: none;
  }

  .detalle {
    padding: 14px;
    border-bottom: none;
  }

  /* una sola columna en móvil */
  .detalle-cols {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .detalle-pie {
    flex-direction: column;
  }

  .detalle-pie .btn {
    width: 100%;
  }

  .campo.corto {
    flex: 1 1 100%;
    width: 100%;
  }

  /* CAMBIO en recomendación 4: paginador cómodo en móvil */
  .paginador .btn {
    flex: 1;
  }
}
</style>
