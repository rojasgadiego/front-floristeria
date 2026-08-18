<template>
  <span class="badge" :class="`badge--${tono}`">
    <slot name="punto"><span v-if="punto" class="badge__pt" /></slot>
    <slot />
  </span>
</template>

<script>
export default {
  name: 'Badge',
  props: {
    tono: { type: String, default: 'neutro' }, // neutro | acento | ok | warn | peligro
    punto: Boolean
  }
}
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border-radius: var(--r-full);
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
  white-space: nowrap;
  border: 1px solid transparent;
}
.badge__pt { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

.badge--neutro  { background: var(--surface-2); color: var(--text-3); }
.badge--acento  { background: var(--accent-soft); color: var(--accent-ink); }
.badge--ok      { background: var(--ok-bg);     color: var(--ok-ink);     border-color: var(--ok-bd); }
.badge--warn    { background: var(--warn-bg);   color: var(--warn-ink);   border-color: var(--warn-bd); }
.badge--peligro { background: var(--danger-bg); color: var(--danger-ink); border-color: var(--danger-bd); }
</style>
