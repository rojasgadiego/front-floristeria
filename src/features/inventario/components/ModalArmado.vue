<template>
  <div class="fondo" @click.self="$emit('cerrar')">
    <div class="modal">
      <div class="modal-cab">
        <h3>Armar {{ producto.nombre }}</h3>
        <p>Se descuentan los tallos por antigüedad y se suman unidades listas.</p>
      </div>

      <div class="modal-cuerpo">
        <div v-if="error" class="error">{{ error }}</div>

        <div class="grupo">
          <label for="a-cant">¿Cuántas unidades vas a armar?</label>
          <input id="a-cant" class="campo dato" type="number" min="1" v-model.number="cantidad">
        </div>

        <div v-if="consultando" class="suave mini">Revisando qué hay en cámara…</div>

        <template v-else-if="d">
          <!-- Resultado de la consulta -->
          <div class="balance">
            <div class="fila">
              <span>Alcanza con flor de primera</span>
              <b class="dato" :class="d.posiblesConPrimera >= cantidad ? 'ok' : 'corto'">
                {{ d.posiblesConPrimera }}
              </b>
            </div>
            <div v-if="d.posiblesConRecuperada > d.posiblesConPrimera" class="fila">
              <span>Sumando flor recuperada</span>
              <b class="dato">{{ d.posiblesConRecuperada }}</b>
            </div>
          </div>

          <!-- Camino feliz -->
          <div v-if="d.alcanzaConPrimera" class="nota">
            Alcanza con flor de primera. No hace falta usar nada del balde de
            recuperada.
          </div>

          <!-- Faltantes -->
          <template v-else>
            <div class="nota alerta">
              <b>No alcanza con flor de primera.</b>
              <ul class="faltantes">
                <li v-for="f in d.faltantes" :key="f.productoId">
                  {{ f.emoji }} {{ f.producto }}: necesita {{ f.necesita }},
                  hay {{ f.hayDePrimera }} de primera
                  <span v-if="f.hayRecuperada"> y {{ f.hayRecuperada }} recuperada</span>
                  <b v-if="f.faltan > 0" class="corto"> · faltan {{ f.faltan }}</b>
                </li>
              </ul>
            </div>

            <!--
              La flor recuperada está fuera del reparto automático a
              propósito: tiene precio y costo propios. Marcar un lote es una
              decisión, no algo que el sistema deba hacer solo — un ramo de
              matrimonio probablemente no debería llevarla.
            -->
            <div v-if="d.lotesSugeridos.length" class="grupo">
              <label>Autorizar flor recuperada</label>
              <p class="ayuda separado">
                Revisa el estado y los días en cámara antes de marcar. Estos
                lotes se consumen primero y abaratan la producción.
              </p>

              <label v-for="l in d.lotesSugeridos" :key="l.loteId" class="lote"
                :class="{ marcado: autorizados.includes(l.loteId), vencido: l.alerta === 'vencido' }">
                <input type="checkbox" :value="l.loteId" v-model="autorizados">
                <div class="lote-datos">
                  <div class="lote-titulo">
                    <b>{{ l.producto }}</b>
                    <span class="etiqueta" :class="claseAlerta(l.alerta)">{{ l.alerta }}</span>
                    <span v-if="l.calidad" class="etiqueta et-gris">{{ l.calidad }}</span>
                  </div>
                  <div class="mini suave">
                    {{ l.codigo }} · {{ l.varasDisponibles }} varas ·
                    {{ l.diasEnCamara }} días en cámara ·
                    {{ clp(l.costoPorVara) }} por vara
                  </div>
                </div>
              </label>
            </div>

            <div v-else class="nota alerta">
              No hay flor recuperada que cubra el faltante. Hay que comprar o
              armar menos unidades.
            </div>
          </template>

          <div v-if="!puedeArmar" class="nota alerta">
            Con lo que hay en cámara alcanza para {{ maximo }} unidad(es).
          </div>
        </template>
      </div>

      <div class="modal-pie">
        <button class="btn btn-linea" @click="$emit('cerrar')">Cancelar</button>
        <button class="btn" :disabled="guardando || consultando || !puedeArmar" @click="confirmar">
          <span v-if="guardando" class="spinner" aria-hidden="true"></span>
          {{ guardando ? 'Armando…' : `Armar ${cantidad || 0}` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { claseAlerta } from '@/features/lotes/store/lotes.module'

export default {
  name: 'ModalArmado',
  props: {
    producto: { type: Object, required: true }
  },
  emits: ['cerrar', 'armado'],

  setup (props, { emit }) {
    const store = useStore()

    const cantidad = ref(1)
    const autorizados = ref([])
    const error = ref('')
    const consultando = ref(false)

    const d = computed(() => store.getters['productos/disponibilidad'])
    const guardando = computed(() => store.getters['productos/guardando'])

    /*
     * Cuánto se puede armar realmente: si hay lotes recuperados marcados,
     * el techo sube. Sin marcar ninguno, manda la flor de primera.
     */
    const maximo = computed(() => {
      if (!d.value) return 0
      return autorizados.value.length ? d.value.posiblesConRecuperada : d.value.posiblesConPrimera
    })

    const puedeArmar = computed(() => cantidad.value >= 1 && cantidad.value <= maximo.value)

    /*
     * La disponibilidad depende de la cantidad, así que se reconsulta al
     * cambiarla. Con retraso: escribir "12" dispararía una consulta por el
     * 1 y otra por el 12.
     */
    let control = null
    let tmr = null

    const consultar = async () => {
      if (!cantidad.value || cantidad.value < 1) return
      control?.abort()
      control = new AbortController()
      consultando.value = true
      try {
        await store.dispatch('productos/consultarDisponibilidad', {
          id: props.producto.id,
          cantidad: cantidad.value,
          signal: control.signal
        })
      } finally {
        consultando.value = false
      }
    }

    watch(cantidad, () => {
      clearTimeout(tmr)
      tmr = setTimeout(consultar, 400)
    })

    onMounted(consultar)

    onUnmounted(() => {
      clearTimeout(tmr)
      control?.abort()
      store.dispatch('productos/limpiarDisponibilidad')
    })

    const confirmar = async () => {
      error.value = ''
      try {
        const resultado = await store.dispatch('productos/armar', {
          id: props.producto.id,
          cantidad: cantidad.value,
          lotesAutorizados: autorizados.value
        })
        emit('armado', resultado)
      } catch (e) {
        error.value = e.message
      }
    }

    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    return {
      cantidad, autorizados, error, consultando, guardando,
      d, maximo, puedeArmar, confirmar, clp, claseAlerta
    }
  }
}
</script>

<style scoped>
.fondo,
.fondo * {
  box-sizing: border-box;
}

.fondo {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.55);
}

.modal {
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
}

.modal-cab {
  padding: 18px 20px 14px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-cab h3 {
  margin: 0;
  font-size: 1.15rem;
  color: #0f172a;
}

.modal-cab p {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: #64748b;
}

.modal-cuerpo {
  padding: 18px 20px;
  overflow-y: auto;
}

.modal-pie {
  display: flex;
  gap: 9px;
  justify-content: flex-end;
  flex-wrap: wrap;
  padding: 14px 20px;
  border-top: 1px solid #e2e8f0;
}

label {
  display: block;
  margin-bottom: 5px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #475569;
}

.campo {
  width: 100%;
  min-height: 44px;
  padding: 0.6rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  font-family: inherit;
  font-size: max(0.9rem, 16px);
  color: #0f172a;
  outline: none;
}

.campo:focus {
  border-color: transparent;
  box-shadow: 0 0 0 2px #10b981;
}

.grupo {
  margin-bottom: 15px;
}

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.mini {
  font-size: 0.76rem;
}

.suave {
  color: #64748b;
}

.ok {
  color: #047857;
}

.corto {
  color: #b45309;
}

.balance {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 14px;
}

.balance .fila {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 13px;
  font-size: 0.85rem;
  color: #475569;
  border-bottom: 1px solid #f1f5f9;
}

.balance .fila:last-child {
  border-bottom: 0;
}

.error {
  padding: 10px 13px;
  margin-bottom: 14px;
  border-radius: 8px;
  border-left: 4px solid #dc2626;
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.85rem;
}

.nota {
  padding: 11px 13px;
  margin: 14px 0;
  border-radius: 0 8px 8px 0;
  border-left: 3px solid #10b981;
  background: #f0fdf4;
  font-size: 0.83rem;
  color: #475569;
  line-height: 1.6;
}

.nota.alerta {
  border-color: #f59e0b;
  background: #fffbeb;
  color: #78350f;
}

.faltantes {
  margin: 8px 0 0;
  padding-left: 18px;
}

.ayuda {
  margin: 5px 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
  line-height: 1.5;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

.ayuda.separado {
  margin-bottom: 10px;
}

.lote {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  text-transform: none;
  letter-spacing: 0;
  transition: border-color 0.15s, background-color 0.15s;
}

.lote.marcado {
  border-color: #059669;
  background: #f0fdf4;
}

.lote.vencido {
  border-color: #fca5a5;
}

.lote input {
  width: 17px;
  height: 17px;
  margin-top: 2px;
  flex-shrink: 0;
  accent-color: #059669;
  cursor: pointer;
}

.lote-datos {
  min-width: 0;
}

.lote-titulo {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 2px;
  font-size: 0.88rem;
  color: #0f172a;
}

.etiqueta {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.et-verde { background: #d1fae5; color: #047857; }
.et-ambar { background: #fef3c7; color: #92400e; }
.et-rojo { background: #fee2e2; color: #991b1b; }
.et-gris { background: #f1f5f9; color: #64748b; }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: 0.65rem 1.15rem;
  border: none;
  border-radius: 0.5rem;
  background: #059669;
  color: #fff;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:hover:not(:disabled) {
  background: #047857;
}

.btn:disabled {
  background: #a7c9bb;
  cursor: not-allowed;
}

.btn-linea {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #475569;
}

.btn-linea:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #94a3b8;
}

.spinner {
  display: inline-block;
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: girar 0.8s linear infinite;
}

@keyframes girar {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .btn, .lote { transition: none; }
  .spinner { animation: none; }
}
</style>