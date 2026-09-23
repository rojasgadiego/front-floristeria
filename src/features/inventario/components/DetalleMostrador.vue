<template>
  <!-- El acordeón de Inventario Venta: lo que hay ADELANTE, partida por
       partida. El de bodega (lotes, costos, movimientos) no sirve en el mesón
       y además le mostraba costos a quien vende. -->
  <div class="detalle">
    <div v-if="cargando" class="cargando">Cargando partidas…</div>

    <div v-else-if="error" class="vacio">{{ error }}</div>

    <p v-else-if="!partidas.length" class="vacio">
      No hay partidas de este producto en el mesón.
    </p>

    <template v-else>
      <h4>
        En el mesón
        <span class="nota">{{ total }} en {{ partidas.length }} partida(s)</span>
      </h4>

      <ul class="lista">
        <li v-for="(p, i) in partidas" :key="p.codigo" class="item">
          <!-- La primera es la que se vende primero: la que vence antes. -->
          <span class="orden" :class="{ primero: i === 0 }" aria-hidden="true">{{ i === 0 ? '▸' : '' }}</span>

          <div class="min0">
            <div class="codigo">{{ p.codigo }}</div>
            <div class="desglose">
              {{ clp(p.precioUnitario) }} c/u
              <span v-if="p.diasParaVencer != null" :class="claseVence(p.diasParaVencer)">
                · {{ textoVence(p.diasParaVencer) }}
              </span>
            </div>
          </div>

          <b class="dato">{{ p.cantidadDisponible }}</b>

          <router-link v-if="puedeEtiquetar" class="btn-etiqueta"
            :to="{ name: 'EtiquetasPartida', params: { codigo: p.codigo } }"
            :aria-label="`Imprimir etiqueta de ${p.codigo}`">
            🏷️ <span>Etiqueta</span>
          </router-link>
        </li>
      </ul>
    </template>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { inventarioVentaService } from '@/features/inventario/services/inventarioVenta.service'

export default {
  name: 'DetalleMostrador',
  props: {
    producto: { type: Object, required: true }
  },

  setup (props) {
    const store = useStore()

    const partidas = ref([])
    const cargando = ref(true)
    const error = ref('')

    /* La ruta de etiquetas pide permiso de inventario. */
    const puedeEtiquetar = computed(() => store.getters['auth/puede']('inventario'))

    const total = computed(() =>
      partidas.value.reduce((t, p) => t + (p.cantidadDisponible || 0), 0)
    )

    const claseVence = (d) => (d < 0 ? 'vencido' : d <= 1 ? 'pronto' : 'ok')

    const textoVence = (d) => {
      if (d < 0) return `venció hace ${Math.abs(d)}d`
      if (d === 0) return 'vence hoy'
      if (d === 1) return 'vence mañana'
      return `vence en ${d}d`
    }

    onMounted(async () => {
      try {
        const r = await inventarioVentaService.partidasDeProducto(props.producto.id)
        const lista = Array.isArray(r) ? r : (r?.items ?? [])
        partidas.value = lista.filter(p => p.cantidadDisponible > 0)
      } catch (e) {
        error.value = e.message || 'No se pudieron cargar las partidas.'
      } finally {
        cargando.value = false
      }
    })

    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    return { partidas, cargando, error, total, puedeEtiquetar, claseVence, textoVence, clp }
  }
}
</script>

<style scoped>
.detalle {
  padding: 12px 14px 14px;
}

.cargando,
.vacio {
  margin: 0;
  padding: 10px 0;
  color: var(--text-muted);
  font-size: .85rem;
}

h4 {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin: 0 0 8px;
  font-size: .66rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.nota {
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--text-faint);
  font-size: .78rem;
}

.lista {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--r-sm, 8px);
  background: var(--surface);
  overflow: hidden;
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.item:last-child { border-bottom: 0; }

.orden {
  width: 12px;
  flex-shrink: 0;
  color: var(--accent);
  font-weight: 700;
}

.min0 {
  flex: 1;
  min-width: 0;
}

.codigo {
  font-family: var(--font-mono);
  font-size: .85rem;
  font-weight: 700;
  color: var(--text);
}

.desglose {
  font-size: .76rem;
  color: var(--text-muted);
}

.vencido { color: var(--danger); font-weight: 700; }
.pronto { color: var(--warn); font-weight: 700; }

.dato {
  font-variant-numeric: tabular-nums;
  font-size: 1rem;
  color: var(--text);
}

.btn-etiqueta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm, 8px);
  background: var(--surface);
  color: var(--text-muted);
  font-size: .8rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.btn-etiqueta:hover {
  border-color: var(--accent);
  color: var(--accent-text, var(--accent));
}

/* En el celular el botón queda como ícono: la fila no alcanza para todo. */
@media (max-width: 420px) {
  .btn-etiqueta span { display: none; }
}
</style>
