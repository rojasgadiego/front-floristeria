<template>
  <!-- Botón polimórfico: renderiza <button> o <router-link> según haya `to`. -->
  <component
    :is="etiqueta"
    :to="to"
    :type="to ? undefined : type"
    :disabled="!to && disabled"
    class="btn"
    :class="[`btn--${variante}`, `btn--${tam}`, { 'btn--cargando': loading }]"
  >
    <span v-if="loading" class="btn__spin" aria-hidden="true" />
    <slot v-else name="icono" />
    <span v-if="$slots.default" class="btn__txt"><slot /></span>
  </component>
</template>

<script>
export default {
  name: 'Boton',
  props: {
    variante: { type: String, default: 'primario' }, // primario | linea | fantasma | peligro
    tam: { type: String, default: 'md' },             // sm | md
    to: { type: [String, Object], default: null },
    type: { type: String, default: 'button' },
    disabled: Boolean,
    loading: Boolean
  },
  computed: {
    etiqueta () { return this.to ? 'router-link' : 'button' }
  }
}
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color .18s, border-color .18s, color .18s, transform .05s;
}
.btn:active:not(:disabled) { transform: translateY(1px); }
.btn:disabled { opacity: .55; cursor: not-allowed; }

/* Tamaños (min-height ≥44px = touch friendly) */
.btn--md { min-height: 44px; padding: 0 16px; font-size: .92rem; }
.btn--sm { min-height: 34px; padding: 0 12px; font-size: .8rem; }

/* Variantes */
.btn--primario { background: var(--accent); color: var(--accent-fg); }
.btn--primario:hover:not(:disabled) { background: var(--accent-hover); }

.btn--linea { background: var(--surface); border-color: var(--border-strong); color: var(--text-2); }
.btn--linea:hover:not(:disabled) { background: var(--surface-hover); border-color: var(--text-4); }

.btn--fantasma { background: transparent; color: var(--text-2); }
.btn--fantasma:hover:not(:disabled) { background: var(--surface-2); }

.btn--peligro { background: var(--danger); color: #fff; }
.btn--peligro:hover:not(:disabled) { filter: brightness(.94); }

.btn__spin {
  width: 15px; height: 15px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: giro .6s linear infinite;
}
@keyframes giro { to { transform: rotate(360deg); } }
</style>
