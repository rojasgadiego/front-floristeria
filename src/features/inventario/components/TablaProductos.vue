<template>
    <div class="prod">
        <div v-if="error" class="banda banda-error">
            <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
            <button class="btn btn-mini" @click="recargar">Reintentar</button>
        </div>

        <div v-if="foco === 'bodega' && esAdmin" class="kpis">
            <div class="kpi destacado">
                <div class="rot">Productos en catálogo</div>
                <div class="val">{{ total }}</div>
                <div class="pie">{{ filtro.activo === null ? 'Incluye desactivados' : 'Solo activos' }}</div>
            </div>
            <div class="kpi" :class="{ alerta: bajoMinimo.length }">
                <div class="rot">Hay que comprar</div>
                <div class="val">{{ bajoMinimo.length }}</div>
                <div class="pie">{{ bajoMinimo.length ? 'Bajo el mínimo' : 'Todo abastecido' }}</div>
            </div>
        </div>

        <div v-if="foco === 'bodega' && bajoMinimo.length" class="banda banda-aviso">
            <!-- <span class="banda-icono" aria-hidden="true">📦</span> -->
            <span class="banda-texto">
                <span class="banda-rotulo">Reponer</span>
                {{bajoMinimo.slice(0, 5).map(p => p.nombre).join(', ')}}
                <span v-if="bajoMinimo.length > 5" class="banda-extra">
                    y {{ bajoMinimo.length - 5 }} más
                </span>
            </span>
        </div>


        <!-- Filtros -->
        <div class="barra-filtros">
            <div class="buscador">
                <span aria-hidden="true">🔎</span>
                <input v-model="busqueda" placeholder="Buscar por nombre o código…" aria-label="Buscar producto">
                <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
            </div>

            <div v-if="foco === 'bodega'" class="segmentado">
                <button v-for="t in FILTRO_TIPOS" :key="String(t.valor)" :class="{ on: filtro.tipo === t.valor }"
                    @click="filtrar({ tipo: t.valor })">
                    {{ t.texto }}
                </button>
            </div>

            <select v-if="foco === 'bodega'" class="campo campo-corto" :value="filtro.categoriaId ?? ''"
                @change="filtrar({ categoriaId: $event.target.value ? Number($event.target.value) : null })"
                aria-label="Categoría">
                <option value="">Todas las categorías</option>
                <option v-for="c in categorias" :key="c.id" :value="c.id">
                    {{ c.nombre }} ({{ c.productos }})
                </option>
            </select>

            <label v-if="foco === 'bodega'" class="check">
                <input type="checkbox" :checked="filtro.bajoMinimo"
                    @change="filtrar({ bajoMinimo: $event.target.checked })">
                <span>Solo bajo mínimo</span>
            </label>

            <label v-if="foco === 'bodega'" class="check">
                <input type="checkbox" :checked="filtro.activo === null"
                    @change="filtrar({ activo: $event.target.checked ? null : true })">
                <span>Ver desactivados</span>
            </label>

            <label v-if="foco === 'venta'" class="check">
                <input type="checkbox" v-model="soloConStock">
                <span>Solo con stock en mostrador</span>
            </label>
        </div>

        <!-- Tabla -->
        <div v-if="cargando && !productosVista.length" class="vacio">Cargando catálogo…</div>

        <div v-else-if="!productosVista.length" class="vacio">
            <strong>{{ mensajeVacio.titulo }}</strong>
            {{ mensajeVacio.detalle }}
        </div>

        <div v-else class="tabla-envoltura" :class="{ atenuada: cargando }">
            <table>
                <thead>
                    <tr>
                        <th class="col-producto izq">Producto</th>
                        <th v-if="foco === 'bodega'" class="col-categoria izq">Categoría</th>
                        <th v-if="foco === 'bodega' && esAdmin" class="col-dinero">Costo</th>
                        <th>Unidad</th>
                        <th v-if="foco === 'bodega'">Ramo</th>
                        <th v-if="foco === 'bodega'">Liquid.</th>
                        <th v-if="foco === 'bodega' && esAdmin">Margen</th>
                        <th v-if="foco === 'bodega'" class="col-bodega">Bodega</th>
                        <th class="col-venta">Venta</th>
                        <th class="acciones-col centro">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(p, idx) in productosVista" :key="p.id" class="fila"
                        :style="{ '--i': Math.min(idx, 12) }"
                        :class="{ inactiva: !p.activo, resaltada: p.id === resalte?.id }">

                        <!-- Nombre y código en una línea: el código va detrás, en
                             tenue, y no obliga a una segunda fila. -->
                        <td data-label="Producto" class="col-producto">
                            <div class="celda-producto">
                                <span class="emoji" aria-hidden="true">{{ p.emoji }}</span>
                                <span class="nombre">{{ p.nombre }}</span>
                                <span class="cod">{{ p.codigo }}</span>
                                <!-- El tipo como punto de color: "SIMPLE" repetido
                                     quince veces es ruido. El title lo dice cuando
                                     hace falta. -->
                                <span class="punto" :class="p.tipo === 'armado' ? 'pt-rosa' : 'pt-verde'"
                                    :title="p.tipo"></span>
                                <span v-if="!p.activo" class="etiqueta et-gris">off</span>
                            </div>
                        </td>

                        <td v-if="foco === 'bodega'" data-label="Categoría" class="suave col-categoria">
                            {{ p.categoria || '—' }}
                        </td>

                        <!-- costoEfectivo lo resuelve el SP: costo en un simple,
                             costoArmado en un armado. -->
                        <td v-if="foco === 'bodega' && esAdmin" data-label="Costo" class="der dato suave col-dinero">
                            <span v-if="p.costoEfectivo">{{ clp(p.costoEfectivo) }}</span>
                            <span v-else class="tenue">—</span>
                        </td>

                        <td data-label="Unidad" class="der dato">{{ clp(p.precio) }}</td>

                        <!-- Ramo y liquidación en columna propia: solo siete de
                             diecisiete los tienen, así que la mayoría muestra un
                             guion tenue en vez de dejar el hueco en blanco. -->
                        <td v-if="foco === 'bodega'" data-label="Ramo" class="der dato suave">
                            <span v-if="p.precioRamo">{{ clp(p.precioRamo) }}</span>
                            <span v-else class="tenue">—</span>
                        </td>

                        <td v-if="foco === 'bodega'" data-label="Liquid." class="der dato suave">
                            <span v-if="p.precioLiquidacion">{{ clp(p.precioLiquidacion) }}</span>
                            <span v-else class="tenue">—</span>
                        </td>

                        <td v-if="foco === 'bodega' && esAdmin" data-label="Margen" class="der">
                            <span v-if="p.margen" class="chip-margen"
                                :class="p.margen < 25 ? 'margen-bajo' : 'margen-ok'">
                                {{ Number(p.margen).toFixed(0) }}%
                            </span>
                            <!-- Sin costo cargado no hay margen. Un 0% acá sería peor
                                 que un guion: parecería que se vende a pérdida cuando
                                 lo que falta es un dato. -->
                            <span v-else class="tenue">—</span>
                        </td>

                        <!-- El mínimo pasa a title: se consulta cuando importa, no
                             ocupa una línea permanente bajo cada número. -->
                        <td v-if="foco === 'bodega'" data-label="Bodega" class="der col-bodega">
                            <span class="dato" :class="claseBodega(p)"
                                :title="p.tipo === 'armado' ? 'unidades armadas' : `mínimo ${p.minimo}`">
                                {{ p.enBodega ?? 0 }}
                            </span>
                        </td>

                        <td data-label="Venta" class="der col-venta">
                            <span class="dato" :class="{ tenue: !p.enVenta }">{{ p.enVenta ?? 0 }}</span>
                            <span v-if="avisarSinBajar(p)" class="pin-bajar" title="Hay en bodega sin bajar">↓</span>
                        </td>

                        <td data-label="Acciones" class="acciones-col">
                            <div class="acciones">
                                <template v-if="foco === 'bodega' && puedeEditar">
                                    <!-- Traspaso y retorno llevan color: son las dos
                                         acciones que mueven stock, y conviene que se
                                         distingan de editar o dar de baja. -->
                                    <button v-if="p.enBodega > 0" class="btn-icono acc-bajar" title="Bajar al mostrador"
                                        @click="$emit('traspasar', p)">
                                        <span aria-hidden="true">↓</span>
                                    </button>
                                    <button v-if="p.enVenta > 0" class="btn-icono acc-subir" title="Devolver a bodega"
                                        @click="$emit('retornar', p)">
                                        <span aria-hidden="true">↑</span>
                                    </button>
                                    <span class="sep" aria-hidden="true"></span>

                                    <button class="btn-icono" title="Editar" @click="abrirEdicion(p)">
                                        <span aria-hidden="true">✎</span>
                                    </button>
                                    <button v-if="p.activo" class="btn-icono peligro" title="Dar de baja"
                                        @click="abrirBaja(p)">
                                        <span aria-hidden="true">✕</span>
                                    </button>
                                    <button v-else class="btn btn-linea btn-mini"
                                        @click="cambiarEstado(p, true)">Reactivar</button>
                                </template>
                                <span v-else-if="foco === 'venta'" class="suave mini">
                                    {{ p.enVenta ? 'disponible' : 'sin stock' }}
                                </span>
                                <span v-else class="suave mini">solo lectura</span>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <p v-if="foco === 'bodega' && totalPaginas > 1" class="paginador">
            <button class="btn btn-linea btn-mini" :disabled="filtro.pagina <= 1"
                @click="filtrar({ pagina: filtro.pagina - 1 })">Anterior</button>
            <span class="mini suave">Página {{ filtro.pagina }} de {{ totalPaginas }} · {{ total }} productos</span>
            <button class="btn btn-linea btn-mini" :disabled="filtro.pagina >= totalPaginas"
                @click="filtrar({ pagina: filtro.pagina + 1 })">Siguiente</button>
        </p>
    </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'

const FILTRO_TIPOS = [
    { valor: null, texto: 'Todos' },
    { valor: 'simple', texto: 'Simples' },
    { valor: 'armado', texto: 'Armados' }
]

export default {
    name: 'TablaProductos',
    props: {
        // 'bodega': catálogo completo con costos, traspasos y edición.
        // 'venta': solo lo que hay en el mostrador, sin acciones.
        foco: { type: String, required: true, validator: (v) => ['bodega', 'venta'].includes(v) }
    },
    emits: ['traspasar', 'retornar'],

    setup(props) {
        const store = useStore()
        const { usarResalte, usarAviso } = useTemporizadores()

        const esAdmin = computed(() => store.getters['auth/esAdmin'])
        const puedeEditar = computed(() => store.getters['auth/tieneRol']('admin', 'bodega'))

        const productos = computed(() => store.getters['productos/productos'])
        const total = computed(() => store.getters['productos/total'])
        const totalPaginas = computed(() => store.getters['productos/totalPaginas'])
        const filtro = computed(() => store.getters['productos/filtro'])
        const cargando = computed(() => store.getters['productos/cargando'])
        const error = computed(() => store.getters['productos/error'])
        const hayFiltro = computed(() => store.getters['productos/hayFiltro'])

        const categorias = computed(() => store.getters['inventario/categorias'])
        const bajoMinimo = computed(() => store.getters['inventario/bajoMinimo'])

        let control = null
        onMounted(() => {
            control = new AbortController()
            const señal = { signal: control.signal }

            store.dispatch('productos/cargar', señal)
            if (props.foco === 'bodega') {
                store.dispatch('inventario/cargarCategorias', señal)
                store.dispatch('inventario/cargarBajoMinimo', señal)
            }
        })
        onUnmounted(() => control?.abort())

        const recargar = () => store.dispatch('productos/cargar')
        const filtrar = (cambios) => store.dispatch('productos/filtrar', cambios)

        const busqueda = ref(filtro.value.buscar || '')
        let tmr = null
        watch(busqueda, (v) => {
            clearTimeout(tmr)
            tmr = setTimeout(() => filtrar({ buscar: v.trim() }), 350)
        })
        onUnmounted(() => clearTimeout(tmr))

        /* En venta se filtra en cliente sobre lo ya cargado. Con 17 productos
           da lo mismo; si crece, el SP ya acepta soloEnVenta=true y conviene
           mover el filtro al servidor. */
        const soloConStock = ref(props.foco === 'venta')
        const productosVista = computed(() => {
            if (props.foco !== 'venta') return productos.value
            return soloConStock.value
                ? productos.value.filter(p => p.enVenta > 0)
                : productos.value
        })

        /* Fuera del template: una cadena larga entre comillas dentro de una
           interpolación es carne de cañón para el formateador automático, y un
           salto de línea ahí rompe el parser de Vue. */
        const mensajeVacio = computed(() => {
            const filtrando = hayFiltro.value || soloConStock.value
            return {
                titulo: filtrando ? 'Ningún producto coincide' : 'Catálogo vacío',
                detalle: filtrando
                    ? 'Prueba con otro texto o quita los filtros.'
                    : 'Crea el primer producto para empezar.'
            }
        })

        const resalte = usarResalte()
        const { avisar } = usarAviso()

        const cambiarEstado = async (p, activo) => {
            try {
                await store.dispatch('productos/cambiarEstado', { id: p.id, activo })
                avisar(`${p.nombre} ${activo ? 'reactivado' : 'desactivado'}`)
                resalte.marcar(p.id)
            } catch (e) {
                avisar(e.message, true)
            }
        }

        const abrirEdicion = (p) => store.dispatch('productos/abrirFormulario', p.id)
        const abrirBaja = (p) => store.dispatch('productos/abrirBaja', p.id)

        /* enBodega y bajoMinimo vienen resueltos del SP: las varas del simple o
           las unidades montadas del armado, y el mínimo comparado contra los dos
           lados. La unión simple/armado se decide una vez, en la base. */
        const claseBodega = (p) => {
            if (!p.enBodega) return 'stock-cero'
            if (p.bajoMinimo) return 'stock-bajo'
            return ''
        }

        /* La advertencia solo donde importa: productos que se venden por unidad
           y hoy no están adelante. En quince de diecisiete filas dejaría de
           leerse, que es lo mismo que no estar. */
        const avisarSinBajar = (p) =>
            p.tipo === 'simple' && p.controlaLotes && !p.enVenta && p.enBodega > 0

        const fmt = new Intl.NumberFormat('es-CL', {
            style: 'currency', currency: 'CLP', maximumFractionDigits: 0
        })
        const clp = (n) => fmt.format(Math.round(n || 0))

        return {
            FILTRO_TIPOS, Math,
            esAdmin, puedeEditar,
            productos, productosVista, total, totalPaginas, filtro, cargando, error, hayFiltro,
            categorias, bajoMinimo, mensajeVacio,
            recargar, filtrar, busqueda, soloConStock,
            cambiarEstado, abrirEdicion, abrirBaja,
            resalte, claseBodega, avisarSinBajar, clp
        }
    }
}
</script>

<style scoped>
.prod {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

/* ─── Botones generales ─── */

.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 44px;
    padding: .65rem 1.15rem;
    border: none;
    border-radius: var(--r-sm, 8px);
    background: var(--accent);
    color: var(--accent-contrast, #fff);
    font: inherit;
    font-size: .92rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color .2s;
}

.btn:hover:not(:disabled) {
    background: var(--accent-hover, var(--accent));
}

.btn:disabled {
    opacity: .55;
    cursor: not-allowed;
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
    min-height: 30px;
    padding: .3rem .7rem;
    font-size: .78rem;
}

/* ─── Indicadores ─── */

.kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 13px;
}

.kpi {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md, 12px);
    padding: 16px;
}

.kpi .rot {
    font-size: .68rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--text-faint);
}

.kpi .val {
    font-size: clamp(1.3rem, 5vw, 1.6rem);
    font-weight: 700;
    margin-top: 5px;
    letter-spacing: -.02em;
    font-variant-numeric: tabular-nums;
    color: var(--text);
}

.kpi .pie {
    font-size: .75rem;
    color: var(--text-muted);
    margin-top: 3px;
}

.kpi.destacado {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-contrast, #fff);
}

.kpi.destacado .val,
.kpi.destacado .rot,
.kpi.destacado .pie {
    color: inherit;
}

/* El texto secundario sobre el fondo fuerte necesita transparencia para no
   competir con el número, que es lo que se viene a leer. */
.kpi.destacado .rot,
.kpi.destacado .pie {
    opacity: .78;
}

.kpi.alerta .val {
    color: var(--danger);
}

/* ─── Bandas ─── */

.banda {
    display: flex;
    align-items: baseline; /* baseline, no center: el ícono y el texto se alinean por la base de la letra */
    gap: 10px;
    flex-wrap: wrap;
    padding: 12px 16px;
    border-radius: var(--r-sm, 10px);
    font-size: .875rem;
}

.banda-aviso {
    background: var(--warn-soft);
    border: 1px solid var(--warn-border, transparent);
    /* El color de la banda ya no tiñe el texto de contenido: los nombres
       van en el color de texto normal, legibles sin gritar. */
    color: var(--text);
}

/* El ícono sí lleva el color de alerta: es él quien señala el tipo de aviso. */
.banda-icono {
    color: var(--warn);
    flex-shrink: 0;
}

/* El rótulo ancla la lectura con peso, no con color. */
.banda-rotulo {
    font-weight: 700;
    color: var(--warn);
    margin-right: 4px;
}

/* El excedente es información de cierre, no dato: se atenúa. */
.banda-extra {
    color: var(--text-muted);
    font-weight: 400;
}

/* Si quieres que la banda de error siga el mismo patrón: */
.banda-error {
    background: var(--danger-soft);
    border: 1px solid var(--danger-border, transparent);
    color: var(--text);
}

.banda-error .banda-icono,
.banda-error .banda-rotulo {
    color: var(--danger);
}


/* ─── Filtros ─── */

.barra-filtros {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
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

.campo {
    width: 100%;
    min-height: 44px;
    padding: .6rem .75rem;
    border: 1px solid var(--border-strong);
    border-radius: var(--r-sm, 8px);
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: max(.9rem, 16px);
}

.campo-corto {
    width: auto;
    flex: 0 1 210px;
}

.segmentado {
    display: inline-flex;
    background: var(--surface-2);
    border-radius: 9px;
    padding: 3px;
    gap: 3px;
}

.segmentado button {
    min-height: 38px;
    padding: .4rem .9rem;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--text-muted);
    font: inherit;
    font-size: .85rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
}

.segmentado button.on {
    background: var(--surface);
    color: var(--accent-text, var(--accent));
    box-shadow: var(--shadow-sm);
}

.check {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: .85rem;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
}

.check input {
    width: 17px;
    height: 17px;
    accent-color: var(--accent);
    cursor: pointer;
}

/* ─── Tabla ─── */

.tabla-envoltura {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md, 12px);
    overflow: auto;
    max-height: min(65vh, 720px);
    transition: opacity .14s ease;
}

.tabla-envoltura.atenuada {
    opacity: .45;
}

table {
    width: 100%;
    min-width: 1060px;
    border-collapse: separate;
    border-spacing: 0;
}

th {
    position: sticky;
    top: 0;
    /* z-index 3, no 2: tiene que quedar por encima del fondo translúcido de
       .col-venta, que si no se ve pasar por debajo al scrollear. */
    z-index: 3;
    /* A la derecha por defecto: los encabezados numéricos van sobre cifras
       alineadas a la derecha, y centrarlos rompería la línea vertical que
       hace legible una tabla de números. Las columnas de texto lo revierten. */
    text-align: right;
    padding: 10px 12px;
    background: var(--surface-2);
    border-bottom: 1px solid var(--border);
    font-size: .66rem;
    font-weight: 700;
    letter-spacing: .07em;
    text-transform: uppercase;
    color: var(--text-muted);
    white-space: nowrap;
}

th.izq {
    text-align: left;
}

th.centro {
    text-align: center;
}

/* Fondo opaco propio: sin esto heredan el translúcido de la columna y las
   filas se transparentan a través del encabezado. */
th.col-venta,
th.col-bodega {
    background: var(--surface-2);
}

/* Una línea por fila, alto fijo. La altura pareja es lo que da ritmo a la
   tabla: con filas de alto distinto el ojo no encuentra dónde apoyarse. */
td {
    padding: 0 12px;
    height: 48px;
    border-bottom: 1px solid var(--border);
    font-size: .85rem;
    color: var(--text);
    vertical-align: middle;
    white-space: nowrap;
}

tbody tr:last-child td {
    border-bottom: 0;
}

tr.inactiva {
    opacity: .5;
}

.fila:hover td {
    background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}

/* Separador entre el bloque de dinero y el de existencias: agrupa sin
   agregar encabezados de grupo, que en una tabla larga estorban. */
.col-dinero {
    border-left: 1px solid var(--border);
}

.col-producto {
    min-width: 280px;
    max-width: 340px;
}

.col-categoria {
    min-width: 110px;
}

.col-bodega {
    border-left: 1px solid var(--border);
    min-width: 80px;
}

.col-venta {
    border-right: 1px solid var(--border);
    background: color-mix(in srgb, var(--accent) 3%, transparent);
    min-width: 80px;
}

.der {
    text-align: right;
}

.suave {
    color: var(--text-muted);
}

/* Un cero o un dato ausente que es normal no debería gritar. El rojo se
   reserva para el producto que sí debería tener stock y no lo tiene. */
.tenue {
    color: var(--text-faint);
    font-weight: 500;
}

.mini {
    font-size: .78rem;
}

.dato {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
}

/* ─── Celda de producto ─── */

.celda-producto {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.celda-producto .emoji {
    font-size: 1.1rem;
    line-height: 1;
    flex-shrink: 0;
}

.nombre {
    font-weight: 600;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
}

/* El código detrás del nombre, no debajo: la información secundaria no
   justifica duplicar el alto de cada fila. */
.cod {
    font-size: .72rem;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
}

/* El tipo como punto de color en vez de etiqueta de texto. */
.punto {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-left: 2px;
    cursor: help;
}

.pt-verde {
    background: var(--success);
}

.pt-rosa {
    background: var(--accent);
}

/* ─── Estados ─── */

.stock-cero {
    color: var(--danger);
}

.stock-bajo {
    color: var(--warn);
}

/* La flecha reemplaza al "↓ sin bajar": mismo aviso, sin segunda línea. */
.pin-bajar {
    margin-left: 5px;
    color: var(--warn);
    font-weight: 700;
    cursor: help;
}

/* El margen como pastilla: se distingue del resto de números de la fila,
   que son montos, y el color se lee sin buscar el signo de porcentaje. */
.chip-margen {
    display: inline-block;
    padding: 2px 8px;
    border-radius: var(--r-full, 999px);
    font-size: .74rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.margen-ok {
    background: var(--success-soft);
    color: var(--success);
}

.margen-bajo {
    background: var(--warn-soft);
    color: var(--warn);
}

.etiqueta {
    display: inline-block;
    padding: 1px 7px;
    border-radius: var(--r-full, 999px);
    font-size: .62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .04em;
    white-space: nowrap;
    flex-shrink: 0;
}

.et-gris {
    background: var(--surface-2);
    color: var(--text-muted);
}

/* ─── Acciones ─── */

.acciones-col {
    width: 1%;
    white-space: nowrap;
    text-align: center;
}

.acciones {
    display: flex;
    gap: 5px;
    justify-content: center;
    align-items: center;
}

/* Separa lo que mueve stock de lo que edita la ficha: son dos clases de
   acción distintas y el hueco lo dice sin necesidad de un rótulo. */
.sep {
    width: 1px;
    height: 18px;
    background: var(--border);
    margin: 0 3px;
    flex-shrink: 0;
}

.btn-icono {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid var(--border-strong);
    border-radius: 7px;
    background: var(--surface);
    color: var(--text-muted);
    font: inherit;
    font-size: .92rem;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    transition: transform .12s, border-color .15s, color .15s,
        background-color .15s, box-shadow .15s;
}

.btn-icono:hover {
    border-color: var(--accent);
    color: var(--accent-text, var(--accent));
    background: var(--accent-soft);
    /* El levantón de un pixel confirma que el botón respondió, que en una
       tabla con treinta botones iguales importa más que en un formulario. */
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
}

.btn-icono:active {
    transform: translateY(0);
    box-shadow: none;
}

.btn-icono:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}

.btn-icono.chico {
    width: 30px;
    height: 30px;
}

/* Bajar al mostrador es la acción principal de esta pantalla: va en color
   sólido para que se encuentre sin buscarla. */
.acc-bajar {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent-text, var(--accent));
}

.acc-bajar:hover {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-contrast, #fff);
}


/* El retorno es la excepción, no la rutina: mismo color, solo el contorno. */
.acc-subir {
    border-color: var(--accent);
    color: var(--accent-text, var(--accent));
}

.acc-subir:hover {
    background: var(--accent-soft);
}

.btn-icono.peligro:hover {
    border-color: var(--danger);
    color: var(--danger);
    background: var(--danger-soft);
}

.paginador {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin: 0;
    color: var(--text-muted);
}

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

/* ─── Móvil: la tabla se vuelve tarjetas ─── */

@media (max-width: 860px) {
    .tabla-envoltura {
        border: none;
        background: transparent;
        overflow: visible;
        max-height: none;
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

    thead {
        display: none;
    }

    tbody tr {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--r-lg, 14px);
        box-shadow: var(--shadow-sm);
        margin-bottom: 12px;
        padding: 14px 16px;
    }

    /* El alto fijo y el nowrap son para la vista de tabla; acá cada dato es
       una línea de tarjeta y necesita respirar. */
    td {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 14px;
        height: auto;
        padding: 9px 0;
        border: none;
        border-bottom: 1px solid var(--border);
        text-align: right;
        white-space: normal;
    }

    tbody tr td:last-child {
        border-bottom: none;
    }

    td::before {
        content: attr(data-label) ":";
        font-size: .8rem;
        font-weight: 500;
        color: var(--text-muted);
        text-align: left;
        flex-shrink: 0;
        white-space: nowrap;
    }

    td[data-label="Producto"] {
        display: block;
        text-align: left;
        padding: 0 0 12px;
        margin-bottom: 4px;
        border-bottom: 1px solid var(--border);
    }

    td[data-label="Producto"]::before {
        content: none;
    }

    td[data-label="Producto"] .nombre {
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: -.01em;
    }

    td[data-label="Producto"] .celda-producto .emoji {
        font-size: 1.5rem;
    }

    td[data-label="Acciones"]::before {
        content: none;
    }

    .col-producto {
        max-width: none;
    }

    .col-dinero,
    .col-bodega,
    .col-venta {
        border: none;
        background: transparent;
    }

    /* El separador no aporta cuando los botones son una grilla de dos, y
       además al no ser un <button> tampoco descuadra el nth-of-type. */
    .sep {
        display: none;
    }

    .acciones-col {
        width: 100%;
        white-space: normal;
    }

    .acciones {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        padding-top: 12px;
        width: 100%;
    }

    .acciones>* {
        width: 100%;
        min-width: 0;
    }

    /* El botón que queda solo en su fila se estira a lo ancho. Se ancla a
       button, no a .btn-icono, para que Editar, Dar de baja o Reactivar
       entren todos en la misma regla sin casos especiales. */
    .acciones>button:last-child:nth-of-type(odd) {
        grid-column: 1 / -1;
    }

    .segmentado {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: 6px;
        width: 100%;
    }

    .btn-icono {
        /* La separación real entre el glifo (span) y la etiqueta (::after):
           en escritorio el botón es solo ícono, acá lleva ícono + texto. */
        gap: 8px;
        width: 100%;
        height: auto;
        min-height: 44px;
        padding: 0 12px;
        font-size: .85rem;
        font-weight: 600;
        transform: none;
    }

    .btn-icono[title]::after {
        content: attr(title);
        font-size: .85rem;
        font-weight: 600;
    }

    .campo-corto {
        flex: 1 1 100%;
        width: 100%;
    }

    .buscador {
        flex: 1 1 100%;
    }
}
</style>
