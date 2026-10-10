<template>
  <section class="conteo">
    <EncabezadoSeccion titulo="Conteo de stock" :volver-a="{ name: 'Inventario' }" />

    <div v-if="!esAdmin" class="vacio">
      <strong>Solo administración</strong>
      El conteo ajusta el stock y registra los faltantes como merma.
    </div>

    <template v-else>
      <!-- Lo que hace, en una línea: quien cuenta tiene que saber que un
           faltante no se "corrige", se registra como pérdida. -->
      <p class="pista">
        Cuenta lo que hay en <b>bodega</b> y escríbelo. Lo que sobra entra al stock;
        lo que falta queda como merma <b>"Faltante en conteo"</b>. Lo del mostrador no entra acá.
      </p>

      <div v-if="error" class="banda banda-error">
        <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
        <button class="btn btn-mini" @click="cargar">Reintentar</button>
      </div>

      <div v-if="resultado" class="banda banda-ok">
        <span aria-hidden="true">✅</span>
        <span>{{ resultado }}</span>
        <button class="btn-icono chico" aria-label="Cerrar" @click="resultado = ''">✕</button>
      </div>

      <!-- ─── Barra: filtros en línea en escritorio, en columna en el celular ─── -->
      <div class="barra">
        <div class="buscador">
          <span aria-hidden="true">🔎</span>
          <input v-model="busqueda" placeholder="Producto o balde…" aria-label="Buscar">
          <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
        </div>

        <select v-model.number="categoriaId" class="campo" aria-label="Categoría" @change="cargar">
          <option :value="null">Todas las categorías</option>
          <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
        </select>

        <label class="check">
          <input v-model="soloPendientes" type="checkbox">
          <span>Solo sin contar</span>
        </label>
      </div>

      <div v-if="cargando && !filas.length" class="vacio">Cargando la planilla…</div>

      <div v-else-if="!visibles.length" class="vacio">
        <strong>{{ filas.length ? 'Nada que mostrar' : 'No hay nada que contar' }}</strong>
        {{ filas.length ? 'Prueba con otro filtro.' : 'No hay productos activos en bodega.' }}
      </div>

      <!-- ─── La planilla ─── -->
      <ul v-else class="planilla" :class="{ atenuada: cargando }">
        <li v-for="f in visibles" :key="clave(f)" class="fila"
          :class="{ sobra: dif(f) > 0, falta: dif(f) < 0, igual: dif(f) === 0 }">
          <div class="que">
            <span class="emoji" aria-hidden="true">{{ f.emoji }}</span>
            <div class="min0">
              <b class="nombre">{{ f.producto }}</b>
              <span class="sub">
                <template v-if="f.loteCodigo">
                  Balde <span class="mono">{{ f.loteCodigo }}</span>
                  <template v-if="f.fechaVencimiento"> · vence {{ fecha(f.fechaVencimiento) }}</template>
                </template>
                <template v-else>{{ f.categoria }}</template>
              </span>
            </div>
          </div>

          <div class="numeros">
            <span class="sistema">
              <span class="rot">Sistema</span>
              <b class="dato">{{ f.sistema }}</b>
            </span>

            <label class="contado">
              <span class="rot">Contado</span>
              <input class="campo dato" type="number" min="0" inputmode="numeric"
                :value="contados[clave(f)] ?? ''" :aria-label="`Contado de ${f.producto}`"
                @input="anotar(f, $event.target.value)">
            </label>

            <!-- Lo más común es que cuadre: un toque y listo. -->
            <button class="btn btn-linea igual-btn" title="Cuadra con el sistema"
              :aria-label="`${f.producto}: cuadra con el sistema`" @click="anotar(f, f.sistema)">=</button>
          </div>

          <span v-if="dif(f) !== null" class="dif dato">
            <template v-if="dif(f) > 0">+{{ dif(f) }} sobra</template>
            <template v-else-if="dif(f) < 0">{{ dif(f) }} falta · {{ clp(-dif(f) * f.costoUnitario) }}</template>
            <template v-else>Cuadra</template>
          </span>
        </li>
      </ul>

      <!-- ─── Resumen fijo abajo ─── -->
      <div v-if="contadas.length" class="pie">
        <div class="pie-resumen">
          <b>{{ contadas.length }}</b> contada(s)
          <template v-if="sobrantes.length"> · <span class="verde">{{ sobrantes.length }} sobra</span></template>
          <template v-if="faltantes.length">
            · <span class="rojo">{{ faltantes.length }} falta ({{ clp(valorFaltante) }})</span>
          </template>
        </div>
        <div class="pie-acciones">
          <button class="btn btn-linea" :disabled="aplicando" @click="descartarBorrador">Borrar</button>
          <button class="btn" :disabled="aplicando" @click="confirmando = true">Revisar y aplicar</button>
        </div>
      </div>
    </template>

    <!-- ═══ Confirmación ═══ -->
    <div v-if="confirmando" class="fondo" @click.self="confirmando = false">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-conteo">
        <div class="modal-cab">
          <h3 id="titulo-conteo">Aplicar conteo</h3>
          <p>{{ contadas.length }} línea(s) contadas · {{ cambios.length }} con diferencia</p>
        </div>

        <div class="modal-cuerpo">
          <div v-if="errorAplicar" class="banda banda-error">{{ errorAplicar }}</div>

          <p v-if="!cambios.length" class="pista">Todo cuadra: no se va a mover nada.</p>

          <ul v-else class="cambios">
            <li v-for="f in cambios" :key="clave(f)" :class="dif(f) > 0 ? 'verde' : 'rojo'">
              <span class="min0">
                {{ f.emoji }} {{ f.producto }}
                <span v-if="f.loteCodigo" class="mono sub"> {{ f.loteCodigo }}</span>
              </span>
              <b class="dato">
                {{ f.sistema }} → {{ contados[clave(f)] }}
                ({{ dif(f) > 0 ? '+' : '' }}{{ dif(f) }})
              </b>
            </li>
          </ul>

          <p v-if="faltantes.length" class="aviso">
            Los faltantes se registran como merma <b>"Faltante en conteo"</b> por
            {{ clp(valorFaltante) }} a costo, firmada con tu nombre.
          </p>

          <label class="nota">
            <span class="rot">Nota del conteo</span>
            <input v-model="detalle" class="campo" maxlength="120"
              placeholder="Conteo de stock · Inventario inicial · Conteo mensual…">
          </label>

          <p class="pista chica">
            La diferencia se calcula contra el stock de este momento: si entremedio
            se vendió algo, el ajuste lo considera.
          </p>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" :disabled="aplicando" @click="confirmando = false">Volver</button>
          <button class="btn" :disabled="aplicando" @click="aplicar">
            {{ aplicando ? 'Aplicando…' : 'Aplicar conteo' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useStore } from 'vuex'
import EncabezadoSeccion from '@/shared/components/EncabezadoSeccion.vue'
import { inventarioService } from '@/features/inventario/services/inventario.service'

/* Contar 140 productos toma rato: lo anotado se guarda en el teléfono y
   sobrevive a una recarga o a salir a atender. */
const BORRADOR = 'colibri:conteo-borrador'

const store = useStore()
const esAdmin = computed(() => store.getters['auth/esAdmin'])
const categorias = computed(() => store.getters['inventario/categorias'] || [])

const filas = ref([])
const cargando = ref(false)
const error = ref('')
const resultado = ref('')

const busqueda = ref('')
const categoriaId = ref(null)
const soloPendientes = ref(false)

const contados = ref(leerBorrador())
const detalle = ref('')

const confirmando = ref(false)
const aplicando = ref(false)
const errorAplicar = ref('')

function leerBorrador () {
  try { return JSON.parse(localStorage.getItem(BORRADOR)) || {} } catch { return {} }
}

watch(contados, (c) => {
  if (Object.keys(c).length) localStorage.setItem(BORRADOR, JSON.stringify(c))
  else localStorage.removeItem(BORRADOR)
}, { deep: true })

const clave = (f) => `${f.productoId}-${f.loteId ?? 0}`

const anotar = (f, valor) => {
  const n = valor === '' || valor === null ? null : Math.max(0, Math.floor(Number(valor)))
  const c = { ...contados.value }
  if (n === null || Number.isNaN(n)) delete c[clave(f)]
  else c[clave(f)] = n
  contados.value = c
}

const dif = (f) => {
  const c = contados.value[clave(f)]
  return c === undefined ? null : c - f.sistema
}

/* ---------------- Planilla ---------------- */
const cargar = async () => {
  if (!esAdmin.value) return
  cargando.value = true
  error.value = ''
  try {
    filas.value = await inventarioService.planillaConteo({ categoriaId: categoriaId.value }) || []
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  store.dispatch('inventario/cargarCategorias')
  cargar()
})

const normal = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const visibles = computed(() => {
  const q = normal(busqueda.value.trim())
  return filas.value.filter(f =>
    (!q || normal(f.producto).includes(q) || normal(f.loteCodigo).includes(q)) &&
    (!soloPendientes.value || contados.value[clave(f)] === undefined)
  )
})

/* Lo anotado de filas que ya no están (otra categoría, un balde que se
   agotó) no se manda: solo cuenta lo que está en la planilla cargada. */
const contadas = computed(() => filas.value.filter(f => dif(f) !== null))
const cambios = computed(() => contadas.value.filter(f => dif(f) !== 0))
const sobrantes = computed(() => cambios.value.filter(f => dif(f) > 0))
const faltantes = computed(() => cambios.value.filter(f => dif(f) < 0))
const valorFaltante = computed(() =>
  faltantes.value.reduce((s, f) => s + (-dif(f)) * (f.costoUnitario || 0), 0)
)

/* ---------------- Aplicar ---------------- */
const aplicar = async () => {
  if (aplicando.value) return
  aplicando.value = true
  errorAplicar.value = ''
  try {
    const lineas = await inventarioService.aplicarConteo({
      detalle: detalle.value.trim() || null,
      items: contadas.value.map(f => ({
        productoId: f.productoId,
        loteId: f.loteId ?? null,
        contado: contados.value[clave(f)]
      }))
    }) || []

    const ajustes = lineas.filter(l => l.diferencia !== 0).length
    const mermas = lineas.filter(l => l.mermaId).length
    resultado.value = ajustes
      ? `Conteo aplicado: ${ajustes} ajuste(s)${mermas ? `, ${mermas} faltante(s) registrado(s) como merma` : ''}.`
      : 'Conteo aplicado: todo cuadraba.'

    /* Solo se borra lo que se aplicó: lo anotado en otra categoría sigue. */
    const c = { ...contados.value }
    contadas.value.forEach(f => delete c[clave(f)])
    contados.value = c

    confirmando.value = false
    detalle.value = ''
    await cargar()
    store.dispatch('productos/cargar')
  } catch (e) {
    errorAplicar.value = e.message
  } finally {
    aplicando.value = false
  }
}

const descartarBorrador = () => {
  if (window.confirm('¿Borrar todo lo anotado en este conteo?')) contados.value = {}
}

/* ---------------- Formato ---------------- */
const fmt = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
const clp = (n) => fmt.format(Math.round(n || 0))
const fecha = (d) => d
  ? new Date(`${d}T12:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
  : ''
</script>

<style scoped>
.conteo {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pista {
  margin: 0;
  font-size: .86rem;
  color: var(--text-muted);
  line-height: 1.5;
}
.pista.chica { font-size: .76rem; margin-top: 10px; }

.banda {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 13px;
  border-radius: var(--r-sm);
  font-size: .86rem;
}
.banda > span:nth-child(2) { flex: 1; }
.banda-error { background: var(--danger-soft); color: var(--danger); border-left: 4px solid var(--danger); }
.banda-ok { background: var(--success-soft); color: var(--success); border-left: 4px solid var(--success); }

/* ─── Barra ─── */
.barra {
  display: flex;
  gap: 10px;
  align-items: center;
}

.buscador {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
}
.buscador input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: max(.95rem, 16px);
}

.campo {
  min-height: 44px;
  padding: .5rem .7rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: max(.95rem, 16px);
  outline: none;
}
.campo:focus { border-color: var(--accent); }

.check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: .86rem;
  color: var(--text-muted);
  white-space: nowrap;
}

/* ─── Planilla ─── */
.planilla {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.planilla.atenuada { opacity: .6; }

.fila {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas: "que numeros" "que dif";
  gap: 4px 14px;
  align-items: center;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 4px solid var(--border);
  border-radius: var(--r-sm);
}
.fila.igual { border-left-color: var(--success); }
.fila.sobra { border-left-color: var(--info); }
.fila.falta { border-left-color: var(--danger); }

.que { grid-area: que; display: flex; align-items: center; gap: 10px; min-width: 0; }
.emoji { font-size: 1.4rem; }
.nombre { display: block; font-size: .92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub { font-size: .76rem; color: var(--text-muted); }
.min0 { min-width: 0; }

.numeros { grid-area: numeros; display: flex; align-items: flex-end; gap: 8px; }
.rot {
  display: block;
  font-size: .64rem;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--text-faint);
}
.sistema { text-align: right; min-width: 52px; }
.sistema b { font-size: 1.05rem; }
.contado .campo { width: 84px; text-align: right; }

.igual-btn { min-width: 44px; font-weight: 700; font-size: 1.05rem; }

.dif { grid-area: dif; justify-self: end; font-size: .78rem; font-weight: 600; }
.fila.igual .dif { color: var(--success); }
.fila.sobra .dif { color: var(--info); }
.fila.falta .dif { color: var(--danger); }

/* ─── Pie pegado abajo ───
   Sticky y no fixed: queda dentro del contenido, así en escritorio no tapa
   el menú lateral, y aun así acompaña mientras se baja por la planilla. */
.pie {
  position: sticky;
  bottom: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-lg);
}
.pie-resumen { font-size: .88rem; color: var(--text-muted); }
.pie-acciones { display: flex; gap: 8px; }
.verde { color: var(--success); }
.rojo { color: var(--danger); }

/* ─── Botones ─── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: var(--accent);
  color: var(--accent-contrast);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.btn:disabled { opacity: .55; cursor: not-allowed; }
.btn-linea { background: var(--surface); border-color: var(--border-strong); color: var(--text-muted); }
.btn-mini { min-height: 34px; padding: 0 12px; font-size: .8rem; }
.btn-icono {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: .9rem;
}

.vacio {
  padding: 28px 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: .9rem;
}
.vacio strong { display: block; color: var(--text); margin-bottom: 4px; }

.mono { font-family: var(--font-mono); font-size: .9em; }
.dato { font-variant-numeric: tabular-nums; }

/* ─── Modal ─── */
.fondo {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 16px;
  background: var(--overlay);
}
.modal {
  width: 100%;
  max-width: 520px;
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
}
.modal-cab { padding: 18px 20px 12px; border-bottom: 1px solid var(--border); }
.modal-cab h3 { margin: 0; font-size: 1.1rem; }
.modal-cab p { margin: 4px 0 0; font-size: .82rem; color: var(--text-muted); }
.modal-cuerpo { padding: 16px 20px; overflow-y: auto; }
.modal-pie {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}

.cambios { list-style: none; margin: 0 0 12px; padding: 0; }
.cambios li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px solid var(--border);
  font-size: .86rem;
}

.aviso {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: var(--r-sm);
  background: var(--warn-soft);
  color: var(--warn);
  font-size: .84rem;
}

.nota { display: flex; flex-direction: column; gap: 4px; }
.nota .campo { width: 100%; }

/* ─── Celular: filtros en columna, fila en dos niveles ─── */
@media (max-width: 640px) {
  .barra { flex-direction: column; align-items: stretch; }
  .barra .campo { width: 100%; }

  .fila {
    grid-template-columns: 1fr;
    grid-template-areas: "que" "numeros" "dif";
  }
  .numeros { justify-content: flex-end; }

  .pie { flex-direction: column; align-items: stretch; padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); }
  .pie-acciones .btn { flex: 1; }
}
</style>
