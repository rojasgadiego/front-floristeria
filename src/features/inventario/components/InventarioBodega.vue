<template>
    <div class="inv-bodega">
        <EncabezadoSeccion titulo="Inventario Bodega" :volver-a="{ name: 'Inventario' }">
            <template v-if="puedeEditar" #acciones>
                <button class="btn btn-linea" @click="abrirRamo(null)">💐 Nuevo ramo</button>
                <button class="btn" @click="abrirNuevo">＋ Nuevo producto</button>
            </template>
        </EncabezadoSeccion>

        <TablaProductos foco="bodega" @traspasar="abrirTraspaso" @armar="p => armando = p" />

        <!-- Modal de armado -->
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

                    <div class="nota">
                        Hay <b class="dato">{{ traspaso.producto.enBodega }}</b> en bodega y
                        <b class="dato">{{ traspaso.producto.enVenta || 0 }}</b> adelante.
                    </div>

                    <!-- ── Elegir el balde ──
                         Antes bastaba con el producto. Ahora hay que decir de
                         QUÉ lote salen las varas: la partida que queda en el
                         mesón recuerda su origen, y eso es lo que permite
                         devolverlas al balde correcto si se anula una venta. -->
                    <div v-if="traspaso.cargandoLotes" class="cargando">Buscando lotes…</div>

                    <div v-else-if="!traspaso.lotes.length" class="error">
                        Este producto no tiene lotes activos en bodega. Recibe una
                        compra para que entre flor.
                    </div>

                    <template v-else>
                        <div class="grupo">
                            <label for="t-lote">¿De qué balde?</label>

                            <!-- El primero es el que toca por FIFO: lo que vence
                                 antes se vende primero. Se puede cambiar, pero
                                 no hace falta pensarlo. -->
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
                                <template v-if="loteElegido.diasParaVencer != null && loteElegido.diasParaVencer <= 2">
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
                </div>

                <div class="modal-pie">
                    <button class="btn btn-linea" @click="traspaso = null">Cancelar</button>
                    <button class="btn" :disabled="guardando || !traspaso.lotes.length" @click="confirmarTraspaso">
                        {{ guardando ? 'Bajando…' : 'Bajar' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- ================= La partida recién creada ================= -->
        <!-- Se muestra aparte del aviso porque hay algo que hacer con ella:
             imprimir la etiqueta antes de dejar el balde en el mesón. -->
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import TablaProductos from './TablaProductos.vue'
import EncabezadoSeccion from '@/shared/components/EncabezadoSeccion.vue'
import ModalArmado from '@/features/inventario/components/ModalArmado.vue'
import { mostradorService } from '@/features/ventas/services/mostrador.service'
import { lotesService } from '@/features/lotes/services/lotes.service'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'
import ModalProducto from '@/features/inventario/components/ModalProducto.vue'
import ModalRamo from '@/features/inventario/components/ModalRamo.vue'

export default {
    name: 'InventarioBodega',
    components: { TablaProductos, EncabezadoSeccion, ModalArmado, ModalProducto, ModalRamo },
    setup() {
        const store = useStore()
        const router = useRouter()

        const puedeEditar = computed(() => store.getters['auth/tieneRol']('admin', 'bodega'))
        const abrirNuevo = () => store.dispatch('productos/abrirFormulario', null)

        const { usarResalte, usarAviso } = useTemporizadores()
        const resalte = usarResalte()
        const { aviso, avisar } = usarAviso()

        const armando = ref(null)
        const traspaso = ref(null)
        const partida = ref(null)
        const guardando = ref(false)
        const campoTraspaso = ref(null)

        const ramo = ref(null)
        const abrirRamo = (p) => { ramo.value = { producto: p } }

        const alGuardarRamo = (p) => {
            ramo.value = null
            avisar(`${p.nombre} guardado`)
            resalte.marcar(p.id)
            store.dispatch('productos/cargar')
        }

        /**
         * Al abrir el modal se cargan los lotes activos del producto. El
         * primero viene elegido: es el que toca por antigüedad, y en el 90%
         * de los casos es el correcto.
         */
        const abrirTraspaso = async (producto) => {
            traspaso.value = {
                producto,
                lotes: [],
                loteCodigo: null,
                cantidad: 0,
                cargandoLotes: true,
                error: ''
            }

            try {
                const lotes = await lotesService.listar({
                    productoId: producto.id,
                    tamano: 50
                })

                /* Solo los que tienen varas: un lote agotado no se puede bajar. */
                const activos = (lotes.items || []).filter(l => l.varasDisponibles > 0)

                traspaso.value.lotes = activos
                traspaso.value.loteCodigo = activos[0]?.codigo ?? null
                traspaso.value.cantidad = Math.min(25, activos[0]?.varasDisponibles ?? 0)

                await nextTick()
                campoTraspaso.value?.select()
            } catch (e) {
                traspaso.value.error = e.message
            } finally {
                traspaso.value.cargandoLotes = false
            }
        }

        const loteElegido = computed(() =>
            traspaso.value?.lotes.find(l => l.codigo === traspaso.value.loteCodigo) ?? null
        )

        /* El tope es lo que tiene ESE balde, no todo el stock del producto:
           cada partida sale de un lote y no puede llevarse más de lo que hay
           en él. */
        const maximo = computed(() => loteElegido.value?.varasDisponibles ?? 0)

        const ajustarMaximo = () => {
            const t = traspaso.value
            if (t.cantidad > maximo.value) t.cantidad = maximo.value
        }

        const confirmarTraspaso = async () => {
            const t = traspaso.value
            t.error = ''

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
                store.dispatch('productos/cargar')
            } catch (e) {
                /* El mensaje viene del RAISE del SP: "El lote LOT-000015 tiene
                   12 varas y estás bajando 30". Ya está redactado. */
                t.error = e.message
            } finally {
                guardando.value = false
            }
        }

        const formularioAbierto = computed(() => store.getters['productos/formularioAbierto'])
        const editando = computed(() => store.getters['productos/editando'])
        const cerrarFormulario = () => store.dispatch('productos/cerrarFormulario')

        const alGuardarProducto = (p) => {
            cerrarFormulario()
            avisar(`${p.nombre} guardado`)
            resalte.marcar(p.id)
        }


        /* La hoja de etiquetas la arma la vista de etiquetas, que tiene los
           tres formatos y el QR. Acá solo se navega hacia allá. */
        const imprimirEtiqueta = () => {
            const codigo = partida.value.codigo
            partida.value = null
            router.push({ name: 'EtiquetasPartida', params: { codigo } })
        }

        const alArmar = (resultado) => {
            armando.value = null
            avisar(`${resultado.armadas} unidad(es) armadas`)
            resalte.marcar(resultado.productoId)
            store.dispatch('productos/cargar')
        }

        const fecha = (iso) => new Date(iso).toLocaleDateString('es-CL',
            { day: '2-digit', month: 'short' })


        /* ---------------- Carga ---------------- */
        let control = null

        onMounted(() => {
            control = new AbortController()

            /* Se fija el filtro COMPLETO, no solo lo que esta vista necesita:
               el módulo se comparte con el POS, que deja puesto
               soloEnVenta, y sin resetear la grilla arranca mostrando lo del
               mesón.

               Bodega no filtra por stock: un producto en cero es justo lo
               que hay que ver para saber qué reponer. */
            store.dispatch('productos/filtrar', {
                soloEnVenta: false,
                activo: true,
                buscar: '',
                categoriaId: null,
                bajoMinimo: false,
                pagina: 1
            })
        })

        onUnmounted(() => control?.abort())

        return {
            puedeEditar, abrirNuevo, armando,
            traspaso, partida, guardando, campoTraspaso,
            loteElegido, maximo, ajustarMaximo,
            abrirTraspaso, confirmarTraspaso, imprimirEtiqueta,
            formularioAbierto, editando, cerrarFormulario, alGuardarProducto,
            alArmar, aviso, fecha, abrirRamo, ramo, alGuardarRamo
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