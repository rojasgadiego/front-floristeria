<template>
  <header class="top-header">

    <div class="header-izquierda">
      <button
        v-if="isMobile"
        class="menu-button"
        @click="$emit('expand-sidebar')"
        aria-label="Abrir menú"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16"/>
        </svg>
      </button>

      <h1 class="breadcrumb">{{ currentRouteName }}</h1>
    </div>

    <div class="header-actions">
      <!-- Va acá y no en el slot: la fecha y la hora sirven en el POS
           para cuadrar caja, en boletas y en mermas, no solo en el panel.
           Por slot habría que acordarse de mandarla vista por vista. -->
      <FechaHora />
      <slot name="header-actions"></slot>
    </div>
  </header>
</template>

<script>
import FechaHora from '@/shared/components/FechaHora.vue';

export default {
  name: 'AppHeader',

  components: { FechaHora },

  props: {
    isMobile: {
      type: Boolean,
      required: true
    },
    currentRouteName: {
      type: String,
      required: true
    }
  },

  emits: ['expand-sidebar']
}
</script>

<style scoped>
.top-header,
.top-header * {
  box-sizing: border-box;
}

.top-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  /*
   * El min-height incluye el padding porque la caja es border-box. Con
   * `min-height: 64px` a secas, en un iPhone con notch los 47px de la
   * barra de estado salían DE los 64 y la barra útil quedaba en 17px.
   * Sumando el inset al alto, los 64px quedan siempre bajo el notch.
   */
  min-height: calc(64px + env(safe-area-inset-top));
  padding: 0 24px;
  padding-top: env(safe-area-inset-top);

  background-color: #ffffff;

  /*
   * Antes: 3px sólidos verdes. Con el panel bento el único acento lleno
   * es el botón de vender, y una regla de 3px arriba se lo peleaba desde
   * otra punta de la pantalla. Ahora el verde queda de línea fina.
   * Para volver atrás: border-bottom: 3px solid #059669;
   */
  border-bottom: 1px solid #e7e5e4;
  box-shadow: 0 1px 3px rgba(28, 25, 23, 0.04);
  flex-shrink: 0;
}

.header-izquierda {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0; /* permite que el título se recorte en vez de desbordar */
}

.menu-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  /* 44px = objetivo táctil cómodo */
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  margin-left: -10px; /* alinea el ícono con el borde del contenido */

  padding: 0;
  border: none;
  border-radius: 8px;
  background: none;
  color: #1c1917;
  cursor: pointer;
  transition: background-color 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.menu-button:hover {
  background-color: #f6f5f3;
}

.menu-button:focus-visible {
  outline: 2px solid #047857;
  outline-offset: 2px;
}

.breadcrumb {
  margin: 0;
  font-size: clamp(0.95rem, 3.6vw, 1rem);
  font-weight: 600;
  color: #1c1917;
  line-height: 1.3;

  /* Títulos largos como "Cotizaciones y Eventos" se recortan
     en vez de empujar las acciones fuera de pantalla */
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .top-header {
    padding: 0 16px;
    padding-top: env(safe-area-inset-top);
  }

  /* En un teléfono de 360px compiten hamburguesa, ruta, fecha y las
     acciones de la vista. La fecha cede espacio antes que el resto. */
  .header-actions {
    gap: 10px;
    min-width: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .menu-button { transition: none; }
}
</style>