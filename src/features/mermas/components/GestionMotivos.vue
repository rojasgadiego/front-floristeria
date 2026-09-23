<template>
  <section class="panel">
    <div class="cab">
      <div class="min0">
        <h2>Motivos de merma</h2>
        <p class="ayuda">
          Lo que se ofrece al registrar. Apagar un motivo lo saca de la lista
          sin tocar las mermas que ya lo usan; renombrarlo tampoco las cambia.
        </p>
      </div>
      <button v-if="!nuevo" class="btn btn-linea btn-mini" @click="abrirNuevo">+ Agregar</button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <!-- ─── Nuevo ─── -->
    <div v-if="nuevo" class="editor">
      <FormMotivo v-model="nuevo" />
      <div class="editor-pie">
        <button class="btn btn-linea" :disabled="guardando" @click="nuevo = null">Cancelar</button>
        <button class="btn" :disabled="guardando || !nuevo.nombre.trim()" @click="crear">
          {{ guardando ? 'Guardando…' : 'Agregar motivo' }}
        </button>
      </div>
    </div>

    <div v-if="cargando && !motivos.length" class="vacio">Cargando…</div>

    <!-- ─── El catálogo, por categoría ─── -->
    <div v-for="c in grupos" :key="c.valor" class="grupo-cat">
      <h3>
        {{ c.texto }}
        <span class="desglose">{{ c.descripcion }}</span>
      </h3>

      <ul class="lista">
        <li v-for="m in c.motivos" :key="m.id" class="fila" :class="{ apagado: !m.activo }">
          <template v-if="editando?.id === m.id">
            <div class="editor en-lista">
              <FormMotivo v-model="editando" con-activo />
              <div class="editor-pie">
                <button class="btn btn-linea" :disabled="guardando" @click="editando = null">Cancelar</button>
                <button class="btn" :disabled="guardando || !editando.nombre.trim()" @click="guardar">
                  {{ guardando ? 'Guardando…' : 'Guardar' }}
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="min0">
              <b>{{ m.motivo }}</b>
              <div class="marcas">
                <span v-if="!m.activo" class="marca">apagado</span>
                <span v-if="m.requiereDetalle" class="marca">pide detalle</span>
                <span v-if="m.destinoSugerido" class="marca">sugiere: {{ textoDestino(m.destinoSugerido) }}</span>
                <span class="desglose">{{ m.usos }} uso(s) en el año</span>
              </div>
            </div>
            <button class="btn-icono" :aria-label="`Editar ${m.motivo}`" title="Editar" @click="editar(m)">✎</button>
          </template>
        </li>
      </ul>
    </div>
  </section>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { mermasService } from '../services/mermas.service'
import { CATEGORIAS, textoDestino } from '../store/mermas.module'
import FormMotivo from './FormMotivo.vue'

export default {
  name: 'GestionMotivos',
  components: { FormMotivo },

  setup() {
    const store = useStore()

    const motivos = ref([])
    const cargando = ref(false)
    const guardando = ref(false)
    const error = ref('')
    const nuevo = ref(null)
    const editando = ref(null)

    const grupos = computed(() => CATEGORIAS
      .map(c => ({ ...c, motivos: motivos.value.filter(m => m.categoria === c.valor) }))
      .filter(c => c.motivos.length))

    const cargar = async () => {
      cargando.value = true
      try {
        motivos.value = (await mermasService.motivos({ todos: true })) || []
      } catch (e) {
        error.value = e.message
      } finally {
        cargando.value = false
      }
    }

    /* El formulario de registro usa la lista del store: se refresca para
       que el cambio se vea sin recargar la página. */
    const refrescar = async () => {
      await cargar()
      await store.dispatch('mermas/cargarMotivos')
    }

    const abrirNuevo = () => {
      editando.value = null
      error.value = ''
      nuevo.value = { nombre: '', categoria: 'natural', requiereDetalle: false, destinoSugerido: null }
    }

    const editar = (m) => {
      nuevo.value = null
      error.value = ''
      editando.value = {
        id: m.id, nombre: m.motivo, categoria: m.categoria,
        requiereDetalle: m.requiereDetalle, destinoSugerido: m.destinoSugerido,
        activo: m.activo, orden: m.orden
      }
    }

    const crear = async () => {
      guardando.value = true
      error.value = ''
      try {
        await mermasService.crearMotivo({ ...nuevo.value, nombre: nuevo.value.nombre.trim() })
        nuevo.value = null
        await refrescar()
      } catch (e) {
        error.value = e.message
      } finally {
        guardando.value = false
      }
    }

    const guardar = async () => {
      guardando.value = true
      error.value = ''
      try {
        const { id, ...datos } = editando.value
        await mermasService.actualizarMotivo(id, { ...datos, nombre: datos.nombre.trim() })
        editando.value = null
        await refrescar()
      } catch (e) {
        error.value = e.message
      } finally {
        guardando.value = false
      }
    }

    onMounted(cargar)

    return {
      motivos, cargando, guardando, error, nuevo, editando, grupos,
      abrirNuevo, editar, crear, guardar, textoDestino
    }
  }
}
</script>

<style scoped>
.panel {
  padding: 18px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
}

.cab {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.min0 { min-width: 0; }

h2 {
  font-size: 1rem;
  font-weight: 700;
}

.ayuda {
  font-size: .78rem;
  color: var(--text-faint);
  line-height: 1.55;
  margin-top: 6px;
}

.desglose {
  font-size: .74rem;
  font-weight: 400;
  color: var(--text-faint);
}

.vacio {
  padding: 18px 0;
  text-align: center;
  color: var(--text-faint);
  font-size: .85rem;
}

/* ─── Categorías ─── */

.grupo-cat {
  margin-top: 18px;
}

.grupo-cat h3 {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

.grupo-cat h3 .desglose {
  letter-spacing: 0;
  text-transform: none;
}

.lista {
  list-style: none;
  margin: 0;
  padding: 0;
}

.fila {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.fila:last-child { border-bottom: none; }

.fila b { font-size: .9rem; }

.fila.apagado b {
  color: var(--text-faint);
  text-decoration: line-through;
}

.marcas {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  margin-top: 3px;
}

.marca {
  padding: 1px 8px;
  border-radius: var(--r-full);
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: .7rem;
  font-weight: 600;
}

/* ─── Editor ─── */

.editor {
  margin-top: 14px;
  padding: 14px;
  background: var(--surface-2);
  border-radius: var(--r-sm);
}

.editor.en-lista {
  width: 100%;
  margin-top: 0;
}

.editor-pie {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.editor-pie .btn { flex: 1; }

.error {
  padding: 11px 13px;
  margin-top: 14px;
  border-radius: var(--r-sm);
  border-left: 4px solid var(--danger);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: .85rem;
}

/* ─── Botones ─── */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 46px;
  padding: .65rem 1.15rem;
  border: none;
  border-radius: var(--r-sm);
  background: var(--accent);
  color: var(--accent-contrast);
  font: inherit;
  font-size: .92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--t-fast);
}

.btn:hover:not(:disabled) { background: var(--accent-hover); }

.btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.btn-linea {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.btn-linea:hover:not(:disabled) {
  background: var(--surface-2);
  color: var(--text);
}

.btn-mini {
  min-height: 34px;
  padding: .35rem .8rem;
  font-size: .82rem;
  flex-shrink: 0;
}

.btn-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  cursor: pointer;
}

.btn-icono:hover {
  border-color: var(--accent);
  color: var(--accent-text);
}

@media (max-width: 560px) {
  .panel { padding: 16px; }
}
</style>
