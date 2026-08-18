<template>
  <div class="app-wrapper" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">

    <!-- Franja izquierda para expandir el sidebar con el mouse (solo escritorio) -->
    <div class="hover-area" @mouseenter="expandSidebar"></div>

    <!-- Barra lateral -->
    <AppSidebar
      :is-sidebar-collapsed="isSidebarCollapsed"
      :is-mobile="isMobile"
      :is-mobile-open="isMobile && !isSidebarCollapsed"
      :current-user="currentUser"
      :user-roles="userRoles"
      :user-initials="userInitials"
      @expand-sidebar="expandSidebar"
      @collapse-sidebar="collapseSidebar"
      @close-mobile-sidebar="closeMobileSidebar"
      @handle-navigation="handleNavigation"
      @logout="logout"
    />

    <!-- Fondo oscuro para cerrar el sidebar en móvil -->
    <div
      v-if="isMobile && !isSidebarCollapsed"
      class="sidebar-overlay"
      @click="closeMobileSidebar"
    ></div>

    <!-- Contenido principal -->
    <div class="main-content">
      <AppHeader
        :is-mobile="isMobile"
        :current-route-name="currentRouteName"
        @expand-sidebar="expandSidebar"
      />

      <!-- MainLayout.vue -->
      <main class="content-wrapper">
        <router-view />
      </main>

    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useRouter, useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue' 
import AppHeader from './AppHeader.vue' 

const ANCHO_MOVIL = 768

export default {
  name: 'MainLayout',

  components: {
    AppSidebar,
    AppHeader
  },

  setup () {
    const store = useStore()
    const router = useRouter()
    const route = useRoute()

    const isSidebarCollapsed = ref(true)
    const isMobile = ref(false)
    const autoCollapseEnabled = ref(true)

    /* ------------------------------------------------------------------
     * Temporizador de colapso automático
     * ------------------------------------------------------------------ */
    let collapseTimer = null

    const cancelarColapso = () => {
      clearTimeout(collapseTimer)
      collapseTimer = null
    }

    const programarColapso = (ms) => {
      if (!autoCollapseEnabled.value || isMobile.value) return
      cancelarColapso()
      collapseTimer = setTimeout(() => {
        isSidebarCollapsed.value = true
      }, ms)
    }

    /* ------------------------------------------------------------------
     * Detección de móvil
     * Los manejadores son funciones con nombre para poder retirarlos
     * después: con funciones anónimas, removeEventListener no hace nada.
     * ------------------------------------------------------------------ */
    const checkMobile = () => {
      const eraMovil = isMobile.value
      isMobile.value = window.innerWidth <= ANCHO_MOVIL
      autoCollapseEnabled.value = !isMobile.value

      // Al cruzar el umbral, cerrar para no dejar el cajón abierto encima
      if (eraMovil !== isMobile.value) {
        cancelarColapso()
        isSidebarCollapsed.value = true
      }
    }

    const alEnfocarVentana = () => {
      programarColapso(2000)
    }

    /* ------------------------------------------------------------------
     * Ciclo de vida
     * ------------------------------------------------------------------ */
    onMounted(() => {
      checkMobile()
      window.addEventListener('resize', checkMobile)
      window.addEventListener('focus', alEnfocarVentana)

      // El estado guardado solo aplica en escritorio: en móvil el sidebar
      // es un cajón sobre el contenido y siempre parte cerrado
      if (!isMobile.value) {
        const savedState = localStorage.getItem('sidebarState')
        if (savedState) {
          isSidebarCollapsed.value = savedState === 'collapsed'
        }
        programarColapso(2000)
      }
    })

    onUnmounted(() => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('focus', alEnfocarVentana)
      cancelarColapso()
    })

    /* ------------------------------------------------------------------
     * Reacciones
     * ------------------------------------------------------------------ */
    watch(
      () => route.path,
      () => {
        if (isMobile.value) {
          isSidebarCollapsed.value = true
        } else {
          programarColapso(2000)
        }
      }
    )

    watch(isSidebarCollapsed, (colapsado) => {
      if (!isMobile.value) {
        localStorage.setItem('sidebarState', colapsado ? 'collapsed' : 'expanded')
      }
    })

    /* ------------------------------------------------------------------
     * Acciones del sidebar
     * ------------------------------------------------------------------ */
    const expandSidebar = () => {
      cancelarColapso()
      isSidebarCollapsed.value = false
    }

    const collapseSidebar = () => {
      programarColapso(300) // pequeño retraso para evitar colapsos accidentales
    }

    const closeMobileSidebar = () => {
      if (isMobile.value) isSidebarCollapsed.value = true
    }

    const handleNavigation = () => {
      programarColapso(2000)
    }

    /* ------------------------------------------------------------------
     * Usuario
     * ------------------------------------------------------------------ */
    const currentUser = computed(() => store.getters['auth/currentUser'])
    const userRoles = computed(() => store.getters['auth/userRoles'] || [])

    const userInitials = computed(() => {
      if (!currentUser.value) return '?'
      const email = currentUser.value.email || ''
      return email.charAt(0).toUpperCase() || '?'
    })

    const currentRouteName = computed(() => {
      return route.meta.title || route.name || 'Inicio'
    })

    const logout = async () => {
      try {
        await store.dispatch('auth/logout')
        router.push('/login')
      } catch (error) {
        console.error('Error al cerrar sesión:', error)
      }
    }

    return {
      isSidebarCollapsed,
      isMobile,
      currentUser,
      userRoles,
      userInitials,
      currentRouteName,
      expandSidebar,
      collapseSidebar,
      closeMobileSidebar,
      handleNavigation,
      logout
    }
  }
}
</script>

<style scoped>
.app-wrapper {
  display: flex;
  position: relative;
  overflow: hidden;
  background-color: #f5f7fb;

  /* 100dvh evita el salto cuando el navegador móvil esconde su barra */
  height: 100vh;
  height: 100dvh;
}

/* Franja invisible a la izquierda que expande el sidebar al pasar el mouse */
.hover-area {
  position: absolute;
  top: 0;
  left: 0;
  width: 20px;
  height: 100%;
  z-index: 15;
  cursor: default;
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 5;
  cursor: pointer;
}

.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  height: 100%;
}

.content-wrapper {
  flex: 1;
  padding: 20px 24px;
  overflow: auto;
  position: relative;
  display: flex;
  flex-direction: column;

  /* Respeta la barra de gestos en iPhone */
  padding-bottom: max(20px, env(safe-area-inset-bottom));
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 768px) {
  .content-wrapper {
    padding: 16px;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }

  /* En móvil no hay hover: la franja solo estorbaría */
  .hover-area {
    display: none;
  }
}
</style>