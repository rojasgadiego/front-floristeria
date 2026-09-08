<template>

  <!-- ================= SIN CAJA ================= -->
  <div v-if="!abierta" class="apertura">
    <div class="apertura-caja">
      <span class="apertura-icono" aria-hidden="true">🔒</span>
      <h2>La caja está cerrada</h2>
      <p class="apertura-bajada">Informa con cuánto efectivo partes el turno.</p>

      <div v-if="errorCaja" class="error">{{ errorCaja }}</div>

      <label for="fondo">Fondo inicial</label>
      <input id="fondo" class="campo grande dato" type="number" min="0" step="1000" inputmode="numeric"
        v-model.number="fondoInicial" @keyup.enter="abrirCaja">

      <button class="btn grande ancho" :disabled="guardandoCaja" @click="abrirCaja">
        <span v-if="guardandoCaja" class="spinner" aria-hidden="true"></span>
        {{ guardandoCaja ? 'Abriendo…' : 'Abrir caja' }}
      </button>
    </div>
  </div>

  <!-- ================= PUNTO DE VENTA ================= -->
  <template v-else>
    <div class="tablero">

      <!-- ---------- Catálogo ---------- -->
      <section class="catalogo">

        <!--
            Una sola barra: código, búsqueda, categorías y estado de caja.
            En móvil queda pegada arriba, porque al recorrer una grilla larga
            el escáner tiene que seguir a mano.
          -->
        <div class="barra">

          <!--
              Entrada del código: sirve para el lector de barras —que teclea y
              manda Enter—, para la cámara y para tipear el código del lote
              cuando la etiqueta está borrosa. Va marcada y va primera: es por
              donde entra el trabajo real del mesón.
            -->
          <div class="buscador buscador--codigo barra__codigo" :class="estadoCodigo">
            <span aria-hidden="true">🏷️</span>
            <input ref="campoCodigo" v-model="codigo" placeholder="Escanea el balde o el código…"
              aria-label="Código de partida o producto" autocomplete="off" spellcheck="false"
              @keyup.enter="buscarPorCodigo">
            <span v-if="buscandoCodigo" class="spinner oscuro" aria-hidden="true"></span>
            <button v-else-if="codigo" class="btn-icono chico" @click="buscarPorCodigo" aria-label="Buscar código">
              ⏎
            </button>

            <!--
                La cámara es el mismo trabajo por otro medio, así que vive
                dentro del campo de código y no como botón suelto en la barra.
                Queda siempre en el mismo punto —a la derecha del todo— para
                que se toque sin mirar.
              -->
            <button v-if="puedeEscanear" class="btn-icono chico camara" @click="abrirEscaner"
              aria-label="Escanear con la cámara" title="Escanear con la cámara (F2)">
              📷
            </button>
          </div>

          <div class="buscador barra__buscar">
            <span aria-hidden="true">🔎</span>
            <input v-model="busqueda" placeholder="Buscar producto…" aria-label="Buscar producto"
              autocomplete="off">
            <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
          </div>

          <div class="categorias" role="group" aria-label="Categorías">
            <button class="pastilla" :class="{ on: categoriaId === null }" @click="categoriaId = null">Todo</button>
            <button v-for="c in categorias" :key="c.id" class="pastilla" :class="{ on: categoriaId === c.id }"
              @click="categoriaId = c.id">
              {{ c.nombre }}
            </button>
          </div>

          <!--
              El estado del turno vive acá y no en un banner propio: ocupaba
              una línea entera para decir algo que se lee de un vistazo.
            -->
          <div class="caja-chip barra__caja" :title="detalleCaja">
            <span class="punto" aria-hidden="true"></span>
            <span class="caja-chip__txt">
              <b class="dato">{{ clp(caja.totalVendido) }}</b>
              <span>{{ caja.boletas }} boleta(s) · desde {{ hora(caja.abiertaEn) }}</span>
            </span>
            <button class="btn btn-linea btn-mini caja-chip__btn" @click="abrirCierre" aria-label="Cerrar caja">
              <span class="txt-ancho">Cerrar caja</span>
              <span class="txt-angosto" aria-hidden="true">🔒</span>
            </button>
          </div>
        </div>

        <div v-if="!visibles.length" class="vacio">
          {{ busqueda || categoriaId ? 'Ningún producto coincide.' : 'Sin productos en el mesón.' }}
          <button v-if="busqueda || categoriaId" class="enlace-boton" @click="limpiarFiltros">
            Ver todo
          </button>
        </div>

        <div v-else class="grilla">
          <button v-for="p in visibles" :key="p.id" class="producto" :class="{ agotado: p.enVenta <= 0 }"
            :disabled="p.enVenta <= 0" @click="agregar(p)">
            <span class="producto__emoji" aria-hidden="true">{{ p.emoji }}</span>
            <span class="producto__nombre">{{ p.nombre }}</span>
            <span class="producto__pie">
              <b class="dato">{{ clp(p.precio) }}</b>
              <span class="producto__stock" :class="{ poco: p.enVenta <= 3 }">{{ p.enVenta }}</span>
            </span>
          </button>
        </div>
      </section>

      <!-- Velo del carrito: solo existe en móvil, donde el carrito es una
           hoja que tapa la grilla. -->
      <div v-if="carritoAbierto" class="velo" @click="carritoAbierto = false"></div>

      <!-- ---------- Carrito ---------- -->
      <aside class="carrito" :class="{ abierto: carritoAbierto }">
        <span class="agarre" aria-hidden="true"></span>

        <header class="carrito-cab">
          <h3>Venta</h3>
          <span v-if="unidades" class="globo">{{ unidades }}</span>
          <div class="cab-acciones">
            <button v-if="hayCarrito" class="enlace-boton" @click="vaciar">Vaciar</button>
            <button class="btn-icono chico solo-movil" @click="carritoAbierto = false" aria-label="Cerrar">✕</button>
          </div>
        </header>

        <div class="carrito-cuerpo">

          <!-- Cliente -->
          <div class="cliente">
            <template v-if="cliente">
              <div class="min0">
                <b>{{ cliente.nombre }}</b>
                <div class="mini suave">
                  {{ cliente.rut }}
                  <span v-if="clubActivo"> · ⭐ {{ cliente.puntos }} puntos</span>
                </div>
              </div>
              <button class="btn-icono chico" @click="quitarCliente" aria-label="Quitar cliente">✕</button>
            </template>

            <template v-else>
              <input class="campo chico dato" v-model="rutCliente" placeholder="RUT del cliente…"
                aria-label="RUT del cliente" @keyup.enter="buscarCliente">
              <button class="btn btn-linea btn-mini" :disabled="buscandoCliente" @click="buscarCliente">
                <span v-if="buscandoCliente" class="spinner oscuro" aria-hidden="true"></span>
                Buscar
              </button>
            </template>
          </div>

          <!-- Líneas -->
          <div class="lineas">
            <p v-if="!hayCarrito" class="vacio-carrito">
              Toca un producto o escanea un balde para agregarlo.
            </p>

            <div v-for="l in carrito" :key="l.uid" class="linea" :class="{ sinStock: sinStock(l) }">
              <div class="min0">
                <b>{{ l.emoji }} {{ l.nombre }}</b>
                <div class="mini suave">
                  {{ clp(l.precio) }} c/u
                  <span v-if="l.loteCodigo"> · lote {{ l.loteCodigo }}</span>
                </div>
                <div v-if="sinStock(l)" class="mini rojo">
                  Solo hay {{ l.disponible }}
                </div>
              </div>

              <div class="cantidad">
                <button class="paso" @click="cambiar(l, l.cantidad - 1)" aria-label="Menos">−</button>
                <span class="dato">{{ l.cantidad }}</span>
                <button class="paso" @click="cambiar(l, l.cantidad + 1)" aria-label="Más">+</button>
              </div>

              <b class="subtotal dato">{{ clp(l.precio * l.cantidad) }}</b>
            </div>
          </div>

          <!-- Promoción -->
          <div v-if="promociones.length" class="promos">
            <label for="promo">Promoción</label>
            <!--
                El servidor devuelve el descuento calculado para ESTE carrito y
                las ordena por conveniencia; la primera viene elegida sola. Se
                puede cambiar, pero no hace falta pensarlo.
              -->
            <select id="promo" class="campo chico" :value="promocionId ?? ''"
              @change="elegirPromocion($event.target.value ? Number($event.target.value) : null)">
              <option value="">Sin promoción</option>
              <option v-for="p in promociones" :key="p.id" :value="p.id">
                {{ p.nombre }} — descuenta {{ clp(p.descuento) }}
              </option>
            </select>
          </div>
        </div>

        <!-- El pie no scrollea: el total y el botón de cobrar tienen que estar
             siempre bajo el pulgar. -->
        <div class="carrito-pie">
          <div class="resumen">
            <div class="fila"><span>{{ unidades }} unidad(es)</span><b class="dato">{{ clp(bruto) }}</b></div>
            <div v-if="descuentoPromo" class="fila verde">
              <span>{{ promocionElegida?.nombre }}</span>
              <b class="dato">−{{ clp(descuentoPromo) }}</b>
            </div>
            <div class="fila total">
              <span>Total</span>
              <b class="dato">{{ clp(bruto - descuentoPromo) }}</b>
            </div>
          </div>

          <button class="btn grande ancho" :disabled="!hayCarrito || haySinStock" @click="cobrando = true">
            {{ haySinStock ? 'Revisa el stock' : `Cobrar ${clp(bruto - descuentoPromo)}` }}
          </button>
        </div>
      </aside>
    </div>

    <!-- Barra flotante en móvil -->
    <button v-if="hayCarrito && !carritoAbierto && !escaneando" class="flotante" @click="carritoAbierto = true">
      <span class="globo claro">{{ unidades }}</span>
      <span class="flotante-texto">Ver venta</span>
      <b class="dato">{{ clp(bruto - descuentoPromo) }}</b>
    </button>

    <!--
        Resultado del escaneo: flota, no empuja. Como banda inline movía la
        grilla justo cuando el dedo ya iba a tocar un producto.

        Va por encima del modal de la cámara: cuando el código entra por ahí,
        el precio rebajado o la advertencia del lote es justamente lo que hay
        que leer, y el acuse interno del visor solo canta el texto crudo.
      -->
    <div v-if="avisoCodigo" class="toast-codigo" :class="{ malo: avisoCodigo.malo, sobre: escaneando }" role="status">
      <span aria-hidden="true">{{ avisoCodigo.malo ? '⚠️' : '✓' }}</span>
      <span>{{ avisoCodigo.texto }}</span>
    </div>
  </template>

  <!-- ================= MODALES ================= -->
  <ModalCobro v-if="cobrando" @cerrar="cobrando = false" @cobrada="alCobrar" />

  <TicketBoleta v-if="ticket" :ticket="ticket" @cerrar="cerrarTicket" />

  <!-- ---------- Cámara ---------- -->
  <div v-if="escaneando" class="fondo" @click.self="cerrarEscaner">
    <div class="modal modal--escaner" role="dialog" aria-modal="true" aria-labelledby="titulo-escaner">
      <span class="agarre" aria-hidden="true"></span>

      <div class="modal-cab">
        <h3 id="titulo-escaner">Escanear con la cámara</h3>
        <p>Cada código se agrega al tiro. Puedes escanear varios seguidos.</p>
      </div>

      <div class="modal-cuerpo modal-cuerpo--escaner">
        <!--
            :validar hace el trabajo completo, no solo verifica: acá el único
            que sabe si un código existe es el servidor, así que resolverlo y
            validarlo son el mismo acto. Devolver false hace que el visor
            sacuda en rojo con el código todavía a la vista, que es donde el
            operario está mirando.
          -->
        <EscanerQr ref="escaner" continuo autoiniciar :validar="resolverEscaneo"
          @detectado="leidosCamara++" @error="alFallarCamara" />
      </div>

      <div class="modal-pie modal-pie--escaner">
        <span v-if="leidosCamara" class="chip">{{ leidosCamara }} agregado(s)</span>
        <button class="btn" @click="cerrarEscaner">Listo</button>
      </div>
    </div>
  </div>

  <!-- ---------- Cierre de caja ---------- -->
  <div v-if="cierre" class="fondo" @click.self="cierre = null">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-cierre">
      <span class="agarre" aria-hidden="true"></span>

      <div class="modal-cab">
        <h3 id="titulo-cierre">{{ cierre.resumen ? 'Caja cerrada' : 'Cerrar caja' }}</h3>
        <p v-if="!cierre.resumen">Cuenta el efectivo del cajón antes de informarlo.</p>
      </div>

      <div class="modal-cuerpo">
        <div v-if="cierre.error" class="error">{{ cierre.error }}</div>

        <!-- Antes de cerrar -->
        <template v-if="!cierre.resumen">
          <!--
              El desglose NO muestra el efectivo esperado ni el fondo, y eso
              es a propósito: si el número está a la vista, escribir ese
              mismo monto es más fácil que contar, y la diferencia deja de
              significar algo.

              Lo que sí se muestra son los otros medios de pago, que se
              cuadran con la liquidación del banco y no con billetes.
            -->
          <div class="desglose">
            <div class="fila">
              <span>{{ cierre.snapshot.boletas }} boleta(s)</span>
              <b class="dato">{{ clp(cierre.snapshot.totalVendido) }}</b>
            </div>
            <div class="fila">
              <span>Débito</span><b class="dato">{{ clp(cierre.snapshot.debito) }}</b>
            </div>
            <div class="fila">
              <span>Crédito</span><b class="dato">{{ clp(cierre.snapshot.credito) }}</b>
            </div>
            <div class="fila">
              <span>Transferencia</span>
              <b class="dato">{{ clp(cierre.snapshot.transferencia) }}</b>
            </div>
            <div v-if="cierre.snapshot.anuladas" class="fila rojo">
              <span>Anuladas</span><b class="dato">{{ cierre.snapshot.anuladas }}</b>
            </div>
          </div>

          <div class="grupo">
            <label for="contado">¿Cuánto contaste en el cajón?</label>
            <input id="contado" ref="campoContado" class="campo grande dato" type="number" min="0" step="1000"
              inputmode="numeric" v-model.number="cierre.contado" @keyup.enter="cerrarCaja">
            <p class="ayuda">
              Cuenta todo lo que hay, incluido el fondo con que abriste. La
              diferencia la calcula el sistema.
            </p>
          </div>

          <div class="grupo">
            <label for="nota">Nota del cierre</label>
            <input id="nota" class="campo" v-model="cierre.nota" maxlength="600"
              placeholder="Salió plata para el flete de las peonías">
          </div>
        </template>

        <!-- Después de cerrar -->
        <template v-else>
          <div class="resultado-cierre" :class="claseDiferencia">
            <span class="rot">{{ textoDiferencia }}</span>
            <b class="val">{{ clp(Math.abs(cierre.resumen.diferencia || 0)) }}</b>
          </div>

          <div class="desglose">
            <div class="fila"><span>Esperado</span><b class="dato">{{ clp(cierre.resumen.efectivoEsperado) }}</b></div>
            <div class="fila"><span>Contado</span><b class="dato">{{ clp(cierre.resumen.efectivoContado) }}</b></div>
          </div>

          <p class="ayuda">
            Un turno con diferencia es normal; un patrón de faltantes se ve
            en el reporte de equipo.
          </p>
        </template>
      </div>

      <div class="modal-pie">
        <template v-if="!cierre.resumen">
          <button class="btn btn-linea" @click="cierre = null">Cancelar</button>
          <button class="btn" :disabled="guardandoCaja || cierre.contado == null" @click="cerrarCaja">
            <span v-if="guardandoCaja" class="spinner" aria-hidden="true"></span>
            Cerrar turno
          </button>
        </template>
        <button v-else class="btn" @click="cierre = null">Listo</button>
      </div>
    </div>
  </div>

  <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
</template>


<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick, defineAsyncComponent } from 'vue'
import { useStore } from 'vuex'
import ModalCobro from '@/features/ventas/components/Modalcobro.vue'
import TicketBoleta from '@/features/ventas/components/TicketBoleta.vue'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'

/* El escáner arrastra el worker de decodificación y no se usa en la mayoría
   de las ventas: se carga la primera vez que alguien toca la cámara, no al
   abrir el POS. */
const EscanerQr = defineAsyncComponent(() =>
  import('@/features/ventas/components/EscanerQr.vue')
)

export default {
  name: 'PosView',
  components: { ModalCobro, TicketBoleta, EscanerQr },

  setup() {
    const store = useStore()
    const { usarAviso } = useTemporizadores()
    const { aviso, avisar } = usarAviso()

    /* ---------------- Caja ---------------- */
    const caja = computed(() => store.getters['caja/caja'])
    const abierta = computed(() => store.getters['caja/abierta'])
    const guardandoCaja = computed(() => store.getters['caja/guardando'])
    const errorCaja = ref('')
    const fondoInicial = ref(0)

    /* El detalle largo del turno ya no ocupa una línea en pantalla: vive en
       el title del chip y completo en Turnos. */
    const detalleCaja = computed(() => {
      const c = caja.value
      if (!c) return ''
      return `Caja abierta por ${c.abiertaPor} desde ${hora(c.abiertaEn)}`
        + ` · ${c.boletas} boleta(s) · ${clp(c.totalVendido)} vendidos`
    })

    const abrirCaja = async () => {
      errorCaja.value = ''
      try {
        await store.dispatch('caja/abrir', fondoInicial.value)
        avisar('Caja abierta · ya puedes vender')
      } catch (e) {
        errorCaja.value = e.message
      }
    }

    const cierre = ref(null)

    /* Se congelan los datos al abrir: la persona va a contar plata mirando
       esto, y no tiene por qué moverse mientras lo hace. Además evita que el
       modal se rompa al cerrar, cuando el turno pasa a null.

       Lo esperado NO entra al snapshot: no se muestra hasta después de
       contar. */
    const abrirCierre = async () => {
      const c = caja.value
      cierre.value = {
        contado: null,
        nota: '',
        resumen: null,
        error: '',
        snapshot: {
          debito: c.debito,
          credito: c.credito,
          transferencia: c.transferencia,
          totalVendido: c.totalVendido,
          boletas: c.boletas,
          anuladas: c.anuladas
        }
      }
      await nextTick()
      campoContado.value?.focus()
    }

    const cerrarCaja = async () => {
      const c = cierre.value
      c.error = ''
      try {
        c.resumen = await store.dispatch('caja/cerrar', {
          efectivoContado: c.contado, nota: c.nota
        })
      } catch (e) {
        c.error = e.message
      }
    }

    const claseDiferencia = computed(() => {
      const d = cierre.value?.resumen?.diferencia ?? 0
      if (d === 0) return 'cuadrada'
      return d > 0 ? 'sobrante' : 'faltante'
    })

    const textoDiferencia = computed(() => {
      const d = cierre.value?.resumen?.diferencia ?? 0
      if (d === 0) return 'Cuadrada'
      return d > 0 ? 'Sobrante' : 'Faltante'
    })

    /* ---------------- Catálogo ---------------- */
    const productos = computed(() =>
      store.getters['productos/productos'].filter(p => p.activo)
    )
    const categorias = computed(() => store.getters['inventario/categorias'])
    const clubActivo = computed(() => store.getters['configuracion/clubActivo'])

    const busqueda = ref('')
    const categoriaId = ref(null)

    const visibles = computed(() => {
      const q = busqueda.value.trim().toLowerCase()
      return productos.value
        /* enVenta es lo que hay adelante. enBodega no sirve acá: el vendedor
           no puede entregar algo que está en cámara. */
        .filter(p => (p.enVenta ?? 0) > 0)
        .filter(p => {
          if (categoriaId.value && p.categoriaId !== categoriaId.value) return false
          if (!q) return true
          return p.nombre.toLowerCase().includes(q) || String(p.codigo).includes(q)
        })
    })

    const limpiarFiltros = () => {
      busqueda.value = ''
      categoriaId.value = null
    }

    /* ---------------- Código ---------------- */
    const codigo = ref('')
    const buscandoCodigo = ref(false)
    const avisoCodigo = ref(null)
    /* Destello del propio campo: el ojo ya está ahí cuando llega la
       respuesta del escaneo, así que el color va donde se está mirando. */
    const estadoCodigo = ref('')
    const campoCodigo = ref(null)

    let tmrAviso = null
    let tmrEstado = null

    const mostrarAvisoCodigo = (texto, malo = false) => {
      avisoCodigo.value = { texto, malo }
      estadoCodigo.value = malo ? 'malo' : 'ok'

      clearTimeout(tmrAviso)
      tmrAviso = setTimeout(() => { avisoCodigo.value = null }, malo ? 5000 : 3200)

      clearTimeout(tmrEstado)
      tmrEstado = setTimeout(() => { estadoCodigo.value = '' }, 1200)
    }

    const enfocarCodigo = (seleccionar = false) => {
      const el = campoCodigo.value
      if (!el) return
      el.focus()
      if (seleccionar) el.select()
    }

    /* En pantalla táctil enfocar el campo levanta el teclado y tapa media
       grilla, así que el foco automático es solo para escritorio. */
    const conMouse = () => !window.matchMedia('(hover: none)').matches

    /**
     * Resuelve un código —de PARTIDA o de producto— y lo mete al carrito.
     *
     * Se prueba primero como partida —es lo que el vendedor tiene enfrente
     * en el mesón— y si no existe, como código de producto: un jarrón o una
     * cinta tienen código de producto pero no partida.
     *
     * A diferencia de mermas, acá el escaneo NO bloquea la venta: si el
     * balde está sin etiqueta, se toca el producto en la grilla y el
     * servidor reparte por FIFO. Con un cliente enfrente, exigir el código
     * paralizaría el mesón.
     *
     * Devuelve 'ok' | 'aviso' | 'no'. No toca el foco ni limpia el campo:
     * eso depende de por dónde entró el código, y lo deciden los dos
     * envoltorios de más abajo. Es la única función que sabe de partidas, y
     * la comparten el lector de barras, el tipeo y la cámara: así un balde
     * leído con la cámara respeta el precio de su lote igual que antes.
     */
    const resolverCodigo = async (texto) => {
      try {
        /* ─── Como partida del mostrador ─── */
        let partida = null
        try {
          partida = await store.dispatch('mostrador/escanear', texto)
        } catch (e) {
          /* Un 404 significa que no es una partida: se sigue probando como
             producto. Cualquier otro error sí es un problema. */
          if (e.status !== 404) {
            mostrarAvisoCodigo(e.message, true)
            return 'no'
          }
        }

        if (partida) {
          if (!partida.vendible) {
            mostrarAvisoCodigo(partida.motivo || 'De esa partida no se puede vender.', true)
            return 'no'
          }

          store.dispatch('ventas/agregarProducto', {
            producto: {
              id: partida.productoId,
              nombre: partida.producto,
              emoji: partida.emoji,
              /* El precio viene de la PARTIDA, no del producto: un balde
                 recuperado se vende rebajado, y tomar el precio de ficha lo
                 cobraría a precio de primera. */
              precio: partida.precioUnitario,
              disponible: partida.cantidadDisponible,
              loteCodigo: partida.loteCodigo,
              rebaja: partida.rebaja
            },
            partida: partida.codigo
          })

          /* La advertencia no bloquea: avisa que hay un balde más viejo
             abierto o que este vence pronto. El vendedor decide.

             La rebaja se dice siempre que exista: es lo que evita cobrar
             flor recuperada a precio de primera sin darse cuenta. */
          if (partida.advertencia) {
            mostrarAvisoCodigo(partida.advertencia)
            return 'aviso'
          }

          if (partida.rebaja > 0) {
            mostrarAvisoCodigo(
              `${partida.producto} · ${clp(partida.precioUnitario)} · ${clp(partida.rebaja)} menos`
            )
          } else {
            mostrarAvisoCodigo(`${partida.producto} · ${partida.codigo}`)
          }
          return 'ok'
        }

        /* ─── Como código de producto ─── */
        const producto = await store.dispatch('productos/porCodigo', { codigo: texto })

        if (!producto) {
          mostrarAvisoCodigo(`No hay ninguna partida ni producto con el código ${texto}`, true)
          return 'no'
        }

        if ((producto.enVenta ?? 0) <= 0) {
          mostrarAvisoCodigo(
            `${producto.nombre} no está en el mesón. Bájalo de bodega primero.`, true
          )
          return 'no'
        }

        /* Sin partida: el servidor reparte por FIFO entre lo que hay
           adelante. Funciona, pero pierde el precio propio de un lote
           rebajado. */
        store.dispatch('ventas/agregarProducto', {
          producto: { ...producto, disponible: producto.enVenta }
        })
        mostrarAvisoCodigo(`${producto.nombre} agregado`)
        return 'ok'
      } catch (e) {
        mostrarAvisoCodigo(e.message || 'No se pudo leer el código.', true)
        return 'no'
      }
    }

    /**
     * Entrada por teclado: lector de barras o tipeo a mano.
     *
     * Todo cierra en un solo finally: antes había ramas que salían sin
     * devolver el foco al campo y el escaneo siguiente se perdía en el aire.
     */
    const buscarPorCodigo = async () => {
      const texto = codigo.value.trim()
      /* El lector manda Enter apenas termina de teclear; dos disparos
         encimados agregaban la línea dos veces. */
      if (!texto || buscandoCodigo.value) return

      buscandoCodigo.value = true
      let exito = false

      try {
        exito = (await resolverCodigo(texto)) !== 'no'
      } finally {
        buscandoCodigo.value = false
        /* Si salió bien se limpia; si falló se deja seleccionado, así el
           siguiente escaneo lo pisa y una errata se corrige sin borrar. */
        if (exito) codigo.value = ''
        await nextTick()
        enfocarCodigo(!exito)
      }
    }

    /* ---------------- Cámara ---------------- */
    const escaneando = ref(false)
    const leidosCamara = ref(0)
    const escaner = ref(null)

    /* No es reactivo a propósito: ni el navegador ni el protocolo cambian en
       medio de un turno. Sin HTTPS —o localhost— getUserMedia existe pero
       revienta al llamarlo, así que el botón directamente no se ofrece. */
    const puedeEscanear = Boolean(navigator.mediaDevices?.getUserMedia)
      && (window.isSecureContext || location.hostname === 'localhost')

    const abrirEscaner = () => {
      if (!puedeEscanear) return
      leidosCamara.value = 0
      escaneando.value = true
    }

    const cerrarEscaner = () => {
      escaneando.value = false
      /* El componente se destruye con el v-if y suelta la cámara en su
         onScopeDispose: no hay que apagarla a mano. */
      if (conMouse()) nextTick(() => enfocarCodigo())
    }

    /**
     * Lo que corre por cada lectura de la cámara.
     *
     * Va enchufado en la prop `validar` y no en `@detectado` porque acá
     * validar y cargar son el mismo acto: solo el servidor sabe si el código
     * existe. Devolver false hace que el visor sacude en rojo con el código
     * aún encuadrado, en el momento y el lugar donde el operario está
     * mirando; si esto viviera en `@detectado`, el escáner festejaría con un
     * pitido de acierto y el error aparecería en un toast que nadie ve.
     */
    const resolverEscaneo = async (texto) => {
      /* La cámara puede leer de nuevo antes de que vuelva el servidor.
         Compartimos el candado con el lector de barras: un solo código en
         vuelo, siempre. */
      if (buscandoCodigo.value) return false

      buscandoCodigo.value = true
      try {
        const resultado = await resolverCodigo(texto)

        /* Una advertencia hay que leerla. En modo continuo el acuse dura
           menos de un segundo, así que se detiene la cámara: la persona lee,
           decide, y sigue con "Seguir escaneando". */
        if (resultado === 'aviso') escaner.value?.pausar()

        return resultado !== 'no'
      } finally {
        buscandoCodigo.value = false
      }
    }

    /* La cámara puede fallar por permiso, por HTTPS o porque otra app la
       tiene tomada. El componente ya explica el problema dentro del visor y
       ofrece el campo manual; acá solo dejamos la puerta de siempre bien
       visible. */
    const alFallarCamara = () => {
      avisar('La cámara no se pudo abrir · usa el lector o teclea el código', true)
    }

    /* ---------------- Carrito ---------------- */
    const carrito = computed(() => store.getters['ventas/carrito'])
    const hayCarrito = computed(() => store.getters['ventas/hayCarrito'])
    const unidades = computed(() => store.getters['ventas/unidades'])
    const bruto = computed(() => store.getters['ventas/bruto'])
    const descuentoPromo = computed(() => store.getters['ventas/descuentoPromo'])
    const promociones = computed(() => store.getters['ventas/promocionesAplicables'])
    const promocionId = computed(() => store.getters['ventas/promocionId'])
    const promocionElegida = computed(() => store.getters['ventas/promocionElegida'])
    const cliente = computed(() => store.getters['ventas/cliente'])
    const haySinStock = computed(() => store.getters['ventas/lineasSinStock'].length > 0)

    const sinStock = (l) =>
      !l.esServicio && l.disponible != null && l.cantidad > l.disponible

    const agregar = (p) => store.dispatch('ventas/agregarProducto', { producto: p })
    const cambiar = (l, cantidad) => store.dispatch('ventas/cambiarCantidad', { uid: l.uid, cantidad })
    const vaciar = () => store.dispatch('ventas/vaciar')
    const elegirPromocion = (id) => store.dispatch('ventas/elegirPromocion', id)

    /* ---------------- Cliente ---------------- */
    const rutCliente = ref('')
    const buscandoCliente = ref(false)

    const buscarCliente = async () => {
      const rut = rutCliente.value.trim()
      if (!rut) return

      buscandoCliente.value = true
      try {
        /* Devuelve null con 200 si no existe: en el mesón lo normal es que
           el cliente no esté registrado, y eso no es un error. */
        const encontrado = await store.dispatch('clientes/buscarPorRut', { rut })
        if (encontrado) {
          store.dispatch('ventas/elegirCliente', encontrado)
          rutCliente.value = ''
        } else {
          avisar('No hay ficha con ese RUT', true)
        }
      } catch (e) {
        avisar(e.message, true)
      } finally {
        buscandoCliente.value = false
      }
    }

    const quitarCliente = () => store.dispatch('ventas/elegirCliente', null)

    /* ---------------- Cobro ---------------- */
    const cobrando = ref(false)
    const ticket = ref(null)
    const carritoAbierto = ref(false)
    const campoContado = ref(null)

    const alCobrar = async (venta) => {
      cobrando.value = false
      carritoAbierto.value = false
      avisar(`Boleta ${venta.folio} · ${clp(venta.total)}`)
      try {
        ticket.value = await store.dispatch('ventas/ticket', { id: venta.id })
      } catch (e) {
        avisar('La venta quedó registrada, pero el ticket no se pudo abrir.', true)
      }
    }

    const cerrarTicket = async () => {
      ticket.value = null
      await nextTick()
      enfocarCodigo()
    }

    const imprimir = () => window.print()

    /* Vaciar el carrito con la hoja abierta la deja sin motivo para seguir
       tapando la grilla. */
    watch(hayCarrito, (v) => {
      if (!v) carritoAbierto.value = false
    })

    /* Cobrar con la cámara abierta no tiene sentido: se suelta antes de
       entrar al modal de pago, así el LED se apaga y no queda un stream
       corriendo mientras se pasa la tarjeta. */
    watch(cobrando, (v) => {
      if (v) escaneando.value = false
    })

    /* ---------------- Capas abiertas ---------------- */
    /* Con una hoja o un modal encima, el fondo no debe scrollear: en móvil
       el dedo arrastra la página de atrás y se pierde el lugar. */
    const hayCapa = computed(() =>
      carritoAbierto.value || cobrando.value || escaneando.value
      || !!ticket.value || !!cierre.value
    )

    watch(hayCapa, (v) => {
      document.body.classList.toggle('pos-sin-scroll', v)
    })

    /* ---------------- Teclado y lector de barras ---------------- */
    /*
       Un lector de barras es un teclado que escribe rapidísimo y remata con
       Enter. Si el foco andaba en cualquier otra parte —o en ninguna, porque
       el vendedor venía de tocar la grilla— el escaneo se perdía completo.
       Acá se redirige al campo de código cualquier tecleo que caiga fuera de
       un input.
    */
    const alTeclado = (e) => {
      if (e.key === 'Escape') {
        if (escaneando.value) cerrarEscaner()
        else if (cierre.value) cierre.value = null
        else if (carritoAbierto.value) carritoAbierto.value = false
        return
      }

      if (!abierta.value) return

      /* F2 abre la cámara desde donde sea, incluso con el cursor dentro de
         un campo: es el atajo del que tiene el equipo en la mano y no quiere
         soltar el mouse. */
      if (e.key === 'F2' && puedeEscanear) {
        e.preventDefault()
        if (!cobrando.value && !ticket.value && !cierre.value) {
          escaneando.value ? cerrarEscaner() : abrirEscaner()
        }
        return
      }

      if (cobrando.value || ticket.value || cierre.value || escaneando.value) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const t = e.target
      const editando = t && (
        t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' ||
        t.tagName === 'SELECT' || t.isContentEditable
      )
      if (editando) return

      if (e.key === 'Enter') {
        if (codigo.value.trim()) {
          e.preventDefault()
          buscarPorCodigo()
        }
        return
      }

      /* Solo caracteres imprimibles: Tab, flechas y atajos siguen su curso. */
      if (e.key.length !== 1) return
      e.preventDefault()
      codigo.value += e.key
      enfocarCodigo()
    }

    /* ---------------- Carga ---------------- */
    let control = null

    onMounted(() => {
      control = new AbortController()
      const señal = { signal: control.signal }
      store.dispatch('caja/cargarActual', señal)
      store.dispatch('configuracion/cargar', señal)
      store.dispatch('inventario/cargarCategorias', señal)

      /* Solo lo que está en el mesón: el POS vende de la vitrina, no del
         catálogo. Traer los 17 productos incluiría cosas que están en
         bodega y que el vendedor no puede entregar. */
      store.dispatch('productos/filtrar', { soloEnVenta: true, activo: true })

      document.addEventListener('keydown', alTeclado)
    })

    onUnmounted(() => {
      control?.abort()
      clearTimeout(tmrAviso)
      clearTimeout(tmrEstado)
      document.removeEventListener('keydown', alTeclado)
      document.body.classList.remove('pos-sin-scroll')
    })

    /* Al abrir la caja, el foco va al código: lo primero que pasa en el
       mesón es que alguien escanea o teclea algo. */
    watch(abierta, async (v) => {
      if (!v) return
      if (!conMouse()) return
      await nextTick()
      enfocarCodigo()
    })

    /* ---------------- Utilidades ---------------- */
    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    const fmtHora = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' })
    const hora = (v) => (v ? fmtHora.format(new Date(v)) : '—')

    return {
      Math,
      caja, abierta, guardandoCaja, errorCaja, fondoInicial, abrirCaja, detalleCaja,
      cierre, abrirCierre, cerrarCaja, claseDiferencia, textoDiferencia,
      categorias, clubActivo, busqueda, categoriaId, visibles, limpiarFiltros,
      codigo, buscandoCodigo, avisoCodigo, estadoCodigo, campoCodigo, buscarPorCodigo,
      escaneando, leidosCamara, escaner, puedeEscanear,
      abrirEscaner, cerrarEscaner, resolverEscaneo, alFallarCamara,
      carrito, hayCarrito, unidades, bruto, descuentoPromo, promociones,
      promocionId, promocionElegida, cliente, haySinStock, sinStock,
      agregar, cambiar, vaciar, elegirPromocion,
      rutCliente, buscandoCliente, buscarCliente, quitarCliente,
      cobrando, ticket, carritoAbierto, campoContado, alCobrar, cerrarTicket, imprimir,
      aviso, clp, hora
    }
  }
}
</script>


<style scoped>

/* El fondo no scrollea mientras hay una hoja o un modal arriba. */
:global(body.pos-sin-scroll) {
  overflow: hidden;
}

/* ═══════════════════════════════════════════════════════════
   BASE COMPARTIDA
   ═══════════════════════════════════════════════════════════ */

.min0 {
  min-width: 0;
}

.suave {
  color: var(--text-muted);
}

.mini {
  font-size: .75rem;
}

.chico {
  font-size: .7rem;
}

.rojo {
  color: var(--danger);
}

.verde {
  color: var(--success);
}

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.ayuda {
  font-size: .78rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin-top: 6px;
}

.rot {
  font-size: .66rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.error {
  padding: 10px 14px;
  border-radius: var(--r-sm);
  background: var(--danger-soft);
  border: 1px solid var(--danger-border);
  color: var(--danger);
  font-size: .85rem;
  margin-bottom: 14px;
}

/* El agarre de la hoja, su botón de cerrar y el rótulo corto del chip
   solo existen en móvil. */
.agarre,
.solo-movil,
.txt-angosto {
  display: none;
}

.globo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--r-full);
  background: var(--accent-soft);
  color: var(--accent-text);
  font-size: .72rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.globo.claro {
  background: color-mix(in srgb, #fff 26%, transparent);
  color: inherit;
}

/* ─── Campos ─── */

.campo {
  width: 100%;
  min-height: 44px;
  padding: .6rem .8rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  /* 16px mínimo: bajo eso, iOS hace zoom al enfocar y descuadra el POS
     justo cuando hay un cliente esperando. */
  font-size: max(.9rem, 16px);
  transition: border-color var(--t-fast);
}

.campo:focus {
  outline: 0;
  border-color: var(--accent);
}

.campo.chico {
  min-height: 38px;
  padding: .4rem .65rem;
  font-size: max(.85rem, 16px);
}

.campo.grande {
  min-height: 58px;
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
}

/* Sin flechitas: al contar plata estorban, y un click accidental cambia
   el monto sin que nadie lo note. */
.campo[type=number]::-webkit-outer-spin-button,
.campo[type=number]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.campo[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

label {
  display: block;
  font-size: .8rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
}

/* ─── Botones ─── */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
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

.btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.btn.grande {
  min-height: 54px;
  font-size: 1.02rem;
}

.btn.ancho {
  width: 100%;
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
  min-height: 32px;
  padding: .3rem .75rem;
  font-size: .78rem;
}

.btn-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color var(--t-fast), color var(--t-fast);
}

.btn-icono:hover {
  border-color: var(--accent);
  color: var(--accent-text);
}

.btn-icono.chico {
  width: 28px;
  height: 28px;
  font-size: .8rem;
}

.enlace-boton {
  border: none;
  background: none;
  color: var(--text-muted);
  font: inherit;
  font-size: .8rem;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
}

.enlace-boton:hover {
  color: var(--accent-text);
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: girar .6s linear infinite;
  flex-shrink: 0;
}

.spinner.oscuro {
  color: var(--text-muted);
}

@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}

/* ═══════════════════════════════════════════════════════════
   SIN CAJA
   ═══════════════════════════════════════════════════════════ */

.apertura {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60dvh;
  padding: 24px 16px;
}

.apertura-caja {
  width: 100%;
  max-width: 380px;
  text-align: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-md);
  padding: 32px 26px;
}

.apertura-icono {
  font-size: 2.2rem;
  display: block;
  margin-bottom: 12px;
}

.apertura-caja h2 {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
}

.apertura-bajada {
  font-size: .84rem;
  color: var(--text-muted);
  margin: 6px 0 20px;
}

.apertura-caja label {
  text-align: left;
}

.apertura-caja .campo {
  margin-bottom: 18px;
}

/* ═══════════════════════════════════════════════════════════
   TABLERO
   ═══════════════════════════════════════════════════════════ */

.tablero {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 16px;
  align-items: start;
}

.catalogo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

/* ═══════════════════════════════════════════════════════════
   BARRA ÚNICA · código · búsqueda · categorías · caja
   ═══════════════════════════════════════════════════════════ */

.barra {
  display: grid;
  grid-template-columns:
    minmax(190px, 290px)   /* código: el más ancho, es el que más se usa */
    minmax(150px, 220px)   /* búsqueda por nombre */
    minmax(0, 1fr)         /* categorías: absorben el sobrante y scrollean */
    auto;                  /* chip de caja */
  grid-template-areas: "codigo buscar cats caja";
  align-items: center;
  gap: 8px;
}

.barra__codigo {
  grid-area: codigo;
}

.barra__buscar {
  grid-area: buscar;
}

.barra .categorias {
  grid-area: cats;
}

.barra__caja {
  grid-area: caja;
}

/* ─── Buscadores ─── */

.buscador {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  min-width: 0;
  padding: 0 8px 0 11px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  transition: border-color var(--t-fast), background-color var(--t-fast);
}

.buscador:focus-within {
  border-color: var(--accent);
}

.buscador input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  color: var(--text);
  font: inherit;
  font-size: max(.9rem, 16px);
}

.buscador input::placeholder {
  color: var(--text-faint);
}

/* El campo de código va marcado: es por donde entra el escáner, y en el
   mesón conviene que se distinga del buscador de texto de un vistazo. */
.buscador--codigo {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.buscador--codigo input {
  font-family: var(--font-mono);
  font-size: max(.85rem, 16px);
  letter-spacing: .02em;
}

/* Destello del resultado en el propio campo: cuando pasa el lector el ojo
   ya está mirando acá, así que la confirmación va donde se mira y no en
   una banda que reacomoda la grilla. */
.buscador--codigo.ok {
  border-color: var(--success);
  background: var(--success-soft);
}

.buscador--codigo.malo {
  border-color: var(--danger);
  background: var(--danger-soft);
  animation: sacudir .22s ease;
}

@keyframes sacudir {

  25% {
    transform: translateX(-3px);
  }

  75% {
    transform: translateX(3px);
  }
}

/* ─── Categorías ─── */

.categorias {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
  /* Máscara al borde derecho: avisa que la tira sigue, sin gastar una
     flecha ni una fila extra. */
  mask-image: linear-gradient(to right, #000 calc(100% - 22px), transparent);
  -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 22px), transparent);
}

.categorias::-webkit-scrollbar {
  display: none;
}

.pastilla {
  padding: .42rem .9rem;
  border: 1px solid var(--border);
  border-radius: var(--r-full);
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  font-size: .82rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  scroll-snap-align: start;
  transition: background-color var(--t-fast), color var(--t-fast), border-color var(--t-fast);
}

.pastilla:hover {
  border-color: var(--border-strong);
}

.pastilla.on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-contrast);
}

.pastilla:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ─── Chip de caja abierta ───
   Reemplaza el banner. Mismo mensaje, mismo verde reconocible, una
   fracción del espacio. El detalle largo (quién abrió) va en el title y
   completo en Turnos. */

.caja-chip {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 3px 4px 3px 12px;
  border-radius: var(--r-full);
  background: var(--success-soft);
  border: 1px solid color-mix(in srgb, var(--success) 38%, transparent);
  color: var(--success);
  white-space: nowrap;
}

.caja-chip__txt {
  display: flex;
  flex-direction: column;
  justify-content: center;
  line-height: 1.15;
  min-width: 0;
}

.caja-chip__txt b {
  font-size: .86rem;
  font-variant-numeric: tabular-nums;
}

.caja-chip__txt span {
  font-size: .67rem;
  opacity: .82;
}

.caja-chip__btn {
  border-color: currentColor;
  color: inherit;
  background: transparent;
}

.caja-chip__btn:hover:not(:disabled) {
  background: var(--surface);
  color: var(--success);
}

/* El punto late para que se note desde lejos que hay turno abierto: en el
   mesón nadie va a leer el chip, pero el movimiento sí se ve. */
.punto {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
  animation: latir 2.4s ease-in-out infinite;
}

@keyframes latir {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: .35;
  }
}

/* ═══════════════════════════════════════════════════════════
   GRILLA DE PRODUCTOS
   ═══════════════════════════════════════════════════════════ */

.grilla {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: 10px;
}

.producto {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 13px 10px 10px;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  text-align: center;
  cursor: pointer;
  transition: transform var(--t-fast), border-color var(--t-fast), box-shadow var(--t-fast);
}

.producto:hover:not(:disabled) {
  border-color: var(--accent);
  /* El levantón confirma el toque antes de que el carrito reaccione: en
     una grilla de treinta tarjetas iguales, esa señal importa. */
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.producto:active:not(:disabled) {
  transform: translateY(0);
}

.producto:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.producto.agotado {
  opacity: .45;
  cursor: not-allowed;
}

.producto__emoji {
  font-size: 1.7rem;
  line-height: 1.1;
}

.producto__nombre {
  font-size: .82rem;
  font-weight: 600;
  line-height: 1.25;
  /* Dos líneas y corta: un nombre largo no puede empujar el precio fuera
     de la tarjeta. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Precio y stock en una sola línea al pie: el precio manda y el stock
   queda como pastilla chica, en vez de dos renglones sueltos. */
.producto__pie {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  margin-top: auto;
  padding-top: 7px;
  border-top: 1px dashed var(--border);
}

.producto__pie b {
  font-size: .95rem;
}

.producto__stock {
  padding: 1px 6px;
  border-radius: var(--r-full);
  background: var(--surface-2);
  color: var(--text-faint);
  font-size: .7rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.producto__stock.poco {
  background: var(--warn-soft);
  color: var(--warn);
}

/* ═══════════════════════════════════════════════════════════
   CARRITO
   ═══════════════════════════════════════════════════════════ */

.carrito {
  position: sticky;
  top: 84px;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-sm);
  max-height: calc(100dvh - 104px);
  overflow: hidden;
}

.carrito-cab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.carrito-cab h3 {
  font-size: 1rem;
  font-weight: 700;
}

.cab-acciones {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.carrito-cuerpo {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* El pie queda fuera del scroll: el total y el botón de cobrar no se
   pierden por muchas líneas que tenga la venta. */
.carrito-pie {
  padding: 14px 16px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.cliente {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--surface-2);
  border-radius: var(--r-sm);
}

.cliente b {
  font-size: .85rem;
}

.cliente .campo {
  flex: 1;
  min-width: 0;
}

.lineas {
  min-height: 60px;
}

.vacio-carrito {
  text-align: center;
  padding: 28px 12px;
  color: var(--text-faint);
  font-size: .85rem;
  line-height: 1.5;
}

.linea {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.linea:last-child {
  border-bottom: 0;
}

.linea b {
  font-size: .86rem;
}

.linea.sinStock {
  background: var(--danger-soft);
  border-radius: var(--r-sm);
  padding: 10px 8px;
  margin: 0 -8px;
}

.cantidad {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--surface-2);
  border-radius: var(--r-full);
  padding: 2px;
}

.paso {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: background-color var(--t-fast);
}

.paso:hover {
  background: var(--surface);
}

.cantidad .dato {
  min-width: 26px;
  text-align: center;
  font-size: .9rem;
}

.subtotal {
  font-size: .88rem;
}

.promos label {
  font-size: .72rem;
  margin-bottom: 4px;
}

.resumen {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.fila {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  font-size: .86rem;
  color: var(--text-muted);
}

.fila.verde {
  color: var(--success);
}

.fila.total {
  padding-top: 8px;
  margin-top: 2px;
  border-top: 1px solid var(--border);
  font-size: 1rem;
  color: var(--text);
}

.fila.total b {
  font-size: 1.3rem;
}

/* ─── Velo y barra flotante: solo móvil ─── */

.velo,
.flotante {
  display: none;
}

/* ═══════════════════════════════════════════════════════════
   AVISOS
   ═══════════════════════════════════════════════════════════ */

.vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
  font-size: .88rem;
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-md);
}

/* Resultado del escaneo: flota arriba, no desplaza la grilla. Como banda
   inline empujaba las tarjetas justo cuando el dedo ya iba en camino. */
.toast-codigo {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 9px;
  max-width: min(92vw, 460px);
  padding: 10px 18px;
  border-radius: var(--r-full);
  background: var(--success);
  color: #fff;
  font-size: .85rem;
  font-weight: 600;
  line-height: 1.35;
  box-shadow: var(--shadow-lg);
  animation: bajar .2s ease;
}

.toast-codigo.malo {
  background: var(--danger);
}

@keyframes bajar {
  from {
    opacity: 0;
    transform: translate(-50%, -10px);
  }

  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.aviso {
  position: fixed;
  left: 50%;
  bottom: calc(24px + env(safe-area-inset-bottom, 0));
  transform: translateX(-50%);
  z-index: 200;
  padding: 12px 22px;
  border-radius: var(--r-full);
  background: var(--success);
  color: #fff;
  font-size: .88rem;
  font-weight: 600;
  box-shadow: var(--shadow-lg);
  animation: subir .22s ease;
}

.aviso.malo {
  background: var(--danger);
}

@keyframes subir {
  from {
    opacity: 0;
    transform: translate(-50%, 10px);
  }

  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

/* ═══════════════════════════════════════════════════════════
   MODALES
   ═══════════════════════════════════════════════════════════ */

.fondo {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--overlay);
}

.modal {
  position: relative;
  width: 100%;
  max-width: 440px;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal-cab {
  padding: 20px 22px 14px;
  border-bottom: 1px solid var(--border);
}

.modal-cab h3 {
  font-size: 1.1rem;
  font-weight: 700;
}

.modal-cab p {
  font-size: .82rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.modal-cuerpo {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 20px 22px;
}

.modal-pie {
  display: flex;
  gap: 10px;
  padding: 16px 22px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}

.modal-pie .btn {
  flex: 1;
}

.grupo {
  margin-bottom: 18px;
}

.grupo:last-child {
  margin-bottom: 0;
}

/* ─── Cierre de caja ─── */

.desglose {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 14px 16px;
  background: var(--surface-2);
  border-radius: var(--r-sm);
  margin-bottom: 18px;
}

.desglose .fila.total {
  border-top: 1px solid var(--border-strong);
  padding-top: 9px;
  color: var(--text);
  font-weight: 600;
}

.desglose .fila.rojo {
  color: var(--danger);
}

.resultado-cierre {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 22px;
  border-radius: var(--r-md);
  margin-bottom: 18px;
  border: 1px solid;
}

.resultado-cierre .val {
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -.02em;
}

.resultado-cierre.cuadrada {
  background: var(--success-soft);
  border-color: var(--success);
  color: var(--success);
}

.resultado-cierre.sobrante {
  background: var(--info-soft);
  border-color: var(--info-border);
  color: var(--info);
}

.resultado-cierre.faltante {
  background: var(--danger-soft);
  border-color: var(--danger-border);
  color: var(--danger);
}

.resultado-cierre .rot {
  color: inherit;
  opacity: .85;
}

/* ─── Ticket (se conserva para la impresión) ─── */

.ticket {
  font-family: var(--font-mono);
  font-size: .78rem;
  line-height: 1.55;
  color: var(--text);
  background: var(--surface-2);
  border-radius: var(--r-sm);
  padding: 18px;
}

/* ═══════════════════════════════════════════════════════════
   IMPRESIÓN · solo el ticket
   ═══════════════════════════════════════════════════════════ */

@media print {

  .catalogo,
  .carrito,
  .velo,
  .flotante,
  .aviso,
  .toast-codigo,
  .modal-cab,
  .modal-pie {
    display: none !important;
  }

  .fondo {
    position: static;
    background: none;
    padding: 0;
  }

  .modal {
    max-width: none;
    max-height: none;
    border: none;
    box-shadow: none;
  }

  .modal-cuerpo {
    padding: 0;
    overflow: visible;
  }

  .ticket {
    background: #fff;
    color: #000;
    padding: 0;
  }
}

/* ═══════════════════════════════════════════════════════════
   RESPONSIVE · escritorio angosto y tablet
   ═══════════════════════════════════════════════════════════ */

@media (max-width: 1180px) {

  /* Las categorías bajan a su propia fila: son lo único de la barra que
     tolera envolver sin perder jerarquía. */
  .barra {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto;
    grid-template-areas:
      "codigo buscar caja"
      "cats   cats   cats";
    row-gap: 8px;
  }
}

@media (max-width: 1080px) {
  .tablero {
    grid-template-columns: 1fr 330px;
  }

  /* Sin espacio para el desglose: queda el punto, el total y el botón. */
  .caja-chip__txt span {
    display: none;
  }

  .caja-chip__txt {
    justify-content: center;
  }
}

/* ═══════════════════════════════════════════════════════════
   MÓVIL
   El mesón se atiende con el teléfono vertical y una mano: la
   grilla ocupa toda la pantalla y la venta es una hoja que se
   levanta cuando hace falta.
   ═══════════════════════════════════════════════════════════ */

@media (max-width: 860px) {

  .agarre {
    display: block;
    position: absolute;
    top: 7px;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 4px;
    border-radius: var(--r-full);
    background: var(--border-strong);
  }

  .solo-movil {
    display: inline-flex;
  }

  .tablero {
    grid-template-columns: 1fr;
  }

  /* ─── Barra pegada arriba ───
     Al recorrer una grilla larga, el escáner tiene que seguir a mano. */

  .barra {
    position: sticky;
    top: 0;
    z-index: 5;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "caja   caja"
      "codigo codigo"
      "buscar buscar"
      "cats   cats";
    row-gap: 8px;
    padding: 8px 0;
    background: var(--bg, var(--surface));
  }

  /* El chip se estira a lo ancho y recupera su segunda línea: acá el
     ancho sobra y el detalle del turno se agradece. */
  .caja-chip {
    display: flex;
    min-height: 40px;
    padding: 3px 4px 3px 12px;
  }

  .caja-chip__txt span {
    display: block;
  }

  .caja-chip__btn {
    margin-left: auto;
  }

  /* El botón de cierre se vuelve icono: es una acción de fin de turno,
     no algo que se toque en medio de la venta. */
  .caja-chip__btn .txt-ancho {
    display: none;
  }

  .caja-chip__btn .txt-angosto {
    display: inline;
    font-size: .95rem;
  }

  .caja-chip__btn {
    min-width: 36px;
    padding: .3rem .55rem;
  }

  .buscador {
    min-height: 44px;
  }

  .categorias {
    margin: 0 -12px;
    padding: 0 12px;
  }

  /* ─── Grilla ─── */

  .grilla {
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
    gap: 8px;
  }

  .producto {
    padding: 12px 8px 9px;
    min-height: 116px;
    justify-content: center;
  }

  .producto__emoji {
    font-size: 1.5rem;
  }

  /* En pantalla táctil el levantón no aporta y deja la tarjeta pegada en
     hover después del toque. */
  .producto:hover:not(:disabled) {
    transform: none;
    box-shadow: none;
    border-color: var(--border);
  }

  /* Deja aire bajo la grilla para que la barra flotante no tape la última
     fila de productos. */
  .catalogo {
    padding-bottom: calc(76px + env(safe-area-inset-bottom, 0));
  }

  /* ─── Velo ─── */

  .velo {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 39;
    background: var(--overlay);
    animation: aparecer .18s ease;
  }

  /* ─── Carrito como hoja ─── */

  .carrito {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    z-index: 40;
    max-height: 88dvh;
    border: 0;
    border-top: 1px solid var(--border);
    border-radius: var(--r-lg) var(--r-lg) 0 0;
    box-shadow: var(--shadow-lg);
    transform: translateY(100%);
    /* La hoja cerrada se apaga además con visibility: si algún ancestro
       crea bloque contenedor (transform, filter, contain), el fixed deja
       de anclarse al viewport y el desplazamiento solo no la esconde. */
    visibility: hidden;
    pointer-events: none;
    transition: transform var(--t-med), visibility var(--t-med);
  }

  .carrito.abierto {
    transform: translateY(0);
    visibility: visible;
    pointer-events: auto;
  }

  .carrito-cab {
    padding: 18px 16px 12px;
  }

  .carrito-cuerpo {
    padding: 12px 16px;
  }

  .carrito-pie {
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0));
  }

  /* Objetivos de toque más grandes: sumar unidades es lo que más se
     repite con un cliente enfrente. */
  .paso {
    width: 40px;
    height: 40px;
    font-size: 1.25rem;
  }

  .cantidad .dato {
    min-width: 30px;
    font-size: .95rem;
  }

  /* ─── Barra flotante ─── */

  .flotante {
    display: flex;
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom, 0));
    z-index: 30;
    align-items: center;
    gap: 10px;
    min-height: 56px;
    padding: 0 18px;
    border: none;
    border-radius: var(--r-full);
    background: var(--accent);
    color: var(--accent-contrast);
    font: inherit;
    font-size: .95rem;
    font-weight: 700;
    box-shadow: var(--sh-accent, var(--shadow-lg));
    cursor: pointer;
    animation: asomar .2s ease;
  }

  .flotante-texto {
    margin-right: auto;
  }

  .flotante .dato {
    font-size: 1.05rem;
  }

  /* El toast baja bajo la barra pegada, no encima de ella. */
  .toast-codigo {
    top: auto;
    bottom: calc(80px + env(safe-area-inset-bottom, 0));
    left: 12px;
    right: 12px;
    max-width: none;
    transform: none;
    animation: subir-borde .2s ease;
  }

  @keyframes subir-borde {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
  }

  /* ─── El modal de cierre también sube desde abajo ─── */

  .fondo {
    align-items: flex-end;
    padding: 0;
  }

  .modal {
    max-width: none;
    max-height: 92dvh;
    border-radius: var(--r-lg) var(--r-lg) 0 0;
    border-bottom: 0;
    animation: asomar .18s ease-out;
  }

  .modal-cab {
    padding-top: 22px;
  }

  .modal-cuerpo {
    padding: 18px 18px 20px;
  }

  .modal-pie {
    flex-direction: column-reverse;
    padding: 14px 18px calc(14px + env(safe-area-inset-bottom, 0));
  }
}

/* Teléfonos angostos: dos columnas fijas leen mejor que tres apretadas */
@media (max-width: 420px) {
  .grilla {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .apertura-caja {
    padding: 26px 20px;
  }
}

@keyframes aparecer {
  from {
    opacity: 0;
  }
}

@keyframes asomar {
  from {
    transform: translateY(16px);
  }
}

@media (prefers-reduced-motion: reduce) {

  .producto,
  .carrito,
  .aviso,
  .toast-codigo,
  .flotante,
  .modal,
  .velo,
  .punto,
  .buscador--codigo {
    transition: none;
    animation: none;
  }
}
</style>
