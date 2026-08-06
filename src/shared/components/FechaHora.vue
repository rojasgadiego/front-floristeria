<template>
  <div class="fecha-hora">
    <!-- Dos versiones del mismo dato. Se calculan las dos siempre y el
         CSS decide cuál se ve: así no hace falta un listener de resize
         ni pasar isMobile hasta acá. -->
    <span class="larga">{{ fechaLarga }}</span>
    <span class="corta">{{ fechaCorta }}</span>
    <span class="sep" aria-hidden="true">·</span>
    <time class="hora" :datetime="iso">{{ hora }}</time>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const DIAS_CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

const dos = (n) => String(n).padStart(2, '0')

export default {
  name: 'FechaHora',

  setup() {
    const fechaLarga = ref('')
    const fechaCorta = ref('')
    const hora = ref('')
    const iso = ref('')

    let temporizador = null

    const actualizar = () => {
      const d = new Date()

      /* La mayúscula se pone acá y no con text-transform: capitalize,
         que capitaliza todas las palabras y produce "Miércoles 29 De Julio". */
      const larga = `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
      fechaLarga.value = larga.charAt(0).toUpperCase() + larga.slice(1)

      fechaCorta.value = `${DIAS_CORTO[d.getDay()]} ${d.getDate()} ${MESES_CORTO[d.getMonth()]}`
      hora.value = `${dos(d.getHours())}:${dos(d.getMinutes())}`
      iso.value = `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${hora.value}`
    }

    /*
     * Se despierta en el cambio de minuto, no cada segundo: son 60 veces
     * menos renders para un reloj que ni siquiera muestra segundos. Como
     * la fecha se recalcula en cada tick, la medianoche se resuelve sola.
     */
    const programar = () => {
      const d = new Date()
      const restante = 60000 - (d.getSeconds() * 1000 + d.getMilliseconds())
      temporizador = setTimeout(() => {
        actualizar()
        programar()
      }, restante + 40)
    }

    /*
     * El navegador estrangula los timers de las pestañas en segundo plano
     * y el reloj queda atrasado. Al volver se corrige y se reprograma.
     */
    const alVolver = () => {
      if (document.visibilityState !== 'visible') return
      clearTimeout(temporizador)
      actualizar()
      programar()
    }

    onMounted(() => {
      actualizar()
      programar()
      document.addEventListener('visibilitychange', alVolver)
    })

    onUnmounted(() => {
      clearTimeout(temporizador)
      document.removeEventListener('visibilitychange', alVolver)
    })

    return { fechaLarga, fechaCorta, hora, iso }
  }
}
</script>

<style scoped>
.fecha-hora {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;

  font-size: 0.78rem;
  line-height: 1.3;
  color: #57534e;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.hora {
  font-weight: 600;
  color: #1c1917;
}

.sep {
  color: #a8a29e;
}

/* La fecha corta es la de base y la larga aparece cuando hay ancho:
   móvil primero, igual que en el panel. */
.larga {
  display: none;
}

@media (min-width: 640px) {
  .larga {
    display: inline;
  }

  .corta {
    display: none;
  }
}
</style>