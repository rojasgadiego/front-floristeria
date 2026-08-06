<template>
    <MainLayout>

        <div class="cabecera al-entrar">
            <div>
                <h2>Lotes</h2>
                <p class="pista">
                    Cada paquete que entró, con su vencimiento y lo que queda. El número
                    de orden marca cuál debería venderse ahora.
                </p>
            </div>
            <button v-if="seleccionados.length" class="btn" @click="imprimirSeleccion">
                🏷️ Imprimir {{ seleccionados.length }} etiqueta(s)
            </button>
        </div>

        <div v-if="error" class="banda banda-error">
            <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
            <button class="btn btn-mini" @click="recargar">Reintentar</button>
        </div>

        <!-- ---------- Indicadores ---------- -->
        <div class="kpis">
            <div class="kpi destacado al-entrar" style="--i: 1">
                <div class="rot">Valor en cámara</div>
                <div class="val">{{ clp(valorInventario) }}</div>
                <div class="pie">{{ varasEnCamara.toLocaleString('es-CL') }} varas</div>
            </div>
            <div class="kpi al-entrar" style="--i: 2" :class="{ alerta: porVencer.length }">
                <div class="rot">Vencen pronto</div>
                <div class="val">{{ porVencer.length }}</div>
                <div class="pie">{{ porVencer.length ? clp(valorDe(porVencer)) + ' en riesgo' : 'Nada cerca' }}</div>
            </div>
            <div class="kpi al-entrar" style="--i: 3" :class="{ alerta: rezagados.length }">
                <div class="rot">Restos rezagados</div>
                <div class="val">{{ rezagados.length }}</div>
                <div class="pie">Quedaron atrás al abrir uno nuevo</div>
            </div>
            <div class="kpi al-entrar" style="--i: 4">
                <div class="rot">Flor recuperada</div>
                <div class="val">{{ recuperados.length }}</div>
                <div class="pie">El balde aparte: se vende escaneando</div>
            </div>
        </div>

        <!--
      Los rezagados son la alerta más rentable de la pantalla: no están
      vencidos todavía, así que liquidarlos hoy evita la merma de la semana
      que viene. Por eso van arriba y con acción directa.
    -->
        <div v-if="rezagados.length" class="banda banda-aviso">
            <span aria-hidden="true">⏳</span>
            <span>
                <b>{{ rezagados.length }} resto(s) sin liquidar</b> por
                {{ clp(valorDe(rezagados)) }}. Se empezó a vender de un lote más nuevo y
                estos quedaron atrás; si no se mueven, terminan en merma.
            </span>
            <button class="btn btn-mini" @click="filtrar({ soloRezagados: true, alerta: null })">
                Ver solo esos
            </button>
        </div>

        <!-- ---------- Filtros ---------- -->
        <div class="barra-filtros al-entrar" style="--i: 5">
            <div class="buscador">
                <span aria-hidden="true">🔎</span>
                <input v-model="busqueda" placeholder="Código, producto o proveedor…" aria-label="Buscar lote">
                <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
            </div>

            <div class="segmentado">
                <button v-for="a in FILTRO_ALERTA" :key="a.texto" :class="{ on: alertaActiva(a) }"
                    @click="filtrar({ alerta: a.valor, soloRezagados: a.rezagados || false })">
                    {{ a.texto }}
                </button>
            </div>

            <select class="campo campo-corto" :value="filtro.productoId ?? ''"
                @change="filtrar({ productoId: $event.target.value ? Number($event.target.value) : null })"
                aria-label="Producto">
                <option value="">Todos los productos</option>
                <option v-for="p in conLotes" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
        </div>

        <!-- ---------- Listado ---------- -->
        <div v-if="cargando && !lotes.length" class="vacio">Cargando lotes…</div>

        <div v-else-if="!lotes.length" class="vacio">
            <strong>Sin lotes con existencias</strong>
            Los lotes nacen al recibir una compra. Registra una para que entre flor.
        </div>

        <div v-else class="tabla-envoltura" :class="{ atenuada: cargando }">
            <table>
                <thead>
                    <tr>
                        <th class="sel-col">
                            <input type="checkbox" :checked="todosMarcados" @change="alternarTodos"
                                aria-label="Seleccionar todos">
                        </th>
                        <th class="der">Orden</th>
                        <th>Lote</th>
                        <th>Producto</th>
                        <th class="der">Quedan</th>
                        <th class="der">Por vara</th>
                        <th class="der">Valor</th>
                        <th>Estado</th>
                        <th class="acciones-col"></th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="(l, ix) in lotes" :key="l.id">
                        <tr class="fila clic" :style="{ '--i': Math.min(ix, 12) }"
                            :class="[claseFila(l), { abierta: abierto === l.id, marcada: seleccionados.includes(l.id) }]"
                            @click="alternarDetalle(l.id)">
                            <td class="sel-col" @click.stop>
                                <input type="checkbox" :value="l.id" v-model="seleccionados"
                                    :aria-label="`Seleccionar ${l.codigo}`">
                            </td>

                            <!--
                ordenFifo es la posición en la fila de consumo. Los lotes de
                flor recuperada no la tienen: están fuera del reparto
                automático y solo se venden escaneándolos.
              -->
                            <td data-label="Orden" class="der">
                                <span v-if="l.ordenFifo" class="orden" :class="{ primero: l.ordenFifo === 1 }">
                                    {{ l.ordenFifo }}
                                </span>
                                <span v-else class="mini suave" title="Fuera del reparto automático">escaneo</span>
                            </td>

                            <td data-label="Lote">
                                <b class="dato">{{ l.codigo }}</b>
                                <div class="detalle-linea">
                                    Ingresó {{ fecha(l.fechaIngreso) }} · {{ l.diasEnCamara }} días
                                </div>
                                <div v-if="l.ubicacion" class="detalle-linea">📍 {{ l.ubicacion }}</div>
                            </td>

                            <td data-label="Producto">
                                {{ l.emoji }} {{ l.producto }}
                                <div v-if="l.proveedor" class="detalle-linea">{{ l.proveedor }}</div>
                                <div v-if="l.esRecuperado" class="detalle-linea verde">
                                    Recuperado<span v-if="l.calidad"> · {{ l.calidad }}</span>
                                    <span v-if="l.loteOrigen"> de {{ l.loteOrigen }}</span>
                                </div>
                            </td>

                            <td data-label="Quedan" class="der">
                                <div class="dato">{{ l.varasDisponibles }}</div>
                                <div class="mini suave">de {{ l.varasIniciales }}</div>
                            </td>

                            <td data-label="Por vara" class="der dato">{{ clp(l.costoPorVara) }}</td>
                            <td data-label="Valor" class="der dato">{{ clp(l.valorRestante) }}</td>

                            <td data-label="Estado">
                                <span class="etiqueta" :class="claseAlerta(l.alerta)">{{ textoAlerta(l.alerta) }}</span>
                                <div v-if="l.diasParaVencer != null" class="detalle-linea">
                                    {{ l.diasParaVencer >= 0
                                        ? `vence en ${l.diasParaVencer} día(s)`
                                        : `venció hace ${-l.diasParaVencer} día(s)` }}
                                </div>
                            </td>

                            <td class="der acciones-col">
                                <span class="flecha" aria-hidden="true">▾</span>
                            </td>
                        </tr>

                        <!-- Ficha -->
                        <tr v-if="abierto === l.id" class="fila-detalle">
                            <td colspan="9">
                                <div class="detalle">
                                    <div v-if="!detalleDe(l.id)" class="suave mini">Cargando ficha…</div>

                                    <template v-else>
                                        <div class="detalle-cols">
                                            <div>
                                                <h4>Procedencia</h4>
                                                <dl class="ficha">
                                                    <div>
                                                        <dt>Compra</dt>
                                                        <dd>{{ detalleDe(l.id).compraFolio || '—' }}</dd>
                                                    </div>
                                                    <div>
                                                        <dt>Documento</dt>
                                                        <dd>{{ detalleDe(l.id).documento || '—' }}</dd>
                                                    </div>
                                                    <div>
                                                        <dt>Presentación</dt>
                                                        <dd>{{ l.presentacion || '—' }}</dd>
                                                    </div>
                                                    <div>
                                                        <dt>Vencimiento</dt>
                                                        <dd>{{ fecha(l.fechaVencimiento) }}</dd>
                                                    </div>
                                                    <div>
                                                        <dt>Vendido</dt>
                                                        <dd>{{ Number(l.porcentajeVendido).toFixed(0) }}%</dd>
                                                    </div>
                                                    <div>
                                                        <dt>Precio venta</dt>
                                                        <dd>{{ clp(l.precioVenta) }}</dd>
                                                    </div>
                                                </dl>
                                                <p v-if="detalleDe(l.id).notas" class="notas">“{{ detalleDe(l.id).notas
                                                    }}”</p>
                                            </div>

                                            <div>
                                                <h4>Movimientos</h4>
                                                <ul v-if="detalleDe(l.id).movimientos.length" class="lineas">
                                                    <li v-for="m in detalleDe(l.id).movimientos" :key="m.id">
                                                        <span>{{ fechaHora(m.fecha) }} · {{ m.motivo }}</span>
                                                        <b class="dato" :class="m.cantidad < 0 ? 'rojo' : 'verde'">
                                                            {{ m.cantidad > 0 ? '+' : '' }}{{ m.cantidad }}
                                                        </b>
                                                    </li>
                                                </ul>
                                                <p v-else class="suave mini">Sin movimientos todavía.</p>
                                            </div>

                                            <div class="qr-col">
                                                <h4>Etiqueta</h4>
                                                <img v-if="qrDe(l.codigo)" :src="qrDe(l.codigo)"
                                                    :alt="`QR de ${l.codigo}`" class="qr">
                                                <div v-else class="qr-vacio suave mini">Cargando QR…</div>
                                                <p class="mini suave">
                                                    Abre la ficha de este lote al escanearlo.
                                                </p>
                                            </div>
                                        </div>

                                        <div v-if="puedeEditar" class="acciones-detalle">
                                            <button class="btn btn-linea btn-mini" @click.stop="abrirUbicacion(l)">
                                                📍 {{ l.ubicacion ? 'Cambiar ubicación' : 'Registrar ubicación' }}
                                            </button>
                                            <button class="btn btn-linea btn-mini" @click.stop="imprimirUno(l)">
                                                🏷️ Imprimir etiqueta
                                            </button>
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
            <button class="btn btn-linea btn-mini" :disabled="filtro.pagina <= 1"
                @click="filtrar({ pagina: filtro.pagina - 1 })">Anterior</button>
            <span class="mini suave">Página {{ filtro.pagina }} de {{ totalPaginas }} · {{ total }} lotes</span>
            <button class="btn btn-linea btn-mini" :disabled="filtro.pagina >= totalPaginas"
                @click="filtrar({ pagina: filtro.pagina + 1 })">Siguiente</button>
        </p>

        <!-- ---------- Flor recuperada ---------- -->
        <section v-if="recuperados.length" class="recuperados">
            <h3>Flor recuperada</h3>
            <p class="pista">
                Volvió del desarme de un ramo o de un pedido que no se usó. No entra en
                el reparto automático: hay que escanearla para venderla, si no se
                cobraría flor de segunda a precio de primera.
            </p>
            <div class="tarjetas">
                <article v-for="r in recuperados" :key="r.id" class="tarjeta-rec">
                    <div class="rec-cab">
                        <b>{{ r.emoji }} {{ r.producto }}</b>
                        <span class="etiqueta et-ambar">−{{ Number(r.rebajaPorcentaje).toFixed(0) }}%</span>
                    </div>
                    <div class="mini suave">
                        {{ r.codigo }} · {{ r.varasDisponibles }} varas ·
                        {{ r.calidad || 'sin clasificar' }} · {{ r.diasEnCamara }} días
                    </div>
                    <div class="rec-precio">
                        <b class="dato">{{ clp(r.precioVenta) }}</b>
                        <span class="mini suave">rebaja de {{ clp(r.rebaja) }}</span>
                    </div>
                </article>
            </div>
        </section>

        <!-- ================= MODAL ================= -->
        <div v-if="modal" class="fondo" @click.self="cerrarModal">
            <div class="modal">
                <div class="modal-cab">
                    <h3>Ubicación del lote</h3>
                    <p>{{ modal.f.lote.codigo }} · {{ modal.f.lote.producto }}</p>
                </div>
                <div class="modal-cuerpo">
                    <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>
                    <label for="u-ubi">¿Dónde está el paquete?</label>
                    <input id="u-ubi" class="campo" v-model="modal.f.ubicacion" maxlength="120"
                        placeholder="Cámara 1, balde 3" @keyup.enter="guardarUbicacion">
                    <p class="ayuda">
                        Es lo único editable de un lote: las varas se mueven recibiendo,
                        vendiendo o mermando.
                    </p>
                </div>
                <div class="modal-pie">
                    <button class="btn btn-linea" @click="cerrarModal">Cancelar</button>
                    <button class="btn" @click="guardarUbicacion">Guardar</button>
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
import { claseAlerta, textoAlerta } from '@/features/lotes/store/lotes.module'

const FILTRO_ALERTA = [
    { valor: null, texto: 'Todos' },
    { valor: 'normal', texto: 'Sanos' },
    { valor: 'por vencer', texto: 'Por vencer' },
    { valor: 'vencido', texto: 'Vencidos' },
    { valor: null, texto: 'Rezagados', rezagados: true }
]

export default {
    name: 'LotesView',
    components: { MainLayout },

    setup() {
        const store = useStore()
        const router = useRouter()
        const { usarAviso } = useTemporizadores()

        const puedeEditar = computed(() => store.getters['auth/tieneRol']('admin', 'bodega'))

        /* ---------------- Datos ---------------- */
        const lotes = computed(() => store.getters['lotes/lotes'])
        const total = computed(() => store.getters['lotes/total'])
        const filtro = computed(() => store.getters['lotes/filtro'])
        const cargando = computed(() => store.getters['lotes/cargando'])
        const error = computed(() => store.getters['lotes/error'])
        const rezagados = computed(() => store.getters['lotes/rezagados'])
        const porVencer = computed(() => store.getters['lotes/porVencer'])
        const recuperados = computed(() => store.getters['lotes/recuperados'])
        const valorInventario = computed(() => store.getters['lotes/valorInventario'])
        const varasEnCamara = computed(() => store.getters['lotes/varasEnCamara'])

        const totalPaginas = computed(() =>
            Math.ceil(total.value / (filtro.value.porPagina || 50))
        )

        const detalleDe = (id) => store.getters['lotes/detalleDe'](id)
        const qrDe = (codigo) => store.getters['lotes/qrDe'](codigo)

        /* Solo los productos que llevan lotes tienen sentido en el filtro */
        const conLotes = computed(() =>
            store.getters['productos/productos'].filter(p => p.controlaLotes)
        )

        const valorDe = (lista) => lista.reduce((t, l) => t + (l.valorRestante || 0), 0)

        /* ---------------- Carga ---------------- */
        let control = null

        onMounted(() => {
            control = new AbortController()
            const señal = { signal: control.signal }
            store.dispatch('lotes/cargar', señal)
            store.dispatch('lotes/cargarAlertas', señal)
            store.dispatch('lotes/cargarRecuperados', señal)
            store.dispatch('lotes/cargarCostoPromedio', señal)
            if (!store.getters['productos/productos'].length) {
                store.dispatch('productos/cargar', señal)
            }
        })

        onUnmounted(() => {
            control?.abort()
            /* Los QR son URLs de objeto: sin revocarlas, cada visita a esta
               pantalla deja imágenes retenidas en memoria. */
            store.dispatch('lotes/liberarQr')
        })

        const recargar = () => store.dispatch('lotes/cargar')
        const filtrar = (cambios) => store.dispatch('lotes/filtrar', cambios)

        const busqueda = ref(filtro.value.buscar || '')
        let tmr = null
        watch(busqueda, (v) => {
            clearTimeout(tmr)
            tmr = setTimeout(() => filtrar({ buscar: v.trim() }), 350)
        })
        onUnmounted(() => clearTimeout(tmr))

        const alertaActiva = (a) => {
            if (a.rezagados) return filtro.value.soloRezagados
            return !filtro.value.soloRezagados && filtro.value.alerta === a.valor
        }

        /* ---------------- Detalle ---------------- */
        const abierto = ref(null)

        const alternarDetalle = (id) => {
            if (abierto.value === id) {
                abierto.value = null
                return
            }
            abierto.value = id
            const lote = lotes.value.find(l => l.id === id)
            store.dispatch('lotes/cargarDetalle', { id })
            /* El QR viene protegido: no se puede poner la ruta en el src. */
            if (lote) store.dispatch('lotes/cargarQr', { codigo: lote.codigo })
        }

        const claseFila = (l) => ({
            vencido: l.alerta === 'vencido',
            recuperado: l.esRecuperado
        })

        /* ---------------- Selección para etiquetas ---------------- */
        const seleccionados = ref([])

        const todosMarcados = computed(() =>
            lotes.value.length > 0 && seleccionados.value.length === lotes.value.length
        )

        const alternarTodos = () => {
            seleccionados.value = todosMarcados.value ? [] : lotes.value.map(l => l.id)
        }

        /* Al cambiar de página o filtro, la selección de la página anterior ya
           no está a la vista: mantenerla imprimiría etiquetas que nadie eligió. */
        watch(lotes, () => { seleccionados.value = [] })

        const imprimirSeleccion = () => {
            router.push({ name: 'Etiquetas', query: { ids: seleccionados.value.join(',') } })
        }

        const imprimirUno = (l) => {
            router.push({ name: 'Etiquetas', query: { ids: String(l.id) } })
        }

        /* ---------------- Ubicación ---------------- */
        const modal = ref(null)
        const { aviso, avisar } = usarAviso()

        const cerrarModal = () => { modal.value = null }

        const abrirUbicacion = (l) => {
            modal.value = { f: { lote: l, ubicacion: l.ubicacion || '', error: '' } }
        }

        const guardarUbicacion = async () => {
            const f = modal.value.f
            f.error = ''
            if (!f.ubicacion.trim() || f.ubicacion.trim().length < 2) {
                return (f.error = 'Indica dónde está, con al menos 2 caracteres.')
            }
            try {
                await store.dispatch('lotes/actualizarUbicacion', {
                    id: f.lote.id, ubicacion: f.ubicacion.trim()
                })
                cerrarModal()
                avisar('Ubicación registrada')
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
            day: '2-digit', month: '2-digit', year: '2-digit'
        })
        const fecha = (v) => (v ? fmtFecha.format(new Date(v)) : '—')

        const fmtHora = new Intl.DateTimeFormat('es-CL', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        })
        const fechaHora = (v) => (v ? fmtHora.format(new Date(v)) : '—')

        return {
            FILTRO_ALERTA, Math, claseAlerta, textoAlerta,
            puedeEditar,
            lotes, total, totalPaginas, filtro, cargando, error,
            rezagados, porVencer, recuperados, valorInventario, varasEnCamara,
            detalleDe, qrDe, conLotes, valorDe,
            recargar, filtrar, busqueda, alertaActiva,
            abierto, alternarDetalle, claseFila,
            seleccionados, todosMarcados, alternarTodos, imprimirSeleccion, imprimirUno,
            modal, cerrarModal, abrirUbicacion, guardarUbicacion,
            aviso, clp, fecha, fechaHora
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

@keyframes entra {
    from {
        opacity: 0;
        transform: translateY(12px);
    }

    to {
        opacity: 1;
        transform: none;
    }
}

.al-entrar {
    animation: entra 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
    animation-delay: calc(var(--i, 0) * 55ms);
}

@keyframes aparece {
    from {
        opacity: 0;
        transform: translateY(8px);
    }

    to {
        opacity: 1;
        transform: none;
    }
}

.fila {
    animation: aparece 220ms ease-out backwards;
    animation-delay: calc(var(--i, 0) * 25ms);
}

.flecha {
    display: inline-block;
    transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}

.fila.abierta .flecha {
    transform: rotate(180deg);
}

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
    max-width: 64ch;
    line-height: 1.5;
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
    background: #064e3b;
    border-color: #064e3b;
    color: #fff;
}

.kpi.destacado .rot {
    color: #6ee7b7;
}

.kpi.destacado .pie {
    color: #a7f3d0;
}

.kpi.alerta .val {
    color: #d97706;
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
    line-height: 1.5;
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

.banda .btn {
    margin-left: auto;
}

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
    flex: 1 1 230px;
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

.campo-corto {
    width: auto;
    flex: 0 1 200px;
}

.segmentado {
    display: inline-flex;
    background: #f1f5f9;
    border-radius: 9px;
    padding: 3px;
    gap: 3px;
    flex-wrap: wrap;
}

.segmentado button {
    min-height: 38px;
    padding: 0.4rem 0.85rem;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: #475569;
    font-family: inherit;
    font-size: 0.83rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.18s, color 0.18s, box-shadow 0.18s;
    white-space: nowrap;
}

.segmentado button.on {
    background: #fff;
    color: #047857;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

.tabla-envoltura.atenuada {
    opacity: 0.45;
}

table {
    width: 100%;
    border-collapse: collapse;
}

th {
    text-align: left;
    padding: 11px 14px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.64rem;
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

tbody tr:last-child td {
    border-bottom: 0;
}

tr.clic {
    cursor: pointer;
}

.fila td {
    transition: background-color 0.16s ease;
}

tr.clic:hover td,
tr.clic.abierta td {
    background: #f8fafc;
}

tr.marcada td {
    background: #f0fdf4;
}

/* Un lote vencido no se atenúa: hay que verlo, no esconderlo */
tr.vencido td {
    background: #fef2f2;
}

tr.vencido:hover td {
    background: #fee2e2;
}

.sel-col {
    width: 1%;
}

.sel-col input {
    width: 17px;
    height: 17px;
    accent-color: #059669;
    cursor: pointer;
}

.der {
    text-align: right;
}

.suave {
    color: #64748b;
}

.mini {
    font-size: 0.76rem;
}

.rojo {
    color: #dc2626;
}

.verde {
    color: #047857;
}

.dato {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
}

.acciones-col {
    width: 1%;
    white-space: nowrap;
}

.detalle-linea {
    font-size: 0.73rem;
    color: #94a3b8;
    margin-top: 2px;
}

.detalle-linea.verde {
    color: #047857;
}

/* La posición en la fila de consumo. El 1 es el que toca vender ahora. */
.orden {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 0 6px;
    border-radius: 999px;
    background: #f1f5f9;
    color: #64748b;
    font-size: 0.74rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.orden.primero {
    background: #d1fae5;
    color: #047857;
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

.et-verde {
    background: #d1fae5;
    color: #047857;
}

.et-ambar {
    background: #fef3c7;
    color: #92400e;
}

.et-rojo {
    background: #fee2e2;
    color: #991b1b;
}

.et-gris {
    background: #f1f5f9;
    color: #64748b;
}

/* ---------- Detalle ---------- */
.fila-detalle td {
    background: #f8fafc;
    padding: 0;
}

.detalle {
    padding: 14px;
}

.detalle-cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 22px;
}

.detalle-cols h4 {
    margin: 0 0 8px;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #64748b;
}

.ficha {
    margin: 0;
    font-size: 0.82rem;
}

.ficha>div {
    display: flex;
    gap: 10px;
    padding: 3px 0;
}

.ficha dt {
    min-width: 96px;
    color: #94a3b8;
}

.ficha dd {
    margin: 0;
    color: #334155;
    min-width: 0;
    overflow-wrap: break-word;
}

.lineas {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.8rem;
    max-height: 190px;
    overflow-y: auto;
}

.lineas li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 3px 0;
    border-bottom: 1px dotted #e2e8f0;
}

.notas {
    margin: 10px 0 0;
    padding: 9px 11px;
    background: #fff;
    border-left: 3px solid #6ee7b7;
    border-radius: 0 7px 7px 0;
    font-size: 0.8rem;
    color: #475569;
    font-style: italic;
}

.qr-col {
    text-align: center;
}

.qr {
    width: 130px;
    height: 130px;
    display: block;
    margin: 0 auto 8px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 6px;
}

.qr-vacio {
    width: 130px;
    height: 130px;
    margin: 0 auto 8px;
    display: grid;
    place-items: center;
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
}

.acciones-detalle {
    display: flex;
    gap: 9px;
    flex-wrap: wrap;
    margin-top: 16px;
}

.paginador {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin: 14px 0 0;
}

/* ---------- Flor recuperada ---------- */
.recuperados {
    margin-top: 28px;
}

.recuperados h3 {
    margin: 0 0 4px;
    font-size: 1rem;
    color: #0f172a;
}

.tarjetas {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 12px;
    margin-top: 14px;
}

.tarjeta-rec {
    background: #fff;
    border: 1px solid #fcd34d;
    border-radius: 12px;
    padding: 14px;
}

.rec-cab {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 9px;
    margin-bottom: 5px;
}

.rec-cab b {
    color: #0f172a;
    font-size: 0.9rem;
}

.rec-precio {
    display: flex;
    align-items: baseline;
    gap: 9px;
    margin-top: 10px;
    padding-top: 9px;
    border-top: 1px dashed #e2e8f0;
}

.rec-precio b {
    font-size: 1.1rem;
    color: #0f172a;
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

.btn:hover:not(:disabled) {
    background: #047857;
}

.btn:active:not(:disabled) {
    transform: scale(0.97);
}

.btn:disabled {
    background: #a7c9bb;
    cursor: not-allowed;
}

.btn-linea {
    background: transparent;
    border: 1px solid #cbd5e1;
    color: #475569;
}

.btn-linea:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #94a3b8;
}

.btn-linea:disabled {
    background: transparent;
    color: #cbd5e1;
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

.btn-icono:hover {
    border-color: #059669;
    color: #059669;
}

.btn-icono.chico {
    width: 28px;
    height: 28px;
}

/* ---------- Modal ---------- */
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
    max-width: 460px;
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
}

.modal-cab {
    padding: 18px 20px 14px;
    border-bottom: 1px solid #e2e8f0;
}

.modal-cab h3 {
    margin: 0;
    font-size: 1.15rem;
    color: #0f172a;
}

.modal-cab p {
    margin: 4px 0 0;
    font-size: 0.82rem;
    color: #64748b;
}

.modal-cuerpo {
    padding: 18px 20px;
}

.modal-pie {
    display: flex;
    gap: 9px;
    justify-content: flex-end;
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

.ayuda {
    margin: 6px 0 0;
    font-size: 0.75rem;
    color: #94a3b8;
    line-height: 1.5;
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

.aviso.malo {
    background: #b91c1c;
}

/* ---------- Móvil ---------- */
@media (max-width: 900px) {
    .tabla-envoltura {
        border: none;
        background: transparent;
        overflow: visible;
    }

    table,
    thead,
    tbody,
    tr,
    td {
        display: block;
        width: 100%;
    }

    thead {
        display: none;
    }

    tbody tr {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        margin-bottom: 11px;
        padding: 12px;
        position: relative;
    }

    tbody tr.fila-detalle {
        background: #f8fafc;
        padding: 0;
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
        font-size: 0.64rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #94a3b8;
        text-align: left;
        flex-shrink: 0;
    }

    td:not([data-label]) {
        justify-content: flex-end;
    }

    td:not([data-label])::before {
        content: none;
    }

    td[data-label="Lote"],
    td[data-label="Producto"] {
        display: block;
        text-align: left;
    }

    td[data-label="Lote"]::before,
    td[data-label="Producto"]::before {
        content: none;
    }

    .sel-col {
        position: absolute;
        top: 12px;
        right: 12px;
        width: auto;
        padding: 0;
    }

    .fila-detalle td {
        display: block;
        padding: 0;
        border: none;
    }

    tr.clic:hover td,
    tr.clic.abierta td {
        background: transparent;
    }

    tr.vencido td {
        background: transparent;
    }

    tr.vencido {
        border-color: #fca5a5;
    }

    tr.marcada td {
        background: transparent;
    }

    tr.marcada {
        border-color: #059669;
    }

    .campo-corto {
        flex: 1 1 100%;
        width: 100%;
    }

    .segmentado {
        width: 100%;
    }
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
    .fila td {
        transition: none;
    }

    .al-entrar,
    .fila {
        animation: none;
    }

    .tabla-envoltura.atenuada {
        opacity: 1;
    }
}
</style>