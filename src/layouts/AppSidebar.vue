<template>
  <Teleport to="body" :disabled="!esCajon">
    <button
      v-if="esCajon && conBotonPropio"
      class="sidebar-trigger"
      :class="{ 'is-hidden': cajonAbierto }"
      type="button"
      aria-label="Abrir menú"
      :aria-expanded="String(cajonAbierto)"
      @click="abrirCajon"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="M3 6h18M3 12h18M3 18h18" />
      </svg>
    </button>

    <div
      v-if="esCajon"
      class="sidebar-backdrop"
      :class="{ 'is-visible': cajonAbierto }"
      @click="cerrarCajon"
    ></div>

    <aside
      ref="raiz"
      class="sidebar"
      :class="{ collapsed: colapsadoVisual, 'is-open': cajonAbierto, 'is-cajon': esCajon }"
      :inert="estaFueraDePantalla || null"
      :aria-hidden="estaFueraDePantalla || null"
      @mouseenter="alEntrarMouse"
      @mouseleave="alSalirMouse"
      @keydown="alPresionarTecla"
    >
      <!-- ---------- Cabecera / marca ---------- -->
      <!-- Ningún texto usa v-if: al montarse y desmontarse empujaba el resto
           del panel y la expansión se veía como un temblor. Ahora todo vive
           siempre en el DOM y solo cambia de opacidad; el recorte lo hace el
           overflow del contenedor. -->
      <div class="sidebar-header">
        <div class="logo-container">
          <div class="logo-icon" aria-hidden="true">
            <svg viewBox="0 0 64 64" focusable="false">
              <path
                d="M44 15 C50 15 53 19 52 23 C50 32 40 40 26 43 L8 47 L15 37 C22 29 30 17 44 15 Z"
                fill="currentColor"
              />
              <path
                d="M30 27 C36 18 46 14 55 16 C50 25 41 31 32 32 Z"
                fill="currentColor"
                opacity="0.55"
              />
              <circle cx="46" cy="21" r="1.7" fill="#064e3b" />
            </svg>
          </div>

          <div class="logo-texto texto-plegable">
            <span class="logo-nombre">Colibrí</span>
            <!-- <span class="logo-bajada">ERP &amp; Punto de Venta</span> -->
          </div>
        </div>

        <button
          v-if="esCajon"
          ref="btnCerrar"
          class="sidebar-close"
          type="button"
          aria-label="Cerrar menú"
          @click="cerrarCajon"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- ---------- Navegación ---------- -->
      <nav class="sidebar-nav" aria-label="Menú principal">
        <ul>
          <template v-for="seccion in secciones" :key="seccion.nombre">
            <!-- Un solo <li> de alto fijo para el encabezado de sección.
                 Antes eran dos elementos distintos (título o separador) y el
                 cambio de alto reacomodaba toda la lista de abajo. La línea
                 va en position:absolute para no aportar alto propio. -->
            <li class="seccion-encabezado" aria-hidden="true">
              <span class="seccion-texto texto-plegable">{{ seccion.nombre }}</span>
              <span class="seccion-linea"></span>
            </li>

            <li v-for="item in seccion.items" :key="item.path">
              <router-link
                :to="item.path"
                :class="{ active: isActive(item.path) }"
                :title="colapsadoVisual ? item.name : null"
                :aria-current="isActive(item.path) ? 'page' : null"
                @click="alNavegar"
              >
                <!-- item.icon proviene de config local (menuColibri), NO del
                     servidor. Si algún día el icono viniera del backend, esto
                     habría que renderizarlo como <svg> con solo el path, nunca
                     markup completo (riesgo XSS). -->
                <span class="menu-icon" v-html="item.icon"></span>
                <span class="menu-text texto-plegable">{{ item.name }}</span>
              </router-link>
            </li>
          </template>
        </ul>
      </nav>

      <!-- ---------- Pie: usuario y salida ---------- -->
      <!-- Avatar y datos conviven en una sola fila de alto constante. Antes
           eran dos bloques alternativos de alturas distintas y el botón de
           salir saltaba en cada expansión. -->
      <div class="sidebar-footer">
        <div class="user-block">
          <div class="user-avatar" :title="colapsadoVisual ? nombreUsuario : null">
            {{ userInitials }}
          </div>
          <div class="user-info texto-plegable">
            <div class="user-name">{{ nombreUsuario }}</div>
            <div class="user-role">{{ rolUsuario }}</div>
          </div>
        </div>

        <button
          ref="btnLogout"
          class="logout-button"
          type="button"
          @click="$emit('logout')"
          :title="colapsadoVisual ? 'Cerrar sesión' : null"
        >
          <svg class="logout-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          <span class="logout-text texto-plegable">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  </Teleport>
</template>


<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'

import { filtrarMenuPorPermisos } from '@/config/menuColibri'
import { textoRol } from '@/core/constantes/roles'
import { useLayout }from '@/shared/composables/useLayout.js'

const props = defineProps({
  conBotonPropio: { type: Boolean, default: true },
  currentUser: { type: Object, default: () => ({}) },
  userRoles: { type: Array, default: () => [] },
  filteredMenuItems: { type: Array, default: null },
  userInitials: { type: String, default: '?' }
})

defineEmits(['logout'])

const route = useRoute()

const {
  esCajon,
  permiteHover,
  cajonAbierto,
  colapsadoVisual,
  expandir,
  colapsar,
  abrirCajon,
  cerrarCajon,
  alNavegar: alNavegarLayout
} = useLayout()

/* -------- Refs para foco -------- */
const btnCerrar = ref(null)
const btnLogout = ref(null)
let focoPrevio = null

/* -------- Derivados -------- */
// Cajón cerrado => sus enlaces siguen en el DOM fuera de pantalla; inert evita
// tabular a ciegas y que el lector los anuncie.
const estaFueraDePantalla = computed(() => esCajon.value && !cajonAbierto.value)

const itemsFinales = computed(() => {
  if (props.filteredMenuItems) return props.filteredMenuItems
  return filtrarMenuPorPermisos(props.currentUser?.permisos || [])
})

const nombreUsuario = computed(() =>
  props.currentUser?.name || props.currentUser?.email || 'Usuario'
)

const rolUsuario = computed(() => {
  const rol = props.currentUser?.role || props.userRoles[0]
  return rol ? textoRol(rol) : 'Rol no asignado'
})

const secciones = computed(() => {
  const orden = []
  const mapa = {}
  itemsFinales.value.forEach(item => {
    const nombre = item.seccion || 'Menú'
    if (!mapa[nombre]) {
      mapa[nombre] = []
      orden.push(nombre)
    }
    mapa[nombre].push(item)
  })
  return orden.map(nombre => ({ nombre, items: mapa[nombre] }))
})

/* -------- Foco al abrir/cerrar el cajón -------- */
watch(cajonAbierto, (abierto) => {
  if (!esCajon.value) return
  if (abierto) {
    focoPrevio = document.activeElement
    nextTick(() => btnCerrar.value?.focus())
  } else if (focoPrevio?.isConnected) {
    focoPrevio.focus()
    focoPrevio = null
  }
})

/* -------- Métodos -------- */
function isActive (path) {
  return route.path === path || route.path.startsWith(`${path}/`)
}

function alNavegar () {
  alNavegarLayout()
}

// Hover solo con mouse real; en táctil mouseenter se dispara al tocar.
function alEntrarMouse () {
  if (esCajon.value || !permiteHover.value) return
  expandir()
}

function alSalirMouse () {
  if (esCajon.value || !permiteHover.value) return
  colapsar(300)
}

// Escape para cerrar + trap de foco básico (Tab cicla dentro del cajón).
function alPresionarTecla (e) {
  if (!esCajon.value || !cajonAbierto.value) return

  if (e.key === 'Escape') {
    cerrarCajon()
    return
  }

  if (e.key === 'Tab') {
    const foco = [btnCerrar.value, btnLogout.value].filter(Boolean)
    if (!foco.length) return
    const primero = foco[0]
    const ultimo = foco[foco.length - 1]
    const activo = document.activeElement

    // Enlaces de navegación también son focusables; esto solo garantiza
    // que no se escape del aside en los extremos.
    if (e.shiftKey && activo === primero) {
      e.preventDefault()
      ultimo.focus()
    } else if (!e.shiftKey && activo === ultimo) {
      e.preventDefault()
      primero.focus()
    }
  }
}
</script>

<style scoped>
.sidebar,
.sidebar *,
.sidebar *::before,
.sidebar *::after {
  box-sizing: border-box;
}

.sidebar {
  /* Mapeo local → tokens globales (única fuente de verdad).
     Ahora TODO reacciona a [data-theme="dark"] automáticamente. */
  --sb-bg:            var(--sidebar-bg);
  --sb-bg-hover:      var(--sidebar-bg-hover);
  --sb-bg-active:     var(--sidebar-item-active-bg);
  --sb-border:        var(--sidebar-border);
  --sb-text:          var(--sidebar-text);
  --sb-text-dim:      var(--sidebar-text-dim);
  --sb-text-strong:   var(--sidebar-text-strong);
  --sb-active-txt:    var(--sidebar-item-active-txt);
  --sb-accent:        var(--accent);
  --sb-accent-soft:   var(--accent-soft);

  /* Eje vertical sobre el que se alinean TODOS los iconos (logo, menú,
     avatar, salir). Coincide con el centro del panel colapsado, así que al
     expandir ningún icono se mueve un solo píxel: solo crece el borde
     derecho. Los padding de abajo se calculan desde aquí, no a mano. */
  --sb-eje: 38px;

  background-color: var(--sb-bg);
  color: var(--sb-text);
  width: 230px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  z-index: 10;

  height: 100vh;
  height: 100dvh;

  box-shadow: var(--shadow-md);
  transition: width 0.28s cubic-bezier(0.23, 1, 0.32, 1),
              background-color var(--t-med),
              color var(--t-med),
              border-color var(--t-med);
}

.sidebar.collapsed { width: calc(var(--sb-eje) * 2); }  /* 76px */

/* ---------- Textos plegables ----------
   Regla única para todo lo que aparece y desaparece. Al expandir el texto
   entra con un pequeño retraso, cuando el ancho ya casi terminó de crecer;
   al colapsar se va de inmediato para que no se vea recortado contra el
   borde. El elemento nunca deja de ocupar su lugar en el layout. */
.texto-plegable {
  opacity: 1;
  transition: opacity 0.16s ease 0.12s;
}

.sidebar.collapsed .texto-plegable {
  opacity: 0;
  transition-delay: 0s;
  pointer-events: none;
}

/* ---------- Cabecera ---------- */
.sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 68px;          /* fijo: 5cap variaba con la fuente cargada */
  padding: 16px 14px;
  padding-left: calc(var(--sb-eje) - 17.5px);   /* centra el logo de 35px */
  border-bottom: 1px solid var(--sb-border);
  overflow: hidden;          /* recorta el nombre en vez de ensanchar */
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 35px;
  height: 35px;
  flex-shrink: 0;
  border-radius: 50%;
  background-color: var(--sb-accent-soft);
  color: var(--sb-accent);
}

.logo-icon svg { width: 28px; height: 28px; display: block; }

.logo-texto { display: flex; flex-direction: column; min-width: 0; }

.logo-nombre {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--sb-text-strong);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logo-bajada {
  font-size: 0.7rem;
  color: var(--sb-text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 35px;
  height: 35px;
  flex-shrink: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--sb-text);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.sidebar-close:hover { background-color: var(--sb-bg-hover); color: var(--sb-text-strong); }
.sidebar-close:focus-visible { outline: 2px solid var(--sb-accent); outline-offset: 2px; }

/* ---------- Navegación ---------- */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 10px 0;
  scrollbar-width: thin;
  /* usa border-strong para que el thumb sea visible en ambos temas */
  scrollbar-color: var(--border-strong) transparent;
}

.sidebar-nav::-webkit-scrollbar { width: 4px; }
.sidebar-nav::-webkit-scrollbar-track { background: transparent; }
.sidebar-nav::-webkit-scrollbar-thumb {
  background-color: var(--border-strong);
  border-radius: 20px;
}

.sidebar-nav ul { list-style: none; padding: 0; margin: 0; }
.sidebar-nav li { padding: 0 10px; margin-bottom: 2px; }

/* Alto fijo pase lo que pase: es lo que impide que la lista se reacomode. */
.seccion-encabezado {
  position: relative;
  display: flex;
  align-items: center;
  height: 32px;
  margin: 8px 0 2px;
  padding: 0 22px !important;
}

.seccion-encabezado:first-child { margin-top: 2px; }

.seccion-texto {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--sb-text-dim);
  white-space: nowrap;
}

/* Sustituye al antiguo <li class="seccion-separador">: aparece cuando el
   texto se va, pero sin ocupar alto propio. */
.seccion-linea {
  position: absolute;
  left: 14px;
  right: 14px;
  top: 50%;
  height: 1px;
  background-color: var(--sb-border);
  opacity: 0;
  transition: opacity 0.16s ease;
}

.sidebar.collapsed .seccion-linea { opacity: 1; transition-delay: 0.1s; }

.sidebar-nav a {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 10px 12px;
  padding-left: calc(var(--sb-eje) - 20px);  /* 10px del <li> + medio icono */
  border-radius: 8px;
  border-left: 3px solid transparent;
  color: var(--sb-text);
  text-decoration: none;
  overflow: hidden;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.sidebar-nav a:hover { background-color: var(--sb-bg-hover); color: var(--sb-text-strong); }
.sidebar-nav a:focus-visible { outline: 2px solid var(--sb-accent); outline-offset: -2px; }

.sidebar-nav a.active {
  background-color: var(--sb-bg-active);
  border-left-color: var(--sb-active-txt);
  color: var(--sb-active-txt);
  font-weight: 600;
}

.sidebar.collapsed .sidebar-nav a.active {
  border-left-color: transparent;
  box-shadow: inset 3px 0 0 var(--sb-active-txt);
}

.menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-right: 14px;   /* constante: si cambia, el icono se desliza */
  color: inherit;
}

/* asegura que los SVG dentro del icono usen currentColor */
.menu-icon svg,
.logo-icon svg,
.logout-icon svg {
  stroke: currentColor;   /* si tus iconos son de RELLENO cambia a: fill: currentColor; */
}

.menu-text {
  flex: 1;
  font-size: 0.92rem;
  line-height: 1.25;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- Pie ---------- */
.sidebar-footer {
  padding: 14px;
  border-top: 1px solid var(--sb-border);
  display: flex;
  flex-direction: column;
  padding-bottom: max(14px, env(safe-area-inset-bottom));
}

.user-block {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  padding: 0 0 10px;
  padding-left: calc(var(--sb-eje) - 14px - 18px);  /* centra el avatar */
  margin-bottom: 12px;
  border-bottom: 1px dashed var(--sb-border);
  overflow: hidden;
}

.user-avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 50%;
  background-color: var(--sb-accent);
  color: var(--accent-contrast);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
}

.user-info { min-width: 0; }

.user-name {
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 3px;
  color: var(--sb-text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 0.75rem;
  color: var(--sb-text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-button {
  display: flex;
  align-items: center;
  justify-content: flex-start;   /* centrado movía el icono al colapsar */
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  padding-left: calc(var(--sb-eje) - 14px - 9px);
  border: 1px solid var(--sb-border);
  border-radius: 8px;
  background-color: transparent;
  color: var(--sb-text);
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.logout-button:hover {
  background-color: var(--danger-soft);
  border-color: var(--danger-border);
  color: var(--danger);
}

.logout-button:focus-visible { outline: 2px solid var(--sb-accent); outline-offset: 2px; }
.logout-icon { flex-shrink: 0; }
.logout-text { margin-left: 10px; }

/* ---------- Botón propio (trigger) ---------- */
.sidebar-trigger {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 10px);
  left: 12px;
  z-index: 1250;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.2s ease,
              background-color var(--t-med),
              color var(--t-med),
              border-color var(--t-med);
}

.sidebar-trigger.is-hidden { opacity: 0; pointer-events: none; }
.sidebar-trigger:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ---------- Fondo del cajón ---------- */
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background-color: rgba(24, 16, 13, 0.5);   /* backdrop: se deja fijo a propósito */
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.sidebar-backdrop.is-visible { opacity: 1; pointer-events: auto; }

/* ---------- Modo cajón ---------- */
.sidebar.is-cajon {
  position: fixed;
  top: 0;
  left: 0;
  width: 280px;
  max-width: 85vw;
  z-index: 1300;
  transform: translateX(-100%);
  box-shadow: var(--shadow-lg);
  transition: transform 0.35s cubic-bezier(0.23, 1, 0.32, 1);
}

.sidebar.is-cajon.collapsed { width: 280px; }
.sidebar.is-cajon .logo-nombre { font-size: 0.88rem; }
.sidebar.is-cajon.is-open { transform: translateX(0); }

/* El cajón siempre va ancho, así que ignora el plegado aunque la clase
   collapsed llegue a aplicarse (la regla de arriba deja entrever que puede
   pasar). Sin esto el menú móvil se vería vacío. */
.sidebar.is-cajon.collapsed .texto-plegable { opacity: 1; pointer-events: auto; }
.sidebar.is-cajon.collapsed .seccion-linea { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .sidebar-backdrop,
  .sidebar-nav a,
  .logout-button,
  .texto-plegable,
  .seccion-linea { transition: none; }
}
</style>

<style>
/* Con un modal abierto el botón del menú se esconde, igual que con el cajón
   abierto. Va fuera del scoped porque los modales viven en cada vista: el
   botón (z-index 1250) quedaba encima de todos (100–200) y en el celular
   tapaba el título del modal. */
body:has(.fondo, .overlay) .sidebar-trigger {
  opacity: 0;
  pointer-events: none;
}
</style>
