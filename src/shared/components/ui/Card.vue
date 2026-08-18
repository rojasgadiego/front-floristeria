<template>
  <section class="card" :class="{ 'card--plano': plano }">
    <header v-if="titulo || $slots.accion" class="card__head">
      <h3 v-if="titulo" class="card__titulo">{{ titulo }}</h3>
      <div class="card__accion"><slot name="accion" /></div>
    </header>
    <slot />
  </section>
</template>

<script>
export default {
  name: 'Card',
  props: {
    titulo: { type: String, default: '' },
    plano: Boolean // sin sombra
  }
}
</script>

<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 18px;
  box-shadow: var(--sh-1);
}
.card--plano { box-shadow: none; }

.card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.card__titulo { margin: 0; font-size: .95rem; font-weight: 600; color: var(--text); }
</style>
