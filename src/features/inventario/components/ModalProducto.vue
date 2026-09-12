<template>
  <div class="fondo" @click.self="intentarCerrar">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-prod">

      <div class="modal-cab">
        <div class="min0">
          <h3 id="titulo-prod">{{ esNuevo ? 'Nuevo producto' : f.nombre || 'Editar producto' }}</h3>
          <p v-if="esNuevo">
            Una flor, un insumo o un accesorio. Para armar un ramo hay otro
            formulario.
          </p>
          <p v-else class="mono">{{ f.codigo }}</p>
        </div>
        <button class="btn-icono" @click="intentarCerrar" aria-label="Cerrar">✕</button>
      </div>

      <!-- ═══ Pasos ═══ -->
      <!-- Al crear son pasos con validación; al editar son pestañas: quien
           entra a corregir el precio no debería recorrer un asistente. -->
      <nav class="pasos" :aria-label="esNuevo ? 'Pasos' : 'Secciones'">
        <button v-for="(p, i) in pasos" :key="p.clave" class="paso"
          :class="{ on: i === paso, hecho: esNuevo && i < paso }" :disabled="!puedeIr(i)"
          :aria-current="i === paso ? 'step' : undefined" @click="irA(i)">
          <span class="num" aria-hidden="true">{{ esNuevo && i < paso ? '✓' : i + 1 }}</span>
          <span class="rot">{{ p.titulo }}</span>
        </button>
      </nav>

      <div v-if="esNuevo" class="barra" aria-hidden="true">
        <div class="barra-llena" :style="{ width: `${((paso + 1) / pasos.length) * 100}%` }"></div>
      </div>

      <div class="modal-cuerpo" ref="cuerpo">
        <div v-if="error" class="error">{{ error }}</div>

        <p class="paso-pista">{{ pasos[paso].pista }}</p>

        <!-- ═══════════ 1 · Identidad ═══════════ -->
        <template v-if="pasos[paso].clave === 'identidad'">
          <div class="grupo">
            <label for="p-nombre">Nombre</label>
            <input id="p-nombre" ref="campoNombre" class="campo" v-model="f.nombre" maxlength="120"
              placeholder="Rosa roja (tallo)">
          </div>

          <div v-if="esNuevo" class="grupo">
            <label for="p-codigo">Código</label>
            <input id="p-codigo" class="campo mono" v-model="f.codigo" maxlength="40"
              :placeholder="codigoSugerido">
            <button v-if="codigoSugerido && f.codigo !== codigoSugerido" class="enlace"
              @click="f.codigo = codigoSugerido">
              Usar «{{ codigoSugerido }}»
            </button>
            <p v-else class="ayuda-campo">Es lo que se escanea o se teclea en el mesón.</p>
          </div>

          <div class="grupo">
            <label for="p-emoji">Emoji</label>
            <!-- Un emoji en vez de una foto: se ve en la grilla del POS, en
                 el ticket y en el teléfono, sin subir nada ni esperar que
                 cargue. Los sugeridos evitan tener que abrir el teclado de
                 emojis, que en escritorio es un trámite. -->
            <div class="emoji-fila">
              <input id="p-emoji" class="campo emoji" v-model="f.emoji" maxlength="4" placeholder="🌹">
              <div class="emoji-sugeridos">
                <button v-for="e in EMOJIS" :key="e" class="emoji-op" :class="{ on: f.emoji === e }"
                  :aria-label="`Usar ${e}`" @click="f.emoji = e">{{ e }}</button>
              </div>
            </div>
          </div>

          <div class="grupo">
            <label for="p-cat">Categoría</label>
            <select id="p-cat" class="campo" v-model.number="f.categoriaId">
              <option :value="null">Sin categoría</option>
              <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
            </select>
          </div>
        </template>

        <!-- ═══════════ 2 · Precios ═══════════ -->
        <template v-else-if="pasos[paso].clave === 'precios'">
          <div class="grupo">
            <label for="p-costo">Costo</label>
            <div class="monto">
              <span class="signo">$</span>
              <input id="p-costo" class="campo-monto" type="number" min="0" inputmode="numeric"
                v-model.number="f.costo">
            </div>
            <p class="ayuda-campo">
              Lo que cuesta comprarlo. Con lotes, cada compra trae el suyo y
              este queda como referencia.
            </p>
          </div>

          <!-- Los tres márgenes habituales, sobre el costo que se acaba de
               escribir. Es más rápido que tantear el precio. -->
          <div v-if="f.costo > 0" class="sugeridos">
            <button v-for="m in MARGENES" :key="m" class="sugerido" :class="{ on: f.precio === precioPara(m) }"
              @click="f.precio = precioPara(m)">
              {{ m }}%
              <span>{{ clp(precioPara(m)) }}</span>
            </button>
          </div>

          <div class="grupo">
            <label for="p-precio">Precio de venta</label>
            <div class="monto" :class="{ malo: margenMalo, bueno: margenBueno }">
              <span class="signo">$</span>
              <input id="p-precio" class="campo-monto" type="number" min="0" inputmode="numeric"
                v-model.number="f.precio">
            </div>
            <!-- El margen a la vista mientras se escribe: es la diferencia
                 entre poner un precio y decidirlo. -->
            <p class="ayuda-campo" :class="{ mala: margenMalo }">
              <template v-if="f.precio > 0 && f.costo > 0">
                Margen {{ margen }}% · deja {{ clp(f.precio - f.costo) }}
                <template v-if="margenMalo"> · queda poco</template>
              </template>
              <template v-else>Escribe el costo y acá aparece el margen.</template>
            </p>
          </div>

          <!-- La mayoría de los productos no usa precios alternativos, y
               tenerlos siempre a la vista alarga el paso para nada. -->
          <button class="desplegable" :aria-expanded="verAlternativos"
            @click="verAlternativos = !verAlternativos">
            <span>Precios alternativos</span>
            <span v-if="nAlternativos" class="globo">{{ nAlternativos }}</span>
            <span class="flecha" :class="{ girada: verAlternativos }" aria-hidden="true">›</span>
          </button>

          <div v-if="verAlternativos" class="alternativos">
            <div class="grupo">
              <label for="p-ramo">Precio por ramo</label>
              <div class="monto">
                <span class="signo">$</span>
                <input id="p-ramo" class="campo-monto" type="number" min="0" inputmode="numeric"
                  v-model.number="f.precioRamo" placeholder="—">
              </div>
              <p class="ayuda-campo">
                Lo que vale cada vara al llevar varias. También decide si
                conviene armar un ramo o venderlas sueltas.
              </p>
            </div>

            <div class="grupo">
              <label for="p-liq">Precio de liquidación</label>
              <div class="monto">
                <span class="signo">$</span>
                <input id="p-liq" class="campo-monto" type="number" min="0" inputmode="numeric"
                  v-model.number="f.precioLiquidacion" placeholder="—">
              </div>
              <p class="ayuda-campo">
                Para sacar lo que está por vencer antes de tener que botarlo.
              </p>
            </div>
          </div>
        </template>

        <!-- ═══════════ 3 · Inventario ═══════════ -->
        <template v-else-if="pasos[paso].clave === 'inventario'">
          <div v-if="esNuevo" class="grupo">
            <label for="p-stock">Stock inicial</label>
            <input id="p-stock" class="campo dato corto" type="number" min="0" inputmode="numeric"
              v-model.number="f.stock">
            <p class="ayuda-campo">Lo que ya hay. Después entra por compras.</p>
          </div>

          <div class="grupo">
            <label for="p-minimo">Mínimo</label>
            <input id="p-minimo" class="campo dato corto" type="number" min="0" inputmode="numeric"
              v-model.number="f.minimo">
            <p class="ayuda-campo">Bajo esto avisa que hay que comprar.</p>
          </div>

          <!-- Los lotes solo se deciden al crear: activarlo después dejaría el
               stock existente sin lote de origen, y quitarlo dejaría huérfanos
               los que ya hay. Por eso el SP de actualizar ni siquiera recibe
               este campo. -->
          <template v-if="esNuevo">
            <label class="check" :class="{ on: f.controlaLotes }">
              <input type="checkbox" v-model="f.controlaLotes">
              <div>
                <span>Se maneja por lotes</span>
                <span class="ayuda-campo">
                  Para flor fresca: cada compra entra como un balde con su costo
                  y su vencimiento. Permite saber de qué balde salió cada vara,
                  vender por antigüedad y devolverlas al anular una boleta.
                </span>
              </div>
            </label>

            <div class="nota">
              Esto no se puede cambiar después. Si es flor fresca, actívalo ahora.
            </div>

            <div v-if="f.controlaLotes" class="grupo indentado">
              <label for="p-vida">Días que dura</label>
              <input id="p-vida" class="campo dato corto" type="number" min="1" max="365"
                inputmode="numeric" v-model.number="f.diasVida">
              <p class="ayuda-campo">
                Desde que llega hasta que ya no se puede vender. Con esto se
                calcula el vencimiento de cada lote.
              </p>
            </div>
          </template>

          <!-- En edición los días sí se ajustan: es una estimación que se
               corrige con la experiencia. -->
          <div v-else-if="f.controlaLotes" class="grupo">
            <label for="p-vida2">Días que dura</label>
            <input id="p-vida2" class="campo dato corto" type="number" min="1" max="365"
              inputmode="numeric" v-model.number="f.diasVida">
            <p class="ayuda-campo">
              Solo afecta a los lotes nuevos: los que ya existen conservan su
              vencimiento.
            </p>
          </div>

          <p v-else class="ayuda-campo">
            Este producto no se maneja por lotes, así que no tiene vencimiento.
          </p>
        </template>

        <!-- ═══════════ 4 · Revisar ═══════════ -->
        <!-- En un asistente se pierde de vista el conjunto: esta pantalla lo
             devuelve antes de escribir nada en la base. -->
        <template v-else>
          <div class="resumen-cab">
            <span class="resumen-emoji" aria-hidden="true">{{ f.emoji || '📦' }}</span>
            <div class="min0">
              <b>{{ f.nombre }}</b>
              <span class="mono">{{ (f.codigo || codigoSugerido).toUpperCase() }}</span>
            </div>
          </div>

          <dl class="resumen">
            <div>
              <dt>Categoría</dt>
              <dd>{{ nombreCategoria || 'Sin categoría' }}</dd>
            </div>
            <div>
              <dt>Costo</dt>
              <dd>
                <span v-if="f.costo" class="dato">{{ clp(f.costo) }}</span>
                <span v-else class="tenue">sin costo</span>
              </dd>
            </div>
            <div>
              <dt>Precio</dt>
              <dd><b class="dato">{{ clp(f.precio) }}</b></dd>
            </div>
            <div v-if="f.costo > 0">
              <dt>Margen</dt>
              <dd>
                <span class="chip" :class="margenMalo ? 'chip-malo' : 'chip-ok'">{{ margen }}%</span>
              </dd>
            </div>
            <div v-if="f.precioRamo">
              <dt>Precio ramo</dt>
              <dd class="dato">{{ clp(f.precioRamo) }}</dd>
            </div>
            <div v-if="f.precioLiquidacion">
              <dt>Liquidación</dt>
              <dd class="dato">{{ clp(f.precioLiquidacion) }}</dd>
            </div>
            <div>
              <dt>Stock inicial</dt>
              <dd class="dato">{{ f.stock || 0 }}</dd>
            </div>
            <div>
              <dt>Mínimo</dt>
              <dd class="dato">{{ f.minimo || 0 }}</dd>
            </div>
            <div>
              <dt>Lotes</dt>
              <dd>
                <template v-if="f.controlaLotes">Sí · dura {{ f.diasVida }} día(s)</template>
                <span v-else class="tenue">No</span>
              </dd>
            </div>
          </dl>

          <div v-if="margenMalo" class="nota alerta">
            Con {{ margen }}% de margen queda poco: en una florería la merma se
            come esa diferencia antes de fin de mes.
          </div>
        </template>
      </div>

      <!-- ═══ Pie ═══ -->
      <div class="modal-pie">
        <template v-if="esNuevo">
          <button v-if="paso > 0" class="btn btn-linea" :disabled="guardando" @click="atras">Atrás</button>
          <button v-else class="btn btn-linea" :disabled="guardando" @click="intentarCerrar">Cancelar</button>

          <button v-if="paso < pasos.length - 1" class="btn" @click="siguiente">Siguiente</button>
          <button v-else class="btn" :disabled="guardando" @click="guardar">
            {{ guardando ? 'Creando…' : 'Crear producto' }}
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
            <h3>¿Descartar el producto?</h3>
            <p>Lo que escribiste se va a perder.</p>
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

/* Los tres márgenes habituales en el rubro. El de abajo es el mínimo
   defendible; el de arriba, lo que se cobra cuando hay poca competencia. */
const MARGENES = [50, 60, 70]

/* Atajos para no abrir el teclado de emojis, que en escritorio es un trámite */
const EMOJIS = ['🌹', '🌷', '🌻', '💐', '🌸', '🪴', '🎀', '💌']

export default {
  name: 'ModalProducto',
  props: {
    /* null = nuevo. Con producto = edición.
       Solo maneja productos SIMPLES: los armados tienen su propio flujo en
       ModalRamo, donde la receta va antes que el precio. */
    producto: { type: Object, default: null }
  },
  emits: ['cerrar', 'guardado'],

  setup (props, { emit }) {
    const store = useStore()

    const esNuevo = computed(() => !props.producto?.id)
    const error = ref('')
    const guardando = ref(false)
    const campoNombre = ref(null)
    const cuerpo = ref(null)
    const verAlternativos = ref(false)
    const confirmarSalida = ref(false)

    const categorias = computed(() => store.getters['inventario/categorias'])

    const f = reactive({
      id: props.producto?.id ?? null,
      codigo: props.producto?.codigo ?? '',
      nombre: props.producto?.nombre ?? '',
      emoji: props.producto?.emoji ?? '',
      categoriaId: props.producto?.categoriaId ?? null,
      costo: props.producto?.costo ?? 0,
      precio: props.producto?.precio ?? 0,
      precioRamo: props.producto?.precioRamo ?? null,
      precioLiquidacion: props.producto?.precioLiquidacion ?? null,
      stock: 0,
      minimo: props.producto?.minimo ?? 0,
      controlaLotes: props.producto?.controlaLotes ?? false,
      diasVida: props.producto?.diasVida ?? null
    })

    /* Si el producto ya tiene alguno, el bloque arranca abierto: esconder un
       dato que existe hace que parezca que se perdió. */
    if (f.precioRamo || f.precioLiquidacion) verAlternativos.value = true

    const sello = JSON.stringify(f)
    const sucio = () => JSON.stringify(f) !== sello

    /* ---------------- Pasos ---------------- */
    /* Al crear son cuatro; al editar, tres pestañas: no hay código que
       inventar, ni stock inicial, ni nada que revisar antes de escribir. */
    const pasos = computed(() => {
      const base = [
        {
          clave: 'identidad',
          titulo: 'Qué es',
          pista: 'Cómo se llama y cómo se encuentra en el mesón.'
        },
        {
          clave: 'precios',
          titulo: 'Precios',
          pista: 'Cuánto cuesta comprarlo y en cuánto se vende.'
        },
        {
          clave: 'inventario',
          titulo: 'Inventario',
          pista: esNuevo.value
            ? 'Cuánto hay, cuándo avisar y si se maneja por lotes.'
            : 'Cuándo avisar que hay que comprar.'
        }
      ]
      if (esNuevo.value) {
        base.push({
          clave: 'revisar',
          titulo: 'Revisar',
          pista: 'Así queda el producto. Revisa antes de crearlo.'
        })
      }
      return base
    })

    const paso = ref(0)

    /* La validación vive por paso para que el asistente pueda frenar en el
       que corresponde en vez de mostrar un error suelto al final. */
    const errorDe = (i) => {
      const clave = pasos.value[i]?.clave
      if (clave === 'identidad') {
        if (f.nombre.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres.'
        if (esNuevo.value && !(f.codigo.trim() || codigoSugerido.value)) {
          return 'El código es obligatorio: es lo que se escanea en el mesón.'
        }
      }
      if (clave === 'precios') {
        if (!f.precio || f.precio < 1) return 'Indica el precio de venta.'
      }
      if (clave === 'inventario') {
        if (esNuevo.value && f.controlaLotes && !f.diasVida) {
          return 'Indica cuántos días dura, para calcular el vencimiento de los lotes.'
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
       nuevo arranca por la mitad. */
    watch(paso, () => {
      if (cuerpo.value) cuerpo.value.scrollTop = 0
    })

    /* ---------------- Precio ---------------- */

    /* El precio para un margen dado, redondeado a la centena de arriba menos
       diez: $2.490 se lee mejor que $2.437, y nadie cobra ese número. */
    const precioPara = (margenPct) => {
      if (!f.costo) return 0
      const bruto = f.costo / (1 - margenPct / 100)
      return Math.ceil(bruto / 100) * 100 - 10
    }

    const margen = computed(() => {
      if (!f.precio || !f.costo) return 0
      return Math.round((f.precio - f.costo) / f.precio * 100)
    })

    /* Bajo 25% en una florería es poco: la merma se come esa diferencia
       antes de fin de mes. */
    const margenMalo = computed(() => f.precio > 0 && f.costo > 0 && margen.value < 25)
    const margenBueno = computed(() => f.precio > 0 && f.costo > 0 && margen.value >= 55)

    const nAlternativos = computed(() =>
      (f.precioRamo ? 1 : 0) + (f.precioLiquidacion ? 1 : 0)
    )

    const nombreCategoria = computed(() =>
      categorias.value.find(c => c.id === f.categoriaId)?.nombre || ''
    )

    /* ---------------- Código ---------------- */

    /* Se propone desde el nombre: "Rosa roja (tallo)" → ROSA-ROJA-TALLO.
       Escribirlo a mano invita a inventarlo distinto cada vez, y el código
       es lo que se busca en el mesón. */
    const codigoSugerido = computed(() => {
      if (!f.nombre.trim()) return ''
      return f.nombre
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30)
    })

    /* ---------------- Cerrar ---------------- */
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
         llegar al botón sin haber pasado por el paso que falta. */
      for (let i = 0; i < pasos.value.length; i++) {
        const e = errorDe(i)
        if (e) {
          paso.value = i
          error.value = e
          return
        }
      }
      error.value = ''

      const datos = {
        nombre: f.nombre.trim(),
        categoriaId: f.categoriaId,
        precio: f.precio,
        precioRamo: f.precioRamo || null,
        precioLiquidacion: f.precioLiquidacion || null,
        emoji: f.emoji.trim() || null,
        minimo: f.minimo || 0,
        costo: f.costo || 0,
        diasVida: f.diasVida || null
      }

      guardando.value = true
      try {
        const p = esNuevo.value
          ? await store.dispatch('productos/crear', {
            ...datos,
            codigo: (f.codigo.trim() || codigoSugerido.value).toUpperCase(),
            /* Siempre simple: los armados van por ModalRamo. */
            tipo: 'simple',
            stock: f.stock || 0,
            controlaLotes: f.controlaLotes
          })
          : await store.dispatch('productos/actualizar', { id: f.id, ...datos })

        emit('guardado', p)
      } catch (e) {
        /* El mensaje viene del RAISE: "Ya existe un producto con el código
           ROSA-ROJA". Ya está redactado. Vuelve al paso de la identidad,
           que es donde vive el código. */
        error.value = e.message
        if (esNuevo.value && /c[oó]digo/i.test(e.message)) paso.value = 0
      } finally {
        guardando.value = false
      }
    }

    onMounted(async () => {
      if (!categorias.value.length) store.dispatch('inventario/cargarCategorias')
      document.addEventListener('keydown', alTeclado)
      await nextTick()
      campoNombre.value?.focus()
    })

    onUnmounted(() => document.removeEventListener('keydown', alTeclado))

    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    return {
      MARGENES, EMOJIS,
      esNuevo, f, error, guardando, campoNombre, cuerpo, categorias, verAlternativos,
      pasos, paso, puedeIr, irA, siguiente, atras,
      precioPara, margen, margenMalo, margenBueno, nAlternativos, nombreCategoria,
      codigoSugerido, confirmarSalida, intentarCerrar,
      guardar, clp
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

.modal.angosto { max-width: 380px; }

.min0 { min-width: 0; }
.mono { font-family: var(--font-mono); font-size: .95em; }
.mala { color: var(--danger); }
.tenue { color: var(--text-faint); }

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
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
  line-height: 1.5;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  margin-bottom: 18px;
}

/* ─── Campos ─── */

.grupo { margin-bottom: 18px; }
.grupo:last-child { margin-bottom: 0; }
.grupo.indentado { margin-left: 29px; }

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
  /* 16px mínimo: bajo eso iOS hace zoom al enfocar y descuadra el modal. */
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

.campo[type=number] { -moz-appearance: textfield; appearance: textfield; }

/* ─── Emoji ─── */

.emoji-fila {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* El emoji grande y centrado: es un carácter, no una palabra. */
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

/* ─── Montos ─── */

/* El signo pegado al campo: deja claro que es plata sin gastar una
   etiqueta. */
.monto {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 46px;
  padding: 0 12px;
  border: 1.5px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  transition: border-color var(--t-fast);
}

.monto:focus-within { border-color: var(--accent); }
.monto.malo { border-color: var(--warn); }
.monto.bueno { border-color: var(--success); }

.signo {
  color: var(--text-faint);
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
  font-size: max(.98rem, 16px);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.campo-monto::-webkit-outer-spin-button,
.campo-monto::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.campo-monto[type=number] { -moz-appearance: textfield; appearance: textfield; }

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

/* ─── Márgenes sugeridos ─── */
/* Van antes del precio: se elige uno y el campo queda escrito, en vez de
   tantear un número y después mirar si el margen sirve. */

.sugeridos {
  display: flex;
  gap: 7px;
  margin-bottom: 18px;
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

/* ─── Desplegable ─── */

.desplegable {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 46px;
  padding: 11px 13px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface-2);
  color: var(--text-muted);
  font: inherit;
  font-size: .84rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color var(--t-fast);
}

.desplegable:hover { border-color: var(--border-strong); }

.desplegable > span:first-child { flex: 1; text-align: left; }

/* Cuántos hay cargados: si el bloque está cerrado, tiene que poder verse
   que adentro hay algo. */
.globo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  border-radius: var(--r-full);
  background: var(--accent);
  color: var(--accent-contrast);
  font-size: .7rem;
  font-weight: 700;
}

.flecha {
  color: var(--text-faint);
  font-size: 1.1rem;
  transition: transform var(--t-fast);
}

.flecha.girada { transform: rotate(90deg); }

.alternativos {
  padding: 16px 14px;
  margin-top: 8px;
  background: var(--surface-2);
  border-radius: var(--r-sm);
}

/* ─── Check con explicación ─── */

.check {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 13px;
  margin-bottom: 12px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  cursor: pointer;
  transition: border-color var(--t-fast), background-color var(--t-fast);
}

.check.on {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.check input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  flex-shrink: 0;
  accent-color: var(--accent);
  cursor: pointer;
}

.check > div { display: flex; flex-direction: column; }

.check span:first-child {
  font-size: .88rem;
  font-weight: 600;
  color: var(--text);
}

.check .ayuda-campo { margin-top: 3px; }

/* ─── Revisión ─── */

.resumen-cab {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  margin-bottom: 14px;
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

/* ─── Notas y errores ─── */

.nota {
  padding: 11px 13px;
  margin-bottom: 16px;
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
  border-left: 3px solid var(--border-strong);
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: .8rem;
  line-height: 1.55;
}

.nota.alerta {
  margin-top: 14px;
  margin-bottom: 0;
  border-left-color: var(--warn);
  background: var(--warn-soft);
  color: var(--text);
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

.btn-linea:hover:not(:disabled) { background: var(--surface-2); color: var(--text); }

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

.btn-icono:hover { border-color: var(--border-strong); color: var(--text); }

/* ─── Móvil ─── */

@media (max-width: 640px) {
  /* A pantalla completa desde abajo: con un asistente, un diálogo flotante
     desperdicia el alto que los pasos necesitan. */
  .fondo { padding: 0; align-items: flex-end; }

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

  .paso .rot { display: none; }

  .paso.on .rot { display: inline; }

  /* El emoji y sus atajos se apilan: en una línea, los ocho botones
     obligarían a hacer scroll horizontal dentro del campo. */
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

  .grupo.indentado { margin-left: 0; }

  .campo.corto { max-width: none; }
}

@media (prefers-reduced-motion: reduce) {
  .barra-llena,
  .flecha,
  .campo,
  .monto,
  .btn,
  .sugerido,
  .emoji-op { transition: none; }
}
</style>