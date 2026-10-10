<template>
  <section class="conteo">
    <EncabezadoSeccion titulo="Conteo de stock" :volver-a="{ name: 'Inventario' }" />

    <!-- El historial es de la administración: quién contó, cuándo y qué. -->
    <nav v-if="esAdmin" class="pestanas">
      <button :class="{ on: pestana === 'contar' }" @click="pestana = 'contar'">Contar</button>
      <button :class="{ on: pestana === 'historial' }" @click="pestana = 'historial'">Historial</button>
    </nav>

    <HistorialConteos v-if="pestana === 'historial'" />

    <template v-else>
      <div v-if="error" class="banda banda-error">
        <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
        <button class="btn btn-mini" @click="cargar">Reintentar</button>
      </div>

      <div v-if="resultado" class="banda banda-ok">
        <span aria-hidden="true">✅</span>
        <span>{{ resultado }}</span>
        <button class="btn-icono" aria-label="Cerrar" @click="resultado = ''">✕</button>
      </div>

      <!-- ─── Dónde ─── -->
      <div class="lugar" role="group" aria-label="Dónde se cuenta">
        <button v-if="puedeBodega" type="button" :class="{ on: ubicacion === 'bodega' }" @click="cambiarUbicacion('bodega')">
          <b>🏠 Bodega</b><span>Productos, baldes y flores sin balde</span>
        </button>
        <button type="button" :class="{ on: ubicacion === 'vitrina' }" @click="cambiarUbicacion('vitrina')">
          <b>🛍️ Vitrina</b><span>Lo del mostrador y los ramos listos</span>
        </button>
      </div>

      <!-- ═══ Elegir qué contar ═══ -->
      <template v-if="modo === 'elegir'">
        <p class="pista">
          Elige qué vas a contar hoy. Si no eliges nada, se cuenta todo.
        </p>

        <div class="buscador">
          <span aria-hidden="true">🔎</span>
          <input v-model="busqueda" placeholder="Buscar producto…" aria-label="Buscar">
        </div>

        <div v-if="cargando && !filas.length" class="vacio">Cargando…</div>
        <div v-else-if="!filas.length" class="vacio">
          <strong>No hay nada que contar acá</strong>
          {{ ubicacion === 'vitrina' ? 'El mostrador está vacío y no hay ramos listos.' : 'No hay productos activos.' }}
        </div>

        <div v-for="g in gruposEleccion" :key="g.id" class="grupo-eleccion">
          <label class="grupo-cab">
            <input type="checkbox" :checked="g.todos" :indeterminate.prop="g.algunos && !g.todos"
              @change="marcarCategoria(g, $event.target.checked)">
            <b>{{ g.nombre }}</b>
            <span class="sub">{{ g.productos.length }} producto(s)</span>
          </label>
          <div class="productos-eleccion">
            <label v-for="p in g.productos" :key="p.id" class="producto-eleccion" :class="{ on: elegidos.has(p.id) }">
              <input type="checkbox" :checked="elegidos.has(p.id)" @change="marcarProducto(p.id)">
              <span>{{ p.emoji }} {{ p.nombre }}</span>
            </label>
          </div>
        </div>

        <div v-if="filas.length" class="pie">
          <span class="pie-resumen">
            {{ elegidos.size ? `${elegidos.size} producto(s) elegidos` : 'Todo' }}
          </span>
          <div class="pie-acciones">
            <button v-if="elegidos.size" class="btn btn-linea" @click="elegidos = new Set()">Quitar selección</button>
            <button class="btn" @click="modo = 'contar'">Empezar a contar</button>
          </div>
        </div>
      </template>

      <!-- ═══ Contar ═══ -->
      <template v-else>
        <div class="barra">
          <button class="btn btn-linea" @click="modo = 'elegir'">
            ← {{ elegidos.size ? `${elegidos.size} producto(s)` : 'Todo' }}
          </button>
          <div class="buscador">
            <span aria-hidden="true">🔎</span>
            <input v-model="busqueda" placeholder="Producto o balde…" aria-label="Buscar">
          </div>
          <label class="check">
            <input v-model="soloPendientes" type="checkbox">
            <span>Solo sin contar</span>
          </label>
        </div>

        <!-- Avance total: cuánto falta, de un vistazo. -->
        <div class="avance-total">
          <span><b>{{ contadas.length }}</b> de {{ aContar.length }} contados</span>
          <div class="barra-avance"><span :style="{ width: porcentaje(contadas.length, aContar.length) }"></span></div>
        </div>

        <section v-for="g in gruposConteo" :key="g.id" class="categoria">
          <header class="categoria-cab">
            <b>{{ g.nombre }}</b>
            <span class="sub">{{ g.contadas }} de {{ g.total }}</span>
            <div class="barra-avance chica"><span :style="{ width: porcentaje(g.contadas, g.total) }"></span></div>
          </header>

          <ul class="planilla">
            <li v-for="f in g.filas" :key="clave(f)" class="fila"
              :class="{ contada: dif(f) !== null, sobra: dif(f) > 0, falta: dif(f) < 0 }">
              <div class="que">
                <span class="emoji" aria-hidden="true">{{ f.emoji }}</span>
                <div class="min0">
                  <b class="nombre">{{ f.producto }}</b>
                  <span class="sub">
                    {{ textoFila(f) }}
                    <template v-if="f.fechaVencimiento"> · vence {{ fechaCorta(f.fechaVencimiento) }}</template>
                  </span>
                </div>
              </div>

              <div class="numeros">
                <span class="sistema">
                  <span class="rot">Sistema</span>
                  <b class="dato">{{ f.sistema }}</b>
                </span>

                <div class="contador">
                  <button type="button" class="paso" :aria-label="`Uno menos de ${f.producto}`"
                    @click="sumar(f, -1)">−</button>
                  <input :ref="el => registrarCampo(f, el)" class="campo dato" type="number" min="0"
                    inputmode="numeric" enterkeyhint="next" :value="contados[clave(f)] ?? ''"
                    :aria-label="`Contado de ${f.producto}`" placeholder="—"
                    @input="anotar(f, $event.target.value)" @keydown.enter.prevent="siguienteCampo(f)">
                  <button type="button" class="paso" :aria-label="`Uno más de ${f.producto}`"
                    @click="sumar(f, 1)">+</button>
                </div>

                <!-- Lo más común es que cuadre: un toque. -->
                <button class="btn btn-linea igual" :aria-label="`${f.producto}: cuadra con el sistema`"
                  title="Cuadra con el sistema" @click="anotar(f, f.sistema)">=</button>
              </div>

              <span v-if="dif(f) !== null" class="dif dato">
                <template v-if="dif(f) > 0">+{{ dif(f) }} sobra</template>
                <template v-else-if="dif(f) < 0">{{ dif(f) }} falta · {{ clp(-dif(f) * f.costoUnitario) }}</template>
                <template v-else>✓ cuadra</template>
              </span>
            </li>
          </ul>
        </section>

        <div v-if="!gruposConteo.length" class="vacio">
          <strong>Nada que mostrar</strong>
          {{ soloPendientes ? 'Ya contaste todo lo elegido.' : 'Prueba con otra búsqueda.' }}
        </div>

        <div v-if="contadas.length" class="pie">
          <div class="pie-resumen">
            <b>{{ contadas.length }}</b> contado(s)
            <template v-if="sobrantes.length"> · <span class="azul">{{ sobrantes.length }} sobra</span></template>
            <template v-if="faltantes.length">
              · <span class="rojo">{{ faltantes.length }} falta ({{ clp(valorFaltante) }})</span>
            </template>
          </div>
          <div class="pie-acciones">
            <button class="btn btn-linea" :disabled="aplicando" @click="descartarBorrador">Borrar</button>
            <button class="btn" :disabled="aplicando" @click="abrirConfirmacion">Revisar y aplicar</button>
          </div>
        </div>
      </template>
    </template>

    <!-- ═══ Confirmación ═══ -->
    <div v-if="confirmando" class="fondo" @click.self="confirmando = false">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-conteo">
        <div class="modal-cab">
          <h3 id="titulo-conteo">Aplicar conteo de {{ ubicacion }}</h3>
          <p>{{ contadas.length }} contado(s) · {{ cambios.length }} con diferencia</p>
        </div>

        <div class="modal-cuerpo">
          <div v-if="errorAplicar" class="banda banda-error">{{ errorAplicar }}</div>

          <p v-if="!cambios.length" class="pista">Todo cuadra: no se va a mover nada, pero queda en el historial.</p>

          <ul v-else class="cambios">
            <li v-for="f in cambios" :key="clave(f)" :class="dif(f) > 0 ? 'azul' : 'rojo'">
              <span class="min0">{{ f.emoji }} {{ f.producto }} <span class="sub">{{ textoFila(f) }}</span></span>
              <b class="dato">{{ f.sistema }} → {{ contados[clave(f)] }} ({{ dif(f) > 0 ? '+' : '' }}{{ dif(f) }})</b>
            </li>
          </ul>

          <p v-if="faltantes.length" class="aviso">
            Los faltantes se registran como merma <b>"Faltante en conteo"</b>
            por {{ clp(valorFaltante) }} a costo.
          </p>

          <!-- Quien no es admin necesita código si los faltantes pasan el
               tope; si la estimación no lo vio venir, lo dice la base y el
               bloque aparece igual. -->
          <div v-if="pideCodigo" class="autorizacion">
            <b>🔐 Los faltantes necesitan autorización</b>
            <template v-if="!codigo.enviado.value">
              <p class="pista">Se enviará un código a la administración por correo.</p>
              <button class="btn btn-linea ancho" :disabled="codigo.enviando.value" @click="codigo.solicitar">
                {{ codigo.enviando.value ? 'Enviando…' : 'Enviar código a la administración' }}
              </button>
            </template>
            <div v-else class="fila-codigo">
              <input v-model="codigo.codigo.value" class="campo dato codigo-input" type="text" inputmode="numeric"
                maxlength="6" placeholder="000000" autocomplete="one-time-code">
              <button class="btn btn-linea" @click="codigo.enviado.value = false">Reenviar</button>
            </div>
          </div>

          <label class="nota">
            <span class="rot">Nota del conteo</span>
            <input v-model="detalle" class="campo" maxlength="120"
              placeholder="Conteo mensual · Inventario inicial · Cierre del día…">
          </label>

          <p class="pista chica">
            La diferencia se calcula contra el stock de este momento: si entremedio
            se vendió algo, el ajuste lo considera.
          </p>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" :disabled="aplicando" @click="confirmando = false">Volver</button>
          <button class="btn" :disabled="aplicando || (pideCodigo && !codigo.listo())" @click="aplicar">
            {{ aplicando ? 'Aplicando…' : 'Aplicar conteo' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import EncabezadoSeccion from '@/shared/components/EncabezadoSeccion.vue'
import HistorialConteos from './HistorialConteos.vue'
import { inventarioService } from '@/features/inventario/services/inventario.service'
import { useCodigoAutorizacion } from '@/features/mermas/composables/useEvidencia'

const store = useStore()
const esAdmin = computed(() => store.getters['auth/esAdmin'])
/* La bodega la cuentan bodega y admin; la vitrina, cualquiera del equipo. */
const puedeBodega = computed(() => store.getters['auth/tieneRol']('admin', 'bodega'))
const umbral = computed(() => store.getters['mermas/umbralAutorizacion'])

const pestana = ref('contar')
const ubicacion = ref(puedeBodega.value ? 'bodega' : 'vitrina')
const modo = ref('elegir')

const filas = ref([])
const cargando = ref(false)
const error = ref('')
const resultado = ref('')
const busqueda = ref('')
const soloPendientes = ref(false)
const detalle = ref('')

/* ---------------- Borrador por lugar ----------------
   Contar toda la bodega toma rato: lo anotado y lo elegido se guardan en
   el teléfono y sobreviven a una recarga o a salir a atender. */
const claveBorrador = () => `colibri:conteo:${ubicacion.value}`

const leerBorrador = () => {
  try {
    const b = JSON.parse(localStorage.getItem(claveBorrador())) || {}
    return { contados: b.contados || {}, elegidos: new Set(b.elegidos || []) }
  } catch { return { contados: {}, elegidos: new Set() } }
}

const inicial = leerBorrador()
const contados = ref(inicial.contados)
const elegidos = ref(inicial.elegidos)

watch([contados, elegidos], () => {
  const vacio = !Object.keys(contados.value).length && !elegidos.value.size
  if (vacio) localStorage.removeItem(claveBorrador())
  else localStorage.setItem(claveBorrador(), JSON.stringify({ contados: contados.value, elegidos: [...elegidos.value] }))
}, { deep: true })

const cambiarUbicacion = (u) => {
  if (u === ubicacion.value) return
  ubicacion.value = u
  const b = leerBorrador()
  contados.value = b.contados
  elegidos.value = b.elegidos
  modo.value = 'elegir'
  cargar()
}

/* ---------------- Planilla ---------------- */
const cargar = async () => {
  cargando.value = true
  error.value = ''
  try {
    filas.value = await inventarioService.planillaConteo({ ubicacion: ubicacion.value }) || []
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  store.dispatch('mermas/cargarUmbral')
  cargar()
})

const clave = (f) => `${f.productoId}-${f.loteId ?? 0}-${f.partidaId ?? 0}`
const normal = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const coincide = (f, q) => !q || normal(f.producto).includes(q) || normal(f.origen).includes(q)

const textoFila = (f) => ({
  producto: f.categoria,
  balde: `Balde ${f.origen}`,
  sin_balde: 'Sin balde · al contarla se crea uno',
  partida: `Mostrador ${f.origen}`,
  armado: 'Ramo listo'
}[f.tipoFila] || f.categoria)

/* ---------------- Elegir ---------------- */
const agrupar = (lista) => {
  const m = new Map()
  for (const x of lista) {
    if (!m.has(x.categoriaId)) m.set(x.categoriaId, { id: x.categoriaId, nombre: x.categoria, orden: x.categoriaOrden, items: [] })
    m.get(x.categoriaId).items.push(x)
  }
  return [...m.values()].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
}

/* Se elige por PRODUCTO, aunque se cuente por balde o partida: "las rosas"
   es lo que se decide contar, no "el balde LOT-12". */
const gruposEleccion = computed(() => {
  const q = normal(busqueda.value.trim())
  return agrupar(filas.value).map(g => {
    const productos = []
    const vistos = new Set()
    for (const f of g.items) {
      if (vistos.has(f.productoId) || !coincide(f, q)) continue
      vistos.add(f.productoId)
      productos.push({ id: f.productoId, nombre: f.producto, emoji: f.emoji })
    }
    const marcados = productos.filter(p => elegidos.value.has(p.id)).length
    return { ...g, productos, todos: productos.length > 0 && marcados === productos.length, algunos: marcados > 0 }
  }).filter(g => g.productos.length)
})

const marcarProducto = (id) => {
  const s = new Set(elegidos.value)
  s.has(id) ? s.delete(id) : s.add(id)
  elegidos.value = s
}

const marcarCategoria = (g, si) => {
  const s = new Set(elegidos.value)
  g.productos.forEach(p => (si ? s.add(p.id) : s.delete(p.id)))
  elegidos.value = s
}

/* ---------------- Contar ---------------- */
/* Lo que se cuenta hoy: lo elegido, o todo si no se eligió nada. */
const aContar = computed(() =>
  elegidos.value.size ? filas.value.filter(f => elegidos.value.has(f.productoId)) : filas.value
)

const dif = (f) => {
  const c = contados.value[clave(f)]
  return c === undefined ? null : c - f.sistema
}

const anotar = (f, valor) => {
  const n = valor === '' || valor === null ? null : Math.max(0, Math.floor(Number(valor)))
  const c = { ...contados.value }
  if (n === null || Number.isNaN(n)) delete c[clave(f)]
  else c[clave(f)] = n
  contados.value = c
}

/* − y +: parte del sistema si todavía no se anotó nada. */
const sumar = (f, paso) => {
  const actual = contados.value[clave(f)] ?? f.sistema
  anotar(f, Math.max(0, actual + paso))
}

const gruposConteo = computed(() => {
  const q = normal(busqueda.value.trim())
  return agrupar(aContar.value).map(g => {
    const contadasG = g.items.filter(f => dif(f) !== null).length
    const visibles = g.items.filter(f => coincide(f, q) && (!soloPendientes.value || dif(f) === null))
    return { ...g, total: g.items.length, contadas: contadasG, filas: visibles }
  }).filter(g => g.filas.length)
})

/* Enter pasa a la siguiente fila visible: contar es número, Enter, número. */
const campos = new Map()
const registrarCampo = (f, el) => { if (el) campos.set(clave(f), el); else campos.delete(clave(f)) }

const siguienteCampo = async (f) => {
  const orden = gruposConteo.value.flatMap(g => g.filas)
  const i = orden.findIndex(x => clave(x) === clave(f))
  const sig = orden[i + 1]
  await nextTick()
  if (sig) {
    const el = campos.get(clave(sig))
    el?.focus()
    el?.select()
  } else {
    campos.get(clave(f))?.blur()
  }
}

const contadas = computed(() => aContar.value.filter(f => dif(f) !== null))
const cambios = computed(() => contadas.value.filter(f => dif(f) !== 0))
const sobrantes = computed(() => cambios.value.filter(f => dif(f) > 0))
const faltantes = computed(() => cambios.value.filter(f => dif(f) < 0))
const valorFaltante = computed(() =>
  faltantes.value.reduce((s, f) => s + (-dif(f)) * (f.costoUnitario || 0), 0)
)

const porcentaje = (a, b) => `${b ? Math.round((a / b) * 100) : 0}%`

/* ---------------- Aplicar ---------------- */
const confirmando = ref(false)
const aplicando = ref(false)
const errorAplicar = ref('')
const pideCodigoServidor = ref(false)
const codigo = useCodigoAutorizacion(store, valorFaltante, errorAplicar)

const pideCodigo = computed(() =>
  !esAdmin.value && (pideCodigoServidor.value || valorFaltante.value > (umbral.value ?? 0))
)

const abrirConfirmacion = () => {
  errorAplicar.value = ''
  confirmando.value = true
}

const aplicar = async () => {
  if (aplicando.value) return
  aplicando.value = true
  errorAplicar.value = ''
  try {
    const r = await inventarioService.aplicarConteo({
      ubicacion: ubicacion.value,
      detalle: detalle.value.trim() || null,
      items: contadas.value.map(f => ({
        productoId: f.productoId,
        loteId: f.loteId ?? null,
        partidaId: f.partidaId ?? null,
        contado: contados.value[clave(f)]
      })),
      autorizacion: pideCodigo.value ? { codigo: codigo.codigo.value.trim() } : null
    })

    const c = r?.conteo
    resultado.value = !c?.conDiferencia
      ? 'Conteo aplicado: todo cuadraba. Quedó en el historial.'
      : `Conteo aplicado: ${c.conDiferencia} ajuste(s)` +
        (c.faltantes ? `, ${c.faltantes} faltante(s) registrado(s) como merma` : '') + '.'

    /* Solo se borra lo aplicado: lo anotado fuera de la selección sigue. */
    const resto = { ...contados.value }
    contadas.value.forEach(f => delete resto[clave(f)])
    contados.value = resto

    confirmando.value = false
    detalle.value = ''
    pideCodigoServidor.value = false
    codigo.enviado.value = false
    await cargar()
    store.dispatch('productos/cargar')
  } catch (e) {
    errorAplicar.value = e.message
    /* Si la base dice que hace falta firma, se ofrece el código aunque la
       estimación de la pantalla no lo haya visto venir. */
    if (/autorizaci[oó]n/i.test(e.message || '')) pideCodigoServidor.value = true
    codigo.codigo.value = ''
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
const fechaCorta = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
</script>

<style scoped>
.conteo { display: flex; flex-direction: column; gap: 14px; }

.pestanas { display: flex; gap: 6px; border-bottom: 1px solid var(--border); }
.pestanas button {
  padding: 10px 14px;
  border: 0;
  border-bottom: 3px solid transparent;
  background: none;
  color: var(--text-muted);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.pestanas button.on { border-bottom-color: var(--accent); color: var(--text); }

.pista { margin: 0; font-size: .86rem; color: var(--text-muted); line-height: 1.5; }
.pista.chica { font-size: .76rem; margin-top: 10px; }

.banda { display: flex; align-items: center; gap: 10px; padding: 11px 13px; border-radius: var(--r-sm); font-size: .86rem; }
.banda > span:nth-child(2) { flex: 1; }
.banda-error { background: var(--danger-soft); color: var(--danger); border-left: 4px solid var(--danger); }
.banda-ok { background: var(--success-soft); color: var(--success); border-left: 4px solid var(--success); }

/* ─── Dónde ─── */
.lugar { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; }
.lugar button {
  display: flex; flex-direction: column; gap: 2px; padding: 10px 12px;
  border: 1.5px solid var(--border); border-radius: var(--r-sm);
  background: var(--surface); color: var(--text); font: inherit; text-align: left; cursor: pointer;
}
.lugar button span { font-size: .76rem; color: var(--text-muted); }
.lugar button.on { border-color: var(--accent); background: var(--accent-soft); }

/* ─── Elegir ─── */
.grupo-eleccion { border: 1px solid var(--border); border-radius: var(--r-sm); background: var(--surface); }
.grupo-cab {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border-bottom: 1px solid var(--border); cursor: pointer;
}
.grupo-cab input, .producto-eleccion input { width: 18px; height: 18px; accent-color: var(--accent); }
.productos-eleccion { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 12px; }
.producto-eleccion {
  display: flex; align-items: center; gap: 6px; min-height: 38px; padding: 0 10px;
  border: 1px solid var(--border); border-radius: var(--r-full);
  font-size: .84rem; cursor: pointer;
}
.producto-eleccion.on { border-color: var(--accent); background: var(--accent-soft); }

/* ─── Barra y avance ─── */
.barra { display: flex; gap: 10px; align-items: center; }
.buscador {
  flex: 1; display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 12px;
  border: 1px solid var(--border-strong); border-radius: var(--r-sm); background: var(--surface);
}
.buscador input {
  flex: 1; min-width: 0; border: 0; outline: 0; background: transparent;
  color: var(--text); font: inherit; font-size: max(.95rem, 16px);
}
.check { display: flex; align-items: center; gap: 6px; font-size: .86rem; color: var(--text-muted); white-space: nowrap; }

.avance-total { display: flex; align-items: center; gap: 12px; font-size: .86rem; color: var(--text-muted); }
.avance-total .barra-avance { flex: 1; }
.barra-avance { height: 8px; border-radius: var(--r-full); background: var(--surface-2); overflow: hidden; }
.barra-avance span { display: block; height: 100%; background: var(--accent); transition: width .2s; }
.barra-avance.chica { width: 90px; height: 6px; }

/* ─── Planilla ─── */
.categoria { display: flex; flex-direction: column; gap: 6px; }
.categoria-cab { display: flex; align-items: center; gap: 10px; padding: 4px 2px; }
.categoria-cab b { font-size: .95rem; }

.planilla { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
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
  transition: opacity .15s;
}
/* Lo contado se atenúa: a la vista queda lo que falta. */
.fila.contada { opacity: .62; border-left-color: var(--success); }
.fila.contada:focus-within { opacity: 1; }
.fila.sobra { border-left-color: var(--info); }
.fila.falta { border-left-color: var(--danger); opacity: 1; }

.que { grid-area: que; display: flex; align-items: center; gap: 10px; min-width: 0; }
.emoji { font-size: 1.4rem; }
.nombre { display: block; font-size: .92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.min0 { min-width: 0; }
.sub { font-size: .76rem; color: var(--text-muted); }

.numeros { grid-area: numeros; display: flex; align-items: flex-end; gap: 8px; }
.rot {
  display: block; font-size: .62rem; font-weight: 700; letter-spacing: .06em;
  text-transform: uppercase; color: var(--text-faint);
}
.sistema { text-align: right; min-width: 50px; }
.sistema b { font-size: 1.05rem; }

.contador { display: flex; align-items: center; }
.contador .campo { width: 64px; text-align: center; border-radius: 0; }
.paso {
  width: 40px; min-height: 44px; border: 1px solid var(--border-strong);
  background: var(--surface-2); color: var(--text); font: inherit; font-size: 1.1rem; font-weight: 700; cursor: pointer;
}
.paso:first-child { border-radius: var(--r-sm) 0 0 var(--r-sm); border-right: 0; }
.paso:last-child { border-radius: 0 var(--r-sm) var(--r-sm) 0; border-left: 0; }

.igual { min-width: 44px; font-weight: 700; font-size: 1.05rem; padding: 0 10px; }

.dif { grid-area: dif; justify-self: end; font-size: .78rem; font-weight: 600; }
.fila.contada .dif { color: var(--success); }
.fila.sobra .dif { color: var(--info); }
.fila.falta .dif { color: var(--danger); }

.campo {
  min-height: 44px; padding: .5rem .6rem; border: 1px solid var(--border-strong); border-radius: var(--r-sm);
  background: var(--surface); color: var(--text); font: inherit; font-size: max(.95rem, 16px); outline: none;
}
.campo:focus { border-color: var(--accent); }
.campo[type=number] { -moz-appearance: textfield; appearance: textfield; }
.campo[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

/* ─── Pie pegado abajo (sticky: en escritorio no tapa el menú) ─── */
.pie {
  position: sticky; bottom: 0; z-index: 30;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md);
  box-shadow: var(--shadow-lg);
}
.pie-resumen { font-size: .88rem; color: var(--text-muted); }
.pie-acciones { display: flex; gap: 8px; }
.azul { color: var(--info); }
.rojo { color: var(--danger); }
.dato { font-variant-numeric: tabular-nums; }

.btn {
  display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 16px;
  border: 1px solid transparent; border-radius: var(--r-sm); background: var(--accent);
  color: var(--accent-contrast); font: inherit; font-weight: 700; cursor: pointer;
}
.btn:disabled { opacity: .55; cursor: not-allowed; }
.btn-linea { background: var(--surface); border-color: var(--border-strong); color: var(--text-muted); }
.btn-mini { min-height: 34px; padding: 0 12px; font-size: .8rem; }
.btn-icono { border: 0; background: none; color: inherit; cursor: pointer; }
.ancho { width: 100%; }

.vacio { padding: 28px 16px; text-align: center; color: var(--text-muted); font-size: .9rem; }
.vacio strong { display: block; color: var(--text); margin-bottom: 4px; }

/* ─── Modal ─── */
.fondo { position: fixed; inset: 0; z-index: 70; display: grid; place-items: center; padding: 16px; background: var(--overlay); }
.modal {
  width: 100%; max-width: 520px; max-height: 92dvh; display: flex; flex-direction: column;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow-lg);
}
.modal-cab { padding: 18px 20px 12px; border-bottom: 1px solid var(--border); }
.modal-cab h3 { margin: 0; font-size: 1.1rem; }
.modal-cab p { margin: 4px 0 0; font-size: .82rem; color: var(--text-muted); }
.modal-cuerpo { padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.modal-pie {
  display: flex; justify-content: flex-end; gap: 9px; padding: 14px 20px;
  border-top: 1px solid var(--border); background: var(--surface-2);
}

.cambios { list-style: none; margin: 0; padding: 0; }
.cambios li { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px solid var(--border); font-size: .86rem; }

.aviso { margin: 0; padding: 10px 12px; border-radius: var(--r-sm); background: var(--warn-soft); color: var(--warn); font-size: .84rem; }

.autorizacion {
  display: flex; flex-direction: column; gap: 8px; padding: 12px 14px;
  border: 1.5px solid var(--warn-border); border-radius: var(--r-sm); background: var(--warn-soft); color: var(--warn);
}
.fila-codigo { display: flex; gap: 8px; }
.fila-codigo .campo { flex: 1; }
.codigo-input { text-align: center; font-size: 1.4rem; font-weight: 700; letter-spacing: .25em; }

.nota { display: flex; flex-direction: column; gap: 4px; }
.nota .campo { width: 100%; }

@media (max-width: 640px) {
  .barra { flex-wrap: wrap; }
  .barra .buscador { flex-basis: 100%; order: -1; }

  .fila { grid-template-columns: 1fr; grid-template-areas: "que" "numeros" "dif"; }
  .numeros { justify-content: flex-end; }

  .pie { flex-direction: column; align-items: stretch; padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); }
  .pie-acciones .btn { flex: 1; }
}
</style>
