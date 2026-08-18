<template>
  <div class="inv">

    <!-- ═══ CABECERA ═══ -->
    <div class="cabecera">
      <div class="min0">
        <h2>Inventario</h2>
        <p class="pista">
          {{ puedeEditar
            ? 'Lo que hay en cámara. Entra recibiendo compras, sale vendiendo o mermando.'
            : 'Tu rol permite consultar el inventario, no modificarlo.' }}
        </p>
      </div>
      <button v-if="puedeEditar" class="btn" @click="abrirNuevo">＋ Nuevo producto</button>
    </div>

    <!-- ═══ PESTAÑAS ═══ -->
    <div class="segmentado tabs" role="tablist">
      <button role="tab" :aria-selected="vista === 'productos'"
              :class="{ on: vista === 'productos' }" @click="irA('productos')">
        Productos
      </button>
      <button role="tab" :aria-selected="vista === 'movimientos'"
              :class="{ on: vista === 'movimientos' }" @click="irA('movimientos')">
        Movimientos
      </button>
    </div>

    <div v-if="error" class="banda banda-error">
      <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      <button class="btn btn-mini" @click="recargar">Reintentar</button>
    </div>

    <!-- ═══════════════ PRODUCTOS ═══════════════ -->
    <template v-if="vista === 'productos'">

      <!-- Indicadores · solo administración -->
      <div v-if="esAdmin" class="kpis">
        <div class="kpi destacado">
          <div class="rot">Inventario a costo</div>
          <div class="val">{{ clp(valorInventario) }}</div>
          <div class="pie">{{ (varasEnCamara || 0).toLocaleString('es-CL') }} varas en total</div>
        </div>
        <div class="kpi">
          <div class="rot">Productos en catálogo</div>
          <div class="val">{{ total }}</div>
          <div class="pie">{{ filtro.activo === null ? 'Incluye desactivados' : 'Solo activos' }}</div>
        </div>
        <div class="kpi" :class="{ alerta: bajoMinimo.length }">
          <div class="rot">Hay que comprar</div>
          <div class="val">{{ bajoMinimo.length }}</div>
          <div class="pie">{{ bajoMinimo.length ? 'Bajo el mínimo en bodega' : 'Todo abastecido' }}</div>
        </div>
        <div class="kpi" :class="{ alerta: criticos.length }">
          <div class="rot">Lotes críticos</div>
          <div class="val">{{ criticos.length }}</div>
          <div class="pie">{{ criticos.length ? 'Vencidos o por liquidar' : 'Sin vencimientos cerca' }}</div>
        </div>
      </div>

      <div v-if="bajoMinimo.length" class="banda banda-aviso">
        <span aria-hidden="true">📦</span>
        <span>Hay que reponer en bodega:
          <b>{{ bajoMinimo.slice(0, 8).map(p => p.nombre).join(', ') }}</b>
          <span v-if="bajoMinimo.length > 8"> y {{ bajoMinimo.length - 8 }} más</span>
        </span>
      </div>

      <!-- Filtros -->
      <div class="barra-filtros">
        <div class="buscador">
          <span aria-hidden="true">🔎</span>
          <input v-model="busqueda" placeholder="Buscar por nombre o código…" aria-label="Buscar producto">
          <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
        </div>

        <div class="segmentado">
          <button v-for="t in FILTRO_TIPOS" :key="String(t.valor)"
                  :class="{ on: filtro.tipo === t.valor }" @click="filtrar({ tipo: t.valor })">
            {{ t.texto }}
          </button>
        </div>

        <select class="campo campo-corto" :value="filtro.categoriaId ?? ''"
                @change="filtrar({ categoriaId: $event.target.value ? Number($event.target.value) : null })"
                aria-label="Categoría">
          <option value="">Todas las categorías</option>
          <option v-for="c in categorias" :key="c.id" :value="c.id">
            {{ c.nombre }} ({{ c.productos }})
          </option>
        </select>

        <label class="check">
          <input type="checkbox" :checked="filtro.bajoMinimo"
                 @change="filtrar({ bajoMinimo: $event.target.checked })">
          <span>Solo bajo mínimo</span>
        </label>

        <label class="check">
          <input type="checkbox" :checked="filtro.activo === null"
                 @change="filtrar({ activo: $event.target.checked ? null : true })">
          <span>Ver desactivados</span>
        </label>
      </div>

      <!-- Tabla -->
      <div v-if="cargando && !productos.length" class="vacio">Cargando catálogo…</div>

      <div v-else-if="!productos.length" class="vacio">
        <strong>{{ hayFiltro ? 'Ningún producto coincide' : 'Catálogo vacío' }}</strong>
        {{ hayFiltro ? 'Prueba con otro texto o quita los filtros.' : 'Crea el primer producto para empezar.' }}
      </div>

      <div v-else class="tabla-envoltura" :class="{ atenuada: cargando }">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th class="der">Costo</th>
              <th class="der">Precio</th>
              <th class="der">Margen</th>
              <th class="der col-bodega">En bodega</th>
              <th class="der col-venta">En venta</th>
              <th class="der">Mínimo</th>
              <th class="acciones-col"></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(p, idx) in productos" :key="p.id">
              <tr class="fila" :style="{ '--i': Math.min(idx, 12) }"
                  :class="{ inactiva: !p.activo, abierta: abierto === p.id, resaltada: p.id === resalte.id }">

                <td data-label="Producto">
                  <div class="celda-producto">
                    <span class="emoji" aria-hidden="true">{{ p.emoji }}</span>
                    <div class="min0">
                      <div class="nombre">
                        {{ p.nombre }}
                        <span class="etiqueta" :class="p.tipo === 'armado' ? 'et-rosa' : 'et-verde'">
                          {{ p.tipo }}
                        </span>
                        <span v-if="p.controlaLotes" class="etiqueta et-azul"
                              title="Las existencias entran por lote y se venden desde el mostrador">
                          lotes
                        </span>
                        <span v-if="!p.activo" class="etiqueta et-gris">desactivado</span>
                      </div>
                      <button class="ver-mas" :class="{ abierta: abierto === p.id }" @click="alternar(p)">
                        <span class="flecha" aria-hidden="true">▾</span>
                        {{ p.tipo === 'armado' ? 'receta y precios' : 'precios y lotes' }}
                      </button>
                    </div>
                  </div>
                </td>

                <td data-label="Categoría" class="suave">{{ p.categoria }}</td>
                <td data-label="Costo" class="der dato">{{ clp(p.costoUnitario) }}</td>
                <td data-label="Precio" class="der dato">{{ clp(p.precio) }}</td>
                <td data-label="Margen" class="der dato">
                  <span :class="p.margenPorcentaje < 25 ? 'margen-bajo' : 'margen-ok'">
                    {{ Number(p.margenPorcentaje).toFixed(0) }}%
                  </span>
                </td>

                <!--
                  Las dos cifras que importan. Antes había una sola columna
                  llamada «Disponible», y desde que existe el mostrador esa
                  palabra dejó de significar «lo que se puede vender».
                -->
                <td data-label="En bodega" class="der col-bodega">
                  <div class="dato" :class="claseBodega(p)">{{ p.enBodega ?? 0 }}</div>
                  <div v-if="p.tipo === 'armado'" class="desglose">
                    +{{ p.posiblesDeArmar || 0 }} por armar
                  </div>
                </td>

                <td data-label="En venta" class="der col-venta">
                  <div class="dato" :class="{ 'stock-cero': !p.enVenta }">{{ p.enVenta ?? 0 }}</div>
                  <!-- Solo tiene sentido en lo que se controla por lote: un
                       jarrón se vende del estante y nunca pasa por el mostrador. -->
                  <div v-if="p.controlaLotes && !p.enVenta && p.enBodega"
                       class="desglose aviso-bajar">sin bajar</div>
                </td>

                <td data-label="Mínimo" class="der dato suave">{{ p.minimo }}</td>

                <td class="der acciones-col">
                  <div class="acciones">
                    <!--
                      Ya no hay ajuste manual: el stock entra recibiendo una
                      compra y sale vendiendo o mermando. Corregir un descuadre
                      es un conteo físico, y eso vive en el mostrador.
                    -->
                    <button v-if="puedeTraspasar && p.controlaLotes && p.enBodega > 0"
                            class="btn-icono" title="Bajar al mostrador" @click="abrirTraspaso(p)">↓</button>
                    <button v-if="puedeEditar && p.tipo === 'armado'"
                            class="btn-icono" title="Armar unidades" @click="armando = p">🧰</button>
                    <button v-if="puedeEditar" class="btn-icono" title="Editar" @click="abrirEdicion(p)">✏️</button>
                    <button v-if="puedeEditar && p.activo" class="btn-icono peligro"
                            title="Dar de baja" @click="abrirBaja(p)">🗑️</button>
                    <button v-if="puedeEditar && !p.activo" class="btn btn-linea btn-mini"
                            @click="cambiarEstado(p, true)">Reactivar</button>
                    <span v-if="!puedeEditar" class="suave mini">solo lectura</span>
                  </div>
                </td>
              </tr>

              <!-- Detalle: los tres precios, la receta y las partidas -->
              <tr v-if="abierto === p.id" class="fila-detalle">
                <td colspan="9">
                  <div class="detalle">
                    <div v-if="cargandoDetalle === p.id" class="suave mini">Cargando…</div>

                    <template v-else>
                      <div class="precios">
                        <div>
                          <span>Suelto</span>
                          <b class="dato">{{ clp(p.precio) }}</b>
                          <small>en vitrina, flor de primera</small>
                        </div>
                        <div v-if="p.tipo === 'simple'">
                          <span>Dentro de un ramo</span>
                          <b class="dato">{{ p.precioEnReceta ? clp(p.precioEnReceta) : '—' }}</b>
                          <small>{{ p.precioEnReceta ? 'con el que se costea el armado' : 'sin definir: usa el suelto' }}</small>
                        </div>
                        <div>
                          <span>Liquidación</span>
                          <b class="dato" :class="{ rojo: p.precioLiquidacion }">
                            {{ p.precioLiquidacion ? clp(p.precioLiquidacion) : '—' }}
                          </b>
                          <small>{{ p.precioLiquidacion ? 'pasado de fecha o devuelto' : 'sin definir' }}</small>
                        </div>
                      </div>

                      <div v-if="p.tipo === 'armado' && recetaDe(p.id).length" class="receta">
                        <b class="titulo-mini">Receta</b>
                        <ul>
                          <li v-for="ing in recetaDe(p.id)" :key="ing.productoId">
                            {{ ing.cantidad }} × {{ ing.emoji }} {{ ing.nombre }}
                            <span class="suave">
                              — {{ clp(ing.subtotal) }} · alcanza para {{ ing.alcanzaPara }}
                            </span>
                          </li>
                        </ul>
                        <p v-if="p.precioSugerido" class="ayuda">
                          Precio sugerido por la receta: <b class="dato">{{ clp(p.precioSugerido) }}</b>.
                          <span v-if="p.precioSugerido > p.precio" class="rojo">
                            Estás cobrando menos de lo que cuesta según ficha.
                          </span>
                        </p>
                      </div>

                      <p v-else-if="p.tipo === 'armado'" class="ayuda">
                        Sin ingredientes. Un ramo sin receta no se puede armar ni costear.
                      </p>
                    </template>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <p v-if="totalPaginas > 1" class="paginador">
        <button class="btn btn-linea btn-mini" :disabled="filtro.pagina <= 1"
                @click="filtrar({ pagina: filtro.pagina - 1 })">Anterior</button>
        <span class="mini suave">Página {{ filtro.pagina }} de {{ totalPaginas }} · {{ total }} productos</span>
        <button class="btn btn-linea btn-mini" :disabled="filtro.pagina >= totalPaginas"
                @click="filtrar({ pagina: filtro.pagina + 1 })">Siguiente</button>
      </p>
    </template>

    <!-- ═══════════════ MOVIMIENTOS ═══════════════ -->
    <section v-else class="movimientos">
      <div class="barra-filtros">
        <select v-if="esAdmin" class="campo campo-corto" v-model="usuarioMovimientos"
                @change="cargarMovimientos" aria-label="Filtrar por usuario">
          <option value="">Todos los usuarios</option>
          <option v-for="u in usuariosConMovimientos" :key="u" :value="u">{{ u }}</option>
        </select>
        <p v-else class="pista">Aquí ves solo los movimientos que registraste tú.</p>

        <button class="btn btn-linea btn-mini" @click="cargarMovimientos">Actualizar</button>
      </div>

      <div v-if="!movimientosVisibles.length" class="vacio">
        <strong>Sin movimientos</strong>
        {{ esAdmin ? 'Todavía no hay movimientos registrados.' : 'No has registrado movimientos todavía.' }}
      </div>

      <div v-else class="tabla-envoltura">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Dónde</th>
              <th>Producto</th>
              <th>Lote</th>
              <th class="der">Cantidad</th>
              <th>Motivo</th>
              <th v-if="esAdmin">Usuario</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in movimientosVisibles" :key="m.id" class="fila">
              <td data-label="Fecha" class="dato mini">{{ fechaHora(m.fecha) }}</td>
              <td data-label="Tipo">
                <span class="etiqueta" :class="claseMovimiento(m.tipo)">{{ m.tipo }}</span>
              </td>
              <td data-label="Dónde">
                <span class="etiqueta" :class="m.ubicacion === 'venta' ? 'et-rosa' : 'et-gris'">
                  {{ m.ubicacion === 'venta' ? 'mostrador' : 'bodega' }}
                </span>
              </td>
              <td data-label="Producto">{{ m.producto }}</td>
              <td data-label="Lote" class="mini suave">{{ m.loteCodigo || '—' }}</td>
              <td data-label="Cantidad" class="der dato" :class="{ negativo: m.cantidad < 0 }">
                {{ m.cantidad > 0 ? '+' : '' }}{{ m.cantidad }}
              </td>
              <td data-label="Motivo" class="suave">{{ m.motivo }}</td>
              <td v-if="esAdmin" data-label="Usuario" class="suave mini">{{ m.usuario || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ═══ MODAL DE ARMADO ═══ -->
    <ModalArmado v-if="armando" :producto="armando" @cerrar="armando = null" @armado="alArmar" />

    <!-- ═══ MODAL DE TRASPASO ═══ -->
    <div v-if="traspaso" class="fondo" @click.self="traspaso = null">
      <div class="modal">
        <div class="modal-cab">
          <h3>Bajar al mostrador</h3>
          <p>{{ traspaso.producto.nombre }}</p>
        </div>
        <div class="modal-cuerpo">
          <div v-if="traspaso.error" class="error">{{ traspaso.error }}</div>
          <div class="nota">
            Hay <b class="dato">{{ traspaso.producto.enBodega }}</b> en bodega y
            <b class="dato">{{ traspaso.producto.enVenta || 0 }}</b> adelante.
          </div>
          <div class="grupo">
            <label for="t-cant">Cantidad</label>
            <input id="t-cant" ref="campoTraspaso" class="campo dato" type="number"
                   min="1" :max="traspaso.producto.enBodega" v-model.number="traspaso.cantidad">
            <p class="ayuda">Sale primero lo que vence antes.</p>
          </div>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="traspaso = null">Cancelar</button>
          <button class="btn" :disabled="guardando" @click="confirmarTraspaso">
            {{ guardando ? 'Bajando…' : 'Bajar' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import ModalArmado from '@/features/inventario/components/ModalArmado.vue'
import { claseMovimiento } from '@/features/inventario/store/inventario.module'
import { inventarioVentaService } from '@/features/inventario/services/inventarioVenta.service'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'

const FILTRO_TIPOS = [
  { valor: null, texto: 'Todos' },
  { valor: 'simple', texto: 'Simples' },
  { valor: 'armado', texto: 'Armados' }
]

export default {
  name: 'InventarioView',
  components: { ModalArmado },

  setup () {
    const store = useStore()
    const { usarResalte, usarAviso } = useTemporizadores()

    const esAdmin = computed(() => store.getters['auth/esAdmin'])
    const puedeEditar = computed(() => store.getters['auth/tieneRol']('admin', 'bodega'))
    // Bajar mercadería define cuánto puede vender el equipo: es decisión de
    // administración, igual que en la vista del mostrador.
    const puedeTraspasar = computed(() => esAdmin.value)

    /* ---------------- Datos ---------------- */
    const productos = computed(() => store.getters['productos/productos'])
    const total = computed(() => store.getters['productos/total'])
    const totalPaginas = computed(() => store.getters['productos/totalPaginas'])
    const filtro = computed(() => store.getters['productos/filtro'])
    const cargando = computed(() => store.getters['productos/cargando'])
    const cargandoDetalle = computed(() => store.getters['productos/cargandoDetalle'])
    const error = computed(() => store.getters['productos/error'])
    const hayFiltro = computed(() => store.getters['productos/hayFiltro'])
    const recetaDe = (id) => store.getters['productos/recetaDe'](id)

    const categorias = computed(() => store.getters['inventario/categorias'])
    const bajoMinimo = computed(() => store.getters['inventario/bajoMinimo'])
    const movimientos = computed(() => store.getters['inventario/movimientos'])

    const valorInventario = computed(() => store.getters['lotes/valorInventario'])
    const varasEnCamara = computed(() => store.getters['lotes/varasEnCamara'])
    const criticos = computed(() => store.getters['lotes/criticos'])

    /* ---------------- Carga ---------------- */
    let control = null

    onMounted(() => {
      control = new AbortController()
      const señal = { signal: control.signal }

      store.dispatch('productos/cargar', señal)
      store.dispatch('inventario/cargarCategorias', señal)
      store.dispatch('inventario/cargarBajoMinimo', señal)

      // Solo alimentan los KPI, que son exclusivos de administración: pedirlos
      // con otro rol serían dos llamadas que responden 403.
      if (esAdmin.value) {
        store.dispatch('lotes/cargarCostoPromedio', señal)
        store.dispatch('lotes/cargarAlertas', señal)
      }
    })

    onUnmounted(() => control?.abort())

    const recargar = () => store.dispatch('productos/cargar')
    const filtrar = (cambios) => store.dispatch('productos/filtrar', cambios)

    /* La búsqueda viaja al servidor, así que lleva retraso: una petición por
       tecla sería una de más por cada letra. */
    const busqueda = ref(filtro.value.buscar || '')
    let tmr = null
    watch(busqueda, (v) => {
      clearTimeout(tmr)
      tmr = setTimeout(() => filtrar({ buscar: v.trim() }), 350)
    })
    onUnmounted(() => clearTimeout(tmr))

    /* ---------------- Vista y detalle ---------------- */
    const vista = ref('productos')
    const abierto = ref(null)

    const alternar = (p) => {
      if (abierto.value === p.id) { abierto.value = null; return }
      abierto.value = p.id
      // La lista no trae la receta: solo el detalle la incluye.
      if (p.tipo === 'armado') store.dispatch('productos/cargarDetalle', { id: p.id })
    }

    /* ---------------- Movimientos ---------------- */
    const usuarioMovimientos = ref('')
    const yo = computed(() => store.getters['auth/currentUser'] || {})

    /*
     * Este filtro es de presentación, no de seguridad: el endpoint devuelve ya
     * recortado según el token. Existe para que la interfaz sea coherente y
     * como red por si algún día el servidor manda de más.
     */
    const cargarMovimientos = () =>
      store.dispatch('inventario/cargarMovimientos', {
        usuario: esAdmin.value ? (usuarioMovimientos.value || null) : (yo.value.id ?? yo.value.email)
      })

    const irA = (destino) => {
      vista.value = destino
      if (destino === 'movimientos') cargarMovimientos()
    }

    /* Comparar por id es lo correcto; el nombre es el plan B mientras el DTO
       no traiga usuarioId. Dos personas pueden llamarse igual. */
    const esMio = (m) => {
      if (m.usuarioId != null && yo.value.id != null) return m.usuarioId === yo.value.id
      const suyo = String(m.usuario || '').trim().toLowerCase()
      const mio = String(yo.value.name || yo.value.email || '').trim().toLowerCase()
      return !!suyo && suyo === mio
    }

    const movimientosVisibles = computed(() =>
      esAdmin.value ? movimientos.value : movimientos.value.filter(esMio)
    )

    const usuariosConMovimientos = computed(() =>
      [...new Set(movimientos.value.map(m => m.usuario).filter(Boolean))].sort()
    )

    /* ---------------- Traspaso ---------------- */
    const traspaso = ref(null)
    const guardando = ref(false)
    const campoTraspaso = ref(null)

    const abrirTraspaso = (producto) => {
      traspaso.value = {
        producto,
        cantidad: Math.min(25, producto.enBodega),
        error: ''
      }
      nextTick(() => campoTraspaso.value?.select())
    }

    const confirmarTraspaso = async () => {
      const t = traspaso.value
      t.error = ''

      if (!t.cantidad || t.cantidad < 1) return (t.error = 'La cantidad debe ser al menos 1.')
      if (t.cantidad > t.producto.enBodega) {
        return (t.error = `Solo hay ${t.producto.enBodega} en bodega.`)
      }

      guardando.value = true
      try {
        const partidas = await inventarioVentaService.traspasar({
          productoId: t.producto.id,
          cantidad: t.cantidad
        })
        // Pedir 100 puede vaciar un lote y empezar otro: se dice, para que no
        // sorprenda ver dos partidas donde se esperaba una.
        avisar(partidas.length > 1
          ? `${t.cantidad} al mostrador, en ${partidas.length} partidas`
          : `${t.cantidad} de ${t.producto.nombre} al mostrador`)
        traspaso.value = null
        recargar()
      } catch (e) {
        t.error = e.message
      } finally {
        guardando.value = false
      }
    }

    /* ---------------- Acciones del catálogo ---------------- */
    const armando = ref(null)
    const resalte = usarResalte()
    const { aviso, avisar } = usarAviso()

    const cambiarEstado = async (p, activo) => {
      try {
        await store.dispatch('productos/cambiarEstado', { id: p.id, activo })
        avisar(`${p.nombre} ${activo ? 'reactivado' : 'desactivado'}`)
        resalte.marcar(p.id)
      } catch (e) {
        avisar(e.message, true)
      }
    }

    const alArmar = (resultado) => {
      armando.value = null
      avisar(`${resultado.armadas} unidad(es) · costo ${clp(resultado.costoProduccion)}`)
      resalte.marcar(resultado.productoId)
      recargar()
    }

    // Los abre el componente de formulario, que vive aparte
    const abrirNuevo = () => store.dispatch('productos/abrirFormulario', null)
    const abrirEdicion = (p) => store.dispatch('productos/abrirFormulario', p.id)
    const abrirBaja = (p) => store.dispatch('productos/abrirBaja', p.id)

    /* ---------------- Formato ---------------- */
    const claseBodega = (p) => {
      if (!p.enBodega) return 'stock-cero'
      if (p.enBodega <= p.minimo) return 'stock-bajo'
      return ''
    }

    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    const fmtFecha = new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
    const fechaHora = (v) => (v ? fmtFecha.format(new Date(v)) : '—')

    return {
      FILTRO_TIPOS, Math, claseMovimiento,
      esAdmin, puedeEditar, puedeTraspasar,
      productos, total, totalPaginas, filtro, cargando, cargandoDetalle, error, hayFiltro,
      categorias, bajoMinimo, valorInventario, varasEnCamara, criticos,
      recetaDe, recargar, filtrar, busqueda,
      vista, irA, abierto, alternar,
      usuarioMovimientos, usuariosConMovimientos, movimientosVisibles, cargarMovimientos,
      traspaso, guardando, campoTraspaso, abrirTraspaso, confirmarTraspaso,
      armando, alArmar, cambiarEstado, abrirNuevo, abrirEdicion, abrirBaja,
      resalte, aviso, claseBodega, clp, fechaHora
    }
  }
}
</script>

<style scoped>
.inv { display: flex; flex-direction: column; gap: 16px; }
.min0 { min-width: 0; }

/* --- Cabecera --- */
.cabecera {
  display: flex; justify-content: space-between; align-items: flex-end;
  gap: 16px; flex-wrap: wrap;
}
.cabecera h2 {
  margin: 0; font-size: clamp(1.25rem, 4.5vw, 1.5rem);
  letter-spacing: -.02em; color: var(--text);
}
.pista { margin: 4px 0 0; font-size: .875rem; color: var(--text-muted); }

.tabs { align-self: flex-start; }

/* --- Botones --- */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  min-height: 44px; padding: .65rem 1.15rem; border: none;
  border-radius: var(--r-sm, 8px); background: var(--accent);
  color: var(--accent-contrast, #fff); font: inherit; font-size: .92rem;
  font-weight: 600; cursor: pointer; transition: background-color .2s;
  -webkit-tap-highlight-color: transparent;
}
.btn:hover:not(:disabled) { background: var(--accent-hover, var(--accent)); }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.btn-linea {
  background: transparent; border: 1px solid var(--border-strong); color: var(--text-muted);
}
.btn-linea:hover:not(:disabled) { background: var(--surface-2); color: var(--text); }
.btn-mini { min-height: 34px; padding: .35rem .75rem; font-size: .8rem; }

.btn-icono {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  width: 34px; height: 34px; padding: 0; border: 1px solid var(--border);
  border-radius: 7px; background: var(--surface); color: var(--text-muted);
  font: inherit; font-size: .9rem; cursor: pointer;
  transition: border-color .15s, color .15s;
}
.btn-icono:hover { border-color: var(--accent); color: var(--accent-text, var(--accent)); }
.btn-icono.peligro:hover { border-color: var(--danger); color: var(--danger); }
.btn-icono.chico { width: 30px; height: 30px; }

.btn:focus-visible, .btn-icono:focus-visible,
.ver-mas:focus-visible, .segmentado button:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 2px;
}

/* --- KPIs --- */
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 13px; }
.kpi {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-md, 12px); padding: 16px;
}
.kpi .rot {
  font-size: .68rem; font-weight: 700; letter-spacing: .08em;
  text-transform: uppercase; color: var(--text-faint);
}
.kpi .val {
  font-size: clamp(1.3rem, 5vw, 1.6rem); font-weight: 700; margin-top: 5px;
  letter-spacing: -.02em; font-variant-numeric: tabular-nums; color: var(--text);
}
.kpi .pie { font-size: .75rem; color: var(--text-muted); margin-top: 3px; }
.kpi.destacado { background: var(--accent); border-color: var(--accent); color: var(--accent-contrast, #fff); }
.kpi.destacado .val { color: inherit; }
.kpi.destacado .rot { color: color-mix(in srgb, var(--accent-contrast) 72%, transparent); }
.kpi.destacado .pie { color: color-mix(in srgb, var(--accent-contrast) 85%, transparent); }
.kpi.alerta .val { color: var(--danger); }

/* --- Bandas --- */
.banda {
  display: flex; align-items: center; gap: 11px; flex-wrap: wrap;
  padding: 12px 16px; border-radius: var(--r-sm, 10px); font-size: .875rem;
}
.banda-aviso { background: var(--warn-soft); border: 1px solid var(--warn-border, transparent); color: var(--warn); }
.banda-error { background: var(--danger-soft); border: 1px solid var(--danger-border, transparent); color: var(--danger); }
.banda .btn { margin-left: auto; }

/* --- Filtros --- */
.barra-filtros { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }

.buscador {
  display: flex; align-items: center; gap: 9px; flex: 1 1 240px; min-width: 0;
  background: var(--surface); border: 1px solid var(--border-strong);
  border-radius: 9px; padding: 0 12px; min-height: 44px; color: var(--text);
  transition: border-color .18s, box-shadow .18s;
}
.buscador:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
}
.buscador input {
  flex: 1; min-width: 0; border: 0; outline: 0; background: none;
  color: var(--text); font: inherit; font-size: max(.9rem, 16px);
}
.buscador input::placeholder { color: var(--text-faint); }

.campo {
  width: 100%; min-height: 44px; padding: .6rem .75rem;
  border: 1px solid var(--border-strong); border-radius: var(--r-sm, 8px);
  background: var(--surface); color: var(--text); font: inherit;
  font-size: max(.9rem, 16px); outline: none;
  transition: border-color .18s, box-shadow .18s;
}
.campo:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
}
.campo-corto { width: auto; flex: 0 1 210px; }

.segmentado {
  display: inline-flex; background: var(--surface-2);
  border-radius: 9px; padding: 3px; gap: 3px;
}
.segmentado button {
  flex: 1; min-height: 38px; padding: .4rem .9rem; border: none;
  border-radius: 7px; background: transparent; color: var(--text-muted);
  font: inherit; font-size: .85rem; font-weight: 600; cursor: pointer;
  white-space: nowrap; transition: background-color .18s, color .18s;
}
.segmentado button.on {
  background: var(--surface); color: var(--accent-text, var(--accent));
  box-shadow: var(--shadow-sm);
}

/* Es un <label>: sin esto hereda la regla global y se ve como un título */
.check {
  display: inline-flex; align-items: center; gap: 7px; margin-bottom: 0;
  font-size: .85rem; font-weight: 500; text-transform: none; letter-spacing: 0;
  color: var(--text-muted); cursor: pointer;
}
.check input { width: 17px; height: 17px; accent-color: var(--accent); cursor: pointer; }

/* --- Tabla --- */
.tabla-envoltura {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-md, 12px); overflow: auto;
  overscroll-behavior-x: contain; max-height: min(65vh, 720px);
  transition: opacity .14s ease;
}
.tabla-envoltura.atenuada { opacity: .45; }

table {
  width: 100%; min-width: 980px;
  border-collapse: separate; border-spacing: 0;
}

th {
  position: sticky; top: 0; z-index: 2; text-align: left;
  padding: 11px 14px; background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  font-size: .68rem; font-weight: 700; letter-spacing: .07em;
  text-transform: uppercase; color: var(--text-muted); white-space: nowrap;
}

td {
  padding: 11px 14px; border-bottom: 1px solid var(--border);
  font-size: .875rem; color: var(--text); vertical-align: middle;
}
tbody tr:last-child td { border-bottom: 0; }
tr.inactiva { opacity: .5; }
.fila td { transition: background-color .16s ease; }
.fila:hover td { background: color-mix(in srgb, var(--accent) 4%, var(--surface)); }
.fila.abierta td { background: var(--surface-2); }

/* Las dos columnas que llevan la decisión, separadas del resto */
.col-bodega { border-left: 1px solid var(--border); }
.col-venta {
  border-right: 1px solid var(--border);
  background: color-mix(in srgb, var(--accent) 3%, transparent);
}

.der { text-align: right; }
.suave { color: var(--text-muted); }
.mini { font-size: .78rem; }
.dato { font-variant-numeric: tabular-nums; font-weight: 600; }
.negativo { color: var(--danger); }

.celda-producto { display: flex; align-items: flex-start; gap: 10px; }
.celda-producto .emoji { font-size: 1.25rem; line-height: 1.2; flex-shrink: 0; }

.nombre {
  font-weight: 600; color: var(--text); display: flex;
  align-items: center; gap: 6px; flex-wrap: wrap;
}

.ver-mas {
  display: inline-flex; align-items: center; gap: 4px; margin-top: 2px;
  padding: 0; border: none; background: none;
  color: var(--accent-text, var(--accent)); font: inherit;
  font-size: .72rem; font-weight: 600; cursor: pointer; text-decoration: underline;
}
.flecha { display: inline-block; transition: transform .26s cubic-bezier(.22,1,.36,1); }
.ver-mas.abierta .flecha { transform: rotate(180deg); }

.desglose { font-size: .7rem; color: var(--text-faint); margin-top: 2px; white-space: nowrap; }
.aviso-bajar { color: var(--warn); font-weight: 600; }

.stock-cero { color: var(--danger); }
.stock-bajo { color: var(--warn); }
.margen-ok { color: var(--success); }
.margen-bajo { color: var(--warn); }
.rojo { color: var(--danger); }

.etiqueta {
  display: inline-block; padding: 2px 8px; border-radius: var(--r-full, 999px);
  font-size: .62rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .04em; white-space: nowrap;
}
.et-verde { background: var(--success-soft); color: var(--success); }
.et-rosa  { background: var(--accent-soft);  color: var(--accent-text, var(--accent)); }
.et-ambar { background: var(--warn-soft);    color: var(--warn); }
.et-gris  { background: var(--surface-2);    color: var(--text-muted); }
.et-azul  { background: var(--info-soft);    color: var(--info); }
.et-rojo  { background: var(--danger-soft);  color: var(--danger); }

.acciones { display: flex; gap: 5px; justify-content: flex-end; align-items: center; }
.acciones-col { width: 1%; white-space: nowrap; }

/* --- Detalle --- */
.fila-detalle td { background: var(--surface-2); }
.detalle { padding: 6px 0 10px; display: flex; flex-direction: column; gap: 14px; }

.precios { display: flex; flex-wrap: wrap; gap: 28px; }
.precios > div { display: flex; flex-direction: column; gap: 2px; }
.precios span {
  font-size: .62rem; font-weight: 700; letter-spacing: .06em;
  text-transform: uppercase; color: var(--text-faint);
}
.precios b { font-size: 1.05rem; color: var(--text); }
.precios small { font-size: .72rem; color: var(--text-faint); }

.titulo-mini { font-size: .8rem; }
.receta ul { margin: 6px 0 0; padding-left: 20px; line-height: 1.7; font-size: .82rem; }
.ayuda { margin: 8px 0 0; font-size: .78rem; color: var(--text-faint); line-height: 1.5; }

.paginador {
  display: flex; align-items: center; justify-content: center;
  gap: 14px; margin: 0; color: var(--text-muted);
}

/* --- Vacío --- */
.vacio {
  text-align: center; padding: 44px 20px; color: var(--text-muted);
  background: var(--surface); border: 1px dashed var(--border-strong);
  border-radius: var(--r-md, 12px);
}
.vacio strong { display: block; color: var(--text); font-size: 1.05rem; margin-bottom: 5px; }

/* --- Modal --- */
.fondo {
  position: fixed; inset: 0; z-index: 60; display: grid; place-items: center;
  padding: 16px; background: rgba(0,0,0,.5);
}
.modal {
  width: 100%; max-width: 440px; max-height: 90dvh; display: flex; flex-direction: column;
  background: var(--surface); color: var(--text); border: 1px solid var(--border);
  border-radius: var(--r-lg, 14px); box-shadow: var(--shadow-lg);
}
.modal-cab { padding: 18px 20px 14px; border-bottom: 1px solid var(--border); }
.modal-cab h3 { margin: 0; font-size: 1.1rem; }
.modal-cab p { margin: 4px 0 0; font-size: .82rem; color: var(--text-muted); }
.modal-cuerpo { padding: 18px 20px; overflow-y: auto; }
.modal-pie {
  display: flex; gap: 9px; justify-content: flex-end; flex-wrap: wrap;
  padding: 14px 20px; border-top: 1px solid var(--border);
}
label {
  display: block; margin-bottom: 5px; font-size: .68rem; font-weight: 700;
  letter-spacing: .07em; text-transform: uppercase; color: var(--text-muted);
}
.grupo { margin-top: 14px; }
.nota {
  padding: 10px 13px; border-radius: 0 var(--r-sm, 8px) var(--r-sm, 8px) 0;
  border-left: 3px solid var(--accent); background: var(--accent-soft);
  font-size: .85rem; line-height: 1.5;
}
.error {
  padding: 10px 13px; margin-bottom: 14px; border-radius: var(--r-sm, 8px);
  border-left: 4px solid var(--danger); background: var(--danger-soft);
  color: var(--danger); font-size: .85rem;
}

/* --- Aviso --- */
.aviso {
  position: fixed; bottom: max(22px, env(safe-area-inset-bottom)); left: 50%;
  transform: translateX(-50%); z-index: 80; max-width: 90vw;
  padding: 12px 20px; border-radius: var(--r-sm, 10px);
  background: var(--text); color: var(--bg);
  font-size: .875rem; font-weight: 600; box-shadow: var(--shadow-lg); text-align: center;
}
.aviso.malo { background: var(--danger); color: var(--surface); }

/* ============================================================
   MÓVIL · cada fila es una tarjeta
   ============================================================ */
@media (max-width: 860px) {
  .tabla-envoltura {
    border: none; background: transparent; overflow: visible; max-height: none;
  }

  table, thead, tbody, tr, td { display: block; width: 100%; min-width: 0; }
  thead { display: none; }

  tbody tr {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg, 14px); box-shadow: var(--shadow-sm);
    margin-bottom: 12px; padding: 14px 16px;
  }
  tbody tr.fila-detalle { background: var(--surface-2); box-shadow: none; }

  td {
    display: flex; justify-content: space-between; align-items: baseline;
    gap: 14px; padding: 9px 0; border: none;
    border-bottom: 1px solid var(--border); text-align: right;
  }
  tbody tr td:last-child { border-bottom: none; }

  td::before {
    content: attr(data-label) ":";
    font-size: .8rem; font-weight: 500; letter-spacing: 0; text-transform: none;
    color: var(--text-muted); text-align: left; flex-shrink: 0; white-space: nowrap;
  }

  td:not([data-label]) { display: block; padding-bottom: 0; }
  td:not([data-label])::before { content: none; }

  td[data-label="Producto"] {
    display: block; text-align: left; padding: 0 0 12px;
    margin-bottom: 4px; border-bottom: 1px solid var(--border);
  }
  td[data-label="Producto"]::before { content: none; }
  td[data-label="Producto"] .nombre { font-size: 1rem; font-weight: 700; letter-spacing: -.01em; }
  td[data-label="Producto"] .celda-producto .emoji { font-size: 1.5rem; }

  /* Las dos cifras que llevan la decisión, destacadas también en la tarjeta */
  td[data-label="En bodega"] .dato,
  td[data-label="En venta"] .dato { font-size: 1.05rem; }
  .col-bodega, .col-venta { border: none; background: transparent; }
  td[data-label="En bodega"], td[data-label="En venta"] { flex-wrap: wrap; }
  .desglose { width: 100%; text-align: right; white-space: normal; }

  .acciones-col { width: 100%; white-space: normal; }
  .acciones {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    padding-top: 12px; justify-content: stretch; width: 100%;
  }
  .acciones > * { width: 100%; min-width: 0; }
  .acciones > *:nth-child(odd):last-child { grid-column: 1 / -1; }

  .btn-icono {
    width: 100%; height: auto; min-height: 44px; padding: 0 12px;
    font-size: .85rem; font-weight: 600;
  }
  /* El texto sale del title, que ya está en el template */
  .btn-icono[title]::after { content: attr(title); font-size: .85rem; font-weight: 600; }
  .btn-icono.peligro {
    border-color: color-mix(in srgb, var(--danger) 35%, transparent); color: var(--danger);
  }

  .fila-detalle td { display: block; padding: 0; border: none; }
  .precios { gap: 16px; }
  .precios > div { flex: 1 1 45%; }

  .segmentado { width: 100%; }
  .tabs { align-self: stretch; }
  .campo-corto { flex: 1 1 100%; width: 100%; }
  .buscador { flex: 1 1 100%; }
  .cabecera { align-items: stretch; }
  .cabecera .btn { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .btn, .btn-icono, .campo, .buscador, .flecha,
  .segmentado button, .tabla-envoltura, .fila td { transition: none; }
  .tabla-envoltura.atenuada { opacity: 1; }
}
</style>