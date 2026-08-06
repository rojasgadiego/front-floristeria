<template>
  <span class="esqueleto" :style="estilo"></span>
</template>

<script>
export default {
  name: 'EsqueletoBloque',

  props: {
    ancho: { type: String, default: '100%' },
    alto: { type: String, default: '1rem' },
    radio: { type: String, default: '6px' },
    circulo: { type: Boolean, default: false }
  },

  computed: {
    estilo() {
      return {
        width: this.ancho,
        height: this.alto,
        borderRadius: this.circulo ? '999px' : this.radio
      }
    }
  }
}
</script>

<style scoped>
.esqueleto {
  display: block;
  position: relative;
  overflow: hidden;
  background-color: #e8edf3;
  flex-shrink: 0;
}

/*
 * El brillo se mueve con transform en vez de animar background-position.
 * transform lo maneja el compositor, así que no repinta en cada frame
 * aunque haya veinte bloques a la vez en pantalla.
 */
.esqueleto::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background-image: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.7) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: brillo 1.4s ease-in-out infinite;
}

@keyframes brillo {
  100% { transform: translateX(100%); }
}

@media (prefers-reduced-motion: reduce) {
  .esqueleto::after {
    animation: none;
  }

  /* Sin brillo, un latido suave sigue comunicando "esto está cargando" */
  .esqueleto {
    animation: latido 1.8s ease-in-out infinite;
  }

  @keyframes latido {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.55; }
  }
}
</style>