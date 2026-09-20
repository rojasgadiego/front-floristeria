<template>
    <div class="inv-bodega">
        <EncabezadoSeccion titulo="Inventario Bodega" :volver-a="{ name: 'Inventario' }">
            <template v-if="puedeEditar" #acciones>
                <button class="btn btn-linea" @click="abrirRamo(null)">💐 Nuevo ramo</button>
                <button class="btn" @click="abrirNuevo">＋ Nuevo producto</button>
            </template>
        </EncabezadoSeccion>

        <!-- La tabla ya no lee nada por su cuenta: recibe lo que esta vista
             acaba de traer del endpoint y avisa hacia arriba cuando el
             usuario cambia un filtro. Una sola fuente de datos. -->
        <!-- template -->
        <TablaProductos foco="bodega" :items="items" :filtros="filtros" :total="total" :cargando="cargando"
            :error="error" :categorias="categorias" :bajo-minimo="filtros.bajoMinimo" @filtrar="aplicarFiltros"
            @recargar="cargar" @traspasar="abrirTraspaso" @retornar="abrirRetorno" @armar="abrirArmado"
            @editar="abrirEdicion" @baja="abrirBaja" @estado="cambiarEstado" />

        <ModalTraspaso v-if="traspaso" :producto="traspaso.producto" :lotes="traspaso.lotes"
            :requiere-autorizacion="traspaso.requiereAutorizacion" @cerrar="traspaso = null"
            @confirmado="confirmarTraspaso" />


        <ModalArmado v-if="armando" :producto="armando" @cerrar="armando = null" @armado="alArmar" />

        <!-- ================= Bajar al mostrador ================= -->
        <div v-if="traspaso" class="fondo" @click.self="traspaso = null">
            <div class="modal">
                <div class="modal-cab">
                    <h3>Bajar al mostrador</h3>
                    <p>{{ traspaso.producto.nombre }}</p>
                </div>

                <div class="modal-cuerpo">
                    <div v-if="traspaso.error" class="error">{{ traspaso.error }}</div>

                    <div v-if="traspaso.cargandoLotes" class="cargando">Buscando lotes…</div>

                    <template v-else>
                        <!-- Estos números se releen al abrir el modal, no se
                             heredan de la fila: entre que se pintó la grilla y
                             que el bodeguero abrió esto pudo haber una venta. -->
                        <div class="nota">
                            Hay <b class="dato">{{ enBodega }}</b> en bodega y
                            <b class="dato">{{ traspaso.producto.enVenta || 0 }}</b> adelante.
                        </div>

                        <div v-if="!traspaso.lotes.length" class="error">
                            Este producto no tiene lotes activos en bodega. Recibe una
                            compra para que entre flor.
                        </div>

                        <template v-else>
                            <div class="grupo">
                                <label for="t-lote">¿De qué balde?</label>

                                <select id="t-lote" class="campo" v-model="traspaso.loteCodigo" @change="ajustarMaximo">
                                    <option v-for="(l, i) in traspaso.lotes" :key="l.codigo" :value="l.codigo">
                                        {{ i === 0 ? '▸ ' : '' }}{{ l.codigo }} ·
                                        {{ l.varasDisponibles }} varas
                                        <template v-if="l.diasParaVencer != null">
                                            · vence en {{ l.diasParaVencer }} día(s)
                                        </template>
                                    </option>
                                </select>

                                <p v-if="loteElegido" class="ayuda">
                                    <template
                                        v-if="loteElegido.diasParaVencer != null && loteElegido.diasParaVencer <= 2">
                                        ⚠️ Este balde vence en {{ loteElegido.diasParaVencer }} día(s):
                                        conviene bajarlo entero.
                                    </template>
                                    <template v-else-if="traspaso.lotes[0]?.codigo !== traspaso.loteCodigo">
                                        Estás saltando el balde que toca. El más antiguo
                                        quedará atrás y puede terminar en merma.
                                    </template>
                                    <template v-else>
                                        Es el que toca por antigüedad.
                                    </template>
                                </p>
                            </div>

                            <div class="grupo">
                                <label for="t-cant">Cantidad</label>
                                <input id="t-cant" ref="campoTraspaso" class="campo dato" type="number" min="1"
                                    :max="maximo" v-model.number="traspaso.cantidad">
                                <p class="ayuda">
                                    Se crea una partida con su propia etiqueta QR. El vendedor
                                    la escanea para vender, y así el sistema sabe de qué balde
                                    descontar.
                                </p>
                            </div>
                        </template>
                    </template>
                </div>

                <div class="modal-pie">
                    <button class="btn btn-linea" @click="traspaso = null">Cancelar</button>
                    <button class="btn" :disabled="guardando || traspaso.cargandoLotes || !traspaso.lotes.length"
                        @click="confirmarTraspaso">
                        {{ guardando ? 'Bajando…' : 'Bajar' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- ================= La partida recién creada ================= -->
        <div v-if="partida" class="fondo" @click.self="partida = null">
            <div class="modal angosto">
                <div class="modal-cab">
                    <h3>Partida creada</h3>
                    <p>{{ partida.cantidad }} de {{ partida.producto }} en el mesón</p>
                </div>

                <div class="modal-cuerpo cen">
                    <div class="codigo-partida">{{ partida.codigo }}</div>

                    <div class="nota">
                        Del lote <b>{{ partida.loteCodigo }}</b> ·
                        quedan <b class="dato">{{ partida.enBodega }}</b> en bodega
                        <template v-if="partida.vencimiento">
                            <br>Vence el {{ fecha(partida.vencimiento) }}
                        </template>
                    </div>

                    <p class="ayuda">
                        Imprime la etiqueta y pégala al balde <b>antes</b> de dejarlo
                        adelante. Una partida sin etiqueta no se puede escanear al
                        vender.
                    </p>
                </div>

                <div class="modal-pie">
                    <button class="btn btn-linea" @click="partida = null">Después</button>
                    <button class="btn" @click="imprimirEtiqueta">🏷️ Imprimir etiqueta</button>
                </div>
            </div>
        </div>

        <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>

        <ModalProducto v-if="formularioAbierto" :producto="editando" @cerrar="cerrarFormulario"
            @guardado="alGuardarProducto" />

        <ModalRamo v-if="ramo" :producto="ramo.producto" @cerrar="ramo = null" @guardado="alGuardarRamo" />
    </div>
</template>

<script>
import { ref, computed, onMounted, onActivated, onUnmounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import TablaProductos from './TablaProductos.vue'
import EncabezadoSeccion from '@/shared/components/EncabezadoSeccion.vue'
import ModalArmado from '@/features/inventario/components/ModalArmado.vue'
import ModalProducto from '@/features/inventario/components/ModalProducto.vue'
import ModalRamo from '@/features/inventario/components/ModalRamo.vue'
import { mostradorService } from '@/features/ventas/services/mostrador.service'
import { lotesService } from '@/features/lotes/services/lotes.service'
import { productosService } from '@/features/inventario/services/productos.service'
import { useProductos } from '@/features/inventario/composables/useProductos'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'

/* Si el usuario vuelve a la pestaña después de este rato, lo que hay en
   pantalla ya no sirve: se relee. Menos que esto es recargar por nada. */
const FRESCURA_MS = 30_000

export default {
    name: 'InventarioBodega',
    components: { TablaProductos, EncabezadoSeccion, ModalArmado, ModalProducto, ModalRamo },
    setup() {
        const store = useStore()      // solo para la sesión; el inventario ya no pasa por acá
        const router = useRouter()

        const puedeEditar = computed(() => store.getters['auth/tieneRol']('admin', 'bodega'))

        const { usarResalte, usarAviso } = useTemporizadores()
        const resalte = usarResalte()
        const { aviso, avisar } = usarAviso()

        /* ---------------- Grilla ----------------
           Bodega no filtra por stock: un producto en cero es justo lo que
           hay que ver para saber qué reponer. */
        const { items, total, cargando, error, filtros, ultimaCarga, cargar, filtrar } =
            useProductos({ soloEnVenta: false, activo: true })

        /* ---------------- Formulario de producto ---------------- */
        const formularioAbierto = ref(false)
        const editando = ref(null)

        const abrirNuevo = () => { editando.value = null; formularioAbierto.value = true }
        const abrirEditar = (p) => { editando.value = p; formularioAbierto.value = true }
        const cerrarFormulario = () => { formularioAbierto.value = false; editando.value = null }

        const alGuardarProducto = async (p) => {
            cerrarFormulario()
            avisar(`${p.nombre} guardado`)
            resalte.marcar(p.id)
            await cargar()   // la fila la manda el servidor, no la parcheamos a mano
        }

        /* ---------------- Ramos ---------------- */
        const ramo = ref(null)
        const abrirRamo = (p) => { ramo.value = { producto: p } }

        const alGuardarRamo = async (p) => {
            ramo.value = null
            avisar(`${p.nombre} guardado`)
            resalte.marcar(p.id)
            await cargar()
        }

        /* ---------------- Armado ---------------- */
        const armando = ref(null)

        const alArmar = async (resultado) => {
            armando.value = null
            avisar(`${resultado.armadas} unidad(es) armadas`)
            resalte.marcar(resultado.productoId)
            await cargar()
        }

        /* ---------------- Bajar al mostrador ---------------- */
        const traspaso = ref(null)
        const partida = ref(null)
        const guardando = ref(false)
        const campoTraspaso = ref(null)

        /**
         * Al abrir se relee TODO desde el servidor: el producto y sus lotes.
         * La fila de la grilla puede tener minutos de antigüedad y el mesón
         * pudo haber vendido mientras tanto; no se decide un traspaso con
         * números de hace rato.
         *
         * `opciones` es el segundo argumento del emit de TablaProductos. Desde
         * bodega siempre llega vacío —el permiso es directo—, pero se lee igual
         * para que el día que esta vista reciba una solicitud del mostrador no
         * se cuele un traspaso sin firma por omisión del parámetro.
         */
        const abrirTraspaso = async (producto, opciones = {}) => {
            traspaso.value = {
                producto,
                lotes: [],
                loteCodigo: null,
                cantidad: 0,
                cargandoLotes: true,
                requiereAutorizacion: opciones.requiereAutorizacion === true,
                error: ''
            }

            try {
                const [detalle, lotes] = await Promise.all([
                    productosService.obtener(producto.id),
                    lotesService.listar({ productoId: producto.id, tamano: 50 })
                ])

                /* Otro producto se abrió mientras esto viajaba. */
                if (traspaso.value?.producto.id !== producto.id) return

                /* Solo los que tienen varas: un lote agotado no se puede bajar. */
                const activos = (lotes.items || []).filter(l => l.varasDisponibles > 0)

                traspaso.value.producto = detalle
                traspaso.value.lotes = activos
                traspaso.value.loteCodigo = activos[0]?.codigo ?? null
                traspaso.value.cantidad = Math.min(25, activos[0]?.varasDisponibles ?? 0)

                await nextTick()
                campoTraspaso.value?.select()
            } catch (e) {
                if (traspaso.value) traspaso.value.error = e.message
            } finally {
                if (traspaso.value) traspaso.value.cargandoLotes = false
            }
        }

        const loteElegido = computed(() =>
            traspaso.value?.lotes.find(l => l.codigo === traspaso.value.loteCodigo) ?? null
        )

        /* Lo que suman los baldes ES lo que hay en bodega: se calcula de los
           lotes recién traídos en vez de creerle al contador de la fila. */
        const enBodega = computed(() =>
            traspaso.value?.lotes.reduce((s, l) => s + l.varasDisponibles, 0) ?? 0
        )

        /* El tope es lo que tiene ESE balde, no todo el stock del producto. */
        const maximo = computed(() => loteElegido.value?.varasDisponibles ?? 0)

        const ajustarMaximo = () => {
            const t = traspaso.value
            if (t.cantidad > maximo.value) t.cantidad = maximo.value
        }

        const confirmarTraspaso = async () => {
            const t = traspaso.value
            t.error = ''

            /* Esta vista no tiene campo de PIN. Si alguna vez le llega una
               solicitud que sí lo exige, se detiene con un mensaje visible en
               vez de bajar varas sin autorizar. */
            if (t.requiereAutorizacion) {
                return (t.error = 'Este traspaso necesita autorización de un supervisor.')
            }

            if (!t.loteCodigo) return (t.error = 'Elige de qué balde bajar.')
            if (!t.cantidad || t.cantidad < 1) return (t.error = 'La cantidad debe ser al menos 1.')
            if (t.cantidad > maximo.value) {
                return (t.error = `El balde ${t.loteCodigo} tiene ${maximo.value} varas.`)
            }

            guardando.value = true
            try {
                const r = await mostradorService.traspasar({
                    lote: t.loteCodigo,
                    cantidad: t.cantidad
                })

                traspaso.value = null
                partida.value = r

                /* Con await: el modal de la partida y la grilla de atrás tienen
                   que mostrar el mismo stock, no uno cada uno. */
                await cargar()
            } catch (e) {
                /* El mensaje viene del RAISE del SP: "El lote LOT-000015 tiene
                   12 varas y estás bajando 30". Ya está redactado. */
                t.error = e.message
            } finally {
                guardando.value = false
            }
        }

        const imprimirEtiqueta = () => {
            const codigo = partida.value.codigo
            partida.value = null
            router.push({ name: 'EtiquetasPartida', params: { codigo } })
        }

        const fecha = (iso) => new Date(iso).toLocaleDateString('es-CL',
            { day: '2-digit', month: 'short' })

        /* ---------------- Entrar a la pantalla = pedir datos ---------------- */

        /* Con <keep-alive> el orden en la primera entrada es mounted →
           activated; sin esta bandera se pediría dos veces. */
        let recienMontado = false

        const alVolverAlFrente = () => {
            if (document.visibilityState !== 'visible') return
            if (Date.now() - ultimaCarga.value < FRESCURA_MS) return
            cargar()
        }

        onMounted(() => {
            recienMontado = true
            cargar()
            document.addEventListener('visibilitychange', alVolverAlFrente)
        })

        onActivated(() => {
            if (recienMontado) { recienMontado = false; return }
            cargar()
        })

        onUnmounted(() => {
            document.removeEventListener('visibilitychange', alVolverAlFrente)
        })

        return {
            puedeEditar,
            items, total, cargando, error, filtros, cargar, filtrar,
            formularioAbierto, editando, abrirNuevo, abrirEditar, cerrarFormulario, alGuardarProducto,
            ramo, abrirRamo, alGuardarRamo,
            armando, alArmar,
            traspaso, partida, guardando, campoTraspaso,
            loteElegido, enBodega, maximo, ajustarMaximo,
            abrirTraspaso, confirmarTraspaso, imprimirEtiqueta,
            aviso, resalte, fecha
        }
    }
}
</script>



<style scoped>
.inv-bodega {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.fondo {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgba(0, 0, 0, .5);
}

.modal.angosto {
    max-width: 360px;
}

.cen {
    text-align: center;
}

.cargando {
    padding: 20px;
    text-align: center;
    color: var(--text-muted);
    font-size: .85rem;
}

/* El código en grande: es lo que se va a escribir en el balde si la
   impresora falla. */
.codigo-partida {
    font-family: var(--font-mono);
    font-size: 1.6rem;
    font-weight: 700;
    letter-spacing: .06em;
    color: var(--accent-text);
    padding: 14px;
    margin-bottom: 12px;
    background: var(--accent-soft);
    border-radius: var(--r-sm);
}

.modal {
    width: 100%;
    max-width: 440px;
    max-height: 90dvh;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: var(--r-lg, 14px);
    box-shadow: var(--shadow-lg);
}

.modal-cab {
    padding: 18px 20px 14px;
    border-bottom: 1px solid var(--border);
}

.modal-cab h3 {
    margin: 0;
    font-size: 1.1rem;
}

.modal-cab p {
    margin: 4px 0 0;
    font-size: .82rem;
    color: var(--text-muted);
}

.modal-cuerpo {
    padding: 18px 20px;
    overflow-y: auto;
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
    font-size: .68rem;
    font-weight: 700;
    letter-spacing: .07em;
    text-transform: uppercase;
    color: var(--text-muted);
}

.grupo {
    margin-top: 14px;
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

.dato {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
}

.ayuda {
    margin: 8px 0 0;
    font-size: .78rem;
    color: var(--text-faint);
    line-height: 1.5;
}

.nota {
    padding: 10px 13px;
    border-radius: 0 var(--r-sm, 8px) var(--r-sm, 8px) 0;
    border-left: 3px solid var(--accent);
    background: var(--accent-soft);
    font-size: .85rem;
    line-height: 1.5;
}

.error {
    padding: 10px 13px;
    margin-bottom: 14px;
    border-radius: var(--r-sm, 8px);
    border-left: 4px solid var(--danger);
    background: var(--danger-soft);
    color: var(--danger);
    font-size: .85rem;
}

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
    font-size: .875rem;
    font-weight: 600;
    box-shadow: var(--shadow-lg);
    text-align: center;
}

.aviso.malo {
    background: var(--danger);
    color: var(--surface);
}
</style>