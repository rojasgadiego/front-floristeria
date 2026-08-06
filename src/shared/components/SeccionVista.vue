<template>
  <section class="seccion">
    <!--
      El rótulo va FUERA de la tarjeta, sobre el fondo de la página. Es lo
      que hace que la línea se lea como separador de página y no como
      borde del contenedor.

      Sin `titulo` la sección sigue existiendo: aporta el ritmo vertical
      sin rotular lo que ya es evidente.
    -->
    <div v-if="titulo || $slots.accion" class="seccion-cab">
      <span v-if="titulo" class="seccion-rot">{{ titulo }}</span>
      <span
        class="seccion-linea"
        :class="{ 'hasta-accion': !!$slots.accion }"
        aria-hidden="true"
      ></span>
      <div v-if="$slots.accion" class="seccion-accion">
        <slot name="accion" />
      </div>
    </div>

    <slot />
  </section>
</template>

<script>
export default {
  name: 'SeccionVista',

  props: {
    /** Rótulo en mayúsculas. Omitir cuando el contenido se explica solo. */
    titulo: { type: String, default: '' }
  }
}
</script>

<style scoped>
/*
 * COLORES CON RESPALDO
 * --------------------------------------------------------------
 * `background: var(--borde)` con --borde sin definir NO cae al color
 * anterior: la declaración completa se invalida y el fondo termina en
 * transparent. Una línea de 1px transparente es una línea que no existe,
 * y es exactamente por eso que este separador no se veía.
 *
 * La cadena de respaldo aprovecha que las custom properties se heredan
 * por el DOM: si la vista contenedora define --linea (como hace el
 * panel), la toma de ahí; si no hay ninguna, usa el literal. Así el
 * componente nunca depende de que exista un token global.
 */
.seccion {
  --sep-color: var(--borde, var(--linea, #d6d3d1));
  --sep-rot: var(--texto-suave, var(--txt-3, #78716c));

  margin-bottom: 22px;
}

.seccion:last-child {
  margin-bottom: 0;
}

.seccion-cab {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.seccion-rot {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--sep-rot);
  white-space: nowrap;
}

/*
 * La línea nace junto al rótulo y se disuelve hacia el borde: marca la
 * separación donde importa sin cerrar la fila con un trazo duro que
 * compita con los bordes de las tarjetas de abajo.
 *
 * Se hace con máscara y no con `background: linear-gradient(...)` para
 * no repetir el color en cada parada; y si el navegador no soporta
 * mask-image, la línea sale sólida en vez de desaparecer.
 *
 * Las paradas no están repartidas parejo: un desvanecido de alfa lineal
 * se lee como si empezara muy tarde y cortara de golpe. Esta curva
 * suelta rápido al principio y arrastra una cola larga y tenue.
 */
.seccion-linea {
  --fin: transparent;

  flex: 1;
  min-width: 20px; /* con títulos largos en móvil, que no desaparezca */
  height: 1px;
  background: var(--sep-color);

  -webkit-mask-image: linear-gradient(
    to right,
    #000 0%,
    #000 12%,
    rgba(0, 0, 0, 0.5) 42%,
    rgba(0, 0, 0, 0.18) 72%,
    var(--fin) 100%
  );
  mask-image: linear-gradient(
    to right,
    #000 0%,
    #000 12%,
    rgba(0, 0, 0, 0.5) 42%,
    rgba(0, 0, 0, 0.18) 72%,
    var(--fin) 100%
  );
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

/*
 * Cuando hay acción a la derecha, la línea es un puente entre el rótulo
 * y el botón. Si se apaga del todo, el botón queda flotando suelto: acá
 * la cola muere tenue pero no en cero.
 */
.seccion-linea.hasta-accion {
  --fin: rgba(0, 0, 0, 0.3);
}

.seccion-accion {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 640px) {
  .seccion {
    margin-bottom: 18px;
  }

  .seccion-rot {
    font-size: 0.64rem;
  }
}
</style>