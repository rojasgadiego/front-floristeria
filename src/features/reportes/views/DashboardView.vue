<template>
  <MainLayout>

    <div class="cabecera al-entrar">
      <div>
        <h2>Hola, {{ primerNombre }}</h2>
        <p class="pista">{{ fechaLarga }}</p>
      </div>
      <button class="btn btn-linea" :disabled="cargando" @click="recargar">
        {{ cargando ? 'Actualizando…' : '↻ Actualizar' }}
      </button>
    </div>

    <div v-if="error" class="banda banda-error">
      <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      <button class="btn btn-mini" @click="recargar">Reintentar</button>
    </div>

    <div v-if="cargando && !panel" class="vacio">Cargando el panel…</div>

    <template v-else-if="panel">

      <!-- ================= ALERTAS =================
           Van primero porque es lo único de esta pantalla que pide una
           acción hoy. El resultado del día se puede mirar después. -->
      <section v-if="alertas.length" class="alertas">
        <article v-for="(a, ix) in alertas" :key="a.tipo" class="alerta al-entrar"
          :class="claseUrgencia(a.urgencia)" :style="{ '--i': ix }">
          <span class="alerta-icono" aria-hidden="true">{{ iconoAlerta(a.tipo) }}</span>
          <p class="alerta-texto">{{ a.mensaje }}</p>
          <router-link v-if="destino(a.tipo)" class="btn btn-mini" :to="destino(a.tipo)">
            Resolver
          </router-link>
        </article>
      </section>

      <div v-else class="banda banda-ok al-entrar">
        <span aria-hidden="true">✅</span>
        <span>Nada urgente por ahora. Ni lotes vencidos, ni faltantes, ni cobros atrasados.</span>
      </div>

      <!-- ================= EL DÍA ================= -->
      <div class="kpis">
        <div class="kpi destacado al-entrar" style="--i: 1">
          <div class="rot">Ingresos de hoy</div>
          <div class="val">{{ clp(hoyDia.ingresos) }}</div>
          <div class="pie">
            <span v-if="variacionSemanal != null" :class="variacionSemanal >= 0 ? 'sube' : 'baja'">
              {{ variacionSemanal >= 0 ? '▲' : '▼' }}
              {{ Math.abs(variacionSemanal).toFixed(1) }}%
            </span>
            <span v-else>Sin referencia</span>
            contra el mismo día la semana pasada
          </div>
        </div>

        <div class="kpi al-entrar" style="--i: 2">
          <div class="rot">Boletas</div>
          <div class="val">{{ hoyDia.boletas }}</div>
          <div class="pie">Ticket promedio {{ clp(hoyDia.ticketPromedio) }}</div>
        </div>

        <!--
          `resultado` ya descuenta las mermas: es lo que quedó del día, no la
          utilidad bruta. Mostrar la bruta acá haría ver mejores días de los
          que fueron.
        -->
        <div class="kpi al-entrar" style="--i: 3">
          <div class="rot">Resultado del día</div>
          <div class="val" :class="hoyDia.resultado < 0 ? 'rojo' : ''">{{ clp(hoyDia.resultado) }}</div>
          <div class="pie">
            Margen {{ Number(hoyDia.margenPorcentaje).toFixed(0) }}%
            <span v-if="hoyDia.mermas"> · {{ clp(hoyDia.mermas) }} en mermas</span>
          </div>
        </div>

        <div class="kpi al-entrar" style="--i: 4" :class="{ resaltado: caja && caja.abierta }">
          <div class="rot">Caja</div>
          <template v-if="caja && caja.abierta">
            <div class="val">{{ clp(caja.efectivoEsperado) }}</div>
            <div class="pie">
              Abierta por {{ caja.responsable }} · {{ hora(caja.abiertaEn) }}
            </div>
          </template>
          <template v-else>
            <div class="val suave">Cerrada</div>
            <div class="pie">Ábrela para empezar a vender</div>
          </template>
        </div>
      </div>

      <!-- Comparación con la semana pasada -->
      <div v-if="semanaPasada" class="comparacion al-entrar" style="--i: 5">
        <h3>Contra el {{ nombreDia }} pasado</h3>
        <div class="filas">
          <div class="fila">
            <span>Ingresos</span>
            <b class="dato">{{ clp(semanaPasada.ingresos) }}</b>
            <span class="hoy dato">{{ clp(hoyDia.ingresos) }}</span>
          </div>
          <div class="fila">
            <span>Boletas</span>
            <b class="dato">{{ semanaPasada.boletas }}</b>
            <span class="hoy dato">{{ hoyDia.boletas }}</span>
          </div>
          <div class="fila">
            <span>Ticket promedio</span>
            <b class="dato">{{ clp(semanaPasada.ticketPromedio) }}</b>
            <span class="hoy dato">{{ clp(hoyDia.ticketPromedio) }}</span>
          </div>
        </div>
      </div>

      <!-- ================= EVENTOS ================= -->
      <section v-if="proximosEventos.length" class="eventos al-entrar" style="--i: 6">
        <h3>Lo que viene</h3>
        <div class="tarjetas">
          <article v-for="e in proximosEventos" :key="e.cotizacionId" class="evento"
            :class="{ urgente: e.diasParaEvento <= 2, sinStock: e.productosFaltantes > 0 }">
            <header>
              <b>{{ e.cliente }}</b>
              <span class="cuando" :class="{ pronto: e.diasParaEvento <= 2 }">
                {{ textoDias(e.diasParaEvento) }}
              </span>
            </header>
            <div class="mini suave">
              {{ e.tipoEvento }} · {{ e.folio }} · {{ fecha(e.fechaEvento) }}
            </div>

            <div class="evento-plata">
              <div>
                <span>Total</span>
                <b class="dato">{{ clp(e.total) }}</b>
              </div>
              <div v-if="e.saldo > 0">
                <span>Saldo</span>
                <b class="dato rojo">{{ clp(e.saldo) }}</b>
              </div>
            </div>

            <!--
              Es la alerta más valiosa del panel: todavía hay tiempo de
              comprar. Después del evento ya no sirve de nada.
            -->
            <p v-if="e.productosFaltantes > 0" class="evento-falta">
              ⚠️ {{ e.productosFaltantes }} producto(s) que el stock no cubre
            </p>
          </article>
        </div>
      </section>

      <div v-else class="vacio suave">
        No hay eventos agendados para las próximas dos semanas.
      </div>
    </template>

  </MainLayout>
</template>

<script>
import { computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import MainLayout from '@/layouts/MainLayout.vue'
import { destinoAlerta, CLASE_URGENCIA } from '@/features/reportes/store/reportes.module'

const ICONOS = {
  lote_vencido: '🥀',
  lote_por_vencer: '⏳',
  lote_rezagado: '📦',
  bajo_minimo: '📉',
  cobro_vencido: '💸',
  evento_sin_stock: '🌸'
}

export default {
  name: 'DashboardView',
  components: { MainLayout },

  setup () {
    const store = useStore()

    const primerNombre = computed(() =>
      (store.getters['auth/currentUser']?.name || '').split(' ')[0] || 'hola'
    )

    const panel = computed(() => store.getters['reportes/panel'])
    const hoyDia = computed(() => store.getters['reportes/hoy'] || {})
    const semanaPasada = computed(() => store.getters['reportes/semanaPasada'])
    const variacionSemanal = computed(() => store.getters['reportes/variacionSemanal'])
    const caja = computed(() => store.getters['reportes/caja'])
    const alertas = computed(() => store.getters['reportes/alertas'])
    const proximosEventos = computed(() => store.getters['reportes/proximosEventos'])
    const cargando = computed(() => store.getters['reportes/cargandoPanel'])
    const error = computed(() => store.getters['reportes/error'])

    let control = null

    onMounted(() => {
      control = new AbortController()
      store.dispatch('reportes/cargarPanel', { signal: control.signal })
      /* La caja y las alertas cambian con cada venta: volver a la pestaña
         después de un rato debería mostrar algo actual. */
      window.addEventListener('focus', revalidar)
    })

    onUnmounted(() => {
      control?.abort()
      window.removeEventListener('focus', revalidar)
    })

    const revalidar = () => store.dispatch('reportes/revalidarPanel')
    const recargar = () => store.dispatch('reportes/cargarPanel')

    const destino = (tipo) => destinoAlerta(tipo)
    const claseUrgencia = (u) => CLASE_URGENCIA[u] || 'urg-baja'
    const iconoAlerta = (t) => ICONOS[t] || '•'

    /* ---------------- Fechas ---------------- */
    const fechaLarga = computed(() => {
      const texto = new Intl.DateTimeFormat('es-CL', {
        weekday: 'long', day: 'numeric', month: 'long'
      }).format(new Date())
      /* Sin capitalize de CSS: en español rompe los acentos de algunos
         locales y además capitalizaría también el mes. */
      return texto.charAt(0).toUpperCase() + texto.slice(1)
    })

    const nombreDia = computed(() =>
      new Intl.DateTimeFormat('es-CL', { weekday: 'long' }).format(new Date())
    )

    const fmtFecha = new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: '2-digit'
    })
    const fecha = (v) => (v ? fmtFecha.format(new Date(v)) : '—')

    const fmtHora = new Intl.DateTimeFormat('es-CL', {
      hour: '2-digit', minute: '2-digit'
    })
    const hora = (v) => (v ? fmtHora.format(new Date(v)) : '—')

    const textoDias = (d) => {
      if (d <= 0) return 'Hoy'
      if (d === 1) return 'Mañana'
      return `En ${d} días`
    }

    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    return {
      Math, Number,
      primerNombre, panel, hoyDia, semanaPasada, variacionSemanal, caja,
      alertas, proximosEventos, cargando, error, recargar,
      destino, claseUrgencia, iconoAlerta,
      fechaLarga, nombreDia, fecha, hora, textoDias, clp
    }
  }
}
</script>

<style scoped>
.cabecera,
.cabecera *,
.kpis *,
.alertas *,
.eventos * {
  box-sizing: border-box;
}

@keyframes entra {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}

.al-entrar {
  animation: entra 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: calc(var(--i, 0) * 55ms);
}

/* ---------- Encabezado ---------- */
.cabecera {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.cabecera h2 {
  margin: 0;
  font-size: clamp(1.3rem, 5vw, 1.6rem);
  color: #0f172a;
}

.pista {
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: #64748b;
}

/* ---------- Alertas ---------- */
.alertas {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-bottom: 20px;
}

.alerta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border-radius: 11px;
  border: 1px solid;
  font-size: 0.9rem;
  line-height: 1.5;
}

.alerta-icono { font-size: 1.2rem; flex-shrink: 0; }
.alerta-texto { margin: 0; flex: 1; min-width: 0; }
.alerta .btn { flex-shrink: 0; }

.urg-alta {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #991b1b;
}

.urg-media {
  background: #fef3c7;
  border-color: #fcd34d;
  color: #78350f;
}

.urg-baja {
  background: #f1f5f9;
  border-color: #e2e8f0;
  color: #475569;
}

.banda {
  display: flex;
  align-items: center;
  gap: 11px;
  flex-wrap: wrap;
  padding: 13px 16px;
  border-radius: 11px;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.banda-ok {
  background: #f0fdf4;
  border: 1px solid #86efac;
  color: #166534;
}

.banda-error {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #991b1b;
}

.banda .btn { margin-left: auto; }

/* ---------- KPIs ---------- */
.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 13px;
  margin-bottom: 20px;
}

.kpi {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 17px;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.kpi:hover {
  border-color: #cbd5e1;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.kpi .rot {
  font-size: 0.67rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.kpi .val {
  font-size: clamp(1.35rem, 5vw, 1.7rem);
  font-weight: 700;
  margin-top: 5px;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
}

.kpi .val.suave { color: #94a3b8; }
.kpi .val.rojo { color: #dc2626; }

.kpi .pie {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 4px;
  line-height: 1.45;
}

.kpi.destacado {
  background: #064e3b;
  border-color: #064e3b;
}

.kpi.destacado .rot { color: #6ee7b7; }
.kpi.destacado .val { color: #fff; }
.kpi.destacado .pie { color: #a7f3d0; }

.kpi.resaltado { border-color: #6ee7b7; background: #f0fdf4; }

.sube { color: #6ee7b7; font-weight: 700; }
.baja { color: #fca5a5; font-weight: 700; }

/* ---------- Comparación ---------- */
.comparacion {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 17px;
  margin-bottom: 20px;
}

.comparacion h3 {
  margin: 0 0 12px;
  font-size: 0.95rem;
  color: #0f172a;
}

.filas { display: flex; flex-direction: column; gap: 2px; }

.fila {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 16px;
  align-items: baseline;
  padding: 7px 0;
  border-bottom: 1px dotted #f1f5f9;
  font-size: 0.85rem;
  color: #64748b;
}

.fila:last-child { border-bottom: 0; }
.fila b { color: #94a3b8; }
.fila .hoy { color: #0f172a; font-weight: 700; min-width: 6rem; text-align: right; }

/* ---------- Eventos ---------- */
.eventos h3 {
  margin: 0 0 12px;
  font-size: 0.95rem;
  color: #0f172a;
}

.tarjetas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

.evento {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 15px;
}

.evento.urgente { border-color: #fcd34d; }
.evento.sinStock { border-color: #fca5a5; }

.evento header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  margin-bottom: 3px;
}

.evento header b { color: #0f172a; font-size: 0.95rem; min-width: 0; }

.cuando {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  white-space: nowrap;
}

.cuando.pronto { background: #fef3c7; color: #92400e; }

.evento-plata {
  display: flex;
  gap: 20px;
  margin-top: 12px;
  padding-top: 11px;
  border-top: 1px dashed #e2e8f0;
}

.evento-plata > div { display: flex; flex-direction: column; gap: 1px; }

.evento-plata span {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
}

.evento-plata b { font-size: 0.95rem; color: #0f172a; }

.evento-falta {
  margin: 11px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.78rem;
  line-height: 1.45;
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
  text-decoration: none;
  transition: background-color 0.2s;
}

.btn:hover:not(:disabled) { background: #047857; }
.btn:disabled { background: #a7c9bb; cursor: not-allowed; }

.btn-linea {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #475569;
}

.btn-linea:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }

.btn-mini {
  min-height: 34px;
  padding: 0.35rem 0.8rem;
  font-size: 0.8rem;
}

/* ---------- Varios ---------- */
.dato { font-variant-numeric: tabular-nums; font-weight: 600; }
.mini { font-size: 0.78rem; }
.suave { color: #64748b; }
.rojo { color: #dc2626; }

.vacio {
  text-align: center;
  padding: 34px 20px;
  color: #64748b;
  background: #fff;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .alerta { flex-wrap: wrap; }
  .alerta .btn { margin-left: auto; }
  .fila { grid-template-columns: 1fr auto; }
  .fila b { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .btn, .kpi { transition: none; }
  .al-entrar { animation: none; }
}
</style>