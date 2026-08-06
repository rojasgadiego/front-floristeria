<template>
  <MainLayout>

    <div class="cabecera al-entrar">
      <div>
        <h2>Reportes</h2>
        <p class="pista">
          Qué dejó el período, qué productos rinden y cómo va el equipo.
        </p>
      </div>
      <div class="rango-controles">
        <label class="rango">
          <span class="mini suave">Desde</span>
          <input class="campo campo-fecha" type="date" :value="rango.desde"
            @change="cambiarRango({ desde: $event.target.value })">
        </label>
        <label class="rango">
          <span class="mini suave">Hasta</span>
          <input class="campo campo-fecha" type="date" :value="rango.hasta"
            @change="cambiarRango({ hasta: $event.target.value })">
        </label>
      </div>
    </div>

    <div class="atajos al-entrar" style="--i: 1">
      <button v-for="a in ATAJOS" :key="a.dias" class="atajo" :class="{ on: diasActuales === a.dias }"
        @click="cambiarRango({ desde: haceDias(a.dias), hasta: hoy() })">
        {{ a.texto }}
      </button>
    </div>

    <div v-if="error" class="banda banda-error">
      <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      <button class="btn btn-mini" @click="recargar">Reintentar</button>
    </div>

    <div v-if="cargando && !resultado" class="vacio">Calculando el período…</div>

    <template v-else-if="resultado">

      <!-- ================= CASCADA ================= 
           De lo que entró a lo que quedó. Cada línea explica por qué el
           número de abajo es menor que el de arriba: sin eso, "margen 42%"
           no dice de dónde salió. -->
      <section class="cascada al-entrar" style="--i: 2">
        <h3>Del bruto al resultado</h3>
        <div class="escalones">
          <div class="escalon">
            <span class="rot">Bruto</span>
            <b class="val">{{ clp(resultado.bruto) }}</b>
          </div>
          <div class="escalon resta">
            <span class="rot">Descuentos</span>
            <b class="val">−{{ clp(resultado.descuentos) }}</b>
          </div>
          <div class="escalon suma">
            <span class="rot">Ingresos</span>
            <b class="val">{{ clp(resultado.ingresos) }}</b>
          </div>
          <div class="escalon resta">
            <span class="rot">Costo vendido</span>
            <b class="val">−{{ clp(resultado.costoVendido) }}</b>
          </div>
          <div class="escalon">
            <span class="rot">Utilidad bruta</span>
            <b class="val">{{ clp(resultado.utilidadBruta) }}</b>
          </div>
          <div class="escalon resta">
            <span class="rot">Mermas</span>
            <b class="val">−{{ clp(resultado.mermas) }}</b>
          </div>
          <div class="escalon final">
            <span class="rot">Resultado</span>
            <b class="val" :class="{ rojo: resultado.resultado < 0 }">{{ clp(resultado.resultado) }}</b>
          </div>
        </div>

        <div class="indicadores">
          <div><span>Margen</span><b class="dato">{{ Number(resultado.margenPorcentaje).toFixed(1) }}%</b></div>
          <div>
            <span>Merma sobre ingresos</span>
            <b class="dato" :class="{ rojo: resultado.mermaPorcentaje > 5 }">
              {{ Number(resultado.mermaPorcentaje).toFixed(2) }}%
            </b>
          </div>
          <div><span>Boletas</span><b class="dato">{{ resultado.boletas }}</b></div>
          <div><span>Ticket promedio</span><b class="dato">{{ clp(resultado.ticketPromedio) }}</b></div>
          <div><span>Boletas por día</span><b class="dato">{{ Number(resultado.boletasPorDia).toFixed(1) }}</b></div>
        </div>

        <p v-if="resultado.mermaPorcentaje > 5" class="nota alerta">
          La merma pasó el 5% de los ingresos. En una florería eso suele
          significar que se está comprando más de lo que se alcanza a vender,
          no que la flor venga mala.
        </p>
      </section>

      <!-- ================= SERIE DIARIA ================= -->
      <section v-if="serie.length" class="panel al-entrar" style="--i: 3">
        <h3>Ingresos día a día</h3>
        <div class="grafico" role="img" :aria-label="`Ingresos diarios del período, máximo ${clp(maxSerie)}`">
          <div v-for="d in serie" :key="d.dia" class="columna"
            :title="`${fecha(d.dia)}: ${clp(d.ingresos)} · ${d.boletas} boletas`">
            <div class="barra" :style="{ height: barrasListas ? alturaDe(d.ingresos) : '0%' }"
              :class="{ negativa: d.resultado < 0 }"></div>
          </div>
        </div>
        <div class="grafico-pie mini suave">
          <span>{{ fecha(serie[0].dia) }}</span>
          <span>máximo {{ clp(maxSerie) }}</span>
          <span>{{ fecha(serie[serie.length - 1].dia) }}</span>
        </div>
      </section>

      <div class="columnas">

        <!-- ---------- Día de la semana ---------- -->
        <section v-if="porDiaSemana.length" class="panel al-entrar" style="--i: 4">
          <h3>Qué día rinde más</h3>
          <p class="ayuda">
            Promedio por jornada, no por boleta: dice cuánto rinde abrir ese día.
          </p>
          <div v-for="(d, ix) in porDiaSemana" :key="d.dia" class="barra-fila">
            <div class="barra-eti">
              <span class="capital">{{ d.nombre }}</span>
              <b class="dato">{{ clp(d.promedio) }}</b>
            </div>
            <div class="riel">
              <i :style="{
                width: barrasListas ? porcentaje(d.ingresos, porDiaSemana[0].ingresos) : '0%',
                transitionDelay: (ix * 55) + 'ms'
              }"></i>
            </div>
          </div>
        </section>

        <!-- ---------- Medios de pago ---------- -->
        <section v-if="porMedioPago.length" class="panel al-entrar" style="--i: 5">
          <h3>Cómo pagan</h3>
          <div v-for="(m, ix) in porMedioPago" :key="m.medioPago" class="barra-fila">
            <div class="barra-eti">
              <span class="capital">{{ m.medioPago }}</span>
              <b class="dato">{{ clp(m.total) }} · {{ Number(m.porcentaje).toFixed(0) }}%</b>
            </div>
            <div class="riel">
              <i class="azul" :style="{
                width: barrasListas ? m.porcentaje + '%' : '0%',
                transitionDelay: (ix * 55) + 'ms'
              }"></i>
            </div>
          </div>
        </section>
      </div>

      <!-- ================= PRODUCTOS ================= -->
      <section v-if="top.length" class="panel al-entrar" style="--i: 6">
        <h3>Lo que más deja</h3>
        <p class="ayuda">
          Ordenado por utilidad, no por ingresos: lo que más se vende no
          siempre es lo que más deja.
        </p>
        <div class="tabla-envoltura">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th class="der">Unidades</th>
                <th class="der">Ingresos</th>
                <th class="der">Costo</th>
                <th class="der">Utilidad</th>
                <th class="der">Margen</th>
                <th class="der">Mermado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in top" :key="p.productoId">
                <td data-label="Producto">
                  {{ p.emoji }} <b>{{ p.producto }}</b>
                  <div class="mini suave">en {{ p.apariciones }} boleta(s)</div>
                </td>
                <td data-label="Categoría" class="suave">{{ p.categoria }}</td>
                <td data-label="Unidades" class="der dato">{{ p.unidades }}</td>
                <td data-label="Ingresos" class="der dato">{{ clp(p.ingresos) }}</td>
                <td data-label="Costo" class="der dato suave">{{ clp(p.costo) }}</td>
                <td data-label="Utilidad" class="der dato">{{ clp(p.utilidad) }}</td>
                <td data-label="Margen" class="der dato">
                  <span :class="p.margenPorcentaje < 25 ? 'ambar' : 'verde'">
                    {{ Number(p.margenPorcentaje).toFixed(0) }}%
                  </span>
                </td>
                <td data-label="Mermado" class="der dato" :class="{ rojo: p.mermado > 0 }">
                  {{ p.mermado || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="columnas">

        <!-- ---------- Sin movimiento ---------- -->
        <section v-if="sinMovimiento.length" class="panel al-entrar" style="--i: 7">
          <h3>Plata dormida</h3>
          <p class="ayuda">
            Tiene stock y no se vendió en el período. Es la pregunta que nadie
            se hace hasta que la flor ya se perdió.
          </p>
          <ul class="lista">
            <li v-for="p in sinMovimiento" :key="p.productoId">
              <div class="min0">
                <b>{{ p.emoji }} {{ p.producto }}</b>
                <div class="mini suave">
                  {{ p.stock }} en stock ·
                  {{ p.diasSinVender != null ? `${p.diasSinVender} días sin vender` : 'nunca se ha vendido' }}
                </div>
              </div>
              <b class="dato">{{ clp(p.valorInmovilizado) }}</b>
            </li>
          </ul>
        </section>

        <!-- ---------- Categorías ---------- -->
        <section v-if="porCategoria.length" class="panel al-entrar" style="--i: 8">
          <h3>Por categoría</h3>
          <div v-for="(c, ix) in porCategoria" :key="c.categoria" class="barra-fila">
            <div class="barra-eti">
              <span>{{ c.categoria }}</span>
              <b class="dato">{{ clp(c.utilidad) }} de utilidad</b>
            </div>
            <div class="riel">
              <i class="rosa" :style="{
                width: barrasListas ? c.participacionPorcentaje + '%' : '0%',
                transitionDelay: (ix * 55) + 'ms'
              }"></i>
            </div>
            <div class="mini suave">{{ Number(c.participacionPorcentaje).toFixed(0) }}% de los ingresos</div>
          </div>
        </section>
      </div>

      <!-- ================= INVENTARIO ================= -->
      <section v-if="inventario" class="panel al-entrar" style="--i: 9">
        <h3>Plata en cámara ahora</h3>
        <div class="estados">
          <div class="estado sano">
            <span>Sano</span>
            <b class="dato">{{ clp(inventario.valorSano) }}</b>
          </div>
          <div class="estado tibio">
            <span>Por vencer</span>
            <b class="dato">{{ clp(inventario.valorPorVencer) }}</b>
            <em class="mini">Hay que moverlo esta semana</em>
          </div>
          <div class="estado frio">
            <span>Vencido</span>
            <b class="dato">{{ clp(inventario.valorVencido) }}</b>
            <em class="mini">Pérdida casi segura</em>
          </div>
          <div class="estado">
            <span>Recuperada</span>
            <b class="dato">{{ clp(inventario.valorRecuperado) }}</b>
          </div>
        </div>

        <div v-if="inventario.criticos.length" class="criticos">
          <h4>Lotes que exigen decisión hoy</h4>
          <ul class="lista">
            <li v-for="l in inventario.criticos" :key="l.loteId">
              <div class="min0">
                <b class="dato">{{ l.codigo }}</b> · {{ l.producto }}
                <div class="mini suave">
                  {{ l.varasDisponibles }} varas · {{ l.diasEnCamara }} días en cámara ·
                  <span :class="l.alerta === 'vencido' ? 'rojo' : 'ambar'">{{ l.alerta }}</span>
                </div>
              </div>
              <b class="dato">{{ clp(l.valorRestante) }}</b>
            </li>
          </ul>
        </div>
      </section>

      <!-- ================= EQUIPO ================= -->
      <section v-if="vendedores.length" class="panel al-entrar" style="--i: 10">
        <h3>Equipo</h3>
        <p class="ayuda">
          La diferencia de caja acumulada es el dato que más rinde: un turno
          descuadrado es un error de conteo, un patrón es otra cosa.
        </p>
        <div class="tabla-envoltura">
          <table>
            <thead>
              <tr>
                <th>Persona</th>
                <th class="der">Turnos</th>
                <th class="der">Boletas</th>
                <th class="der">Vendido</th>
                <th class="der">Ticket</th>
                <th class="der">Descuentos</th>
                <th class="der">Anuladas</th>
                <th class="der">Dif. de caja</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in vendedores" :key="v.usuarioId"
                :class="{ ojo: v.turnosDescuadrados > 1 }">
                <td data-label="Persona">
                  <b>{{ v.nombre }}</b>
                  <div class="mini suave">{{ v.rol }}</div>
                </td>
                <td data-label="Turnos" class="der dato">{{ v.turnos }}</td>
                <td data-label="Boletas" class="der dato">{{ v.boletas }}</td>
                <td data-label="Vendido" class="der dato">{{ clp(v.totalVendido) }}</td>
                <td data-label="Ticket" class="der dato">{{ clp(v.ticketPromedio) }}</td>
                <td data-label="Descuentos" class="der dato">{{ clp(v.descuentosOtorgados) }}</td>
                <td data-label="Anuladas" class="der dato" :class="{ ambar: v.boletasAnuladas > 0 }">
                  {{ v.boletasAnuladas || '—' }}
                </td>
                <td data-label="Dif. de caja" class="der dato"
                  :class="v.diferenciaCajaAcumulada < 0 ? 'rojo' : (v.diferenciaCajaAcumulada > 0 ? 'ambar' : '')">
                  {{ v.diferenciaCajaAcumulada ? clp(v.diferenciaCajaAcumulada) : 'cuadrado' }}
                  <div v-if="v.turnosDescuadrados" class="mini suave">
                    {{ v.turnosDescuadrados }} de {{ v.turnos }} turno(s)
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

  </MainLayout>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import MainLayout from '@/layouts/MainLayout.vue'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'
import { haceDias, hoy } from '@/core/utils/fechas'

const ATAJOS = [
  { dias: 7, texto: 'Última semana' },
  { dias: 30, texto: 'Últimos 30 días' },
  { dias: 90, texto: 'Últimos 3 meses' },
  { dias: 365, texto: 'Último año' }
]

export default {
  name: 'ReportesView',
  components: { MainLayout },

  setup () {
    const store = useStore()
    const { espera } = useTemporizadores()

    const resultado = computed(() => store.getters['reportes/resultado'])
    const serie = computed(() => store.getters['reportes/serie'])
    const porDiaSemana = computed(() => store.getters['reportes/porDiaSemana'])
    const porMedioPago = computed(() => store.getters['reportes/porMedioPago'])
    const top = computed(() => store.getters['reportes/top'])
    const sinMovimiento = computed(() => store.getters['reportes/sinMovimiento'])
    const porCategoria = computed(() => store.getters['reportes/porCategoria'])
    const inventario = computed(() => store.getters['reportes/inventario'])
    const vendedores = computed(() => store.getters['reportes/vendedores'])
    const rango = computed(() => store.getters['reportes/rango'])
    const cargando = computed(() => store.getters['reportes/cargando'])
    const error = computed(() => store.getters['reportes/error'])

    /* ---------------- Carga ---------------- */
    const barrasListas = ref(false)
    let control = null

    onMounted(async () => {
      control = new AbortController()
      await store.dispatch('reportes/cargarAnalisis', { signal: control.signal })
      await nextTick()
      await espera(120)
      barrasListas.value = true
    })

    onUnmounted(() => control?.abort())

    const recargar = () => store.dispatch('reportes/cargarAnalisis')

    const cambiarRango = async (cambios) => {
      /* Las barras vuelven a cero y crecen de nuevo: así el movimiento
         cuenta que el período cambió, en vez de saltar al valor nuevo. */
      barrasListas.value = false
      await store.dispatch('reportes/cambiarRango', cambios)
      await nextTick()
      barrasListas.value = true
    }

    const diasActuales = computed(() => {
      const d = new Date(rango.value.desde)
      const h = new Date(rango.value.hasta)
      return Math.round((h - d) / 86400000)
    })

    /* ---------------- Gráfico ---------------- */
    const maxSerie = computed(() =>
      serie.value.reduce((m, d) => Math.max(m, d.ingresos), 0)
    )

    /* Mínimo 2%: un día con venta baja tiene que verse distinto de uno sin
       ninguna venta, y a escala real ambos serían una línea invisible. */
    const alturaDe = (valor) =>
      maxSerie.value > 0 ? `${Math.max(2, (valor / maxSerie.value) * 100)}%` : '0%'

    const porcentaje = (valor, maximo) =>
      maximo > 0 ? `${Math.max(2, (valor / maximo) * 100)}%` : '0%'

    /* ---------------- Utilidades ---------------- */
    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    const fmtFecha = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit' })
    const fecha = (v) => (v ? fmtFecha.format(new Date(v)) : '—')

    watch(serie, () => { /* mantiene la reactividad del gráfico al recargar */ })

    return {
      ATAJOS, Math, Number, haceDias, hoy,
      resultado, serie, porDiaSemana, porMedioPago,
      top, sinMovimiento, porCategoria, inventario, vendedores,
      rango, cargando, error, recargar, cambiarRango, diasActuales,
      barrasListas, maxSerie, alturaDe, porcentaje,
      clp, fecha
    }
  }
}
</script>

<style scoped>
.cabecera,
.cabecera *,
.panel *,
.cascada * {
  box-sizing: border-box;
}

@keyframes entra {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}

.al-entrar {
  animation: entra 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: calc(var(--i, 0) * 45ms);
}

/* ---------- Encabezado ---------- */
.cabecera {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 14px;
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
}

.rango-controles { display: flex; gap: 10px; flex-wrap: wrap; }
.rango { display: flex; flex-direction: column; gap: 3px; }

.campo {
  min-height: 42px;
  padding: 0.5rem 0.7rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: #fff;
  font-family: inherit;
  font-size: max(0.88rem, 16px);
  color: #0f172a;
  outline: none;
}

.campo:focus {
  border-color: transparent;
  box-shadow: 0 0 0 2px #10b981;
}

.campo-fecha { min-width: 148px; }

.atajos {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.atajo {
  padding: 7px 13px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #fff;
  color: #475569;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}

.atajo:hover { border-color: #94a3b8; }

.atajo.on {
  background: #064e3b;
  border-color: #064e3b;
  color: #fff;
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

.banda .btn { margin-left: auto; }

/* ---------- Paneles ---------- */
.panel,
.cascada {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 16px;
}

.panel h3,
.cascada h3 {
  margin: 0 0 12px;
  font-size: 0.95rem;
  color: #0f172a;
}

.panel h4 {
  margin: 18px 0 9px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64748b;
}

.ayuda {
  margin: -6px 0 14px;
  font-size: 0.78rem;
  color: #94a3b8;
  line-height: 1.5;
}

.columnas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  align-items: start;
}

.columnas .panel { margin-bottom: 0; }

/* ---------- Cascada ---------- */
.escalones {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-bottom: 16px;
}

.escalon {
  flex: 1 1 130px;
  padding: 11px 13px;
  background: #f8fafc;
  border-radius: 8px;
}

.escalon .rot {
  display: block;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #94a3b8;
}

.escalon .val {
  display: block;
  margin-top: 3px;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}

.escalon.resta { background: #fef2f2; }
.escalon.resta .val { color: #b91c1c; }
.escalon.suma { background: #f0fdf4; }

.escalon.final {
  background: #064e3b;
  flex-basis: 100%;
}

.escalon.final .rot { color: #6ee7b7; }
.escalon.final .val { color: #fff; font-size: 1.4rem; }
.escalon.final .val.rojo { color: #fca5a5; }

.indicadores {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 13px 14px;
  background: #f8fafc;
  border-radius: 9px;
}

.indicadores > div { display: flex; flex-direction: column; gap: 1px; }

.indicadores span {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
}

.indicadores b { font-size: 1rem; color: #0f172a; }

.nota {
  padding: 11px 13px;
  margin-top: 14px;
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

/* ---------- Gráfico de barras verticales ---------- */
.grafico {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 150px;
  padding: 0 2px;
}

.columna {
  flex: 1;
  min-width: 3px;
  height: 100%;
  display: flex;
  align-items: flex-end;
}

.barra {
  width: 100%;
  background: #059669;
  border-radius: 2px 2px 0 0;
  transition: height 0.62s cubic-bezier(0.22, 1, 0.36, 1);
}

.barra.negativa { background: #dc2626; }

.grafico-pie {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

/* ---------- Barras horizontales ---------- */
.barra-fila { margin-bottom: 12px; }

.barra-eti {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 0.8rem;
  margin-bottom: 5px;
}

.barra-eti span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.barra-eti b { white-space: nowrap; }

.riel {
  height: 7px;
  background: #f1f5f9;
  border-radius: 99px;
  overflow: hidden;
}

.riel i {
  display: block;
  height: 100%;
  width: 0;
  background: #059669;
  border-radius: 99px;
  transition: width 0.62s cubic-bezier(0.22, 1, 0.36, 1);
}

.riel i.azul { background: #1d4ed8; }
.riel i.rosa { background: #be185d; }

/* Los nombres de día vienen en minúscula desde el servidor */
.capital::first-letter { text-transform: uppercase; }

/* ---------- Listas ---------- */
.lista {
  list-style: none;
  margin: 0;
  padding: 0;
}

.lista li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 9px 0;
  border-bottom: 1px dotted #e2e8f0;
  font-size: 0.85rem;
}

.lista li:last-child { border-bottom: 0; }
.lista li b { color: #0f172a; }

.min0 { min-width: 0; }

/* ---------- Estados del inventario ---------- */
.estados {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 11px;
}

.estado {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 13px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.estado span {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
}

.estado b { font-size: 1.15rem; color: #0f172a; }
.estado em { font-style: normal; color: #64748b; }

.estado.sano { background: #f0fdf4; border-color: #86efac; }
.estado.tibio { background: #fffbeb; border-color: #fcd34d; }
.estado.frio { background: #fef2f2; border-color: #fca5a5; }

.criticos { margin-top: 6px; }

/* ---------- Tablas ---------- */
.tabla-envoltura {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  overflow-x: auto;
}

table { width: 100%; border-collapse: collapse; }

th {
  text-align: left;
  padding: 10px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.63rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64748b;
  white-space: nowrap;
}

td {
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.84rem;
  vertical-align: middle;
}

tbody tr:last-child td { border-bottom: 0; }

/* Un patrón de descuadres merece verse, no esconderse en una columna */
tbody tr.ojo td { background: #fffbeb; }

.der { text-align: right; }
.suave { color: #64748b; }
.mini { font-size: 0.75rem; }
.rojo { color: #dc2626; }
.ambar { color: #b45309; }
.verde { color: #047857; }

.dato { font-variant-numeric: tabular-nums; font-weight: 600; }

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

.btn:hover:not(:disabled) { background: #047857; }

.btn-mini {
  min-height: 34px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}

.vacio {
  text-align: center;
  padding: 44px 20px;
  color: #64748b;
  background: #fff;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
}

/* ---------- Móvil ---------- */
@media (max-width: 860px) {
  .escalon { flex-basis: calc(50% - 2px); }

  table, thead, tbody, tr, td { display: block; width: 100%; }
  thead { display: none; }

  tbody tr {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    margin-bottom: 9px;
    padding: 10px;
  }

  tbody tr.ojo td { background: transparent; }
  tbody tr.ojo { border-color: #fcd34d; background: #fffbeb; }

  td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 5px 0;
    border: none;
    text-align: right;
  }

  td::before {
    content: attr(data-label);
    font-size: 0.63rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #94a3b8;
    text-align: left;
    flex-shrink: 0;
  }

  td[data-label="Producto"], td[data-label="Persona"] {
    display: block;
    text-align: left;
  }

  td[data-label="Producto"]::before,
  td[data-label="Persona"]::before { content: none; }
}

@media (prefers-reduced-motion: reduce) {
  .btn, .atajo, .barra, .riel i { transition: none; }
  .al-entrar { animation: none; }
}
</style>