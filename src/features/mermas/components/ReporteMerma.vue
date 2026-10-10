<template>
  <div class="fondo" @click.self="intentarCerrar">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-reporte">
      <div class="modal-cab">
        <h3 id="titulo-reporte">{{ esIncidente ? 'Registrar incidente' : 'Registrar merma' }}</h3>
        <!-- Los pasos a la vista: en el celular el formulario es largo y
             saber cuánto falta evita que se abandone a medias. -->
        <ol class="pasos" aria-label="Pasos">
          <li v-for="(p, i) in PASOS" :key="p.clave"
            :class="{ on: i === paso, hecho: i < paso }">{{ p.texto }}</li>
        </ol>
      </div>

      <div class="modal-cuerpo">
        <div v-if="error" class="error">{{ error }}</div>

        <!-- ═══════════ 1 · Qué se dañó ═══════════ -->
        <template v-if="PASOS[paso].clave === 'que'">
          <div class="segmentado" role="group" aria-label="Tipo">
            <button type="button" :class="{ on: !esIncidente }" @click="cambiarTipo('puntual')">
              <b>Algo puntual</b><span>Se marchitó, se quebró</span>
            </button>
            <button type="button" :class="{ on: esIncidente }" @click="cambiarTipo('incidente')">
              <b>Un incidente</b><span>Temblor, corte de luz, se cayó un estante</span>
            </button>
          </div>

          <!-- Lo ya agregado -->
          <ul v-if="lineas.length" class="lineas">
            <li v-for="l in lineas" :key="l.uid" class="linea">
              <div class="linea-cab">
                <span class="emoji" aria-hidden="true">{{ l.emoji }}</span>
                <div class="min0">
                  <b>{{ l.producto }}</b>
                  <span class="sub">
                    {{ textoOrigen(l) }}
                    <template v-if="!l.escaneado && l.origen !== 'armado'"> · sin escanear</template>
                  </span>
                </div>
                <button class="btn-icono" :aria-label="`Quitar ${l.producto}`" @click="quitar(l)">✕</button>
              </div>

              <div class="linea-datos">
                <label class="cantidad">
                  <span class="rot">Cantidad</span>
                  <input class="campo dato" type="number" min="1" :max="l.disponible" inputmode="numeric"
                    v-model.number="l.cantidad">
                  <span class="sub">de {{ l.disponible }}</span>
                </label>

                <!-- Recuperar solo existe donde hay lotes (sql/16): en una cinta
                     o un ramo lo que se salva queda donde está. -->
                <div v-if="admiteRecuperar(l)" class="salva">
                  <span class="rot">¿Se puede vender algo todavía?</span>
                  <div class="si-no">
                    <button type="button" :class="{ on: !l.salva }" @click="l.salva = false">No</button>
                    <button type="button" :class="{ on: l.salva }" @click="activarSalva(l)">Sí</button>
                  </div>
                </div>
              </div>

              <div v-if="l.salva" class="recupera">
                <label>
                  <span class="rot">¿Cuántas?</span>
                  <input class="campo dato" type="number" min="1" :max="l.cantidad" inputmode="numeric"
                    v-model.number="l.cantidadRecuperada">
                </label>
                <div>
                  <span class="rot">¿Cómo quedan?</span>
                  <div class="calidades">
                    <button v-for="c in CALIDADES" :key="c.valor" type="button"
                      :class="{ on: l.calidad === c.valor }" @click="l.calidad = c.valor">
                      <b>{{ c.texto }}</b><span>{{ c.descripcion }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </li>
          </ul>

          <!-- Agregar: en puntual, una sola cosa -->
          <div v-if="esIncidente || !lineas.length" class="agregar">
            <p class="ayuda">
              {{ lineas.length ? 'Agrega otra cosa que se dañó:' : 'Escanea el balde o la partida (PAR-…) de donde sale.' }}
            </p>
            <EscanerCodigo ref="escaner" @leido="alEscanear" />

            <!-- Los ramos armados viven en la vitrina y no tienen etiqueta
                 propia: se eligen de la lista. -->
            <div v-if="ramosEnVitrina.length" class="grupo">
              <label for="r-ramo">O un ramo / arreglo de la vitrina</label>
              <select id="r-ramo" class="campo" :value="''" @change="agregarArmado($event.target.value); $event.target.value = ''">
                <option value="">Elige…</option>
                <option v-for="p in ramosEnVitrina" :key="p.id" :value="p.id">
                  {{ p.emoji }} {{ p.nombre }} — {{ p.stockListo }} listos
                </option>
              </select>
            </div>

            <!-- Sin etiqueta (rota, ilegible): bodega y admin pueden elegir a
                 mano. Queda marcado como no escaneado. -->
            <template v-if="!soloVitrina">
              <button class="enlace" @click="modoManual = !modoManual">
                No puedo escanear · elegir a mano
              </button>
              <div v-if="modoManual" class="manual">
                <select class="campo" v-model.number="manual.productoId" @change="alElegirManual">
                  <option :value="null">Producto…</option>
                  <option v-for="p in productosBodega" :key="p.id" :value="p.id">
                    {{ p.emoji }} {{ p.nombre }} — {{ p.enBodega }} en bodega
                  </option>
                </select>
                <select v-if="manual.lotes.length" class="campo" v-model.number="manual.loteId">
                  <option v-for="l in manual.lotes" :key="l.id" :value="l.id">
                    {{ l.codigo }} · {{ l.varasDisponibles }} varas
                  </option>
                </select>
                <button class="btn btn-linea" :disabled="!manual.productoId" @click="confirmarManual">
                  Agregar sin escanear
                </button>
              </div>
            </template>
          </div>
        </template>

        <!-- ═══════════ 2 · Por qué ═══════════ -->
        <template v-else-if="PASOS[paso].clave === 'porque'">
          <span class="rot">Motivo</span>
          <!-- Los más usados, como botones: es un toque en vez de abrir una
               lista de 17. El resto queda en "Otro motivo…". -->
          <div class="chips">
            <button v-for="m in motivosFrecuentes" :key="m.motivo" type="button" class="chip"
              :class="{ on: motivo === m.motivo }" @click="elegirMotivo(m.motivo)">{{ m.motivo }}</button>
          </div>

          <select class="campo otro-motivo" :class="{ on: motivo && !esFrecuente }" :value="esFrecuente ? '' : motivo"
            @change="elegirMotivo($event.target.value)">
            <option value="">Otro motivo…</option>
            <optgroup v-for="c in motivosPorCategoria" :key="c.valor" :label="c.texto">
              <option v-for="m in c.motivos" :key="m.motivo" :value="m.motivo">{{ m.motivo }}</option>
            </optgroup>
          </select>

          <p v-if="!motivosPorCategoria.length" class="ayuda rojo">
            No hay motivos de merma configurados. Una administradora los agrega en la
            pantalla de Mermas, sección de motivos.
          </p>

          <p v-if="esDevolucion" class="nota">
            Con este motivo, lo que salga de un balde queda como <b>devolución al
            proveedor</b>: sale del stock, pero no cuenta como pérdida.
          </p>

          <div class="grupo">
            <label for="r-det">
              Qué pasó<template v-if="detalleObligatorio"> (obligatorio)</template>
            </label>
            <textarea id="r-det" class="campo" rows="2" maxlength="200" v-model="detalle"
              :placeholder="detalleObligatorio ? 'Cuéntalo: sin esto no se entiende' : 'Opcional: se cayó el balde, llegaron golpeadas…'"></textarea>
          </div>
        </template>

        <!-- ═══════════ 3 · Fotos ═══════════ -->
        <template v-else-if="PASOS[paso].clave === 'fotos'">
          <p class="ayuda">
            Toma de 1 a 3 fotos de lo que se dañó. Son la evidencia de la merma:
            sin ellas no se puede registrar.
          </p>

          <div class="fotos">
            <figure v-for="(f, i) in fotos" :key="f.url" class="foto">
              <img :src="f.url" :alt="`Foto ${i + 1}`">
              <button class="quitar-foto" :aria-label="`Quitar foto ${i + 1}`" @click="quitarFoto(i)">✕</button>
            </figure>

            <!-- capture: en el teléfono abre la cámara directo. En el
                 computador no aplica y abre las carpetas. -->
            <label v-if="fotos.length < 3" class="tomar" :class="{ cargando: procesandoFoto }">
              <input class="oculto" type="file" accept="image/*" capture="environment"
                :disabled="procesandoFoto" @change="alTomarFoto">
              <span aria-hidden="true">📷</span>
              <span>{{ procesandoFoto ? 'Preparando…' : fotos.length ? 'Otra foto' : 'Tomar foto' }}</span>
            </label>
          </div>
        </template>

        <!-- ═══════════ 4 · Confirmar ═══════════ -->
        <template v-else>
          <!-- El resumen ES el control: una vez registrada no se revierte
               (solo se deshace en los primeros 10 minutos). -->
          <div class="resumen">
            <ul>
              <li v-for="l in lineas" :key="l.uid">
                <span>{{ l.cantidad }} × {{ l.producto }}
                  <span class="sub">· {{ textoOrigen(l) }}</span>
                  <span v-if="l.salva" class="sub verde"> · se salvan {{ l.cantidadRecuperada }}</span>
                </span>
                <b class="dato">{{ clp(valorLinea(l)) }}</b>
              </li>
            </ul>
            <div class="resumen-pie">
              <span>{{ motivo }}<template v-if="detalle.trim()"> · {{ detalle.trim() }}</template></span>
              <span>{{ fotos.length }} foto(s)</span>
            </div>
            <div class="total">
              <span>Valor</span>
              <b class="dato">{{ clp(valorTotal) }}</b>
            </div>
            <p v-if="hayValorAPrecio" class="sub">
              Algún producto no tiene costo cargado: se valoriza a precio de venta.
            </p>
          </div>

          <div v-if="necesitaAutorizacion" class="autorizacion">
            <div class="auth-cab">
              <span aria-hidden="true">🔐</span>
              <b>Necesita autorización</b>
            </div>
            <p class="ayuda">Pasa el tope de {{ clp(umbral) }}.</p>

            <template v-if="!codigoEnviado">
              <p class="ayuda">
                Se enviará un código a la administración por correo. Cuando lo reciban,
                te lo dictan y lo ingresas acá.
              </p>
              <button class="btn btn-linea ancho" :disabled="enviandoCodigo" @click="solicitarCodigo">
                {{ enviandoCodigo ? 'Enviando…' : 'Enviar código a la administración' }}
              </button>
            </template>
            <template v-else>
              <p class="ayuda">Código enviado. Ingresa el que te dicten:</p>
              <div class="fila-codigo">
                <input class="campo dato codigo-input" type="text" inputmode="numeric" maxlength="6"
                  v-model="codigoAuth" placeholder="000000" autocomplete="one-time-code"
                  @keyup.enter="registrar">
                <button class="btn btn-linea" @click="codigoEnviado = false">Reenviar</button>
              </div>
            </template>
          </div>

          <p class="ayuda">
            Después de registrarla tienes <b>10 minutos</b> para deshacerla si te
            equivocaste. Pasado eso queda registrada.
          </p>
        </template>
      </div>

      <div class="modal-pie">
        <button class="btn btn-linea" :disabled="guardando" @click="paso ? paso-- : intentarCerrar()">
          {{ paso ? 'Atrás' : 'Cancelar' }}
        </button>
        <button v-if="paso < PASOS.length - 1" class="btn" :disabled="!pasoListo" @click="siguiente">
          Siguiente
        </button>
        <button v-else class="btn" :disabled="!puedeRegistrar || guardando" @click="registrar">
          {{ guardando ? 'Registrando…' : 'Registrar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import EscanerCodigo from './EscanerCodigo.vue'
import { CALIDADES } from '@/features/mermas/store/mermas.module'
import { lotesService } from '@/features/lotes/services/lotes.service'
import { reducirImagen } from '@/core/utils/reducirImagen'

const emit = defineEmits(['cerrar', 'registrada'])
const store = useStore()

const PASOS = [
  { clave: 'que', texto: 'Qué' },
  { clave: 'porque', texto: 'Por qué' },
  { clave: 'fotos', texto: 'Fotos' },
  { clave: 'confirmar', texto: 'Confirmar' }
]

const paso = ref(0)
const error = ref('')
const tipo = ref('puntual')
const esIncidente = computed(() => tipo.value === 'incidente')

const lineas = ref([])
const motivo = ref('')
const detalle = ref('')
const fotos = ref([])
const procesandoFoto = ref(false)

const escaner = ref(null)
const modoManual = ref(false)
const manual = reactive({ productoId: null, loteId: null, lotes: [] })

const codigoEnviado = ref(false)
const codigoAuth = ref('')
const enviandoCodigo = ref(false)

let contador = 0

/* ---------------- Contexto ---------------- */
const esAdmin = computed(() => store.getters['auth/esAdmin'])
/* La vendedora registra lo de la vitrina: partidas del mostrador y ramos
   armados. La API lo exige igual; acá es para no ofrecer lo que no puede. */
const soloVitrina = computed(() => !store.getters['auth/tieneRol']('admin', 'bodega'))
const guardando = computed(() => store.getters['mermas/guardando'])
const umbral = computed(() => store.getters['mermas/umbralAutorizacion'])
const productos = computed(() => store.getters['productos/productos'] || [])

const ramosEnVitrina = computed(() =>
  productos.value.filter(p => p.activo && p.tipo === 'armado' && (p.stockListo ?? 0) > 0)
)
const productosBodega = computed(() =>
  productos.value.filter(p => p.activo && p.tipo !== 'armado' && (p.enBodega ?? 0) > 0)
)

onMounted(() => {
  if (!productos.value.length) store.dispatch('productos/cargar')
})

/* ---------------- Paso 1: líneas ---------------- */
const cambiarTipo = (t) => {
  tipo.value = t
  /* Volver a puntual con varias cosas cargadas: se queda la primera. */
  if (t === 'puntual' && lineas.value.length > 1) lineas.value = lineas.value.slice(0, 1)
}

const yaEsta = (n) => lineas.value.some(l =>
  l.productoId === n.productoId && (l.loteId ?? null) === (n.loteId ?? null) &&
  (l.partidaId ?? null) === (n.partidaId ?? null)
)

const agregar = (n) => {
  if (yaEsta(n)) {
    error.value = `${n.producto} ya está en la lista: cambia la cantidad ahí.`
    return
  }
  error.value = ''
  lineas.value.push({
    uid: ++contador, cantidad: 1, salva: false, cantidadRecuperada: 0, calidad: null, ...n
  })
}

const quitar = (l) => { lineas.value = lineas.value.filter(x => x.uid !== l.uid) }

const alEscanear = async ({ codigo, escaneado }) => {
  try {
    const r = await store.dispatch('mermas/escanear', codigo)
    if (!r) return escaner.value?.mostrarError(`No hay ningún lote ni partida con el código ${codigo}.`)
    if (!r.puedeMermar) return escaner.value?.mostrarError(r.motivoBloqueo || 'De acá no se puede mermar.')

    agregar({
      productoId: r.productoId, producto: r.producto, emoji: r.emoji,
      origen: r.origen, loteId: r.loteId, partidaId: r.partidaId, codigo: r.codigo,
      disponible: r.disponible, costoUnitario: r.costoUnitario, precio: r.precio,
      controlaLotes: r.controlaLotes, tipo: 'simple', escaneado
    })
    escaner.value?.reiniciar()
  } catch (e) {
    escaner.value?.mostrarError(e.message)
  }
}

const agregarArmado = (valor) => {
  const p = ramosEnVitrina.value.find(x => x.id === Number(valor))
  if (!p) return
  agregar({
    productoId: p.id, producto: p.nombre, emoji: p.emoji,
    origen: 'armado', loteId: null, partidaId: null, codigo: null,
    disponible: p.stockListo, costoUnitario: p.costoArmado ?? p.costoEfectivo ?? 0, precio: p.precio,
    controlaLotes: false, tipo: 'armado', escaneado: false
  })
}

const alElegirManual = async () => {
  manual.lotes = []
  manual.loteId = null
  const p = productosBodega.value.find(x => x.id === manual.productoId)
  if (!p?.controlaLotes) return
  try {
    const res = await lotesService.listar({ productoId: manual.productoId, tamano: 50 })
    manual.lotes = (res.items || []).filter(l => l.varasDisponibles > 0)
    manual.loteId = manual.lotes[0]?.id ?? null
  } catch (e) {
    error.value = e.message
  }
}

const confirmarManual = () => {
  const p = productosBodega.value.find(x => x.id === manual.productoId)
  const l = manual.lotes.find(x => x.id === manual.loteId)
  if (!p) return
  if (p.controlaLotes && !l) {
    error.value = `${p.nombre} se maneja por lotes: elige el balde.`
    return
  }
  agregar({
    productoId: p.id, producto: p.nombre, emoji: p.emoji,
    origen: l ? 'lote' : 'stock', loteId: l?.id ?? null, partidaId: null, codigo: l?.codigo ?? null,
    disponible: l?.varasDisponibles ?? p.enBodega, costoUnitario: l?.costoPorVara ?? p.costoEfectivo ?? 0,
    precio: l?.precioUnitario ?? p.precio, controlaLotes: p.controlaLotes, tipo: p.tipo, escaneado: false
  })
  modoManual.value = false
  manual.productoId = null
  manual.lotes = []
}

const admiteRecuperar = (l) => l.controlaLotes && l.tipo !== 'armado'

const activarSalva = (l) => {
  l.salva = true
  /* La mitad como punto de partida: se ajusta mirando la flor. */
  if (!l.cantidadRecuperada) l.cantidadRecuperada = Math.max(1, Math.floor(l.cantidad / 2))
}

const textoOrigen = (l) => ({
  partida: `mostrador ${l.codigo}`,
  lote: `balde ${l.codigo}`,
  armado: 'vitrina',
  stock: 'bodega'
}[l.origen] || l.origen)

const lineasValidas = computed(() =>
  lineas.value.length > 0 &&
  (esIncidente.value || lineas.value.length === 1) &&
  lineas.value.every(l =>
    l.cantidad >= 1 && l.cantidad <= l.disponible &&
    (!l.salva || (l.cantidadRecuperada >= 1 && l.cantidadRecuperada <= l.cantidad && l.calidad))
  )
)

/* ---------------- Paso 2: motivo ---------------- */
const motivos = computed(() => store.getters['mermas/motivos'] || [])
const motivosPorCategoria = computed(() => store.getters['mermas/motivosPorCategoria'])
const motivosFrecuentes = computed(() =>
  [...motivos.value].sort((a, b) => (b.usos || 0) - (a.usos || 0)).slice(0, 6)
)
const esFrecuente = computed(() => motivosFrecuentes.value.some(m => m.motivo === motivo.value))
const motivoElegido = computed(() => store.getters['mermas/motivoPorNombre'](motivo.value))
const detalleObligatorio = computed(() => !!motivoElegido.value?.requiereDetalle)
const esDevolucion = computed(() => motivoElegido.value?.destinoSugerido === 'devolucion_proveedor')

const elegirMotivo = (m) => { motivo.value = m }

const motivoValido = computed(() =>
  !!motivo.value && (!detalleObligatorio.value || detalle.value.trim().length > 0)
)

/* ---------------- Paso 3: fotos ---------------- */
const aBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result).split(',')[1])
  r.onerror = () => reject(new Error('No se pudo leer la foto.'))
  r.readAsDataURL(blob)
})

const alTomarFoto = async (e) => {
  const archivo = e.target.files?.[0]
  e.target.value = ''
  if (!archivo) return
  procesandoFoto.value = true
  error.value = ''
  try {
    /* Reducida a ~200 KB: con datos móviles en el mesón, subir 5 MB por
       foto es esperar, y en la base pesaría por años. */
    const blob = await reducirImagen(archivo)
    fotos.value.push({ url: URL.createObjectURL(blob), base64: await aBase64(blob), tipoMime: 'image/jpeg' })
  } catch (err) {
    error.value = err.message
  } finally {
    procesandoFoto.value = false
  }
}

const quitarFoto = (i) => {
  URL.revokeObjectURL(fotos.value[i].url)
  fotos.value.splice(i, 1)
}

onBeforeUnmount(() => fotos.value.forEach(f => URL.revokeObjectURL(f.url)))

/* ---------------- Paso 4: valor y firma ---------------- */
/* La misma regla que la base (sql/15): a costo; sin costo, a precio. */
const valorLinea = (l) => (l.cantidad || 0) * ((l.costoUnitario > 0 ? l.costoUnitario : l.precio) || 0)
const valorTotal = computed(() => lineas.value.reduce((s, l) => s + valorLinea(l), 0))
const hayValorAPrecio = computed(() => lineas.value.some(l => !(l.costoUnitario > 0)))
const necesitaAutorizacion = computed(() => !esAdmin.value && valorTotal.value > umbral.value)

const solicitarCodigo = async () => {
  if (enviandoCodigo.value) return
  enviandoCodigo.value = true
  error.value = ''
  try {
    await store.dispatch('mermas/solicitarCodigo', Math.round(valorTotal.value))
    codigoEnviado.value = true
    codigoAuth.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    enviandoCodigo.value = false
  }
}

/* ---------------- Navegación ---------------- */
const pasoListo = computed(() => ({
  que: lineasValidas.value,
  porque: motivoValido.value,
  fotos: fotos.value.length >= 1
}[PASOS[paso.value].clave] ?? true))

const siguiente = () => {
  if (!pasoListo.value) return
  error.value = ''
  paso.value++
}

const puedeRegistrar = computed(() =>
  lineasValidas.value && motivoValido.value && fotos.value.length >= 1 &&
  (!necesitaAutorizacion.value || codigoAuth.value.trim().length === 6)
)

const hayAvance = computed(() => lineas.value.length || fotos.value.length || motivo.value)

const intentarCerrar = () => {
  if (guardando.value) return
  if (hayAvance.value && !window.confirm('¿Descartar esta merma? Se pierde lo que anotaste.')) return
  emit('cerrar')
}

const registrar = async () => {
  if (!puedeRegistrar.value || guardando.value) return
  error.value = ''
  try {
    const r = await store.dispatch('mermas/registrarReporte', {
      tipo: tipo.value,
      motivo: motivo.value,
      detalle: detalle.value.trim() || null,
      lineas: lineas.value.map(l => ({
        productoId: l.productoId,
        loteId: l.loteId ?? null,
        partidaId: l.partidaId ?? null,
        cantidad: l.cantidad,
        destino: l.salva ? 'reingreso'
          : (esDevolucion.value && l.loteId ? 'devolucion_proveedor' : 'perdida'),
        cantidadRecuperada: l.salva ? l.cantidadRecuperada : 0,
        calidad: l.salva ? l.calidad : null,
        codigoEscaneado: l.codigo,
        escaneado: l.escaneado
      })),
      fotos: fotos.value.map(f => ({ base64: f.base64, tipoMime: f.tipoMime })),
      autorizacion: necesitaAutorizacion.value ? { codigo: codigoAuth.value.trim() } : null
    })
    emit('registrada', r)
  } catch (e) {
    /* El mensaje viene del RAISE, ya redactado. */
    error.value = e.message
    codigoAuth.value = ''
  }
}

/* ---------------- Formato ---------------- */
const fmt = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
const clp = (n) => fmt.format(Math.round(n || 0))
</script>

<style scoped>
.fondo {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
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
  overflow: hidden;
}

.modal-cab { padding: 16px 20px 12px; border-bottom: 1px solid var(--border); }
.modal-cab h3 { margin: 0; font-size: 1.1rem; font-weight: 700; }

.pasos {
  display: flex;
  gap: 6px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}
.pasos li {
  flex: 1;
  padding-top: 6px;
  border-top: 3px solid var(--border);
  font-size: .72rem;
  font-weight: 600;
  color: var(--text-faint);
}
.pasos li.hecho { border-top-color: var(--accent); color: var(--text-muted); }
.pasos li.on { border-top-color: var(--accent); color: var(--accent-text); }

.modal-cuerpo { flex: 1; overflow-y: auto; padding: 16px 20px; }

.modal-pie {
  display: flex;
  gap: 10px;
  padding: 14px 20px calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}
.modal-pie .btn { flex: 1; }

/* ─── Básicos ─── */
.min0 { min-width: 0; }
.rot {
  display: block;
  margin-bottom: 4px;
  font-size: .64rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--text-faint);
}
.sub { font-size: .76rem; color: var(--text-muted); }
.dato { font-variant-numeric: tabular-nums; font-weight: 700; }
.rojo { color: var(--danger); }
.verde { color: var(--success); }
.oculto { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }

.ayuda { margin: 6px 0 10px; font-size: .8rem; color: var(--text-muted); line-height: 1.5; }
.ayuda.rojo { color: var(--danger); }

.grupo { margin-top: 14px; }
.grupo label {
  display: block;
  margin-bottom: 5px;
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.campo {
  width: 100%;
  min-height: 46px;
  padding: .55rem .75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  /* 16px mínimo: bajo eso iOS hace zoom al enfocar. */
  font-size: max(.95rem, 16px);
  outline: none;
}
.campo:focus { border-color: var(--accent); }
textarea.campo { resize: vertical; }

.error {
  padding: 11px 13px;
  margin-bottom: 14px;
  border-radius: var(--r-sm);
  border-left: 4px solid var(--danger);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: .86rem;
}

.nota {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: var(--r-sm);
  background: var(--info-soft);
  color: var(--info);
  font-size: .82rem;
}

/* ─── Paso 1 ─── */
.segmentado { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
.segmentado button, .calidades button {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.segmentado button span, .calidades button span { font-size: .74rem; color: var(--text-muted); }
.segmentado button.on, .calidades button.on { border-color: var(--accent); background: var(--accent-soft); }

.lineas { list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.linea { padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--r-sm); }
.linea-cab { display: flex; align-items: center; gap: 10px; }
.linea-cab .min0 { flex: 1; }
.linea-cab b { display: block; font-size: .92rem; }
.emoji { font-size: 1.4rem; }

.linea-datos { display: flex; gap: 14px; align-items: flex-end; margin-top: 10px; flex-wrap: wrap; }
.cantidad { display: flex; flex-direction: column; }
.cantidad .campo { width: 90px; text-align: right; }
.salva { flex: 1; min-width: 160px; }
.si-no { display: flex; gap: 6px; }
.si-no button {
  flex: 1;
  min-height: 44px;
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.si-no button.on { border-color: var(--accent); background: var(--accent); color: var(--accent-contrast); }

.recupera { display: grid; grid-template-columns: 90px 1fr; gap: 12px; margin-top: 10px; }
.calidades { display: flex; flex-direction: column; gap: 6px; }

.agregar { margin-top: 4px; }
.manual { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }

.enlace {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 8px;
  border: none;
  background: none;
  color: var(--text-muted);
  font: inherit;
  font-size: .82rem;
  text-decoration: underline;
  cursor: pointer;
}

/* ─── Paso 2 ─── */
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.chip {
  min-height: 44px;
  padding: 0 14px;
  border: 1.5px solid var(--border);
  border-radius: var(--r-full);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: .88rem;
  font-weight: 600;
  cursor: pointer;
}
.chip.on { border-color: var(--accent); background: var(--accent); color: var(--accent-contrast); }
.otro-motivo.on { border-color: var(--accent); }

/* ─── Paso 3 ─── */
.fotos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.foto { position: relative; margin: 0; aspect-ratio: 1; border-radius: var(--r-sm); overflow: hidden; }
.foto img { width: 100%; height: 100%; object-fit: cover; }
.quitar-foto {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, .6);
  color: #fff;
  cursor: pointer;
}
.tomar {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 2px dashed var(--border-strong);
  border-radius: var(--r-sm);
  color: var(--text-muted);
  font-size: .82rem;
  font-weight: 600;
  cursor: pointer;
}
.tomar span:first-of-type { font-size: 1.6rem; }
.tomar.cargando { opacity: .6; }

/* ─── Paso 4 ─── */
.resumen { padding: 12px 14px; border-radius: var(--r-sm); background: var(--surface-2); }
.resumen ul { list-style: none; margin: 0; padding: 0; }
.resumen li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  font-size: .86rem;
}
.resumen-pie { display: flex; justify-content: space-between; gap: 12px; margin-top: 8px; font-size: .8rem; color: var(--text-muted); }
.total { display: flex; justify-content: space-between; margin-top: 8px; font-weight: 700; }
.total b { font-size: 1.2rem; }

.autorizacion {
  margin-top: 14px;
  padding: 12px 14px;
  border: 1.5px solid var(--warn-border);
  border-radius: var(--r-sm);
  background: var(--warn-soft);
}
.auth-cab { display: flex; align-items: center; gap: 8px; color: var(--warn); }
.autorizacion .ayuda { color: var(--warn); }
.fila-codigo { display: flex; gap: 8px; align-items: center; }
.fila-codigo .campo { flex: 1; }
.codigo-input { text-align: center; font-size: 1.4rem; font-weight: 700; letter-spacing: .25em; }
.ancho { width: 100%; }

/* ─── Botones ─── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: var(--accent);
  color: var(--accent-contrast);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn-linea { background: var(--surface); border-color: var(--border-strong); color: var(--text-muted); }
.btn-icono { border: 0; background: none; color: var(--text-muted); font-size: 1rem; cursor: pointer; padding: 6px; }

@media (max-width: 560px) {
  .fondo { padding: 0; align-items: flex-end; }
  .modal { max-width: none; max-height: 96dvh; border-radius: var(--r-lg) var(--r-lg) 0 0; }
  .segmentado { grid-template-columns: 1fr; }
  .recupera { grid-template-columns: 1fr; }
}
</style>
