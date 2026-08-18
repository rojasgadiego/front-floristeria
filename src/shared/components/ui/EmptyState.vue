<!-- src/shared/components/ui/EmptyState.vue -->
<template>
  <div class="empty">
    <component :is="icono" :size="28" class="empty__ico" />
    <p class="empty__txt">{{ texto }}</p>
  </div>
</template>

<script setup>
defineProps({
  icono: { type: [Object, Function], required: true },
  texto: { type: String, required: true }
})
</script>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 20px;
  border-radius: var(--r-lg);
  border: 1px dashed color-mix(in srgb, var(--text) 15%, transparent);
  color: var(--text-soft);
  text-align: center;
}
.empty__ico { opacity: .5; }
.empty__txt { font-size: .9rem; }
</style>