<template>
  
    <div class="cabecera al-entrar">
      <div>
        <h2>Mermas</h2>
        <p class="pista">
          Flor que se marchitó, se quebró o volvió de un pedido. Registrarla es
          lo que permite saber por qué no cuadra el inventario.
        </p>
      </div>
      <div class="acciones-cab">
        <button v-if="puedeRegistrar && candidatos.length" class="btn btn-linea"
          @click="abrirDescarte">Descartar lote</button>
        <button v-if="puedeRegistrar" class="btn btn-rojo" @click="abrirRegistro">
          ＋ Registrar merma
        </button>
      </div>
    </div>

    <!-- ---------- Indicadores ---------- -->
    <div class="kpis">
      <div class="kpi destacado al-entrar" style="--i: 1">
        <div class="rot">Pérdida real del período</div>
        <div class="val">{{ clp(costoPerdido) }}</div>
        <div class="pie">{{ unidadesPerdidas }} unidades botadas</div>
      </div>
      <div class="kpi al-entrar" style="--i: 2">
        <div class="rot">Volvió al inventario</div>
        <div class="val verde">{{ clp(costoRecuperado) }}</div>
        <div class="pie">{{ unidadesRecuperadas }} unidades recuperadas</div>
      </div>
      <div class="kpi al-entrar" style="--i: 3">
        <div class="rot">Merma sobre ventas</div>
        <div class="val" :class="{ rojo: mermaAlta }">
          {{ resumen ? Number(porcentajeSobreVentas).toFixed(1) + '%' : '—' }}
        </div>
        <div class="pie">{{ mermaAlta ? 'Sobre 5%: se compra de más' : 'Dentro de lo razonable' }}</div>
      </div>
      <div class="kpi al-entrar" style="--i: 4">
        <div class="rot">Perdido por deterioro</div>
        <div class="val">{{ clp(costoDesvalorizado) }}</div>
        <div class="pie">Flor que volvió valiendo menos</div>
      </div>
    </div>

    <!-- ---------- Período ---------- -->
    <div class="barra-filtros al-entrar" style="--i: 5">
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
      <span v-if="resumen" class="mini suave">
        {{ resumen.registros }} registros · {{ resumen.desde }} a {{ resumen.hasta }}
      </span>
    </div>

    <!-- ---------- Análisis ---------- -->
    <div v-if="porMotivo.length || porProducto.length" class="paneles">
      <div v-if="porMotivo.length" class="panel al-entrar" style="--i: 6">
        <h3>Pérdida por motivo</h3>
        <div v-for="(m, ix) in porMotivo" :key="m.motivo" class="barra-fila">
          <div class="barra-eti">
            <span>{{ m.motivo }}</span>
            <b class="dato">{{ clp(m.costoPerdido) }} · {{ m.unidades }} un</b>
          </div>
          <div class="barra">
            <i :style="{
              width: barrasListas ? porcentaje(m.costoPerdido, porMotivo[0].costoPerdido) : '0%',
              transitionDelay: (ix * 60) + 'ms'
            }"></i>
          </div>
        </div>
      </div>

      <div v-if="porProducto.length" class="panel al-entrar" style="--i: 7">
        <h3>Dónde se está yendo la plata</h3>
        <div v-for="(p, ix) in porProducto.slice(0, 6)" :key="p.productoId" class="barra-fila">
          <div class="barra-eti">
            <span>{{ p.emoji }} {{ p.producto }}</span>
            <b class="dato">{{ clp(p.costoPerdido) }}</b>
          </div>
          <div class="barra">
            <i class="rosa" :style="{
              width: barrasListas ? porcentaje(p.costoPerdido, porProducto[0].costoPerdido) : '0%',
              transitionDelay: (ix * 60) + 'ms'
            }"></i>
          </div>
          <!--
            El porcentaje sobre lo comprado es el denominador que falta en
            "se perdieron 40 rosas": sin él no se sabe si es mucho o poco.
          -->
          <div v-if="p.porcentajeDeLoComprado != null" class="mini suave">
            {{ p.unidadesPerdidas }} de lo comprado
            ({{ Number(p.porcentajeDeLoComprado).toFixed(1) }}%)
          </div>
        </div>
        <p class="pie-nota">
          Si un producto se repite acá, conviene revisar cuánto se compra o cómo se conserva.
        </p>
      </div>
    </div>

    <!-- ---------- Filtros de la lista ---------- -->
    <div class="barra-filtros al-entrar" style="--i: 8">
      <div class="buscador">
        <span aria-hidden="true">🔎</span>
        <input v-model="busqueda" placeholder="Producto, lote o detalle…" aria-label="Buscar merma">
        <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
      </div>

      <select class="campo campo-corto" :value="filtro.destino ?? ''"
        @change="filtrar({ destino: $event.target.value || null })" aria-label="Destino">
        <option value="">Todos los destinos</option>
        <option v-for="d in DESTINOS" :key="d.valor" :value="d.valor">{{ d.texto }}</option>
      </select>

      <select class="campo campo-corto" :value="filtro.motivo ?? ''"
        @change="filtrar({ motivo: $event.target.value || null })" aria-label="Motivo">
        <option value="">Todos los motivos</option>
        <option v-for="m in motivos" :key="m" :value="m">{{ m }}</option>
      </select>

      <label class="check">
        <input type="checkbox" :checked="filtro.revertida === null"
          @change="filtrar({ revertida: $event.target.checked ? null : false })">
        <span>Ver revertidas</span>
      </label>
    </div>

    <!-- ---------- Registro ---------- -->
    <div v-if="cargando && !mermas.length" class="vacio">Cargando registros…</div>

    <div v-else-if="!mermas.length" class="vacio">
      <strong>Sin mermas en el período</strong>
      Cuando descartes producto, anótalo acá. Es lo único que distingue una
      pérdida de un descuadre.
    </div>

    <div v-else class="tabla-envoltura" :class="{ atenuada: cargando }">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Producto</th>
            <th>Destino</th>
            <th class="der">Movidas</th>
            <th class="der">Perdidas</th>
            <th class="der">Costo real</th>
            <th>Registró</th>
            <th class="acciones-col"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(m, ix) in mermas" :key="m.id" class="fila" :style="{ '--i': Math.min(ix, 12) }"
            :class="{ revertida: m.revertida, resaltada: m.id === resalte.id }">
            <td data-label="Fecha" class="dato mini">{{ fechaHora(m.fecha) }}</td>

            <td data-label="Producto">
              <b>{{ m.emoji }} {{ m.producto }}</b>
              <div v-if="m.loteCodigo" class="detalle-linea">
                Lote {{ m.loteCodigo }}
                <span v-if="m.diasEnCamara != null"> · {{ m.diasEnCamara }} días en cámara</span>
              </div>
              <div class="detalle-linea">
                {{ m.motivo }}<span v-if="m.detalle"> — {{ m.detalle }}</span>
              </div>
              <div v-if="m.loteRecuperacionCodigo" class="detalle-linea verde">
                Recuperado en {{ m.loteRecuperacionCodigo }}
                <span v-if="m.calidadReingreso"> · {{ m.calidadReingreso }}</span>
              </div>
              <div v-if="m.revertida" class="detalle-linea rojo">
                Revertida el {{ fechaHora(m.revertidaEn) }}
              </div>
            </td>

            <td data-label="Destino">
              <span class="etiqueta" :class="claseDestino(m.destino)">{{ textoDestino(m.destino) }}</span>
            </td>

            <td data-label="Movidas" class="der dato">{{ m.cantidad }}</td>
            <td data-label="Perdidas" class="der dato">
              {{ m.cantidadPerdida }}
              <div v-if="m.cantidadRecuperada" class="mini verde">+{{ m.cantidadRecuperada }} vuelven</div>
            </td>

            <!-- CostoPerdido, no CostoTotal: en una devolución al proveedor
                 la mercadería sale del stock pero se abona. -->
            <td data-label="Costo real" class="der dato" :class="{ rojo: m.costoPerdido > 0 }">
              {{ clp(m.costoPerdido) }}
            </td>

            <td data-label="Registró" class="suave corta">{{ m.usuario || '—' }}</td>

            <td class="der acciones-col">
              <button v-if="puedeRevertir && !m.revertida" class="btn btn-linea btn-mini"
                @click="abrirReversion(m)">Revertir</button>
              <span v-else-if="m.revertida" class="etiqueta et-gris">revertida</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="totalPaginas > 1" class="paginador">
      <button class="btn btn-linea btn-mini" :disabled="filtro.pagina <= 1"
        @click="filtrar({ pagina: filtro.pagina - 1 })">Anterior</button>
      <span class="mini suave">Página {{ filtro.pagina }} de {{ totalPaginas }}</span>
      <button class="btn btn-linea btn-mini" :disabled="filtro.pagina >= totalPaginas"
        @click="filtrar({ pagina: filtro.pagina + 1 })">Siguiente</button>
    </p>

    <!-- ================= MODALES ================= -->
    <div v-if="modal" class="fondo" @click.self="cerrarModal">

      <!-- Registrar -->
      <div v-if="modal.tipo === 'registrar'" class="modal ancho">
        <div class="modal-cab">
          <h3>Registrar merma</h3>
          <p>Descuenta del inventario y deja anotado qué pasó con lo que salió.</p>
        </div>

        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <div class="grupo">
            <label for="m-prod">Producto</label>
            <select id="m-prod" class="campo" v-model.number="modal.f.productoId" @change="alElegirProducto">
              <option :value="null">Selecciona…</option>
              <option v-for="p in productosDisponibles" :key="p.id" :value="p.id">
                {{ p.emoji }} {{ p.nombre }} — hay {{ p.disponible }}
              </option>
            </select>
          </div>

          <!--
            El lote es obligatorio si el producto se controla por lote: una
            flor perdida pertenece a un lote concreto, con su costo y su
            procedencia. Sin eso, la pérdida no se puede valorizar.
          -->
          <div v-if="productoElegido?.controlaLotes" class="grupo">
            <label for="m-lote">Lote</label>
            <div v-if="cargandoLotes" class="suave mini">Buscando lotes…</div>
            <select v-else id="m-lote" class="campo" v-model.number="modal.f.loteId">
              <option :value="null">Selecciona el lote…</option>
              <option v-for="l in lotesDelProducto" :key="l.id" :value="l.id">
                {{ l.codigo }} — {{ l.varasDisponibles }} varas ·
                {{ l.diasEnCamara }} días · {{ l.alerta }}
              </option>
            </select>
            <p v-if="!cargandoLotes && !lotesDelProducto.length" class="ayuda mala">
              Este producto no tiene lotes con existencias.
            </p>
          </div>

          <div class="grupo">
            <label>¿Qué pasó con lo que salió?</label>
            <div class="opciones">
              <button v-for="d in DESTINOS" :key="d.valor" type="button" class="opcion"
                :class="{ on: modal.f.destino === d.valor }" @click="elegirDestino(d.valor)">
                <b>{{ d.texto }}</b>
                <span>{{ d.descripcion }}</span>
              </button>
            </div>
          </div>

          <div class="rejilla grupo">
            <div>
              <label for="m-cant">Cantidad que sale</label>
              <input id="m-cant" class="campo dato" type="number" min="1" :max="maximo"
                v-model.number="modal.f.cantidad">
              <p v-if="maximo" class="ayuda">Hay {{ maximo }} disponibles.</p>
            </div>
            <div>
              <label for="m-motivo">Motivo</label>
              <select id="m-motivo" class="campo" v-model="modal.f.motivo">
                <option v-for="m in motivos" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>
          </div>

          <!-- Solo con reingreso -->
          <template v-if="modal.f.destino === 'reingreso'">
            <div class="rejilla grupo">
              <div>
                <label for="m-rec">Cuántas vuelven al stock</label>
                <input id="m-rec" class="campo dato" type="number" min="0" :max="modal.f.cantidad"
                  v-model.number="modal.f.cantidadRecuperada">
              </div>
              <div>
                <label for="m-cal">En qué estado vuelven</label>
                <select id="m-cal" class="campo" v-model="modal.f.calidad">
                  <option v-for="c in CALIDADES" :key="c.valor" :value="c.valor">{{ c.texto }}</option>
                </select>
                <p class="ayuda">{{ descripcionCalidad }}</p>
              </div>
            </div>

            <!--
              Óptima vuelve a su lote original y conserva su precio. Buena y
              limitada van a un lote de recuperación aparte, con precio
              propio y fuera del reparto automático: hay que escanearlo para
              venderlo.
            -->
            <div v-if="modal.f.calidad !== 'optima'" class="rejilla grupo">
              <div>
                <label for="m-precio">Precio rebajado (opcional)</label>
                <input id="m-precio" class="campo dato" type="number" min="1" step="100"
                  v-model.number="modal.f.precioRecuperado">
                <p class="ayuda">Sin precio propio se vende al del producto.</p>
              </div>
              <div>
                <label for="m-costo">Costo con que vuelve (opcional)</label>
                <input id="m-costo" class="campo dato" type="number" min="0" step="50"
                  v-model.number="modal.f.costoRecuperado">
                <p class="ayuda">
                  Bajarlo reconoce la diferencia como pérdida por deterioro en
                  este mismo registro.
                </p>
              </div>
            </div>
          </template>

          <div class="grupo">
            <label for="m-det">Detalle (opcional)</label>
            <input id="m-det" class="campo" v-model="modal.f.detalle" maxlength="600"
              placeholder="Se cortó la cadena de frío el sábado…">
          </div>

          <div v-if="modal.f.productoId" class="nota" :class="{ alerta: modal.f.destino === 'perdida' }">
            Salen <b>{{ modal.f.cantidad || 0 }}</b> unidades ·
            se pierden <b class="dato">{{ perdidas }}</b>
            <span v-if="modal.f.destino === 'devolucion_proveedor'">
              <br>La mercadería sale del stock pero <b>no cuenta como costo</b>: se abona.
            </span>
            <span v-else-if="modal.f.cantidadRecuperada > 0">
              <br>{{ modal.f.cantidadRecuperada }} vuelven al inventario.
            </span>
          </div>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" @click="cerrarModal">Cancelar</button>
          <button class="btn btn-rojo" :disabled="guardando" @click="confirmarRegistro">
            <span v-if="guardando" class="spinner" aria-hidden="true"></span>
            {{ guardando ? 'Registrando…' : 'Registrar' }}
          </button>
        </div>
      </div>

      <!-- Descartar lote -->
      <div v-else-if="modal.tipo === 'descarte'" class="modal">
        <div class="modal-cab">
          <h3>Descartar lote completo</h3>
          <p>Da de baja el lote con todo lo que le quede.</p>
        </div>

        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <div class="grupo">
            <label for="d-lote">Lote</label>
            <select id="d-lote" class="campo" v-model.number="modal.f.loteId">
              <option :value="null">Selecciona…</option>
              <option v-for="l in candidatos" :key="l.id" :value="l.id">
                {{ l.codigo }} — {{ l.producto }} · {{ l.varasDisponibles }} varas ·
                {{ l.alerta }}
              </option>
            </select>
            <p class="ayuda">
              Aparecen los lotes vencidos, por vencer y los restos rezagados:
              son los que terminan en merma si no se liquidan.
            </p>
          </div>

          <div class="grupo">
            <label for="d-motivo">Motivo</label>
            <select id="d-motivo" class="campo" v-model="modal.f.motivo">
              <option v-for="m in motivos" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>

          <div class="grupo">
            <label for="d-det">Detalle (opcional)</label>
            <input id="d-det" class="campo" v-model="modal.f.detalle" maxlength="600">
          </div>

          <label class="interruptor">
            <input type="checkbox" v-model="modal.f.esDevolucionProveedor">
            <span>Es devolución al proveedor</span>
          </label>
          <p class="ayuda">
            Marcado, la mercadería sale del stock pero no cuenta como costo:
            el proveedor la abona.
          </p>

          <div v-if="loteADescartar" class="nota alerta">
            Se dan de baja <b>{{ loteADescartar.varasDisponibles }}</b> varas de
            {{ loteADescartar.producto }},
            por {{ clp(loteADescartar.valorRestante) }}.
          </div>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" @click="cerrarModal">Cancelar</button>
          <button class="btn btn-rojo" :disabled="guardando" @click="confirmarDescarte">
            <span v-if="guardando" class="spinner" aria-hidden="true"></span>
            {{ guardando ? 'Descartando…' : 'Descartar lote' }}
          </button>
        </div>
      </div>

      <!-- Revertir -->
      <div v-else-if="modal.tipo === 'revertir'" class="modal">
        <div class="modal-cab">
          <h3>Revertir merma</h3>
          <p>{{ modal.f.merma.cantidad }} × {{ modal.f.merma.producto }}</p>
        </div>
        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <p class="parrafo">
            Las varas vuelven al lote del que salieron, conservando su costo y
            su vencimiento. Si el lote se había descartado, se reactiva.
          </p>

          <div class="grupo">
            <label for="r-motivo">¿Por qué se revierte?</label>
            <input id="r-motivo" class="campo" v-model="modal.f.motivo" maxlength="300"
              placeholder="Se registró el lote equivocado" @keyup.enter="confirmarReversion">
            <p class="ayuda">Mínimo 5 caracteres. Queda en el registro con tu nombre.</p>
          </div>

          <div class="nota alerta">
            Si hubo reingreso y esas varas ya se vendieron, la reversa se
            rechaza: no hay forma de deshacerla sin inventar stock.
          </div>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="cerrarModal">Cancelar</button>
          <button class="btn" :disabled="guardando" @click="confirmarReversion">
            <span v-if="guardando" class="spinner" aria-hidden="true"></span>
            {{ guardando ? 'Revirtiendo…' : 'Revertir' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'
import { DESTINOS, CALIDADES, textoDestino } from '@/features/mermas/store/mermas.module'

const CLASE_DESTINO = {
  perdida: 'et-rojo',
  reingreso: 'et-verde',
  devolucion_proveedor: 'et-azul'
}

export default {
  name: 'MermasView',
  components: {  },

  setup () {
    const store = useStore()
    const { espera, usarResalte, usarAviso } = useTemporizadores()

    /* Registrar: admin y bodega. Revertir: solo admin — deshace un registro
       de pérdida, que es una corrección contable. */
    const puedeRegistrar = computed(() => store.getters['auth/tieneRol']('admin', 'bodega'))
    const puedeRevertir = computed(() => store.getters['auth/esAdmin'])

    /* ---------------- Datos ---------------- */
    const mermas = computed(() => store.getters['mermas/mermas'])
    const totalPaginas = computed(() => Math.ceil(
      store.getters['mermas/total'] / (store.getters['mermas/filtro'].porPagina || 50)
    ))
    const filtro = computed(() => store.getters['mermas/filtro'])
    const cargando = computed(() => store.getters['mermas/cargando'])
    const guardando = computed(() => store.getters['mermas/guardando'])
    const motivos = computed(() => store.getters['mermas/motivos'])
    const resumen = computed(() => store.getters['mermas/resumen'])

    const costoPerdido = computed(() => store.getters['mermas/costoPerdido'])
    const costoRecuperado = computed(() => store.getters['mermas/costoRecuperado'])
    const costoDesvalorizado = computed(() => store.getters['mermas/costoDesvalorizado'])
    const unidadesPerdidas = computed(() => store.getters['mermas/unidadesPerdidas'])
    const unidadesRecuperadas = computed(() => store.getters['mermas/unidadesRecuperadas'])
    const porcentajeSobreVentas = computed(() => store.getters['mermas/porcentajeSobreVentas'])
    const mermaAlta = computed(() => store.getters['mermas/mermaAlta'])
    const porMotivo = computed(() => store.getters['mermas/porMotivo'])
    const porProducto = computed(() => store.getters['mermas/porProducto'])

    const productosDisponibles = computed(() =>
      store.getters['productos/productos'].filter(p => p.activo && p.disponible > 0)
    )

    /* Candidatos a descarte: exactamente para lo que existe el endpoint. */
    const candidatos = computed(() => store.getters['lotes/criticos'])

    /* ---------------- Carga ---------------- */
    let control = null

    onMounted(async () => {
      control = new AbortController()
      const señal = { signal: control.signal }

      store.dispatch('mermas/cargarMotivos', señal)
      store.dispatch('mermas/cargarResumen', señal)
      store.dispatch('lotes/cargarAlertas', señal)

      /* Reutiliza lo que ya esté cargado: el selector de producto no
         justifica volver a pedir el catálogo entero. */
      if (!store.getters['productos/productos'].length) {
        store.dispatch('productos/cargar', señal)
      }

      await store.dispatch('mermas/cargar', señal)

      await nextTick()
      await espera(120)
      barrasListas.value = true
    })

    onUnmounted(() => control?.abort())

    const filtrar = (cambios) => store.dispatch('mermas/filtrar', cambios)

    const busqueda = ref(filtro.value.buscar || '')
    let tmr = null
    watch(busqueda, (v) => {
      clearTimeout(tmr)
      tmr = setTimeout(() => filtrar({ buscar: v.trim() }), 350)
    })
    onUnmounted(() => clearTimeout(tmr))

    /* ---------------- Barras ----------------
     * Nacen en cero y crecen tras el primer pintado: sin ese paso el
     * navegador ve un solo estado y no hay transición que interpolar. */
    const barrasListas = ref(false)

    watch(porMotivo, async () => {
      if (!barrasListas.value) return
      barrasListas.value = false
      await nextTick()
      barrasListas.value = true
    })

    const porcentaje = (valor, maximo) =>
      maximo > 0 ? `${Math.max(2, (valor / maximo) * 100)}%` : '0%'

    /* ---------------- Modales ---------------- */
    const modal = ref(null)
    const resalte = usarResalte()
    const { aviso, avisar } = usarAviso()

    const lotesDelProducto = ref([])
    const cargandoLotes = ref(false)

    const cerrarModal = () => { modal.value = null }

    const abrirRegistro = () => {
      lotesDelProducto.value = []
      modal.value = {
        tipo: 'registrar',
        f: {
          productoId: null, loteId: null, cantidad: 1,
          destino: 'perdida', cantidadRecuperada: 0, calidad: 'optima',
          precioRecuperado: null, costoRecuperado: null,
          motivo: motivos.value[0] || '', detalle: '', error: ''
        }
      }
    }

    const abrirDescarte = () => {
      modal.value = {
        tipo: 'descarte',
        f: {
          loteId: null, motivo: motivos.value[0] || '',
          detalle: '', esDevolucionProveedor: false, error: ''
        }
      }
    }

    const abrirReversion = (m) => {
      modal.value = { tipo: 'revertir', f: { merma: m, motivo: '', error: '' } }
    }

    const productoElegido = computed(() => {
      const id = modal.value?.f?.productoId
      return id ? store.getters['productos/porId'](id) : null
    })

    const loteADescartar = computed(() => {
      const id = modal.value?.f?.loteId
      return id ? candidatos.value.find(l => l.id === id) : null
    })

    /* El techo es el lote elegido cuando hay control por lote: no se pueden
       perder más varas de las que ese paquete tiene. */
    const maximo = computed(() => {
      const p = productoElegido.value
      if (!p) return 0
      if (!p.controlaLotes) return p.disponible
      const lote = lotesDelProducto.value.find(l => l.id === modal.value.f.loteId)
      return lote ? lote.varasDisponibles : p.disponible
    })

    const perdidas = computed(() => {
      const f = modal.value?.f
      if (!f) return 0
      if (f.destino !== 'reingreso') return f.cantidad || 0
      return Math.max(0, (f.cantidad || 0) - (f.cantidadRecuperada || 0))
    })

    const descripcionCalidad = computed(() =>
      CALIDADES.find(c => c.valor === modal.value?.f?.calidad)?.descripcion || ''
    )

    const alElegirProducto = async () => {
      const f = modal.value.f
      f.loteId = null
      lotesDelProducto.value = []

      if (!productoElegido.value?.controlaLotes) return

      cargandoLotes.value = true
      try {
        lotesDelProducto.value = await store.dispatch('lotes/lotesDeProducto', {
          productoId: f.productoId
        })
      } finally {
        cargandoLotes.value = false
      }
    }

    const elegirDestino = (destino) => {
      const f = modal.value.f
      f.destino = destino
      if (destino !== 'reingreso') {
        f.cantidadRecuperada = 0
        f.precioRecuperado = null
        f.costoRecuperado = null
      }
    }

    /* ---------------- Acciones ---------------- */
    const confirmarRegistro = async () => {
      const f = modal.value.f
      f.error = ''

      if (!f.productoId) return (f.error = 'Elige el producto.')
      if (productoElegido.value?.controlaLotes && !f.loteId) {
        return (f.error = 'Este producto se controla por lote: indica de cuál salió.')
      }
      if (!f.cantidad || f.cantidad < 1) return (f.error = 'La cantidad debe ser al menos 1.')
      if (maximo.value && f.cantidad > maximo.value) {
        return (f.error = `Solo hay ${maximo.value} disponibles.`)
      }
      if ((f.motivo || '').trim().length < 3) return (f.error = 'Indica el motivo.')
      if (f.destino === 'reingreso') {
        if (f.cantidadRecuperada < 1) {
          return (f.error = 'Con reingreso, al menos una unidad tiene que volver.')
        }
        if (f.cantidadRecuperada > f.cantidad) {
          return (f.error = 'No pueden volver más unidades de las que salieron.')
        }
      }

      try {
        const merma = await store.dispatch('mermas/registrar', {
          productoId: f.productoId,
          loteId: f.loteId,
          cantidad: f.cantidad,
          destino: f.destino,
          cantidadRecuperada: f.destino === 'reingreso' ? f.cantidadRecuperada : 0,
          calidad: f.destino === 'reingreso' ? f.calidad : null,
          precioRecuperado: f.precioRecuperado || null,
          costoRecuperado: f.costoRecuperado ?? null,
          motivo: f.motivo.trim(),
          detalle: (f.detalle || '').trim() || null
        })
        cerrarModal()
        avisar(`Registrado · pérdida de ${clp(merma.costoPerdido)}`)
        resalte.marcar(merma.id)
      } catch (e) {
        f.error = e.message
      }
    }

    const confirmarDescarte = async () => {
      const f = modal.value.f
      f.error = ''
      if (!f.loteId) return (f.error = 'Elige el lote a descartar.')
      if ((f.motivo || '').trim().length < 3) return (f.error = 'Indica el motivo.')

      try {
        const merma = await store.dispatch('mermas/descartarLote', {
          loteId: f.loteId,
          motivo: f.motivo.trim(),
          detalle: (f.detalle || '').trim() || null,
          esDevolucionProveedor: f.esDevolucionProveedor
        })
        cerrarModal()
        avisar(`Lote ${merma.loteCodigo} descartado`)
        store.dispatch('lotes/cargarAlertas')
        resalte.marcar(merma.id)
      } catch (e) {
        f.error = e.message
      }
    }

    const confirmarReversion = async () => {
      const f = modal.value.f
      f.error = ''
      try {
        await store.dispatch('mermas/revertir', { id: f.merma.id, motivo: f.motivo })
        cerrarModal()
        avisar('Merma revertida y stock devuelto')
        resalte.marcar(f.merma.id)
      } catch (e) {
        f.error = e.message
      }
    }

    /* ---------------- Utilidades ---------------- */
    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    const fmtFecha = new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
    const fechaHora = (v) => (v ? fmtFecha.format(new Date(v)) : '—')

    const claseDestino = (d) => CLASE_DESTINO[d] || 'et-gris'

    return {
      DESTINOS, CALIDADES, Math, textoDestino, claseDestino,
      puedeRegistrar, puedeRevertir,
      mermas, totalPaginas, filtro, cargando, guardando, motivos, resumen,
      costoPerdido, costoRecuperado, costoDesvalorizado,
      unidadesPerdidas, unidadesRecuperadas, porcentajeSobreVentas, mermaAlta,
      porMotivo, porProducto, porcentaje, barrasListas,
      productosDisponibles, candidatos, lotesDelProducto, cargandoLotes,
      busqueda, filtrar,
      modal, cerrarModal, abrirRegistro, abrirDescarte, abrirReversion,
      productoElegido, loteADescartar, maximo, perdidas, descripcionCalidad,
      alElegirProducto, elegirDestino,
      confirmarRegistro, confirmarDescarte, confirmarReversion,
      resalte, aviso, clp, fechaHora
    }
  }
}
</script>

<style scoped>
.cabecera,
.cabecera *,
.kpis *,
.paneles *,
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

/* Revertir corrige, no celebra: el resalte va en rojo */
@keyframes resalta {
  0% { background: #fee2e2; }
  70% { background: #fef2f2; }
  100% { background: transparent; }
}

.fila.resaltada td { animation: resalta 1400ms ease-out; }

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

.acciones-cab {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}

/* ---------- KPIs ---------- */
.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.kpi {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 15px;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.kpi:hover {
  border-color: #cbd5e1;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.kpi .rot {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.kpi .val {
  font-size: clamp(1.2rem, 4.5vw, 1.5rem);
  font-weight: 700;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

.kpi .pie {
  font-size: 0.72rem;
  color: #64748b;
  margin-top: 3px;
}

.kpi.destacado {
  background: #7f1d1d;
  border-color: #7f1d1d;
  color: #fff;
}

.kpi.destacado .rot { color: #fca5a5; }
.kpi.destacado .pie { color: #fecaca; }

/* ---------- Paneles ---------- */
.paneles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px;
}

.panel h3 {
  margin: 0 0 14px;
  font-size: 0.95rem;
  color: #0f172a;
}

.barra-fila { margin-bottom: 12px; }

.barra-eti {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 0.8rem;
  margin-bottom: 5px;
}

.barra-eti span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.barra-eti b { white-space: nowrap; }

.barra {
  height: 7px;
  background: #f1f5f9;
  border-radius: 99px;
  overflow: hidden;
}

.barra i {
  display: block;
  height: 100%;
  width: 0;
  background: #d97706;
  border-radius: 99px;
  transition: width 0.62s cubic-bezier(0.22, 1, 0.36, 1);
}

.barra i.rosa { background: #be185d; }

.pie-nota {
  margin: 12px 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
  line-height: 1.45;
}

/* ---------- Filtros ---------- */
.barra-filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.rango {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.buscador {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 240px;
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

.campo-corto { width: auto; flex: 0 1 200px; }
.campo-fecha { width: auto; min-width: 150px; }

.check {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.85rem;
  color: #475569;
  cursor: pointer;
}

.check input {
  width: 17px;
  height: 17px;
  accent-color: #059669;
  cursor: pointer;
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
tr.revertida { opacity: 0.5; }

.der { text-align: right; }
.suave { color: #64748b; }
.mini { font-size: 0.78rem; }
.rojo { color: #dc2626; }
.verde { color: #047857; }

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.corta {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acciones-col { width: 1%; white-space: nowrap; }

.detalle-linea {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 2px;
}

.detalle-linea.verde { color: #047857; }
.detalle-linea.rojo { color: #dc2626; }

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
.et-rojo { background: #fee2e2; color: #991b1b; }
.et-azul { background: #dbeafe; color: #1d4ed8; }
.et-gris { background: #f1f5f9; color: #64748b; }

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

.btn-rojo { background: #dc2626; }
.btn-rojo:hover:not(:disabled) { background: #b91c1c; }
.btn-rojo:disabled { background: #f2a5a5; }

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

.btn-icono:hover { border-color: #059669; color: #059669; }
.btn-icono.chico { width: 28px; height: 28px; }

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

.modal.ancho { max-width: 640px; }

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

.ayuda.mala { color: #dc2626; }

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
  padding: 10px 13px;
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

.opciones {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.opcion {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 11px 13px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background-color 0.15s;
}

.opcion b { font-size: 0.88rem; color: #0f172a; }
.opcion span { font-size: 0.75rem; color: #64748b; line-height: 1.45; }

.opcion.on {
  border-color: #059669;
  background: #f0fdf4;
}

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
@media (max-width: 860px) {
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

  td[data-label="Producto"] {
    display: block;
    text-align: left;
    padding-bottom: 9px;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 5px;
  }

  td[data-label="Producto"]::before { content: none; }

  .fila.resaltada { animation: resalta 1400ms ease-out; }
  .fila.resaltada td { animation: none; }

  .corta { max-width: none; }
  .campo-corto { flex: 1 1 100%; width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .btn, .btn-icono, .campo, .buscador, .kpi, .opcion,
  .barra i, .tabla-envoltura { transition: none; }

  .al-entrar, .fila, .fila.resaltada, .fila.resaltada td, .spinner { animation: none; }

  .tabla-envoltura.atenuada { opacity: 1; }
}
</style>