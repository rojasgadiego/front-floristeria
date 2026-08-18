<template>
  <span
    class="sk"
    :style="{ width: ancho, height: alto, borderRadius: radio }"
    aria-hidden="true"
  />
</template>

<script>
export default {
  name: 'Skeleton',
  props: {
    ancho: { type: String, default: '100%' },
    alto: { type: String, default: '1em' },
    radio: { type: String, default: 'var(--r-sm)' }
  }
}
</script>

<style scoped>
.sk {
  display: block;
  background: linear-gradient(
    90deg,
    var(--surface-2) 25%,
    color-mix(in srgb, var(--surface-2) 55%, var(--border)) 37%,
    var(--surface-2) 63%
  );
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
</style>
