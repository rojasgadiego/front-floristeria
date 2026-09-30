<template>
  <div class="campo-foto">
    <div class="marco" :class="{ vacio: !vista }">
      <img v-if="vista" :src="vista" alt="">
      <span v-else class="marco__emoji" aria-hidden="true">{{ emoji || '📷' }}</span>
    </div>

    <div class="acciones">
      <div class="botones">
        <!-- Un solo <input type="file"> hace lo que se pide en cada equipo:
             en el teléfono abre la galería (y ofrece la cámara), en el
             computador abre las carpetas. Sin `capture`, que forzaría la
             cámara. -->
        <button type="button" class="btn-foto" :disabled="procesando" @click="archivo?.click()">
          {{ procesando ? 'Preparando…' : vista ? 'Cambiar foto' : 'Elegir foto' }}
        </button>
        <button v-if="vista && !procesando" type="button" class="quitar" @click="quitar">Quitar</button>
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-else class="ayuda">
        Desde la galería del teléfono o una carpeta del computador. Si no hay
        foto se muestra el emoji.
      </p>
    </div>

    <input ref="archivo" class="oculto" type="file" accept="image/*" @change="alElegir">
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { reducirImagen } from '@/core/utils/reducirImagen'
import { imagenesService } from '@/features/inventario/services/imagenes.service'
import { useFotosProducto } from '@/shared/composables/useFotosProducto'

/*
 * El campo no sube nada por su cuenta: el producto puede ser nuevo y no
 * tener id todavía. Guarda la elección y el modal llama a aplicar(id)
 * después de guardar la ficha.
 */
const props = defineProps({
  productoId: { type: Number, default: null },
  emoji: { type: String, default: '' }
})

const { cargar, urlFoto, registrar, olvidar } = useFotosProducto()

/* Si el modal se abre sin haber pasado por el inventario, el mapa de fotos
   aún no está: se pide acá (si ya estaba, no hace nada). */
cargar()

const archivo = ref(null)
const nueva = ref(null) // Blob reducido, pendiente de subir
const nuevaUrl = ref('') // su vista previa
const quitada = ref(false)
const procesando = ref(false)
const error = ref('')

const actual = computed(() => (props.productoId ? urlFoto(props.productoId) : null))
const vista = computed(() => nuevaUrl.value || (quitada.value ? null : actual.value))

/** Para el "¿descartar cambios?" del modal. */
const cambiada = computed(() => !!nueva.value || (quitada.value && !!actual.value))

const soltarVista = () => {
  if (nuevaUrl.value) URL.revokeObjectURL(nuevaUrl.value)
  nuevaUrl.value = ''
}

const alElegir = async (e) => {
  const elegido = e.target.files?.[0]
  e.target.value = '' // permite volver a elegir la misma foto
  if (!elegido) return

  error.value = ''
  procesando.value = true
  try {
    const blob = await reducirImagen(elegido)
    soltarVista()
    nueva.value = blob
    nuevaUrl.value = URL.createObjectURL(blob)
    quitada.value = false
  } catch (err) {
    error.value = err.message
  } finally {
    procesando.value = false
  }
}

const quitar = () => {
  soltarVista()
  nueva.value = null
  quitada.value = true
  error.value = ''
}

/**
 * Sube o quita según lo elegido. Lanza si falla: el modal decide qué
 * decir, porque la ficha ya quedó guardada.
 */
const aplicar = async (productoId) => {
  if (nueva.value) {
    const r = await imagenesService.subir(productoId, nueva.value)
    registrar(productoId, r.version)
    soltarVista()
    nueva.value = null
  } else if (quitada.value && urlFoto(productoId)) {
    await imagenesService.quitar(productoId)
    olvidar(productoId)
    quitada.value = false
  }
}

onUnmounted(soltarVista)

defineExpose({ cambiada, aplicar })
</script>

<style scoped>
.campo-foto {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.marco {
  flex: 0 0 auto;
  width: 88px;
  height: 88px;
  border-radius: var(--r-md, 12px);
  border: 1px solid var(--border);
  background: var(--surface-2);
  overflow: hidden;
  display: grid;
  place-items: center;
}

.marco img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.marco.vacio { border-style: dashed; }
.marco__emoji { font-size: 2rem; line-height: 1; }

.acciones { min-width: 0; flex: 1; }

.botones {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-foto {
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: .9rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-foto:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.btn-foto:disabled { opacity: .6; cursor: progress; }
.btn-foto:focus-visible, .quitar:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.quitar {
  border: 0;
  background: none;
  padding: 4px 0;
  color: var(--danger);
  font: inherit;
  font-size: .85rem;
  font-weight: 600;
  cursor: pointer;
}

.ayuda, .error {
  margin-top: 8px;
  font-size: .8rem;
  line-height: 1.4;
  color: var(--text-muted);
}

.error { color: var(--danger); }

.oculto {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
