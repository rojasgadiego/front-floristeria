<template>
  <header class="app-header">
    <div class="app-header__left">
      <button
        class="app-header__menu-btn"
        type="button"
        :aria-label="etiquetaMenu"
        :aria-expanded="String(menuExpandido)"
        @click="toggleMenu"
      >
        <Menu :size="22" />
      </button>
    </div>

    <div class="app-header__right">
      <button
        class="app-header__icon-btn"
        type="button"
        :aria-label="esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        @click="alternar"
      >
        <Sun v-if="esOscuro" :size="20" />
        <Moon v-else :size="20" />
      </button>

      <!-- La cantidad va en el aria-label, no en el badge suelto. -->
      <button
        class="app-header__cart-btn"
        :class="{ 'app-header__cart-btn--cerrada': puedeVender && !cajaAbierta }"
        type="button"
        :aria-label="etiquetaCarrito"
        @click="irAPos"
      >
        <ShoppingCart :size="20" />
        <span v-if="cartCount > 0" class="app-header__cart-badge" aria-hidden="true">
          {{ cartCountFormateado }}
        </span>
        <!-- El punto dice si se puede vender antes de tocar. Sin esto, el
             vendedor descubre que la caja está cerrada recién al llegar al
             POS, con el cliente ya esperando. -->
        <span
          v-if="puedeVender"
          class="app-header__cart-dot"
          :class="cajaAbierta ? 'on' : 'off'"
          aria-hidden="true"
        ></span>
      </button>
    </div>

    <ModalAbrirCaja
      v-if="mostrarAbrir"
      @cerrar="mostrarAbrir = false"
      @abierta="alAbrir"
    />
  </header>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'

import { Menu, Sun, Moon, ShoppingCart } from 'lucide-vue-next'

import { useLayout } from '@/shared/composables/useLayout'
import { useTheme } from '@/shared/composables/useTheme'
import ModalAbrirCaja from '@/features/ventas/components/ModalAbrirCaja.vue'

const router = useRouter()
const store = useStore()

/* -------- Layout: el botón de menú ahora SÍ funciona -------- */
const { esCajon, cajonAbierto, colapsado, toggleMenu } = useLayout()

const menuExpandido = computed(() =>
  esCajon.value ? cajonAbierto.value : !colapsado.value
)

const etiquetaMenu = computed(() =>
  menuExpandido.value ? 'Cerrar menú' : 'Abrir menú'
)

/* -------- Tema -------- */
const { esOscuro, alternar } = useTheme()

/* -------- Carrito (Vuex POS) -------- */
const cartCount = computed(() => store.getters['pos/cantidadItems'] ?? 0)

const cartCountFormateado = computed(() =>
  cartCount.value > 99 ? '99+' : String(cartCount.value)
)

/* -------- Caja -------- */
const cajaAbierta = computed(() => store.getters['caja/abierta'])

/* Bodega no vende, así que para ese rol el punto de estado sería ruido:
   no hay nada que abrir ni que cerrar. */
const puedeVender = computed(() => store.getters['auth/puede']('pos'))

const mostrarAbrir = ref(false)

/* Se consulta una vez al montar el layout. El POS pregunta por el mismo
   estado, así que pedirlo en los dos lados sería una llamada de más. */
onMounted(() => {
  if (puedeVender.value) store.dispatch('caja/cargarActual')
})

const etiquetaCarrito = computed(() => {
  if (puedeVender.value && !cajaAbierta.value) return 'Abrir caja para vender'

  return cartCount.value > 0
    ? `Venta rápida, ${cartCount.value} ${cartCount.value === 1 ? 'artículo' : 'artículos'} en el carrito`
    : 'Venta rápida'
})

/* Sin caja no se navega: se ofrece abrirla ahí mismo. Llegar al POS y
   encontrarlo bloqueado es un viaje perdido con un cliente al frente. */
function irAPos () {
  if (puedeVender.value && !cajaAbierta.value) {
    mostrarAbrir.value = true
    return
  }

  router.push({ name: 'PuntoDeVenta' }).catch(err => {
    if (err?.name !== 'NavigationDuplicated') console.warn('[header] no se pudo ir al POS:', err)
  })
}

/* Al abrir entra directo al POS: el vendedor tocó el carrito porque quiere
   vender, no porque quisiera administrar la caja. */
function alAbrir () {
  mostrarAbrir.value = false
  router.push({ name: 'PuntoDeVenta' })
}
</script>

<style scoped>
.app-header {
  padding-top: env(safe-area-inset-top, 0);
  height: calc(68px + env(safe-area-inset-top, 0));

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  padding-inline: var(--gutter, clamp(16px, 3vw, 28px));

  background: var(--sidebar-bg);
  border-bottom: 1px solid var(--border);

  position: sticky;
  top: 0;
  z-index: 20;
}

.app-header__left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.app-header__menu-btn {
  display: none; /* solo móvil */
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--r-sm, 8px);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  margin-left: -8px; /* alinea el ícono, no su caja, con el contenido */
}

.app-header__menu-btn:hover { background: var(--surface-2); }

.app-header__right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: -8px;
}

.app-header__icon-btn,
.app-header__cart-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--r-sm, 8px);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s ease;
  position: relative;
  -webkit-tap-highlight-color: transparent;
}

.app-header__icon-btn:hover,
.app-header__cart-btn:hover { background: var(--surface-2); }

.app-header__menu-btn:focus-visible,
.app-header__icon-btn:focus-visible,
.app-header__cart-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.app-header__cart-btn {
  background: var(--accent);
  color: var(--accent-contrast, #fff);
}

.app-header__cart-btn:hover { background: var(--accent-hover, var(--accent)); }

/* Sin caja abierta el botón se atenúa: sigue accesible —lleva a abrirla—
   pero deja de prometer lo que no puede cumplir. */
.app-header__cart-btn--cerrada {
  background: var(--surface-2);
  color: var(--text-muted);
}

.app-header__cart-btn--cerrada:hover { background: var(--border); }

.app-header__cart-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: #fff;
  background: var(--danger, #dc2626);
  border: 2px solid var(--surface);
  border-radius: 999px;
}

.app-header__cart-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 2px solid var(--surface);
}

.app-header__cart-dot.on { background: var(--success); }
.app-header__cart-dot.off { background: var(--text-faint); }

@media (max-width: 768px) {
  .app-header__menu-btn { display: flex; }
}

@media (prefers-reduced-motion: reduce) {
  .app-header__menu-btn,
  .app-header__icon-btn,
  .app-header__cart-btn { transition: none; }
}
</style>