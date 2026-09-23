<template>
  <div class="reportes">
    <header class="cabecera">
      <div class="min0">
        <h1>Reportes</h1>
        <p class="pista">
          {{ esAdmin
            ? 'Qué dejó el periodo, qué productos rinden y cómo va el equipo.'
            : 'Cuánto hay en cámara y en el mostrador, y qué se está por perder.' }}
        </p>
      </div>
    </header>

    <!-- Periodo en línea en el escritorio; en el celular, en una card en
         columna. Igual que los filtros de las otras pantallas. El
         inventario no depende del periodo: es la foto de hoy. -->
    <div v-if="esAdmin" class="barra-filtros">
      <select class="campo-select on" :value="preset" aria-label="Periodo" @change="aplicarPreset($event.target.value)">
        <option v-for="p in PRESETS" :key="p.clave" :value="p.clave">{{ p.texto }}</option>
      </select>

      <template v-if="preset === 'personalizado'">
        <input type="date" class="campo-fecha" aria-label="Desde" :value="rango.desde" :max="rango.hasta"
          @change="cambiarRango({ desde: $event.target.value })">
        <input type="date" class="campo-fecha" aria-label="Hasta" :value="rango.hasta" :min="rango.desde"
          :max="hoy()" @change="cambiarRango({ hasta: $event.target.value })">
      </template>

      <span v-if="resultado" class="periodo-texto">
        {{ fechaLarga(resultado.desde) }} – {{ fechaLarga(resultado.hasta) }} · {{ resultado.dias }} días
      </span>
    </div>

    <div v-if="error" class="banda banda-error">
      <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      <button class="btn btn-mini" @click="recargar">Reintentar</button>
    </div>

    <!-- ═══════════════ RESULTADO (admin) ═══════════════ -->
    <template v-if="esAdmin">
      <div v-if="cargandoResultado && !resultado" class="vacio">Calculando el periodo…</div>

      <template v-else-if="resultado">
        <!-- De lo que entró a lo que quedó. Cada escalón explica por qué el
             de abajo es menor: sin eso, "margen 42%" no dice de dónde salió. -->
        <section class="panel">
          <h2>Del bruto al resultado</h2>

          <div class="escalones">
            <div class="escalon">
              <span class="rot">Venta bruta</span>
              <b class="val">{{ clp(resultado.ingresos + resultado.descuentos) }}</b>
            </div>
            <div class="escalon resta">
              <span class="rot">Descuentos</span>
              <b class="val">−{{ clp(resultado.descuentos) }}</b>
            </div>
            <div class="escalon">
              <span class="rot">Ingresos</span>
              <b class="val">{{ clp(resultado.ingresos) }}</b>
            </div>
            <div class="escalon resta">
              <span class="rot">Costo de lo vendido</span>
              <b class="val">−{{ clp(resultado.costoVentas) }}</b>
            </div>
            <div class="escalon">
              <span class="rot">Utilidad bruta</span>
              <b class="val">{{ clp(resultado.utilidadBruta) }}</b>
            </div>
            <div class="escalon resta">
              <span class="rot">Mermas</span>
              <b class="val">−{{ clp(resultado.merma) }}</b>
            </div>
            <div class="escalon final" :class="{ negativo: resultado.resultado < 0 }">
              <span class="rot">Resultado</span>
              <b class="val">{{ clp(resultado.resultado) }}</b>
              <span class="pie">Antes de arriendo, sueldos y gastos que el sistema no conoce.</span>
            </div>
          </div>

          <div class="indicadores">
            <div><span class="rot">Margen</span><b class="dato">{{ pct(resultado.margen) }}</b></div>
            <div>
              <span class="rot">Merma / ingresos</span>
              <b class="dato" :class="{ rojo: mermaSobreIngresos > 5 }">{{ pct(mermaSobreIngresos, 2) }}</b>
            </div>
            <div><span class="rot">Boletas</span><b class="dato">{{ resultado.boletas }}</b></div>
            <div><span class="rot">Ticket promedio</span><b class="dato">{{ clp(resultado.ticketPromedio) }}</b></div>
            <div><span class="rot">Boletas por día</span><b class="dato">{{ Number(resultado.boletasPorDia).toFixed(1) }}</b></div>
            <div v-if="resultado.anuladas">
              <span class="rot">Anuladas</span>
              <b class="dato ambar">{{ resultado.anuladas }} · {{ clp(resultado.montoAnulado) }}</b>
            </div>
          </div>

          <p v-if="mermaSobreIngresos > 5" class="nota alerta">
            La merma pasó el 5% de los ingresos. En una florería eso suele
            significar que se compra más de lo que se alcanza a vender, no que
            la flor venga mala.
          </p>
        </section>

        <!-- Ingresos por día: una sola serie, en el color de acento. -->
        <section v-if="serie.length" class="panel">
          <h2>Ingresos día a día</h2>
          <div class="grafico" role="img" :aria-label="`Ingresos diarios del periodo. Máximo ${clp(maxSerie)}.`">
            <div v-for="d in serie" :key="d.dia" class="columna" :title="`${fechaCorta(d.dia)} · ${clp(d.vendido)} · ${d.boletas} boleta(s)`">
              <div class="barra" :class="{ vacia: !d.vendido }" :style="{ height: alto(d.vendido, maxSerie) }"></div>
            </div>
          </div>
          <div class="eje">
            <span>{{ fechaCorta(serie[0].dia) }}</span>
            <span>máximo {{ clp(maxSerie) }}</span>
            <span>{{ fechaCorta(serie[serie.length - 1].dia) }}</span>
          </div>
        </section>

        <div class="columnas">
          <!-- Promedio por jornada: cuánto rinde abrir ese día, no cuánto se
               vendió en total (un periodo puede tener más lunes que martes). -->
          <section v-if="porDiaSemana.some(d => d.promedio)" class="panel">
            <h2>Qué día rinde más</h2>
            <p class="ayuda">Promedio por jornada del periodo.</p>
            <div v-for="d in porDiaSemana" :key="d.dia" class="fila-barra">
              <div class="fila-eti">
                <span>{{ d.nombre }}</span>
                <b class="dato">{{ clp(d.promedio) }}</b>
              </div>
              <div class="riel"><i :style="{ width: ancho(d.promedio, maxDiaSemana) }"></i></div>
            </div>
          </section>

          <section v-if="mediosPago.length" class="panel">
            <h2>Cómo pagan</h2>
            <div v-for="m in mediosPago" :key="m.clave" class="fila-barra">
              <div class="fila-eti">
                <span>{{ m.texto }}</span>
                <b class="dato">{{ clp(m.monto) }} · {{ pct(m.parte, 0) }}</b>
              </div>
              <div class="riel"><i :style="{ width: m.parte + '%' }"></i></div>
            </div>
          </section>
        </div>

        <section v-if="porCategoria.length" class="panel">
          <h2>Por categoría</h2>
          <p class="ayuda">La barra es la parte de los ingresos; el número, lo que dejó.</p>
          <div v-for="c in porCategoria" :key="c.categoria" class="fila-barra">
            <div class="fila-eti">
              <span>{{ c.categoria }}</span>
              <b class="dato">{{ clp(c.utilidad) }} · margen {{ pct(c.margen, 0) }}</b>
            </div>
            <div class="riel"><i :style="{ width: ancho(c.ingresos, resultado.ingresos) }"></i></div>
          </div>
        </section>
      </template>

      <!-- ═══════════════ PRODUCTOS ═══════════════ -->
      <section v-if="productos.length" class="panel">
        <h2>Lo que más deja</h2>
        <p class="ayuda">
          Ordenado por utilidad, no por ingresos: lo que más se vende no siempre
          es lo que más deja. En ámbar, margen bajo el 25%: conviene revisar el
          precio o el proveedor. En rojo, se vende bajo el costo.
        </p>

        <div class="tabla-envoltura">
          <table>
            <thead>
              <tr>
                <th class="izq">Producto</th>
                <th>Unidades</th>
                <th>Ingresos</th>
                <th>Costo</th>
                <th>Utilidad</th>
                <th>Margen</th>
                <th>Mermado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in productosTop" :key="p.productoId">
                <td class="izq" data-label="Producto">
                  <div class="prod">
                    <span aria-hidden="true">{{ p.emoji }}</span>
                    <b>{{ p.producto }}</b>
                  </div>
                  <div class="desglose">{{ p.categoria || 'Sin categoría' }} · {{ p.boletas }} boleta(s)</div>
                </td>
                <td data-label="Unidades" class="dato">{{ p.unidades }}</td>
                <td data-label="Ingresos" class="dato">{{ clp(p.ingresos) }}</td>
                <td data-label="Costo" class="dato suave">{{ clp(p.costo) }}</td>
                <td data-label="Utilidad" class="dato">{{ clp(p.utilidad) }}</td>
                <td data-label="Margen">
                  <span class="chip" :class="p.margen < 0 ? 'malo' : (p.margen < 25 ? 'medio' : 'bueno')">{{ pct(p.margen, 0) }}</span>
                </td>
                <td data-label="Mermado" class="dato" :class="{ rojo: p.mermaUnidades }">
                  <template v-if="p.mermaUnidades">{{ p.mermaUnidades }} · {{ clp(p.mermaCosto) }}</template>
                  <span v-else class="tenue">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="productos.length > productosTop.length" class="mini suave pie-tabla">
          Los {{ productosTop.length }} que más dejan, de {{ productos.length }} productos vendidos.
        </p>
      </section>

      <!-- ═══════════════ EQUIPO ═══════════════ -->
      <section v-if="equipoActivo.length" class="panel">
        <h2>Equipo</h2>
        <p class="ayuda">
          La diferencia de caja acumulada es el dato que más dice: un turno
          descuadrado es un error de conteo; un patrón es otra cosa.
        </p>

        <div class="tabla-envoltura">
          <table>
            <thead>
              <tr>
                <th class="izq">Persona</th>
                <th>Boletas</th>
                <th>Vendido</th>
                <th>Ticket</th>
                <th>Descuentos</th>
                <th>Anuladas</th>
                <th>Dif. de caja</th>
                <th>Mermas</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in equipoActivo" :key="v.usuarioId" :class="{ ojo: v.turnosDescuadrados > 1 }">
                <td class="izq" data-label="Persona">
                  <b>{{ v.usuario }}</b>
                  <div class="desglose">{{ v.rol }} · {{ v.turnos }} turno(s)</div>
                </td>
                <td data-label="Boletas" class="dato">{{ v.boletas }}</td>
                <td data-label="Vendido" class="dato">{{ clp(v.vendido) }}</td>
                <td data-label="Ticket" class="dato">{{ clp(v.ticketPromedio) }}</td>
                <td data-label="Descuentos" class="dato">{{ clp(v.descuentosDados) }}</td>
                <td data-label="Anuladas" class="dato" :class="{ ambar: v.anuladas }">{{ v.anuladas || '—' }}</td>
                <td data-label="Dif. de caja" class="dato"
                  :class="v.diferenciaAcumulada < 0 ? 'rojo' : (v.diferenciaAcumulada > 0 ? 'ambar' : '')">
                  <span class="celda">
                    {{ v.diferenciaAbsoluta ? clp(v.diferenciaAcumulada) : 'cuadrado' }}
                    <span v-if="v.turnosDescuadrados" class="desglose">
                      {{ v.turnosDescuadrados }} de {{ v.turnos }} descuadrado(s)
                    </span>
                  </span>
                </td>
                <td data-label="Mermas" class="dato">
                  <span v-if="v.mermas" class="celda">
                    {{ v.mermas }} · {{ clp(v.mermaCosto) }}
                    <span v-if="v.mermasSinEscanear" class="desglose">{{ v.mermasSinEscanear }} a mano</span>
                  </span>
                  <span v-else class="tenue">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <!-- ═══════════════ INVENTARIO (todos) ═══════════════ -->
    <div v-if="cargandoInventario && !inventario" class="vacio">Valorizando el inventario…</div>

    <section v-else-if="inventario" class="panel">
      <h2>Plata en cámara ahora</h2>
      <p class="ayuda">A costo. La foto de hoy: no depende del periodo.</p>

      <div class="estados">
        <div class="estado">
          <span class="rot">En bodega</span>
          <b class="val">{{ clp(inventario.valorBodega) }}</b>
          <span class="pie">{{ inventario.varasEnBodega }} vara(s) · {{ inventario.lotesActivos }} lote(s)</span>
        </div>
        <div class="estado">
          <span class="rot">En el mostrador</span>
          <b class="val">{{ clp(inventario.valorMostrador) }}</b>
          <span class="pie">{{ inventario.varasEnMostrador }} vara(s)</span>
        </div>
        <div class="estado" :class="{ tibio: inventario.valorPorVencer > 0 }">
          <span class="rot">Por vencer</span>
          <b class="val">{{ clp(inventario.valorPorVencer) }}</b>
          <span class="pie">{{ inventario.lotesPorVencer }} lote(s) · moverlo esta semana</span>
        </div>
        <div class="estado" :class="{ frio: inventario.valorVencido > 0 }">
          <span class="rot">Vencido</span>
          <b class="val">{{ clp(inventario.valorVencido) }}</b>
          <span class="pie">{{ inventario.lotesVencidos }} lote(s) · pérdida casi segura</span>
        </div>
      </div>

      <div class="indicadores">
        <div><span class="rot">Total a costo</span><b class="dato">{{ clp(inventario.valorTotal) }}</b></div>
        <div v-if="esAdmin"><span class="rot">A precio de venta</span><b class="dato">{{ clp(inventario.valorVenta) }}</b></div>
        <div v-if="inventario.diasDeStock != null">
          <span class="rot">Alcanza para</span><b class="dato">{{ Math.round(inventario.diasDeStock) }} días</b>
        </div>
        <div>
          <span class="rot">Bajo el mínimo</span>
          <b class="dato" :class="{ ambar: inventario.bajoMinimo }">{{ inventario.bajoMinimo }}</b>
        </div>
        <div>
          <span class="rot">Sin stock</span>
          <b class="dato" :class="{ rojo: inventario.sinStock }">{{ inventario.sinStock }}</b>
        </div>
      </div>

      <template v-if="inventario.porCategoria?.length">
        <h3>Por categoría</h3>
        <div v-for="c in inventario.porCategoria" :key="c.categoria" class="fila-barra">
          <div class="fila-eti">
            <span>{{ c.categoria }}</span>
            <b class="dato">{{ clp(c.valor) }} · {{ c.varas }} vara(s)</b>
          </div>
          <div class="riel"><i :style="{ width: ancho(c.valor, totalInvCategorias) }"></i></div>
        </div>
      </template>
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { haceDias, hoy } from '@/core/utils/fechas'

const PRESETS = [
  { clave: '7', texto: 'Últimos 7 días' },
  { clave: '30', texto: 'Últimos 30 días' },
  { clave: '90', texto: 'Últimos 3 meses' },
  { clave: '365', texto: 'Último año' },
  { clave: 'personalizado', texto: 'Otro rango' }
]

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const MEDIOS = [
  { clave: 'efectivo', texto: 'Efectivo' },
  { clave: 'debito', texto: 'Débito' },
  { clave: 'credito', texto: 'Crédito' },
  { clave: 'transferencia', texto: 'Transferencia' }
]

/* 'YYYY-MM-DD' en hora local. new Date('2026-09-01') es medianoche UTC, que
   en Chile todavía es el 31. */
const aFecha = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default {
  name: 'ReportesView',

  setup () {
    const store = useStore()

    const esAdmin = computed(() => store.getters['auth/esAdmin'])

    const resultado = computed(() => store.getters['reportes/resultado'])
    const productos = computed(() => store.getters['reportes/productos'])
    const equipo = computed(() => store.getters['reportes/equipo'])
    const inventario = computed(() => store.getters['reportes/inventario'])
    const rango = computed(() => store.getters['reportes/rango'])
    const cargandoResultado = computed(() => store.getters['reportes/cargandoResultado'])
    const cargandoInventario = computed(() => store.getters['reportes/cargandoInventario'])
    const error = computed(() => store.getters['reportes/error'])

    /* ---------------- Periodo ---------------- */

    const diasDelRango = computed(() => {
      const { desde, hasta } = rango.value
      if (!desde || !hasta) return null
      return Math.round((aFecha(hasta) - aFecha(desde)) / 86400000) + 1
    })

    /* "Otro rango" se recuerda aunque el rango calce con un atajo: si no,
       elegirlo viniendo de "30 días" no mostraría nunca los campos de fecha. */
    const manual = ref(false)
    const preset = computed(() => {
      if (manual.value || rango.value.hasta !== hoy()) return 'personalizado'
      const p = PRESETS.find(x => String(diasDelRango.value) === x.clave)
      return p ? p.clave : 'personalizado'
    })

    const cambiarRango = (cambios) => store.dispatch('reportes/cambiarRango', cambios)

    const aplicarPreset = (clave) => {
      manual.value = clave === 'personalizado'
      if (manual.value) return
      cambiarRango({ desde: haceDias(Number(clave) - 1), hasta: hoy() })
    }

    /* ---------------- Derivados ---------------- */

    const mermaSobreIngresos = computed(() => {
      const r = resultado.value
      return r?.ingresos ? (r.merma / r.ingresos) * 100 : 0
    })

    /* Todos los días del rango, también los sin venta: un hueco en el
       gráfico es información (se cerró, o no vino nadie). */
    const serie = computed(() => {
      const r = resultado.value
      if (!r?.desde || !r?.hasta) return []
      const porDia = new Map((r.porDia || []).map(d => [String(d.dia).slice(0, 10), d]))
      const out = []
      for (let f = aFecha(r.desde); f <= aFecha(r.hasta); f.setDate(f.getDate() + 1)) {
        const clave = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
        out.push(porDia.get(clave) ?? { dia: clave, vendido: 0, boletas: 0 })
      }
      return out
    })

    const maxSerie = computed(() => Math.max(0, ...serie.value.map(d => d.vendido)))

    /* Promedio por jornada: total vendido ese día de la semana dividido
       por cuántas veces cayó en el periodo. Lunes a domingo. */
    const porDiaSemana = computed(() => {
      const acum = DIAS.map(() => ({ total: 0, veces: 0 }))
      for (const d of serie.value) {
        const w = aFecha(d.dia).getDay()
        acum[w].total += d.vendido
        acum[w].veces += 1
      }
      return [1, 2, 3, 4, 5, 6, 0].map(w => ({
        dia: w,
        nombre: DIAS[w],
        promedio: acum[w].veces ? Math.round(acum[w].total / acum[w].veces) : 0
      }))
    })

    const maxDiaSemana = computed(() => Math.max(0, ...porDiaSemana.value.map(d => d.promedio)))

    const mediosPago = computed(() => {
      const r = resultado.value
      if (!r) return []
      const total = MEDIOS.reduce((t, m) => t + (r[m.clave] || 0), 0)
      if (!total) return []
      return MEDIOS
        .map(m => ({ ...m, monto: r[m.clave] || 0, parte: ((r[m.clave] || 0) / total) * 100 }))
        .filter(m => m.monto > 0)
        .sort((a, b) => b.monto - a.monto)
    })

    const porCategoria = computed(() =>
      [...(resultado.value?.porCategoria || [])].sort((a, b) => b.ingresos - a.ingresos))

    const productosTop = computed(() => productos.value.slice(0, 15))

    /* Quien no vendió, no abrió caja ni registró mermas en el periodo no
       tiene nada que mostrar: una fila de ceros solo empuja hacia abajo a
       quien sí. */
    const equipoActivo = computed(() =>
      equipo.value.filter(v => v.boletas || v.turnos || v.mermas))

    /* La base de las barras es la suma de las categorías (lo que está en
       bodega): contra el total, que incluye el mostrador, ninguna llegaba
       al 100% aunque fuera la única. */
    const totalInvCategorias = computed(() =>
      (inventario.value?.porCategoria || []).reduce((t, c) => t + (c.valor || 0), 0))

    /* ---------------- Carga ---------------- */

    let control = null

    const cargar = () => {
      control?.abort()
      control = new AbortController()
      const señal = { signal: control.signal }
      store.dispatch('reportes/cargarInventario', señal)
      if (esAdmin.value) store.dispatch('reportes/cargarPeriodo', señal)
    }

    onMounted(() => {
      /* Sin rango, los últimos 30 días: así los campos de fecha muestran lo
         que la API calcula en vez de quedar vacíos. */
      if (!rango.value.desde) store.commit('reportes/SET_RANGO', { desde: haceDias(29), hasta: hoy() })
      cargar()
    })

    onUnmounted(() => control?.abort())

    const recargar = () => {
      store.commit('reportes/SET_ERROR', null)
      cargar()
    }

    /* ---------------- Formato ---------------- */

    const fmt = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
    /* El signo va antes del peso: "−$4.311", no "$-4.311". */
    const clp = (n) => {
      const v = Math.round(n || 0)
      return v < 0 ? `−${fmt.format(-v)}` : fmt.format(v)
    }
    const pct = (n, dec = 1) => `${Number(n || 0).toFixed(dec)}%`

    const fechaCorta = (s) => aFecha(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
    const fechaLarga = (s) => aFecha(s).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })

    /* Mínimo 2%: un día con poca venta tiene que verse distinto de uno sin
       ninguna, y a escala real serían la misma línea invisible. */
    const alto = (v, max) => (max > 0 && v > 0 ? `${Math.max(2, (v / max) * 100)}%` : '0')
    const ancho = (v, max) => (max > 0 && v > 0 ? `${Math.max(2, Math.min(100, (v / max) * 100))}%` : '0')

    return {
      PRESETS, Math, Number, hoy,
      esAdmin, resultado, productos, productosTop, equipoActivo, totalInvCategorias, inventario, rango,
      cargandoResultado, cargandoInventario, error,
      preset, aplicarPreset, cambiarRango, recargar,
      mermaSobreIngresos, serie, maxSerie, porDiaSemana, maxDiaSemana, mediosPago, porCategoria,
      clp, pct, fechaCorta, fechaLarga, alto, ancho
    }
  }
}
</script>

<style scoped>
.reportes {
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: var(--text);
}

.min0 { min-width: 0; }
.izq { text-align: left; }
.suave { color: var(--text-muted); }
.tenue { color: var(--text-faint); }
.mini { font-size: .78rem; }
.rojo { color: var(--danger); }
.ambar { color: var(--warn); }

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.rot {
  display: block;
  font-size: .64rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.desglose {
  font-size: .73rem;
  font-weight: 400;
  color: var(--text-faint);
  margin-top: 1px;
}

.ayuda {
  font-size: .8rem;
  color: var(--text-muted);
  line-height: 1.55;
  margin: 4px 0 14px;
  max-width: 70ch;
}

/* ─── Cabecera ─── */

h1 {
  font-size: clamp(1.2rem, 5vw, 1.5rem);
  font-weight: 700;
  letter-spacing: -.02em;
}

.pista {
  margin-top: 4px;
  font-size: .85rem;
  color: var(--text-muted);
}

/* ─── Periodo ─── */

.barra-filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.campo-select {
  min-height: 44px;
  padding: 0 34px 0 14px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background:
    var(--surface)
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")
    no-repeat right 13px center;
  color: var(--text-muted);
  font: inherit;
  font-size: max(.85rem, 16px);
  font-weight: 600;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.campo-select.on {
  border-color: var(--accent);
  background-color: var(--accent-soft);
  color: var(--accent-text);
}

.campo-fecha {
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: max(.85rem, 16px);
}

.campo-select:focus-visible,
.campo-fecha:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.periodo-texto {
  margin-left: auto;
  font-size: .8rem;
  color: var(--text-muted);
}

/* ─── Paneles ─── */

.panel {
  padding: 18px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
}

.panel h2 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.panel h2 + .ayuda { margin-top: -8px; }

.panel h3 {
  margin: 18px 0 10px;
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.columnas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 14px;
  align-items: start;
}

/* ─── Cascada ─── */

.escalones {
  display: grid;
  /* Columnas fijas y no auto-fit: el escalón final ocupa toda la fila, y
     con auto-fit eso reservaba una columna vacía a la derecha. */
  grid-template-columns: repeat(6, 1fr);
  gap: 2px;
  border-radius: var(--r-sm);
  overflow: hidden;
}

.escalon {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 14px;
  background: var(--surface-2);
}

.escalon .val {
  font-size: 1.02rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.escalon.resta .val { color: var(--danger); }

.escalon.final {
  grid-column: 1 / -1;
  background: var(--accent-soft);
}

.escalon.final .rot { color: var(--accent-text); }

.escalon.final .val {
  font-size: 1.45rem;
  color: var(--accent-text);
}

.escalon.final.negativo { background: var(--danger-soft); }
.escalon.final.negativo .rot,
.escalon.final.negativo .val { color: var(--danger); }

.escalon .pie {
  font-size: .74rem;
  color: var(--text-muted);
}

.indicadores {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 24px;
  margin-top: 14px;
  padding: 13px 15px;
  background: var(--surface-2);
  border-radius: var(--r-sm);
}

.indicadores > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.indicadores b { font-size: 1rem; }

.nota {
  margin-top: 14px;
  padding: 11px 14px;
  border-left: 3px solid var(--info);
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
  background: var(--info-soft);
  font-size: .82rem;
  line-height: 1.55;
}

.nota.alerta {
  border-color: var(--warn);
  background: var(--warn-soft);
  color: var(--warn);
}

/* ─── Barras verticales (una serie) ───
   Esquinas de 4px arriba, 2px entre barras, base visible. */

.grafico {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 160px;
  border-bottom: 1px solid var(--border);
}

.columna {
  flex: 1;
  min-width: 2px;
  height: 100%;
  display: flex;
  align-items: flex-end;
  cursor: default;
}

.barra {
  width: 100%;
  background: var(--accent);
  border-radius: 4px 4px 0 0;
  transition: height .5s cubic-bezier(.22, 1, .36, 1), opacity var(--t-fast);
}

.columna:hover .barra { opacity: .75; }

.eje {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  font-size: .72rem;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

/* ─── Barras horizontales ─── */

.fila-barra { margin-bottom: 12px; }
.fila-barra:last-child { margin-bottom: 0; }

.fila-eti {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 5px;
  font-size: .82rem;
}

.fila-eti span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fila-eti b { white-space: nowrap; }

.riel {
  height: 8px;
  background: var(--surface-2);
  border-radius: var(--r-full);
  overflow: hidden;
}

.riel i {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: var(--r-full);
  transition: width .5s cubic-bezier(.22, 1, .36, 1);
}

/* ─── Inventario ─── */

.estados {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.estado {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 13px 15px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
}

.estado .val {
  font-size: 1.15rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.estado .pie {
  font-size: .74rem;
  color: var(--text-muted);
}

.estado.tibio { background: var(--warn-soft); border-color: var(--warn-border); }
.estado.tibio .rot, .estado.tibio .val { color: var(--warn); }
.estado.frio { background: var(--danger-soft); border-color: var(--danger-border); }
.estado.frio .rot, .estado.frio .val { color: var(--danger); }

/* ─── Tablas ─── */

.tabla-envoltura {
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  overflow: auto;
}

table {
  width: 100%;
  min-width: 720px;
  border-collapse: separate;
  border-spacing: 0;
}

th {
  padding: 10px 12px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  font-size: .66rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--text-muted);
  text-align: right;
  white-space: nowrap;
}

th.izq { text-align: left; }

td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  font-size: .85rem;
  text-align: right;
  vertical-align: middle;
  white-space: nowrap;
}

td.izq { text-align: left; }

tbody tr:last-child td { border-bottom: 0; }

/* Un patrón de descuadres merece verse, no esconderse en una columna. */
tbody tr.ojo td { background: var(--warn-soft); }

.prod {
  display: flex;
  align-items: center;
  gap: 7px;
}

.pie-tabla { margin-top: 10px; }

/* Un valor con su detalle debajo, alineado a la derecha. */
.celda {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
}

.chip {
  display: inline-block;
  padding: 2px 9px;
  border-radius: var(--r-full);
  font-size: .72rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.chip.bueno { background: var(--success-soft); color: var(--success); }
.chip.medio { background: var(--warn-soft); color: var(--warn); }
.chip.malo { background: var(--danger-soft); color: var(--danger); }

/* ─── Varios ─── */

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

.banda .btn { margin-left: auto; }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: .35rem .85rem;
  border: none;
  border-radius: var(--r-sm);
  background: var(--accent);
  color: var(--accent-contrast);
  font: inherit;
  font-size: .82rem;
  font-weight: 600;
  cursor: pointer;
}

.btn:hover { background: var(--accent-hover); }

.vacio {
  padding: 44px 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: .88rem;
  background: var(--surface);
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-md);
}

/* ─── Móvil ─── */

@media (max-width: 1100px) {
  .escalones { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 860px) {
  /* El periodo en una card, en columna, a todo el ancho. */
  .barra-filtros {
    flex-direction: column;
    align-items: stretch;
    padding: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
  }

  .periodo-texto {
    margin-left: 0;
    text-align: center;
  }

  .panel { padding: 15px; }

  .escalones { grid-template-columns: repeat(2, 1fr); }

  /* Las tablas se vuelven tarjetas: cada celda con su etiqueta. */
  .tabla-envoltura { border: 0; overflow: visible; }
  table { min-width: 0; }
  table, thead, tbody, tr, td { display: block; width: 100%; }
  thead { display: none; }

  tbody tr {
    padding: 10px 12px;
    margin-bottom: 8px;
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    background: var(--surface);
  }

  tbody tr.ojo { border-color: var(--warn-border); background: var(--warn-soft); }
  tbody tr.ojo td { background: transparent; }

  td {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding: 4px 0;
    border: 0;
    white-space: normal;
  }

  td::before {
    content: attr(data-label);
    flex-shrink: 0;
    font-size: .64rem;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  td.izq {
    display: block;
    padding-bottom: 6px;
  }

  td.izq::before { content: none; }
}

@media (prefers-reduced-motion: reduce) {
  .barra, .riel i { transition: none; }
}
</style>
