<template>
  
    <div class="cabecera al-entrar">
      <div>
        <h2>Inventario</h2>
        <p class="pista">
          {{ puedeEditar
            ? 'Los ramos se descuentan de los tallos según su receta.'
            : 'Tu rol permite consultar el inventario, no modificarlo.' }}
        </p>
      </div>
      <button v-if="puedeEditar" class="btn" @click="abrirNuevo">＋ Nuevo producto</button>
    </div>

    <div v-if="error" class="banda banda-error">
      <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      <button class="btn btn-mini" @click="recargar">Reintentar</button>
    </div>

    <!-- ---------- Indicadores ---------- -->
    <div class="kpis">
      <div class="kpi destacado al-entrar" style="--i: 1">
        <div class="rot">Inventario a costo</div>
        <div class="val">{{ clp(valorInventario) }}</div>
        <div class="pie">{{ varasEnCamara.toLocaleString('es-CL') }} varas en cámara</div>
      </div>
      <div class="kpi al-entrar" style="--i: 2">
        <div class="rot">Productos en catálogo</div>
        <div class="val">{{ total }}</div>
        <div class="pie">{{ filtro.activo === null ? 'Incluye desactivados' : 'Solo activos' }}</div>
      </div>
      <div class="kpi al-entrar" style="--i: 3" :class="{ alerta: bajoMinimo.length }">
        <div class="rot">Bajo el mínimo</div>
        <div class="val">{{ bajoMinimo.length }}</div>
        <div class="pie">{{ bajoMinimo.length ? 'Requieren reposición' : 'Todo en orden' }}</div>
      </div>
      <div class="kpi al-entrar" style="--i: 4" :class="{ alerta: criticos.length }">
        <div class="rot">Lotes críticos</div>
        <div class="val">{{ criticos.length }}</div>
        <div class="pie">
          {{ criticos.length ? 'Vencidos o por liquidar' : 'Sin vencimientos cerca' }}
        </div>
      </div>
    </div>

    <div v-if="bajoMinimo.length" class="banda banda-aviso">
      <span aria-hidden="true">📦</span>
      <span>Hay que reponer: <b>{{bajoMinimo.slice(0, 8).map(p => p.nombre).join(', ')}}</b>
        <span v-if="bajoMinimo.length > 8"> y {{ bajoMinimo.length - 8 }} más</span>
      </span>
    </div>

    <!-- ---------- Filtros ---------- -->
    <div class="barra-filtros al-entrar" style="--i: 5">
      <div class="buscador">
        <span aria-hidden="true">🔎</span>
        <input v-model="busqueda" placeholder="Buscar por nombre o código…" aria-label="Buscar producto">
        <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
      </div>

      <div class="segmentado">
        <button v-for="t in FILTRO_TIPOS" :key="t.valor" :class="{ on: filtro.tipo === t.valor }"
          @click="filtrar({ tipo: t.valor })">{{ t.texto }}</button>
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
        <input type="checkbox" :checked="filtro.bajoMinimo" @change="filtrar({ bajoMinimo: $event.target.checked })">
        <span>Solo bajo mínimo</span>
      </label>

      <label class="check">
        <input type="checkbox" :checked="filtro.activo === null"
          @change="filtrar({ activo: $event.target.checked ? null : true })">
        <span>Ver desactivados</span>
      </label>
    </div>

    <!-- ---------- Tabla ---------- -->
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
            <th class="der">Disponible</th>
            <th class="der">Mínimo</th>
            <th class="acciones-col"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(p, idx) in productos" :key="p.id">
            <tr class="fila" :style="{ '--i': Math.min(idx, 12) }"
              :class="{ inactiva: !p.activo, abierta: verReceta === p.id, resaltada: p.id === resalte.id }">
              <td data-label="Producto">
                <div class="celda-producto">
                  <span class="emoji" aria-hidden="true">{{ p.emoji }}</span>
                  <div class="min0">
                    <div class="nombre">
                      {{ p.nombre }}
                      <span class="etiqueta" :class="p.tipo === 'armado' ? 'et-rosa' : 'et-verde'">
                        {{ p.tipo }}
                      </span>
                      <span v-if="p.controlaLotes" class="etiqueta et-azul" title="Las existencias entran por lote">
                        lotes
                      </span>
                      <span v-if="!p.activo" class="etiqueta et-gris">desactivado</span>
                    </div>
                    <button v-if="p.tipo === 'armado'" class="ver-receta" :class="{ abierta: verReceta === p.id }"
                      @click="alternarReceta(p.id)">
                      <span class="flecha" aria-hidden="true">▾</span> ver receta
                    </button>
                    <div v-else class="codigo">{{ p.codigo }}</div>
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

              <td data-label="Disponible" class="der">
                <div class="dato" :class="claseStock(p)">{{ p.disponible }}</div>
                <div v-if="p.tipo === 'armado'" class="desglose">
                  {{ p.stockListo || 0 }} listos + {{ p.posiblesDeArmar || 0 }} por armar
                </div>
              </td>

              <td data-label="Mínimo" class="der dato suave">{{ p.minimo }}</td>

              <td class="der acciones-col">
                <div class="acciones">
                  <!--
                    El ajuste manual solo existe para productos sin control
                    por lote. En una flor las existencias pertenecen a un
                    lote concreto: sumar unidades sueltas dejaría stock sin
                    procedencia ni vencimiento, y la API lo rechaza.
                  -->
                  <button v-if="puedeEditar && p.tipo === 'simple' && !p.controlaLotes" class="btn-icono"
                    title="Ajustar stock" @click="abrirAjuste(p)">±</button>
                  <button v-if="puedeEditar && p.tipo === 'armado'" class="btn-icono" title="Armar unidades"
                    @click="armando = p">🧰</button>
                  <button v-if="puedeEditar" class="btn-icono" title="Editar" @click="abrirEdicion(p)">✏️</button>
                  <button v-if="puedeEditar && p.activo" class="btn-icono peligro" title="Dar de baja"
                    @click="abrirBaja(p)">🗑️</button>
                  <button v-if="puedeEditar && !p.activo" class="btn btn-linea btn-mini"
                    @click="cambiarEstado(p, true)">Reactivar</button>
                  <span v-if="!puedeEditar" class="suave mini">solo lectura</span>
                </div>
              </td>
            </tr>

            <tr v-if="verReceta === p.id" class="fila-receta">
              <td colspan="8">
                <div class="receta">
                  <div v-if="cargandoDetalle === p.id" class="suave mini">Cargando receta…</div>
                  <template v-else>
                    <b>Receta de {{ p.nombre }}</b>
                    <ul>
                      <li v-for="ing in recetaDe(p.id)" :key="ing.productoId">
                        {{ ing.cantidad }} × {{ ing.emoji }} {{ ing.nombre }}
                        <span class="suave">
                          — {{ clp(ing.subtotal) }} · hay {{ ing.stockDisponible }},
                          alcanza para {{ ing.alcanzaPara }}
                        </span>
                      </li>
                      <li v-if="detalleDe(p.id)?.costoArmado" class="suave">
                        Mano de obra: {{ clp(detalleDe(p.id).costoArmado) }}
                      </li>
                      <li v-if="!recetaDe(p.id).length" class="suave">
                        Sin ingredientes. Un ramo sin receta no se puede armar ni costear.
                      </li>
                    </ul>
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

    <!-- ---------- Movimientos ---------- -->
    <section class="movimientos">
      <button class="titulo-plegable" :class="{ abierta: verMovimientos }" @click="alternarMovimientos">
        <span class="flecha" aria-hidden="true">▾</span>
        Últimos movimientos
      </button>

      <div v-if="verMovimientos" class="tabla-envoltura">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Producto</th>
              <th>Lote</th>
              <th class="der">Cantidad</th>
              <th>Motivo</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in movimientos" :key="m.id" class="fila">
              <td data-label="Fecha" class="dato mini">{{ fechaHora(m.fecha) }}</td>
              <td data-label="Tipo"><span class="etiqueta" :class="claseMovimiento(m.tipo)">{{ m.tipo }}</span></td>
              <td data-label="Producto">{{ m.producto }}</td>
              <td data-label="Lote" class="mini suave">{{ m.loteCodigo || '—' }}</td>
              <td data-label="Cantidad" class="der dato" :class="{ negativo: m.cantidad < 0 }">
                {{ m.cantidad > 0 ? '+' : '' }}{{ m.cantidad }}
              </td>
              <td data-label="Motivo" class="suave">{{ m.motivo }}</td>
              <td data-label="Usuario" class="suave mini">{{ m.usuario || '—' }}</td>
            </tr>
            <tr v-if="!movimientos.length">
              <td colspan="7" class="suave">Sin movimientos registrados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- =================== MODAL DE ARMADO =================== -->
    <ModalArmado v-if="armando" :producto="armando" @cerrar="armando = null" @armado="alArmar" />

    <!-- =================== MODALES =================== -->
    <div v-if="modal" class="fondo" @click.self="cerrarModal">

      <!-- Crear / editar producto -->
      <div v-if="modal.tipo === 'producto'" class="modal ancho">
        <div class="modal-cab">
          <h3>{{ modal.f.id ? 'Editar producto' : 'Nuevo producto' }}</h3>
          <p>El código debe ser único en todo el inventario.</p>
        </div>

        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <div class="grupo">
            <label>Tipo de producto</label>
            <div class="segmentado ancho-total">
              <button v-for="t in TIPOS" :key="t.valor" :class="{ on: modal.f.tipo === t.valor }"
                :disabled="!!modal.f.id" @click="modal.f.tipo = t.valor">
                {{ t.texto }} — {{ t.ayuda }}
              </button>
            </div>
            <p v-if="modal.f.id" class="ayuda">El tipo no se puede cambiar después de creado.</p>
          </div>

          <div class="rejilla grupo">
            <div>
              <label for="p-nombre">Nombre</label>
              <input id="p-nombre" class="campo" v-model="modal.f.nombre" maxlength="160" placeholder="Ramo de peonías">
            </div>
            <div>
              <label for="p-codigo">Código</label>
              <input id="p-codigo" class="campo dato" v-model="modal.f.codigo" maxlength="40" placeholder="790005">
            </div>
          </div>

          <div class="rejilla grupo">
            <div>
              <label for="p-cat">Categoría</label>
              <select id="p-cat" class="campo" v-model.number="modal.f.categoriaId">
                <option :value="null">Selecciona…</option>
                <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
              </select>
              <button class="enlace-boton" @click="abrirCategoria">＋ Crear categoría</button>
            </div>
            <div>
              <label for="p-emoji">Emoji</label>
              <input id="p-emoji" class="campo" v-model="modal.f.emoji" maxlength="4">
            </div>
          </div>

          <!-- Producto simple -->
          <div v-if="modal.f.tipo === 'simple'">
            <div class="rejilla-3 grupo">
              <div>
                <label for="p-costo">Costo unitario</label>
                <input id="p-costo" class="campo dato" type="number" min="0" step="50" v-model.number="modal.f.costo">
              </div>
              <div>
                <label for="p-precio">Precio de venta</label>
                <input id="p-precio" class="campo dato" type="number" min="1" step="100"
                  v-model.number="modal.f.precio">
              </div>
              <div>
                <label for="p-min">Stock mínimo</label>
                <input id="p-min" class="campo dato" type="number" min="0" v-model.number="modal.f.minimo">
              </div>
            </div>

            <div v-if="!modal.f.id" class="grupo">
              <label class="interruptor">
                <input type="checkbox" v-model="modal.f.controlaLotes">
                <span>Controla lotes</span>
              </label>
              <p class="ayuda">
                Las flores sí; un jarrón de vidrio no. Con lotes activados, las
                existencias entran recibiendo una compra —que es lo que crea el
                lote con su procedencia y su vencimiento— y el ajuste manual
                deja de estar disponible.
              </p>
            </div>

            <div v-if="modal.f.controlaLotes" class="grupo">
              <label for="p-vida">Días de vida en cámara</label>
              <input id="p-vida" class="campo dato" type="number" min="1" max="3650" v-model.number="modal.f.diasVida">
              <p class="ayuda">Fija el vencimiento de cada lote que se reciba.</p>
            </div>

            <div v-else-if="!modal.f.id" class="grupo">
              <label for="p-stock">Stock inicial</label>
              <input id="p-stock" class="campo dato" type="number" min="0" v-model.number="modal.f.stockInicial">
              <p class="ayuda">Después el stock solo cambia con ajustes, para que quede el rastro.</p>
            </div>
          </div>

          <!-- Producto armado -->
          <div v-else>
            <label>Receta</label>
            <div class="constructor">
              <div v-if="!modal.f.receta.length" class="constructor-vacio">
                Sin ingredientes. Un ramo sin receta no se puede armar ni costear.
              </div>
              <div v-for="(l, i) in modal.f.receta" :key="l.uid" class="constructor-fila">
                <span class="crece">{{ nombreDe(l.productoId) }}</span>
                <input class="entrada-tabla" type="number" min="1" v-model.number="l.cantidad" aria-label="Cantidad">
                <span class="dato mini suave">{{ clp(costoLinea(l)) }}</span>
                <button class="btn-icono chico" @click="modal.f.receta.splice(i, 1)" aria-label="Quitar">✕</button>
              </div>
            </div>

            <div class="grupo">
              <label for="p-ing">Agregar ingrediente</label>
              <select id="p-ing" class="campo"
                @change="agregarIngrediente($event.target.value); $event.target.value = ''">
                <option value="">Selecciona un producto simple…</option>
                <option v-for="s in simples" :key="s.id" :value="s.id">
                  {{ s.nombre }} — {{ clp(s.costoUnitario) }} · hay {{ s.disponible }}
                </option>
              </select>
              <p class="ayuda">
                Solo productos simples: así un ramo nunca contiene otro ramo.
                Si el que buscas no aparece, filtrá menos en la lista de atrás.
              </p>
            </div>

            <div class="rejilla-3 grupo">
              <div>
                <label for="p-mano">Mano de obra</label>
                <input id="p-mano" class="campo dato" type="number" min="0" step="500"
                  v-model.number="modal.f.costoArmado">
              </div>
              <div>
                <label for="p-precio2">Precio de venta</label>
                <input id="p-precio2" class="campo dato" type="number" min="1" step="500"
                  v-model.number="modal.f.precio">
              </div>
              <div>
                <label for="p-min2">Mínimo a mantener</label>
                <input id="p-min2" class="campo dato" type="number" min="0" v-model.number="modal.f.minimo">
              </div>
            </div>

            <div class="resumen">
              <div><span>Costo estimado</span><b class="dato">{{ clp(costoReceta) }}</b></div>
              <div>
                <span>Margen resultante</span>
                <b class="dato" :class="margenFormulario < 25 ? 'margen-bajo' : 'margen-ok'">
                  {{ margenFormulario.toFixed(0) }}%
                </b>
              </div>
            </div>
            <p class="ayuda">
              Estimado con el costo de ficha de cada ingrediente. El costo real
              de cada producción depende de qué lotes se consuman.
            </p>
          </div>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" @click="cerrarModal">Cancelar</button>
          <button class="btn" :disabled="guardando" @click="guardarProducto">
            <span v-if="guardando" class="spinner" aria-hidden="true"></span>
            {{ guardando ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </div>

      <!-- Nueva categoría -->
      <div v-else-if="modal.tipo === 'categoria'" class="modal">
        <div class="modal-cab">
          <h3>Nueva categoría</h3>
          <p>Agrupa productos en el catálogo y en el punto de venta.</p>
        </div>
        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>
          <div class="rejilla grupo">
            <div>
              <label for="c-nom">Nombre</label>
              <input id="c-nom" class="campo" v-model="modal.f.nombre" maxlength="80" placeholder="Ramos">
            </div>
            <div>
              <label for="c-ord">Orden</label>
              <input id="c-ord" class="campo dato" type="number" min="0" max="999" v-model.number="modal.f.orden">
            </div>
          </div>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="volverAProducto">Cancelar</button>
          <button class="btn" @click="guardarCategoria">Crear</button>
        </div>
      </div>

      <!-- Ajuste de stock -->
      <div v-else-if="modal.tipo === 'ajuste'" class="modal">
        <div class="modal-cab">
          <h3>Ajustar stock</h3>
          <p>{{ modal.f.producto.nombre }} · hay {{ modal.f.producto.stock }}</p>
        </div>

        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <div class="grupo">
            <label>Movimiento</label>
            <div class="segmentado ancho-total">
              <button :class="{ on: modal.f.signo === 1 }" @click="modal.f.signo = 1">Entrada (+)</button>
              <button :class="{ on: modal.f.signo === -1 }" @click="modal.f.signo = -1">Salida (−)</button>
            </div>
          </div>

          <div class="rejilla grupo">
            <div>
              <label for="a-c">Cantidad</label>
              <input id="a-c" class="campo dato" type="number" min="1" v-model.number="modal.f.cantidad">
            </div>
            <div>
              <label for="a-m">Motivo</label>
              <select id="a-m" class="campo" v-model="modal.f.motivo">
                <option v-for="m in MOTIVOS_AJUSTE" :key="m">{{ m }}</option>
              </select>
            </div>
          </div>

          <div class="grupo">
            <label for="a-d">Detalle (opcional)</label>
            <input id="a-d" class="campo" v-model="modal.f.detalle" placeholder="N° de factura, proveedor…">
          </div>

          <div class="nota" :class="{ alerta: stockResultante < 0 }">
            Stock resultante: <b class="dato">{{ stockResultante }}</b>
            <span v-if="stockResultante < 0"> — la salida deja el stock en negativo.</span>
          </div>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" @click="cerrarModal">Cancelar</button>
          <button class="btn" :disabled="guardando" @click="confirmarAjuste">
            <span v-if="guardando" class="spinner" aria-hidden="true"></span>
            {{ guardando ? 'Registrando…' : 'Registrar movimiento' }}
          </button>
        </div>
      </div>

      <!-- Baja -->
      <div v-else-if="modal.tipo === 'baja'" class="modal">
        <div class="modal-cab">
          <h3>Dar de baja</h3>
          <p>{{ modal.f.producto.nombre }}</p>
        </div>

        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <p class="parrafo">
            <b>Desactivar</b> lo saca del punto de venta pero conserva su historial
            y sus recetas. Es lo que quieres casi siempre. Si el producto es
            ingrediente de algún ramo, la API lo rechaza.
          </p>
          <p class="parrafo">
            <b>Eliminar</b> lo borra definitivamente. Solo funciona en productos sin
            movimientos, ventas ni lotes: los creados por error.
          </p>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" @click="cerrarModal">Cancelar</button>
          <button v-if="esAdmin" class="btn btn-rojo" :disabled="guardando"
            @click="confirmarBaja(true)">Eliminar</button>
          <button class="btn" :disabled="guardando" @click="confirmarBaja(false)">Desactivar</button>
        </div>
      </div>
    </div>

    <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import ModalArmado from '@/features/inventario/components/ModalArmado.vue'
import { TIPOS, MOTIVOS_AJUSTE } from '@/features/inventario/store/productos.module'
import { claseMovimiento } from '@/features/inventario/store/inventario.module'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'

const FILTRO_TIPOS = [
  { valor: null, texto: 'Todos' },
  { valor: 'simple', texto: 'Simples' },
  { valor: 'armado', texto: 'Armados' }
]

export default {
  name: 'InventarioView',
  components: { ModalArmado },

  setup() {
    const store = useStore()
    const { usarResalte, usarAviso } = useTemporizadores()

    /* Ver: cualquier rol con el permiso. Editar: admin y bodega.
       Eliminar definitivo: solo admin. La barrera real está en las políticas. */
    const esAdmin = computed(() => store.getters['auth/esAdmin'])
    const puedeEditar = computed(() => store.getters['auth/tieneRol']('admin', 'bodega'))

    /* ---------------- Datos ---------------- */
    const productos = computed(() => store.getters['productos/productos'])
    const total = computed(() => store.getters['productos/total'])
    const totalPaginas = computed(() => store.getters['productos/totalPaginas'])
    const filtro = computed(() => store.getters['productos/filtro'])
    const cargando = computed(() => store.getters['productos/cargando'])
    const cargandoDetalle = computed(() => store.getters['productos/cargandoDetalle'])
    const guardando = computed(() => store.getters['productos/guardando'])
    const error = computed(() => store.getters['productos/error'])
    const simples = computed(() => store.getters['productos/simples'])
    const hayFiltro = computed(() => store.getters['productos/hayFiltro'])

    const detalleDe = (id) => store.getters['productos/detalleDe'](id)
    const recetaDe = (id) => store.getters['productos/recetaDe'](id)

    const categorias = computed(() => store.getters['inventario/categorias'])
    const bajoMinimo = computed(() => store.getters['inventario/bajoMinimo'])
    const movimientos = computed(() => store.getters['inventario/movimientos'])

    /*
     * El valor del inventario NO sale de sumar la página de productos: con
     * el catálogo paginado sería un número falso. Sale del promedio
     * ponderado por lote, que es el único que sabe a qué precio entró cada
     * vara que hay hoy en cámara.
     */
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
      store.dispatch('lotes/cargarCostoPromedio', señal)
      store.dispatch('lotes/cargarAlertas', señal)
    })

    onUnmounted(() => control?.abort())

    const recargar = () => store.dispatch('productos/cargar')
    const filtrar = (cambios) => store.dispatch('productos/filtrar', cambios)

    /* La búsqueda viaja al servidor, así que lleva retraso: una petición
       por tecla sería una de más por cada letra. */
    const busqueda = ref(filtro.value.buscar || '')
    let tmr = null
    watch(busqueda, (v) => {
      clearTimeout(tmr)
      tmr = setTimeout(() => filtrar({ buscar: v.trim() }), 350)
    })
    onUnmounted(() => clearTimeout(tmr))

    /* ---------------- Receta y movimientos ---------------- */
    const verReceta = ref(null)
    const verMovimientos = ref(false)

    const alternarReceta = (id) => {
      if (verReceta.value === id) {
        verReceta.value = null
        return
      }
      verReceta.value = id
      /* La lista no trae la receta: solo el detalle la incluye. */
      store.dispatch('productos/cargarDetalle', { id })
    }

    const alternarMovimientos = () => {
      verMovimientos.value = !verMovimientos.value
      if (verMovimientos.value && !movimientos.value.length) {
        store.dispatch('inventario/cargarMovimientos')
      }
    }

    const claseStock = (p) => {
      if (p.disponible === 0) return 'stock-cero'
      if (p.bajoMinimo) return 'stock-bajo'
      return ''
    }

    /* ---------------- Modales ---------------- */
    const modal = ref(null)
    const armando = ref(null)
    const resalte = usarResalte()
    const { aviso, avisar } = usarAviso()

    const cerrarModal = () => { modal.value = null }

    /* uid propio por línea: el índice del v-for no sirve como key porque al
       borrar la línea 2 las siguientes cambian de índice y Vue reutiliza el
       input equivocado. */
    let contador = 0
    const conUid = (l) => ({ ...l, uid: ++contador })

    const fichaVacia = () => ({
      id: null, tipo: 'simple', nombre: '', codigo: '', categoriaId: null, emoji: '🌿',
      precio: null, minimo: 3, costo: null, stockInicial: 0,
      controlaLotes: false, diasVida: 7,
      receta: [], costoArmado: 3000, error: ''
    })

    const abrirNuevo = () => { modal.value = { tipo: 'producto', f: fichaVacia() } }

    const abrirEdicion = async (p) => {
      const detalle = await store.dispatch('productos/cargarDetalle', { id: p.id }) || p
      modal.value = {
        tipo: 'producto',
        f: {
          ...fichaVacia(),
          id: detalle.id,
          tipo: detalle.tipo,
          nombre: detalle.nombre,
          codigo: detalle.codigo,
          categoriaId: detalle.categoriaId,
          emoji: detalle.emoji,
          precio: detalle.precio,
          minimo: detalle.minimo,
          costo: detalle.costoUnitario,
          controlaLotes: detalle.controlaLotes,
          diasVida: detalle.diasVida,
          costoArmado: detalle.costoArmado ?? 0,
          receta: (detalle.receta || []).map(r =>
            conUid({ productoId: r.productoId, cantidad: r.cantidad })),
          error: ''
        }
      }
    }

    const abrirAjuste = (p) => {
      modal.value = {
        tipo: 'ajuste',
        f: { producto: p, signo: 1, cantidad: 1, motivo: MOTIVOS_AJUSTE[0], detalle: '', error: '' }
      }
    }

    const abrirBaja = (p) => {
      modal.value = { tipo: 'baja', f: { producto: p, error: '' } }
    }

    /* La categoría se crea sin perder lo que ya se escribió del producto */
    let productoEnEspera = null
    const abrirCategoria = () => {
      productoEnEspera = modal.value.f
      modal.value = { tipo: 'categoria', f: { nombre: '', orden: 0, error: '' } }
    }

    const volverAProducto = () => {
      modal.value = { tipo: 'producto', f: productoEnEspera }
    }

    const guardarCategoria = async () => {
      const f = modal.value.f
      f.error = ''
      if (!f.nombre.trim() || f.nombre.trim().length < 2) {
        return (f.error = 'El nombre debe tener al menos 2 caracteres.')
      }
      try {
        const creada = await store.dispatch('inventario/crearCategoria', {
          nombre: f.nombre.trim(), orden: f.orden || 0
        })
        productoEnEspera.categoriaId = creada.id
        volverAProducto()
        avisar('Categoría creada')
      } catch (e) {
        f.error = e.message
      }
    }

    /* ---------------- Receta en el formulario ---------------- */
    const nombreDe = (id) => simples.value.find(p => p.id === id)?.nombre || `Producto #${id}`
    const costoUnitarioDe = (id) => simples.value.find(p => p.id === id)?.costoUnitario || 0
    const costoLinea = (l) => costoUnitarioDe(l.productoId) * (l.cantidad || 0)

    const agregarIngrediente = (id) => {
      if (!id) return
      const f = modal.value.f
      const productoId = Number(id)
      const existe = f.receta.find(l => l.productoId === productoId)
      if (existe) existe.cantidad++
      else f.receta.push(conUid({ productoId, cantidad: 1 }))
    }

    const costoReceta = computed(() => {
      if (modal.value?.tipo !== 'producto') return 0
      const f = modal.value.f
      return f.receta.reduce((t, l) => t + costoLinea(l), 0) + (f.costoArmado || 0)
    })

    const margenFormulario = computed(() => {
      const precio = modal.value?.f?.precio || 0
      if (!precio) return 0
      return ((precio - costoReceta.value) / precio) * 100
    })

    const stockResultante = computed(() => {
      if (modal.value?.tipo !== 'ajuste') return 0
      const f = modal.value.f
      return (f.producto.stock || 0) + f.signo * (f.cantidad || 0)
    })

    /* ---------------- Guardar ---------------- */
    const guardarProducto = async () => {
      const f = modal.value.f
      f.error = ''

      if (!f.nombre.trim()) return (f.error = 'El nombre es obligatorio.')
      if (!String(f.codigo).trim()) return (f.error = 'El código es obligatorio.')
      if (!f.categoriaId) return (f.error = 'Elige una categoría.')
      if (!f.precio || f.precio <= 0) return (f.error = 'El precio debe ser mayor que cero.')

      if (f.tipo === 'simple' && (f.costo === null || f.costo < 0)) {
        return (f.error = 'Indica el costo unitario.')
      }
      if (f.tipo === 'armado' && !f.receta.length) {
        return (f.error = 'Un ramo armado necesita al menos un ingrediente.')
      }
      if (f.receta.some(l => !l.cantidad || l.cantidad < 1)) {
        return (f.error = 'Todas las cantidades de la receta deben ser al menos 1.')
      }

      const base = {
        codigo: String(f.codigo).trim(),
        nombre: f.nombre.trim(),
        categoriaId: f.categoriaId,
        emoji: f.emoji || '🌿',
        precio: Math.round(f.precio),
        minimo: Math.round(f.minimo || 0)
      }

      try {
        if (f.id) {
          /* ActualizarProductoRequest no lleva receta: va por su endpoint. */
          await store.dispatch('productos/actualizar', {
            id: f.id,
            ...base,
            costo: f.tipo === 'simple' ? Math.round(f.costo || 0) : null,
            costoArmado: f.tipo === 'armado' ? Math.round(f.costoArmado || 0) : null,
            diasVida: f.controlaLotes ? f.diasVida : null
          })

          if (f.tipo === 'armado') {
            await store.dispatch('productos/guardarReceta', {
              id: f.id,
              ingredientes: f.receta.map(l => ({
                productoId: l.productoId, cantidad: Math.round(l.cantidad)
              }))
            })
          }
          resalte.marcar(f.id)
        } else {
          await store.dispatch('productos/crear', {
            ...base,
            tipo: f.tipo,
            costo: f.tipo === 'simple' ? Math.round(f.costo || 0) : null,
            stockInicial: f.tipo === 'simple' && !f.controlaLotes
              ? Math.round(f.stockInicial || 0) : null,
            controlaLotes: f.tipo === 'simple' ? f.controlaLotes : false,
            diasVida: f.controlaLotes ? f.diasVida : null,
            costoArmado: f.tipo === 'armado' ? Math.round(f.costoArmado || 0) : null,
            receta: f.receta.map(l => ({
              productoId: l.productoId, cantidad: Math.round(l.cantidad)
            }))
          })
        }
        cerrarModal()
        avisar(`${base.nombre} guardado`)
        store.dispatch('inventario/cargarBajoMinimo')
      } catch (e) {
        f.error = e.message
      }
    }

    const confirmarAjuste = async () => {
      const f = modal.value.f
      f.error = ''
      if (!f.cantidad || f.cantidad < 1) return (f.error = 'La cantidad debe ser al menos 1.')

      try {
        const id = f.producto.id
        await store.dispatch('productos/ajustarStock', {
          id,
          cantidad: f.signo * Math.round(f.cantidad),
          motivo: f.motivo,
          detalle: f.detalle
        })
        cerrarModal()
        avisar('Movimiento registrado')
        resalte.marcar(id)
        store.dispatch('inventario/cargarBajoMinimo')
      } catch (e) {
        f.error = e.message
      }
    }

    const confirmarBaja = async (definitivo) => {
      const f = modal.value.f
      f.error = ''
      try {
        const id = f.producto.id
        if (definitivo) {
          await store.dispatch('productos/eliminar', id)
          avisar('Producto eliminado')
        } else {
          await store.dispatch('productos/cambiarEstado', { id, activo: false })
          avisar('Producto desactivado')
          resalte.marcar(id)
        }
        cerrarModal()
      } catch (e) {
        f.error = e.message
      }
    }

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

    return {
      TIPOS, FILTRO_TIPOS, MOTIVOS_AJUSTE, Math, claseMovimiento,
      esAdmin, puedeEditar,
      productos, total, totalPaginas, filtro, cargando, cargandoDetalle, guardando,
      error, simples, hayFiltro, categorias, bajoMinimo, movimientos,
      valorInventario, varasEnCamara, criticos,
      detalleDe, recetaDe, recargar, filtrar, busqueda,
      verReceta, verMovimientos, alternarReceta, alternarMovimientos, claseStock,
      modal, armando, cerrarModal, abrirNuevo, abrirEdicion, abrirAjuste, abrirBaja,
      abrirCategoria, volverAProducto, guardarCategoria,
      nombreDe, costoLinea, agregarIngrediente, costoReceta, margenFormulario, stockResultante,
      guardarProducto, confirmarAjuste, confirmarBaja, cambiarEstado, alArmar,
      resalte, aviso, clp, fechaHora
    }
  }
}
</script>

<style scoped>
.cabecera,
.cabecera *,
.kpis *,
.tabla-envoltura *,
.fondo * {
  box-sizing: border-box;
}

/* ---------- Animaciones ---------- */
@keyframes entra {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: none; }
}

.al-entrar {
  animation: entra 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: calc(var(--i, 0) * 55ms);
}

@keyframes aparece-fila {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}

.fila {
  animation: aparece-fila 200ms ease-out backwards;
  animation-delay: calc(var(--i, 0) * 25ms);
}

/* El resalte verde fijo no se veía en oscuro. Ahora se tiñe del
   propio color de éxito, mezclado con la superficie de cada tema. */
@keyframes resalta {
  0%   { background: color-mix(in srgb, var(--success) 22%, var(--surface)); }
  70%  { background: color-mix(in srgb, var(--success) 8%,  var(--surface)); }
  100% { background: transparent; }
}

.fila.resaltada td { animation: resalta 1400ms ease-out; }

.flecha {
  display: inline-block;
  transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}

.ver-receta.abierta .flecha,
.titulo-plegable.abierta .flecha { transform: rotate(180deg); }

.spinner {
  display: inline-block;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  border: 2px solid color-mix(in srgb, var(--accent-contrast) 35%, transparent);
  border-top-color: var(--accent-contrast);
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
  letter-spacing: -0.02em;
  color: var(--text);
}

.pista {
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: var(--text-muted);
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
  border-radius: var(--r-sm, 8px);
  background-color: var(--accent);
  color: var(--accent-contrast, #fff);
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.btn:hover:not(:disabled) { background-color: var(--accent-hover, var(--accent)); }
.btn:active:not(:disabled) { transform: scale(0.97); }

.btn:disabled {
  background-color: color-mix(in srgb, var(--accent) 35%, var(--surface-2));
  color: color-mix(in srgb, var(--accent-contrast) 70%, transparent);
  cursor: not-allowed;
}

.btn-linea {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.btn-linea:hover:not(:disabled) {
  background-color: var(--surface-2);
  border-color: var(--text-faint);
  color: var(--text);
}

.btn-linea:disabled { background: transparent; color: var(--text-faint); }

/* En oscuro --danger es un rojo claro: texto blanco encima queda ilegible.
   --surface se invierte solo con el tema y funciona en los dos. */
.btn-rojo { background-color: var(--danger); color: var(--surface); }
.btn-rojo:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--danger) 82%, #000);
}

.btn-mini {
  min-height: 34px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}

.btn-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background-color 0.15s;
}

.btn-icono:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent-text, var(--accent));
}

.btn-icono:disabled { opacity: 0.35; cursor: not-allowed; }

.btn-icono.peligro:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.btn-icono.chico { width: 30px; height: 30px; }

/* Faltaba en toda la vista: navegando con teclado no se veía el foco */
.btn:focus-visible,
.btn-icono:focus-visible,
.enlace-boton:focus-visible,
.ver-receta:focus-visible,
.titulo-plegable:focus-visible,
.segmentado button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.enlace-boton {
  margin-top: 6px;
  padding: 0;
  border: none;
  background: none;
  color: var(--accent-text, var(--accent));
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

/* ---------- Indicadores ---------- */
.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 13px;
  margin-bottom: 18px;
}

.kpi {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md, 12px);
  padding: 16px;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.kpi:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
}

.kpi .rot {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.kpi .val {
  font-size: clamp(1.3rem, 5vw, 1.6rem);
  font-weight: 700;
  margin-top: 5px;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.kpi .pie {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 3px;
}

/* El KPI lleno usaba verde oscuro fijo con textos en verde claro:
   en la paleta rosa quedaba fuera de sistema y el contraste del pie
   era muy bajo. Ahora es el acento con blancos translúcidos. */
.kpi.destacado {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-contrast, #fff);
}

.kpi.destacado .val { color: inherit; }
.kpi.destacado .rot { color: color-mix(in srgb, var(--accent-contrast) 72%, transparent); }
.kpi.destacado .pie { color: color-mix(in srgb, var(--accent-contrast) 85%, transparent); }

.kpi.alerta .val { color: var(--danger); }

/* ---------- Bandas ---------- */
.banda {
  display: flex;
  align-items: center;
  gap: 11px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: var(--r-sm, 10px);
  margin-bottom: 16px;
  font-size: 0.875rem;
}

.banda-aviso {
  background: var(--warn-soft);
  border: 1px solid var(--warn-border, color-mix(in srgb, var(--warn) 30%, transparent));
  color: var(--warn);
}

.banda-error {
  background: var(--danger-soft);
  border: 1px solid var(--danger-border, color-mix(in srgb, var(--danger) 30%, transparent));
  color: var(--danger);
}

.banda .btn { margin-left: auto; }

/* ---------- Filtros ---------- */
.barra-filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.buscador {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 240px;
  min-width: 0;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  padding: 0 12px;
  min-height: 44px;
  color: var(--text);
  transition: border-color 0.18s, box-shadow 0.18s;
}

.buscador:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
}

.buscador input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  color: var(--text);
  font-size: max(0.9rem, 16px);
  font-family: inherit;
}

.buscador input::placeholder { color: var(--text-faint); }

.campo {
  width: 100%;
  min-height: 44px;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm, 8px);
  background: var(--surface);
  font-family: inherit;
  font-size: max(0.9rem, 16px);
  color: var(--text);
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.campo:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
}

.campo-corto { width: auto; flex: 0 1 210px; }

.segmentado {
  display: inline-flex;
  background: var(--surface-2);
  border-radius: 9px;
  padding: 3px;
  gap: 3px;
}

.segmentado.ancho-total { display: flex; width: 100%; }

.segmentado button {
  flex: 1;
  min-height: 38px;
  padding: 0.4rem 0.9rem;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s, color 0.18s, box-shadow 0.18s;
}

.segmentado button.on {
  background: var(--surface);
  color: var(--accent-text, var(--accent));
  box-shadow: var(--shadow-sm);
}

.segmentado button:disabled { opacity: 0.45; cursor: not-allowed; }

/* Es un <label>, así que heredaba la regla global de label: mayúsculas,
   0.68rem y letter-spacing. Se veía como un título, no como una casilla. */
.check {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 0;
  font-size: 0.85rem;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text-muted);
  cursor: pointer;
}

.check input {
  width: 17px;
  height: 17px;
  accent-color: var(--accent);
  cursor: pointer;
}

.interruptor {
  display: flex;
  align-items: center;
  gap: 9px;
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  margin-bottom: 4px;
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
  border-radius: var(--r-md, 12px);

  /*
    Antes: overflow: hidden seguido de overflow-x: auto. El scroll existía,
    pero la tabla nunca lo activaba porque width:100% sin min-width la
    obliga a caber siempre. Con min-width en la tabla, ocho columnas ya no
    caben en pantallas medianas y aparece el desplazamiento horizontal.
  */
  overflow: auto;
  overscroll-behavior-x: contain;

  /*
    Alto máximo para que la tabla tenga su propio scroll vertical y el
    encabezado quede a la vista. Si prefieres que scrollee la página
    completa, borra estas dos líneas y el position:sticky del th.
  */
  max-height: min(65vh, 720px);

  transition: opacity 0.14s ease;
}

.tabla-envoltura.atenuada { opacity: 0.45; }

table {
  width: 100%;
  min-width: 940px;   /* ← lo que faltaba para que exista el scroll */
  border-collapse: separate;   /* separate: si no, el borde del th sticky desaparece */
  border-spacing: 0;
}

th {
  position: sticky;
  top: 0;
  z-index: 2;
  text-align: left;
  padding: 11px 14px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
}

td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--border);
  font-size: 0.875rem;
  color: var(--text);
  vertical-align: middle;
}

tbody tr:last-child td { border-bottom: 0; }

tr.inactiva { opacity: 0.5; }

.fila.abierta td { background: var(--surface-2); }
.fila td { transition: background-color 0.16s ease; }
.fila:hover td { background: color-mix(in srgb, var(--accent) 4%, var(--surface)); }

.der { text-align: right; }
.suave { color: var(--text-muted); }
.mini { font-size: 0.78rem; }
.min0 { min-width: 0; }

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.negativo { color: var(--danger); }

.celda-producto {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.celda-producto .emoji {
  font-size: 1.25rem;
  line-height: 1.2;
  flex-shrink: 0;
}

.nombre {
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.codigo {
  font-size: 0.72rem;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}

.ver-receta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  padding: 0;
  border: none;
  background: none;
  color: var(--accent-text, var(--accent));
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

.desglose {
  font-size: 0.7rem;
  color: var(--text-faint);
  margin-top: 2px;
  white-space: nowrap;
}

.stock-cero { color: var(--danger); }
.stock-bajo { color: var(--warn); }
.margen-ok { color: var(--success); }
.margen-bajo { color: var(--warn); }

.etiqueta {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--r-full, 999px);
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.et-verde { background: var(--success-soft); color: var(--success); }
.et-rosa  { background: var(--accent-soft);  color: var(--accent-text, var(--accent)); }
.et-ambar { background: var(--warn-soft);    color: var(--warn); }
.et-gris  { background: var(--surface-2);    color: var(--text-muted); }
.et-azul  { background: var(--info-soft);    color: var(--info); }
.et-rojo  { background: var(--danger-soft);  color: var(--danger); }

.acciones {
  display: flex;
  gap: 5px;
  justify-content: flex-end;
  align-items: center;
}

.acciones-col { width: 1%; white-space: nowrap; }

/* En escritorio los botones son solo ícono: el texto del title vive
   en el tooltip. En móvil se muestra (ver más abajo). */
.btn-icono::after { content: none; }

.fila-receta td { background: var(--surface-2); }
.receta { padding: 4px 0; }

.receta ul {
  margin: 6px 0 0;
  padding-left: 20px;
  line-height: 1.7;
  font-size: 0.82rem;
}

.paginador {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 14px 0 0;
  color: var(--text-muted);
}

/* ---------- Movimientos ---------- */
.movimientos { margin-top: 24px; }

.titulo-plegable {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
}

.titulo-plegable .flecha { color: var(--text-muted); }

/* ---------- Vacío ---------- */
.vacio {
  text-align: center;
  padding: 44px 20px;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-md, 12px);
}

.vacio strong {
  display: block;
  color: var(--text);
  font-size: 1.05rem;
  margin-bottom: 5px;
}

/* ---------- Modales ---------- */
.fondo {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.5);
}

.modal {
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--r-lg, 14px);
  box-shadow: var(--shadow-lg);
}

.modal.ancho { max-width: 700px; }

.modal-cab {
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.modal-cab h3 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--text);
}

.modal-cab p {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.modal-cuerpo {
  padding: 18px 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

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

.rejilla-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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
  margin: 0 0 12px;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--text-muted);
}

.error {
  padding: 10px 13px;
  margin-bottom: 15px;
  border-radius: var(--r-sm, 8px);
  border-left: 4px solid var(--danger);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 0.85rem;
}

.nota {
  padding: 10px 13px;
  margin-top: 14px;
  border-radius: 0 var(--r-sm, 8px) var(--r-sm, 8px) 0;
  border-left: 3px solid var(--success);
  background: var(--success-soft);
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.nota.alerta {
  border-color: var(--warn);
  background: var(--warn-soft);
  color: var(--warn);
}

.constructor {
  border: 1px solid var(--border);
  border-radius: var(--r-sm, 10px);
  overflow: hidden;
  margin-bottom: 15px;
}

.constructor-fila {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 0.85rem;
  background: var(--surface);
}

.constructor-fila:last-child { border-bottom: 0; }
.constructor-fila .crece { flex: 1; min-width: 0; }

.constructor-vacio {
  padding: 20px;
  text-align: center;
  color: var(--text-faint);
  font-size: 0.85rem;
}

.entrada-tabla {
  width: 72px;
  padding: 6px 8px;
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-family: inherit;
  font-size: max(0.85rem, 16px);
  font-variant-numeric: tabular-nums;
}

.resumen {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 12px 14px;
  background: var(--surface-2);
  border-radius: 9px;
  font-size: 0.85rem;
}

.resumen div { display: flex; flex-direction: column; gap: 2px; }
.resumen span { color: var(--text-muted); font-size: 0.75rem; }
.resumen b { font-size: 1.05rem; color: var(--text); }

/* ---------- Aviso ---------- */
.aviso {
  position: fixed;
  bottom: max(22px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: 80;
  max-width: 90vw;
  padding: 12px 20px;
  border-radius: var(--r-sm, 10px);
  background: var(--text);
  color: var(--bg);
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: var(--shadow-lg);
  text-align: center;
}

.aviso.malo { background: var(--danger); color: var(--surface); }

/* ============================================================
   MÓVIL · cada fila es una tarjeta
   ============================================================ */
@media (max-width: 860px) {
  .tabla-envoltura {
    border: none;
    background: transparent;
    overflow: visible;
    max-height: none;          /* la tarjeta scrollea con la página */
  }

  table,
  thead,
  tbody,
  tr,
  td {
    display: block;
    width: 100%;
    min-width: 0;
  }

  thead { display: none; }

  tbody tr {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg, 14px);
    box-shadow: var(--shadow-sm);
    margin-bottom: 12px;
    padding: 14px 16px;
  }

  tbody tr.fila-receta {
    background: var(--surface-2);
    box-shadow: none;
  }

  /* Fila de dato: etiqueta a la izquierda, valor a la derecha */
  td {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 14px;
    padding: 9px 0;
    border: none;
    border-bottom: 1px solid var(--border);
    text-align: right;
  }

  tbody tr td:last-child { border-bottom: none; }

  td::before {
    content: attr(data-label) ":";
    font-size: 0.8rem;
    font-weight: 500;
    letter-spacing: 0;
    text-transform: none;
    color: var(--text-muted);
    text-align: left;
    flex-shrink: 0;
    white-space: nowrap;
  }

  /* La celda de acciones no tiene data-label: se muestra como bloque para
     que la grilla de botones ocupe el ancho completo de la tarjeta. */
  td:not([data-label]) { display: block; padding-bottom: 0; }
  td:not([data-label])::before { content: none; }

  /* Cabecera de la tarjeta: nombre, emoji y etiquetas */
  td[data-label="Producto"] {
    display: block;
    text-align: left;
    padding: 0 0 12px;
    margin-bottom: 4px;
    border-bottom: 1px solid var(--border);
  }

  td[data-label="Producto"]::before { content: none; }

  td[data-label="Producto"] .nombre {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  td[data-label="Producto"] .celda-producto .emoji { font-size: 1.5rem; }

  /* Valores destacados dentro de la tarjeta */
  td[data-label="Precio"] .dato,
  td[data-label="Disponible"] .dato { font-size: 1rem; }

  td[data-label="Disponible"] { flex-wrap: wrap; }
  td[data-label="Disponible"] .desglose { width: 100%; text-align: right; white-space: normal; }

  /* ---- Botones: ancho completo, dos por fila ---- */
  /* .acciones-col fija width:1% para el escritorio; si no se anula, la
     celda mide 1% de la tarjeta y la grilla de botones se desborda. */
  .acciones-col {
    width: 100%;
    white-space: normal;
  }

  .acciones {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding-top: 12px;
    justify-content: stretch;
  }

  .acciones { width: 100%; }
  .acciones > * { width: 100%; min-width: 0; }

  /* Si la cantidad de botones es impar, el último ocupa la fila entera
     en vez de dejar un hueco a la derecha. */
  .acciones > *:nth-child(odd):last-child { grid-column: 1 / -1; }

  .btn-icono {
    width: 100%;
    height: auto;
    min-height: 44px;
    padding: 0 12px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  /* El texto sale del title, que ya está en el template:
     "Ajustar stock", "Armar unidades", "Editar", "Dar de baja". */
  .btn-icono[title]::after {
    content: attr(title);
    font-size: 0.85rem;
    font-weight: 600;
  }

  .btn-icono.peligro {
    border-color: color-mix(in srgb, var(--danger) 35%, transparent);
    color: var(--danger);
  }

  .acciones .btn-mini { min-height: 44px; }

  .fila.resaltada { animation: resalta 1400ms ease-out; }
  .fila.resaltada td { animation: none; }
  .fila.abierta td { background: transparent; }
  .fila:hover td { background: transparent; }

  .fila-receta td {
    display: block;
    padding: 0;
    border: none;
  }

  .segmentado { width: 100%; }
  .campo-corto { flex: 1 1 100%; width: 100%; }
  .buscador { flex: 1 1 100%; }

  /* La cabecera de la vista: botón de ancho completo */
  .cabecera { align-items: stretch; }
  .cabecera .btn { width: 100%; }

  .paginador { gap: 10px; }
}

@media (prefers-reduced-motion: reduce) {
  .btn,
  .btn-icono,
  .campo,
  .buscador,
  .kpi,
  .flecha,
  .segmentado button,
  .tabla-envoltura,
  .fila td { transition: none; }

  .al-entrar,
  .fila,
  .fila.resaltada,
  .fila.resaltada td,
  .spinner { animation: none; }

  .tabla-envoltura.atenuada { opacity: 1; }
}
</style>