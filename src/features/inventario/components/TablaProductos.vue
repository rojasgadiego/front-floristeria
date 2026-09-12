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
                    <template v-for="(p, idx) in productosVista" :key="p.id">
                        <tr class="fila" :style="{ '--i': Math.min(idx, 12) }"
                            :class="{ inactiva: !p.activo, resaltada: p.id === resalte?.id, abierta: abiertoId === p.id }">

                            <td class="col-producto">
                                <!-- Misma acción en los dos anchos; cambia el reparto,
                                     no lo que hace el botón. -->
                                <button class="cab" :class="esMovil ? 'cab-movil' : 'cab-tabla'"
                                    :aria-expanded="abiertoId === p.id" @click="alternar(p.id)">
                                    <span class="chevron" :class="{ girado: abiertoId === p.id }"
                                        aria-hidden="true">›</span>
                                    <span class="emoji" aria-hidden="true">{{ p.emoji }}</span>
                                    <span class="nombre">{{ p.nombre }}</span>

                                    <!-- En escritorio el código y el tipo caben en la
                                         celda; en móvil la cabecera queda mínima y esos
                                         datos viven en la ficha del cuerpo. -->
                                    <template v-if="!esMovil">
                                        <span class="cod">{{ p.codigo }}</span>
                                        <span class="punto" :class="p.tipo === 'armado' ? 'pt-rosa' : 'pt-verde'"
                                            :title="p.tipo"></span>
                                    </template>

                                    <span v-if="!p.activo" class="etiqueta et-gris">off</span>

                                    <span v-if="esMovil" class="cantidad dato"
                                        :class="foco === 'bodega' ? claseBodega(p) : ''">
                                        {{ (foco === 'bodega' ? p.enBodega : p.enVenta) ?? 0 }}
                                    </span>
                                </button>
                            </td>

                            <!-- Bajo el breakpoint estas celdas no se renderizan: su
                                 contenido pasa a la ficha del detalle, para que los dos
                                 anchos muestren lo mismo al abrir. -->
                            <template v-if="!esMovil">
                                <td v-if="foco === 'bodega'" class="suave col-categoria">
                                    {{ p.categoria || '—' }}
                                </td>

                                <!-- costoEfectivo lo resuelve el SP: costo en un simple,
                                     costoArmado en un armado. -->
                                <td v-if="foco === 'bodega' && esAdmin" class="der dato suave col-dinero">
                                    <span v-if="p.costoEfectivo">{{ clp(p.costoEfectivo) }}</span>
                                    <span v-else class="tenue">—</span>
                                </td>

                                <td class="der dato">{{ clp(p.precio) }}</td>

                                <td v-if="foco === 'bodega'" class="der dato suave">
                                    <span v-if="p.precioRamo">{{ clp(p.precioRamo) }}</span>
                                    <span v-else class="tenue">—</span>
                                </td>

                                <td v-if="foco === 'bodega'" class="der dato suave">
                                    <span v-if="p.precioLiquidacion">{{ clp(p.precioLiquidacion) }}</span>
                                    <span v-else class="tenue">—</span>
                                </td>

                                <td v-if="foco === 'bodega' && esAdmin" class="der">
                                    <span v-if="p.margen" class="chip-margen"
                                        :class="p.margen < 25 ? 'margen-bajo' : 'margen-ok'">
                                        {{ Number(p.margen).toFixed(0) }}%
                                    </span>
                                    <!-- Sin costo cargado no hay margen. Un 0% acá sería
                                         peor que un guion: parecería que se vende a
                                         pérdida cuando lo que falta es un dato. -->
                                    <span v-else class="tenue">—</span>
                                </td>

                                <td v-if="foco === 'bodega'" class="der col-bodega">
                                    <span class="dato" :class="claseBodega(p)"
                                        :title="p.tipo === 'armado' ? 'unidades armadas' : `mínimo ${p.minimo}`">
                                        {{ p.enBodega ?? 0 }}
                                    </span>
                                </td>

                                <td class="der col-venta">
                                    <span class="dato" :class="{ tenue: !p.enVenta }">{{ p.enVenta ?? 0 }}</span>
                                    <span v-if="avisarSinBajar(p)" class="pin-bajar"
                                        title="Hay en bodega sin bajar">↓</span>
                                </td>

                                <td class="acciones-col">
                                    <div class="acciones">
                                        <template v-if="foco === 'bodega' && puedeEditar">
                                            <!-- Traspaso y retorno llevan color: son las
                                                 dos acciones que mueven stock, y conviene
                                                 que se distingan de editar o dar de baja. -->
                                            <button v-if="p.enBodega > 0" class="btn-icono acc-bajar"
                                                title="Bajar al mostrador" @click.stop="$emit('traspasar', p)">
                                                <span aria-hidden="true">↓</span>
                                            </button>
                                            <button v-if="p.enVenta > 0" class="btn-icono acc-subir"
                                                title="Devolver a bodega" @click.stop="$emit('retornar', p)">
                                                <span aria-hidden="true">↑</span>
                                            </button>
                                            <span class="sep" aria-hidden="true"></span>

                                            <button class="btn-icono" title="Editar" @click.stop="abrirEdicion(p)">
                                                <span aria-hidden="true">✎</span>
                                            </button>
                                            <button v-if="p.activo" class="btn-icono peligro" title="Dar de baja"
                                                @click.stop="abrirBaja(p)">
                                                <span aria-hidden="true">✕</span>
                                            </button>
                                            <button v-else class="btn btn-linea btn-mini"
                                                @click.stop="cambiarEstado(p, true)">Reactivar</button>
                                        </template>
                                        <span v-else-if="foco === 'venta'" class="suave mini">
                                            {{ p.enVenta ? 'disponible' : 'sin stock' }}
                                        </span>
                                        <span v-else class="suave mini">solo lectura</span>
                                    </div>
                                </td>
                            </template>
                        </tr>

                        <!-- El detalle carga bajo demanda: pedir la receta y los
                             lotes de diecisiete productos que nadie va a expandir
                             sería trabajo perdido. -->
                        <tr v-if="abiertoId === p.id" class="fila-detalle">
                            <td :colspan="columnas">

                                <!-- La ficha existe solo en móvil, y no es información
                                     nueva: es lo que en escritorio se lee en las
                                     columnas de la fila. -->
                                <dl v-if="esMovil" class="ficha">
                                    <div>
                                        <dt>Código</dt>
                                        <dd>
                                            <span class="cod">{{ p.codigo }}</span>
                                            <span class="punto"
                                                :class="p.tipo === 'armado' ? 'pt-rosa' : 'pt-verde'"></span>
                                            <span class="tipo-texto">{{ p.tipo }}</span>
                                        </dd>
                                    </div>

                                    <div v-if="foco === 'bodega'">
                                        <dt>Categoría</dt>
                                        <dd>{{ p.categoria || '—' }}</dd>
                                    </div>

                                    <div v-if="foco === 'bodega'">
                                        <dt>En bodega</dt>
                                        <dd>
                                            <b class="dato" :class="claseBodega(p)">{{ p.enBodega ?? 0 }}</b>
                                            <span v-if="p.tipo === 'armado'" class="tenue"> · unidades armadas</span>
                                            <span v-else-if="p.minimo" class="tenue"> · mínimo {{ p.minimo }}</span>
                                        </dd>
                                    </div>

                                    <div>
                                        <dt>En mostrador</dt>
                                        <dd>
                                            <b class="dato" :class="{ tenue: !p.enVenta }">{{ p.enVenta ?? 0 }}</b>
                                            <span v-if="avisarSinBajar(p)" class="pin-bajar">
                                                ↓ hay en bodega sin bajar
                                            </span>
                                        </dd>
                                    </div>

                                    <div v-if="foco === 'bodega' && esAdmin">
                                        <dt>Costo</dt>
                                        <dd>
                                            <span v-if="p.costoEfectivo" class="dato">{{ clp(p.costoEfectivo) }}</span>
                                            <span v-else class="tenue">sin costo cargado</span>
                                        </dd>
                                    </div>

                                    <div>
                                        <dt>Precio unidad</dt>
                                        <dd><b class="dato">{{ clp(p.precio) }}</b></dd>
                                    </div>

                                    <div v-if="foco === 'bodega' && p.precioRamo">
                                        <dt>Precio ramo</dt>
                                        <dd class="dato">{{ clp(p.precioRamo) }}</dd>
                                    </div>

                                    <div v-if="foco === 'bodega' && p.precioLiquidacion">
                                        <dt>Liquidación</dt>
                                        <dd class="dato">{{ clp(p.precioLiquidacion) }}</dd>
                                    </div>

                                    <div v-if="foco === 'bodega' && esAdmin">
                                        <dt>Margen</dt>
                                        <dd>
                                            <span v-if="p.margen" class="chip-margen"
                                                :class="p.margen < 25 ? 'margen-bajo' : 'margen-ok'">
                                                {{ Number(p.margen).toFixed(0) }}%
                                            </span>
                                            <span v-else class="tenue">—</span>
                                        </dd>
                                    </div>
                                </dl>

                                <!-- El mismo componente en los dos anchos: la receta de
                                     un armado y los lotes de un simple se ven igual en
                                     el teléfono que en el escritorio. -->
                                <DetalleProducto :producto="p" :puede-editar="puedeEditar" @editar="abrirEdicion"
                                    @armar="$emit('armar', $event)" @traspasar="$emit('traspasar', $event)" />

                                <!-- En escritorio las acciones están en su columna; acá
                                     no hay columna donde ponerlas. -->
                                <div v-if="esMovil && foco === 'bodega' && puedeEditar"
                                    class="acciones acciones-movil">
                                    <button v-if="p.enBodega > 0" class="btn-icono acc-bajar"
                                        title="Bajar al mostrador" @click.stop="$emit('traspasar', p)">
                                        <span aria-hidden="true">↓</span>
                                    </button>
                                    <button v-if="p.enVenta > 0" class="btn-icono acc-subir"
                                        title="Devolver a bodega" @click.stop="$emit('retornar', p)">
                                        <span aria-hidden="true">↑</span>
                                    </button>
                                    <button class="btn-icono" title="Editar" @click.stop="abrirEdicion(p)">
                                        <span aria-hidden="true">✎</span>
                                    </button>
                                    <button v-if="p.activo" class="btn-icono peligro" title="Dar de baja"
                                        @click.stop="abrirBaja(p)">
                                        <span aria-hidden="true">✕</span>
                                    </button>
                                    <button v-else class="btn btn-linea btn-mini"
                                        @click.stop="cambiarEstado(p, true)">Reactivar</button>
                                </div>
                            </td>
                        </tr>
                    </template>
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
import DetalleProducto from './DetalleProducto.vue'

const FILTRO_TIPOS = [
    { valor: null, texto: 'Todos' },
    { valor: 'simple', texto: 'Simples' },
    { valor: 'armado', texto: 'Armados' }
]

/* El mismo valor que el @media del bloque de abajo. Si se cambia uno hay que
   cambiar el otro: no hay forma de leer un breakpoint de CSS desde JS. */
const MOVIL = '(max-width: 860px)'

export default {
    name: 'TablaProductos',
    components: { DetalleProducto },
    props: {
        // 'bodega': catálogo completo con costos, traspasos y edición.
        // 'venta': solo lo que hay en el mostrador, sin acciones.
        foco: { type: String, required: true, validator: (v) => ['bodega', 'venta'].includes(v) }
    },
    emits: ['traspasar', 'retornar', 'armar'],

    setup (props) {
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

        /* ---------------- Acordeón ---------------- */
        const esMovil = ref(false)
        const abiertoId = ref(null)
        let mql = null

        /* Uno abierto a la vez. Con varios vuelve la muralla de tarjetas, que
           es justo lo que el acordeón viene a resolver. */
        const alternar = (id) => {
            abiertoId.value = abiertoId.value === id ? null : id
        }

        /* Lo abierto se conserva al cruzar el breakpoint: los dos anchos
           muestran el mismo detalle, así que cerrarlo sería perder el lugar
           sin ninguna razón. */
        const alCambiarAncho = (e) => { esMovil.value = e.matches }

        /* Al cambiar de página o de filtro, lo que estaba abierto ya no está en
           pantalla: dejarlo marcado abriría otra fila al volver. */
        watch(
            () => [filtro.value.pagina, filtro.value.buscar, filtro.value.categoriaId],
            () => { abiertoId.value = null }
        )

        let control = null
        onMounted(() => {
            control = new AbortController()
            const señal = { signal: control.signal }

            store.dispatch('productos/cargar', señal)
            if (props.foco === 'bodega') {
                store.dispatch('inventario/cargarCategorias', señal)
                store.dispatch('inventario/cargarBajoMinimo', señal)
            }

            mql = window.matchMedia(MOVIL)
            esMovil.value = mql.matches
            mql.addEventListener('change', alCambiarAncho)
        })

        onUnmounted(() => {
            control?.abort()
            mql?.removeEventListener('change', alCambiarAncho)
        })

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

        /* El colspan tiene que contar las celdas que de verdad se renderizaron.
           En móvil la fila tiene una sola: el resto no existe. */
        const columnas = computed(() => {
            if (esMovil.value) return 1
            let n = 3                                                 // producto, unidad, venta
            if (props.foco === 'bodega') n += 4                       // categoría, ramo, liquidación, bodega
            if (props.foco === 'bodega' && esAdmin.value) n += 2      // costo, margen
            return n + 1                                              // acciones
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
            esMovil, abiertoId, alternar, columnas,
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
    align-items: baseline;
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

.fila.abierta td {
    background: var(--surface-2);
    border-bottom-color: transparent;
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

/* ─── Cabecera del acordeón ─── */
/* Es un <button> en los dos anchos. En escritorio se disfraza de celda: el
   chevron es lo único que delata que abre. */

.cab {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-width: 0;
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.cab:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: var(--r-sm, 8px);
}

.cab .emoji {
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

.chevron {
    flex-shrink: 0;
    color: var(--text-faint);
    font-size: .95rem;
    line-height: 1;
    transition: transform var(--t-fast, .16s ease);
}

.chevron.girado {
    transform: rotate(90deg);
}

/* El tipo como punto de color en vez de etiqueta de texto. */
.punto {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-left: 6px;
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

/* ─── Detalle ─── */

.fila-detalle td {
    padding: 0;
    height: auto;
    background: var(--surface-2);
    border-bottom: 2px solid var(--accent-soft);
    white-space: normal;
}

/* La ficha: lo que en escritorio se lee en las columnas de la fila */
.ficha {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 0 18px;
    margin: 0;
    padding: 12px 14px 2px;
}

.ficha > div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 7px 0;
    border-bottom: 1px solid var(--border);
    font-size: .86rem;
}

.ficha dt {
    color: var(--text-muted);
    flex-shrink: 0;
}

.ficha dd {
    margin: 0;
    text-align: right;
    min-width: 0;
}

.ficha .punto {
    margin: 0 4px;
}

.tipo-texto {
    font-size: .74rem;
    color: var(--text-faint);
}

.ficha .pin-bajar {
    display: block;
    margin: 2px 0 0;
    font-size: .74rem;
    font-weight: 600;
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

/* ─── Móvil ───
   Las celdas de datos ya no se renderizan bajo el breakpoint, así que no
   queda nada que disfrazar con data-label: la fila es la cabecera y el
   detalle es el mismo componente que en escritorio. */

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

    /* Cerrada, la fila es una línea. El relleno vive en la cabecera, no en la
       fila, para que colapse sin dejar aire. */
    tbody tr.fila {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--r-md, 12px);
        margin-bottom: 8px;
        padding: 0;
        overflow: hidden;
    }

    /* El hover de escritorio pinta el fondo de cada td; en móvil eso deja la
       fila con manchas al arrastrar el dedo. */
    .fila:hover td,
    .fila.abierta td {
        background: transparent;
    }

    .col-producto {
        display: block;
        height: auto;
        padding: 0;
        border: none;
        max-width: none;
        min-width: 0;
    }

    .cab-movil {
        gap: 10px;
        min-height: 54px;
        padding: 0 14px;
    }

    .cab-movil .emoji {
        font-size: 1.25rem;
    }

    .cab-movil .nombre {
        flex: 1;
        min-width: 0;
        font-size: .95rem;
        white-space: nowrap;
    }

    /* La cantidad es lo único que compite con el nombre por atención, y por
       eso es lo único más a la derecha. */
    .cab-movil .cantidad {
        font-size: 1.05rem;
        flex-shrink: 0;
    }

    .cab-movil .chevron {
        font-size: 1.15rem;
    }

    /* La fila abierta se une visualmente con su detalle en vez de quedar
       como dos tarjetas sueltas. */
    tbody tr.fila.abierta {
        margin-bottom: 0;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }

    tbody tr.fila-detalle {
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-top: none;
        border-radius: 0 0 var(--r-md, 12px) var(--r-md, 12px);
        margin-bottom: 8px;
        padding: 0;
        overflow: hidden;
    }

    .fila-detalle td {
        display: block;
        height: auto;
        padding: 0;
        border: none;
    }

    /* Una columna: a 360px, dos rótulos con su valor no entran sin cortarse */
    .ficha {
        grid-template-columns: 1fr;
        padding: 10px 14px 2px;
    }

    .acciones-movil {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        padding: 12px 14px 14px;
    }

    .acciones-movil > * {
        width: 100%;
        min-width: 0;
    }

    /* El botón que queda solo en su fila se estira a lo ancho. Se ancla a
       button, no a .btn-icono, para que Editar, Dar de baja o Reactivar
       entren todos en la misma regla sin casos especiales. */
    .acciones-movil > button:last-child:nth-of-type(odd) {
        grid-column: 1 / -1;
    }

    .acciones-movil .btn-icono {
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

    .acciones-movil .btn-icono[title]::after {
        content: attr(title);
        font-size: .85rem;
        font-weight: 600;
    }

    .segmentado {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: 6px;
        width: 100%;
    }

    .campo-corto {
        flex: 1 1 100%;
        width: 100%;
    }

    .buscador {
        flex: 1 1 100%;
    }
}

@media (prefers-reduced-motion: reduce) {
    .chevron {
        transition: none;
    }
}
</style>