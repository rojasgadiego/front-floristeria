<template>
  <!--
    Se oculta solo en dos casos, así ninguna vista tiene que preguntárselo:
      · el rol no vende (bodega no necesita saber de la caja)
      · ya estamos en el POS, donde el estado se ve de frente
  -->
  <router-link v-if="visible" to="/pos" class="pill" :class="abierta ? 'pill-ok' : 'pill-aviso'"
    :aria-label="abierta ? 'Caja abierta, ir al punto de venta' : 'Caja cerrada, ir a abrirla'">
    <span class="punto" :class="{ vive: abierta }" aria-hidden="true"></span>
    <span class="texto">{{ abierta ? 'Caja abierta' : 'Caja cerrada' }}</span>
  </router-link>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { useRoute } from 'vue-router'

export default {
  name: 'EstadoCaja',

  setup() {
    const store = useStore()
    const ruta = useRoute()

    const roles = computed(() =>
      (store.getters['auth/userRoles'] || []).map(r => String(r).toLowerCase())
    )
    const puedeVender = computed(() => roles.value.some(r => ['admin', 'vendedor'].includes(r)))

    const caja = computed(() => store.getters['ventas/caja'] || {})
    const abierta = computed(() => !!caja.value.abierta)

    const visible = computed(() => puedeVender.value && ruta.path !== '/pos')

    return { visible, abierta }
  }
}
</script>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  /* 32px de alto visible, pero el ::after lo lleva a 44px táctiles */
  position: relative;
  min-height: 32px;
  padding: 5px 12px;
  border: 1px solid;
  border-radius: var(--radio-pill);
  font-size: 0.74rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.16s, border-color 0.16s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.pill::after {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: var(--radio-pill);
}

.pill:active {
  transform: scale(0.96);
}

.pill-ok {
  background: var(--exito-tinte);
  border-color: var(--exito-borde);
  color: var(--exito-texto);
}

.pill-ok:hover {
  border-color: var(--exito);
}

.pill-aviso {
  background: var(--aviso-tinte);
  border-color: var(--aviso-borde);
  color: var(--aviso-texto);
}

.pill-aviso:hover {
  border-color: var(--aviso);
}

.punto {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

/*
 * El latido solo corre con la caja abierta: comunica "esto está vivo
 * ahora". En cerrada un punto quieto dice lo contrario, que es justo lo
 * que se quiere decir.
 */
.punto.vive {
  animation: latido 2.2s ease-in-out infinite;
}

@keyframes latido {

  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(14, 159, 110, 0.5);
  }

  60% {
    box-shadow: 0 0 0 5px rgba(14, 159, 110, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pill {
    transition: none;
  }

  .punto.vive {
    animation: none;
  }
}
</style>