<template>
  <div class="ventas">
    <header class="cabecera">
      <h1>Ventas y caja</h1>
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

      <!-- Barra: buscador + un botón que abre todo lo demás.
           Los cinco controles apilados se comían la pantalla en móvil. -->
      <div class="barra">
        <div class="buscador">
          <span class="lupa" aria-hidden="true">⌕</span>
          <input v-model="busqueda" placeholder="Folio, cliente o RUT…" aria-label="Buscar boleta">
          <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar búsqueda">✕</button>
        </div>

        <button class="btn btn-linea filtros-btn" :class="{ activo: nFiltros > 0 }" @click="filtrosAbiertos = true"
          :aria-label="`Filtros${nFiltros ? `, ${nFiltros} activos` : ''}`">
          Filtros
          <span v-if="nFiltros" class="globo">{{ nFiltros }}</span>
        </button>
      </div>

      <!-- Lo que está filtrando, visible y removible: si la lista sale vacía
           tiene que poder verse por qué sin abrir nada. -->
      <div v-if="chips.length" class="chips">
        <button v-for="c in chips" :key="c.clave" class="chip-filtro" @click="quitarChip(c)">
          {{ c.texto }} <span aria-hidden="true">✕</span>
        </button>
        <button class="chip-limpiar" @click="limpiarFiltros">Limpiar todo</button>
      </div>

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
        <strong>{{ nFiltros || busqueda ? 'Ninguna boleta coincide' : 'Sin ventas todavía' }}</strong>
        {{ nFiltros || busqueda ? 'Prueba con otro texto o quita los filtros.' : 'Las boletas aparecen acá al cobrar.' }}
      </div>

      <!-- ═══ Feed ═══ -->
      <div v-else class="feed" :class="{ atenuada: cargando }">

        <!-- Rótulos de columna: el feed sigue teniendo la información de la
             tabla, solo que la fecha ya la carga la cabecera de cada día. -->
        <div class="feed-cab" aria-hidden="true">
          <span class="c-borde"></span>
          <span>Folio</span>
          <span>Vendedor</span>
          <span>Cliente</span>
          <span>Pago</span>
          <span class="der">Descuentos</span>
          <span class="der">Total</span>
          <span></span>
        </div>

        <section v-for="g in grupos" :key="g.clave" class="dia">
          <h2 class="dia-cab">
            <span class="dia-titulo">{{ g.titulo }}</span>
            <span class="dia-total">{{ g.boletas }} boleta(s) · {{ clp(g.total) }}</span>
          </h2>

          <article v-for="v in g.ventas" :key="v.id" class="boleta" :class="{ anulada: v.anulada }" tabindex="0"
            role="button" :aria-label="`Boleta ${v.folio}, ${clp(v.total)}`" @click="abrirDetalle(v.id)"
            @keydown.enter.prevent="abrirDetalle(v.id)" @keydown.space.prevent="abrirDetalle(v.id)">

            <!-- El medio de pago se lee en el borde, sin leer texto -->
            <span class="borde" :class="'borde-' + v.medioPago" aria-hidden="true"></span>

            <div class="c-folio min0">
              <div class="folio">
                {{ v.folio }}
                <span v-if="v.anulada" class="etiqueta et-roja">anulada</span>
              </div>
              <div class="desglose">
                {{ hora(v.creadoEn) }} · #{{ v.numeroAtencion }} · {{ v.lineas }} línea(s)
              </div>
            </div>

            <div class="c-vendedor suave">{{ v.usuario || '—' }}</div>

            <div class="c-cliente suave">
              <span v-if="v.cliente">{{ v.cliente }}</span>
              <span v-else class="tenue">sin ficha</span>
            </div>

            <div class="c-pago">
              <span class="chip" :class="'pago-' + v.medioPago">{{ textoMedioPago(v.medioPago) }}</span>
            </div>

            <div class="c-desc der">
              <span v-if="v.descuentoTotal" class="dato verde">−{{ clp(v.descuentoTotal) }}</span>
              <span v-else class="tenue">—</span>
            </div>

            <div class="c-total der dato grande">{{ clp(v.total) }}</div>

            <span class="flecha" aria-hidden="true">›</span>
          </article>
        </section>
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

      <div v-else class="feed">
        <div class="turnos-cab" aria-hidden="true">
          <span>Turno</span>
          <span>Responsable</span>
          <span class="der">Boletas</span>
          <span class="der">Vendido</span>
          <span class="der">Efectivo</span>
          <span class="der">Otros medios</span>
          <span class="der">Diferencia</span>
        </div>

        <article v-for="c in turnos" :key="c.id" class="turno">
          <div class="c-folio min0">
            <div class="folio">{{ fecha(c.abiertaEn) }}</div>
            <div class="desglose">{{ hora(c.abiertaEn) }} — {{ c.cerradaEn ? hora(c.cerradaEn) : 'abierta' }}</div>
          </div>
          <div class="suave">{{ c.abiertaPor || '—' }}</div>
          <div class="der dato">
            {{ c.boletas }}
            <span v-if="c.anuladas" class="desglose rojo">{{ c.anuladas }} anulada(s)</span>
          </div>
          <div class="der dato">{{ clp(c.totalVendido) }}</div>
          <div class="der dato">{{ clp(c.efectivo) }}</div>
          <div class="der dato suave">{{ clp(c.debito + c.credito + c.transferencia) }}</div>
          <div class="der">
            <span v-if="c.diferencia === null" class="tenue">abierta</span>
            <span v-else class="chip" :class="claseDiferencia(c.diferencia)">
              {{ c.diferencia === 0 ? 'exacto' : clp(c.diferencia) }}
            </span>
          </div>
        </article>
      </div>
    </template>

    <!-- ═══ Hoja de filtros ═══ -->
    <div v-if="filtrosAbiertos" class="fondo" @click.self="filtrosAbiertos = false">
      <div class="hoja" role="dialog" aria-modal="true" aria-labelledby="titulo-filtros">
        <div class="hoja-cab">
          <span class="agarre" aria-hidden="true"></span>
          <h3 id="titulo-filtros">Filtros</h3>
          <button class="btn-icono" @click="filtrosAbiertos = false" aria-label="Cerrar">✕</button>
        </div>

        <div class="hoja-cuerpo">
          <div class="grupo">
            <label for="f-medio">Medio de pago</label>
            <select id="f-medio" class="campo" :value="filtro.medioPago ?? ''"
              @change="filtrar({ medioPago: $event.target.value || null, pagina: 1 })">
              <option value="">Todos los medios</option>
              <option v-for="m in MEDIOS_PAGO" :key="m.valor" :value="m.valor">{{ m.texto }}</option>
            </select>
          </div>

          <!-- Nadie tipea un rango a mano en el mostrador -->
          <div class="grupo">
            <label>Periodo</label>
            <div class="presets">
              <button v-for="p in PRESETS" :key="p.clave" class="preset" :class="{ on: presetActivo === p.clave }"
                @click="aplicarPreset(p.clave)">{{ p.texto }}</button>
            </div>
          </div>

          <div v-if="presetActivo === 'personalizado'" class="grupo par">
            <label class="campo-fecha">
              <span>Desde</span>
              <input type="date" :value="filtro.desde ?? ''"
                @change="filtrar({ desde: $event.target.value || null, pagina: 1 })">
            </label>
            <label class="campo-fecha">
              <span>Hasta</span>
              <input type="date" :value="filtro.hasta ?? ''"
                @change="filtrar({ hasta: $event.target.value || null, pagina: 1 })">
            </label>
          </div>

          <label class="check">
            <input type="checkbox" :checked="filtro.incluirAnuladas"
              @change="filtrar({ incluirAnuladas: $event.target.checked, pagina: 1 })">
            <span>Ver boletas anuladas</span>
          </label>
        </div>

        <div class="hoja-pie">
          <button class="btn btn-linea" @click="limpiarFiltros">Limpiar</button>
          <button class="btn" @click="filtrosAbiertos = false">Ver {{ total }} boleta(s)</button>
        </div>
      </div>
    </div>

    <!-- ═══ Hoja de detalle ═══ -->
    <!-- Antes era un acordeón dentro de la tabla. La hoja evita el truco de
         pegar dos filas con border-top: none para que parezcan una card. -->
    <div v-if="detalleId" class="fondo" @click.self="cerrarDetalle">
      <div class="hoja alta" role="dialog" aria-modal="true" aria-labelledby="titulo-detalle">
        <div class="hoja-cab">
          <span class="agarre" aria-hidden="true"></span>
          <div class="min0">
            <h3 id="titulo-detalle">{{ detalle?.folio || 'Boleta' }}</h3>
            <p v-if="detalle">{{ fecha(detalle.creadoEn) }} · {{ hora(detalle.creadoEn) }}</p>
          </div>
          <button class="btn-icono" @click="cerrarDetalle" aria-label="Cerrar">✕</button>
        </div>

        <div class="hoja-cuerpo">
          <div v-if="cargandoDetalle" class="cargando">Cargando detalle…</div>

          <div v-else-if="detalle" class="detalle-cols">
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

            <!-- Es lo que hace posible anular devolviendo las varas al balde
                 exacto, y lo que dice cuánto se ganó de verdad. -->
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
                  <span v-if="detalle.autorizadoPor" class="desglose">· autorizó {{ detalle.autorizadoPor }}</span>
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

              <div class="fila-num total"><span>Total</span><b class="dato">{{ clp(detalle.total) }}</b></div>

              <template v-if="detalle.recibido">
                <div class="fila-num"><span>Recibido</span><b class="dato">{{ clp(detalle.recibido) }}</b></div>
                <div class="fila-num"><span>Vuelto</span><b class="dato">{{ clp(detalle.vuelto) }}</b></div>
              </template>

              <!-- El margen sale de los consumos: lo que realmente valían las
                   varas que salieron de la cámara, no el costo de la ficha. -->
              <div v-if="esAdmin && detalle.margen != null" class="fila-num margen">
                <span>Margen real</span>
                <b class="dato" :class="detalle.margen < 25 ? 'rojo' : 'verde'">
                  {{ Number(detalle.margen).toFixed(0) }}%
                </b>
              </div>
            </section>
          </div>

          <div v-if="detalle?.anulada" class="banda banda-error">
            <span aria-hidden="true">🚫</span>
            <span>
              Anulada por <b>{{ detalle.anulador }}</b> el {{ fecha(detalle.anuladaEn) }}
              · {{ detalle.motivoAnulacion }}
            </span>
          </div>
        </div>

        <div v-if="detalle" class="hoja-pie">
          <button class="btn btn-linea" @click="verTicket(detalle.id)">🧾 Ver ticket</button>
          <button v-if="esAdmin && !detalle.anulada" class="btn btn-linea peligro" @click="abrirAnulacion(detalle)">
            Anular boleta
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ Modal de anulación ═══ -->
    <div v-if="anulando" class="fondo" @click.self="anulando = null">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-anulacion">
        <div class="modal-cab">
          <h3 id="titulo-anulacion">Anular boleta {{ anulando.folio }}</h3>
          <p>{{ clp(anulando.total) }} · {{ fecha(anulando.creadoEn) }}</p>
        </div>

        <div class="modal-cuerpo">
          <div v-if="anulando.error" class="error">{{ anulando.error }}</div>

          <!-- Verlo antes de confirmar evita anular la boleta equivocada, que
               después no se deshace. -->
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

const PRESETS = [
  { clave: 'todo', texto: 'Todo' },
  { clave: 'hoy', texto: 'Hoy' },
  { clave: 'ayer', texto: 'Ayer' },
  { clave: '7d', texto: '7 días' },
  { clave: 'mes', texto: 'Este mes' },
  { clave: 'personalizado', texto: 'Otro rango' }
]

/* YYYY-MM-DD en hora local. new Date().toISOString() da UTC y en Chile
   adelanta el día durante la tarde. */
const iso = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const sumarDias = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

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

    const filtrar = (cambios) => store.dispatch('ventas/filtrar', cambios)
    const recargar = () => store.dispatch('ventas/cargar')

    /* ---------------- Agrupado por día ---------------- */
    /* El orden lo pone el servidor (creadoEn desc). Map conserva el orden de
       inserción, así que los días salen como vinieron: no reordenamos acá.
       Si el backend deja de ordenar, esto se rompe en silencio. */
    const tituloDia = (d) => {
      const hoy = new Date()
      if (iso(d) === iso(hoy)) return 'Hoy'
      if (iso(d) === iso(sumarDias(hoy, -1))) return 'Ayer'
      return d.toLocaleDateString('es-CL', {
        weekday: 'short', day: 'numeric', month: 'short',
        year: d.getFullYear() === hoy.getFullYear() ? undefined : 'numeric'
      })
    }

    const grupos = computed(() => {
      const mapa = new Map()
      for (const v of ventas.value) {
        const d = new Date(v.creadoEn)
        const clave = iso(d)
        if (!mapa.has(clave)) {
          mapa.set(clave, { clave, titulo: tituloDia(d), ventas: [], boletas: 0, total: 0 })
        }
        const g = mapa.get(clave)
        g.ventas.push(v)
        if (!v.anulada) {
          g.boletas++
          g.total += v.total
        }
      }
      return [...mapa.values()]
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

    /* ---------------- Filtros ---------------- */
    const filtrosAbiertos = ref(false)
    const rangoManual = ref(false)

    const busqueda = ref(filtro.value.buscar || '')
    let tmr = null
    watch(busqueda, (v) => {
      clearTimeout(tmr)
      tmr = setTimeout(() => filtrar({ buscar: v.trim(), pagina: 1 }), 350)
    })

    const rangoPreset = (clave) => {
      const hoy = new Date()
      switch (clave) {
        case 'hoy': return { desde: iso(hoy), hasta: iso(hoy) }
        case 'ayer': return { desde: iso(sumarDias(hoy, -1)), hasta: iso(sumarDias(hoy, -1)) }
        case '7d': return { desde: iso(sumarDias(hoy, -6)), hasta: iso(hoy) }
        case 'mes': return { desde: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: iso(hoy) }
        default: return { desde: null, hasta: null }
      }
    }

    /* Qué preset corresponde al rango que hay puesto. Se deduce, no se guarda,
       para que un rango que llegó por URL o por el store se refleje solo. */
    const presetActivo = computed(() => {
      const { desde, hasta } = filtro.value
      if (!desde && !hasta) return rangoManual.value ? 'personalizado' : 'todo'
      for (const p of ['hoy', 'ayer', '7d', 'mes']) {
        const r = rangoPreset(p)
        if (r.desde === desde && r.hasta === hasta) return p
      }
      return 'personalizado'
    })

    const aplicarPreset = (clave) => {
      rangoManual.value = clave === 'personalizado'
      if (clave === 'personalizado') return
      filtrar({ ...rangoPreset(clave), pagina: 1 })
    }

    const chips = computed(() => {
      const f = filtro.value
      const out = []
      if (f.medioPago) {
        out.push({ clave: 'medioPago', texto: textoMedioPago(f.medioPago), cambio: { medioPago: null } })
      }
      if (f.desde || f.hasta) {
        const p = PRESETS.find(x => x.clave === presetActivo.value)
        const texto = presetActivo.value === 'personalizado'
          ? `${f.desde || '…'} a ${f.hasta || '…'}`
          : p?.texto
        out.push({ clave: 'fechas', texto, cambio: { desde: null, hasta: null } })
      }
      if (f.incluirAnuladas) {
        out.push({ clave: 'anuladas', texto: 'Con anuladas', cambio: { incluirAnuladas: false } })
      }
      return out
    })

    const nFiltros = computed(() => chips.value.length)

    const quitarChip = (c) => {
      if (c.clave === 'fechas') rangoManual.value = false
      filtrar({ ...c.cambio, pagina: 1 })
    }

    const limpiarFiltros = () => {
      rangoManual.value = false
      busqueda.value = ''
      filtrar({ buscar: '', medioPago: null, desde: null, hasta: null, incluirAnuladas: false, pagina: 1 })
    }

    /* ---------------- Detalle ---------------- */
    const detalleId = ref(null)
    const detalle = ref(null)
    const cargandoDetalle = ref(false)

    /* El detalle se pide al abrir, no al cargar la lista: son dos consultas
       más por boleta —líneas y consumos— y traerlas para veinte filas que
       nadie va a expandir sería trabajo perdido. */
    const abrirDetalle = async (id) => {
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

    const cerrarDetalle = () => {
      detalleId.value = null
      detalle.value = null
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

    /* ---------------- Carga y teclado ---------------- */
    let control = null

    /* Escape iba en @keydown del div de fondo, donde nunca llegaba: ese div no
       recibe foco. Va en document, y cierra la capa de más arriba. */
    const alTeclado = (e) => {
      if (e.key !== 'Escape') return
      if (anulando.value) anulando.value = null
      else if (ticket.value) ticket.value = null
      else if (detalleId.value) cerrarDetalle()
      else if (filtrosAbiertos.value) filtrosAbiertos.value = false
    }

    onMounted(() => {
      control = new AbortController()
      store.dispatch('ventas/cargar', { signal: control.signal })
      document.addEventListener('keydown', alTeclado)
    })

    onUnmounted(() => {
      control?.abort()
      clearTimeout(tmr)
      document.removeEventListener('keydown', alTeclado)
    })

    /* ---------------- Utilidades ---------------- */
    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    const fecha = (iso_) => (iso_
      ? new Date(iso_).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
      : '—')

    const hora = (iso_) => (iso_
      ? new Date(iso_).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
      : '—')

    return {
      Number, MEDIOS_PAGO, textoMedioPago, PRESETS,
      esAdmin, pestana, irATurnos,
      ventas, total, totalPaginas, filtro, cargando, error, resumen, grupos,
      busqueda, filtrar, recargar,
      filtrosAbiertos, presetActivo, aplicarPreset, chips, nFiltros, quitarChip, limpiarFiltros,
      detalleId, detalle, cargandoDetalle, abrirDetalle, cerrarDetalle,
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

/* ─── Cabecera ─── */

h1 {
  font-size: clamp(1.2rem, 5vw, 1.5rem);
  font-weight: 700;
  letter-spacing: -.02em;
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

/* ─── Barra de búsqueda ─── */

.barra {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

.buscador {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 auto;
  min-width: 0;
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

.buscador .lupa {
  color: var(--text-faint);
  font-size: 1.1rem;
  line-height: 1;
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

.filtros-btn {
  flex: 0 0 auto;
  gap: 8px;
}

.filtros-btn.activo {
  border-color: var(--accent);
  color: var(--accent-text);
}

.globo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  border-radius: var(--r-full);
  background: var(--accent);
  color: var(--accent-contrast);
  font-size: .7rem;
  font-weight: 700;
}

/* ─── Chips de filtro activo ─── */

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip-filtro,
.chip-limpiar {
  border: 1px solid var(--accent-soft);
  border-radius: var(--r-full);
  background: var(--accent-soft);
  color: var(--accent-text);
  font: inherit;
  font-size: .76rem;
  font-weight: 600;
  padding: 4px 11px;
  cursor: pointer;
}

.chip-limpiar {
  background: transparent;
  border-color: var(--border-strong);
  color: var(--text-muted);
}

.chip-filtro:hover,
.chip-limpiar:hover {
  filter: brightness(1.08);
}

/* ─── Tiras de resumen ─── */

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

/* ─── Feed ─── */

.feed {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  overflow: hidden;
  transition: opacity .14s ease;
}

.feed.atenuada {
  opacity: .45;
}

/* La grilla es una sola definición y la comparten rótulos, cabecera de día y
   boletas: si se agrega una columna, se agrega en un solo lugar. */
.feed-cab,
.boleta {
  display: grid;
  grid-template-columns: 3px minmax(140px, 1fr) 130px minmax(120px, 1fr) 108px 104px 116px 16px;
  align-items: center;
  gap: 12px;
}

.feed-cab {
  position: sticky;
  top: 0;
  z-index: 3;
  padding: 9px 14px 9px 0;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  font-size: .66rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
}

.feed-cab .c-borde {
  display: block;
}

/* La cabecera de día lleva la fecha y el total del día: por eso la boleta ya
   no necesita columna de fecha, y el hueco central se llena con los datos que
   antes estaban en la tabla. */
.dia-cab {
  position: sticky;
  top: 33px;
  z-index: 2;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  border-top: 1px solid var(--border);
}

.dia:first-of-type .dia-cab {
  border-top: 0;
}

.dia-titulo {
  font-size: .82rem;
  font-weight: 700;
  letter-spacing: -.01em;
  text-transform: capitalize;
}

.dia-total {
  font-size: .76rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}

.boleta {
  padding: 0 14px 0 0;
  border-bottom: 1px solid var(--border);
  font-size: .86rem;
  cursor: pointer;
  white-space: nowrap;
}

.dia:last-of-type .boleta:last-of-type {
  border-bottom: 0;
}

.boleta:hover {
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}

.boleta:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

/* Una boleta anulada se atenúa pero no se esconde: el folio existe y el hueco
   en el correlativo tiene que poder explicarse. */
.boleta.anulada {
  opacity: .55;
}

.boleta.anulada .folio {
  text-decoration: line-through;
}

/* El medio de pago en el borde: en una lista larga se distingue el efectivo
   de la transferencia sin leer. */
.borde {
  align-self: stretch;
  min-height: 46px;
}

.borde-efectivo {
  background: var(--success);
}

.borde-debito {
  background: var(--info);
}

.borde-credito {
  background: var(--accent);
}

.borde-transferencia {
  background: var(--border-strong);
}

.c-folio {
  padding: 10px 0;
}

.c-vendedor,
.c-cliente {
  overflow: hidden;
  text-overflow: ellipsis;
}

.folio {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: .85rem;
}

.flecha {
  color: var(--text-faint);
  font-size: 1.1rem;
  text-align: right;
}

/* ─── Turnos ─── */

.turnos-cab,
.turno {
  display: grid;
  grid-template-columns: minmax(120px, 1.2fr) minmax(110px, 1fr) 88px 116px 116px 124px 108px;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
}

.turnos-cab {
  padding-top: 9px;
  padding-bottom: 9px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  font-size: .66rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
}

.turno {
  padding-top: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
  font-size: .86rem;
  white-space: nowrap;
}

.turno:last-of-type {
  border-bottom: 0;
}

.turno .desglose {
  display: block;
}

/* ─── Hojas y modales ─── */

.fondo {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 16px;
  background: var(--overlay);
}

.hoja {
  width: 100%;
  max-width: 560px;
  max-height: 88dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.hoja.alta {
  max-width: 640px;
}

.hoja-cab {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.hoja-cab h3 {
  font-size: 1.05rem;
  font-weight: 700;
}

.hoja-cab p {
  font-size: .8rem;
  color: var(--text-muted);
  margin-top: 3px;
}

.hoja-cab .min0 {
  flex: 1;
}

.hoja-cab .btn-icono {
  margin-left: auto;
}

/* El agarre solo existe cuando la hoja sube desde abajo */
.agarre {
  display: none;
}

.hoja-cuerpo {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px;
}

.hoja-pie {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}

.hoja-pie .btn {
  flex: 1;
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset {
  padding: 8px 13px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-full);
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  font-size: .82rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color var(--t-fast), color var(--t-fast), background-color var(--t-fast);
}

.preset:hover {
  color: var(--text);
}

.preset.on {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent-text);
}

.preset:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.grupo {
  margin-bottom: 18px;
}

.grupo:last-child {
  margin-bottom: 0;
}

.grupo.par {
  display: flex;
  gap: 12px;
}

.grupo > label {
  display: block;
  font-size: .8rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 7px;
}

.campo {
  width: 100%;
  min-height: 44px;
  padding: .6rem .75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: max(.9rem, 16px);
  transition: border-color var(--t-fast), box-shadow var(--t-fast);
}

.campo:focus {
  outline: 0;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.campo-fecha {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}

.campo-fecha > span {
  font-size: .74rem;
  font-weight: 600;
  color: var(--text-faint);
}

.campo-fecha input {
  height: 44px;
  width: 100%;
  padding: 0 .6rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: max(.85rem, 16px);
}

.campo-fecha input:focus {
  outline: 0;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  font-size: .88rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
}

.check input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
  cursor: pointer;
}

/* ─── Detalle ─── */

.detalle-cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 22px;
}

.detalle-cols h4 {
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

/* ─── Modal de anulación ─── */

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
  width: 32px;
  height: 32px;
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

.hoja-cuerpo .banda {
  margin-top: 16px;
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

/* ─── Anchos intermedios ─── */
/* Vendedor y cliente son lo primero que sobra cuando aprieta */

@media (max-width: 1080px) {

  .feed-cab,
  .boleta {
    grid-template-columns: 3px minmax(140px, 1fr) minmax(110px, 1fr) 104px 100px 112px 16px;
  }

  .c-vendedor,
  .feed-cab > span:nth-child(3) {
    display: none;
  }
}

/* ─── Móvil ─── */

@media (max-width: 860px) {

  .feed-cab,
  .turnos-cab {
    display: none;
  }

  .dia-cab {
    top: 0;
  }

  /* Dos renglones: folio y total arriba, todo lo demás abajo. La misma
     información que en escritorio, apilada. */
  .boleta {
    grid-template-columns: 3px minmax(0, 1fr) auto;
    grid-template-areas:
      "borde folio  total"
      "borde cliente pago";
    row-gap: 4px;
    padding: 0 12px 0 0;
    white-space: normal;
  }

  .borde {
    grid-area: borde;
  }

  .c-folio {
    grid-area: folio;
    padding: 10px 0 0;
  }

  .c-cliente {
    grid-area: cliente;
    padding-bottom: 10px;
    font-size: .8rem;
  }

  .c-pago {
    grid-area: pago;
    padding-bottom: 10px;
    text-align: right;
  }

  .c-total {
    grid-area: total;
    padding-top: 10px;
  }

  /* El vendedor se lee dentro del desglose del folio; descuento y flecha
     sobran en dos renglones. */
  .c-vendedor,
  .c-desc,
  .flecha {
    display: none;
  }

  .turnos-cab,
  .turno {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px 12px;
    padding: 12px;
  }

  .turno > div:not(.c-folio) {
    display: flex;
    justify-content: space-between;
    font-size: .82rem;
  }

  .turno > div:not(.c-folio)::before {
    content: attr(data-rot);
    color: var(--text-muted);
    font-weight: 400;
  }

  .turno .c-folio {
    grid-column: 1 / -1;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }

  /* Las hojas suben desde abajo y ocupan el ancho completo */
  .fondo {
    place-items: end center;
    padding: 0;
  }

  .hoja,
  .hoja.alta {
    max-width: none;
    max-height: 92dvh;
    border-radius: var(--r-lg) var(--r-lg) 0 0;
    border-bottom: 0;
    padding-bottom: env(safe-area-inset-bottom, 0);
    animation: subir .18s ease-out;
  }

  .hoja-cab {
    position: relative;
    padding-top: 22px;
  }

  .agarre {
    display: block;
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 34px;
    height: 4px;
    border-radius: var(--r-full);
    background: var(--border-strong);
  }

  .hoja-pie {
    flex-direction: column-reverse;
  }

  .detalle-cols {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .paginador .btn {
    flex: 1;
  }
}

@keyframes subir {
  from {
    transform: translateY(14px);
  }
}

@media (prefers-reduced-motion: reduce) {

  .hoja,
  .hoja.alta {
    animation: none;
  }
}
</style>