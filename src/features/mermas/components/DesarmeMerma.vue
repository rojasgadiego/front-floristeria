<template>
  <div class="fondo" @click.self="intentarCerrar">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-desarme">
      <div class="modal-cab">
        <h3 id="titulo-desarme">Desarmar {{ producto.nombre }}</h3>
        <ol class="pasos" aria-label="Pasos">
          <li v-for="(p, i) in PASOS" :key="p.clave" :class="{ on: i === paso, hecho: i < paso }">{{ p.texto }}</li>
        </ol>
      </div>

      <div class="modal-cuerpo">
        <div v-if="error" class="error">{{ error }}</div>

        <!-- ═══ 1 · Qué se recupera ═══ -->
        <template v-if="PASOS[paso].clave === 'que'">
          <label class="cantidad">
            <span class="rot">¿Cuántos desarmas?</span>
            <input class="campo dato" type="number" min="1" :max="producto.stockListo" inputmode="numeric"
              v-model.number="cantidad" @change="cargarPlan">
            <span class="sub">de {{ producto.stockListo }} listos</span>
          </label>

          <p class="ayuda">
            Por cada componente, cuántas unidades se pueden usar todavía. Lo que no,
            se pierde. Lo de flores vuelve a bodega en un balde rebajado; el resto
            vuelve a su stock tal cual.
          </p>

          <div v-if="cargandoPlan" class="vacio">Cargando la receta…</div>
          <ul v-else class="componentes">
            <li v-for="c in componentes" :key="c.componenteId" class="componente">
              <div class="comp-cab">
                <span class="emoji" aria-hidden="true">{{ c.emoji }}</span>
                <b>{{ c.componente }}</b>
                <span class="sub">{{ c.total }} en total</span>
              </div>
              <div class="comp-datos">
                <label>
                  <span class="rot">Se usan todavía</span>
                  <input class="campo dato" type="number" min="0" :max="c.total" inputmode="numeric"
                    v-model.number="c.recuperadas">
                </label>
                <span class="perdidas">{{ perdidas(c) }} se pierden</span>
              </div>
              <div v-if="c.recuperadas > 0 && c.controlaLotes" class="calidades">
                <button v-for="q in CALIDADES" :key="q.valor" type="button"
                  :class="{ on: c.calidad === q.valor }" @click="c.calidad = q.valor">
                  <b>{{ q.texto }}</b><span>{{ q.descripcion }}</span>
                </button>
              </div>
            </li>
          </ul>
        </template>

        <!-- ═══ 2 · Por qué ═══ -->
        <template v-else-if="PASOS[paso].clave === 'porque'">
          <span class="rot">Motivo</span>
          <div class="chips">
            <button v-for="m in motivosFrecuentes" :key="m.motivo" type="button" class="chip"
              :class="{ on: motivo === m.motivo }" @click="motivo = m.motivo">{{ m.motivo }}</button>
          </div>
          <select class="campo" :value="esFrecuente ? '' : motivo" @change="motivo = $event.target.value">
            <option value="">Otro motivo…</option>
            <optgroup v-for="g in motivosPorCategoria" :key="g.valor" :label="g.texto">
              <option v-for="m in g.motivos" :key="m.motivo" :value="m.motivo">{{ m.motivo }}</option>
            </optgroup>
          </select>
          <div class="grupo">
            <label for="d-det">Qué pasó<template v-if="detalleObligatorio"> (obligatorio)</template></label>
            <textarea id="d-det" class="campo" rows="2" maxlength="200" v-model="detalle"
              placeholder="Opcional: no se vendió, se aplastó en la vitrina…"></textarea>
          </div>
        </template>

        <!-- ═══ 3 · Fotos ═══ -->
        <template v-else-if="PASOS[paso].clave === 'fotos'">
          <p class="ayuda">Toma de 1 a 3 fotos del ramo antes de desarmarlo.</p>
          <div class="fotos">
            <figure v-for="(f, i) in fotos" :key="f.url" class="foto">
              <img :src="f.url" :alt="`Foto ${i + 1}`">
              <button class="quitar-foto" :aria-label="`Quitar foto ${i + 1}`" @click="quitarFoto(i)">✕</button>
            </figure>
            <label v-if="fotos.length < 3" class="tomar" :class="{ cargando: procesando }">
              <input class="oculto" type="file" accept="image/*" capture="environment"
                :disabled="procesando" @change="alTomarFoto">
              <span aria-hidden="true">📷</span>
              <span>{{ procesando ? 'Preparando…' : fotos.length ? 'Otra foto' : 'Tomar foto' }}</span>
            </label>
          </div>
        </template>

        <!-- ═══ 4 · Confirmar ═══ -->
        <template v-else>
          <div class="resumen">
            <p><b>{{ cantidad }} × {{ producto.nombre }}</b> · {{ motivo }}</p>
            <ul>
              <li v-for="c in componentes" :key="c.componenteId">
                <span>{{ c.emoji }} {{ c.componente }}</span>
                <span class="sub">
                  <span v-if="c.recuperadas" class="verde">{{ c.recuperadas }} se usan</span>
                  <template v-if="c.recuperadas && perdidas(c)"> · </template>
                  <span v-if="perdidas(c)" class="rojo">{{ perdidas(c) }} se pierden</span>
                </span>
              </li>
            </ul>
            <div class="total"><span>Valor</span><b class="dato">{{ clp(valor) }}</b></div>
          </div>

          <div v-if="necesitaAutorizacion" class="autorizacion">
            <b>🔐 Necesita autorización</b>
            <p class="ayuda">Pasa el tope de {{ clp(umbral) }}.</p>
            <button v-if="!codigo.enviado.value" class="btn btn-linea ancho" :disabled="codigo.enviando.value"
              @click="codigo.solicitar">
              {{ codigo.enviando.value ? 'Enviando…' : 'Enviar código a la administración' }}
            </button>
            <div v-else class="fila-codigo">
              <input v-model="codigo.codigo.value" class="campo dato codigo-input" type="text" inputmode="numeric"
                maxlength="6" placeholder="000000" autocomplete="one-time-code">
              <button class="btn btn-linea" @click="codigo.enviado.value = false">Reenviar</button>
            </div>
          </div>

          <p class="ayuda">Tienes <b>10 minutos</b> para deshacerlo desde Mermas si te equivocaste.</p>
        </template>
      </div>

      <div class="modal-pie">
        <button class="btn btn-linea" :disabled="guardando" @click="paso ? paso-- : intentarCerrar()">
          {{ paso ? 'Atrás' : 'Cancelar' }}
        </button>
        <button v-if="paso < PASOS.length - 1" class="btn" :disabled="!pasoListo" @click="paso++">Siguiente</button>
        <button v-else class="btn" :disabled="!puedeRegistrar || guardando" @click="registrar">
          {{ guardando ? 'Desarmando…' : 'Desarmar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { CALIDADES } from '@/features/mermas/store/mermas.module'
import { useFotos, useCodigoAutorizacion } from '@/features/mermas/composables/useEvidencia'

const props = defineProps({
  /* El armado: { id, nombre, stockListo } */
  producto: { type: Object, required: true }
})
const emit = defineEmits(['cerrar', 'desarmado'])
const store = useStore()

const PASOS = [
  { clave: 'que', texto: 'Qué' },
  { clave: 'porque', texto: 'Por qué' },
  { clave: 'fotos', texto: 'Fotos' },
  { clave: 'confirmar', texto: 'Confirmar' }
]

const paso = ref(0)
const error = ref('')
const cantidad = ref(1)
const componentes = ref([])
const cargandoPlan = ref(false)
const motivo = ref('')
const detalle = ref('')

const esAdmin = computed(() => store.getters['auth/esAdmin'])
const guardando = computed(() => store.getters['mermas/guardando'])
const umbral = computed(() => store.getters['mermas/umbralAutorizacion'])

/* ---------------- Plan ---------------- */
const cargarPlan = async () => {
  cantidad.value = Math.min(Math.max(1, cantidad.value || 1), props.producto.stockListo || 1)
  cargandoPlan.value = true
  const plan = await store.dispatch('mermas/cargarPlanDesarme', {
    productoId: props.producto.id, cantidad: cantidad.value
  })
  cargandoPlan.value = false
  if (!plan) return (error.value = 'No se pudo leer la receta.')
  if (!plan.length) return (error.value = `${props.producto.nombre} no tiene receta: no se sabe qué lleva.`)
  /* Por defecto todo se pierde: recuperar es lo que se decide mirando. */
  componentes.value = plan.map(c => ({ ...c, recuperadas: 0, calidad: null }))
}

onMounted(() => {
  store.dispatch('mermas/cargarMotivos')
  store.dispatch('mermas/cargarUmbral')
  cargarPlan()
})

const perdidas = (c) => Math.max(0, c.total - (c.recuperadas || 0))

const planValido = computed(() =>
  componentes.value.length > 0 &&
  componentes.value.every(c =>
    c.recuperadas >= 0 && c.recuperadas <= c.total &&
    (!c.recuperadas || !c.controlaLotes || c.calidad))
)

/* ---------------- Motivo ---------------- */
const motivos = computed(() => store.getters['mermas/motivos'] || [])
const motivosPorCategoria = computed(() => store.getters['mermas/motivosPorCategoria'])
const motivosFrecuentes = computed(() =>
  [...motivos.value].sort((a, b) => (b.usos || 0) - (a.usos || 0)).slice(0, 6)
)
const esFrecuente = computed(() => motivosFrecuentes.value.some(m => m.motivo === motivo.value))
const detalleObligatorio = computed(() => !!store.getters['mermas/motivoPorNombre'](motivo.value)?.requiereDetalle)
const motivoValido = computed(() => !!motivo.value && (!detalleObligatorio.value || detalle.value.trim()))

/* ---------------- Fotos y firma ---------------- */
const { fotos, procesando, alTomarFoto, quitarFoto, paraEnviar } = useFotos(error)

/* La misma regla que la base: a costo; sin costo, a precio. */
const valor = computed(() => componentes.value.reduce((s, c) =>
  s + c.total * ((Number(c.costoUnitario) > 0 ? Number(c.costoUnitario) : c.precio) || 0), 0))
const necesitaAutorizacion = computed(() => !esAdmin.value && valor.value > umbral.value)
const codigo = useCodigoAutorizacion(store, valor, error)

/* ---------------- Navegación ---------------- */
const pasoListo = computed(() => ({
  que: planValido.value,
  porque: motivoValido.value,
  fotos: fotos.value.length >= 1
}[PASOS[paso.value].clave] ?? true))

const puedeRegistrar = computed(() =>
  planValido.value && motivoValido.value && fotos.value.length >= 1 &&
  (!necesitaAutorizacion.value || codigo.listo())
)

const intentarCerrar = () => {
  if (guardando.value) return
  if ((fotos.value.length || motivo.value) && !window.confirm('¿Descartar este desarme?')) return
  emit('cerrar')
}

const registrar = async () => {
  if (!puedeRegistrar.value || guardando.value) return
  error.value = ''
  try {
    const r = await store.dispatch('mermas/desarmar', {
      productoId: props.producto.id,
      cantidad: cantidad.value,
      motivo: motivo.value,
      detalle: detalle.value.trim() || null,
      lineas: componentes.value.map(c => ({
        componenteId: c.componenteId,
        recuperadas: c.recuperadas || 0,
        perdidas: perdidas(c),
        /* Sin lotes no hay rebaja que calcular, pero la base pide calidad
           si algo se recupera: va "óptima", que es lo que es. */
        calidad: c.recuperadas ? (c.calidad || 'optima') : null
      })),
      fotos: paraEnviar(),
      autorizacion: necesitaAutorizacion.value ? { codigo: codigo.codigo.value.trim() } : null
    })
    emit('desarmado', r)
  } catch (e) {
    error.value = e.message
    codigo.codigo.value = ''
  }
}

const fmt = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
const clp = (n) => fmt.format(Math.round(n || 0))
</script>

<style scoped>
.fondo { position: fixed; inset: 0; z-index: 110; display: flex; align-items: center; justify-content: center; padding: 16px; background: var(--overlay); }
.modal {
  width: 100%; max-width: 520px; max-height: 92dvh; display: flex; flex-direction: column;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow-lg); overflow: hidden;
}
.modal-cab { padding: 16px 20px 12px; border-bottom: 1px solid var(--border); }
.modal-cab h3 { margin: 0; font-size: 1.1rem; }
.pasos { display: flex; gap: 6px; margin: 10px 0 0; padding: 0; list-style: none; }
.pasos li { flex: 1; padding-top: 6px; border-top: 3px solid var(--border); font-size: .72rem; font-weight: 600; color: var(--text-faint); }
.pasos li.hecho { border-top-color: var(--accent); color: var(--text-muted); }
.pasos li.on { border-top-color: var(--accent); color: var(--accent-text); }
.modal-cuerpo { flex: 1; overflow-y: auto; padding: 16px 20px; }
.modal-pie { display: flex; gap: 10px; padding: 14px 20px calc(14px + env(safe-area-inset-bottom)); border-top: 1px solid var(--border); background: var(--surface-2); }
.modal-pie .btn { flex: 1; }

.rot { display: block; margin-bottom: 4px; font-size: .64rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--text-faint); }
.sub { font-size: .76rem; color: var(--text-muted); }
.dato { font-variant-numeric: tabular-nums; font-weight: 700; }
.verde { color: var(--success); }
.rojo { color: var(--danger); }
.oculto { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.ayuda { margin: 10px 0; font-size: .8rem; color: var(--text-muted); line-height: 1.5; }
.vacio { padding: 20px; text-align: center; color: var(--text-muted); }
.error { padding: 11px 13px; margin-bottom: 14px; border-radius: var(--r-sm); border-left: 4px solid var(--danger); background: var(--danger-soft); color: var(--danger); font-size: .86rem; }

.campo {
  width: 100%; min-height: 46px; padding: .55rem .75rem; border: 1px solid var(--border-strong); border-radius: var(--r-sm);
  background: var(--surface); color: var(--text); font: inherit; font-size: max(.95rem, 16px); outline: none;
}
.campo:focus { border-color: var(--accent); }
.grupo { margin-top: 14px; }
.grupo label { display: block; margin-bottom: 5px; font-size: .68rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--text-muted); }

.cantidad { display: flex; flex-direction: column; }
.cantidad .campo { width: 110px; text-align: right; }

.componentes { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.componente { padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--r-sm); }
.comp-cab { display: flex; align-items: center; gap: 8px; }
.comp-cab b { flex: 1; font-size: .92rem; }
.emoji { font-size: 1.3rem; }
.comp-datos { display: flex; align-items: flex-end; gap: 14px; margin-top: 8px; }
.comp-datos .campo { width: 100px; text-align: right; }
.perdidas { padding-bottom: 12px; font-size: .82rem; color: var(--danger); font-weight: 600; }

.calidades { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.calidades button {
  display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; border: 1.5px solid var(--border);
  border-radius: var(--r-sm); background: var(--surface); color: var(--text); font: inherit; text-align: left; cursor: pointer;
}
.calidades button span { font-size: .74rem; color: var(--text-muted); }
.calidades button.on { border-color: var(--accent); background: var(--accent-soft); }

.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.chip {
  min-height: 44px; padding: 0 14px; border: 1.5px solid var(--border); border-radius: var(--r-full);
  background: var(--surface); color: var(--text); font: inherit; font-size: .88rem; font-weight: 600; cursor: pointer;
}
.chip.on { border-color: var(--accent); background: var(--accent); color: var(--accent-contrast); }

.fotos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.foto { position: relative; margin: 0; aspect-ratio: 1; border-radius: var(--r-sm); overflow: hidden; }
.foto img { width: 100%; height: 100%; object-fit: cover; }
.quitar-foto { position: absolute; top: 4px; right: 4px; width: 30px; height: 30px; border: 0; border-radius: 50%; background: rgba(0, 0, 0, .6); color: #fff; cursor: pointer; }
.tomar {
  aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  border: 2px dashed var(--border-strong); border-radius: var(--r-sm); color: var(--text-muted); font-size: .82rem; font-weight: 600; cursor: pointer;
}
.tomar.cargando { opacity: .6; }

.resumen { padding: 12px 14px; border-radius: var(--r-sm); background: var(--surface-2); }
.resumen p { margin: 0 0 8px; }
.resumen ul { list-style: none; margin: 0; padding: 0; }
.resumen li { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: .86rem; }
.total { display: flex; justify-content: space-between; margin-top: 8px; font-weight: 700; }

.autorizacion { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; padding: 12px 14px; border: 1.5px solid var(--warn-border); border-radius: var(--r-sm); background: var(--warn-soft); color: var(--warn); }
.autorizacion .ayuda { color: var(--warn); margin: 0; }
.fila-codigo { display: flex; gap: 8px; }
.fila-codigo .campo { flex: 1; }
.codigo-input { text-align: center; font-size: 1.4rem; font-weight: 700; letter-spacing: .25em; }
.ancho { width: 100%; }

.btn {
  display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 0 16px;
  border: 1px solid transparent; border-radius: var(--r-sm); background: var(--accent); color: var(--accent-contrast);
  font: inherit; font-weight: 700; cursor: pointer;
}
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn-linea { background: var(--surface); border-color: var(--border-strong); color: var(--text-muted); }

@media (max-width: 560px) {
  .fondo { padding: 0; align-items: flex-end; }
  .modal { max-width: none; max-height: 96dvh; border-radius: var(--r-lg) var(--r-lg) 0 0; }
}
</style>
