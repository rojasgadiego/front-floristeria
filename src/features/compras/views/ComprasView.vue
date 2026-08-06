<template>
  <MainLayout>

    <div class="cabecera al-entrar">
      <div>
        <h2>Compras</h2>
        <p class="pista">
          La única puerta por la que entra flor al inventario. Recibir una
          compra genera los lotes con su vencimiento y su costo por vara.
        </p>
      </div>
      <button v-if="puedeEditar" class="btn" @click="abrirNueva">＋ Nueva compra</button>
    </div>

    <div v-if="error" class="banda banda-error">
      <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      <button class="btn btn-mini" @click="recargar">Reintentar</button>
    </div>

    <div v-if="borradores.length" class="banda banda-aviso">
      <span aria-hidden="true">📋</span>
      <span>
        {{ borradores.length }} compra(s) en borrador sin recibir.
        Mientras no se reciban, esa flor no existe en el inventario.
      </span>
    </div>

    <!-- ---------- Filtros ---------- -->
    <div class="barra-filtros al-entrar" style="--i: 2">
      <div class="buscador">
        <span aria-hidden="true">🔎</span>
        <input v-model="busqueda" placeholder="Folio, documento o proveedor…" aria-label="Buscar compra">
        <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
      </div>

      <select class="campo campo-corto" :value="filtro.estado ?? ''"
        @change="filtrar({ estado: $event.target.value || null })" aria-label="Estado">
        <option value="">Todos los estados</option>
        <option value="borrador">Borradores</option>
        <option value="recibida">Recibidas</option>
        <option value="anulada">Anuladas</option>
      </select>

      <select class="campo campo-corto" :value="filtro.proveedorId ?? ''"
        @change="filtrar({ proveedorId: $event.target.value ? Number($event.target.value) : null })"
        aria-label="Proveedor">
        <option value="">Todos los proveedores</option>
        <option v-for="p in proveedores" :key="p.id" :value="p.id">{{ p.nombre }}</option>
      </select>

      <label class="rango">
        <span class="mini suave">Desde</span>
        <input class="campo campo-fecha" type="date" :value="filtro.desde"
          @change="filtrar({ desde: $event.target.value || null })">
      </label>
      <label class="rango">
        <span class="mini suave">Hasta</span>
        <input class="campo campo-fecha" type="date" :value="filtro.hasta"
          @change="filtrar({ hasta: $event.target.value || null })">
      </label>
    </div>

    <!-- ---------- Listado ---------- -->
    <div v-if="cargando && !compras.length" class="vacio">Cargando compras…</div>

    <div v-else-if="!compras.length" class="vacio">
      <strong>Sin compras registradas</strong>
      Crea la primera para que entre flor al inventario.
    </div>

    <div v-else class="tabla-envoltura" :class="{ atenuada: cargando }">
      <table>
        <thead>
          <tr>
            <th>Folio</th>
            <th>Proveedor</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th class="der">Líneas</th>
            <th class="der">Varas</th>
            <th class="der">Total</th>
            <th class="acciones-col"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(c, ix) in compras" :key="c.id">
            <tr class="fila clic" :style="{ '--i': Math.min(ix, 12) }"
              :class="{ anulada: c.estado === 'anulada', abierta: abierta === c.id, resaltada: c.id === resalte.id }"
              @click="alternarDetalle(c.id)">
              <td data-label="Folio">
                <b>{{ c.folio }}</b>
                <div v-if="c.documento" class="detalle-linea">Doc. {{ c.documento }}</div>
              </td>
              <td data-label="Proveedor">{{ c.proveedor }}</td>
              <td data-label="Fecha" class="dato mini">{{ fecha(c.fecha) }}</td>
              <td data-label="Estado">
                <span class="etiqueta" :class="claseEstado(c.estado)">{{ textoEstado(c.estado) }}</span>
              </td>
              <td data-label="Líneas" class="der dato">{{ c.lineas }}</td>
              <td data-label="Varas" class="der dato">{{ c.varasTotales }}</td>
              <td data-label="Total" class="der dato">{{ clp(c.total) }}</td>
              <td class="der acciones-col">
                <span class="flecha" aria-hidden="true">▾</span>
              </td>
            </tr>

            <tr v-if="abierta === c.id" class="fila-detalle">
              <td colspan="8">
                <div class="detalle">
                  <div v-if="!detalleDe(c.id)" class="suave mini">Cargando detalle…</div>

                  <template v-else>
                    <table class="interna">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Presentación</th>
                          <th class="der">Cant.</th>
                          <th class="der">Costo unit.</th>
                          <th class="der">Varas</th>
                          <th class="der">Por vara</th>
                          <th class="der">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="it in detalleDe(c.id).items" :key="it.id">
                          <td data-label="Producto">{{ it.emoji }} {{ it.producto }}</td>
                          <td data-label="Presentación" class="suave mini">{{ it.presentacion }}</td>
                          <td data-label="Cant." class="der dato">{{ it.cantidad }}</td>
                          <td data-label="Costo unit." class="der dato">{{ clp(it.costoUnitario) }}</td>
                          <td data-label="Varas" class="der dato">{{ it.varasTotales }}</td>
                          <td data-label="Por vara" class="der dato">
                            {{ clp(it.costoPorVara) }}
                            <!-- Lo que se pagó la vez pasada por el mismo
                                 producto: la comparación que importa. -->
                            <div v-if="it.costoAnterior" class="mini"
                              :class="it.costoPorVara > it.costoAnterior ? 'rojo' : 'verde'">
                              antes {{ clp(it.costoAnterior) }}
                            </div>
                          </td>
                          <td data-label="Subtotal" class="der dato">{{ clp(it.subtotal) }}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div class="totales">
                      <div><span>Neto</span><b class="dato">{{ clp(detalleDe(c.id).neto) }}</b></div>
                      <div><span>IVA</span><b class="dato">{{ clp(detalleDe(c.id).iva) }}</b></div>
                      <div><span>Total</span><b class="dato grande">{{ clp(detalleDe(c.id).total) }}</b></div>
                    </div>

                    <div v-if="detalleDe(c.id).lotes.length" class="lotes">
                      <h4>Lotes generados</h4>
                      <div class="chips">
                        <span v-for="l in detalleDe(c.id).lotes" :key="l.id" class="chip">
                          <b>{{ l.codigo }}</b> · {{ l.producto }} · {{ l.varas }} varas
                          <span v-if="l.fechaVencimiento" class="suave">
                            · vence {{ fecha(l.fechaVencimiento) }}
                          </span>
                        </span>
                      </div>
                    </div>

                    <p v-if="detalleDe(c.id).notas" class="notas">“{{ detalleDe(c.id).notas }}”</p>

                    <div v-if="puedeEditar" class="acciones-detalle">
                      <template v-if="c.estado === 'borrador'">
                        <button class="btn btn-linea btn-mini" @click.stop="abrirEdicion(c)">
                          ✏️ Editar
                        </button>
                        <button class="btn btn-mini" @click.stop="abrirRecepcion(c)">
                          📦 Recibir mercadería
                        </button>
                        <button class="btn btn-linea btn-mini" @click.stop="anular(c)">
                          Anular
                        </button>
                      </template>
                      <p v-else-if="c.estado === 'recibida'" class="mini suave">
                        Recibida el {{ fechaHora(c.recibidaEn) }}. Para revertirla hay que
                        registrar la merma de sus lotes como devolución al proveedor.
                      </p>
                    </div>
                  </template>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <p v-if="totalPaginas > 1" class="paginador">
      <button class="btn btn-linea btn-mini" :disabled="!hayAnterior"
        @click="filtrar({ pagina: filtro.pagina - 1 })">Anterior</button>
      <span class="mini suave">Página {{ filtro.pagina }} de {{ totalPaginas }}</span>
      <button class="btn btn-linea btn-mini" :disabled="!haySiguiente"
        @click="filtrar({ pagina: filtro.pagina + 1 })">Siguiente</button>
    </p>

    <!-- ================= MODALES ================= -->
    <div v-if="modal" class="fondo" @click.self="cerrarModal">

      <!-- Crear / editar compra -->
      <div v-if="modal.tipo === 'compra'" class="modal ancho">
        <div class="modal-cab">
          <h3>{{ modal.f.id ? `Editar ${modal.f.folio}` : 'Nueva compra' }}</h3>
          <p>Queda en borrador. La flor entra al inventario recién al recibirla.</p>
        </div>

        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <div class="rejilla grupo">
            <div>
              <label for="c-prov">Proveedor</label>
              <select id="c-prov" class="campo" v-model.number="modal.f.proveedorId">
                <option :value="null">Selecciona…</option>
                <option v-for="p in proveedoresActivos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
              </select>
            </div>
            <div>
              <label for="c-fecha">Fecha</label>
              <input id="c-fecha" class="campo dato" type="date" v-model="modal.f.fecha">
            </div>
          </div>

          <div class="rejilla grupo">
            <div>
              <label for="c-doc">N° de factura o guía</label>
              <input id="c-doc" class="campo dato" v-model="modal.f.documento" maxlength="60">
            </div>
            <div>
              <label for="c-iva">IVA del documento (%)</label>
              <input id="c-iva" class="campo dato" type="number" min="0" max="100" step="1"
                v-model.number="modal.f.ivaTasa">
            </div>
          </div>

          <!-- ---------- Líneas ---------- -->
          <label>Líneas de la compra</label>
          <div class="constructor">
            <div v-if="!modal.f.items.length" class="constructor-vacio">
              Sin líneas. Agrega al menos un producto.
            </div>

            <div v-for="(l, i) in modal.f.items" :key="l.uid" class="linea">
              <div class="linea-cab">
                <b class="crece">{{ nombreProducto(l.productoId) }}</b>
                <button class="btn-icono chico" @click="modal.f.items.splice(i, 1)"
                  aria-label="Quitar línea">✕</button>
              </div>

              <div class="linea-campos">
                <div>
                  <label :for="`l-pres-${l.uid}`">Presentación</label>
                  <select :id="`l-pres-${l.uid}`" class="campo chico" v-model.number="l.presentacionId">
                    <option :value="null">Selecciona…</option>
                    <option v-for="p in presentacionesDe(l.productoId)" :key="p.id" :value="p.id">
                      {{ p.nombre }} — {{ p.varasTotales }} varas
                    </option>
                  </select>
                  <button class="enlace-boton" @click="abrirPresentacion(l.productoId)">
                    ＋ Nueva presentación
                  </button>
                </div>

                <div>
                  <label :for="`l-cant-${l.uid}`">Cantidad</label>
                  <input :id="`l-cant-${l.uid}`" class="campo chico dato" type="number" min="1"
                    v-model.number="l.cantidad">
                </div>

                <div>
                  <!--
                    Lo que cuesta UNA caja o UN paquete, no una vara. Pedir el
                    costo por vara obligaría a dividir mentalmente en cada
                    recepción, y ahí es donde se cuelan los errores.
                  -->
                  <label :for="`l-costo-${l.uid}`">Costo por {{ tipoDe(l) }}</label>
                  <input :id="`l-costo-${l.uid}`" class="campo chico dato" type="number" min="0" step="500"
                    v-model.number="l.costoUnitario">
                </div>
              </div>

              <div class="linea-calculo">
                <span>{{ varasDe(l) }} varas</span>
                <span class="sep" aria-hidden="true">·</span>
                <b class="dato">{{ clp(costoPorVaraDe(l)) }} por vara</b>
                <span v-if="anteriorDe(l.productoId)" class="mini"
                  :class="costoPorVaraDe(l) > anteriorDe(l.productoId) ? 'rojo' : 'verde'">
                  (la vez pasada, {{ clp(anteriorDe(l.productoId)) }})
                </span>
                <b class="dato subtotal">{{ clp(subtotalDe(l)) }}</b>
              </div>
            </div>
          </div>

          <div class="grupo">
            <label for="c-add">Agregar producto</label>
            <select id="c-add" class="campo"
              @change="agregarLinea($event.target.value); $event.target.value = ''">
              <option value="">Selecciona un producto…</option>
              <option v-for="p in comprables" :key="p.id" :value="p.id">
                {{ p.emoji }} {{ p.nombre }}
              </option>
            </select>
            <p class="ayuda">
              Solo productos simples: un ramo no se compra, se arma.
            </p>
          </div>

          <div class="grupo">
            <label for="c-notas">Notas</label>
            <input id="c-notas" class="campo" v-model="modal.f.notas" maxlength="600">
          </div>

          <div class="totales">
            <div><span>Neto</span><b class="dato">{{ clp(neto) }}</b></div>
            <div><span>IVA {{ modal.f.ivaTasa }}%</span><b class="dato">{{ clp(iva) }}</b></div>
            <div><span>Total</span><b class="dato grande">{{ clp(totalCompra) }}</b></div>
            <div><span>Varas</span><b class="dato">{{ varasTotales }}</b></div>
          </div>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" @click="cerrarModal">Cancelar</button>
          <button class="btn" :disabled="guardando" @click="guardarCompra">
            <span v-if="guardando" class="spinner" aria-hidden="true"></span>
            {{ guardando ? 'Guardando…' : 'Guardar borrador' }}
          </button>
        </div>
      </div>

      <!-- Nueva presentación -->
      <div v-else-if="modal.tipo === 'presentacion'" class="modal">
        <div class="modal-cab">
          <h3>Nueva presentación</h3>
          <p>{{ nombreProducto(modal.f.productoId) }}</p>
        </div>
        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <div class="grupo">
            <label for="pr-nom">Nombre</label>
            <input id="pr-nom" class="campo" v-model="modal.f.nombre" maxlength="120"
              placeholder="Caja de 12 paquetes">
          </div>

          <div class="grupo">
            <label>Tipo</label>
            <div class="segmentado ancho-total">
              <button v-for="t in TIPOS_PRESENTACION" :key="t.valor"
                :class="{ on: modal.f.tipo === t.valor }" @click="modal.f.tipo = t.valor">
                {{ t.texto }}
              </button>
            </div>
          </div>

          <div class="rejilla grupo">
            <div>
              <label for="pr-paq">Paquetes que trae</label>
              <input id="pr-paq" class="campo dato" type="number" min="1" max="1000"
                v-model.number="modal.f.paquetes">
            </div>
            <div>
              <label for="pr-var">Varas por paquete</label>
              <input id="pr-var" class="campo dato" type="number" min="1"
                v-model.number="modal.f.varasPorPaquete">
            </div>
          </div>

          <label class="interruptor">
            <input type="checkbox" v-model="modal.f.predeterminada">
            <span>Usar por defecto para este producto</span>
          </label>

          <div class="nota">
            Equivale a <b class="dato">{{ (modal.f.paquetes || 0) * (modal.f.varasPorPaquete || 0) }}</b> varas.
            <br>
            <span class="mini">
              La equivalencia depende de la especie —25 por paquete en rosas, 10 en
              maule—, por eso vive en el producto y no como una constante del sistema.
            </span>
          </div>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="volverACompra">Cancelar</button>
          <button class="btn" @click="guardarPresentacion">Crear</button>
        </div>
      </div>

      <!-- Confirmar recepción -->
      <div v-else-if="modal.tipo === 'recibir'" class="modal">
        <div class="modal-cab">
          <h3>Recibir {{ modal.f.compra.folio }}</h3>
          <p>{{ modal.f.compra.proveedor }}</p>
        </div>
        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <p class="parrafo">
            Entran <b>{{ modal.f.compra.varasTotales }}</b> varas en
            {{ modal.f.compra.lineas }} lote(s), cada uno con su código QR, su
            vencimiento y su costo por vara.
          </p>

          <div class="nota alerta">
            <b>Esto no se deshace.</b> Una compra recibida no se anula: para
            revertirla hay que registrar la merma de sus lotes indicando
            devolución al proveedor.
          </div>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="cerrarModal">Cancelar</button>
          <button class="btn" :disabled="guardando" @click="confirmarRecepcion">
            <span v-if="guardando" class="spinner" aria-hidden="true"></span>
            {{ guardando ? 'Recibiendo…' : 'Recibir e ingresar' }}
          </button>
        </div>
      </div>

      <!-- Resultado: etiquetas -->
      <div v-else-if="modal.tipo === 'recibida'" class="modal">
        <div class="modal-cab">
          <h3>Mercadería ingresada</h3>
          <p>{{ recepcion.lotesGenerados }} lote(s) · {{ recepcion.varasIngresadas }} varas</p>
        </div>
        <div class="modal-cuerpo">
          <div class="chips">
            <span v-for="l in recepcion.lotes" :key="l.id" class="chip">
              <b>{{ l.codigo }}</b> · {{ l.producto }} · {{ l.varas }} varas
              <span v-if="l.fechaVencimiento" class="suave">· vence {{ fecha(l.fechaVencimiento) }}</span>
            </span>
          </div>

          <div class="nota">
            El paso siguiente es imprimir las etiquetas y pegarlas
            <b>antes</b> de meter los paquetes a la cámara. Un lote sin etiqueta
            no se puede escanear al vender.
          </div>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="cerrarRecepcion">Después</button>
          <button class="btn" @click="irAEtiquetas">Imprimir etiquetas</button>
        </div>
      </div>
    </div>

    <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
  </MainLayout>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'
import { textoEstado, claseEstado } from '@/features/compras/store/compras.module'
import { TIPOS_PRESENTACION } from '@/features/compras/store/presentaciones.module'
import { aDateOnly, hoy } from '@/core/utils/fechas'

export default {
  name: 'ComprasView',
  components: { MainLayout },

  setup () {
    const store = useStore()
    const router = useRouter()
    const { usarResalte, usarAviso } = useTemporizadores()

    const puedeEditar = computed(() => store.getters['auth/tieneRol']('admin', 'bodega'))

    /* ---------------- Datos ---------------- */
    const compras = computed(() => store.getters['compras/compras'])
    const filtro = computed(() => store.getters['compras/filtro'])
    const totalPaginas = computed(() => store.getters['compras/totalPaginas'])
    const hayAnterior = computed(() => store.getters['compras/hayAnterior'])
    const haySiguiente = computed(() => store.getters['compras/haySiguiente'])
    const cargando = computed(() => store.getters['compras/cargando'])
    const guardando = computed(() => store.getters['compras/guardando'])
    const error = computed(() => store.getters['compras/error'])
    const borradores = computed(() => store.getters['compras/borradores'])
    const recepcion = computed(() => store.getters['compras/recepcion'])
    const detalleDe = (id) => store.getters['compras/detalleDe'](id)

    const proveedores = computed(() => store.getters['proveedores/proveedores'])
    const proveedoresActivos = computed(() => store.getters['proveedores/activos'])

    /* Un ramo no se compra, se arma: solo productos simples. */
    const comprables = computed(() => store.getters['productos/simples'])
    const nombreProducto = (id) =>
      store.getters['productos/porId'](id)?.nombre || `Producto #${id}`

    const presentacionesDe = (id) => store.getters['presentaciones/activasDe'](id)

    /* ---------------- Carga ---------------- */
    let control = null

    onMounted(() => {
      control = new AbortController()
      const señal = { signal: control.signal }
      store.dispatch('compras/cargar', señal)
      store.dispatch('proveedores/cargar', señal)
      if (!store.getters['productos/productos'].length) {
        store.dispatch('productos/cargar', señal)
      }
    })

    onUnmounted(() => control?.abort())

    const recargar = () => store.dispatch('compras/cargar')
    const filtrar = (cambios) => store.dispatch('compras/filtrar', cambios)

    const busqueda = ref(filtro.value.buscar || '')
    let tmr = null
    watch(busqueda, (v) => {
      clearTimeout(tmr)
      tmr = setTimeout(() => filtrar({ buscar: v.trim() }), 350)
    })
    onUnmounted(() => clearTimeout(tmr))

    /* ---------------- Detalle ---------------- */
    const abierta = ref(null)

    const alternarDetalle = (id) => {
      if (abierta.value === id) {
        abierta.value = null
        return
      }
      abierta.value = id
      store.dispatch('compras/cargarDetalle', { id })
    }

    /* ---------------- Costo anterior ----------------
     * Lo que se pagó la vez pasada por vara, mostrado mientras se escribe el
     * precio. Es la comparación que importa en el momento en que se toma la
     * decisión, no después en un reporte. Cacheado por producto. */
    const anteriores = ref({})

    const anteriorDe = (productoId) => anteriores.value[productoId] ?? null

    const traerAnterior = async (productoId) => {
      if (productoId in anteriores.value) return
      try {
        const historial = await store.dispatch('compras/evolucionCosto', { productoId })
        anteriores.value = {
          ...anteriores.value,
          [productoId]: historial?.[0]?.costoPorVara ?? null
        }
      } catch {
        anteriores.value = { ...anteriores.value, [productoId]: null }
      }
    }

    /* ---------------- Modales ---------------- */
    const modal = ref(null)
    const resalte = usarResalte()
    const { aviso, avisar } = usarAviso()

    const cerrarModal = () => { modal.value = null }

    let contador = 0
    const nuevaLinea = (productoId, presentacionId) => ({
      uid: ++contador, productoId, presentacionId, cantidad: 1, costoUnitario: 0
    })

    const abrirNueva = () => {
      modal.value = {
        tipo: 'compra',
        f: {
          id: null, folio: '', proveedorId: null, fecha: hoy(),
          documento: '', notas: '', ivaTasa: 19, items: [], error: ''
        }
      }
    }

    const abrirEdicion = async (c) => {
      const d = await store.dispatch('compras/cargarDetalle', { id: c.id })
      for (const it of d.items) {
        store.dispatch('presentaciones/cargar', { productoId: it.productoId })
        traerAnterior(it.productoId)
      }
      modal.value = {
        tipo: 'compra',
        f: {
          id: d.id, folio: d.folio, proveedorId: d.proveedorId,
          fecha: aDateOnly(d.fecha), documento: d.documento || '',
          notas: d.notas || '', ivaTasa: 19,
          items: d.items.map(it => ({
            uid: ++contador,
            productoId: it.productoId,
            presentacionId: it.presentacionId,
            cantidad: it.cantidad,
            costoUnitario: it.costoUnitario
          })),
          error: ''
        }
      }
    }

    const agregarLinea = async (valor) => {
      if (!valor) return
      const productoId = Number(valor)

      await store.dispatch('presentaciones/cargar', { productoId })
      traerAnterior(productoId)

      const pre = store.getters['presentaciones/predeterminadaDe'](productoId)
      modal.value.f.items.push(nuevaLinea(productoId, pre?.id ?? null))

      if (!pre) {
        modal.value.f.error =
          `${nombreProducto(productoId)} no tiene presentaciones. Crea una antes de seguir.`
      }
    }

    /* ---------------- Cálculos de línea ---------------- */
    const presentacionDe = (l) =>
      presentacionesDe(l.productoId).find(p => p.id === l.presentacionId) || null

    const tipoDe = (l) => presentacionDe(l)?.tipo || 'unidad'
    const varasDe = (l) => (presentacionDe(l)?.varasTotales || 0) * (l.cantidad || 0)

    const costoPorVaraDe = (l) => {
      const varas = presentacionDe(l)?.varasTotales || 0
      return varas ? (l.costoUnitario || 0) / varas : 0
    }

    const subtotalDe = (l) => (l.costoUnitario || 0) * (l.cantidad || 0)

    const neto = computed(() =>
      (modal.value?.f?.items || []).reduce((t, l) => t + subtotalDe(l), 0)
    )

    const iva = computed(() =>
      Math.round(neto.value * ((modal.value?.f?.ivaTasa || 0) / 100))
    )

    const totalCompra = computed(() => neto.value + iva.value)

    const varasTotales = computed(() =>
      (modal.value?.f?.items || []).reduce((t, l) => t + varasDe(l), 0)
    )

    /* ---------------- Presentación ---------------- */
    let compraEnEspera = null

    const abrirPresentacion = (productoId) => {
      compraEnEspera = modal.value.f
      modal.value = {
        tipo: 'presentacion',
        f: {
          productoId, nombre: '', tipo: 'paquete',
          paquetes: 1, varasPorPaquete: 25, predeterminada: true, error: ''
        }
      }
    }

    const volverACompra = () => {
      modal.value = { tipo: 'compra', f: compraEnEspera }
    }

    const guardarPresentacion = async () => {
      const f = modal.value.f
      f.error = ''
      if (!f.nombre.trim() || f.nombre.trim().length < 2) {
        return (f.error = 'El nombre debe tener al menos 2 caracteres.')
      }
      if (!f.varasPorPaquete || f.varasPorPaquete < 1) {
        return (f.error = 'Indica cuántas varas trae cada paquete.')
      }

      try {
        const creada = await store.dispatch('presentaciones/crear', {
          productoId: f.productoId,
          nombre: f.nombre.trim(),
          tipo: f.tipo,
          paquetes: f.paquetes || 1,
          varasPorPaquete: f.varasPorPaquete,
          predeterminada: f.predeterminada
        })

        /* Se asigna a las líneas de ese producto que quedaron sin
           presentación, que es justo por lo que se abrió este modal. */
        compraEnEspera.items
          .filter(l => l.productoId === f.productoId && !l.presentacionId)
          .forEach(l => { l.presentacionId = creada.id })

        compraEnEspera.error = ''
        volverACompra()
        avisar('Presentación creada')
      } catch (e) {
        f.error = e.message
      }
    }

    /* ---------------- Guardar compra ---------------- */
    const guardarCompra = async () => {
      const f = modal.value.f
      f.error = ''

      if (!f.proveedorId) return (f.error = 'Elige el proveedor.')
      if (!f.items.length) return (f.error = 'La compra necesita al menos una línea.')
      if (f.items.some(l => !l.presentacionId)) {
        return (f.error = 'Falta la presentación en alguna línea.')
      }
      if (f.items.some(l => !l.cantidad || l.cantidad < 1)) {
        return (f.error = 'Todas las cantidades deben ser al menos 1.')
      }

      const peticion = {
        proveedorId: f.proveedorId,
        fecha: f.fecha || null,
        documento: (f.documento || '').trim() || null,
        notas: (f.notas || '').trim() || null,
        ivaTasa: f.ivaTasa,
        items: f.items.map(l => ({
          productoId: l.productoId,
          presentacionId: l.presentacionId,
          cantidad: Math.round(l.cantidad),
          costoUnitario: Math.round(l.costoUnitario || 0)
        }))
      }

      try {
        const compra = f.id
          ? await store.dispatch('compras/actualizar', { id: f.id, ...peticion })
          : await store.dispatch('compras/crear', peticion)
        cerrarModal()
        avisar(`Compra ${compra.folio} guardada en borrador`)
        resalte.marcar(compra.id)
      } catch (e) {
        f.error = e.message
      }
    }

    /* ---------------- Recepción ---------------- */
    const abrirRecepcion = (c) => {
      modal.value = { tipo: 'recibir', f: { compra: c, error: '' } }
    }

    const confirmarRecepcion = async () => {
      const f = modal.value.f
      f.error = ''
      try {
        await store.dispatch('compras/recibir', f.compra.id)
        modal.value = { tipo: 'recibida', f: {} }
      } catch (e) {
        f.error = e.message
      }
    }

    const cerrarRecepcion = () => {
      store.dispatch('compras/limpiarRecepcion')
      cerrarModal()
    }

    const irAEtiquetas = () => {
      const id = recepcion.value.compraId
      store.dispatch('compras/limpiarRecepcion')
      cerrarModal()
      router.push({ name: 'EtiquetasCompra', params: { compraId: id } })
    }

    const anular = async (c) => {
      try {
        await store.dispatch('compras/anular', c.id)
        avisar(`Compra ${c.folio} anulada`)
      } catch (e) {
        avisar(e.message, true)
      }
    }

    /* ---------------- Utilidades ---------------- */
    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    const fmtFecha = new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: '2-digit', year: '2-digit'
    })
    const fecha = (v) => (v ? fmtFecha.format(new Date(v)) : '—')

    const fmtHora = new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
    const fechaHora = (v) => (v ? fmtHora.format(new Date(v)) : '—')

    return {
      TIPOS_PRESENTACION, Math, textoEstado, claseEstado,
      puedeEditar,
      compras, filtro, totalPaginas, hayAnterior, haySiguiente,
      cargando, guardando, error, borradores, recepcion, detalleDe,
      proveedores, proveedoresActivos, comprables, nombreProducto, presentacionesDe,
      recargar, filtrar, busqueda,
      abierta, alternarDetalle, anteriorDe,
      modal, cerrarModal, abrirNueva, abrirEdicion, agregarLinea,
      tipoDe, varasDe, costoPorVaraDe, subtotalDe,
      neto, iva, totalCompra, varasTotales,
      abrirPresentacion, volverACompra, guardarPresentacion,
      guardarCompra, abrirRecepcion, confirmarRecepcion, cerrarRecepcion,
      irAEtiquetas, anular,
      resalte, aviso, clp, fecha, fechaHora
    }
  }
}
</script>

<style scoped>
.cabecera,
.cabecera *,
.tabla-envoltura *,
.fondo * {
  box-sizing: border-box;
}

@keyframes entra {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}

.al-entrar {
  animation: entra 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: calc(var(--i, 0) * 55ms);
}

@keyframes aparece {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

.fila {
  animation: aparece 220ms ease-out backwards;
  animation-delay: calc(var(--i, 0) * 25ms);
}

@keyframes resalta {
  0% { background: #d1fae5; }
  70% { background: #ecfdf5; }
  100% { background: transparent; }
}

.fila.resaltada td { animation: resalta 1400ms ease-out; }

.flecha {
  display: inline-block;
  transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}

.fila.abierta .flecha { transform: rotate(180deg); }

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

@keyframes girar { to { transform: rotate(360deg); } }

/* ---------- Encabezado ---------- */
.cabecera {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.cabecera h2 {
  margin: 0;
  font-size: clamp(1.25rem, 4.5vw, 1.5rem);
  color: #0f172a;
}

.pista {
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: #64748b;
  max-width: 62ch;
  line-height: 1.5;
}

/* ---------- Bandas ---------- */
.banda {
  display: flex;
  align-items: center;
  gap: 11px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 0.875rem;
}

.banda-aviso {
  background: #fef3c7;
  border: 1px solid #fcd34d;
  color: #78350f;
}

.banda-error {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #991b1b;
}

.banda .btn { margin-left: auto; }

/* ---------- Filtros ---------- */
.barra-filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 16px;
}

.rango { display: flex; flex-direction: column; gap: 3px; }

.buscador {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 220px;
  min-width: 0;
  min-height: 44px;
  padding: 0 12px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.buscador:focus-within {
  border-color: transparent;
  box-shadow: 0 0 0 2px #10b981;
}

.buscador input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  font-family: inherit;
  font-size: max(0.9rem, 16px);
}

.campo {
  width: 100%;
  min-height: 44px;
  padding: 0.6rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: #fff;
  font-family: inherit;
  font-size: max(0.9rem, 16px);
  color: #0f172a;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.campo:focus {
  border-color: transparent;
  box-shadow: 0 0 0 2px #10b981;
}

.campo.chico { min-height: 38px; padding: 0.4rem 0.6rem; font-size: max(0.85rem, 16px); }
.campo-corto { width: auto; flex: 0 1 190px; }
.campo-fecha { width: auto; min-width: 150px; }

.segmentado {
  display: inline-flex;
  background: #f1f5f9;
  border-radius: 9px;
  padding: 3px;
  gap: 3px;
}

.segmentado.ancho-total { display: flex; width: 100%; }

.segmentado button {
  flex: 1;
  min-height: 38px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #475569;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s, color 0.18s, box-shadow 0.18s;
}

.segmentado button.on {
  background: #fff;
  color: #047857;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.interruptor {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 4px;
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
  cursor: pointer;
}

.interruptor input {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  accent-color: #059669;
  cursor: pointer;
}

/* ---------- Tabla ---------- */
.tabla-envoltura {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  overflow-x: auto;
  transition: opacity 0.14s ease;
}

.tabla-envoltura.atenuada { opacity: 0.45; }

table { width: 100%; border-collapse: collapse; }

th {
  text-align: left;
  padding: 11px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64748b;
  white-space: nowrap;
}

td {
  padding: 11px 14px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.875rem;
  vertical-align: middle;
}

tbody tr:last-child td { border-bottom: 0; }
tr.clic { cursor: pointer; }
tr.anulada { opacity: 0.5; }
.fila td { transition: background-color 0.16s ease; }
tr.clic:hover td, tr.clic.abierta td { background: #f8fafc; }

.der { text-align: right; }
.suave { color: #64748b; }
.mini { font-size: 0.78rem; }
.rojo { color: #dc2626; }
.verde { color: #047857; }

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.dato.grande { font-size: 1.1rem; }

.acciones-col { width: 1%; white-space: nowrap; }

.detalle-linea {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 2px;
}

.etiqueta {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.et-verde { background: #d1fae5; color: #047857; }
.et-ambar { background: #fef3c7; color: #92400e; }
.et-gris { background: #f1f5f9; color: #64748b; }

/* ---------- Detalle ---------- */
.fila-detalle td { background: #f8fafc; padding: 0; }

.detalle { padding: 14px; }

table.interna {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

table.interna th {
  background: #f8fafc;
  font-size: 0.62rem;
}

table.interna td { font-size: 0.82rem; padding: 8px 12px; }

.totales {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  margin-top: 14px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.totales div { display: flex; flex-direction: column; gap: 2px; }
.totales span { color: #64748b; font-size: 0.72rem; }

.lotes { margin-top: 16px; }

.lotes h4 {
  margin: 0 0 8px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64748b;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.chip {
  padding: 6px 11px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  font-size: 0.78rem;
  color: #475569;
}

.chip b { font-variant-numeric: tabular-nums; }

.notas {
  margin: 12px 0 0;
  padding: 9px 11px;
  background: #fff;
  border-left: 3px solid #6ee7b7;
  border-radius: 0 7px 7px 0;
  font-size: 0.8rem;
  color: #475569;
  font-style: italic;
}

.acciones-detalle {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 14px;
}

.paginador {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 14px 0 0;
}

/* ---------- Botones ---------- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: 0.65rem 1.15rem;
  border: none;
  border-radius: 0.5rem;
  background: #059669;
  color: #fff;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.btn:hover:not(:disabled) { background: #047857; }
.btn:active:not(:disabled) { transform: scale(0.97); }
.btn:disabled { background: #a7c9bb; cursor: not-allowed; }

.btn-linea {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #475569;
}

.btn-linea:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }
.btn-linea:disabled { background: transparent; color: #cbd5e1; }

.btn-mini {
  min-height: 34px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}

.btn-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.btn-icono:hover { border-color: #dc2626; color: #dc2626; }
.btn-icono.chico { width: 28px; height: 28px; }

.enlace-boton {
  margin-top: 5px;
  padding: 0;
  border: none;
  background: none;
  color: #059669;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
}

/* ---------- Modales ---------- */
.fondo {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.55);
}

.modal {
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
}

.modal.ancho { max-width: 760px; }

.modal-cab {
  padding: 18px 20px 14px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-cab h3 { margin: 0; font-size: 1.15rem; color: #0f172a; }
.modal-cab p { margin: 4px 0 0; font-size: 0.82rem; color: #64748b; }

.modal-cuerpo { padding: 18px 20px; overflow-y: auto; }

.modal-pie {
  display: flex;
  gap: 9px;
  justify-content: flex-end;
  flex-wrap: wrap;
  padding: 14px 20px;
  border-top: 1px solid #e2e8f0;
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

.grupo { margin-bottom: 15px; }

.rejilla {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 13px;
}

.ayuda {
  margin: 5px 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
  line-height: 1.5;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

.parrafo {
  margin: 0 0 14px;
  font-size: 0.875rem;
  line-height: 1.55;
  color: #475569;
}

.error {
  padding: 10px 13px;
  margin-bottom: 14px;
  border-radius: 8px;
  border-left: 4px solid #dc2626;
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.85rem;
}

.nota {
  padding: 11px 13px;
  margin-top: 14px;
  border-radius: 0 8px 8px 0;
  border-left: 3px solid #10b981;
  background: #f0fdf4;
  font-size: 0.83rem;
  color: #475569;
  line-height: 1.6;
}

.nota.alerta {
  border-color: #f59e0b;
  background: #fffbeb;
  color: #78350f;
}

/* ---------- Constructor de líneas ---------- */
.constructor {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 15px;
}

.constructor-vacio {
  padding: 22px;
  text-align: center;
  color: #94a3b8;
  font-size: 0.85rem;
}

.linea {
  padding: 12px 13px;
  border-bottom: 1px solid #f1f5f9;
  background: #fff;
}

.linea:last-child { border-bottom: 0; }

.linea-cab {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 9px;
}

.linea-cab .crece { flex: 1; min-width: 0; font-size: 0.9rem; color: #0f172a; }

.linea-campos {
  display: grid;
  grid-template-columns: 2fr 1fr 1.2fr;
  gap: 10px;
}

.linea-campos label {
  font-size: 0.6rem;
  margin-bottom: 3px;
}

.linea-calculo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 9px;
  padding-top: 9px;
  border-top: 1px dashed #e2e8f0;
  font-size: 0.8rem;
  color: #64748b;
}

.linea-calculo .sep { color: #cbd5e1; }
.linea-calculo .subtotal { margin-left: auto; color: #0f172a; }

/* ---------- Varios ---------- */
.vacio {
  text-align: center;
  padding: 44px 20px;
  color: #64748b;
  background: #fff;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
}

.vacio strong {
  display: block;
  color: #0f172a;
  font-size: 1.05rem;
  margin-bottom: 5px;
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

/* ---------- Móvil ---------- */
@media (max-width: 900px) {
  .linea-campos { grid-template-columns: 1fr; }
  .linea-calculo .subtotal { margin-left: 0; }

  .tabla-envoltura {
    border: none;
    background: transparent;
    overflow: visible;
  }

  table, thead, tbody, tr, td { display: block; width: 100%; }
  thead { display: none; }

  tbody tr {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    margin-bottom: 11px;
    padding: 12px;
  }

  tbody tr.fila-detalle { background: #f8fafc; padding: 0; }

  td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
    border: none;
    text-align: right;
  }

  td::before {
    content: attr(data-label);
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #94a3b8;
    text-align: left;
    flex-shrink: 0;
  }

  td:not([data-label]) { justify-content: flex-end; }
  td:not([data-label])::before { content: none; }

  .fila-detalle td { display: block; padding: 0; border: none; }
  .fila.resaltada { animation: resalta 1400ms ease-out; }
  .fila.resaltada td { animation: none; }
  tr.clic:hover td, tr.clic.abierta td { background: transparent; }

  .campo-corto, .campo-fecha { flex: 1 1 100%; width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .btn, .btn-icono, .campo, .buscador, .flecha,
  .segmentado button, .tabla-envoltura, .fila td { transition: none; }

  .al-entrar, .fila, .fila.resaltada, .fila.resaltada td, .spinner { animation: none; }

  .tabla-envoltura.atenuada { opacity: 1; }
}
</style>