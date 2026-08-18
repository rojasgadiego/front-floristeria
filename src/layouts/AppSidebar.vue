<template>
  <Teleport to="body" :disabled="!esCajon">
    <button
      v-if="esCajon && conBotonPropio"
      class="sidebar-trigger"
      :class="{ 'is-hidden': estaAbierto }"
      type="button"
      aria-label="Abrir menú"
      :aria-expanded="String(estaAbierto)"
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
      :class="{ 'is-visible': estaAbierto }"
      @click="closeMobileSidebar"
    ></div>

    <aside
      ref="raiz"
      class="sidebar"
      :class="{ collapsed: estaColapsado, 'is-open': estaAbierto, 'is-cajon': esCajon }"
      :inert="estaFueraDePantalla || null"
      :aria-hidden="estaFueraDePantalla || null"
      @mouseenter="alEntrarMouse"
      @mouseleave="alSalirMouse"
    >
      <!-- ---------- Cabecera / marca ---------- -->
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

          <div v-if="!estaColapsado" class="logo-texto">
            <span class="logo-nombre">Floristería Colibrí</span>
            <span class="logo-bajada">ERP &amp; Punto de Venta</span>
          </div>
        </div>

        <!-- Sin esto, en móvil solo se cierra navegando a otra página -->
        <button
          v-if="esCajon"
          ref="btnCerrar"
          class="sidebar-close"
          type="button"
          aria-label="Cerrar menú"
          @click="closeMobileSidebar"
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
            <li
              v-if="!estaColapsado"
              class="seccion-titulo"
              aria-hidden="true"
            >
              {{ seccion.nombre }}
            </li>
            <li v-else class="seccion-separador" aria-hidden="true"></li>

            <li v-for="item in seccion.items" :key="item.path">
              <router-link
                :to="item.path"
                :class="{ active: isActive(item.path) }"
                :title="estaColapsado ? item.name : null"
                :aria-current="isActive(item.path) ? 'page' : null"
                @click="alNavegar"
              >
                <span class="menu-icon" v-html="item.icon"></span>
                <span v-if="!estaColapsado" class="menu-text">{{ item.name }}</span>
              </router-link>
            </li>
          </template>
        </ul>
      </nav>

      <!-- ---------- Pie: usuario y salida ---------- -->
      <div class="sidebar-footer">
        <div class="user-avatar-container" v-if="estaColapsado">
          <div class="user-avatar" :title="nombreUsuario">
            {{ userInitials }}
          </div>
        </div>

        <div class="user-info" v-else>
          <div class="user-name">{{ nombreUsuario }}</div>
          <div class="user-role">{{ rolUsuario }}</div>
        </div>

        <button
          class="logout-button"
          type="button"
          @click="$emit('logout')"
          :title="estaColapsado ? 'Cerrar sesión' : null"
        >
          <svg class="logout-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          <span v-if="!estaColapsado" class="logout-text">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  </Teleport>
</template>

<script>
import MENU_COLIBRI, { filtrarMenuPorPermisos } from '@/config/menuColibri'
import { textoRol } from '@/core/constantes/roles'

/*
 * Un único punto de verdad para el breakpoint. Antes el modo cajón lo decidía
 * la prop `isMobile` (JS) y el layout fijo lo decidía una media query (CSS): si
 * los dos números no coincidían, quedaba un rango de anchos donde el CSS ya
 * había sacado la barra de pantalla pero el JS seguía creyendo que era
 * escritorio, así que nadie ponía `isMobileOpen` en true y la barra no aparecía.
 */
const BP_CAJON = '(max-width: 768px)'
const BP_HOVER = '(hover: hover) and (pointer: fine)'

export default {
  name: 'AppSidebar',
  inheritAttrs: false,

  props: {
    isSidebarCollapsed: { type: Boolean, required: true },
    // Se mantiene por compatibilidad con el padre, pero ya no manda:
    // el componente resuelve el modo cajón con su propia media query.
    isMobile: { type: Boolean, required: false, default: false },
    // El padre puede seguir controlándolo. Si nunca lo toca, el componente
    // se abre con su propio estado interno y funciona igual.
    isMobileOpen: { type: Boolean, default: false },
    conBotonPropio: { type: Boolean, default: true },
    currentUser: { type: Object, default: () => ({}) },
    userRoles: { type: Array, default: () => [] },
    filteredMenuItems: { type: Array, default: null },
    userInitials: { type: String, default: '?' }
  },

  emits: [
    'expand-sidebar',
    'collapse-sidebar',
    'open-mobile-sidebar',
    'close-mobile-sidebar',
    'handle-navigation',
    'logout'
  ],

  data () {
    const soportaMQ = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    return {
      esCajon: soportaMQ ? window.matchMedia(BP_CAJON).matches : this.isMobile,
      permiteHover: soportaMQ ? window.matchMedia(BP_HOVER).matches : true,
      abiertoLocal: false,
      mqCajon: null,
      mqHover: null,
      focoPrevio: null,
      overflowPrevio: ''
    }
  },

  computed: {
    // En modo cajón hay 280 px de ancho: colapsar no significa nada ahí, y si
    // se hereda la clase del escritorio el menú queda en puros iconos sin texto.
    estaColapsado () {
      return this.isSidebarCollapsed && !this.esCajon
    },

    // Verdad única del cajón: vale tanto si lo manda el padre como si lo
    // abrió el botón propio.
    estaAbierto () {
      return this.isMobileOpen || this.abiertoLocal
    },

    // Cuando el cajón está cerrado sus enlaces siguen en el DOM, fuera de
    // pantalla. Sin `inert` se pueden tabular a ciegas y el lector de pantalla
    // los anuncia igual.
    estaFueraDePantalla () {
      return this.esCajon && !this.estaAbierto
    },

    itemsFinales () {
      if (this.filteredMenuItems) return this.filteredMenuItems
      return filtrarMenuPorPermisos(this.currentUser?.permisos || [])
    },

    nombreUsuario () {
      return this.currentUser?.name || this.currentUser?.email || 'Usuario'
    },

    rolUsuario () {
      const rol = this.currentUser?.role || this.userRoles[0]
      return rol ? textoRol(rol) : 'Rol no asignado'
    },

    secciones () {
      const orden = []
      const mapa = {}

      this.itemsFinales.forEach(item => {
        const nombre = item.seccion || 'Menú'
        if (!mapa[nombre]) {
          mapa[nombre] = []
          orden.push(nombre)
        }
        mapa[nombre].push(item)
      })

      return orden.map(nombre => ({ nombre, items: mapa[nombre] }))
    }
  },

  watch: {
    // El padre manda si habla; si no habla, gana el estado local.
    isMobileOpen (v) { this.abiertoLocal = v },

    estaAbierto (abierto) {
      if (!this.esCajon) return
      this.bloquearScroll(abierto)

      if (abierto) {
        this.focoPrevio = document.activeElement
        this.$nextTick(() => this.$refs.btnCerrar?.focus())
      } else if (this.focoPrevio?.isConnected) {
        this.focoPrevio.focus()
        this.focoPrevio = null
      }
    },

    // Si la ventana crece con el cajón abierto, hay que soltar el scroll
    // del body o el escritorio queda trabado.
    esCajon (ahoraEsCajon) {
      if (!ahoraEsCajon) {
        this.bloquearScroll(false)
        if (this.estaAbierto) this.closeMobileSidebar()
      }
    }
  },

  created () {
    if (typeof window === 'undefined' || !window.matchMedia) return
    this.mqCajon = window.matchMedia(BP_CAJON)
    this.mqHover = window.matchMedia(BP_HOVER)
    this.escucharMQ(this.mqCajon, this.alCambiarCajon)
    this.escucharMQ(this.mqHover, this.alCambiarHover)
  },

  mounted () {
    document.addEventListener('keydown', this.alPresionarTecla)
  },

  beforeUnmount () {
    document.removeEventListener('keydown', this.alPresionarTecla)
    this.dejarDeEscucharMQ(this.mqCajon, this.alCambiarCajon)
    this.dejarDeEscucharMQ(this.mqHover, this.alCambiarHover)
    this.bloquearScroll(false)
  },

  methods: {
    isActive (path) {
      return this.$route.path === path || this.$route.path.startsWith(`${path}/`)
    },

    abrirCajon () {
      this.abiertoLocal = true
      this.$emit('open-mobile-sidebar')
    },

    closeMobileSidebar () {
      this.abiertoLocal = false
      this.$emit('close-mobile-sidebar')
    },

    handleNavigation () {
      this.$emit('handle-navigation')
    },

    alNavegar () {
      if (this.esCajon) this.closeMobileSidebar()
      else this.handleNavigation()
    },

    // Expandir por hover solo donde hay un mouse de verdad. En una tablet táctil
    // `mouseenter` se dispara al tocar y la barra se expande sola.
    alEntrarMouse () {
      if (this.esCajon || !this.permiteHover) return
      this.$emit('expand-sidebar')
    },

    alSalirMouse () {
      if (this.esCajon || !this.permiteHover) return
      this.$emit('collapse-sidebar')
    },

    alPresionarTecla (e) {
      if (e.key === 'Escape' && this.esCajon && this.estaAbierto) {
        this.closeMobileSidebar()
      }
    },

    alCambiarCajon (e) { this.esCajon = e.matches },
    alCambiarHover (e) { this.permiteHover = e.matches },

    bloquearScroll (activar) {
      if (typeof document === 'undefined') return
      if (activar) {
        this.overflowPrevio = document.body.style.overflow
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = this.overflowPrevio || ''
      }
    },

    // Safari < 14 no tiene addEventListener en MediaQueryList
    escucharMQ (mq, fn) {
      if (!mq) return
      mq.addEventListener ? mq.addEventListener('change', fn) : mq.addListener(fn)
    },

    dejarDeEscucharMQ (mq, fn) {
      if (!mq) return
      mq.removeEventListener ? mq.removeEventListener('change', fn) : mq.removeListener(fn)
    }
  }
}

/* MENU_COLIBRI se mantiene importado para que el default export siga
   disponible si algún día se necesita el menú sin filtrar. */
void MENU_COLIBRI
</script>

<style scoped>
.sidebar,
.sidebar *,
.sidebar *::before,
.sidebar *::after {
  box-sizing: border-box;
}

.sidebar {
  /* ─── Tokens locales derivados del design system ─── */
  --sb-bg:            #2b211d;
  --sb-bg-hover:      #3a2d27;
  --sb-bg-active:     var(--accent, #c2456e);
  --sb-border:        rgba(255, 255, 255, 0.08);
  --sb-text:          #e8ddd6;
  --sb-text-dim:      rgba(232, 221, 214, 0.55);
  --sb-text-strong:   #ffffff;
  --sb-accent:        var(--accent, #c2456e);
  --sb-accent-soft:   var(--accent-soft, #fbe9f0);

  background-color: var(--sb-bg);
  color: var(--sb-text);
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  z-index: 10;

  height: 100vh;
  height: 100dvh;

  box-shadow: 0 0 20px rgba(0, 0, 0, 0.08);
  transition: width 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}

.sidebar.collapsed { width: 76px; }

/* ---------- Cabecera ---------- */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 76px;
  padding: 16px 14px;
  border-bottom: 1px solid var(--sb-border);
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.sidebar.collapsed .logo-container { justify-content: center; }

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
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
  width: 36px;
  height: 36px;
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
  overscroll-behavior: contain;   /* el scroll del menú no arrastra la página */
  -webkit-overflow-scrolling: touch;
  padding: 10px 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
}

.sidebar-nav::-webkit-scrollbar { width: 4px; }
.sidebar-nav::-webkit-scrollbar-track { background: transparent; }
.sidebar-nav::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.25);
  border-radius: 20px;
}

.sidebar-nav ul { list-style: none; padding: 0; margin: 0; }
.sidebar-nav li { padding: 0 10px; margin-bottom: 2px; }

.seccion-titulo {
  margin: 14px 0 6px;
  padding: 0 22px !important;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--sb-text-dim);
  white-space: nowrap;
}

.seccion-separador {
  height: 1px;
  margin: 10px 14px !important;
  padding: 0 !important;
  background-color: rgba(255, 255, 255, 0.1);
}

.seccion-separador:first-child,
.seccion-titulo:first-child { margin-top: 4px; }

.sidebar-nav a {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 8px;
  border-left: 3px solid transparent;
  color: var(--sb-text);
  text-decoration: none;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.sidebar.collapsed .sidebar-nav a { justify-content: center; padding: 10px; }
.sidebar-nav a:hover { background-color: var(--sb-bg-hover); color: var(--sb-text-strong); }
.sidebar-nav a:focus-visible { outline: 2px solid var(--sb-accent); outline-offset: -2px; }

.sidebar-nav a.active {
  background-color: var(--sb-bg-active);
  border-left-color: #ffffff;
  color: #ffffff;
  font-weight: 600;
}

.sidebar.collapsed .sidebar-nav a.active {
  border-left-color: transparent;
  box-shadow: inset 3px 0 0 #ffffff;
}

.menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-right: 14px;
  color: inherit;
}

.sidebar.collapsed .menu-icon { margin-right: 0; }

.menu-text {
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
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: max(14px, env(safe-area-inset-bottom));
}

.user-info {
  width: 100%;
  min-width: 0;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.15);
}

.user-avatar-container { display: flex; justify-content: center; margin-bottom: 12px; }

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--sb-accent);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
}

.user-name {
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 3px;
  color: var(--sb-text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role { font-size: 0.75rem; color: var(--sb-text-dim); }

.logout-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background-color: transparent;
  color: var(--sb-text);
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.logout-button:hover {
  background-color: rgba(239, 68, 68, 0.18);
  border-color: rgba(239, 68, 68, 0.5);
  color: #fecaca;
}

.logout-button:focus-visible { outline: 2px solid var(--sb-accent); outline-offset: 2px; }
.logout-icon { flex-shrink: 0; }
.logout-text { margin-left: 10px; }

/* ---------- Botón propio ---------- */
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
  border: 1px solid var(--border, #e9e0da);
  border-radius: 12px;
  background: var(--surface, #ffffff);
  color: var(--text, #2b2320);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.10);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.2s ease;
}

.sidebar-trigger.is-hidden { opacity: 0; pointer-events: none; }
.sidebar-trigger:focus-visible { outline: 2px solid var(--accent, #c2456e); outline-offset: 2px; }

/* ---------- Fondo del cajón ---------- */
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background-color: rgba(24, 16, 13, 0.5);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.sidebar-backdrop.is-visible { opacity: 1; pointer-events: auto; }

/* ---------- Modo cajón ----------
   Se activa por clase (.is-cajon) y no solo por media query, para que el
   estado de CSS y el de JS no puedan discrepar nunca.                      */
.sidebar.is-cajon {
  position: fixed;
  top: 0;
  left: 0;
  width: 280px;
  max-width: 85vw;
  z-index: 1300;            /* por encima de cualquier topbar de la app */
  transform: translateX(-100%);
  box-shadow: 0 0 24px rgba(0, 0, 0, 0.3);
  transition: transform 0.35s cubic-bezier(0.23, 1, 0.32, 1);
}

.sidebar.is-cajon.collapsed { width: 280px; }
.sidebar.is-cajon .logo-nombre { font-size: 0.88rem; }
.sidebar.is-cajon.is-open { transform: translateX(0); }

@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .sidebar-backdrop,
  .sidebar-nav a,
  .logout-button { transition: none; }
}
</style>