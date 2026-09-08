<template>
  <div class="overlay" @click.self="$emit('cerrar')">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-caja">
      <h2 id="titulo-caja">Abrir caja</h2>
      <p class="ayuda">
        Cuenta el fondo que dejas en el cajón. Contra ese monto se calcula la
        diferencia al cerrar.
      </p>

      <label class="campo-monto">
        <span>Fondo inicial</span>
        <div class="monto">
          <span class="signo">$</span>
          <input
            ref="entrada"
            v-model.number="fondo"
            type="number"
            min="0"
            step="1000"
            inputmode="numeric"
            placeholder="0"
            @keyup.enter="abrir"
          >
        </div>
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="acciones">
        <button class="btn btn-linea" :disabled="guardando" @click="$emit('cerrar')">
          Cancelar
        </button>
        <button class="btn" :disabled="guardando" @click="abrir">
          {{ guardando ? 'Abriendo…' : 'Abrir y vender' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useStore } from 'vuex'

const emit = defineEmits(['cerrar', 'abierta'])
const store = useStore()

const fondo = ref(null)
const error = ref('')
const entrada = ref(null)

const guardando = computed(() => store.getters['caja/guardando'])

/* El foco entra solo en el campo: el vendedor viene a escribir un número,
   no a buscar dónde hacer click. */
onMounted(() => nextTick(() => entrada.value?.focus()))

const abrir = async () => {
  error.value = ''
  const monto = Number(fondo.value) || 0

  if (monto < 0) return (error.value = 'El fondo no puede ser negativo.')

  try {
    await store.dispatch('caja/abrir', monto)
    emit('abierta')
  } catch (e) {
    /* El mensaje viene del RAISE del SP: "Ya hay una caja abierta por Rosa
       Méndez". Nombra a la persona, que es lo que permite ir a buscarla. */
    error.value = e.message
  }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--overlay);
}

.modal {
  width: 100%;
  max-width: 360px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  padding: 24px;
}

h2 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}

.ayuda {
  font-size: .85rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin: 6px 0 18px;
}

.campo-monto {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.campo-monto > span {
  font-size: .8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.monto {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  padding: 0 14px;
  min-height: 56px;
  transition: border-color var(--t-fast);
}

.monto:focus-within { border-color: var(--accent); }

.signo {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-faint);
}

.monto input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  color: var(--text);
  font: inherit;
  /* Grande y tabular: se lee de un vistazo mientras se cuenta plata. */
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Sin las flechitas del number: al contar plata estorban, y un click
   accidental cambia el monto sin que nadie lo note. */
.monto input::-webkit-outer-spin-button,
.monto input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.monto input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.error {
  color: var(--danger);
  font-size: .85rem;
  margin-top: 10px;
}

.acciones {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  flex: 1;
  min-height: 48px;
  border: none;
  border-radius: var(--r-sm);
  background: var(--accent);
  color: var(--accent-contrast);
  font: inherit;
  font-size: .95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--t-fast);
}

.btn:hover:not(:disabled) { background: var(--accent-hover); }

.btn:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.btn-linea {
  flex: 0 0 auto;
  padding: 0 18px;
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.btn-linea:hover:not(:disabled) {
  background: var(--surface-2);
  color: var(--text);
}
</style>