<template>
  
    <div class="cabecera al-entrar">
      <div>
        <h2>Ventas y caja</h2>
        <p class="pista">
          Qué se vendió y cómo cerró cada turno. Anular una boleta devuelve al
          inventario exactamente lo que sacó, lote por lote.
        </p>
      </div>
    </div>

    <div class="pestanas al-entrar" style="--i: 1">
      <button class="pestana" :class="{ on: pestana === 'boletas' }" @click="pestana = 'boletas'">
        Boletas
      </button>
      <button class="pestana" :class="{ on: pestana === 'turnos' }" @click="irATurnos">
        Turnos de caja
      </button>
    </div>

    <div v-if="error" class="banda banda-error">
      <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      <button class="btn btn-mini" @click="recargar">Reintentar</button>
    </div>

    <!-- ================= BOLETAS ================= -->
    <template v-if="pestana === 'boletas'">

      <div class="barra-filtros al-entrar" style="--i: 2">
        <div class="buscador">
          <span aria-hidden="true">🔎</span>
          <input v-model="busqueda" placeholder="Folio, cliente o vendedor…" aria-label="Buscar boleta">
          <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
        </div>

        <select class="campo campo-corto" :value="filtro.medioPago ?? ''"
          @change="filtrar({ medioPago: $event.target.value || null })" aria-label="Medio de pago">
          <option value="">Todos los medios</option>
          <option v-for="m in MEDIOS_PAGO" :key="m.valor" :value="m.valor">{{ m.texto }}</option>
        </select>

        <label class="rango">
          <span class="mini suave">Desde</span>
          <input class="campo campo-fecha" type="date" :value="filtro.desde"
            @change="filtrar({ desde: $event.target.value || null })">
        </label>
        <label class="rango">
          <span class="mini suave">Hasta</span>
          <input class="campo campo-fecha" type="date" :value="filtro.hasta"
            @change="filtrar({ hasta: $event.target.value || null })">
        </label>

        <label class="check">
          <input type="checkbox" :checked="filtro.anulada === null"
            @change="filtrar({ anulada: $event.target.checked ? null : false })">
          <span>Ver anuladas</span>
        </label>
      </div>

      <div v-if="cargando && !ventas.length" class="vacio">Cargando boletas…</div>

      <div v-else-if="!ventas.length" class="vacio">
        <strong>Sin boletas en el período</strong>
        Ajusta las fechas o quita los filtros.
      </div>

      <div v-else class="tabla-envoltura" :class="{ atenuada: cargando }">
        <table>
          <thead>
            <tr>
              <th>Folio</th>
              <th>Fecha</th>
              <th>Vendedor</th>
              <th>Cliente</th>
              <th>Pago</th>
              <th class="der">Descuentos</th>
              <th class="der">Total</th>
              <th class="acciones-col"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, ix) in ventas" :key="v.id" class="fila clic" :style="{ '--i': Math.min(ix, 12) }"
              :class="{ anulada: v.anulada, resaltada: v.id === resalte.id }" @click="abrirDetalle(v)">
              <td data-label="Folio">
                <b class="dato">{{ v.folio }}</b>
                <div class="mini suave">#{{ v.numeroAtencion }} · {{ v.lineas }} línea(s)</div>
              </td>
              <td data-label="Fecha" class="dato mini">{{ fechaHora(v.fecha) }}</td>
              <td data-label="Vendedor" class="corta">{{ v.vendedor }}</td>
              <td data-label="Cliente" class="corta suave">{{ v.cliente || '—' }}</td>
              <td data-label="Pago">
                <span class="chip">{{ textoMedioPago(v.medioPago) }}</span>
              </td>
              <td data-label="Descuentos" class="der dato" :class="{ verde: v.descuentoTotal > 0 }">
                {{ v.descuentoTotal ? '−' + clp(v.descuentoTotal) : '—' }}
              </td>
              <td data-label="Total" class="der dato">{{ clp(v.total) }}</td>
              <td class="der acciones-col">
                <span v-if="v.anulada" class="etiqueta et-rojo">anulada</span>
                <span v-else class="flecha" aria-hidden="true">›</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="totalPaginas > 1" class="paginador">
        <button class="btn btn-linea btn-mini" :disabled="filtro.pagina <= 1"
          @click="filtrar({ pagina: filtro.pagina - 1 })">Anterior</button>
        <span class="mini suave">Página {{ filtro.pagina }} de {{ totalPaginas }} · {{ total }}</span>
        <button class="btn btn-linea btn-mini" :disabled="filtro.pagina >= totalPaginas"
          @click="filtrar({ pagina: filtro.pagina + 1 })">Siguiente</button>
      </p>
    </template>

    <!-- ================= TURNOS ================= -->
    <template v-else>

      <div v-if="cargandoCaja && !turnos.length" class="vacio">Cargando turnos…</div>

      <div v-else-if="!turnos.length" class="vacio">
        <strong>Sin turnos registrados</strong>
        Los turnos aparecen acá cuando se cierra la caja.
      </div>

      <div v-else class="tabla-envoltura">
        <table>
          <thead>
            <tr>
              <th>Turno</th>
              <th>Responsable</th>
              <th class="der">Fondo</th>
              <th class="der">Esperado</th>
              <th class="der">Contado</th>
              <th class="der">Diferencia</th>
              <th class="acciones-col"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(t, ix) in turnos" :key="t.id" class="fila clic" :style="{ '--i': Math.min(ix, 12) }"
              :class="claseTurno(t)" @click="abrirTurno(t)">
              <td data-label="Turno">
                <b class="dato">{{ fecha(t.abiertaEn) }}</b>
                <div class="mini suave">
                  {{ hora(t.abiertaEn) }}
                  <span v-if="t.cerradaEn"> → {{ hora(t.cerradaEn) }}</span>
                  <span v-else class="verde"> · abierta</span>
                </div>
              </td>
              <td data-label="Responsable">
                {{ t.abiertaPor }}
                <div v-if="t.cerradaPor && t.cerradaPor !== t.abiertaPor" class="mini suave">
                  cerró {{ t.cerradaPor }}
                </div>
              </td>
              <td data-label="Fondo" class="der dato">{{ clp(t.fondoInicial) }}</td>
              <td data-label="Esperado" class="der dato">
                {{ t.efectivoEsperado != null ? clp(t.efectivoEsperado) : '—' }}
              </td>
              <td data-label="Contado" class="der dato">
                {{ t.efectivoContado != null ? clp(t.efectivoContado) : '—' }}
              </td>

              <!--
                Negativo es faltante y positivo sobrante. Los dos se marcan:
                un sobrante también significa que algo no se registró como
                correspondía.
              -->
              <td data-label="Diferencia" class="der dato"
                :class="t.diferencia < 0 ? 'rojo' : (t.diferencia > 0 ? 'ambar' : '')">
                <template v-if="t.diferencia == null">—</template>
                <template v-else-if="t.diferencia === 0">cuadrada</template>
                <template v-else>
                  {{ t.diferencia > 0 ? '+' : '' }}{{ clp(t.diferencia) }}
                </template>
              </td>
              <td class="der acciones-col">
                <span class="flecha" aria-hidden="true">›</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ================= MODALES ================= -->
    <div v-if="modal" class="fondo" @click.self="cerrarModal">

      <!-- Detalle de boleta -->
      <div v-if="modal.tipo === 'boleta'" class="modal ancho">
        <div class="modal-cab">
          <div class="min0">
            <h3>{{ modal.f.venta.folio }}</h3>
            <p>
              {{ fechaHora(modal.f.venta.fecha) }} · {{ modal.f.venta.vendedor }}
              <span v-if="modal.f.venta.cliente"> · {{ modal.f.venta.cliente }}</span>
            </p>
          </div>
          <span v-if="modal.f.venta.anulada" class="etiqueta et-rojo">anulada</span>
        </div>

        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>
          <div v-if="!detalle" class="suave mini">Cargando detalle…</div>

          <template v-else>
            <div v-if="detalle.anulada" class="nota alerta">
              <b>Anulada por {{ detalle.anuladaPor }}</b> el {{ fechaHora(detalle.anuladaEn) }}.
              <br>{{ detalle.motivoAnulacion }}
            </div>

            <h4>Lo que se vendió</h4>
            <table class="interna">
              <tbody>
                <tr v-for="i in detalle.items" :key="i.id">
                  <td>
                    {{ i.emoji || '•' }} {{ i.nombre }}
                    <span v-if="i.esServicio" class="chip">servicio</span>
                  </td>
                  <td class="der dato">{{ i.cantidad }} × {{ clp(i.precioUnitario) }}</td>
                  <td class="der dato">{{ clp(i.subtotal) }}</td>
                </tr>
              </tbody>
            </table>

            <div class="totales">
              <div class="fila"><span>Bruto</span><b class="dato">{{ clp(detalle.bruto) }}</b></div>
              <div v-if="detalle.descuentoPromo" class="fila verde">
                <span>{{ detalle.promocion || 'Promoción' }}</span>
                <b class="dato">−{{ clp(detalle.descuentoPromo) }}</b>
              </div>
              <div v-if="detalle.descuentoCanje" class="fila verde">
                <span>{{ detalle.puntosCanjeados }} puntos canjeados</span>
                <b class="dato">−{{ clp(detalle.descuentoCanje) }}</b>
              </div>
              <div v-if="detalle.descuentoManual" class="fila verde">
                <span>
                  Descuento a mano
                  <em v-if="detalle.autorizadoPor" class="mini">
                    · autorizó {{ detalle.autorizadoPor }}
                  </em>
                </span>
                <b class="dato">−{{ clp(detalle.descuentoManual) }}</b>
              </div>
              <div class="fila"><span>Neto</span><b class="dato">{{ clp(detalle.neto) }}</b></div>
              <div class="fila">
                <span>IVA {{ detalle.ivaTasa }}%</span>
                <b class="dato">{{ clp(detalle.ivaMonto) }}</b>
              </div>
              <div class="fila total">
                <span>Total · {{ textoMedioPago(detalle.medioPago) }}</span>
                <b class="dato grande">{{ clp(detalle.total) }}</b>
              </div>
              <div v-if="detalle.recibido" class="fila">
                <span>Recibido {{ clp(detalle.recibido) }}</span>
                <b class="dato">vuelto {{ clp(detalle.vuelto) }}</b>
              </div>
            </div>

            <!--
              El plan de consumo es lo que hace posible anular: la venta
              guardó de qué lote salió cada vara y a qué costo. Sin eso, la
              reversa tendría que inventar stock.
            -->
            <div v-if="detalle.consumos.length" class="seccion">
              <h4>Qué salió del inventario</h4>
              <ul class="lista">
                <li v-for="(c, i) in detalle.consumos" :key="i">
                  <div class="min0">
                    <b>{{ c.producto }}</b>
                    <div class="mini suave">
                      {{ c.tipo === 'listo' ? 'unidad armada' : 'tallo' }}
                      <span v-if="c.loteCodigo"> · lote {{ c.loteCodigo }}</span>
                    </div>
                  </div>
                  <span class="dato">
                    {{ c.cantidad }}
                    <em v-if="c.costoUnitario" class="mini suave">
                      × {{ clp(c.costoUnitario) }}
                    </em>
                  </span>
                </li>
              </ul>

              <div class="cifras">
                <div>
                  <span>Costo real</span>
                  <b class="dato">{{ clp(detalle.costoVendido) }}</b>
                </div>
                <div>
                  <span>Utilidad bruta</span>
                  <b class="dato" :class="{ rojo: detalle.utilidadBruta < 0 }">
                    {{ clp(detalle.utilidadBruta) }}
                  </b>
                </div>
                <div v-if="detalle.puntosGanados">
                  <span>Puntos otorgados</span>
                  <b class="dato">{{ detalle.puntosGanados }}</b>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="modal-pie" v-if="detalle">
          <button class="btn btn-linea" @click="cerrarModal">Cerrar</button>
          <button class="btn btn-linea" @click="verTicket">🖨️ Ticket</button>
          <button v-if="esAdmin && !detalle.anulada" class="btn btn-rojo" @click="abrirAnular">
            Anular boleta
          </button>
        </div>
      </div>

      <!-- Desglose del turno -->
      <div v-else-if="modal.tipo === 'turno'" class="modal">
        <div class="modal-cab">
          <h3>Turno del {{ fecha(modal.f.turno.abiertaEn) }}</h3>
          <p>{{ modal.f.turno.abiertaPor }} · {{ hora(modal.f.turno.abiertaEn) }}</p>
        </div>

        <div class="modal-cuerpo">
          <div v-if="!resumen" class="suave mini">Cargando resumen…</div>

          <template v-else>
            <div v-if="resumen.diferencia != null" class="resultado-cierre"
              :class="claseDiferencia(resumen.diferencia)">
              <span class="rot">{{ textoDiferencia(resumen.diferencia) }}</span>
              <b class="val">{{ clp(Math.abs(resumen.diferencia)) }}</b>
            </div>

            <div class="totales">
              <div class="fila"><span>Fondo inicial</span><b class="dato">{{ clp(resumen.fondoInicial) }}</b></div>
              <div class="fila"><span>Efectivo recibido</span><b class="dato">{{ clp(resumen.efectivo) }}</b></div>
              <div class="fila total">
                <span>Debería haber en el cajón</span>
                <b class="dato">{{ clp(resumen.enCajon) }}</b>
              </div>
              <div v-if="resumen.efectivoContado != null" class="fila">
                <span>Contado</span><b class="dato">{{ clp(resumen.efectivoContado) }}</b>
              </div>
            </div>

            <h4>Por medio de pago</h4>
            <div class="totales">
              <div class="fila"><span>Efectivo</span><b class="dato">{{ clp(resumen.efectivo) }}</b></div>
              <div class="fila"><span>Débito</span><b class="dato">{{ clp(resumen.debito) }}</b></div>
              <div class="fila"><span>Crédito</span><b class="dato">{{ clp(resumen.credito) }}</b></div>
              <div class="fila"><span>Transferencia</span><b class="dato">{{ clp(resumen.transferencia) }}</b></div>
              <div class="fila total">
                <span>{{ resumen.boletas }} boleta(s)</span>
                <b class="dato">{{ clp(resumen.totalVendido) }}</b>
              </div>
            </div>

            <div class="cifras">
              <div v-if="resumen.totalDescuentos">
                <span>Descuentos</span>
                <b class="dato">{{ clp(resumen.totalDescuentos) }}</b>
              </div>
              <div v-if="resumen.anuladas">
                <span>Anuladas</span>
                <b class="dato rojo">{{ resumen.anuladas }}</b>
              </div>
              <div v-if="resumen.puntosOtorgados">
                <span>Puntos otorgados</span>
                <b class="dato">{{ resumen.puntosOtorgados }}</b>
              </div>
              <div v-if="resumen.puntosCanjeados">
                <span>Puntos canjeados</span>
                <b class="dato">{{ resumen.puntosCanjeados }}</b>
              </div>
            </div>

            <p v-if="resumen.notaCierre" class="notas">“{{ resumen.notaCierre }}”</p>

            <button class="enlace-boton" @click="verBoletasDelTurno">
              Ver las boletas de este turno
            </button>
          </template>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" @click="cerrarModal">Cerrar</button>
        </div>
      </div>

      <!-- Anular -->
      <div v-else-if="modal.tipo === 'anular'" class="modal">
        <div class="modal-cab">
          <h3>Anular {{ detalle.folio }}</h3>
          <p>{{ clp(detalle.total) }} · {{ fechaHora(detalle.fecha) }}</p>
        </div>
        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <div class="grupo">
            <label for="an-motivo">¿Por qué se anula?</label>
            <input id="an-motivo" class="campo" v-model="modal.f.motivo" maxlength="300"
              placeholder="Se cobró el ramo equivocado" @keyup.enter="confirmarAnular">
            <p class="ayuda">Mínimo 5 caracteres. Queda registrado con tu nombre.</p>
          </div>

          <div class="nota alerta">
            Las varas vuelven al lote del que salieron, con su costo y su
            vencimiento. El arqueo de ese turno cambia.
          </div>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="volverABoleta">Cancelar</button>
          <button class="btn btn-rojo" :disabled="anulando" @click="confirmarAnular">
            <span v-if="anulando" class="spinner" aria-hidden="true"></span>
            Anular
          </button>
        </div>
      </div>

      <!-- Ticket -->
      <div v-else-if="modal.tipo === 'ticket'" class="modal">
        <div class="modal-cab">
          <h3>Boleta {{ ticket.folio }}</h3>
        </div>
        <div class="modal-cuerpo">
          <div class="ticket">
            <div class="cen">
              <div class="logo" aria-hidden="true">🌸</div>
              <h4>{{ ticket.localNombre }}</h4>
              <div class="chico">{{ ticket.localDireccion }}</div>
              <div v-if="ticket.localRut" class="chico">RUT {{ ticket.localRut }}</div>
              <div class="atencion">
                <span class="chico">TICKET DE ATENCIÓN</span>
                <b>#{{ ticket.numeroAtencion }}</b>
              </div>
            </div>
            <div class="sep"></div>
            <div>Boleta: {{ ticket.folio }}</div>
            <div>Atendió: {{ ticket.vendedor }}</div>
            <div v-if="ticket.cliente">Cliente: {{ ticket.cliente }}</div>
            <div class="sep"></div>
            <table>
              <tbody>
                <tr v-for="i in ticket.items" :key="i.id">
                  <td>{{ i.cantidad }}x {{ i.nombre }}</td>
                  <td class="der">{{ clp(i.subtotal) }}</td>
                </tr>
              </tbody>
            </table>
            <div class="sep"></div>
            <div v-if="ticket.descuentoTotal" class="tot">
              <span>{{ ticket.promocion || 'Descuentos' }}</span>
              <span>−{{ clp(ticket.descuentoTotal) }}</span>
            </div>
            <div class="tot"><span>Neto</span><span>{{ clp(ticket.neto) }}</span></div>
            <div class="tot"><span>IVA {{ ticket.ivaTasa }}%</span><span>{{ clp(ticket.ivaMonto) }}</span></div>
            <div class="tot g"><span>TOTAL</span><span>{{ clp(ticket.total) }}</span></div>
            <div v-if="ticket.anulada" class="cen anulado">— ANULADA —</div>
            <div class="sep"></div>
            <div class="cen chico">
              <b>{{ ticket.mensaje }}</b><br>{{ ticket.leyenda }}
            </div>
          </div>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="volverABoleta">Volver</button>
          <button class="btn" @click="imprimir">🖨️ Imprimir</button>
        </div>
      </div>
    </div>

    <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'
import { MEDIOS_PAGO, textoMedioPago } from '@/features/ventas/store/ventas.module'

export default {
  name: 'VentasView',
  components: {  },

  setup() {
    const store = useStore()
    const { usarResalte, usarAviso } = useTemporizadores()
    const { aviso, avisar } = usarAviso()
    const resalte = usarResalte()

    const esAdmin = computed(() => store.getters['auth/esAdmin'])

    const pestana = ref('boletas')

    /* ---------------- Boletas ---------------- */
    const ventas = computed(() => store.getters['ventas/ventas'])
    const total = computed(() => store.getters['ventas/total'])
    const totalPaginas = computed(() => store.getters['ventas/totalPaginas'])
    const filtro = computed(() => store.getters['ventas/filtro'])
    const cargando = computed(() => store.getters['ventas/cargando'])
    const error = computed(() => store.getters['ventas/error'])

    /* ---------------- Turnos ---------------- */
    const turnos = computed(() => store.getters['caja/historial'])
    const cargandoCaja = computed(() => store.getters['caja/cargando'])

    let control = null

    onMounted(() => {
      control = new AbortController()
      store.dispatch('ventas/cargar', { signal: control.signal })
    })

    onUnmounted(() => control?.abort())

    const recargar = () => {
      if (pestana.value === 'boletas') store.dispatch('ventas/cargar')
      else store.dispatch('caja/cargarHistorial')
    }

    const filtrar = (cambios) => store.dispatch('ventas/filtrar', cambios)

    const irATurnos = () => {
      pestana.value = 'turnos'
      if (!turnos.value.length) store.dispatch('caja/cargarHistorial')
    }

    const busqueda = ref(filtro.value.buscar || '')
    let tmr = null
    watch(busqueda, (v) => {
      clearTimeout(tmr)
      tmr = setTimeout(() => filtrar({ buscar: v.trim() }), 350)
    })
    onUnmounted(() => clearTimeout(tmr))

    /* ---------------- Modales ---------------- */
    const modal = ref(null)
    const detalle = ref(null)
    const resumen = ref(null)
    const ticket = ref(null)
    const anulando = ref(false)

    const cerrarModal = () => {
      modal.value = null
      detalle.value = null
      resumen.value = null
      ticket.value = null
    }

    const volverABoleta = () => {
      modal.value = { tipo: 'boleta', f: { venta: detalle.value, error: '' } }
      ticket.value = null
    }

    const abrirDetalle = async (v) => {
      modal.value = { tipo: 'boleta', f: { venta: v, error: '' } }
      detalle.value = await store.dispatch('ventas/cargarDetalle', { id: v.id, forzar: true })
    }

    const abrirTurno = async (t) => {
      modal.value = { tipo: 'turno', f: { turno: t } }
      resumen.value = await store.dispatch('caja/resumen', { id: t.id })
    }

    /* Ver las boletas de un turno es la pregunta que sigue naturalmente a
       "este turno quedó descuadrado". */
    const verBoletasDelTurno = () => {
      const id = modal.value.f.turno.id
      cerrarModal()
      pestana.value = 'boletas'
      filtrar({ cajaId: id, desde: null, hasta: null })
      avisar('Mostrando las boletas de ese turno')
    }

    const verTicket = async () => {
      try {
        ticket.value = await store.dispatch('ventas/ticket', { id: detalle.value.id })
        modal.value = { tipo: 'ticket', f: {} }
      } catch (e) {
        modal.value.f.error = e.message
      }
    }

    const imprimir = () => window.print()

    const abrirAnular = () => {
      modal.value = { tipo: 'anular', f: { motivo: '', error: '' } }
    }

    const confirmarAnular = async () => {
      const f = modal.value.f
      f.error = ''
      anulando.value = true
      try {
        await store.dispatch('ventas/anular', { id: detalle.value.id, motivo: f.motivo })
        detalle.value = await store.dispatch('ventas/cargarDetalle', {
          id: detalle.value.id, forzar: true
        })
        volverABoleta()
        avisar('Boleta anulada · stock devuelto')
        resalte.marcar(detalle.value.id)
      } catch (e) {
        f.error = e.message
      } finally {
        anulando.value = false
      }
    }

    /* ---------------- Utilidades ---------------- */
    const claseTurno = (t) => ({
      abierta: !t.cerradaEn,
      descuadrada: (t.diferencia ?? 0) !== 0
    })

    const claseDiferencia = (d) => {
      if (d === 0) return 'cuadrada'
      return d > 0 ? 'sobrante' : 'faltante'
    }

    const textoDiferencia = (d) => {
      if (d === 0) return 'Cuadrada'
      return d > 0 ? 'Sobrante' : 'Faltante'
    }

    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    const fmtFecha = new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: '2-digit', year: '2-digit'
    })
    const fecha = (v) => (v ? fmtFecha.format(new Date(v)) : '—')

    const fmtHora = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' })
    const hora = (v) => (v ? fmtHora.format(new Date(v)) : '—')

    const fmtCompleta = new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
    const fechaHora = (v) => (v ? fmtCompleta.format(new Date(v)) : '—')

    return {
      MEDIOS_PAGO, Math, textoMedioPago,
      esAdmin, pestana, irATurnos,
      ventas, total, totalPaginas, filtro, cargando, error, recargar, filtrar, busqueda,
      turnos, cargandoCaja, claseTurno,
      modal, detalle, resumen, ticket, anulando,
      cerrarModal, volverABoleta, abrirDetalle, abrirTurno, verBoletasDelTurno,
      verTicket, imprimir, abrirAnular, confirmarAnular,
      claseDiferencia, textoDiferencia,
      resalte, aviso, clp, fecha, hora, fechaHora
    }
  }
}
</script>

<style scoped>
.cabecera,
.cabecera *,
.tabla-envoltura *,
.fondo * {
  box-sizing: border-box;
}

@keyframes entra {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.al-entrar {
  animation: entra 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: calc(var(--i, 0) * 50ms);
}

@keyframes aparece {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.fila {
  animation: aparece 220ms ease-out backwards;
  animation-delay: calc(var(--i, 0) * 25ms);
}

@keyframes resalta {
  0% {
    background: #fee2e2;
  }

  70% {
    background: #fef2f2;
  }

  100% {
    background: transparent;
  }
}

.fila.resaltada td {
  animation: resalta 1400ms ease-out;
}

.spinner {
  display: inline-block;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: girar 0.8s linear infinite;
}

@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}

/* ---------- Encabezado ---------- */
.cabecera {
  margin-bottom: 16px;
}

.cabecera h2 {
  margin: 0;
  font-size: clamp(1.25rem, 4.5vw, 1.5rem);
  color: #0f172a;
}

.pista {
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: #64748b;
  max-width: 64ch;
  line-height: 1.5;
}

/* ---------- Pestañas ---------- */
.pestanas {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.pestana {
  padding: 11px 18px;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  color: #64748b;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.pestana:hover {
  color: #0f172a;
}

.pestana.on {
  color: #047857;
  border-bottom-color: #059669;
}

.banda {
  display: flex;
  align-items: center;
  gap: 11px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 0.875rem;
}

.banda-error {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #991b1b;
}

.banda .btn {
  margin-left: auto;
}

/* ---------- Filtros ---------- */
.barra-filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 16px;
}

.rango {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.buscador {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 220px;
  min-width: 0;
  min-height: 44px;
  padding: 0 12px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.buscador:focus-within {
  border-color: transparent;
  box-shadow: 0 0 0 2px #10b981;
}

.buscador input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  font-family: inherit;
  font-size: max(0.9rem, 16px);
}

.campo {
  width: 100%;
  min-height: 44px;
  padding: 0.6rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: #fff;
  font-family: inherit;
  font-size: max(0.9rem, 16px);
  color: #0f172a;
  outline: none;
}

.campo:focus {
  border-color: transparent;
  box-shadow: 0 0 0 2px #10b981;
}

.campo-corto {
  width: auto;
  flex: 0 1 180px;
}

.campo-fecha {
  width: auto;
  min-width: 148px;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.85rem;
  color: #475569;
  cursor: pointer;
}

.check input {
  width: 17px;
  height: 17px;
  accent-color: #059669;
  cursor: pointer;
}

/* ---------- Tabla ---------- */
.tabla-envoltura {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  overflow-x: auto;
  transition: opacity 0.14s ease;
}

.tabla-envoltura.atenuada {
  opacity: 0.45;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: 11px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64748b;
  white-space: nowrap;
}

td {
  padding: 11px 14px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.875rem;
  vertical-align: middle;
}

tbody tr:last-child td {
  border-bottom: 0;
}

tr.clic {
  cursor: pointer;
}

tr.anulada {
  opacity: 0.5;
}

.fila td {
  transition: background-color 0.16s ease;
}

tr.clic:hover td {
  background: #f8fafc;
}

/* Un turno descuadrado tiene que verse en la fila, no solo en su columna */
tr.descuadrada td {
  background: #fffbeb;
}

tr.descuadrada:hover td {
  background: #fef3c7;
}

tr.abierta td {
  background: #f0fdf4;
}

.der {
  text-align: right;
}

.suave {
  color: #64748b;
}

.mini {
  font-size: 0.76rem;
}

.rojo {
  color: #dc2626;
}

.ambar {
  color: #b45309;
}

.verde {
  color: #047857;
}

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.dato.grande {
  font-size: 1.2rem;
}

.corta {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acciones-col {
  width: 1%;
  white-space: nowrap;
}

.flecha {
  color: #cbd5e1;
  font-size: 1.1rem;
}

.min0 {
  min-width: 0;
}

.chip {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.7rem;
  font-weight: 600;
}

.etiqueta {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.et-rojo {
  background: #fee2e2;
  color: #991b1b;
}

.paginador {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 14px 0 0;
}

/* ---------- Modales ---------- */
.fondo {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.55);
}

.modal {
  width: 100%;
  max-width: 480px;
  max-height: 92vh;
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
}

.modal.ancho {
  max-width: 620px;
}

.modal-cab {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-cab h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #0f172a;
}

.modal-cab p {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: #64748b;
}

.modal-cuerpo {
  padding: 18px 20px;
  overflow-y: auto;
}

.modal-pie {
  display: flex;
  gap: 9px;
  justify-content: flex-end;
  flex-wrap: wrap;
  padding: 14px 20px;
  border-top: 1px solid #e2e8f0;
}

h4 {
  margin: 18px 0 9px;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64748b;
}

h4:first-child {
  margin-top: 0;
}

label {
  display: block;
  margin-bottom: 5px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #475569;
}

.grupo {
  margin-bottom: 15px;
}

.seccion {
  margin-top: 18px;
}

table.interna {
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  overflow: hidden;
}

table.interna td {
  padding: 8px 11px;
  font-size: 0.82rem;
}

.totales {
  margin-top: 13px;
  padding: 12px 14px;
  background: #f8fafc;
  border-radius: 10px;
}

.totales .fila {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0;
  font-size: 0.85rem;
  color: #64748b;
}

.totales .fila.verde {
  color: #047857;
}

.totales .fila.total {
  margin-top: 6px;
  padding-top: 9px;
  border-top: 1px solid #e2e8f0;
  color: #0f172a;
  font-weight: 700;
}

.totales em {
  font-style: normal;
}

.cifras {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
  margin-top: 13px;
}

.cifras>div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 9px;
}

.cifras span {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
}

.cifras b {
  font-size: 1rem;
  color: #0f172a;
}

.lista {
  list-style: none;
  margin: 0;
  padding: 0;
}

.lista li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px dotted #e2e8f0;
  font-size: 0.83rem;
}

.lista li:last-child {
  border-bottom: 0;
}

.lista li b {
  color: #0f172a;
}

.lista em {
  font-style: normal;
}

.notas {
  margin: 14px 0 0;
  padding: 9px 11px;
  background: #f8fafc;
  border-left: 3px solid #6ee7b7;
  border-radius: 0 7px 7px 0;
  font-size: 0.8rem;
  color: #475569;
  font-style: italic;
}

.resultado-cierre {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 18px;
  border-radius: 12px;
  margin-bottom: 14px;
}

.resultado-cierre .rot {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.resultado-cierre .val {
  font-size: 1.8rem;
  font-variant-numeric: tabular-nums;
}

.resultado-cierre.cuadrada {
  background: #f0fdf4;
  color: #166534;
}

.resultado-cierre.sobrante {
  background: #fffbeb;
  color: #78350f;
}

.resultado-cierre.faltante {
  background: #fee2e2;
  color: #991b1b;
}

.error {
  padding: 10px 13px;
  margin-bottom: 14px;
  border-radius: 8px;
  border-left: 4px solid #dc2626;
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.85rem;
}

.nota {
  padding: 11px 13px;
  margin: 0 0 14px;
  border-radius: 0 8px 8px 0;
  border-left: 3px solid #10b981;
  background: #f0fdf4;
  font-size: 0.83rem;
  color: #475569;
  line-height: 1.6;
}

.nota.alerta {
  border-color: #f59e0b;
  background: #fffbeb;
  color: #78350f;
}

.ayuda {
  margin: 5px 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
  line-height: 1.5;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

/* ---------- Ticket ---------- */
.ticket {
  width: 270px;
  margin: 0 auto;
  padding: 14px;
  background: #fff;
  color: #000;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.68rem;
  line-height: 1.45;
  border: 1px solid #e2e8f0;
}

.ticket .cen {
  text-align: center;
}

.ticket .logo {
  font-size: 1.5rem;
}

.ticket h4 {
  margin: 4px 0 2px;
  font-size: 0.8rem;
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #000;
}

.ticket .chico {
  font-size: 0.6rem;
}

.ticket .sep {
  border-top: 1px dashed #000;
  margin: 7px 0;
}

.ticket .atencion {
  border: 1px solid #000;
  padding: 4px;
  margin: 6px 0;
}

.ticket .atencion b {
  display: block;
  font-size: 1.15rem;
}

.ticket table {
  width: 100%;
  border-collapse: collapse;
}

.ticket td {
  padding: 2px 0;
  font-size: 0.64rem;
  vertical-align: top;
  border: 0;
}

.ticket .der {
  text-align: right;
}

.ticket .tot {
  display: flex;
  justify-content: space-between;
}

.ticket .tot.g {
  font-size: 0.88rem;
  font-weight: 700;
  border-top: 1px solid #000;
  margin-top: 4px;
  padding-top: 4px;
}

.ticket .anulado {
  margin: 8px 0;
  font-weight: 700;
  letter-spacing: 0.1em;
}

/* ---------- Botones ---------- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: 0.65rem 1.15rem;
  border: none;
  border-radius: 0.5rem;
  background: #059669;
  color: #fff;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:hover:not(:disabled) {
  background: #047857;
}

.btn:disabled {
  background: #a7c9bb;
  cursor: not-allowed;
}

.btn-linea {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #475569;
}

.btn-linea:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #94a3b8;
}

.btn-linea:disabled {
  background: transparent;
  color: #cbd5e1;
}

.btn-rojo {
  background: #dc2626;
}

.btn-rojo:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-mini {
  min-height: 34px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}

.btn-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
}

.btn-icono.chico {
  width: 28px;
  height: 28px;
}

.enlace-boton {
  margin-top: 14px;
  padding: 0;
  border: none;
  background: none;
  color: #059669;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.vacio {
  text-align: center;
  padding: 44px 20px;
  color: #64748b;
  background: #fff;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
}

.vacio strong {
  display: block;
  color: #0f172a;
  font-size: 1.05rem;
  margin-bottom: 5px;
}

.aviso {
  position: fixed;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 80;
  max-width: 90vw;
  padding: 12px 20px;
  border-radius: 10px;
  background: #064e3b;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
  text-align: center;
}

.aviso.malo {
  background: #b91c1c;
}

/* ---------- Móvil ---------- */
@media (max-width: 900px) {
  .tabla-envoltura {
    border: none;
    background: transparent;
    overflow: visible;
  }

  table:not(.interna):not(.ticket table),
  table:not(.interna) thead,
  table:not(.interna) tbody,
  table:not(.interna) tr,
  table:not(.interna) td {
    display: block;
    width: 100%;
  }

  table:not(.interna) thead {
    display: none;
  }

  table:not(.interna) tbody tr {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    margin-bottom: 11px;
    padding: 12px;
  }

  table:not(.interna) td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
    border: none;
    text-align: right;
  }

  table:not(.interna) td::before {
    content: attr(data-label);
    font-size: 0.64rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #94a3b8;
    text-align: left;
    flex-shrink: 0;
  }

  td[data-label="Folio"],
  td[data-label="Turno"] {
    display: block;
    text-align: left;
  }

  td[data-label="Folio"]::before,
  td[data-label="Turno"]::before {
    content: none;
  }

  tr.clic:hover td {
    background: transparent;
  }

  tr.descuadrada td,
  tr.abierta td {
    background: transparent;
  }

  tr.descuadrada {
    border-color: #fcd34d;
  }

  tr.abierta {
    border-color: #86efac;
  }

  .fila.resaltada {
    animation: resalta 1400ms ease-out;
  }

  .fila.resaltada td {
    animation: none;
  }

  .campo-corto,
  .campo-fecha {
    flex: 1 1 100%;
    width: 100%;
  }

  .corta {
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {

  .btn,
  .pestana,
  .campo,
  .buscador,
  .tabla-envoltura,
  .fila td {
    transition: none;
  }

  .al-entrar,
  .fila,
  .fila.resaltada,
  .fila.resaltada td,
  .spinner {
    animation: none;
  }

  .tabla-envoltura.atenuada {
    opacity: 1;
  }
}

@media print {

  .modal-cab,
  .modal-pie,
  .pestanas,
  .cabecera,
  .barra-filtros {
    display: none;
  }

  .ticket {
    border: 0;
  }
}
</style>