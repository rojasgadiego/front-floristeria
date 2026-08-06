<template>
  <aside
    class="sidebar"
    :class="{ collapsed: isSidebarCollapsed, 'is-open': isMobileOpen }"
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

        <div v-if="!isSidebarCollapsed" class="logo-texto">
          <span class="logo-nombre">Floristería Colibrí</span>
          <span class="logo-bajada">ERP &amp; Punto de Venta</span>
        </div>
      </div>
    </div>

    <!-- ---------- Navegación ---------- -->
    <nav class="sidebar-nav" aria-label="Menú principal">
      <ul>
        <template v-for="seccion in secciones" :key="seccion.nombre">
          <li
            v-if="!isSidebarCollapsed"
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
              :title="isSidebarCollapsed ? item.name : null"
              :aria-current="isActive(item.path) ? 'page' : null"
              @click="isMobile ? closeMobileSidebar() : handleNavigation()"
            >
              <span class="menu-icon" v-html="item.icon"></span>
              <span v-if="!isSidebarCollapsed" class="menu-text">{{ item.name }}</span>
            </router-link>
          </li>
        </template>
      </ul>
    </nav>

    <!-- ---------- Pie: usuario y salida ---------- -->
    <div class="sidebar-footer">
      <div class="user-avatar-container" v-if="isSidebarCollapsed">
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
        @click="$emit('logout')"
        :title="isSidebarCollapsed ? 'Cerrar sesión' : null"
      >
        <span class="logout-icon" aria-hidden="true">⏻</span>
        <span v-if="!isSidebarCollapsed" class="logout-text">Cerrar sesión</span>
      </button>
    </div>
  </aside>
</template>

<script>
import MENU_COLIBRI, { filtrarMenuPorPermisos } from '@/config/menuColibri'
import { textoRol } from '@/core/constantes/roles'

export default {
  name: 'AppSidebar',

  props: {
    isSidebarCollapsed: {
      type: Boolean,
      required: true
    },
    isMobile: {
      type: Boolean,
      required: true
    },
    // Controla el cajón lateral en móvil (antes no existía y la barra
    // quedaba fuera de pantalla sin forma de mostrarla)
    isMobileOpen: {
      type: Boolean,
      default: false
    },
    currentUser: {
      type: Object,
      default: () => ({})
    },
    userRoles: {
      type: Array,
      default: () => []
    },
    // Opcional: si el padre manda una lista ya filtrada, manda esa.
    // Si no, el sidebar arma el menú con los permisos del usuario.
    filteredMenuItems: {
      type: Array,
      default: null
    },
    userInitials: {
      type: String,
      default: '?'
    }
  },

  // Los cinco eventos que realmente emite el componente
  emits: [
    'expand-sidebar',
    'collapse-sidebar',
    'close-mobile-sidebar',
    'handle-navigation',
    'logout'
  ],

  computed: {
    /*
     * Quién ve qué lo decide el servidor: SesionDto trae `permisos` con las
     * claves de módulo y el menú se filtra contra eso. Sin permisos no se
     * muestra nada — durante el arranque es un instante, y es preferible a
     * dibujar el menú completo y esconderlo medio segundo después.
     */
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

    // Agrupa por la propiedad "seccion" conservando el orden original
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

  methods: {
    isActive (path) {
      return this.$route.path === path || this.$route.path.startsWith(`${path}/`)
    },
    closeMobileSidebar () {
      this.$emit('close-mobile-sidebar')
    },
    handleNavigation () {
      this.$emit('handle-navigation')
    },
    // En pantallas táctiles mouseenter se dispara al tocar,
    // así que el expandir por hover solo aplica en escritorio
    alEntrarMouse () {
      if (!this.isMobile) this.$emit('expand-sidebar')
    },
    alSalirMouse () {
      if (!this.isMobile) this.$emit('collapse-sidebar')
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
  /* Paleta Colibrí (equivalente a las clases emerald de Tailwind) */
  --verde-900: #065f46;
  --verde-800: #065f46;
  --verde-700: #047857;
  --verde-600: #059669;
  --verde-400: #34d399;
  --verde-300: #6ee7b7;
  --verde-100: #d1fae5;

  background-color: var(--verde-900);
  color: #d1fae5;
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  z-index: 10;

  /* 100dvh evita el salto cuando el navegador móvil esconde su barra */
  height: 100vh;
  height: 100dvh;

  box-shadow: 0 0 20px rgba(0, 0, 0, 0.08);
  transition: width 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}

/* Ancho real al colapsar: antes solo cambiaba el contenido, no el ancho */
.sidebar.collapsed {
  width: 76px;
}

/* ---------- Cabecera ---------- */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 76px;
  padding: 16px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.sidebar.collapsed .logo-container {
  justify-content: center;
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 50%;
  background-color: var(--verde-100);
  color: var(--verde-600);
}

.logo-icon svg {
  width: 28px;
  height: 28px;
  display: block;
}

.logo-texto {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.logo-nombre {
  font-size: 0.95rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logo-bajada {
  font-size: 0.7rem;
  color: var(--verde-300);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---------- Navegación ---------- */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
}

.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.25);
  border-radius: 20px;
}

.sidebar-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar-nav li {
  padding: 0 10px;
  margin-bottom: 2px;
}

/* Título de sección (solo visible con la barra expandida) */
.seccion-titulo {
  margin: 14px 0 6px;
  padding: 0 22px !important;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(209, 250, 229, 0.5);
  white-space: nowrap;
}

/* Con la barra colapsada, la sección se reduce a una línea divisoria */
.seccion-separador {
  height: 1px;
  margin: 10px 14px !important;
  padding: 0 !important;
  background-color: rgba(255, 255, 255, 0.1);
}

.seccion-separador:first-child,
.seccion-titulo:first-child {
  margin-top: 4px;
}

.sidebar-nav a {
  display: flex;
  align-items: center;
  min-height: 44px; /* objetivo táctil cómodo */
  padding: 10px 12px;
  border-radius: 8px;
  border-left: 3px solid transparent;
  color: #d1fae5;
  text-decoration: none;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.sidebar.collapsed .sidebar-nav a {
  justify-content: center;
  padding: 10px;
}

.sidebar-nav a:hover {
  background-color: var(--verde-800);
  color: #ffffff;
}

.sidebar-nav a:focus-visible {
  outline: 2px solid var(--verde-400);
  outline-offset: -2px;
}

.sidebar-nav a.active {
  background-color: var(--verde-700);
  border-left-color: var(--verde-300);
  color: #ffffff;
  font-weight: 600;
}

.sidebar.collapsed .sidebar-nav a.active {
  border-left-color: transparent;
  box-shadow: inset 3px 0 0 var(--verde-300);
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

.sidebar.collapsed .menu-icon {
  margin-right: 0;
}

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

  /* Respeta la barra de gestos en iPhone */
  padding-bottom: max(14px, env(safe-area-inset-bottom));
}

.user-info {
  width: 100%;
  min-width: 0;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.15);
}

.user-avatar-container {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--verde-600);
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
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 0.75rem;
  color: var(--verde-300);
}

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
  color: #d1fae5;
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

.logout-icon {
  font-size: 1rem;
  line-height: 1;
}

.logout-text {
  margin-left: 10px;
}

/* ---------- Móvil: cajón lateral ---------- */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 265px;
    max-width: 85vw;
    transform: translateX(-100%);
    box-shadow: 0 0 24px rgba(0, 0, 0, 0.3);
    transition: transform 0.35s cubic-bezier(0.23, 1, 0.32, 1);
  }

  /* En móvil la barra no se colapsa: se abre o se cierra completa */
  .sidebar.collapsed {
    width: 265px;
  }

  .sidebar.is-open {
    transform: translateX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .sidebar-nav a,
  .logout-button {
    transition: none;
  }
}
</style>