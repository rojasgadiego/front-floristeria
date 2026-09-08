<template>
  <div class="app-wrapper" :class="{ 'sidebar-collapsed': colapsadoVisual }">

    <!-- Franja para expandir el sidebar con el mouse (solo escritorio con hover) -->
    <div
      v-if="!esCajon && permiteHover"
      class="hover-area"
      @mouseenter="expandir"
    ></div>

    <AppSidebar
      :current-user="currentUser"
      :user-roles="userRoles"
      :user-initials="userInitials"
      @logout="logout"
    />

    <div class="main-content">
      <AppHeader />

      <main class="content-wrapper">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useRouter, useRoute } from 'vue-router'

import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import { useLayout } from '@/shared/composables/useLayout.js' 

const store = useStore()
const router = useRouter()
const route = useRoute()

const {
  esCajon,
  permiteHover,
  colapsadoVisual,
  expandir,
  programarColapso,
  cerrarCajon,
  alEnfocarVentana
} = useLayout()

/* -------- Ciclo de vida propio del layout -------- */
onMounted(() => {
  window.addEventListener('focus', alEnfocarVentana)
  if (!esCajon.value) programarColapso(2000)
})

onUnmounted(() => {
  window.removeEventListener('focus', alEnfocarVentana)
})

/* Al cambiar de ruta: en móvil cerrar el cajón, en escritorio reprogramar colapso.
   (El sidebar ya cierra solo al navegar; esto cubre navegaciones programáticas.) */
watch(
  () => route.path,
  () => {
    if (esCajon.value) cerrarCajon()
    else programarColapso(2000)
  }
)

/* -------- Usuario -------- */
const currentUser = computed(() => store.getters['auth/currentUser'])
const userRoles = computed(() => store.getters['auth/userRoles'] || [])

const userInitials = computed(() => {
  if (!currentUser.value) return '?'
  const email = currentUser.value.email || ''
  return email.charAt(0).toUpperCase() || '?'
})

const logout = async () => {
  try {
    await store.dispatch('auth/logout')
    router.push('/login')
  } catch (error) {
    console.error('Error al cerrar sesión:', error)
  }
}
</script>

<style scoped>
.app-wrapper {
  display: flex;
  position: relative;
  overflow: hidden;
  background-color: var(--bg, #f5f7fb);

  height: 100vh;
  height: 100dvh;
}

.hover-area {
  position: absolute;
  top: 0;
  left: 0;
  width: 20px;
  height: 100%;
  z-index: 15;
  cursor: default;
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

  padding-bottom: max(20px, env(safe-area-inset-bottom));
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 768px) {
  .content-wrapper {
    padding: 16px;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
}
</style>
