<template>
  <div class="cabecera al-entrar">
    <div>
      <h2>Compras</h2>
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
  <!-- Cuatro controles apilados se comían la pantalla en móvil. Queda el
       buscador y un botón; el resto vive en la hoja. -->
  <div class="barra al-entrar" style="--i: 2">
    <div class="buscador">
      <span aria-hidden="true">🔎</span>
      <input v-model="busqueda" placeholder="Folio, documento o proveedor…" aria-label="Buscar compra">
      <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
    </div>

    <button class="btn btn-linea filtros-btn" :class="{ activo: nFiltros > 0 }" @click="filtrosAbiertos = true"
      :aria-label="`Filtros${nFiltros ? `, ${nFiltros} activos` : ''}`">
      Filtros
      <span v-if="nFiltros" class="globo">{{ nFiltros }}</span>
    </button>
  </div>

  <div v-if="chips.length" class="chips-filtro">
    <button v-for="c in chips" :key="c.clave" class="chip-filtro" @click="quitarChip(c)">
      {{ c.texto }} <span aria-hidden="true">✕</span>
    </button>
    <button class="chip-limpiar" @click="limpiarFiltros">Limpiar todo</button>
  </div>

  <!-- ---------- Listado ---------- -->
  <div v-if="cargando && !compras.length" class="vacio">Cargando compras…</div>

  <div v-else-if="!compras.length" class="vacio">
    <strong>{{ nFiltros || busqueda ? 'Ninguna compra coincide' : 'Sin compras registradas' }}</strong>
    {{ nFiltros || busqueda
      ? 'Prueba con otro texto o quita los filtros.'
      : 'Crea la primera para que entre flor al inventario.' }}
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
        <template v-for="c in compras" :key="c.id">
          <tr class="fila" :class="{
            clic: !esMovil,
            anulada: c.estado === 'anulada',
            abierta: abierta === c.id,
            resaltada: c.id === resalte.id
          }" @click="!esMovil && alternarDetalle(c.id)">

            <!-- En escritorio es una celda más. Bajo el breakpoint es la
                 cabecera del acordeón: folio, estado y total. -->
            <td data-label="Folio">
              <button v-if="esMovil" class="cab" :aria-expanded="abierta === c.id" @click="alternarDetalle(c.id)">
                <span class="chevron" aria-hidden="true">›</span>
                <span class="cab-folio">{{ c.folio }}</span>
                <span class="etiqueta" :class="claseEstado(c.estado)">{{ textoEstado(c.estado) }}</span>
                <span class="dato cab-total">{{ clp(c.total) }}</span>
              </button>

              <template v-else>
                <b>{{ c.folio }}</b>
                <div v-if="c.documento" class="detalle-linea">Doc. {{ c.documento }}</div>
              </template>
            </td>

            <!-- El documento sale de la cabecera mínima y se recupera acá -->
            <td v-if="esMovil && c.documento" data-label="Documento" class="suave">{{ c.documento }}</td>

            <td data-label="Proveedor">{{ c.proveedor }}</td>
            <td data-label="Fecha" class="dato mini">{{ fecha(c.fecha) }}</td>
            <td data-label="Estado" class="col-estado">
              <span class="etiqueta" :class="claseEstado(c.estado)">{{ textoEstado(c.estado) }}</span>
            </td>
            <td data-label="Líneas" class="der dato">{{ c.lineas }}</td>
            <td data-label="Varas" class="der dato">{{ c.varasTotales }}</td>
            <td data-label="Total" class="der dato col-total">{{ clp(c.total) }}</td>
            <td class="der acciones-col">
              <span class="flecha" aria-hidden="true">▾</span>
            </td>
          </tr>

          <tr v-if="abierta === c.id" class="fila-detalle">
            <td colspan="8">
              <div class="detalle">
                <div v-if="!det" class="suave mini">Cargando detalle…</div>

                <template v-else>
                  <!-- Antes era una <table> anidada dentro de un td con colspan.
                       En móvil eso producía tarjetas dentro de tarjetas. -->
                  <div class="items">
                    <div class="items-cab" aria-hidden="true">
                      <span>Producto</span>
                      <span>Presentación</span>
                      <span class="der">Cant.</span>
                      <span class="der">Costo unit.</span>
                      <span class="der">Varas</span>
                      <span class="der">Por vara</span>
                      <span class="der">Subtotal</span>
                    </div>

                    <div v-for="it in det.items" :key="it.id" class="item">
                      <div class="i-prod">{{ it.emoji }} {{ it.producto }}</div>
                      <div class="i-pres suave mini">{{ it.presentacion }}</div>
                      <div class="i-cant der dato" data-rot="Cantidad">{{ it.cantidad }}</div>
                      <div class="i-costo der dato" data-rot="Costo unit.">{{ clp(it.costoUnitario) }}</div>
                      <div class="i-varas der dato" data-rot="Varas">{{ it.varasTotales }}</div>
                      <div class="i-vara der dato" data-rot="Por vara">
                        {{ clp(it.costoPorVara) }}
                        <span v-if="it.costoAnterior" class="mini"
                          :class="it.costoPorVara > it.costoAnterior ? 'rojo' : 'verde'">
                          antes {{ clp(it.costoAnterior) }}
                        </span>
                      </div>
                      <div class="i-sub der dato" data-rot="Subtotal">{{ clp(it.subtotal) }}</div>
                    </div>
                  </div>

                  <div class="totales">
                    <div><span>Neto</span><b class="dato">{{ clp(det.neto) }}</b></div>
                    <div><span>IVA</span><b class="dato">{{ clp(det.iva) }}</b></div>
                    <div><span>Total</span><b class="dato grande">{{ clp(det.total) }}</b></div>
                  </div>

                  <div v-if="det.lotes.length" class="lotes">
                    <h4>Lotes generados</h4>
                    <div class="chips">
                      <span v-for="l in det.lotes" :key="l.id" class="chip">
                        <b>{{ l.codigo }}</b> · {{ l.producto }} · {{ l.varas }} varas
                        <span v-if="l.fechaVencimiento" class="suave">
                          · vence {{ fecha(l.fechaVencimiento) }}
                        </span>
                      </span>
                    </div>
                  </div>

                  <p v-if="det.notas" class="notas">“{{ det.notas }}”</p>

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
                      registrar la merma de sus lotes indicando devolución al proveedor.
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

  <!-- ---------- Hoja de filtros ---------- -->
  <div v-if="filtrosAbiertos" class="fondo" @click.self="filtrosAbiertos = false">
    <div class="hoja" role="dialog" aria-modal="true" aria-labelledby="titulo-filtros">
      <div class="modal-cab hoja-cab">
        <span class="agarre" aria-hidden="true"></span>
        <h3 id="titulo-filtros">Filtros</h3>
        <button class="btn-icono neutro" @click="filtrosAbiertos = false" aria-label="Cerrar">✕</button>
      </div>

      <div class="modal-cuerpo">
        <div class="grupo">
          <label for="f-estado">Estado</label>
          <select id="f-estado" class="campo" :value="filtro.estado ?? ''"
            @change="filtrar({ estado: $event.target.value || null, pagina: 1 })">
            <option value="">Todos los estados</option>
            <option value="borrador">Borradores</option>
            <option value="recibida">Recibidas</option>
            <option value="anulada">Anuladas</option>
          </select>
        </div>

        <div class="grupo">
          <label for="f-prov">Proveedor</label>
          <select id="f-prov" class="campo" :value="filtro.proveedorId ?? ''"
            @change="filtrar({ proveedorId: $event.target.value ? Number($event.target.value) : null, pagina: 1 })">
            <option value="">Todos los proveedores</option>
            <option v-for="p in proveedores" :key="p.id" :value="p.id">{{ p.nombre }}</option>
          </select>
        </div>

        <div class="grupo">
          <label>Periodo</label>
          <div class="presets">
            <button v-for="p in PRESETS" :key="p.clave" class="preset" :class="{ on: presetActivo === p.clave }"
              @click="aplicarPreset(p.clave)">{{ p.texto }}</button>
          </div>
        </div>

        <div v-if="presetActivo === 'personalizado'" class="rejilla grupo">
          <label class="rango">
            <span class="mini suave">Desde</span>
            <input class="campo" type="date" :value="filtro.desde ?? ''"
              @change="filtrar({ desde: $event.target.value || null, pagina: 1 })">
          </label>
          <label class="rango">
            <span class="mini suave">Hasta</span>
            <input class="campo" type="date" :value="filtro.hasta ?? ''"
              @change="filtrar({ hasta: $event.target.value || null, pagina: 1 })">
          </label>
        </div>
      </div>

      <div class="modal-pie">
        <button class="btn btn-linea" @click="limpiarFiltros">Limpiar</button>
        <button class="btn" @click="filtrosAbiertos = false">Ver resultados</button>
      </div>
    </div>
  </div>

  <!-- ================= MODALES ================= -->
  <!-- El fondo ya no cierra a ciegas: un clic afuera con una compra a medio
       escribir la borraba sin preguntar. -->
  <div v-if="modal" class="fondo" @click.self="intentarCerrar">

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
        <button class="btn btn-linea" @click="intentarCerrar">Cancelar</button>
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

  <!-- Confirmación de descarte -->
  <div v-if="confirmarDescarte" class="fondo z-alto" @click.self="confirmarDescarte = false">
    <div class="modal angosto" role="dialog" aria-modal="true">
      <div class="modal-cab">
        <h3>¿Descartar la compra?</h3>
        <p>Tiene líneas cargadas que se van a perder.</p>
      </div>
      <div class="modal-pie">
        <button class="btn btn-linea" @click="confirmarDescarte = false">Seguir editando</button>
        <button class="btn peligro" @click="descartar">Descartar</button>
      </div>
    </div>
  </div>

  <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'
import { textoEstado, claseEstado } from '@/features/compras/store/compras.module'
import { TIPOS_PRESENTACION } from '@/features/compras/store/presentaciones.module'
import { aDateOnly, hoy } from '@/core/utils/fechas'

/* El mismo valor que el @media de abajo. Si se cambia uno hay que cambiar el
   otro: no hay forma de leer un breakpoint de CSS desde JS. */
const MOVIL = '(max-width: 900px)'

const PRESETS = [
  { clave: 'todo', texto: 'Todo' },
  { clave: 'hoy', texto: 'Hoy' },
  { clave: '7d', texto: '7 días' },
  { clave: 'mes', texto: 'Este mes' },
  { clave: 'personalizado', texto: 'Otro rango' }
]

/* YYYY-MM-DD en hora local. toISOString() da UTC y en Chile adelanta el día
   durante la tarde. */
const iso = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const sumarDias = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export default {
  name: 'ComprasView',

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

      mql = window.matchMedia(MOVIL)
      esMovil.value = mql.matches
      mql.addEventListener('change', alCambiarAncho)
      document.addEventListener('keydown', alTeclado)
    })

    onUnmounted(() => {
      control?.abort()
      mql?.removeEventListener('change', alCambiarAncho)
      document.removeEventListener('keydown', alTeclado)
    })

    const recargar = () => store.dispatch('compras/cargar')
    const filtrar = (cambios) => store.dispatch('compras/filtrar', cambios)

    const busqueda = ref(filtro.value.buscar || '')
    let tmr = null
    watch(busqueda, (v) => {
      clearTimeout(tmr)
      tmr = setTimeout(() => filtrar({ buscar: v.trim(), pagina: 1 }), 350)
    })
    onUnmounted(() => clearTimeout(tmr))

    /* ---------------- Ancho ---------------- */
    /* Se decide en JS y no solo con CSS porque la cabecera del acordeón es un
       <button> real: en escritorio sería un tab-stop de más por cada fila. */
    const esMovil = ref(false)
    let mql = null

    const alCambiarAncho = (e) => { esMovil.value = e.matches }

    /* ---------------- Filtros ---------------- */
    const filtrosAbiertos = ref(false)
    const rangoManual = ref(false)

    const rangoPreset = (clave) => {
      const h = new Date()
      switch (clave) {
        case 'hoy': return { desde: iso(h), hasta: iso(h) }
        case '7d': return { desde: iso(sumarDias(h, -6)), hasta: iso(h) }
        case 'mes': return { desde: iso(new Date(h.getFullYear(), h.getMonth(), 1)), hasta: iso(h) }
        default: return { desde: null, hasta: null }
      }
    }

    /* El preset se deduce del rango puesto en vez de guardarse aparte: así un
       rango que llegue por URL o por el store se refleja solo. */
    const presetActivo = computed(() => {
      const { desde, hasta } = filtro.value
      if (!desde && !hasta) return rangoManual.value ? 'personalizado' : 'todo'
      for (const p of ['hoy', '7d', 'mes']) {
        const r = rangoPreset(p)
        if (r.desde === desde && r.hasta === hasta) return p
      }
      return 'personalizado'
    })

    const aplicarPreset = (clave) => {
      rangoManual.value = clave === 'personalizado'
      if (clave === 'personalizado') return
      filtrar({ ...rangoPreset(clave), pagina: 1 })
    }

    const chips = computed(() => {
      const f = filtro.value
      const out = []
      if (f.estado) {
        out.push({ clave: 'estado', texto: textoEstado(f.estado), cambio: { estado: null } })
      }
      if (f.proveedorId) {
        const p = proveedores.value.find(x => x.id === f.proveedorId)
        out.push({ clave: 'proveedor', texto: p?.nombre || 'Proveedor', cambio: { proveedorId: null } })
      }
      if (f.desde || f.hasta) {
        const texto = presetActivo.value === 'personalizado'
          ? `${f.desde || '…'} a ${f.hasta || '…'}`
          : PRESETS.find(x => x.clave === presetActivo.value)?.texto
        out.push({ clave: 'fechas', texto, cambio: { desde: null, hasta: null } })
      }
      return out
    })

    const nFiltros = computed(() => chips.value.length)

    const quitarChip = (c) => {
      if (c.clave === 'fechas') rangoManual.value = false
      filtrar({ ...c.cambio, pagina: 1 })
    }

    const limpiarFiltros = () => {
      rangoManual.value = false
      busqueda.value = ''
      filtrar({ buscar: '', estado: null, proveedorId: null, desde: null, hasta: null, pagina: 1 })
    }

    /* ---------------- Detalle ---------------- */
    const abierta = ref(null)

    /* detalleDe() es un getter con parámetro: llamarlo quince veces en el
       template lo recalculaba quince veces por render. Solo hay uno abierto. */
    const det = computed(() => (abierta.value ? detalleDe(abierta.value) : null))

    const alternarDetalle = (id) => {
      if (abierta.value === id) {
        abierta.value = null
        return
      }
      abierta.value = id
      store.dispatch('compras/cargarDetalle', { id })
    }

    /* Lo abierto ya no está en pantalla al cambiar de página o de filtro. */
    watch(
      () => [filtro.value.pagina, filtro.value.buscar, filtro.value.estado, filtro.value.proveedorId],
      () => { abierta.value = null }
    )

    /* ---------------- Costo anterior ---------------- */
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
    const confirmarDescarte = ref(false)
    const resalte = usarResalte()
    const { aviso, avisar } = usarAviso()

    const cerrarModal = () => { modal.value = null }

    /* Un clic al fondo borraba la compra a medio escribir sin preguntar. Con
       líneas cargadas ahora pide confirmación; sin nada escrito, cierra. */
    const hayTrabajo = () => {
      const m = modal.value
      if (!m) return false
      if (m.tipo === 'compra') return !!(m.f.items.length || m.f.documento || m.f.notas)
      if (m.tipo === 'presentacion') return !!m.f.nombre.trim()
      return false
    }

    const intentarCerrar = () => {
      if (modal.value?.tipo === 'presentacion') return volverACompra()
      if (hayTrabajo()) {
        confirmarDescarte.value = true
        return
      }
      cerrarModal()
    }

    const descartar = () => {
      confirmarDescarte.value = false
      compraEnEspera = null
      cerrarModal()
    }

    const alTeclado = (e) => {
      if (e.key !== 'Escape') return
      if (confirmarDescarte.value) confirmarDescarte.value = false
      else if (modal.value) intentarCerrar()
      else if (filtrosAbiertos.value) filtrosAbiertos.value = false
      else if (abierta.value) abierta.value = null
    }

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

      /* Con await: sin él los <select> de presentación se montaban contra una
         lista todavía vacía y el v-model no encontraba su opción. */
      await Promise.all(
        [...new Set(d.items.map(it => it.productoId))].map(productoId => {
          traerAnterior(productoId)
          return store.dispatch('presentaciones/cargar', { productoId })
        })
      )

      modal.value = {
        tipo: 'compra',
        f: {
          id: d.id, folio: d.folio, proveedorId: d.proveedorId,
          fecha: aDateOnly(d.fecha), documento: d.documento || '',
          notas: d.notas || '',
          /* La tasa guardada, no un 19 fijo: editar una compra con otra tasa
             la cambiaba en silencio. */
          ivaTasa: d.ivaTasa ?? 19,
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

    /* Sin borrador guardado no hay a dónde volver: cerrar y ya. */
    const volverACompra = () => {
      modal.value = compraEnEspera
        ? { tipo: 'compra', f: compraEnEspera }
        : null
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
        compraEnEspera = null
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
      TIPOS_PRESENTACION, PRESETS, textoEstado, claseEstado,
      puedeEditar, esMovil,
      compras, filtro, totalPaginas, hayAnterior, haySiguiente,
      cargando, guardando, error, borradores, recepcion,
      proveedores, proveedoresActivos, comprables, nombreProducto, presentacionesDe,
      recargar, filtrar, busqueda,
      filtrosAbiertos, presetActivo, aplicarPreset, chips, nFiltros, quitarChip, limpiarFiltros,
      abierta, det, alternarDetalle, anteriorDe,
      modal, cerrarModal, intentarCerrar, confirmarDescarte, descartar,
      abrirNueva, abrirEdicion, agregarLinea,
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
/* ═══════════════════════════════════════════════════
   Compras — consume los tokens globales (tokens.css).
   No define tokens: solo los usa.
   ═══════════════════════════════════════════════════ */
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

/* Las filas ya no entran escalonadas: el stagger se redisparaba con cada
   tecleo del buscador y la lista se sentía lenta. */

@keyframes resalta {
  0% { background: var(--accent-soft); }
  70% { background: var(--accent-soft-2); }
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
  border: 2px solid var(--spinner-track);
  border-top-color: var(--spinner-head);
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
  color: var(--text);
}

/* ---------- Bandas ---------- */
.banda {
  display: flex;
  align-items: center;
  gap: 11px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: var(--r-md);
  margin-bottom: 16px;
  font-size: 0.875rem;
}

.banda-aviso {
  background: var(--warn-soft);
  border: 1px solid var(--warn-border);
  color: var(--warn-text);
}

.banda-error {
  background: var(--danger-soft);
  border: 1px solid var(--danger-border);
  color: var(--danger-text);
}

.banda .btn { margin-left: auto; }

/* ---------- Barra de filtros ---------- */
.barra {
  display: flex;
  gap: 10px;
  align-items: stretch;
  margin-bottom: 12px;
}

.buscador {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 44px;
  padding: 0 12px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  transition: border-color var(--t-fast), box-shadow var(--t-fast);
}

.buscador:focus-within {
  border-color: transparent;
  box-shadow: var(--shadow-focus);
}

.buscador input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  color: var(--text);
  font-family: inherit;
  font-size: max(0.9rem, 16px);
}

.filtros-btn {
  flex: 0 0 auto;
  gap: 8px;
}

.filtros-btn.activo {
  border-color: var(--accent);
  color: var(--accent-text);
}

.globo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  border-radius: var(--r-pill);
  background: var(--accent);
  color: var(--text-on-accent);
  font-size: 0.7rem;
  font-weight: 700;
}

.chips-filtro {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.chip-filtro,
.chip-limpiar {
  border: 1px solid var(--accent-border);
  border-radius: var(--r-pill);
  background: var(--accent-soft);
  color: var(--accent-text);
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 4px 11px;
  cursor: pointer;
}

.chip-limpiar {
  background: transparent;
  border-color: var(--border-strong);
  color: var(--text-muted);
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset {
  padding: 8px 13px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-pill);
  background: var(--surface);
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color var(--t-fast), color var(--t-fast), background-color var(--t-fast);
}

.preset.on {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent-text);
}

.campo {
  width: 100%;
  min-height: 44px;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  font-family: inherit;
  font-size: max(0.9rem, 16px);
  color: var(--text);
  outline: none;
  transition: border-color var(--t-fast), box-shadow var(--t-fast);
}

.campo:focus {
  border-color: transparent;
  box-shadow: var(--shadow-focus);
}

.campo.chico { min-height: 38px; padding: 0.4rem 0.6rem; font-size: max(0.85rem, 16px); }

.rango { display: flex; flex-direction: column; gap: 3px; }

.segmentado {
  display: inline-flex;
  background: var(--surface-3);
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
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--t-fast), color var(--t-fast), box-shadow var(--t-fast);
}

.segmentado button.on {
  background: var(--surface);
  color: var(--accent-text);
  box-shadow: var(--shadow-seg);
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
  color: var(--text);
  cursor: pointer;
}

.interruptor input {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  accent-color: var(--accent);
  cursor: pointer;
}

/* ---------- Tabla ---------- */
.tabla-envoltura {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  overflow: hidden;
  overflow-x: auto;
  transition: opacity 0.14s ease;
}

.tabla-envoltura.atenuada { opacity: 0.45; }

table { width: 100%; border-collapse: collapse; }

th {
  text-align: left;
  padding: 11px 14px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-soft);
  white-space: nowrap;
}

td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--surface-3);
  font-size: 0.875rem;
  vertical-align: middle;
  color: var(--text);
}

tbody tr:last-child td { border-bottom: 0; }
tr.clic { cursor: pointer; }
tr.anulada { opacity: 0.5; }
.fila td { transition: background-color 0.16s ease; }
tr.clic:hover td, tr.clic.abierta td { background: var(--surface-2); }

.der { text-align: right; }
.suave { color: var(--text-soft); }
.mini { font-size: 0.78rem; }
.rojo { color: var(--danger); }
.verde { color: var(--accent-text); }

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.dato.grande { font-size: 1.1rem; }

.acciones-col { width: 1%; white-space: nowrap; }

.detalle-linea {
  font-size: 0.75rem;
  color: var(--text-faint);
  margin-top: 2px;
}

.etiqueta {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--r-pill);
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.et-verde { background: var(--accent-soft); color: var(--accent-text); }
.et-ambar { background: var(--warn-soft); color: var(--warn-text-2); }
.et-gris { background: var(--tag-gris-bg); color: var(--tag-gris-text); }

/* La cabecera del acordeón no existe en escritorio */
.cab { display: none; }

/* ---------- Detalle ---------- */
.fila-detalle td { background: var(--surface-2); padding: 0; }

.detalle { padding: 14px; }

/* Las líneas comparten una sola definición de grilla con sus rótulos: si se
   agrega una columna, se agrega en un lugar. */
.items {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  overflow: hidden;
}

.items-cab,
.item {
  display: grid;
  grid-template-columns: minmax(130px, 1.5fr) minmax(100px, 1fr) 58px 92px 64px 104px 92px;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
}

.items-cab {
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-soft);
  white-space: nowrap;
}

.item {
  border-bottom: 1px solid var(--surface-3);
  font-size: 0.82rem;
}

.item:last-child { border-bottom: 0; }

.i-vara .mini { display: block; }

.totales {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
}

.totales div { display: flex; flex-direction: column; gap: 2px; }
.totales span { color: var(--text-soft); font-size: 0.72rem; }

.lotes { margin-top: 16px; }

.lotes h4 {
  margin: 0 0 8px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.chip {
  padding: 6px 11px;
  border-radius: var(--r-sm);
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 0.78rem;
  color: var(--text-muted);
}

.chip b { font-variant-numeric: tabular-nums; }

.notas {
  margin: 12px 0 0;
  padding: 9px 11px;
  background: var(--surface);
  border-left: 3px solid var(--accent-border);
  border-radius: 0 7px 7px 0;
  font-size: 0.8rem;
  color: var(--text-muted);
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
  border-radius: var(--r-sm);
  background: var(--accent);
  color: var(--text-on-accent);
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.btn:hover:not(:disabled) { background: var(--accent-hover); }
.btn:active:not(:disabled) { transform: scale(0.97); }
.btn:disabled { background: var(--accent-disabled); cursor: not-allowed; }

.btn.peligro { background: var(--danger); }

.btn-linea {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.btn-linea:hover:not(:disabled) { background: var(--surface-2); border-color: var(--text-faint); }
.btn-linea:disabled { background: transparent; color: var(--border-strong); }

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
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-soft);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.btn-icono:hover { border-color: var(--danger); color: var(--danger); }

/* Cerrar una hoja no es destructivo: no debe teñirse de rojo al pasar. */
.btn-icono.neutro:hover { border-color: var(--border-strong); color: var(--text); }

.btn-icono.chico { width: 28px; height: 28px; }

.enlace-boton {
  margin-top: 5px;
  padding: 0;
  border: none;
  background: none;
  color: var(--accent);
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
  background: var(--overlay);
}

.fondo.z-alto { z-index: 70; }

.modal,
.hoja {
  width: 100%;
  max-width: 500px;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-radius: var(--r-xl);
  box-shadow: var(--shadow-modal);
}

.modal.ancho { max-width: 760px; }
.modal.angosto { max-width: 380px; }

.modal-cab {
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.hoja-cab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}

.hoja-cab h3 { flex: 1; }

.agarre { display: none; }

.modal-cab h3 { margin: 0; font-size: 1.15rem; color: var(--text); }
.modal-cab p { margin: 4px 0 0; font-size: 0.82rem; color: var(--text-soft); }

.modal-cuerpo { padding: 18px 20px; overflow-y: auto; }

.modal-pie {
  display: flex;
  gap: 9px;
  justify-content: flex-end;
  flex-wrap: wrap;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
}

label {
  display: block;
  margin-bottom: 5px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
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
  color: var(--text-faint);
  line-height: 1.5;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

.parrafo {
  margin: 0 0 14px;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--text-muted);
}

.error {
  padding: 10px 13px;
  margin-bottom: 14px;
  border-radius: var(--r-sm);
  border-left: 4px solid var(--danger);
  background: var(--danger-soft);
  color: var(--danger-text);
  font-size: 0.85rem;
}

.nota {
  padding: 11px 13px;
  margin-top: 14px;
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
  border-left: 3px solid var(--accent-strong);
  background: var(--accent-soft-bg);
  color: var(--text-muted);
  font-size: 0.83rem;
  line-height: 1.6;
}

.nota.alerta {
  border-color: var(--warn);
  background: var(--warn-soft-bg);
  color: var(--warn-text);
}

/* ---------- Constructor de líneas ---------- */
.constructor {
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  overflow: hidden;
  margin-bottom: 15px;
}

.constructor-vacio {
  padding: 22px;
  text-align: center;
  color: var(--text-faint);
  font-size: 0.85rem;
}

.linea {
  padding: 12px 13px;
  border-bottom: 1px solid var(--surface-3);
  background: var(--surface);
}

.linea:last-child { border-bottom: 0; }

.linea-cab {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 9px;
}

.linea-cab .crece { flex: 1; min-width: 0; font-size: 0.9rem; color: var(--text); }

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
  border-top: 1px dashed var(--border-dashed);
  font-size: 0.8rem;
  color: var(--text-soft);
}

.linea-calculo .sep { color: var(--border-strong); }
.linea-calculo .subtotal { margin-left: auto; color: var(--text); }

/* ---------- Varios ---------- */
.vacio {
  text-align: center;
  padding: 44px 20px;
  color: var(--text-soft);
  background: var(--surface);
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-lg);
}

.vacio strong {
  display: block;
  color: var(--text);
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
  border-radius: var(--r-md);
  background: var(--toast-bg);
  color: var(--toast-text);
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: var(--shadow-toast);
  text-align: center;
}

.aviso.malo { background: var(--toast-malo); }

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

  /* Cerrada, la fila es una línea. El relleno vive en la cabecera y en las
     celdas del cuerpo, no en la fila, para que colapse sin dejar aire. */
  tbody tr.fila {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    margin-bottom: 10px;
    padding: 0;
    overflow: hidden;
  }

  tr.clic:hover td, tr.clic.abierta td { background: transparent; }

  /* ── Cabecera: folio, estado y total ── */

  td[data-label="Folio"] {
    display: block;
    padding: 0;
    border: none;
    text-align: left;
  }

  td[data-label="Folio"]::before { content: none; }

  tr.fila.abierta td[data-label="Folio"] { border-bottom: 1px solid var(--border); }

  .cab {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    min-height: 54px;
    padding: 0 14px;
    border: 0;
    background: none;
    color: inherit;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
  }

  .cab:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .cab-folio {
    flex: 1;
    min-width: 0;
    font-size: 0.92rem;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cab-total { flex-shrink: 0; font-size: 0.95rem; }

  .chevron {
    flex-shrink: 0;
    color: var(--text-faint);
    font-size: 1.15rem;
    line-height: 1;
    transition: transform 0.16s ease;
  }

  tr.fila.abierta .chevron { transform: rotate(90deg); }

  /* Estado y total ya están en la cabecera: repetirlos abajo sería ruido. */
  .col-estado, .col-total, .acciones-col { display: none; }

  /* ── Cuerpo ── */

  tbody tr.fila:not(.abierta) td:not([data-label="Folio"]) { display: none; }

  tr.fila.abierta td:not([data-label="Folio"]) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 8px 14px;
    border: none;
    text-align: right;
  }

  tr.fila.abierta td:not([data-label="Folio"])::before {
    content: attr(data-label);
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-faint);
    text-align: left;
    flex-shrink: 0;
  }

  tr.fila.abierta td:last-of-type { padding-bottom: 12px; }

  /* El detalle es continuación de la tarjeta de arriba, no una suelta */
  tbody tr.fila.abierta {
    margin-bottom: 0;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  tbody tr.fila-detalle {
    display: block;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-top: none;
    border-radius: 0 0 var(--r-lg) var(--r-lg);
    margin-bottom: 10px;
    padding: 0;
    overflow: hidden;
  }

  .fila-detalle td { display: block; padding: 0; border: none; }
  .fila-detalle td::before { content: none; }

  .fila.resaltada { animation: resalta 1400ms ease-out; }
  .fila.resaltada td { animation: none; }

  /* ── Líneas del detalle: dos columnas con rótulo ── */

  .items-cab { display: none; }

  .item {
    grid-template-columns: 1fr 1fr;
    gap: 4px 12px;
    padding: 10px 12px;
  }

  .i-prod, .i-pres { grid-column: 1 / -1; }
  .i-prod { font-weight: 600; }

  .i-cant, .i-costo, .i-varas, .i-vara, .i-sub {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    text-align: right;
  }

  .i-cant::before, .i-costo::before, .i-varas::before,
  .i-vara::before, .i-sub::before {
    content: attr(data-rot);
    font-size: 0.66rem;
    font-weight: 400;
    color: var(--text-faint);
  }

  .i-sub {
    grid-column: 1 / -1;
    margin-top: 4px;
    padding-top: 6px;
    border-top: 1px solid var(--surface-3);
  }

  /* ── Hojas: suben desde abajo ── */

  .fondo { place-items: end center; padding: 0; }

  .modal, .hoja {
    max-width: none;
    max-height: 92dvh;
    border-radius: var(--r-xl) var(--r-xl) 0 0;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .modal.angosto { max-width: none; }

  .hoja-cab { padding-top: 22px; }

  .agarre {
    display: block;
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 34px;
    height: 4px;
    border-radius: var(--r-pill);
    background: var(--border-strong);
  }

  .modal-pie { flex-direction: column-reverse; }
  .modal-pie .btn { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .btn, .btn-icono, .campo, .buscador, .flecha, .chevron,
  .segmentado button, .tabla-envoltura, .fila td { transition: none; }

  .al-entrar, .fila.resaltada, .fila.resaltada td, .spinner { animation: none; }

  .tabla-envoltura.atenuada { opacity: 1; }
}
</style>