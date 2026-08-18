<template>
  <div class="dash">

    <!-- ═══ CABECERA ═══ -->
    <div class="hero">
      <div>
        <h1 class="hero__hola">Hola, {{ nombreUsuario }} 🌸</h1>
        <!--<p class="hero__fecha">{{ fechaLarga }}</p>-->
      </div>
      <Boton variante="ghost" :loading="cargando" @click="actualizar">
        <IconRefresh :size="16" /> {{ cargando ? 'Actualizando…' : 'Actualizar' }}
      </Boton>
    </div>

    <!-- ═══ ERROR ═══ -->
    <div v-if="error" class="banda banda--error">
      <IconAlertTriangle :size="18" />
      <span>{{ error }}</span>
      <Boton variante="soft" tamano="sm" @click="actualizar">Reintentar</Boton>
    </div>

    <!-- ═══ SKELETON (primera carga) ═══ -->
    <div v-if="cargando && !panel" class="grid-kpi">
      <Kpi v-for="n in 4" :key="n" loading rotulo="Cargando" />
    </div>

    <template v-else-if="panel">

      <!-- ═══ NOTIFICACIONES ═══ -->
      <section v-if="alertas.length" class="seccion">
        <SectionHeader titulo="Notificaciones">
          <template #icono><IconBell :size="18" /></template>
          <template #aside>
            <Badge :tono="hayAltas ? 'danger' : hayUrgentes ? 'warn' : 'neutro'">
              {{ alertas.length }} {{ alertas.length === 1 ? 'aviso' : 'avisos' }}
            </Badge>
          </template>
        </SectionHeader>

        <div class="alertas">
          <div v-for="a in alertas" :key="a.id" class="alerta" :class="`alerta--${a.tono}`">
            <span class="alerta__ico">
              <component :is="iconoAlerta(a.id)" :size="20" />
            </span>
            <p class="alerta__txt">{{ a.texto }}</p>
            <Boton v-if="a.cta" variante="soft" tamano="sm" @click="a.accion">{{ a.cta }}</Boton>
          </div>
        </div>
      </section>

      <div v-else class="banda banda--ok">
        <IconCheck :size="18" />
        <span>Nada urgente por ahora. Ni lotes vencidos, ni faltantes, ni cobros atrasados.</span>
      </div>

      <!-- ═══ RESUMEN DEL DÍA ═══ -->
      <section class="seccion">
        <SectionHeader titulo="Resumen del día" />

        <div class="grid-kpi">
          <Kpi :destacado="hoyDia.ingresos > 0" rotulo="Ingresos de hoy" :valor="clp(hoyDia.ingresos)">
            <template #pie>
              <template v-if="!hoyDia.boletas">Aún no hay ventas hoy</template>
              <template v-else>
                <span :class="variacionSemanal >= 0 ? 'sube' : 'baja'">
                  {{ variacionSemanal >= 0 ? '↑' : '↓' }} {{ Math.abs(variacionSemanal ?? 0).toFixed(1) }}%
                </span>
                vs. mismo día semana pasada
              </template>
            </template>
          </Kpi>

          <Kpi rotulo="Boletas" :valor="hoyDia.boletas">
            <template #pie>Ticket promedio {{ clp(hoyDia.ticketPromedio) }}</template>
          </Kpi>

          <Kpi rotulo="Resultado del día" :valor="clp(hoyDia.resultado)" :valor-rojo="hoyDia.resultado < 0">
            <template #pie>
              Margen {{ Number(hoyDia.margenPorcentaje || 0).toFixed(0) }}%
              <template v-if="hoyDia.mermas"> · {{ clp(hoyDia.mermas) }} en mermas</template>
            </template>
          </Kpi>

          <Kpi rotulo="Caja" :valor="caja?.abierta ? clp(caja.efectivoEsperado) : 'Cerrada'">
            <template #pie>
              <template v-if="caja?.abierta">Abierta por {{ caja.responsable }} · {{ hora(caja.abiertaEn) }}</template>
              <template v-else>Ábrela para empezar a vender</template>
            </template>
          </Kpi>
        </div>
      </section>

       <!-- ═══ LO QUE VIENE ═══ -->
      <section class="seccion">
        <SectionHeader titulo="Lo que viene">
          <template #icono><IconCalendar :size="18" /></template>
          <template #aside><Badge tono="neutro">{{ eventos.length }} evento(s)</Badge></template>
        </SectionHeader>

        <EmptyState
          v-if="!eventos.length"
          :icono="IconCalendar"
          texto="No hay eventos agendados para las próximas dos semanas."
        />
        <div v-else class="tarjetas">
          <div
            v-for="e in eventos" :key="e.cotizacionId"
            class="evento"
            :class="{ 'evento--urgente': e.diasParaEvento <= 2, 'evento--sinstock': e.productosFaltantes > 0 }"
          >
            <div class="evento__head">
              <b>{{ e.cliente }}</b>
              <Badge :tono="e.diasParaEvento <= 2 ? 'warn' : 'neutro'">{{ textoDias(e.diasParaEvento) }}</Badge>
            </div>
            <div class="evento__meta">{{ e.tipoEvento }} · {{ e.folio }} · {{ fecha(e.fechaEvento) }}</div>

            <div class="evento__plata">
              <div><span>Total</span><b class="dato">{{ clp(e.total) }}</b></div>
              <div v-if="e.saldo > 0"><span>Saldo</span><b class="dato rojo">{{ clp(e.saldo) }}</b></div>
            </div>

            <p v-if="e.productosFaltantes > 0" class="evento__falta">
              <IconAlertTriangle :size="14" /> {{ e.productosFaltantes }} producto(s) que el stock no cubre
            </p>
          </div>
        </div>
      </section>

      <!-- ═══ COMPARACIÓN ═══ -->
      <section class="seccion">
        <SectionHeader titulo="Comparación semanal" />
        <EmptyState
          v-if="!semanaPasada"
          :icono="IconTrendingUp"
          texto="Aún no hay suficientes datos para comparar esta semana."
        />
        <div v-else class="comparacion">
          <div class="comp-header">
            <span></span>
            <span>{{ nombreDia }} pasado</span>
            <span class="comp-hoy">Hoy</span>
          </div>
          <div class="comp-fila">
            <span>Ingresos</span>
            <b class="dato">{{ clp(semanaPasada.ingresos) }}</b>
            <span class="dato comp-hoy">{{ clp(hoyDia.ingresos) }}</span>
          </div>
          <div class="comp-fila">
            <span>Boletas</span>
            <b class="dato">{{ semanaPasada.boletas }}</b>
            <span class="dato comp-hoy">{{ hoyDia.boletas }}</span>
          </div>
          <div class="comp-fila">
            <span>Ticket promedio</span>
            <b class="dato">{{ clp(semanaPasada.ticketPromedio) }}</b>
            <span class="dato comp-hoy">{{ clp(hoyDia.ticketPromedio) }}</span>
          </div>
        </div>
      </section>

    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import Boton from '@/shared/components/ui/Boton.vue'
import Badge from '@/shared/components/ui/Badge.vue'
import Kpi from '@/shared/components/ui/Kpi.vue'
import SectionHeader from '@/shared/components/ui/SectionHeader.vue'
import EmptyState from '@/shared/components/ui/EmptyState.vue'
import { destinoAlerta } from '@/features/reportes/store/reportes.module'
import {
  Bell as IconBell,
  Calendar as IconCalendar,
  RefreshCw as IconRefresh,
  AlertTriangle as IconAlertTriangle,
  TrendingDown as IconTrendingDown,
  TrendingUp as IconTrendingUp,
  Clock as IconClock,
  Package as IconPackage,
  Wallet as IconWallet,
  CheckCircle2 as IconCheck,
  Info as IconInfo,
} from 'lucide-vue-next'

const store = useStore()
const router = useRouter()

/* ------------------------------------------------------------------
 * Datos reales del store (esto es lo que faltaba en la versión rota)
 * ------------------------------------------------------------------ */
const panel           = computed(() => store.getters['reportes/panel'])
const hoyDia           = computed(() => store.getters['reportes/hoy'] || {})
const semanaPasada     = computed(() => store.getters['reportes/semanaPasada'])
const variacionSemanal = computed(() => store.getters['reportes/variacionSemanal'])
const caja              = computed(() => store.getters['reportes/caja'])
const alertasRaw        = computed(() => store.getters['reportes/alertas'] || [])
const eventos           = computed(() => store.getters['reportes/proximosEventos'] || [])
const cargando          = computed(() => store.getters['reportes/cargandoPanel'])
const error             = computed(() => store.getters['reportes/error'])

const nombreUsuario = computed(() =>
  (store.getters['auth/currentUser']?.name || '').split(' ')[0] || 'hola'
)

/* Adapta {tipo, mensaje, urgencia} del store al formato visual {id, tono, texto, cta} */
const MAPA_TONO = { alta: 'danger', media: 'warn', baja: 'neutro' }
const ICONOS_ALERTA = {
  lote_vencido: IconAlertTriangle,
  lote_por_vencer: IconClock,
  lote_rezagado: IconPackage,
  bajo_minimo: IconTrendingDown,
  cobro_vencido: IconWallet,
  evento_sin_stock: IconAlertTriangle,
}

const alertas = computed(() =>
  alertasRaw.value.map(a => {
    const ruta = destinoAlerta(a.tipo)
    return {
      id: a.tipo,
      tono: MAPA_TONO[a.urgencia] || 'neutro',
      texto: a.mensaje,
      cta: ruta ? 'Resolver' : null,
      accion: () => ruta && router.push(ruta),
    }
  })
)

const hayAltas    = computed(() => alertasRaw.value.some(a => a.urgencia === 'alta'))
const hayUrgentes = computed(() => alertasRaw.value.some(a => a.urgencia === 'media'))

function iconoAlerta(tipo) {
  return ICONOS_ALERTA[tipo] || IconInfo
}

/* ------------------------------------------------------------------
 * Formato
 * ------------------------------------------------------------------ */

const nombreDia = computed(() => new Intl.DateTimeFormat('es-CL', { weekday: 'long' }).format(new Date()))

const clp = n =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
    .format(Math.round(n || 0))

const fmtHora = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' })
const hora = v => (v ? fmtHora.format(new Date(v)) : '—')

const fmtFecha = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit' })
const fecha = v => (v ? fmtFecha.format(new Date(v)) : '—')

const textoDias = d => (d <= 0 ? 'Hoy' : d === 1 ? 'Mañana' : `En ${d} días`)

/* ------------------------------------------------------------------
 * Ciclo de vida: esto traía los datos y se había perdido
 * ------------------------------------------------------------------ */
let control = null
const revalidar = () => store.dispatch('reportes/revalidarPanel')

function actualizar() {
  control?.abort()
  control = new AbortController()
  store.dispatch('reportes/cargarPanel', { signal: control.signal })
}

onMounted(() => {
  control = new AbortController()
  store.dispatch('reportes/cargarPanel', { signal: control.signal })
  window.addEventListener('focus', revalidar)
})

onUnmounted(() => {
  control?.abort()
  window.removeEventListener('focus', revalidar)
})
</script>

<style scoped>
.dash {
  display: flex;
  flex-direction: column;
  gap: clamp(24px, 4vw, 32px);
  width: 100%;
}

/* --- Hero --- */
.hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.hero__hola { font-size: clamp(1.4rem, 4vw, 1.7rem); font-weight: 700; letter-spacing: -.02em; color: var(--text); }
.hero__fecha { margin-top: 3px; color: var(--text-soft); font-size: .9rem; }

/* --- Bandas --- */
.banda { display: flex; align-items: center; gap: 11px; flex-wrap: wrap; padding: 13px 16px; border-radius: var(--r-lg); font-size: .9rem; }
.banda--ok    { background: var(--success-soft, var(--info-soft)); color: var(--success); }
.banda--error { background: var(--danger-soft); color: var(--danger); }
.banda .btn, .banda button { margin-left: auto; }

/* --- Sección --- */
.seccion { display: flex; flex-direction: column; gap: 14px; }

/* --- Alertas --- */
.alertas { display: flex; flex-direction: row; gap: 10px; }
.alerta { display: flex; align-items: center; gap: 12px; padding: 5px 16px; border-radius: var(--r-lg); border: 1px solid transparent; }
.alerta__ico { flex-shrink: 0; display: inline-flex; }
.alerta__txt { flex: 1; font-size: .9rem; line-height: 1.35; }
.alerta--danger { background: var(--danger-soft); border-color: color-mix(in srgb, var(--danger) 25%, transparent); }
.alerta--danger .alerta__ico { color: var(--danger); }
.alerta--warn { background: var(--warn-soft); border-color: color-mix(in srgb, var(--warn) 25%, transparent); }
.alerta--warn .alerta__ico { color: var(--warn); }
.alerta--neutro { background: var(--info-soft); border-color: color-mix(in srgb, var(--info) 25%, transparent); }
.alerta--neutro .alerta__ico { color: var(--info); }

/* --- KPIs --- */
.grid-kpi { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
.sube { color: var(--success); font-weight: 600; }
.baja { color: var(--danger); font-weight: 600; }

/* --- Comparación --- */
.comparacion { display: flex; flex-direction: column; gap: 2px; }
.comp-header, .comp-fila { display: grid; grid-template-columns: 1fr auto auto; gap: 16px; align-items: baseline; padding: 8px 0; }
.comp-header { font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: var(--text-soft); border-bottom: 1px solid var(--border, #eee); }
.comp-fila { border-bottom: 1px dotted var(--border, #eee); font-size: .88rem; color: var(--text-soft); }
.comp-fila:last-child { border-bottom: 0; }
.comp-hoy { color: var(--text); font-weight: 700; min-width: 6rem; text-align: right; }
.dato { font-variant-numeric: tabular-nums; }

/* --- Eventos --- */
.tarjetas { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
.evento { padding: 16px; border-radius: var(--r-lg); border: 1px solid var(--border, #eee); background: var(--surface, #fff); }
.evento--urgente { border-color: color-mix(in srgb, var(--warn) 40%, transparent); }
.evento--sinstock { border-color: color-mix(in srgb, var(--danger) 40%, transparent); }
.evento__head { display: flex; align-items: center; justify-content: space-between; gap: 9px; margin-bottom: 3px; }
.evento__meta { font-size: .78rem; color: var(--text-soft); }
.evento__plata { display: flex; gap: 20px; margin-top: 12px; padding-top: 11px; border-top: 1px dashed var(--border, #eee); }
.evento__plata > div { display: flex; flex-direction: column; gap: 1px; }
.evento__plata span { font-size: .65rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--text-soft); }
.evento__plata b { font-size: .95rem; color: var(--text); }
.evento__falta { display: flex; align-items: center; gap: 6px; margin: 11px 0 0; padding: 8px 10px; border-radius: var(--r-md, 8px); background: var(--danger-soft); color: var(--danger); font-size: .78rem; line-height: 1.4; }
.rojo { color: var(--danger); }

@media (max-width: 768px) {
  .alertas { display: flex; flex-direction: column; gap: 10px; }
  .hero { flex-direction: column; align-items: stretch; gap: 16px; }
  .grid-kpi { grid-template-columns: 1fr; }
  .comp-header span:first-child, .comp-fila span:first-child { display: none; }
}
</style>