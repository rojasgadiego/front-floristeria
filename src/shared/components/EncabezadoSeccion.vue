<template>
  <div class="cab-seccion">
    <router-link :to="volverA" class="volver">
      <span aria-hidden="true">←</span> {{ textoVolver }}
    </router-link>

    <h2 class="titulo">{{ titulo }}</h2>

    <div v-if="$slots.acciones" class="acciones">
      <slot name="acciones" />
    </div>
  </div>
</template>

<script>
export default {
  name: 'EncabezadoSeccion',
  props: {
    titulo: { type: String, required: true },
    // Destino del router-link "Volver". Acepta lo mismo que :to de vue-router.
    volverA: { type: [String, Object], default: () => ({ name: 'Inventario' }) },
    textoVolver: { type: String, default: 'Volver' }
  }
}
</script>

<style scoped>
.cab-seccion {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.volver {
  order: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 8px 14px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm, 8px);
  background: var(--surface);
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.15s, border-color 0.15s;
}
.volver:hover { background: var(--surface-2); border-color: var(--border); }

.titulo {
  order: 2;
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: clamp(1.15rem, 4vw, 1.4rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}

.acciones {
  order: 3;
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* --- Móvil: volver arriba a la derecha, título centrado, acción centrada debajo --- */
@media (max-width: 640px) {
  .cab-seccion { flex-direction: column; align-items: center; gap: 10px; }
  .volver { align-self: flex-end; }
  .titulo { width: 100%; text-align: center; }
  .acciones { align-self: center; }
}
</style>