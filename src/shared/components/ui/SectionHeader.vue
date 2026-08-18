<template>
  <div class="section-header">
    <div class="section-header__texto">
      <!-- Icono opcional a la izquierda del título -->
      <div v-if="$slots.icono" class="section-header__icono">
        <slot name="icono" />
      </div>

      <div class="section-header__titulos">
        <component
          :is="nivel"
          class="section-header__title"
        >
          {{ titulo }}
        </component>

        <p
          v-if="subtitulo"
          class="section-header__subtitle"
        >
          {{ subtitulo }}
        </p>
      </div>
    </div>

    <!-- Acciones: botones, filtros, etc. -->
    <div v-if="$slots.acciones" class="section-header__acciones">
      <slot name="acciones" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  /* Texto principal del encabezado */
  titulo: {
    type: String,
    required: true
  },
  /* Texto secundario opcional bajo el título */
  subtitulo: {
    type: String,
    default: ''
  },
  /* Nivel semántico del título (h1, h2, h3...).
     Por defecto h2 porque el h1 lo lleva el AppHeader. */
  nivel: {
    type: String,
    default: 'h2',
    validator: (v) => ['h1', 'h2', 'h3', 'h4'].includes(v)
  }
})
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.section-header__texto {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0; /* permite truncar en pantallas pequeñas */
}

.section-header__icono {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--r-md);   /* era --radius-md */
  color: var(--accent);
  background: var(--accent-soft);
}

.section-header__titulos {
  min-width: 0;
}

.section-header__title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--text);
}

.section-header__subtitle {
  margin: 2px 0 0;
  font-size: 0.88rem;
  line-height: 1.4;
  color: var(--text-muted);
}

.section-header__acciones {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* ---------- Responsive ---------- */
@media (max-width: 640px) {
  .section-header {
    flex-direction: column;
    align-items: stretch;
  }

  .section-header__acciones {
    justify-content: flex-start;
  }
}
</style>
