<template>

  <!-- ================= SIN CAJA ================= -->
  <div v-if="!abierta" class="apertura">
    <div class="apertura-caja">
      <span class="apertura-icono" aria-hidden="true">🔒</span>
      <h2>La caja está cerrada</h2>
      <!-- <p class="pista">
        Sin caja abierta no se puede vender ni recibir abonos. Cuenta el
        fondo del cajón antes de empezar: es contra ese número que se
        calcula la diferencia al cerrar.
      </p> -->

      <div v-if="errorCaja" class="error">{{ errorCaja }}</div>

      <label for="fondo">Fondo inicial</label>
      <input id="fondo" class="campo grande dato" type="number" min="0" step="1000" v-model.number="fondoInicial"
        @keyup.enter="abrirCaja">

      <button class="btn grande ancho" :disabled="guardandoCaja" @click="abrirCaja">
        <span v-if="guardandoCaja" class="spinner" aria-hidden="true"></span>
        {{ guardandoCaja ? 'Abriendo…' : 'Abrir caja' }}
      </button>
    </div>
  </div>

  <!-- ================= PUNTO DE VENTA ================= -->
  <template v-else>

    <div class="barra-caja">
      <div class="caja-datos">
        <span class="punto" aria-hidden="true"></span>
        <div class="min0">
          <b>Caja abierta</b>
          <div class="mini suave">
            {{ caja.abiertaPor }} · desde {{ hora(caja.abiertaEn) }} ·
            {{ caja.boletas }} boleta(s) · {{ clp(caja.totalVendido) }}
          </div>
        </div>
      </div>
      <button class="btn btn-linea btn-mini" @click="abrirCierre">Cerrar caja</button>
    </div>

    <div class="tablero">

      <!-- ---------- Catálogo ---------- -->
      <section class="catalogo">
        <div class="busqueda">
          <div class="buscador">
            <span aria-hidden="true">🔎</span>
            <input v-model="busqueda" placeholder="Buscar producto…" aria-label="Buscar producto">
            <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
          </div>

          <!--
              Entrada del código: sirve para el lector de barras —que teclea
              y manda Enter— y para tipear el código del lote cuando la
              etiqueta está borrosa. El escáner de cámara reemplaza este
              campo, no lo elimina.
            -->
          <div class="buscador codigo">
            <span aria-hidden="true">🏷️</span>
            <input ref="campoCodigo" v-model="codigo" placeholder="Código de producto o lote…" aria-label="Código"
              @keyup.enter="buscarPorCodigo">
            <span v-if="buscandoCodigo" class="spinner oscuro" aria-hidden="true"></span>
          </div>
        </div>

        <div v-if="avisoCodigo" class="banda" :class="avisoCodigo.malo ? 'banda-error' : 'banda-ok'">
          <span>{{ avisoCodigo.texto }}</span>
        </div>

        <div class="categorias">
          <button class="pastilla" :class="{ on: categoriaId === null }" @click="categoriaId = null">Todo</button>
          <button v-for="c in categorias" :key="c.id" class="pastilla" :class="{ on: categoriaId === c.id }"
            @click="categoriaId = c.id">
            {{ c.nombre }}
          </button>
        </div>

        <div v-if="!visibles.length" class="vacio">
          {{ busqueda ? 'Ningún producto coincide.' : 'Sin productos disponibles.' }}
        </div>

        <div v-else class="grilla">
          <button v-for="p in visibles" :key="p.id" class="producto" :class="{ agotado: p.enVenta <= 0 }"
            :disabled="p.enVenta <= 0" @click="agregar(p)">
            <span class="emoji" aria-hidden="true">{{ p.emoji }}</span>
            <span class="nombre">{{ p.nombre }}</span>
            <b class="precio dato">{{ clp(p.precio) }}</b>
            <span class="stock mini" :class="{ poco: p.enVenta <= 3 }">
              {{ p.enVenta }} disp.
            </span>
          </button>
        </div>
      </section>

      <!-- ---------- Carrito ---------- -->
      <aside class="carrito" :class="{ abierto: carritoAbierto }">
        <header class="carrito-cab">
          <h3>Venta</h3>
          <button v-if="hayCarrito" class="enlace-boton" @click="vaciar">Vaciar</button>
        </header>

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
              Buscar
            </button>
          </template>
        </div>

        <!-- Líneas -->
        <div class="lineas">
          <p v-if="!hayCarrito" class="vacio-carrito">
            Toca un producto para agregarlo.
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
          <label>Promoción</label>
          <!--
              El servidor devuelve el descuento calculado para ESTE carrito y
              las ordena por conveniencia; la primera viene elegida sola. Se
              puede cambiar, pero no hace falta pensarlo.
            -->
          <select class="campo chico" :value="promocionId ?? ''"
            @change="elegirPromocion($event.target.value ? Number($event.target.value) : null)">
            <option value="">Sin promoción</option>
            <option v-for="p in promociones" :key="p.id" :value="p.id">
              {{ p.nombre }} — descuenta {{ clp(p.descuento) }}
            </option>
          </select>
        </div>

        <!-- Totales -->
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
      </aside>
    </div>

    <!-- Barra flotante en móvil -->
    <button v-if="hayCarrito && !carritoAbierto" class="flotante" @click="carritoAbierto = true">
      <span>{{ unidades }} ítem(s)</span>
      <b class="dato">{{ clp(bruto - descuentoPromo) }}</b>
      <span aria-hidden="true">▲</span>
    </button>
  </template>

  <!-- ================= MODALES ================= -->
  <ModalCobro v-if="cobrando" @cerrar="cobrando = false" @cobrada="alCobrar" />

  <TicketBoleta v-if="ticket" :ticket="ticket" @cerrar="cerrarTicket" />

  <!-- Cierre de caja -->
  <div v-if="cierre" class="fondo" @click.self="cierre = null">
    <div class="modal">
      <div class="modal-cab">
        <h3>{{ cierre.resumen ? 'Caja cerrada' : 'Cerrar caja' }}</h3>
        <p v-if="!cierre.resumen">Cuenta el efectivo del cajón antes de informarlo.</p>
      </div>

      <div class="modal-cuerpo">
        <div v-if="cierre.error" class="error">{{ cierre.error }}</div>

        <!-- Antes de cerrar -->
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import ModalCobro from '@/features/ventas/components/Modalcobro.vue'
import TicketBoleta from '@/features/ventas/components/TicketBoleta.vue'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'

export default {
  name: 'PosView',
  components: { ModalCobro, TicketBoleta },

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

    /* ---------------- Código ---------------- */
    const codigo = ref('')
    const buscandoCodigo = ref(false)
    const avisoCodigo = ref(null)
    const campoCodigo = ref(null)

    let tmrAviso = null
    const mostrarAvisoCodigo = (texto, malo = false) => {
      avisoCodigo.value = { texto, malo }
      clearTimeout(tmrAviso)
      tmrAviso = setTimeout(() => { avisoCodigo.value = null }, 5000)
    }

    /**
     * Un código puede ser de producto o de lote. Se prueba primero como
     * lote: si lo es, la validación trae las advertencias que importan —si
     * venció, si no alcanza, y sobre todo si hay un lote más antiguo abierto
     * que conviene vender primero.
     */
    const buscarPorCodigo = async () => {
      const texto = codigo.value.trim()
      if (!texto) return

      buscandoCodigo.value = true
      try {
        const validacion = await store.dispatch('lotes/validar', { codigo: texto, cantidad: 1 })

        if (!validacion.sePuedeVender) {
          mostrarAvisoCodigo(validacion.advertencia || 'Ese lote no se puede vender.', true)
          return
        }

        store.dispatch('ventas/agregarProducto', {
          producto: {
            id: validacion.productoId,
            nombre: validacion.producto,
            emoji: validacion.emoji,
            precio: validacion.precio,
            disponible: validacion.varasDisponibles,
            loteCodigo: validacion.codigo
          },
          loteId: validacion.loteId
        })

        /* La advertencia no bloquea: el sistema completa con el siguiente
           lote por antigüedad. Pero avisar del lote viejo abierto es lo que
           evita que se quede sin vender. */
        if (validacion.advertencia) mostrarAvisoCodigo(validacion.advertencia)
        else mostrarAvisoCodigo(`${validacion.producto} agregado desde ${validacion.codigo}`)

        codigo.value = ''
        return
      } catch {
        /* No era un lote: se prueba como código de producto. */
      } finally {
        buscandoCodigo.value = false
      }

      try {
        const producto = await store.dispatch('productos/porCodigo', { codigo: texto })
        if (!producto) throw new Error()
        store.dispatch('ventas/agregarProducto', { producto })
        mostrarAvisoCodigo(`${producto.nombre} agregado`)
        codigo.value = ''
      } catch {
        mostrarAvisoCodigo(`No hay ningún producto ni lote con el código ${texto}`, true)
      }
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
        console.log('TICKET:', ticket.value)   // TEMPORAL
      } catch (e) {
        console.error('TICKET falló:', e)      // TEMPORAL
      }
    }

    const cerrarTicket = async () => {
      ticket.value = null
      await nextTick()
      campoCodigo.value?.focus()
    }

    const imprimir = () => window.print()

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
    })

    onUnmounted(() => {
      control?.abort()
      clearTimeout(tmrAviso)
    })

    /* Al abrir la caja, el foco va al código: lo primero que pasa en el
       mesón es que alguien escanea o teclea algo. */
    watch(abierta, async (v) => {
      if (v) {
        await nextTick()
        campoCodigo.value?.focus()
      }
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
      caja, abierta, guardandoCaja, errorCaja, fondoInicial, abrirCaja,
      cierre, abrirCierre, cerrarCaja, claseDiferencia, textoDiferencia,
      categorias, clubActivo, busqueda, categoriaId, visibles,
      codigo, buscandoCodigo, avisoCodigo, campoCodigo, buscarPorCodigo,
      carrito, hayCarrito, unidades, bruto, descuentoPromo, promociones,
      promocionId, promocionElegida, cliente, haySinStock, sinStock,
      agregar, cambiar, vaciar, elegirPromocion,
      rutCliente, buscandoCliente, buscarCliente, quitarCliente,
      cobrando, ticket, carritoAbierto, alCobrar, cerrarTicket, imprimir,
      aviso, clp, hora
    }
  }
}
</script>

<style scoped>
/* ============================================================
   POS · Punto de venta
   Todo con tokens: aguanta el cambio de tema sin una sola
   condición extra.
   ============================================================ */

/* ─── Base compartida ─── */

.min0 {
  min-width: 0;
}

.der {
  text-align: right;
}

.cen {
  text-align: center;
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
  min-height: 34px;
  padding: .35rem .8rem;
  font-size: .8rem;
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
  color: var(--danger);
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
  min-height: 60vh;
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

.pista {
  font-size: .85rem;
  color: var(--text-muted);
  line-height: 1.55;
  margin: 8px 0 22px;
}

.apertura-caja label {
  text-align: left;
}

.apertura-caja .campo {
  margin-bottom: 18px;
}

/* ═══════════════════════════════════════════════════════════
   BARRA DE CAJA
   ═══════════════════════════════════════════════════════════ */

.barra-caja {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  padding: 10px 16px;
  margin-bottom: 14px;
  background: var(--success-soft);
  border: 1px solid var(--success);
  border-radius: var(--r-sm);
  color: var(--success);
}

.caja-datos {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.caja-datos b {
  font-size: .88rem;
}

.caja-datos .suave {
  color: inherit;
  opacity: .8;
}

/* El punto late para que se note desde lejos que hay turno abierto: en el
   mesón nadie va a leer la barra, pero el movimiento sí se ve. */
.punto {
  width: 9px;
  height: 9px;
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

.barra-caja .btn-linea {
  border-color: currentColor;
  color: inherit;
}

.barra-caja .btn-linea:hover {
  background: var(--surface);
  color: var(--success);
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

/* ─── Catálogo ─── */

.catalogo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.busqueda {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.buscador {
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  padding: 0 12px;
  min-height: 46px;
  transition: border-color var(--t-fast);
}

.buscador:focus-within {
  border-color: var(--accent);
}

/* El campo de código va marcado: es por donde entra el escáner, y en el
   mesón conviene que se distinga del buscador de texto. */
.buscador.codigo {
  border-color: var(--accent);
  background: var(--accent-soft);
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

.buscador.codigo input {
  font-family: var(--font-mono);
  font-size: max(.85rem, 16px);
  letter-spacing: .02em;
}

.categorias {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;
}

.pastilla {
  padding: .42rem .95rem;
  border: 1px solid var(--border);
  border-radius: var(--r-full);
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  font-size: .82rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
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

.grilla {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 10px;
}

.producto {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 14px 10px;
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

.producto .emoji {
  font-size: 1.7rem;
  line-height: 1.1;
}

.producto .nombre {
  font-size: .82rem;
  font-weight: 600;
  line-height: 1.25;
  /* Dos líneas y corta: un nombre largo no puede empujar el precio fuera
     de la tarjeta. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.producto .precio {
  font-size: .95rem;
  color: var(--text);
}

.producto .stock {
  color: var(--text-faint);
}

.producto .stock.poco {
  color: var(--warn);
  font-weight: 700;
}

/* ─── Carrito ─── */

.carrito {
  position: sticky;
  top: 84px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-sm);
  padding: 16px;
  max-height: calc(100vh - 104px);
}

.carrito-cab {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.carrito-cab h3 {
  font-size: 1rem;
  font-weight: 700;
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
}

.lineas {
  flex: 1;
  overflow-y: auto;
  min-height: 80px;
  margin: 0 -4px;
  padding: 0 4px;
}

.vacio-carrito {
  text-align: center;
  padding: 28px 12px;
  color: var(--text-faint);
  font-size: .85rem;
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
  width: 30px;
  height: 30px;
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
  padding-top: 12px;
  border-top: 1px solid var(--border);
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

/* ─── Barra flotante en móvil ─── */

.flotante {
  display: none;
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom, 0));
  z-index: 30;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 56px;
  padding: 0 20px;
  border: none;
  border-radius: var(--r-full);
  background: var(--accent);
  color: var(--accent-contrast);
  font: inherit;
  font-size: .95rem;
  font-weight: 700;
  box-shadow: var(--sh-accent);
  cursor: pointer;
}

/* ═══════════════════════════════════════════════════════════
   BANDAS Y AVISOS
   ═══════════════════════════════════════════════════════════ */

.banda {
  padding: 10px 14px;
  border-radius: var(--r-sm);
  font-size: .85rem;
}

.banda-ok {
  background: var(--success-soft);
  color: var(--success);
}

.banda-error {
  background: var(--danger-soft);
  border: 1px solid var(--danger-border);
  color: var(--danger);
}

.vacio {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
  font-size: .88rem;
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-md);
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
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
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

/* ─── Ticket ─── */

.ticket {
  font-family: var(--font-mono);
  font-size: .78rem;
  line-height: 1.55;
  color: var(--text);
  background: var(--surface-2);
  border-radius: var(--r-sm);
  padding: 18px;
}

.ticket h4 {
  font-size: .95rem;
  font-weight: 700;
  margin: 4px 0 2px;
}

.ticket .logo {
  font-size: 1.6rem;
}

.ticket .atencion {
  margin-top: 10px;
  padding: 8px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-sm);
}

/* El número de atención es lo único que se lee a un metro de distancia:
   es lo que se grita en el mesón. */
.ticket .atencion b {
  display: block;
  font-size: 1.6rem;
  line-height: 1.2;
}

.ticket .sep {
  border-top: 1px dashed var(--border-strong);
  margin: 10px 0;
}

.ticket table {
  width: 100%;
  border-collapse: collapse;
}

.ticket td {
  padding: 1px 0;
}

.tot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.tot.g {
  font-size: 1rem;
  font-weight: 700;
  margin: 6px 0;
  padding: 6px 0;
  border-top: 1px solid var(--border-strong);
  border-bottom: 1px solid var(--border-strong);
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

.sep-linea {
  border-top: 1px dashed var(--border-strong);
  margin: 4px 0;
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

/* ═══════════════════════════════════════════════════════════
   IMPRESIÓN · solo el ticket
   ═══════════════════════════════════════════════════════════ */

@media print {

  .barra-caja,
  .catalogo,
  .carrito,
  .flotante,
  .aviso,
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
   RESPONSIVE
   ═══════════════════════════════════════════════════════════ */

@media (max-width: 1080px) {
  .tablero {
    grid-template-columns: 1fr 330px;
  }
}

/* El carrito pasa a ser un panel que sube desde abajo: en el mesón el
   teléfono se usa vertical, y una columna lateral de 330px no cabe. */
@media (max-width: 860px) {
  .tablero {
    grid-template-columns: 1fr;
  }

  .busqueda {
    grid-template-columns: 1fr;
  }

  .carrito {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 40;
    max-height: 86vh;
    border-radius: var(--r-lg) var(--r-lg) 0 0;
    box-shadow: var(--shadow-lg);
    transform: translateY(100%);
    transition: transform var(--t-med);
  }

  .carrito.abierto {
    transform: translateY(0);
  }

  .flotante {
    display: flex;
  }

  .grilla {
    grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
  }

  .producto .emoji {
    font-size: 1.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {

  .producto,
  .carrito,
  .aviso,
  .punto {
    transition: none;
    animation: none;
  }
}
</style>