<template>
  <div class="fondo" @click.self="intentarCerrar">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-ramo">

      <div class="modal-cab">
        <div class="min0">
          <h3 id="titulo-ramo">{{ esNuevo ? 'Nuevo ramo de catálogo' : f.nombre || 'Editar ramo' }}</h3>
          <p v-if="esNuevo">Un ramo que se repite y se arma para tener en vitrina.</p>
          <p v-else class="mono">{{ f.codigo }}</p>
        </div>
        <button class="btn-icono" @click="intentarCerrar" aria-label="Cerrar">✕</button>
      </div>

      <!-- ═══ Pasos ═══ -->
      <!-- El orden no es decorativo: la receta va primero porque el costo
           sale de ella, y sin costo el precio se pone a ojo y el margen se
           descubre a fin de mes. El nombre va último porque sale más fácil
           cuando ya se ve lo que lleva. -->
      <nav class="pasos" :aria-label="esNuevo ? 'Pasos' : 'Secciones'">
        <button v-for="(p, i) in pasos" :key="p.clave" class="paso"
          :class="{ on: i === paso, hecho: esNuevo && i < paso }" :disabled="!puedeIr(i)"
          :aria-current="i === paso ? 'step' : undefined" @click="irA(i)">
          <span class="num" aria-hidden="true">{{ esNuevo && i < paso ? '✓' : i + 1 }}</span>
          <span class="rot-paso">{{ p.titulo }}</span>
        </button>
      </nav>

      <div v-if="esNuevo" class="barra" aria-hidden="true">
        <div class="barra-llena" :style="{ width: `${((paso + 1) / pasos.length) * 100}%` }"></div>
      </div>

      <div class="modal-cuerpo" ref="cuerpo">
        <div v-if="error" class="error">{{ error }}</div>

        <p class="paso-pista">{{ pasos[paso].pista }}</p>

        <!-- ═══════════ 1 · Qué lleva ═══════════ -->
        <template v-if="pasos[paso].clave === 'receta'">
          <div class="buscador">
            <span aria-hidden="true">🔎</span>
            <input ref="campoBusqueda" v-model="busqueda" placeholder="Buscar flor o insumo…"
              aria-label="Buscar componente">
            <button v-if="busqueda" class="btn-icono chico neutro" @click="busqueda = ''"
              aria-label="Limpiar">✕</button>
          </div>

          <p v-if="cargandoComponentes" class="sin-resultados">Cargando componentes…</p>

          <!-- Los resultados se muestran mientras se escribe: agregar doce
               componentes con un select es doce veces abrir la lista. -->
          <div v-else-if="busqueda && sugerencias.length" class="sugerencias">
            <button v-for="c in sugerencias" :key="c.id" class="sugerencia" @click="agregar(c)">
              <span class="emoji" aria-hidden="true">{{ c.emoji }}</span>
              <div class="min0">
                <div class="nombre">{{ c.nombre }}</div>
                <div class="desglose">
                  {{ clp(c.costo) }} c/u
                  <template v-if="c.categoria"> · {{ c.categoria }}</template>
                </div>
              </div>
              <span class="mas" aria-hidden="true">＋</span>
            </button>
          </div>

          <p v-else-if="busqueda" class="sin-resultados">
            Nada coincide con «{{ busqueda }}».
          </p>

          <div v-if="receta.length" class="receta">
            <div v-for="(l, i) in receta" :key="l.componenteId" class="linea">
              <span class="emoji" aria-hidden="true">{{ l.emoji }}</span>

              <div class="min0">
                <div class="nombre">{{ l.componente }}</div>
                <div class="desglose">{{ clp(l.costoUnitario) }} c/u</div>
              </div>

              <div class="cantidad">
                <button class="cant-btn" @click="cambiar(l, cantDe(l) - 1)"
                  :aria-label="`Menos ${l.componente}`">−</button>
                <!-- Sin v-model.number: al borrar el campo queda '' y el
                     subtotal se vuelve NaN. Se normaliza al salir. -->
                <input class="campo-cant dato" type="number" min="1" inputmode="numeric" :value="l.cantidad"
                  :aria-label="`Cantidad de ${l.componente}`"
                  @input="l.cantidad = $event.target.value" @blur="normalizar(l)">
                <button class="cant-btn" @click="cambiar(l, cantDe(l) + 1)"
                  :aria-label="`Más ${l.componente}`">＋</button>
              </div>

              <b class="dato subtotal">{{ clp(cantDe(l) * l.costoUnitario) }}</b>

              <button class="btn-icono chico" @click="receta.splice(i, 1)"
                :aria-label="`Quitar ${l.componente}`">✕</button>
            </div>

            <!-- El costo sumándose en vivo: es el número que decide el precio,
                 y verlo mientras se arma evita el ramo que no deja margen. -->
            <div class="costo-total">
              <div class="linea-costo">
                <span>Cuesta armar uno</span>
                <b class="dato">{{ clp(costoReceta) }}</b>
              </div>
              <!-- El costo de oportunidad: si el ramo se cobra menos que
                   esto, armarlo deja menos que vender las varas sueltas. -->
              <div v-if="valorSuelto > 0" class="linea-costo suave">
                <span>Sueltas se venderían en</span>
                <b class="dato">{{ clp(valorSuelto) }}</b>
              </div>
            </div>
          </div>

          <p v-else-if="!cargandoComponentes" class="vacio">
            Busca arriba y toca para agregar. Sin componentes, el ramo no se
            puede armar ni desarmar.
          </p>
        </template>

        <!-- ═══════════ 2 · Cuánto cobrar ═══════════ -->
        <template v-else-if="pasos[paso].clave === 'precio'">
          <!-- El costo viene del paso anterior, pero acá es el dato que
               gobierna: se repite para no obligar a volver. -->
          <div class="costo-recordatorio">
            <div>
              <span class="rot">Cuesta armar uno</span>
              <b class="dato">{{ clp(costoReceta) }}</b>
            </div>
            <div v-if="valorSuelto > 0">
              <span class="rot">Sueltas valdrían</span>
              <b class="dato suave">{{ clp(valorSuelto) }}</b>
            </div>
          </div>

          <div v-if="costoReceta > 0" class="sugeridos">
            <button v-for="m in MARGENES" :key="m" class="sugerido" :class="{ on: f.precio === precioPara(m) }"
              @click="f.precio = precioPara(m)">
              {{ m }}%
              <span>{{ clp(precioPara(m)) }}</span>
            </button>
          </div>

          <div class="grupo">
            <label for="r-precio">Precio de venta</label>
            <div class="monto grande" :class="{ malo: margenMalo, bueno: margenBueno }">
              <span class="signo">$</span>
              <input id="r-precio" ref="campoPrecio" class="campo-monto" type="number" min="0"
                inputmode="numeric" v-model.number="f.precio">
            </div>
          </div>

          <div v-if="f.precio > 0 && costoReceta > 0" class="margen-real"
            :class="{ malo: margenMalo, bueno: margenBueno }">
            <div>
              <span class="rot">Margen</span>
              <b class="dato">{{ margen }}%</b>
            </div>
            <div>
              <span class="rot">Deja</span>
              <b class="dato">{{ clp(f.precio - costoReceta) }}</b>
            </div>
            <p v-if="margenMalo" class="aviso">
              Bajo 25% la merma se come la diferencia antes de fin de mes.
            </p>
          </div>

          <!-- No es un error: un ramo se vende más rápido que doce varas
               sueltas, y eso puede justificar la diferencia. -->
          <p v-if="pierdeArmando" class="aviso-suelto">
            A {{ clp(f.precio) }}, armarlo deja
            <b>{{ clp(valorSuelto - f.precio) }}</b> menos que vender las varas
            sueltas. Puede convenir igual —un ramo se vende más rápido— pero
            vale saberlo.
          </p>
        </template>

        <!-- ═══════════ 3 · Cómo se llama ═══════════ -->
        <template v-else-if="pasos[paso].clave === 'identidad'">
          <div class="grupo">
            <label for="r-nombre">Nombre</label>
            <input id="r-nombre" ref="campoNombre" class="campo" v-model="f.nombre" maxlength="120"
              :placeholder="nombreSugerido || 'Ramo primaveral'">
            <button v-if="nombreSugerido && f.nombre !== nombreSugerido" class="enlace"
              @click="f.nombre = nombreSugerido">
              Usar «{{ nombreSugerido }}»
            </button>
          </div>

          <div v-if="esNuevo" class="grupo">
            <label for="r-codigo">Código</label>
            <input id="r-codigo" class="campo mono" v-model="f.codigo" maxlength="40"
              :placeholder="codigoSugerido">
            <p class="ayuda-campo">Se usa para buscarlo en el mesón.</p>
          </div>

          <div class="grupo">
            <label for="r-emoji">Emoji</label>
            <!-- Los sugeridos evitan abrir el teclado de emojis, que en
                 escritorio es un trámite. -->
            <div class="emoji-fila">
              <input id="r-emoji" class="campo emoji" v-model="f.emoji" maxlength="4" placeholder="💐">
              <div class="emoji-sugeridos">
                <button v-for="e in EMOJIS" :key="e" class="emoji-op" :class="{ on: f.emoji === e }"
                  :aria-label="`Usar ${e}`" @click="f.emoji = e">{{ e }}</button>
              </div>
            </div>
          </div>

          <div class="grupo">
            <label for="r-cat">Categoría</label>
            <select id="r-cat" class="campo" v-model.number="f.categoriaId">
              <option :value="null">Sin categoría</option>
              <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
            </select>
          </div>

          <div class="grupo">
            <label for="r-minimo">Mínimo en vitrina</label>
            <input id="r-minimo" class="campo dato corto" type="number" min="0" inputmode="numeric"
              v-model.number="f.minimo">
            <p class="ayuda-campo">Bajo esto avisa que hay que armar más.</p>
          </div>
        </template>

        <!-- ═══════════ 4 · Revisar ═══════════ -->
        <template v-else>
          <div class="resumen-cab">
            <span class="resumen-emoji" aria-hidden="true">{{ f.emoji || '💐' }}</span>
            <div class="min0">
              <b>{{ f.nombre.trim() || nombreSugerido }}</b>
              <span class="mono">{{ (f.codigo.trim() || codigoSugerido).toUpperCase() }}</span>
            </div>
          </div>

          <h4 class="sub-titulo">Lleva</h4>
          <div class="resumen-receta">
            <div v-for="l in receta" :key="l.componenteId" class="resumen-linea">
              <span class="emoji" aria-hidden="true">{{ l.emoji }}</span>
              <span class="min0 nombre">{{ cantDe(l) }} × {{ l.componente }}</span>
              <b class="dato">{{ clp(cantDe(l) * l.costoUnitario) }}</b>
            </div>
          </div>

          <dl class="resumen">
            <div>
              <dt>Cuesta armar</dt>
              <dd class="dato">{{ clp(costoReceta) }}</dd>
            </div>
            <div>
              <dt>Precio</dt>
              <dd><b class="dato">{{ clp(f.precio) }}</b></dd>
            </div>
            <div>
              <dt>Margen</dt>
              <dd>
                <span class="chip" :class="margenMalo ? 'chip-malo' : 'chip-ok'">{{ margen }}%</span>
                <span class="tenue"> · deja {{ clp(f.precio - costoReceta) }}</span>
              </dd>
            </div>
            <div>
              <dt>Categoría</dt>
              <dd>{{ nombreCategoria || 'Sin categoría' }}</dd>
            </div>
            <div>
              <dt>Mínimo en vitrina</dt>
              <dd class="dato">{{ f.minimo || 0 }}</dd>
            </div>
          </dl>

          <p v-if="pierdeArmando" class="aviso-suelto">
            Cobrado así, armarlo deja {{ clp(valorSuelto - f.precio) }} menos
            que vender las varas sueltas.
          </p>
        </template>
      </div>

      <!-- ═══ Pie ═══ -->
      <div class="modal-pie">
        <template v-if="esNuevo">
          <button v-if="paso > 0" class="btn btn-linea" :disabled="guardando" @click="atras">Atrás</button>
          <button v-else class="btn btn-linea" :disabled="guardando" @click="intentarCerrar">Cancelar</button>

          <button v-if="paso < pasos.length - 1" class="btn" @click="siguiente">Siguiente</button>
          <button v-else class="btn" :disabled="guardando" @click="guardar">
            {{ guardando ? 'Creando…' : 'Crear ramo' }}
          </button>
        </template>

        <template v-else>
          <button class="btn btn-linea" :disabled="guardando" @click="intentarCerrar">Cancelar</button>
          <button class="btn" :disabled="guardando" @click="guardar">
            {{ guardando ? 'Guardando…' : 'Guardar' }}
          </button>
        </template>
      </div>
    </div>

    <!-- Descartar -->
    <div v-if="confirmarSalida" class="fondo z-alto" @click.self="confirmarSalida = false">
      <div class="modal angosto" role="dialog" aria-modal="true">
        <div class="modal-cab">
          <div class="min0">
            <h3>¿Descartar el ramo?</h3>
            <p>La receta y el precio que armaste se van a perder.</p>
          </div>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="confirmarSalida = false">Seguir editando</button>
          <button class="btn peligro" @click="$emit('cerrar')">Descartar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useStore } from 'vuex'
import { productosService } from '@/features/inventario/services/productos.service'

/* Los tres márgenes habituales en el rubro. El de abajo es el mínimo
   defendible; el de arriba, lo que se cobra en un arreglo con trabajo. */
const MARGENES = [40, 55, 70]

/* Atajos para no abrir el teclado de emojis */
const EMOJIS = ['💐', '🌹', '🌷', '🌺', '🌿', '🧺', '🎀', '🎁']

export default {
  name: 'ModalRamo',
  props: {
    /* null = nuevo. Con producto = edición de un ramo existente. */
    producto: { type: Object, default: null }
  },
  emits: ['cerrar', 'guardado'],

  setup (props, { emit }) {
    const store = useStore()

    const esNuevo = computed(() => !props.producto?.id)
    const error = ref('')
    const guardando = ref(false)
    const cargandoComponentes = ref(true)
    const confirmarSalida = ref(false)

    const cuerpo = ref(null)
    const campoBusqueda = ref(null)
    const campoPrecio = ref(null)
    const campoNombre = ref(null)

    const categorias = computed(() => store.getters['inventario/categorias'])

    const f = reactive({
      id: props.producto?.id ?? null,
      codigo: props.producto?.codigo ?? '',
      nombre: props.producto?.nombre ?? '',
      emoji: props.producto?.emoji ?? '💐',
      categoriaId: props.producto?.categoriaId ?? null,
      precio: props.producto?.precio ?? 0,
      minimo: props.producto?.minimo ?? 0
    })

    /* ---------------- Receta ---------------- */
    const receta = ref([])
    const componentes = ref([])
    const busqueda = ref('')

    /* La cantidad puede ser '' mientras se escribe: cualquier cálculo la
       pasa por acá para que un campo a medio borrar no produzca NaN. */
    const cantDe = (l) => Math.max(0, Math.floor(Number(l.cantidad) || 0))

    /* Se filtran los ya agregados: ofrecer uno que está en la lista lleva a
       duplicarlo, y aunque el SP lo sume, es confuso. */
    const sugerencias = computed(() => {
      const q = busqueda.value.trim().toLowerCase()
      if (!q) return []

      return componentes.value
        .filter(c =>
          !receta.value.some(l => l.componenteId === c.id) &&
          (c.nombre.toLowerCase().includes(q) || String(c.codigo).toLowerCase().includes(q))
        )
        .slice(0, 6)
    })

    const costoReceta = computed(() =>
      receta.value.reduce((t, l) => t + cantDe(l) * (l.costoUnitario || 0), 0)
    )

    /* Lo que valdrían los componentes vendidos sueltos, a precio de ramo.
       Si el ramo se cobra menos que esto, armarlo pierde plata frente a
       vender las varas por separado —y eso no aparece en ningún margen. */
    const valorSuelto = computed(() =>
      receta.value.reduce((t, l) => t + cantDe(l) * (l.precioRamo || l.precio || 0), 0)
    )

    const pierdeArmando = computed(() =>
      f.precio > 0 && valorSuelto.value > 0 && f.precio < valorSuelto.value
    )

    const agregar = (c) => {
      receta.value.push({
        componenteId: c.id,
        componente: c.nombre,
        emoji: c.emoji,
        cantidad: 1,
        costoUnitario: c.costo,
        /* El precio suelto, para saber cuánto se deja de ganar al armar. */
        precio: c.precio,
        precioRamo: c.precioRamo
      })
      busqueda.value = ''
      campoBusqueda.value?.focus()
    }

    const cambiar = (l, cantidad) => {
      if (cantidad < 1) {
        receta.value = receta.value.filter(x => x.componenteId !== l.componenteId)
      } else {
        l.cantidad = cantidad
      }
    }

    /* Al salir del campo se normaliza, pero no se quita la línea: borrar una
       línea porque el campo quedó vacío un segundo sería una sorpresa. Para
       quitarla están el botón − y la ✕. */
    const normalizar = (l) => {
      l.cantidad = Math.max(1, cantDe(l))
    }

    /* ---------------- Pasos ---------------- */
    const pasos = computed(() => {
      const base = [
        {
          clave: 'receta',
          titulo: 'Qué lleva',
          pista: 'Busca y agrega los componentes. El costo se va sumando abajo.'
        },
        {
          clave: 'precio',
          titulo: 'Precio',
          pista: 'Con el costo ya calculado, decide cuánto cobrar.'
        },
        {
          clave: 'identidad',
          titulo: 'Nombre',
          pista: 'Cómo se llama y dónde se encuentra en el mesón.'
        }
      ]
      if (esNuevo.value) {
        base.push({
          clave: 'revisar',
          titulo: 'Revisar',
          pista: 'Así queda el ramo. Revisa antes de crearlo.'
        })
      }
      return base
    })

    const paso = ref(0)

    const errorDe = (i) => {
      const clave = pasos.value[i]?.clave
      if (clave === 'receta') {
        if (!receta.value.length) {
          return 'Agrega al menos un componente: un ramo sin receta no se puede armar.'
        }
      }
      if (clave === 'precio') {
        if (!f.precio || f.precio < 1) return 'Indica el precio de venta.'
      }
      if (clave === 'identidad') {
        const nombre = (f.nombre.trim() || nombreSugerido.value).trim()
        if (nombre.length < 2) return 'Ponle un nombre al ramo.'
        if (esNuevo.value && !(f.codigo.trim() || codigoSugerido.value)) {
          return 'El código es obligatorio: es lo que se busca en el mesón.'
        }
      }
      return ''
    }

    /* Editando se salta libre entre pestañas; creando, solo hasta donde lo
       anterior está completo. */
    const puedeIr = (i) => {
      if (!esNuevo.value) return true
      for (let k = 0; k < i; k++) if (errorDe(k)) return false
      return true
    }

    const irA = (i) => {
      if (!puedeIr(i)) return
      error.value = ''
      paso.value = i
    }

    const siguiente = () => {
      const e = errorDe(paso.value)
      if (e) return (error.value = e)
      error.value = ''
      paso.value = Math.min(paso.value + 1, pasos.value.length - 1)
    }

    const atras = () => {
      error.value = ''
      paso.value = Math.max(paso.value - 1, 0)
    }

    /* El cuerpo scrollea: al cambiar de paso hay que volver arriba, o el paso
       nuevo arranca por la mitad. El foco va al campo que toca. */
    watch(paso, async () => {
      if (cuerpo.value) cuerpo.value.scrollTop = 0
      await nextTick()
      const clave = pasos.value[paso.value].clave
      if (clave === 'receta') campoBusqueda.value?.focus()
      else if (clave === 'precio') campoPrecio.value?.focus()
      else if (clave === 'identidad') campoNombre.value?.focus()
    })

    /* ---------------- Precio ---------------- */

    /* El precio para un margen dado. Se redondea a la centena de arriba menos
       diez: $24.990 se lee mejor que $24.847, y nadie cobra ese número. */
    const precioPara = (margenPct) => {
      if (!costoReceta.value) return 0
      const bruto = costoReceta.value / (1 - margenPct / 100)
      return Math.ceil(bruto / 100) * 100 - 10
    }

    const margen = computed(() => {
      if (!f.precio || !costoReceta.value) return 0
      return Math.round((f.precio - costoReceta.value) / f.precio * 100)
    })

    /* Bajo 25% la merma se come la diferencia antes de fin de mes. */
    const margenMalo = computed(() =>
      f.precio > 0 && costoReceta.value > 0 && margen.value < 25
    )

    const margenBueno = computed(() =>
      f.precio > 0 && costoReceta.value > 0 && margen.value >= 45
    )

    const nombreCategoria = computed(() =>
      categorias.value.find(c => c.id === f.categoriaId)?.nombre || ''
    )

    /* ---------------- Nombre y código ---------------- */

    /* Se propone desde lo que lleva: "Ramo 12 rosas rojas". Sale del
       componente con más unidades, que casi siempre es el que da el
       carácter al ramo. */
    const nombreSugerido = computed(() => {
      if (!receta.value.length) return ''

      const principal = [...receta.value].sort((a, b) => cantDe(b) - cantDe(a))[0]
      const nombre = principal.componente
        .replace(/\s*\(.*?\)\s*/g, '')  // saca el "(tallo)"
        .toLowerCase()

      return `Ramo ${cantDe(principal)} ${nombre}`
    })

    const codigoSugerido = computed(() => {
      const base = (f.nombre || nombreSugerido.value)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      return base.slice(0, 30)
    })

    /* ---------------- Cerrar ---------------- */
    const sello = ref('')
    const foto = () => JSON.stringify({
      f,
      receta: receta.value.map(l => [l.componenteId, cantDe(l)])
    })
    const sucio = () => sello.value !== '' && foto() !== sello.value

    const intentarCerrar = () => {
      if (guardando.value) return
      if (sucio()) return (confirmarSalida.value = true)
      emit('cerrar')
    }

    const alTeclado = (e) => {
      if (e.key !== 'Escape') return
      if (confirmarSalida.value) confirmarSalida.value = false
      else intentarCerrar()
    }

    /* ---------------- Guardar ---------------- */

    const guardar = async () => {
      /* Se revisan todos los pasos, no solo el actual: editando se puede
         llegar al botón sin haber pasado por el que falta. */
      for (let i = 0; i < pasos.value.length; i++) {
        const e = errorDe(i)
        if (e) {
          paso.value = i
          error.value = e
          return
        }
      }
      error.value = ''

      const nombre = (f.nombre.trim() || nombreSugerido.value).trim()

      const datos = {
        nombre,
        categoriaId: f.categoriaId,
        precio: f.precio,
        emoji: f.emoji.trim() || '💐',
        minimo: f.minimo || 0
        /* Sin costo: un armado lo calcula desde su receta, y en este punto
           la receta todavía no existe. Lo pone sp_inv_u_receta al guardarla,
           que es el único momento en que ese número está completo. */
      }

      guardando.value = true
      try {
        const p = esNuevo.value
          ? await store.dispatch('productos/crear', {
            ...datos,
            codigo: (f.codigo.trim() || codigoSugerido.value).toUpperCase(),
            tipo: 'armado',
            stock: 0,
            controlaLotes: false
          })
          : await store.dispatch('productos/actualizar', { id: f.id, ...datos })

        await productosService.guardarReceta(p.id, {
          lineas: receta.value.map(l => ({
            componenteId: l.componenteId,
            cantidad: cantDe(l)
          }))
        })

        emit('guardado', p)
      } catch (e) {
        /* El mensaje viene del RAISE: "Ya existe un producto con el código
           RAMO-12-ROSAS". Ya está redactado. Vuelve al paso del nombre, que
           es donde vive el código. */
        error.value = e.message
        if (/c[oó]digo|nombre/i.test(e.message)) {
          paso.value = pasos.value.findIndex(x => x.clave === 'identidad')
        }
      } finally {
        guardando.value = false
      }
    }

    /* ---------------- Carga ---------------- */

    onMounted(async () => {
      if (!categorias.value.length) store.dispatch('inventario/cargarCategorias')
      document.addEventListener('keydown', alTeclado)

      try {
        const [comps, rec] = await Promise.all([
          productosService.componentes(),
          f.id ? productosService.receta(f.id) : Promise.resolve([])
        ])
        componentes.value = comps

        /* La receta guardada puede no traer emoji ni precio suelto: se
           completan desde el catálogo de componentes, o el aviso de "sueltas
           valdrían" sale en cero al editar un ramo existente. */
        receta.value = rec.map(l => {
          const c = comps.find(x => x.id === l.componenteId)
          return {
            ...l,
            emoji: l.emoji ?? c?.emoji,
            componente: l.componente ?? c?.nombre,
            costoUnitario: l.costoUnitario ?? c?.costo ?? 0,
            precio: l.precio ?? c?.precio,
            precioRamo: l.precioRamo ?? c?.precioRamo
          }
        })
      } catch (e) {
        error.value = e.message
      } finally {
        cargandoComponentes.value = false
      }

      /* El sello se toma después de cargar: si se tomara antes, la receta
         que llega del servidor marcaría el formulario como editado. */
      sello.value = foto()

      await nextTick()
      /* El foco va al buscador de componentes, no al nombre: lo primero es
         armar. */
      campoBusqueda.value?.focus()
    })

    onUnmounted(() => document.removeEventListener('keydown', alTeclado))

    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    return {
      MARGENES, EMOJIS,
      esNuevo, f, error, guardando, cargandoComponentes, categorias,
      cuerpo, campoBusqueda, campoPrecio, campoNombre,
      receta, busqueda, sugerencias, costoReceta, agregar, cambiar, normalizar, cantDe,
      valorSuelto, pierdeArmando,
      pasos, paso, puedeIr, irA, siguiente, atras,
      precioPara, margen, margenMalo, margenBueno, nombreCategoria,
      nombreSugerido, codigoSugerido,
      confirmarSalida, intentarCerrar, guardar, clp
    }
  }
}
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

.fondo.z-alto { z-index: 120; }

.modal {
  width: 100%;
  max-width: 540px;
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal.angosto { max-width: 380px; }

.min0 { min-width: 0; }
.suave { color: var(--text-muted); }
.tenue { color: var(--text-faint); }

.mono {
  font-family: var(--font-mono);
  font-size: .95em;
}

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.rot {
  display: block;
  font-size: .62rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.desglose {
  font-size: .72rem;
  color: var(--text-faint);
  margin-top: 1px;
}

.modal-cab {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px 14px;
}

.modal-cab h3 {
  font-size: 1.08rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-cab p {
  font-size: .8rem;
  color: var(--text-muted);
  margin-top: 3px;
}

.modal-cab .btn-icono { margin-left: auto; }

.modal-cuerpo {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px 20px 20px;
}

.modal-pie {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}

.modal-pie .btn { flex: 1; }

/* ─── Pasos ─── */

.pasos {
  display: flex;
  gap: 4px;
  padding: 0 14px;
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
  scrollbar-width: none;
}

.pasos::-webkit-scrollbar { display: none; }

.paso {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 10px 10px 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: none;
  color: var(--text-muted);
  font: inherit;
  font-size: .82rem;
  font-weight: 600;
  cursor: pointer;
  transition: color var(--t-fast), border-color var(--t-fast);
}

.paso:disabled {
  opacity: .45;
  cursor: not-allowed;
}

.paso.on {
  color: var(--accent-text);
  border-bottom-color: var(--accent);
}

.paso:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.num {
  display: grid;
  place-items: center;
  width: 21px;
  height: 21px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: .7rem;
  font-weight: 700;
}

.paso.on .num {
  background: var(--accent);
  color: var(--accent-contrast);
}

.paso.hecho .num {
  background: var(--success-soft);
  color: var(--success);
}

/* La barra existe solo al crear: al editar no hay progreso que medir. */
.barra {
  height: 2px;
  background: var(--surface-2);
}

.barra-llena {
  height: 100%;
  background: var(--accent);
  transition: width .22s ease;
}

.paso-pista {
  font-size: .84rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 16px;
}

/* ─── Buscador de componentes ─── */

.buscador {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 46px;
  padding: 0 13px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  transition: border-color var(--t-fast);
}

.buscador:focus-within { border-color: var(--accent); }

.buscador input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  color: var(--text);
  font: inherit;
  /* 16px mínimo: bajo eso iOS hace zoom al enfocar. */
  font-size: max(.9rem, 16px);
}

.sugerencias {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 6px;
  padding: 6px;
  background: var(--surface-2);
  border-radius: var(--r-sm);
}

.sugerencia {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: none;
  border-radius: var(--r-sm);
  background: none;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--t-fast);
}

.sugerencia:hover { background: var(--surface); }

.sugerencia .emoji {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.sugerencia .min0 { flex: 1; }

.sugerencia .nombre {
  font-size: .86rem;
  font-weight: 600;
}

.mas {
  color: var(--accent-text);
  font-size: 1.1rem;
  font-weight: 700;
  flex-shrink: 0;
}

.sin-resultados {
  padding: 14px;
  margin-top: 6px;
  font-size: .8rem;
  color: var(--text-faint);
  text-align: center;
}

/* ─── La receta ─── */

.receta {
  margin-top: 14px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
}

.linea {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--border);
}

.linea:last-of-type { border-bottom: 0; }

.linea .emoji {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.linea .min0 { flex: 1; }

.linea .nombre {
  font-size: .86rem;
  font-weight: 600;
}

.cantidad {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--surface-2);
  border-radius: var(--r-full);
  padding: 2px;
  flex-shrink: 0;
}

/* Botones de 32px: se ajusta la cantidad con el pulgar, no tecleando. */
.cant-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: background-color var(--t-fast);
}

.cant-btn:hover { background: var(--surface); }

.campo-cant {
  width: 40px;
  border: 0;
  outline: 0;
  background: none;
  color: var(--text);
  font: inherit;
  font-size: max(.85rem, 16px);
  text-align: center;
}

.campo-cant::-webkit-outer-spin-button,
.campo-cant::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.campo-cant[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.subtotal {
  font-size: .85rem;
  min-width: 60px;
  text-align: right;
  flex-shrink: 0;
}

.costo-total {
  padding: 12px;
  background: var(--surface-2);
  border-top: 1px solid var(--border-strong);
  font-size: .84rem;
  color: var(--text-muted);
}

.linea-costo {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.linea-costo + .linea-costo { margin-top: 5px; }

.costo-total .dato {
  font-size: 1.15rem;
  color: var(--text);
}

.linea-costo.suave {
  font-size: .78rem;
  color: var(--text-faint);
}

.linea-costo.suave .dato {
  font-size: .85rem;
  color: var(--text-faint);
}

.vacio {
  padding: 22px 16px;
  margin-top: 14px;
  background: var(--surface-2);
  border-radius: var(--r-sm);
  font-size: .82rem;
  line-height: 1.55;
  color: var(--text-muted);
  text-align: center;
}

/* ─── Precio ─── */

/* El costo se repite en este paso: es el dato que gobierna la decisión y
   volver atrás a mirarlo sería un paso de más. */
.costo-recordatorio {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  padding: 12px 14px;
  margin-bottom: 16px;
  background: var(--surface-2);
  border-radius: var(--r-sm);
}

.costo-recordatorio .dato { font-size: 1.05rem; }

.monto {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 46px;
  padding: 0 13px;
  background: var(--surface);
  border: 1.5px solid var(--border-strong);
  border-radius: var(--r-sm);
  transition: border-color var(--t-fast);
}

.monto:focus-within { border-color: var(--accent); }
.monto.malo { border-color: var(--warn); }
.monto.bueno { border-color: var(--success); }
.monto.grande { min-height: 58px; }

.signo {
  color: var(--text-faint);
  font-size: 1.2rem;
  font-weight: 700;
}

.campo-monto {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  color: var(--text);
  font: inherit;
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.campo-monto::-webkit-outer-spin-button,
.campo-monto::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.campo-monto[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* Los tres márgenes van antes del campo: se elige uno y el precio queda
   escrito, en vez de tantear un número y después mirar si sirve. */
.sugeridos {
  display: flex;
  gap: 7px;
  margin-bottom: 16px;
}

.sugerido {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-height: 52px;
  padding: 8px 6px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  font-size: .78rem;
  font-weight: 700;
  cursor: pointer;
  transition: border-color var(--t-fast), background-color var(--t-fast);
}

.sugerido span {
  font-size: .72rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-faint);
}

.sugerido:hover { border-color: var(--border-strong); }

.sugerido.on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent-text);
}

.sugerido.on span { color: var(--accent-text); }

.margen-real {
  display: flex;
  gap: 22px;
  flex-wrap: wrap;
  margin-top: 14px;
  padding: 11px 14px;
  border-radius: var(--r-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.margen-real .dato { font-size: 1.05rem; }

.margen-real.malo {
  background: var(--warn-soft);
  border-color: var(--warn-border, var(--warn));
  color: var(--warn);
}

.margen-real.bueno {
  background: var(--success-soft);
  border-color: var(--success);
  color: var(--success);
}

.margen-real.malo .rot,
.margen-real.malo .dato,
.margen-real.bueno .rot,
.margen-real.bueno .dato {
  color: inherit;
}

.margen-real .aviso {
  flex: 1 1 100%;
  font-size: .76rem;
  line-height: 1.5;
  opacity: .9;
}

/* No es un error: un ramo se vende más rápido que doce varas sueltas, y
   eso puede justificar la diferencia. Pero decidirlo sin saberlo, no. */
.aviso-suelto {
  padding: 11px 13px;
  margin-top: 14px;
  background: var(--info-soft);
  border-left: 3px solid var(--info);
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
  font-size: .78rem;
  line-height: 1.55;
  color: var(--text);
}

/* ─── Campos ─── */

.grupo { margin-bottom: 18px; }
.grupo:last-child { margin-bottom: 0; }

label {
  display: block;
  font-size: .8rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.campo {
  width: 100%;
  min-height: 46px;
  padding: .6rem .75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: max(.9rem, 16px);
  transition: border-color var(--t-fast);
}

.campo:focus { outline: 0; border-color: var(--accent); }
.campo.corto { max-width: 160px; }

.campo[type=number]::-webkit-outer-spin-button,
.campo[type=number]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.campo[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.emoji-fila {
  display: flex;
  align-items: center;
  gap: 10px;
}

.campo.emoji {
  flex: 0 0 auto;
  width: 62px;
  text-align: center;
  font-size: 1.4rem;
}

.emoji-sugeridos {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 5px;
  min-width: 0;
}

.emoji-op {
  width: 38px;
  height: 38px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
  transition: border-color var(--t-fast), background-color var(--t-fast);
}

.emoji-op:hover { border-color: var(--border-strong); }

.emoji-op.on {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.ayuda-campo {
  font-size: .75rem;
  color: var(--text-faint);
  line-height: 1.5;
  margin-top: 5px;
}

.enlace {
  display: inline-block;
  margin-top: 6px;
  border: none;
  background: none;
  padding: 0;
  color: var(--accent-text);
  font: inherit;
  font-size: .78rem;
  text-decoration: underline;
  cursor: pointer;
}

/* ─── Revisión ─── */

.resumen-cab {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  margin-bottom: 16px;
  background: var(--surface-2);
  border-radius: var(--r-sm);
}

.resumen-emoji {
  font-size: 1.9rem;
  line-height: 1;
  flex-shrink: 0;
}

.resumen-cab b {
  display: block;
  font-size: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resumen-cab .mono {
  font-size: .76rem;
  color: var(--text-faint);
}

.sub-titulo {
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-faint);
  margin-bottom: 8px;
}

.resumen-receta {
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
  margin-bottom: 16px;
}

.resumen-linea {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  font-size: .85rem;
}

.resumen-linea:last-child { border-bottom: 0; }

.resumen-linea .emoji {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.resumen-linea .nombre {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resumen {
  margin: 0;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
}

.resumen > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 13px;
  border-bottom: 1px solid var(--border);
  font-size: .86rem;
}

.resumen > div:last-child { border-bottom: 0; }

.resumen dt {
  color: var(--text-muted);
  flex-shrink: 0;
}

.resumen dd {
  margin: 0;
  text-align: right;
  min-width: 0;
}

.chip {
  display: inline-block;
  padding: 2px 9px;
  border-radius: var(--r-full);
  font-size: .74rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.chip-ok {
  background: var(--success-soft);
  color: var(--success);
}

.chip-malo {
  background: var(--warn-soft);
  color: var(--warn);
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
.btn:disabled { opacity: .5; cursor: not-allowed; }

.btn.peligro { background: var(--danger); }

.btn-linea {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.btn-linea:hover:not(:disabled) {
  background: var(--surface);
  color: var(--text);
}

.btn-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  cursor: pointer;
  transition: border-color var(--t-fast), color var(--t-fast);
}

.btn-icono:hover {
  border-color: var(--danger);
  color: var(--danger);
}

/* Cerrar o limpiar no son destructivos: no deben teñirse de rojo al pasar */
.btn-icono.neutro:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.modal-cab .btn-icono:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.btn-icono.chico {
  width: 26px;
  height: 26px;
  font-size: .78rem;
}

.error {
  padding: 11px 13px;
  margin-bottom: 16px;
  border-radius: var(--r-sm);
  border-left: 4px solid var(--danger);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: .85rem;
  line-height: 1.5;
}

/* ─── Móvil ─── */

@media (max-width: 640px) {

  /* A pantalla completa desde abajo: con la receta creciendo, un diálogo
     flotante desperdicia el alto que el formulario necesita. */
  .fondo {
    padding: 0;
    align-items: flex-end;
  }

  .modal {
    max-width: none;
    max-height: 100dvh;
    height: 100dvh;
    border: none;
    border-radius: 0;
  }

  .modal.angosto {
    height: auto;
    max-height: 90dvh;
    border-radius: var(--r-lg) var(--r-lg) 0 0;
  }

  .modal-cab { padding: 16px 18px 12px; }
  .modal-cuerpo { padding: 14px 18px 20px; }

  .modal-pie {
    padding: 14px 18px calc(14px + env(safe-area-inset-bottom, 0));
  }

  /* Solo el paso activo muestra su nombre: cuatro rótulos no entran en
     360px sin encogerse hasta dejar de leerse. */
  .pasos { padding: 0 12px; }

  .paso { padding: 10px 6px 12px; }

  .paso .rot-paso { display: none; }

  .paso.on .rot-paso { display: inline; }

  /* La línea se aprieta: nombre arriba, controles abajo. */
  .linea {
    flex-wrap: wrap;
    row-gap: 6px;
  }

  .linea .min0 { flex: 1 1 calc(100% - 34px); }

  .linea .subtotal {
    flex: 1;
    text-align: left;
  }

  .sugeridos { flex-wrap: wrap; }

  .sugerido { flex: 1 1 calc(33% - 5px); }

  .emoji-fila {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .campo.emoji { width: 100%; }

  .emoji-op {
    flex: 1;
    min-width: 40px;
    height: 44px;
  }

  .campo.corto { max-width: none; }
}

@media (prefers-reduced-motion: reduce) {
  .barra-llena,
  .campo,
  .monto,
  .btn,
  .sugerido,
  .emoji-op,
  .cant-btn { transition: none; }
}
</style>