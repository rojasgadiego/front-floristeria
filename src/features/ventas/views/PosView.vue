<template>
  <MainLayout>

    <!-- ================= SIN CAJA ================= -->
    <div v-if="!abierta" class="apertura">
      <div class="apertura-caja">
        <span class="apertura-icono" aria-hidden="true">🔒</span>
        <h2>La caja está cerrada</h2>
        <p class="pista">
          Sin caja abierta no se puede vender ni recibir abonos. Cuenta el
          fondo del cajón antes de empezar: es contra ese número que se
          calcula la diferencia al cerrar.
        </p>

        <div v-if="errorCaja" class="error">{{ errorCaja }}</div>

        <label for="fondo">Fondo inicial</label>
        <input id="fondo" class="campo grande dato" type="number" min="0" step="1000"
          v-model.number="fondoInicial" @keyup.enter="abrirCaja">

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
              <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''"
                aria-label="Limpiar">✕</button>
            </div>

            <!--
              Entrada del código: sirve para el lector de barras —que teclea
              y manda Enter— y para tipear el código del lote cuando la
              etiqueta está borrosa. El escáner de cámara reemplaza este
              campo, no lo elimina.
            -->
            <div class="buscador codigo">
              <span aria-hidden="true">🏷️</span>
              <input ref="campoCodigo" v-model="codigo" placeholder="Código de producto o lote…"
                aria-label="Código" @keyup.enter="buscarPorCodigo">
              <span v-if="buscandoCodigo" class="spinner oscuro" aria-hidden="true"></span>
            </div>
          </div>

          <div v-if="avisoCodigo" class="banda" :class="avisoCodigo.malo ? 'banda-error' : 'banda-ok'">
            <span>{{ avisoCodigo.texto }}</span>
          </div>

          <div class="categorias">
            <button class="pastilla" :class="{ on: categoriaId === null }"
              @click="categoriaId = null">Todo</button>
            <button v-for="c in categorias" :key="c.id" class="pastilla"
              :class="{ on: categoriaId === c.id }" @click="categoriaId = c.id">
              {{ c.nombre }}
            </button>
          </div>

          <div v-if="!visibles.length" class="vacio">
            {{ busqueda ? 'Ningún producto coincide.' : 'Sin productos disponibles.' }}
          </div>

          <div v-else class="grilla">
            <button v-for="p in visibles" :key="p.id" class="producto"
              :class="{ agotado: p.disponible <= 0 }" :disabled="p.disponible <= 0"
              @click="agregar(p)">
              <span class="emoji" aria-hidden="true">{{ p.emoji }}</span>
              <span class="nombre">{{ p.nombre }}</span>
              <b class="precio dato">{{ clp(p.precio) }}</b>
              <span class="stock mini" :class="{ poco: p.disponible <= 3 }">
                {{ p.disponible > 0 ? `${p.disponible} disp.` : 'agotado' }}
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

            <div v-for="l in carrito" :key="l.uid" class="linea"
              :class="{ sinStock: sinStock(l) }">
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

    <!-- Ticket -->
    <div v-if="ticket" class="fondo" @click.self="cerrarTicket">
      <div class="modal">
        <div class="modal-cab">
          <h3>Boleta {{ ticket.folio }}</h3>
          <p>Atención #{{ ticket.numeroAtencion }} · {{ hora(ticket.fecha) }}</p>
        </div>

        <div class="modal-cuerpo">
          <div class="ticket">
            <div class="cen">
              <div class="logo" aria-hidden="true">🌸</div>
              <h4>{{ ticket.localNombre }}</h4>
              <div class="chico">{{ ticket.localDireccion }}</div>
              <div v-if="ticket.localTelefono" class="chico">WhatsApp {{ ticket.localTelefono }}</div>
              <div v-if="ticket.localRut" class="chico">RUT {{ ticket.localRut }}</div>
              <div class="atencion">
                <span class="chico">TICKET DE ATENCIÓN</span>
                <b>#{{ ticket.numeroAtencion }}</b>
              </div>
            </div>
            <div class="sep"></div>
            <div>Boleta: {{ ticket.folio }}</div>
            <div>Atendió: {{ ticket.vendedor }}</div>
            <div v-if="ticket.cliente">Cliente: {{ ticket.cliente }}</div>
            <div class="sep"></div>
            <table>
              <tbody>
                <tr v-for="i in ticket.items" :key="i.id">
                  <td>{{ i.cantidad }}x {{ i.nombre }}</td>
                  <td class="der">{{ clp(i.subtotal) }}</td>
                </tr>
              </tbody>
            </table>
            <div class="sep"></div>
            <div v-if="ticket.descuentoTotal" class="tot">
              <span>{{ ticket.promocion || 'Descuentos' }}</span>
              <span>−{{ clp(ticket.descuentoTotal) }}</span>
            </div>
            <div class="tot"><span>Neto</span><span>{{ clp(ticket.neto) }}</span></div>
            <div class="tot">
              <span>IVA {{ ticket.ivaTasa }}%</span><span>{{ clp(ticket.ivaMonto) }}</span>
            </div>
            <div class="tot g"><span>TOTAL</span><span>{{ clp(ticket.total) }}</span></div>
            <div class="tot"><span>{{ ticket.medioPago }}</span><span></span></div>
            <template v-if="ticket.recibido">
              <div class="tot"><span>Recibido</span><span>{{ clp(ticket.recibido) }}</span></div>
              <div class="tot"><span>Vuelto</span><span>{{ clp(ticket.vuelto) }}</span></div>
            </template>
            <template v-if="ticket.mostrarPuntos && ticket.puntosGanados">
              <div class="sep"></div>
              <div class="tot chico">
                <span>Puntos de esta compra</span><span>{{ ticket.puntosGanados }}</span>
              </div>
              <div v-if="ticket.saldoPuntos != null" class="tot chico">
                <span>Saldo acumulado</span><span>{{ ticket.saldoPuntos }}</span>
              </div>
            </template>
            <div class="sep"></div>
            <div class="cen chico">
              <b>{{ ticket.mensaje }}</b><br>{{ ticket.leyenda }}
            </div>
          </div>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" @click="cerrarTicket">Listo</button>
          <button class="btn" @click="imprimir">🖨️ Imprimir</button>
        </div>
      </div>
    </div>

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
          <template v-if="!cierre.resumen">
            <div class="desglose">
              <div class="fila"><span>Fondo inicial</span><b class="dato">{{ clp(caja.fondoInicial) }}</b></div>
              <div class="fila"><span>Efectivo recibido</span><b class="dato">{{ clp(caja.efectivo) }}</b></div>
              <div class="fila total">
                <span>Debería haber en el cajón</span>
                <b class="dato">{{ clp(caja.enCajon) }}</b>
              </div>
              <div class="sep-linea"></div>
              <div class="fila"><span>Débito</span><b class="dato">{{ clp(caja.debito) }}</b></div>
              <div class="fila"><span>Crédito</span><b class="dato">{{ clp(caja.credito) }}</b></div>
              <div class="fila"><span>Transferencia</span><b class="dato">{{ clp(caja.transferencia) }}</b></div>
              <div class="fila">
                <span>{{ caja.boletas }} boleta(s)</span>
                <b class="dato">{{ clp(caja.totalVendido) }}</b>
              </div>
              <div v-if="caja.anuladas" class="fila rojo">
                <span>Anuladas</span><b class="dato">{{ caja.anuladas }}</b>
              </div>
            </div>

            <div class="grupo">
              <label for="contado">¿Cuánto contaste en el cajón?</label>
              <input id="contado" class="campo grande dato" type="number" min="0" step="1000"
                v-model.number="cierre.contado" @keyup.enter="cerrarCaja">
              <!--
                El esperado lo calcula el sistema desde las boletas y no se
                muestra antes de contar a propósito: si estuviera a la vista,
                la tentación de "cuadrar" el número contado haría que la
                diferencia dejara de significar algo.
              -->
              <p class="ayuda">
                Cuenta primero y después escribe. La diferencia la calcula el
                sistema.
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
  </MainLayout>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import MainLayout from '@/layouts/MainLayout.vue'
import ModalCobro from '@/features/ventas/components/Modalcobro.vue'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'

export default {
  name: 'PosView',
  components: { MainLayout, ModalCobro },

  setup () {
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
    const abrirCierre = () => { cierre.value = { contado: null, nota: '', resumen: null, error: '' } }

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
      return productos.value.filter(p => {
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

    const alCobrar = async (venta) => {
      cobrando.value = false
      carritoAbierto.value = false
      avisar(`Boleta ${venta.folio} · ${clp(venta.total)}`)
      try {
        ticket.value = await store.dispatch('ventas/ticket', { id: venta.id })
      } catch {
        /* Si el ticket falla, la venta igual quedó registrada. */
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
      store.dispatch('productos/cargar', señal)
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
.apertura *, .tablero *, .fondo * { box-sizing: border-box; }

/* ================= Apertura ================= */
.apertura {
  display: grid;
  place-items: center;
  min-height: 60vh;
  padding: 20px;
}

.apertura-caja {
  width: 100%;
  max-width: 400px;
  padding: 28px 24px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  text-align: center;
}

.apertura-icono { font-size: 2.4rem; }

.apertura h2 {
  margin: 10px 0 0;
  font-size: 1.3rem;
  color: #0f172a;
}

.apertura .pista {
  margin: 8px 0 20px;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.55;
}

.apertura label { text-align: left; }

/* ================= Barra de caja ================= */
.barra-caja {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 11px 15px;
  margin-bottom: 14px;
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 11px;
}

.caja-datos {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.caja-datos b { color: #166534; font-size: 0.92rem; }

.punto {
  width: 9px;
  height: 9px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #059669;
}

/* ================= Tablero ================= */
.tablero {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 16px;
  align-items: start;
}

/* ---------- Catálogo ---------- */
.busqueda {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.buscador {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 48px;
  padding: 0 13px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.buscador:focus-within {
  border-color: transparent;
  box-shadow: 0 0 0 2px #10b981;
}

.buscador.codigo { border-style: dashed; }

.buscador input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  font-family: inherit;
  font-size: max(0.92rem, 16px);
}

.categorias {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 13px;
}

.pastilla {
  padding: 7px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #fff;
  color: #475569;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}

.pastilla.on { background: #064e3b; border-color: #064e3b; color: #fff; }

.grilla {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 10px;
}

/* Objetivo táctil grande: en el mesón se toca con una mano y flores en la
   otra, muchas veces sin mirar del todo. */
.producto {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-height: 108px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, transform 0.08s, box-shadow 0.15s;
}

.producto:hover:not(:disabled) {
  border-color: #059669;
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.12);
}

.producto:active:not(:disabled) { transform: scale(0.97); }

.producto:disabled { opacity: 0.45; cursor: not-allowed; }

.producto .emoji { font-size: 1.5rem; }

.producto .nombre {
  font-size: 0.85rem;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.25;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.producto .precio { margin-top: auto; font-size: 1rem; color: #047857; }
.producto .stock { color: #94a3b8; }
.producto .stock.poco { color: #d97706; font-weight: 600; }

/* ---------- Carrito ---------- */
.carrito {
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 14px;
  max-height: calc(100vh - 120px);
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 15px;
}

.carrito-cab {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 11px;
}

.carrito h3 { margin: 0; font-size: 1rem; color: #0f172a; }

.cliente {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 11px;
  margin-bottom: 11px;
  background: #f8fafc;
  border-radius: 9px;
}

.cliente b { color: #0f172a; font-size: 0.88rem; }
.cliente .campo { flex: 1; }

.lineas {
  flex: 1;
  overflow-y: auto;
  min-height: 90px;
  margin: 0 -4px;
  padding: 0 4px;
}

.vacio-carrito {
  padding: 28px 10px;
  text-align: center;
  color: #94a3b8;
  font-size: 0.85rem;
}

.linea {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px dotted #e2e8f0;
}

.linea:last-child { border-bottom: 0; }
.linea b { color: #0f172a; font-size: 0.86rem; }
.linea.sinStock { background: #fef2f2; }

.cantidad {
  display: flex;
  align-items: center;
  gap: 4px;
}

.paso {
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  background: #fff;
  color: #475569;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}

.paso:hover { border-color: #059669; color: #047857; }

.cantidad span {
  min-width: 26px;
  text-align: center;
  font-size: 0.92rem;
}

.subtotal { grid-column: 2; text-align: right; font-size: 0.88rem; }

.promos { margin-top: 11px; }

.promos label {
  font-size: 0.63rem;
  margin-bottom: 4px;
}

.resumen {
  margin-top: 12px;
  padding: 11px 12px;
  background: #f8fafc;
  border-radius: 9px;
}

.resumen .fila {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 3px 0;
  font-size: 0.84rem;
  color: #64748b;
}

.resumen .fila.verde { color: #047857; }

.resumen .fila.total {
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
  color: #0f172a;
  font-weight: 700;
}

.resumen .fila.total b { font-size: 1.2rem; }

.carrito .btn { margin-top: 12px; }

/* Barra flotante en móvil */
.flotante {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: max(16px, env(safe-area-inset-bottom));
  z-index: 50;
  display: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 56px;
  padding: 0 18px;
  border: none;
  border-radius: 12px;
  background: #064e3b;
  color: #fff;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
  cursor: pointer;
}

/* ================= Ticket ================= */
.ticket {
  width: 270px;
  margin: 0 auto;
  padding: 14px;
  background: #fff;
  color: #000;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.68rem;
  line-height: 1.45;
  border: 1px solid #e2e8f0;
}

.ticket .cen { text-align: center; }
.ticket .logo { font-size: 1.5rem; }

.ticket h4 {
  margin: 4px 0 2px;
  font-size: 0.8rem;
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.ticket .chico { font-size: 0.6rem; }
.ticket .sep { border-top: 1px dashed #000; margin: 7px 0; }

.ticket .atencion {
  border: 1px solid #000;
  padding: 4px;
  margin: 6px 0;
}

.ticket .atencion b { display: block; font-size: 1.15rem; }
.ticket table { width: 100%; border-collapse: collapse; }
.ticket td { padding: 2px 0; font-size: 0.64rem; vertical-align: top; }
.ticket .der { text-align: right; }
.ticket .tot { display: flex; justify-content: space-between; }

.ticket .tot.g {
  font-size: 0.88rem;
  font-weight: 700;
  border-top: 1px solid #000;
  margin-top: 4px;
  padding-top: 4px;
}

/* ================= Cierre ================= */
.desglose {
  padding: 12px 14px;
  background: #f8fafc;
  border-radius: 10px;
  margin-bottom: 16px;
}

.desglose .fila {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 0;
  font-size: 0.85rem;
  color: #64748b;
}

.desglose .fila.total {
  margin-top: 5px;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
  color: #0f172a;
  font-weight: 700;
}

.desglose .fila.rojo { color: #dc2626; }
.sep-linea { height: 1px; background: #e2e8f0; margin: 9px 0; }

.resultado-cierre {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.resultado-cierre .rot {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.resultado-cierre .val { font-size: 2rem; font-variant-numeric: tabular-nums; }

.resultado-cierre.cuadrada { background: #f0fdf4; color: #166534; }
.resultado-cierre.sobrante { background: #fffbeb; color: #78350f; }
.resultado-cierre.faltante { background: #fee2e2; color: #991b1b; }

/* ================= Comunes ================= */
.campo {
  width: 100%;
  min-height: 46px;
  padding: 0.6rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: #fff;
  font-family: inherit;
  font-size: max(0.92rem, 16px);
  color: #0f172a;
  outline: none;
}

.campo:focus {
  border-color: transparent;
  box-shadow: 0 0 0 2px #10b981;
}

.campo.chico { min-height: 40px; padding: 0.4rem 0.6rem; font-size: max(0.85rem, 16px); }

.campo.grande {
  min-height: 60px;
  font-size: 1.6rem;
  font-weight: 700;
  text-align: right;
  margin-bottom: 14px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #475569;
}

.grupo { margin-bottom: 16px; }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 46px;
  padding: 0.65rem 1.15rem;
  border: none;
  border-radius: 0.5rem;
  background: #059669;
  color: #fff;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:hover:not(:disabled) { background: #047857; }
.btn:disabled { background: #a7c9bb; cursor: not-allowed; }
.btn.grande { min-height: 54px; font-size: 1.05rem; }
.btn.ancho { width: 100%; }

.btn-linea {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #475569;
}

.btn-linea:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }

.btn-mini { min-height: 38px; padding: 0.35rem 0.8rem; font-size: 0.82rem; }

.btn-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
}

.btn-icono:hover { border-color: #dc2626; color: #dc2626; }
.btn-icono.chico { width: 28px; height: 28px; }

.enlace-boton {
  padding: 0;
  border: none;
  background: none;
  color: #059669;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.spinner {
  display: inline-block;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: girar 0.8s linear infinite;
}

.spinner.oscuro {
  border-color: rgba(71, 85, 105, 0.25);
  border-top-color: #475569;
}

@keyframes girar { to { transform: rotate(360deg); } }

.banda {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-radius: 10px;
  margin-bottom: 12px;
  font-size: 0.85rem;
  line-height: 1.5;
}

.banda-ok { background: #f0fdf4; border: 1px solid #86efac; color: #166534; }
.banda-error { background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; }

.error {
  padding: 11px 13px;
  margin-bottom: 15px;
  border-radius: 8px;
  border-left: 4px solid #dc2626;
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.86rem;
  text-align: left;
}

.ayuda {
  margin: 7px 0 0;
  font-size: 0.76rem;
  color: #94a3b8;
  line-height: 1.5;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

.vacio {
  padding: 40px 20px;
  text-align: center;
  color: #64748b;
  background: #fff;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
}

.dato { font-variant-numeric: tabular-nums; font-weight: 600; }
.mini { font-size: 0.76rem; }
.suave { color: #64748b; }
.rojo { color: #dc2626; }
.min0 { min-width: 0; }

/* Modales */
.fondo {
  position: fixed;
  inset: 0;
  z-index: 65;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.6);
}

.modal {
  width: 100%;
  max-width: 440px;
  max-height: 92vh;
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
}

.modal-cab { padding: 18px 20px 14px; border-bottom: 1px solid #e2e8f0; }
.modal-cab h3 { margin: 0; font-size: 1.15rem; color: #0f172a; }
.modal-cab p { margin: 4px 0 0; font-size: 0.82rem; color: #64748b; }
.modal-cuerpo { padding: 18px 20px; overflow-y: auto; }

.modal-pie {
  display: flex;
  gap: 9px;
  justify-content: flex-end;
  padding: 14px 20px;
  border-top: 1px solid #e2e8f0;
}

.aviso {
  position: fixed;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 80;
  max-width: 90vw;
  padding: 12px 20px;
  border-radius: 10px;
  background: #064e3b;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
  text-align: center;
}

.aviso.malo { background: #b91c1c; }

/* ================= Móvil ================= */
@media (max-width: 900px) {
  .tablero { grid-template-columns: 1fr; }
  .busqueda { grid-template-columns: 1fr; }

  /* El carrito pasa a ser una hoja que sube desde abajo: en el mesón la
     pantalla se usa vertical y el catálogo necesita todo el alto. */
  .carrito {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 55;
    max-height: 80vh;
    max-height: 80dvh;
    border-radius: 16px 16px 0 0;
    border-bottom: 0;
    box-shadow: 0 -12px 34px rgba(0, 0, 0, 0.18);
    transform: translateY(100%);
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
    padding-bottom: max(15px, env(safe-area-inset-bottom));
  }

  .carrito.abierto { transform: translateY(0); }

  .flotante { display: flex; }

  .grilla { grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); }
}

@media (prefers-reduced-motion: reduce) {
  .btn, .producto, .pastilla, .buscador, .carrito { transition: none; }
  .spinner { animation: none; }
}

/* Al imprimir el ticket, el resto de la pantalla estorba */
@media print {
  .modal-cab, .modal-pie { display: none; }
  .ticket { border: 0; }
}
</style>