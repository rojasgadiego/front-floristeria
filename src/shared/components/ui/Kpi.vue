<template>
  <div class="kpi" :class="{ 'kpi--destacado': destacado, 'kpi--resaltado': resaltado }">
    <div class="kpi__rot">{{ rotulo }}</div>

    <template v-if="loading">
      <Skeleton alto="1.7rem" ancho="70%" />
      <Skeleton alto=".75rem" ancho="90%" style="margin-top:8px" />
    </template>

    <template v-else>
      <div class="kpi__val" :class="{ 'kpi__val--rojo': valorRojo, 'kpi__val--suave': suave }">
        <slot name="valor">{{ valor }}</slot>
      </div>
      <div class="kpi__pie"><slot name="pie" /></div>
    </template>
  </div>
</template>

<script>
import Skeleton from './Skeleton.vue'
export default {
  name: 'Kpi',
  components: { Skeleton },
  props: {
    rotulo: String,
    valor: [String, Number],
    valorRojo: Boolean,
    suave: Boolean,
    destacado: Boolean,
    resaltado: Boolean,
    loading: Boolean
  }
}
</script>

<style scoped>
.kpi {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 17px;
  box-shadow: var(--sh-1);
  transition: border-color .18s, box-shadow .18s, transform .18s;
}
.kpi:hover { border-color: var(--border-strong); box-shadow: var(--sh-2); transform: translateY(-2px); }

.kpi__rot {
  font-size: .67rem; font-weight: 700; letter-spacing: .08em;
  text-transform: uppercase; color: var(--text-muted);   /* era --text-3 */
}
.kpi__val {
  font-size: clamp(1.35rem, 5vw, 1.7rem);
  font-weight: 700; margin-top: 5px; letter-spacing: -.02em;
  font-variant-numeric: tabular-nums; color: var(--text);
}
.kpi__val--rojo  { color: var(--danger); }
.kpi__val--suave { color: var(--text-faint); }            /* era --text-4 */
.kpi__pie { font-size: .75rem; color: var(--text-muted); margin-top: 4px; line-height: 1.45; }  /* era --text-3 */

/* Destacado */
.kpi--destacado { background: var(--accent); border-color: var(--accent); }
.kpi--destacado .kpi__rot { color: color-mix(in srgb, var(--accent-fg) 75%, transparent); }
.kpi--destacado .kpi__val { color: var(--accent-fg); }
.kpi--destacado :deep(.kpi__pie),
.kpi--destacado .kpi__pie { color: color-mix(in srgb, var(--accent-fg) 82%, transparent); }

.kpi--resaltado { border-color: var(--ok-bd); background: var(--ok-bg); }
</style>

