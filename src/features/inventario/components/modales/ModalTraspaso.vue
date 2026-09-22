<template>
    <div class="fondo" @click.self="$emit('cerrar')">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="t-titulo">
            <div class="modal-cab">
                <h3 id="t-titulo">Bajar al mostrador</h3>
                <p>{{ actual.emoji }} {{ actual.nombre }}</p>
            </div>

            <div class="modal-cuerpo">
                <div v-if="error" class="error">{{ error }}</div>

                <div v-if="cargando" class="cargando">Buscando lotes…</div>

                <template v-else>
                    <!-- Estos números se releen al abrir el modal, no se
                         heredan de la fila: entre que se pintó la grilla y
                         que el bodeguero abrió esto pudo haber una venta. -->
                    <div class="nota">
                        Hay <b class="dato">{{ enBodega }}</b> en bodega y
                        <b class="dato">{{ actual.enVenta || 0 }}</b> adelante.
                    </div>

                    <div v-if="porLote && !lotes.length" class="error sep">
                        Este producto no tiene lotes activos en bodega. Recibe una
                        compra para que entre flor.
                    </div>

                    <div v-else-if="!porLote && !enBodega" class="error sep">
                        No queda stock en bodega para bajar.
                    </div>

                    <template v-else>
                        <div v-if="porLote" class="grupo">
                            <label for="t-lote">¿De qué balde?</label>

                            <select id="t-lote" class="campo" v-model="loteCodigo" @change="ajustarMaximo">
                                <option v-for="(l, i) in lotes" :key="l.codigo" :value="l.codigo">
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
                                <template v-else-if="lotes[0]?.codigo !== loteCodigo">
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
                            <input id="t-cant" ref="campoCantidad" class="campo dato" type="number" min="1"
                                :max="maximo" v-model.number="cantidad" @keyup.enter="confirmar">
                            <p class="ayuda">
                                Se crea una partida con su propia etiqueta QR. El vendedor
                                la escanea para vender, y así el sistema sabe de qué
                                {{ porLote ? 'balde' : 'stock' }} descontar.
                            </p>
                        </div>

                        <div v-if="requiereAutorizacion" class="nota alerta sep">
                            Este traspaso necesita autorización de un supervisor.
                        </div>
                    </template>
                </template>
            </div>

            <div class="modal-pie">
                <button class="btn btn-linea" @click="$emit('cerrar')">Cancelar</button>
                <button class="btn" :disabled="!puedeBajar" @click="confirmar">
                    {{ guardando ? 'Bajando…' : 'Bajar' }}
                </button>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { productosService } from '@/features/inventario/services/productos.service'
import { inventarioVentaService } from '@/features/inventario/services/inventarioVenta.service'
import { lotesService } from '@/features/lotes/services/lotes.service'

export default {
    name: 'ModalTraspaso',
    props: {
        producto: { type: Object, required: true },
        /* Lo decide la tabla, que es la que conoce el permiso. */
        requiereAutorizacion: { type: Boolean, default: false }
    },
    emits: ['cerrar', 'traspasado'],

    setup (props, { emit }) {
        const actual = ref(props.producto)
        const lotes = ref([])
        const loteCodigo = ref(null)
        const cantidad = ref(0)
        const cargando = ref(true)
        const guardando = ref(false)
        const error = ref('')
        const campoCantidad = ref(null)

        /* Lo que no controla lotes (jarrones, cintas) baja directo del
           stock del producto, sin elegir balde. */
        const porLote = computed(() => actual.value.controlaLotes !== false)

        const loteElegido = computed(() =>
            lotes.value.find(l => l.codigo === loteCodigo.value) ?? null
        )

        /* Con lotes, lo que suman los baldes ES lo que hay en bodega: se
           calcula de lo recién traído en vez de creerle al contador. */
        const enBodega = computed(() => porLote.value
            ? lotes.value.reduce((s, l) => s + l.varasDisponibles, 0)
            : Number(actual.value.enBodega ?? 0))

        /* El tope es lo que tiene ESE balde, no todo el stock del producto. */
        const maximo = computed(() => porLote.value
            ? loteElegido.value?.varasDisponibles ?? 0
            : enBodega.value)

        const ajustarMaximo = () => {
            if (cantidad.value > maximo.value) cantidad.value = maximo.value
        }

        const puedeBajar = computed(() =>
            !guardando.value && !cargando.value && maximo.value > 0 && !props.requiereAutorizacion
        )

        /**
         * Al abrir se relee TODO desde el servidor: el producto y sus lotes.
         * La fila de la grilla puede tener minutos de antigüedad y el mesón
         * pudo haber vendido mientras tanto.
         */
        const control = new AbortController()

        onMounted(async () => {
            const { signal } = control
            try {
                const [detalle, pagina] = await Promise.all([
                    productosService.obtener(props.producto.id, { signal }),
                    lotesService.listar({ productoId: props.producto.id, tamano: 50 }, { signal })
                ])

                actual.value = { ...props.producto, ...detalle }

                /* Solo los que tienen varas: un lote agotado no se puede bajar. */
                lotes.value = (pagina.items || []).filter(l => l.varasDisponibles > 0)
                loteCodigo.value = lotes.value[0]?.codigo ?? null
                cantidad.value = Math.min(25, maximo.value)

                cargando.value = false
                await nextTick()
                campoCantidad.value?.select()
            } catch (e) {
                if (e.esCancelado || e.name === 'AbortError') return
                error.value = e.message
            } finally {
                cargando.value = false
            }
        })

        onUnmounted(() => control.abort())

        const confirmar = async () => {
            if (!puedeBajar.value) return
            error.value = ''

            if (porLote.value && !loteCodigo.value) return (error.value = 'Elige de qué balde bajar.')
            if (!cantidad.value || cantidad.value < 1) return (error.value = 'La cantidad debe ser al menos 1.')
            if (cantidad.value > maximo.value) {
                return (error.value = porLote.value
                    ? `El balde ${loteCodigo.value} tiene ${maximo.value} varas.`
                    : `Solo hay ${maximo.value} en bodega.`)
            }

            guardando.value = true
            try {
                const partida = porLote.value
                    ? await inventarioVentaService.traspasar({ lote: loteCodigo.value, cantidad: cantidad.value })
                    : await inventarioVentaService.traspasarProducto({
                        productoId: actual.value.id, cantidad: cantidad.value
                    })

                emit('traspasado', {
                    producto: actual.value.nombre,
                    cantidad: cantidad.value,
                    loteCodigo: loteCodigo.value,
                    ...partida
                })
            } catch (e) {
                /* El mensaje viene del RAISE del SP: "El lote LOT-000015 tiene
                   12 varas y estás bajando 30". Ya está redactado. */
                error.value = e.message
            } finally {
                guardando.value = false
            }
        }

        return {
            actual, lotes, loteCodigo, cantidad, cargando, guardando, error, campoCantidad,
            porLote, loteElegido, enBodega, maximo, puedeBajar, ajustarMaximo, confirmar
        }
    }
}
</script>

<style scoped src="./modal.css"></style>

<style scoped>
.sep {
    margin-top: 14px;
    margin-bottom: 0;
}
</style>
