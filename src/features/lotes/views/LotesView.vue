<template>

    <EncabezadoSeccion titulo="Lotes" :volver-a="{ name: 'Inventario' }" class="al-entrar">
        <template #acciones>
            <button v-if="!modoSeleccion && lotes.length" class="btn btn-linea btn-mini"
                @click="activarSeleccion">
                🏷️ Seleccionar para imprimir
            </button>
        </template>
    </EncabezadoSeccion>


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

        <div class="segmentado" role="group" aria-label="Filtrar por estado">
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

    <!-- Barra del modo selección -->
    <div v-if="modoSeleccion" class="barra-modo al-entrar">
        <label class="check-inline">
            <span class="mini-check" :class="{ on: todosMarcados }" @click="alternarTodos" role="checkbox"
                :aria-checked="todosMarcados" tabindex="0" @keyup.enter="alternarTodos"></span>
            <span>{{ seleccionados.length ? `${seleccionados.length} seleccionado(s)` : 'Seleccionar todos' }}</span>
        </label>
        <button class="btn-texto" @click="salirSeleccion">Cancelar</button>
    </div>

    <!-- ---------- Listado ---------- -->
    <div v-if="cargando && !lotes.length" class="vacio">Cargando lotes…</div>

    <div v-else-if="!lotes.length" class="vacio">
        <strong>Sin lotes con existencias</strong>
        Los lotes nacen al recibir una compra. Registra una para que entre flor.
    </div>

    <div v-else class="tabla-envoltura" :class="{ atenuada: cargando, 'con-seleccion': modoSeleccion }">
        <table>
            <thead>
                <tr>
                    <th v-if="modoSeleccion" class="sel-col"></th>
                    <th class="prio-col">Prioridad</th>
                    <th>Lote</th>
                    <th>Producto</th>
                    <th class="der">Quedan</th>
                    <th class="der">Por vara</th>
                    <th class="der">Valor</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                <template v-for="(l, ix) in lotes" :key="l.id">
                    <tr class="fila clic" :style="{ '--i': Math.min(ix, 12) }"
                        :class="[claseFila(l), {
                            abierta: abierto === l.id && !modoSeleccion,
                            marcada: modoSeleccion && seleccionados.includes(l.id)
                        }]"
                        @click="clicFila(l)">

                        <!-- Casilla del modo selección: solo aparece con el modo activo -->
                        <td v-if="modoSeleccion" class="sel-col" @click.stop="alternarUno(l.id)">
                            <span class="mini-check" :class="{ on: seleccionados.includes(l.id) }" role="checkbox"
                                :aria-checked="seleccionados.includes(l.id)"></span>
                        </td>

                        <!--
                            Prioridad de consumo (ordenFifo): el 1° es el que toca vender
                            ahora por antigüedad. Los recuperados no entran al reparto
                            automático: se venden escaneándolos.
                        -->
                        <td data-label="Prioridad" class="prio-col">
                            <span v-if="l.ordenFifo === 1" class="prio prio-ya">
                                <b>1°</b> vender ahora
                            </span>
                            <span v-else-if="l.ordenFifo" class="prio prio-cola">
                                {{ l.ordenFifo }}° en cola
                            </span>
                            <span v-else class="prio prio-escaneo" title="Fuera del reparto automático">
                                escaneo
                            </span>
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
                    </tr>

                    <!-- Ficha -->
                    <tr v-if="abierto === l.id && !modoSeleccion" class="fila-detalle">
                        <td :colspan="modoSeleccion ? 8 : 7">
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
                                            <img v-if="qrDe(l.codigo)" :src="qrDe(l.codigo)" :alt="`QR de ${l.codigo}`"
                                                class="qr">
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

    <!-- ---------- Barra flotante de impresión (modo selección) ---------- -->
    <Transition name="subir">
        <div v-if="modoSeleccion && seleccionados.length" class="barra-imprimir">
            <span class="bi-conteo">{{ seleccionados.length }} etiqueta(s)</span>
            <div class="bi-acciones">
                <button class="btn-texto claro" @click="seleccionados = []">Limpiar</button>
                <button class="btn btn-mini" @click="imprimirSeleccion">🏷️ Imprimir</button>
            </div>
        </div>
    </Transition>

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
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'
import { claseAlerta, textoAlerta } from '@/features/lotes/store/lotes.module'
import EncabezadoSeccion from '@/shared/components/EncabezadoSeccion.vue'

const FILTRO_ALERTA = [
    { valor: null, texto: 'Todos' },
    { valor: 'normal', texto: 'Sanos' },
    { valor: 'por vencer', texto: 'Por vencer' },
    { valor: 'vencido', texto: 'Vencidos' },
    { valor: null, texto: 'Rezagados', rezagados: true }
]

export default {
    name: 'LotesView',
    components: { EncabezadoSeccion },

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

        const abrirDetalle = (id) => {
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

        /* ---------------- Modo selección para etiquetas ----------------
           Fuera del modo, un clic en la fila abre el detalle. Dentro del modo,
           la fila entera alterna la selección. Así evitamos el bosque de
           checkboxes y funciona igual de bien en móvil. */
        const modoSeleccion = ref(false)
        const seleccionados = ref([])

        const clicFila = (l) => {
            if (modoSeleccion.value) alternarUno(l.id)
            else abrirDetalle(l.id)
        }

        const activarSeleccion = () => {
            modoSeleccion.value = true
            abierto.value = null
        }

        const salirSeleccion = () => {
            modoSeleccion.value = false
            seleccionados.value = []
        }

        const alternarUno = (id) => {
            const i = seleccionados.value.indexOf(id)
            if (i === -1) seleccionados.value.push(id)
            else seleccionados.value.splice(i, 1)
        }

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
            abierto, claseFila,
            modoSeleccion, seleccionados, clicFila, activarSeleccion, salirSeleccion,
            alternarUno, todosMarcados, alternarTodos, imprimirSeleccion, imprimirUno,
            modal, cerrarModal, abrirUbicacion, guardarUbicacion,
            aviso, clp, fecha, fechaHora
        }
    }
}
</script>

<style scoped>
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

.pista {
    margin: 4px 0 0;
    font-size: 0.875rem;
    color: var(--text-muted);
    max-width: 64ch;
    line-height: 1.5;
}

/* ---------- KPIs ---------- */
.kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin-bottom: 18px;
    margin-top: 18px;
}

.kpi {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 15px;
    transition: border-color var(--t-fast), box-shadow var(--t-fast);
}

.kpi:hover {
    border-color: var(--border-strong);
    box-shadow: var(--shadow-md);
}

.kpi .rot {
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
}

.kpi .val {
    font-size: clamp(1.2rem, 4.5vw, 1.5rem);
    font-weight: 700;
    margin-top: 4px;
    font-variant-numeric: tabular-nums;
    color: var(--text);
}

.kpi .pie {
    font-size: 0.72rem;
    color: var(--text-muted);
    margin-top: 3px;
}

.kpi.destacado {
    background: var(--secondary);
    border-color: var(--secondary);
    color: var(--accent-contrast);
}

.kpi.destacado .rot,
.kpi.destacado .pie {
    color: color-mix(in srgb, var(--accent-contrast) 82%, var(--secondary));
}

.kpi.destacado .val {
    color: var(--accent-contrast);
}

.kpi.alerta .val {
    color: var(--warn);
}

/* ---------- Bandas ---------- */
.banda {
    display: flex;
    align-items: center;
    gap: 11px;
    flex-wrap: wrap;
    padding: 12px 16px;
    border-radius: var(--r-sm);
    margin-bottom: 16px;
    font-size: 0.875rem;
    line-height: 1.5;
}

.banda-aviso {
    background: var(--card-warn-bg);
    border: 1px solid var(--card-warn-border);
    color: var(--text);
}

.banda-aviso b {
    color: var(--card-warn-text);
}

.banda-error {
    background: var(--card-danger-bg);
    border: 1px solid var(--card-danger-border);
    color: var(--text);
}

.banda-error>span:first-child {
    color: var(--card-danger-text);
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
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 9px;
    transition: border-color var(--t-fast), box-shadow var(--t-fast);
}

.buscador:focus-within {
    border-color: transparent;
    box-shadow: 0 0 0 2px var(--accent);
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

.buscador input::placeholder {
    color: var(--text-faint);
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
    box-shadow: 0 0 0 2px var(--accent);
}

.campo-corto {
    width: auto;
    flex: 0 1 200px;
}

.segmentado {
    display: flex;
    background: var(--surface-2);
    border-radius: 9px;
    padding: 3px;
    gap: 3px;
}

.segmentado button {
    flex: 0 0 auto;
    min-height: 38px;
    padding: 0.4rem 0.9rem;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--text-muted);
    font-family: inherit;
    font-size: 0.83rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color var(--t-fast), color var(--t-fast), box-shadow var(--t-fast);
    white-space: nowrap;
}

.segmentado button:hover:not(.on) {
    color: var(--text);
}

.segmentado button.on {
    background: var(--surface);
    color: var(--accent-text);
    box-shadow: var(--shadow-sm);
}

/* ---------- Barra del modo selección ---------- */
.barra-modo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px;
    margin-bottom: 12px;
    background: var(--accent-soft);
    border: 1px solid var(--accent);
    border-radius: var(--r-md);
}

.check-inline {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--accent-text);
}

.btn-texto {
    border: none;
    background: none;
    color: var(--accent-text);
    font-family: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 6px;
}

.btn-texto.claro {
    color: var(--accent-contrast);
    opacity: 0.85;
}

.btn-texto.claro:hover {
    opacity: 1;
}

/* ---------- Check tokenizado (dibujado a mano, sin input nativo) ---------- */
.mini-check {
    position: relative;
    display: inline-block;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    border: 1.5px solid var(--border-strong);
    border-radius: 6px;
    background: var(--surface);
    cursor: pointer;
    transition: background-color var(--t-fast), border-color var(--t-fast);
}

.mini-check::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 6px;
    width: 5px;
    height: 9px;
    border: solid var(--accent-contrast);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) scale(0);
    transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.mini-check.on {
    background: var(--accent);
    border-color: var(--accent);
}

.mini-check.on::after {
    transform: rotate(45deg) scale(1);
}

.mini-check:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--accent-soft);
    border-color: var(--accent);
}

/* ---------- Tabla ---------- */
.tabla-envoltura {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
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
    background: var(--surface-2);
    border-bottom: 1px solid var(--border);
    font-size: 0.64rem;
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
    vertical-align: middle;
    color: var(--text);
}

tbody tr:last-child td {
    border-bottom: 0;
}

tr.clic {
    cursor: pointer;
}

/* Cada fila lleva una barra de acento a la izquierda, invisible salvo
   hover/activa. Reemplaza a la flecha: comunica "clicable" sin ruido. */
.fila td {
    transition: background-color 0.16s ease;
    position: relative;
}

.fila td:first-child::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--accent);
    opacity: 0;
    transition: opacity 0.16s ease;
}

tr.clic:hover td {
    background: var(--surface-2);
}

tr.clic:hover td:first-child::before {
    opacity: 0.4;
}

tr.clic.abierta td {
    background: var(--surface-2);
}

tr.clic.abierta td:first-child::before {
    opacity: 1;
}

/* Selección: la fila entera se tiñe de acento suave */
tr.marcada td {
    background: var(--accent-soft);
}

tr.marcada:hover td {
    background: color-mix(in srgb, var(--accent-soft) 80%, var(--accent));
}

/* Un lote vencido no se atenúa: hay que verlo, no esconderlo */
tr.vencido td {
    background: var(--danger-soft);
}

tr.vencido:hover td {
    background: color-mix(in srgb, var(--danger-soft) 70%, var(--danger));
}

.sel-col {
    width: 1%;
    white-space: nowrap;
}

.der {
    text-align: right;
}

.suave {
    color: var(--text-muted);
}

.mini {
    font-size: 0.76rem;
}

.rojo {
    color: var(--danger);
}

.verde {
    color: var(--secondary);
}

.dato {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
}

.detalle-linea {
    font-size: 0.73rem;
    color: var(--text-faint);
    margin-top: 2px;
}

.detalle-linea.verde {
    color: var(--secondary);
}

/* ---------- Prioridad de consumo (antes "orden") ----------
   Ya no es un número suelto: comunica qué toca vender ahora. */
.prio-col {
    width: 1%;
    white-space: nowrap;
}

.prio {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: var(--r-full);
    font-size: 0.72rem;
    font-weight: 600;
    white-space: nowrap;
}

.prio b {
    font-variant-numeric: tabular-nums;
    font-weight: 800;
}

/* El que toca vender ahora: acento sage sólido, resalta en la fila */
.prio-ya {
    background: var(--secondary);
    color: var(--accent-contrast);
}

/* En cola: discreto, gris */
.prio-cola {
    background: var(--surface-2);
    color: var(--text-muted);
}

/* Recuperado / fuera del reparto: ámbar suave, se vende escaneando */
.prio-escaneo {
    background: var(--card-warn-bg);
    color: var(--card-warn-text);
}

.etiqueta {
    display: inline-block;
    padding: 2px 8px;
    border-radius: var(--r-full);
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
}

.et-verde {
    background: var(--secondary-soft);
    color: var(--secondary);
}

.et-ambar {
    background: var(--card-warn-bg);
    color: var(--card-warn-text);
}

.et-rojo {
    background: var(--card-danger-bg);
    color: var(--card-danger-text);
}

.et-gris {
    background: var(--surface-2);
    color: var(--text-muted);
}

/* ---------- Detalle ---------- */
.fila-detalle td {
    background: var(--surface-2);
    padding: 0;
}

.fila-detalle td:first-child::before {
    display: none;
}

.detalle {
    padding: 18px;
}

.detalle-cols {
    display: grid;
    grid-template-columns: 1.5fr 1.2fr 0.9fr;
    gap: 14px;
    align-items: start;
}

.detalle-cols>div {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 14px 16px;
}

.detalle-cols h4 {
    margin: 0 0 12px;
    padding-bottom: 8px;
    font-size: 0.64rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
}

.ficha {
    margin: 0;
    font-size: 0.84rem;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.ficha>div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 5px 0;
    border-bottom: 1px dotted var(--border);
}

.ficha>div:last-child {
    border-bottom: none;
}

.ficha dt {
    color: var(--text-muted);
    font-size: 0.78rem;
    flex-shrink: 0;
}

.ficha dd {
    margin: 0;
    color: var(--text);
    font-weight: 600;
    text-align: right;
    min-width: 0;
    overflow-wrap: break-word;
    font-variant-numeric: tabular-nums;
}

.notas {
    margin: 12px 0 0;
    padding: 10px 12px;
    background: var(--surface-2);
    border-left: 3px solid var(--secondary);
    border-radius: 0 7px 7px 0;
    font-size: 0.8rem;
    color: var(--text-muted);
    font-style: italic;
    line-height: 1.5;
}

.lineas {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.82rem;
    max-height: 220px;
    overflow-y: auto;
    scrollbar-width: thin;
}

.lineas li {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 7px 0;
    border-bottom: 1px dotted var(--border);
}

.lineas li:last-child {
    border-bottom: none;
}

.lineas li>span {
    color: var(--text-muted);
    line-height: 1.4;
    min-width: 0;
}

.lineas li b {
    font-size: 0.86rem;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
}

.qr-col {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.qr-col h4 {
    width: 100%;
    text-align: center;
}

.qr {
    width: 132px;
    height: 132px;
    display: block;
    margin: 4px auto 10px;
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    padding: 8px;
}

.qr-vacio {
    width: 132px;
    height: 132px;
    margin: 4px auto 10px;
    display: grid;
    place-items: center;
    border: 1px dashed var(--border-strong);
    border-radius: var(--r-sm);
}

.qr-col .mini {
    max-width: 180px;
    line-height: 1.5;
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
    color: var(--text);
}

.tarjetas {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 12px;
    margin-top: 14px;
}

.tarjeta-rec {
    background: var(--card-warn-bg);
    border: 1px solid var(--card-warn-border);
    border-radius: var(--r-md);
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
    color: var(--text);
    font-size: 0.9rem;
}

.rec-precio {
    display: flex;
    align-items: baseline;
    gap: 9px;
    margin-top: 10px;
    padding-top: 9px;
    border-top: 1px dashed var(--card-warn-border);
}

.rec-precio b {
    font-size: 1.1rem;
    color: var(--text);
}

/* ---------- Barra flotante de impresión ---------- */
.barra-imprimir {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 70;
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 10px 12px 10px 20px;
    background: var(--accent);
    color: var(--accent-contrast);
    border-radius: var(--r-full);
    box-shadow: var(--shadow-lg);
    max-width: calc(100vw - 32px);
}

.bi-conteo {
    font-size: 0.9rem;
    font-weight: 700;
    white-space: nowrap;
}

.bi-acciones {
    display: flex;
    align-items: center;
    gap: 8px;
}

.barra-imprimir .btn {
    background: var(--accent-contrast);
    color: var(--accent-text);
}

.barra-imprimir .btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent-contrast) 88%, black);
}

.subir-enter-active,
.subir-leave-active {
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease;
}

.subir-enter-from,
.subir-leave-to {
    transform: translate(-50%, 120%);
    opacity: 0;
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
    color: var(--accent-contrast);
    font-family: inherit;
    font-size: 0.92rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color var(--t-med), transform 0.1s;
    -webkit-tap-highlight-color: transparent;
}

.btn:hover:not(:disabled) {
    background: var(--accent-hover);
}

.btn:active:not(:disabled) {
    transform: scale(0.97);
}

.btn:disabled {
    background: color-mix(in srgb, var(--accent) 40%, var(--surface-2));
    color: var(--text-faint);
    cursor: not-allowed;
}

.btn-linea {
    background: transparent;
    border: 1px solid var(--border-strong);
    color: var(--text-muted);
}

.btn-linea:hover:not(:disabled) {
    background: var(--surface-2);
    border-color: var(--text-faint);
}

.btn-linea:disabled {
    background: transparent;
    color: var(--border-strong);
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
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text-muted);
    cursor: pointer;
    transition: border-color var(--t-fast), color var(--t-fast);
}

.btn-icono:hover {
    border-color: var(--accent);
    color: var(--accent);
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
    background: var(--overlay);
}

.modal {
    width: 100%;
    max-width: 460px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-lg);
}

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
}

.modal-pie {
    display: flex;
    gap: 9px;
    justify-content: flex-end;
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

.check-inline {
    text-transform: none;
    letter-spacing: normal;
    margin-bottom: 0;
}

.ayuda {
    margin: 6px 0 0;
    font-size: 0.75rem;
    color: var(--text-faint);
    line-height: 1.5;
}

.error {
    padding: 10px 13px;
    margin-bottom: 14px;
    border-radius: var(--r-sm);
    border-left: 4px solid var(--danger);
    background: var(--card-danger-bg);
    color: var(--card-danger-text);
    font-size: 0.85rem;
}

/* ---------- Varios ---------- */
.vacio {
    text-align: center;
    padding: 44px 20px;
    color: var(--text-muted);
    background: var(--surface);
    border: 1px dashed var(--border-strong);
    border-radius: var(--r-md);
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
    border-radius: var(--r-sm);
    background: var(--secondary);
    color: var(--accent-contrast);
    font-size: 0.875rem;
    font-weight: 600;
    box-shadow: var(--shadow-lg);
    text-align: center;
}

.aviso.malo {
    background: var(--danger);
}

/* ---------- Tablet: detalle a 2 columnas ---------- */
@media (max-width: 1100px) and (min-width: 901px) {
    .detalle-cols {
        grid-template-columns: 1fr 1fr;
    }

    .qr-col {
        grid-column: 1 / -1;
    }
}

/* ---------- Móvil ---------- */
@media (max-width: 900px) {
    .barra-filtros {
        flex-direction: column;
        align-items: stretch;
    }

    .buscador {
        flex: 1 1 auto;
    }

    .segmentado {
        width: 100%;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
    }

    .segmentado::-webkit-scrollbar {
        display: none;
    }

    .campo-corto {
        flex: 1 1 auto;
        width: 100%;
    }

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
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--r-md);
        margin-bottom: 11px;
        padding: 12px;
        position: relative;
        overflow: hidden;
    }

    /* La barra de acento pasa al borde superior de la tarjeta */
    .fila td:first-child::before {
        display: none;
    }

    tbody tr.abierta {
        border-color: var(--accent);
    }

    tbody tr.marcada {
        border-color: var(--accent);
        background: var(--accent-soft);
    }

    tbody tr.fila-detalle {
        background: var(--surface-2);
        padding: 0;
    }

    /* Check del modo selección: esquina superior derecha */
    .sel-col {
        position: absolute;
        top: 12px;
        right: 12px;
        width: auto;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .mini-check {
        width: 26px;
        height: 26px;
    }

    .mini-check::after {
        top: 4px;
        left: 8px;
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
        color: var(--text-faint);
        text-align: left;
        flex-shrink: 0;
    }

    td:not([data-label]) {
        justify-content: flex-end;
    }

    td:not([data-label])::before {
        content: none;
    }

    /* Prioridad arriba del todo, como banda de la tarjeta */
    td[data-label="Prioridad"] {
        justify-content: flex-start;
        padding: 0 0 8px;
        margin-bottom: 6px;
        border-bottom: 1px dotted var(--border);
    }

    td[data-label="Prioridad"]::before {
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
        border-color: var(--danger-border);
    }

    tr.marcada td {
        background: transparent;
    }

    .detalle {
        padding: 12px;
    }

    .detalle-cols {
        grid-template-columns: 1fr;
        gap: 10px;
    }

    .detalle-cols>div {
        padding: 12px 14px;
    }

    .fila-detalle .ficha>div,
    .fila-detalle .lineas li {
        display: flex;
    }

    /* La barra flotante ocupa el ancho útil en móvil */
    .barra-imprimir {
        left: 16px;
        right: 16px;
        transform: none;
        justify-content: space-between;
    }

    .subir-enter-from,
    .subir-leave-to {
        transform: translateY(120%);
    }
}

@media (prefers-reduced-motion: reduce) {

    .btn,
    .btn-icono,
    .campo,
    .buscador,
    .kpi,
    .segmentado button,
    .tabla-envoltura,
    .fila td,
    .mini-check,
    .mini-check::after {
        transition: none;
    }

    .al-entrar,
    .fila {
        animation: none;
    }

    .subir-enter-active,
    .subir-leave-active {
        transition: none;
    }

    .tabla-envoltura.atenuada {
        opacity: 1;
    }
}
</style>
