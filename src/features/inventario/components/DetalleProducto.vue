<template>
  <div class="detalle">
    <div v-if="cargando" class="cargando">Cargando…</div>

    <template v-else>
      <!-- ═══ La receta, si es armado ═══
           Es lo que define el costo y lo que permite armarlo y desarmarlo.
           Un armado sin receta no se puede montar ni recuperar. -->
      <section v-if="producto.tipo === 'armado'" class="bloque">
        <h4>
          Qué lleva
          <span v-if="receta.length" class="nota">
            {{ receta.length }} componente(s)
          </span>
        </h4>

        <div v-if="receta.length" class="lista">
          <div v-for="l in receta" :key="l.componenteId" class="item">
            <span class="emoji" aria-hidden="true">{{ l.emoji }}</span>
            <div class="min0">
              <div class="nombre">{{ l.cantidad }} × {{ l.componente }}</div>
              <div class="desglose">
                {{ clp(l.costoUnitario) }} c/u
                <!-- Si un componente no alcanza, el armado no se puede
                     montar aunque el resto sobre. -->
                <span v-if="l.disponible < l.cantidad" class="falta">
                  · solo hay {{ l.disponible }}
                </span>
              </div>
            </div>
            <b class="dato">{{ clp(l.costoLinea) }}</b>
          </div>

          <div class="total-linea">
            <span>Cuesta armar uno</span>
            <b class="dato">{{ clp(costoReceta) }}</b>
          </div>

          <!-- El costo guardado es una foto del momento en que se cargó la
               receta. Si las flores subieron, el margen del catálogo quedó
               viejo y el precio se está calculando contra un número que ya
               no existe. -->
          <p v-if="costoDesfasado" class="aviso">
            El catálogo dice que cuesta {{ clp(producto.costoEfectivo) }}, pero
            hoy sus componentes suman {{ clp(costoReceta) }}. Vuelve a guardar
            la receta para actualizarlo.
          </p>

          <p v-if="cuantosSePuedenArmar !== null" class="pie-bloque">
            Con lo que hay en bodega se pueden armar
            <b>{{ cuantosSePuedenArmar }}</b>.
          </p>
        </div>

        <p v-else class="vacio">
          Sin receta. No se puede armar ni desarmar hasta que se le agregue
          una.
        </p>
      </section>

      <!-- ═══ Los lotes, si controla lotes ═══
           Responde de dónde sale el stock: qué balde, cuánto costó y cuándo
           vence. Es lo que la grilla resume en un número. -->
      <section v-if="producto.controlaLotes" class="bloque">
        <h4>
          De dónde sale el stock
          <span v-if="lotes.length" class="nota">
            {{ lotes.length }} lote(s) activo(s)
          </span>
        </h4>

        <div v-if="lotes.length" class="lista">
          <div v-for="(l, i) in lotes" :key="l.id" class="item">
            <!-- El primero es el que toca por antigüedad. Marcarlo evita
                 abrir el balde nuevo teniendo uno a medias. -->
            <span class="orden" :class="{ primero: i === 0 }" aria-hidden="true">
              {{ i === 0 ? '▸' : '' }}
            </span>
            <div class="min0">
              <div class="nombre mono">{{ l.codigo }}</div>
              <div class="desglose">
                {{ clp(l.costoPorVara) }} c/u
                <template v-if="l.proveedor"> · {{ l.proveedor }}</template>
                <template v-if="l.ubicacion"> · {{ l.ubicacion }}</template>
              </div>
            </div>
            <span v-if="l.diasParaVencer != null" class="chip"
              :class="claseVence(l.diasParaVencer)">
              {{ textoVence(l.diasParaVencer) }}
            </span>
            <b class="dato">{{ l.varasDisponibles }}</b>
          </div>

          <div class="total-linea">
            <span>{{ varasTotales }} varas · valorizadas en</span>
            <b class="dato">{{ clp(valorLotes) }}</b>
          </div>
        </div>

        <p v-else class="vacio">
          Sin lotes activos. El stock que aparece arriba entró antes de que
          este producto manejara lotes, o vino de una recuperación.
        </p>
      </section>

      <!-- ═══ Lo que no controla lotes ni es armado ═══ -->
      <section v-if="!producto.controlaLotes && producto.tipo !== 'armado'" class="bloque">
        <h4>Stock</h4>
        <p class="simple">
          Este producto no maneja lotes: el stock es un número que sube con
          las compras y baja con las ventas, sin trazabilidad por balde.
        </p>
      </section>

      <!-- ═══ Movimientos ═══
           Responde "por qué bajó el stock" sin salir de la pantalla. -->
      <section v-if="movimientos.length" class="bloque">
        <h4>Últimos movimientos</h4>
        <div class="lista">
          <div v-for="m in movimientos" :key="m.id" class="item">
            <span class="signo" :class="m.cantidad > 0 ? 'mas' : 'menos'">
              {{ m.cantidad > 0 ? '+' : '' }}{{ m.cantidad }}
            </span>
            <div class="min0">
              <div class="nombre">{{ m.motivo }}</div>
              <div class="desglose">
                {{ fecha(m.creadoEn) }}
                <template v-if="m.usuario"> · {{ m.usuario }}</template>
                <template v-if="m.loteCodigo"> · <span class="mono">{{ m.loteCodigo }}</span></template>
              </div>
            </div>
            <span class="chip chico" :class="'mov-' + m.tipo">{{ m.tipo }}</span>
          </div>
        </div>
      </section>

      <div v-if="puedeEditar" class="acciones">
        <button class="btn btn-linea btn-mini" @click="$emit('editar', producto)">
          Editar ficha
        </button>
        <button v-if="producto.tipo === 'armado'" class="btn btn-linea btn-mini"
          @click="$emit('armar', producto)">
          Armar unidades
        </button>
        <button v-if="producto.enBodega > 0" class="btn btn-linea btn-mini"
          @click="$emit('traspasar', producto)">
          Bajar al mostrador
        </button>
      </div>
    </template>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { productosService } from '@/features/inventario/services/productos.service'
import { lotesService } from '@/features/lotes/services/lotes.service'

export default {
  name: 'DetalleProducto',
  props: {
    producto: { type: Object, required: true },
    puedeEditar: { type: Boolean, default: false }
  },
  emits: ['editar', 'armar', 'traspasar'],

  setup (props) {
    const store = useStore()

    const receta = ref([])
    const lotes = ref([])
    const movimientos = ref([])
    const cargando = ref(true)

    /* ---------------- Receta ---------------- */

    const costoReceta = computed(() =>
      receta.value.reduce((t, l) => t + Number(l.costoLinea || 0), 0)
    )

    /* El costo guardado es una foto del momento en que se cargó la receta.
       Si las flores subieron, el margen del catálogo quedó viejo. Se avisa
       sobre un 5% de diferencia: menos que eso es redondeo. */
    const costoDesfasado = computed(() => {
      const guardado = Number(props.producto.costoEfectivo || 0)
      if (!guardado || !costoReceta.value) return false
      return Math.abs(costoReceta.value - guardado) / guardado > 0.05
    })

    /* Cuántas unidades alcanzan los componentes. El límite lo pone el que
       menos alcanza, no el promedio: falta uno y no se arma ninguno. */
    const cuantosSePuedenArmar = computed(() => {
      if (!receta.value.length) return null
      return Math.min(...receta.value.map(l => Math.floor(l.disponible / l.cantidad)))
    })

    /* ---------------- Lotes ---------------- */

    const varasTotales = computed(() =>
      lotes.value.reduce((t, l) => t + (l.varasDisponibles || 0), 0)
    )

    const valorLotes = computed(() =>
      lotes.value.reduce((t, l) => t + l.varasDisponibles * Number(l.costoPorVara || 0), 0)
    )

    const claseVence = (d) => (d < 0 ? 'vencido' : d <= 2 ? 'pronto' : 'ok')

    const textoVence = (d) => {
      if (d < 0) return `venció hace ${Math.abs(d)}d`
      if (d === 0) return 'vence hoy'
      return `${d}d`
    }

    /* ---------------- Carga ---------------- */

    /* Todo bajo demanda: pedir la receta y los lotes de diecisiete productos
       que nadie va a expandir sería trabajo perdido. */
    onMounted(async () => {
      const tareas = []

      if (props.producto.tipo === 'armado') {
        tareas.push(
          productosService.receta(props.producto.id)
            .then(r => { receta.value = r })
            .catch(() => { receta.value = [] })
        )
      }

      if (props.producto.controlaLotes) {
        tareas.push(
          lotesService.listar({ productoId: props.producto.id, tamano: 20 })
            .then(r => {
              lotes.value = (r.items || []).filter(l => l.varasDisponibles > 0)
            })
            .catch(() => { lotes.value = [] })
        )
      }

      tareas.push(
        store.dispatch('inventario/movimientosDe', {
          productoId: props.producto.id, tamano: 6
        })
          .then(r => { movimientos.value = r?.items ?? r ?? [] })
          .catch(() => { movimientos.value = [] })
      )

      await Promise.all(tareas)
      cargando.value = false
    })

    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    const fecha = (iso) => (iso
      ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
      : '—')

    return {
      Math,
      receta, lotes, movimientos, cargando,
      costoReceta, costoDesfasado, cuantosSePuedenArmar,
      varasTotales, valorLotes, claseVence, textoVence,
      clp, fecha
    }
  }
}
</script>

<style scoped>
.detalle {
  padding: 16px 18px;
  background: var(--surface-2);
}

.min0 { min-width: 0; }
.mono { font-family: var(--font-mono); font-size: .95em; }

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  flex-shrink: 0;
}

.desglose {
  font-size: .73rem;
  color: var(--text-faint);
  margin-top: 1px;
}

/* ─── Bloques ─── */

.bloque { margin-bottom: 18px; }
.bloque:last-of-type { margin-bottom: 0; }

.detalle h4 {
  display: flex;
  align-items: baseline;
  gap: 9px;
  font-size: .66rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-faint);
  margin-bottom: 9px;
}

.nota {
  font-size: .72rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--text-muted);
}

.lista {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--border);
  font-size: .85rem;
}

.item:last-child { border-bottom: 0; }

.item .emoji { font-size: 1.15rem; flex-shrink: 0; }
.item .min0 { flex: 1; }
.item .nombre { font-weight: 600; }

.total-linea {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: var(--surface-2);
  border-top: 1px solid var(--border-strong);
  font-size: .82rem;
  color: var(--text-muted);
}

.total-linea .dato { font-size: 1rem; color: var(--text); }

.falta { color: var(--danger); font-weight: 600; }

/* El primero de la fila FIFO: marcarlo evita abrir el balde nuevo teniendo
   uno a medias. */
.orden {
  width: 12px;
  flex-shrink: 0;
  color: var(--text-faint);
  font-size: .85rem;
}

.orden.primero { color: var(--accent-text); }

.signo {
  min-width: 40px;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: .88rem;
}

.signo.mas { color: var(--success); }
.signo.menos { color: var(--danger); }

/* ─── Avisos ─── */

.aviso {
  padding: 10px 13px;
  margin-top: 10px;
  background: var(--warn-soft);
  border-left: 3px solid var(--warn);
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
  font-size: .78rem;
  line-height: 1.55;
  color: var(--warn);
}

.pie-bloque {
  margin-top: 9px;
  font-size: .78rem;
  color: var(--text-muted);
}

.vacio,
.simple {
  padding: 14px 16px;
  background: var(--surface);
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-sm);
  font-size: .8rem;
  line-height: 1.55;
  color: var(--text-muted);
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
  padding: 2px 9px;
  border-radius: var(--r-full);
  font-size: .7rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.chip.chico { padding: 1px 7px; font-size: .64rem; text-transform: capitalize; }

.chip.ok      { background: var(--surface-2);   color: var(--text-muted); }
.chip.pronto  { background: var(--warn-soft);   color: var(--warn); }
.chip.vencido { background: var(--danger-soft); color: var(--danger); }

.mov-venta   { background: var(--success-soft); color: var(--success); }
.mov-merma   { background: var(--danger-soft);  color: var(--danger); }
.mov-alta    { background: var(--info-soft);    color: var(--info); }
.mov-ajuste  { background: var(--surface-2);    color: var(--text-muted); }
.mov-entrada { background: var(--info-soft);    color: var(--info); }
.mov-salida  { background: var(--warn-soft);    color: var(--warn); }

/* ─── Acciones ─── */

.acciones {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: .4rem .9rem;
  border: none;
  border-radius: var(--r-sm);
  background: var(--accent);
  color: var(--accent-contrast);
  font: inherit;
  font-size: .84rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--t-fast);
}

.btn-linea {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.btn-linea:hover { background: var(--surface); color: var(--text); }

@media (max-width: 860px) {
  .detalle { padding: 14px; }

  /* Los botones ocupan la línea: con el pulgar, tres botones chicos lado a
     lado se aciertan mal. */
  .acciones .btn { flex: 1 1 100%; min-height: 44px; }
}
</style>
