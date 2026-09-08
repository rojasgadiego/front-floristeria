<template>
  <div class="menu-inv">
    <h2>Inventario</h2>
    <!-- <p class="pista">Elige qué quieres revisar.</p> -->

    <div class="grilla">
      <router-link v-for="c in cards" :key="c.clave" :to="{ name: c.ruta }" class="card" :class="`tono-${c.color}`">
        <span class="icono" v-html="c.icono" aria-hidden="true"></span>
        <span class="titulo">{{ c.titulo }}</span>
        <span v-if="c.dato" class="dato">{{ c.dato }}</span>
      </router-link>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'

const ICONO_BODEGA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 4l9 5.5"/><path d="M4.5 8.5V19a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V8.5"/><path d="M9 20v-6h6v6"/></svg>`

const ICONO_VENTA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M3 4h2l2.4 12.2a1.5 1.5 0 0 0 1.5 1.3h8.4a1.5 1.5 0 0 0 1.5-1.2L21 8H6"/></svg>`

const ICONO_MOVIMIENTOS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h13l-3-3"/><path d="M20 17H7l3 3"/></svg>`

const ICONO_LOTES = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z"/><path d="M3 12l9 4.5 9-4.5"/><path d="M3 16.5 12 21l9-4.5"/></svg>`


export default {
  name: 'MenuInventario',

  setup() {
    const store = useStore()

    // Datos rápidos por card, en el mismo espíritu que las "pie" de los KPI.
    const bajoMinimo = computed(() => store.getters['inventario/bajoMinimo'] || [])
    const productos = computed(() => store.getters['productos/productos'] || [])
    const movimientos = computed(() => store.getters['inventario/movimientos'] || [])
    const lotes = computed(() => store.getters['lotes/lotes'] || [])

    // Lotes que caducan pronto: el dato accionable, no el total.
    const porVencer = computed(() =>
      lotes.value.filter(l => l.diasParaVencer != null && l.diasParaVencer <= 30).length
    )

    const enVentaTotal = computed(() =>
      productos.value.reduce((acc, p) => acc + (p.enVenta || 0), 0)
    )

    const cards = computed(() => [
      {
        clave: 'bodega',
        ruta: 'InventarioBodega',
        titulo: 'Inventario Bodega',
        icono: ICONO_BODEGA,
        color: 'secundario', // sage — cámara, almacenamiento
        dato: bajoMinimo.value.length
          ? `${bajoMinimo.value.length} bajo mínimo`
          : 'Costos, mínimos y armado'
      },
      {
        clave: 'venta',
        ruta: 'InventarioVenta',
        titulo: 'Inventario Venta',
        icono: ICONO_VENTA,
        color: 'accent', // rose — mostrador, venta
        dato: `${enVentaTotal.value} unidades en mostrador`
      },
      {
        clave: 'movimientos',
        ruta: 'InventarioMovimientos',
        titulo: 'Movimientos',
        icono: ICONO_MOVIMIENTOS,
        color: 'info', // azul — historial, datos
        dato: movimientos.value.length
          ? `${movimientos.value.length} registrados`
          : 'Entradas y salidas'
      },
      {
        clave: 'lotes',
        ruta: 'Lotes',
        titulo: 'Lotes',
        icono: ICONO_LOTES,
        color: 'warn', // ámbar — caducidad, control de tandas
        dato: porVencer.value
          ? `${porVencer.value} por vencer`
          : 'Caducidades y trazabilidad'
      }

    ])

    return { cards }
  }
}
</script>

<style scoped>
.menu-inv {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.menu-inv h2 {
  margin: 0;
  font-size: clamp(1.25rem, 4.5vw, 1.5rem);
  letter-spacing: -0.02em;
  color: var(--text);
}

.pista {
  margin: 0 0 14px;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.grilla {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 160px;
  padding: 24px 16px;
  border: 1px solid var(--border);
  border-radius: var(--r-lg, 16px);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
  box-shadow: var(--shadow-sm);
  transition: transform var(--t-fast), box-shadow var(--t-fast),
    border-color var(--t-fast), background var(--t-med), color var(--t-med);
  -webkit-tap-highlight-color: transparent;
}

.card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.card:active {
  transform: translateY(0);
}

.card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Ícono plano, sin badge circular, color neutro uniforme (igual que en tu captura) */
.icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: var(--text-muted);
  transition: color var(--t-med);
}

.icono svg {
  width: 100%;
  height: 100%;
}

.titulo {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text);
}

.dato {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
}

.card:hover .icono {
  color: var(--accent);
}

/* --- Móvil: una columna, cards a todo el ancho --- */
@media (max-width: 640px) {
  .grilla {
    grid-template-columns: 1fr;
  }

  .card {
    min-height: 130px;
    padding: 20px 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }
}
</style>