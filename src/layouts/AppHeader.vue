<template>
  <header class="app-header">
    <!-- Zona izquierda: toggle sidebar (móvil) + contexto de página -->
    <div class="app-header__left">
      <button
        class="app-header__menu-btn"
        type="button"
        :aria-label="sidebarAbierto ? 'Cerrar menú' : 'Abrir menú'"
        :aria-expanded="String(sidebarAbierto)"
        @click="$emit('toggle-sidebar')"
      >
        <Menu :size="22" />
      </button>

      <div class="app-header__titulo">
        <h1 class="app-header__page-title">{{ tituloPagina }}</h1>
        <FechaHora class="app-header__fecha" />
      </div>
    </div>

    <!-- Zona derecha: tema + venta rápida + usuario -->
    <div class="app-header__right">
      <button
        class="app-header__icon-btn"
        type="button"
        :aria-label="esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        @click="alternarTema"
      >
        <Sun v-if="esOscuro" :size="20" />
        <Moon v-else :size="20" />
      </button>

      <!-- Venta rápida: lleva directo al POS con el contador del carrito.
           La cantidad va en el aria-label del botón, no en el badge: un
           lector de pantalla anuncia "Venta rápida, 3 artículos" en vez de
           leer un "3" suelto sin contexto. -->
      <button
        class="app-header__cart-btn"
        type="button"
        :aria-label="etiquetaCarrito"
        @click="irAPos"
      >
        <ShoppingCart :size="20" />
        <span v-if="cartCount > 0" class="app-header__cart-badge" aria-hidden="true">
          {{ cartCountFormateado }}
        </span>
      </button>

      <!--<div class="app-header__usuario">
        <div class="app-header__avatar">{{ inicialesUsuario }}</div>
        <div class="app-header__usuario-info">
          <span class="app-header__usuario-nombre">{{ nombreUsuario }}</span>
          <span class="app-header__usuario-rol">{{ rolUsuario }}</span>
        </div>
      </div>-->
    </div>
  </header>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'

import FechaHora from '@/shared/components/FechaHora.vue' // ⚠️ AJUSTA RUTA

import { Menu, Sun, Moon, ShoppingCart } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useStore()

defineProps({
  // Solo para que el botón anuncie bien su estado a lectores de pantalla
  sidebarAbierto: { type: Boolean, default: false }
})

defineEmits(['toggle-sidebar'])

/* ---------------- Título de página ---------------- */
const tituloPagina = computed(() => route.meta?.title || 'Colibrí')

/* ---------------- Carrito (Vuex POS) ---------------- */
const cartCount = computed(() => store.getters['pos/cantidadItems'] ?? 0)

const cartCountFormateado = computed(() =>
  cartCount.value > 99 ? '99+' : String(cartCount.value)
)

const etiquetaCarrito = computed(() =>
  cartCount.value > 0
    ? `Venta rápida, ${cartCount.value} ${cartCount.value === 1 ? 'artículo' : 'artículos'} en el carrito`
    : 'Venta rápida'
)

function irAPos () {
  // Si la ruta cambia de nombre, mejor un aviso en consola que una promesa
  // rechazada sin capturar rompiendo el click.
  router.push({ name: 'PuntoDeVenta' }).catch(err => {
    if (err?.name !== 'NavigationDuplicated') console.warn('[header] no se pudo ir al POS:', err)
  })
}

/* ---------------- Tema ----------------
 * Dos correcciones respecto de la versión anterior:
 *
 * 1. Solo se escribe en localStorage cuando la persona toca el botón. Antes
 *    el onMounted guardaba el tema del sistema como si fuera una elección,
 *    así que quien entraba de día quedaba fijado en claro para siempre.
 * 2. Mientras no haya elección explícita, seguimos los cambios del sistema
 *    en vivo (el iPhone cambia solo al anochecer si está en automático).
 *
 * El estado inicial ya viene aplicado por el script de index.html, así que
 * acá solo leemos lo que hay puesto y no hay parpadeo al recargar.
 */
const esOscuro = ref(false)
let mqSistema = null

function leerPreferencia () {
  try { return localStorage.getItem('theme') } catch { return null }
}

function guardarPreferencia (tema) {
  try { localStorage.setItem('theme', tema) } catch { /* Safari privado */ }
}

function aplicarTema (oscuro) {
  esOscuro.value = oscuro
  document.documentElement.setAttribute('data-theme', oscuro ? 'dark' : 'light')
}

function alternarTema () {
  const oscuro = !esOscuro.value
  aplicarTema(oscuro)
  guardarPreferencia(oscuro ? 'dark' : 'light')   // acá sí: fue una decisión
}

function alCambiarSistema (e) {
  if (!leerPreferencia()) aplicarTema(e.matches)
}

onMounted(() => {
  const guardado = leerPreferencia()
  const prefiereOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches

  aplicarTema(guardado ? guardado === 'dark' : prefiereOscuro)

  mqSistema = window.matchMedia('(prefers-color-scheme: dark)')
  mqSistema.addEventListener
    ? mqSistema.addEventListener('change', alCambiarSistema)
    : mqSistema.addListener(alCambiarSistema)
})

onUnmounted(() => {
  if (!mqSistema) return
  mqSistema.removeEventListener
    ? mqSistema.removeEventListener('change', alCambiarSistema)
    : mqSistema.removeListener(alCambiarSistema)
})
</script>

<style scoped>
.app-header {
  /* Compensa el notch/status bar en iOS. La altura visible se mantiene. */
  padding-top: env(safe-area-inset-top, 0);
  height: calc(64px + env(safe-area-inset-top, 0));

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  /*
    Este es el margen que no calzaba. La cabecera usaba clamp(16px,3vw,24px)
    y el contenido de las páginas clamp(16px,3vw,28px): en pantallas anchas
    quedaban 4 px de desfase y el título nunca se alineaba con el de la
    página. Ahora ambos leen el mismo token; defínelo una vez en tokens.css.
  */
  padding-inline: var(--gutter, clamp(16px, 3vw, 28px));

  background: var(--surface);
  border-bottom: 1px solid var(--border);

  position: sticky;
  top: 0;
  z-index: 20;
}

/* ---------- Izquierda ---------- */
.app-header__left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0; /* permite que el título trunque en vez de empujar */
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
}

.app-header__menu-btn:hover { background: var(--surface-2); }

/*
  El botón de menú se saca del margen para que el ÍCONO quede alineado con el
  texto de la página, no su caja de 40 px. Sin esto, en móvil el título de la
  cabecera aparece corrido respecto del contenido de abajo.
*/
.app-header__menu-btn { margin-left: -8px; }

.app-header__titulo {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-header__page-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-header__fecha {
  font-size: 0.78rem;
  color: var(--text-muted);
}

/* ---------- Derecha ---------- */
.app-header__right {
  display: flex;
  align-items: center;
  gap: 8px;
  /* Mismo criterio que a la izquierda: el ícono del último botón queda a ras
     del borde derecho del contenido, no su caja. */
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

/* Faltaba por completo: navegando con teclado no se veía dónde estabas */
.app-header__menu-btn:focus-visible,
.app-header__icon-btn:focus-visible,
.app-header__cart-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* El botón de venta rápida usa el acento para destacarse */
.app-header__cart-btn {
  background: var(--accent);
  color: var(--accent-contrast, #fff);
}

/* Antes había además un filter: brightness(.95). En claro oscurecía dos veces
   y en oscuro peleaba con --accent-hover, que ahí es más luminoso. */
.app-header__cart-btn:hover { background: var(--accent-hover, var(--accent)); }

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

/* ---------- Usuario ---------- */
.app-header__usuario {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 8px;
  margin-left: 4px;
  border-left: 1px solid var(--border);
}

.app-header__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--accent-contrast, #fff);
  background: var(--secondary, #5a7d5a);
  flex-shrink: 0;
}

.app-header__usuario-info {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.app-header__usuario-nombre {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

.app-header__usuario-rol {
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* ---------- Responsive ---------- */
@media (max-width: 768px) {
  .app-header__menu-btn { display: flex; }

  /* En móvil ocultamos texto de usuario y fecha para dejar aire */
  .app-header__usuario-info,
  .app-header__fecha { display: none; }

  .app-header__usuario {
    border-left: none;
    padding-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-header__menu-btn,
  .app-header__icon-btn,
  .app-header__cart-btn { transition: none; }
}
</style>