<template>
  <div class="reloj" role="group" :aria-label="`Hora actual: ${hora}`">
    <!--
      Carátula real: las agujas apuntan a la hora que se está mostrando.
      Un emoji de reloj está clavado en una hora fija y siempre miente.
    -->
    <svg class="caratula" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.32" />
      <line x1="12" y1="12" x2="12" y2="7.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
        :transform="`rotate(${anguloHora} 12 12)`" />
      <line x1="12" y1="12" x2="12" y2="5.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"
        opacity="0.75" :transform="`rotate(${anguloMinuto} 12 12)`" />
    </svg>

    <span class="hora">{{ hora }}</span>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'

export default {
  name: 'RelojAhora',

  setup() {
    const ahora = ref(new Date())

    /*
     * hour12: false es obligatorio. es-CL por defecto entrega 12 horas
     * con sufijo — "10:49 p. m." — que en un POS es largo y ambiguo.
     * Forzado a 24 h queda "22:49".
     */
    const hora = computed(() =>
      ahora.value.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    )

    /* Aguja horaria: 30° por hora más el avance proporcional de los
     * minutos, si no a las 12:59 seguiría apuntando al 12 exacto. */
    const anguloHora = computed(() => {
      const h = ahora.value.getHours() % 12
      return h * 30 + ahora.value.getMinutes() * 0.5
    })

    const anguloMinuto = computed(() => ahora.value.getMinutes() * 6)

    let idIntervalo = null
    let idAlineacion = null

    const refrescar = () => { ahora.value = new Date() }

    /*
     * Se alinea al cambio de minuto en vez de disparar cada 60 s desde el
     * montaje. Si la vista se abre a las 21:59:58, un intervalo simple
     * mostraría "21:59" hasta las 22:00:58 — casi un minuto de atraso.
     */
    const arrancar = () => {
      detener()
      refrescar()
      const restoDelMinuto = 60000 - (Date.now() % 60000)
      idAlineacion = setTimeout(() => {
        refrescar()
        idIntervalo = setInterval(refrescar, 60000)
      }, restoDelMinuto)
    }

    const detener = () => {
      if (idAlineacion) clearTimeout(idAlineacion)
      if (idIntervalo) clearInterval(idIntervalo)
      idAlineacion = null
      idIntervalo = null
    }

    /*
     * El navegador ralentiza los temporizadores de las pestañas en
     * segundo plano. Al volver a primer plano hay que resincronizar o el
     * reloj queda atrasado sin aviso.
     */
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible') arrancar()
      else detener()
    }

    onMounted(() => {
      arrancar()
      document.addEventListener('visibilitychange', alCambiarVisibilidad)
    })

    onUnmounted(() => {
      detener()
      document.removeEventListener('visibilitychange', alCambiarVisibilidad)
    })

    return { hora, anguloHora, anguloMinuto }
  }
}
</script>

<style scoped>
/*
 * Deliberadamente callado: neutro, sin color de marca. El pill de caja
 * usa color para señalar estado; si el reloj gritara igual de fuerte
 * competiría con la única información del header que sí exige atención.
 */
.reloj {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  padding: 5px 12px 5px 10px;
  border: 1px solid var(--borde);
  border-radius: var(--radio-pill);
  background: var(--tarjeta-hundida);
  color: var(--texto-suave);
  white-space: nowrap;
}

.caratula {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.hora {
  font-size: 0.8rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  color: var(--texto-medio);
}

@media (max-width: 380px) {
  .reloj {
    padding: 4px 10px 4px 8px;
  }

  .hora {
    font-size: 0.76rem;
  }
}
</style>