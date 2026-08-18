<template>
    <!-- ---------- Controles: no se imprimen ---------- -->
        <div class="controles">
            <div class="cabecera">
                <div class="min0">
                    <div class="migas">
                        <router-link :to="{ name: 'Lotes' }">Lotes</router-link>
                        <span aria-hidden="true">›</span>
                        <span>Etiquetas</span>
                    </div>
                    <h2>Etiquetas</h2>
                    <p class="pista">
                        Imprímelas y pégalas <b>antes</b> de meter los paquetes a la cámara.
                        Un lote sin etiqueta no se puede escanear al vender.
                    </p>
                </div>
                <button class="btn" :disabled="!listas.length || cargando" @click="imprimir">
                    🖨️ Imprimir {{ listas.length }}
                </button>
            </div>

            <div v-if="error" class="banda banda-error">
                <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
                <button class="btn btn-mini" @click="cargar">Reintentar</button>
            </div>

            <div v-if="cargando" class="vacio">
                Preparando etiquetas… {{ qrListos }} de {{ etiquetas.length }} códigos
            </div>

            <div v-else-if="!etiquetas.length" class="vacio">
                <strong>No hay etiquetas que imprimir</strong>
                <p class="pista">
                    Selecciona lotes desde la lista, o entra desde una compra recién
                    recibida.
                </p>
                <router-link class="btn" :to="{ name: 'Lotes' }">Ir a lotes</router-link>
            </div>

            <template v-else>
                <div class="barra">
                    <label class="rango">
                        <span class="mini suave">Ancho de etiqueta</span>
                        <select class="campo campo-corto" v-model="formato">
                            <option v-for="f in FORMATOS" :key="f.valor" :value="f.valor">{{ f.texto }}</option>
                        </select>
                    </label>

                    <label class="check">
                        <input type="checkbox" v-model="conVencimiento">
                        <span>Incluir vencimiento</span>
                    </label>

                    <label class="check">
                        <input type="checkbox" v-model="conProveedor">
                        <span>Incluir proveedor</span>
                    </label>

                    <span v-if="faltanQr" class="mini alerta-texto">
                        {{ faltanQr }} código(s) sin imagen: se imprimen igual con el código
                        escrito, pero conviene reintentar.
                    </span>
                </div>

                <p class="ayuda">
                    Vista previa. Al imprimir se oculta todo lo demás de la pantalla; si
                    tu impresora agrega márgenes, ajústalos a cero en el diálogo.
                </p>
            </template>
        </div>

        <!-- ---------- La hoja: lo único que se imprime ---------- -->
        <div v-if="listas.length" class="hoja" :class="`formato-${formato}`">
            <article v-for="e in listas" :key="e.loteId" class="etiqueta">
                <div class="et-izq">
                    <div class="et-producto">
                        <span class="emoji" aria-hidden="true">{{ e.emoji }}</span>
                        <b>{{ e.producto }}</b>
                    </div>

                    <div class="et-codigo">{{ e.codigo }}</div>

                    <dl class="et-datos">
                        <div>
                            <dt>Ingreso</dt>
                            <dd>{{ fecha(e.fechaIngreso) }}</dd>
                        </div>
                        <div v-if="conVencimiento && e.fechaVencimiento">
                            <dt>Vence</dt>
                            <dd>{{ fecha(e.fechaVencimiento) }}</dd>
                        </div>
                        <div>
                            <dt>Varas</dt>
                            <dd>{{ e.varas }}</dd>
                        </div>
                        <div v-if="conProveedor && e.proveedor">
                            <dt>Prov.</dt>
                            <dd class="corta">{{ e.proveedor }}</dd>
                        </div>
                        <div v-if="e.ubicacion">
                            <dt>Ubic.</dt>
                            <dd class="corta">{{ e.ubicacion }}</dd>
                        </div>
                    </dl>
                </div>

                <div class="et-der">
                    <img v-if="qr[e.codigo]" :src="qr[e.codigo]" :alt="`QR ${e.codigo}`" class="qr">
                    <!--
            Sin imagen la etiqueta sigue sirviendo: el código se puede tipear
            a mano en la búsqueda de lotes, que es justamente para lo que es
            corto.
          -->
                    <div v-else class="qr-vacio">{{ e.codigo }}</div>
                </div>
            </article>
        </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { lotesService } from '@/features/lotes/services/lotes.service'

const FORMATOS = [
    { valor: 'chica', texto: 'Chica — 4 por fila' },
    { valor: 'media', texto: 'Media — 3 por fila' },
    { valor: 'grande', texto: 'Grande — 2 por fila' }
]

export default {
    name: 'EtiquetasView',
    components: {  },

    setup() {
        const route = useRoute()

        const etiquetas = ref([])
        const qr = ref({})
        const cargando = ref(true)
        const error = ref('')

        const formato = ref('media')
        const conVencimiento = ref(true)
        const conProveedor = ref(true)

        let control = null

        /*
         * Dos puertas de entrada: la selección manual desde la lista de lotes
         * (?ids=1,2,3) y la compra recién recibida (/etiquetas/compra/12), que es
         * el flujo real —se imprimen todas juntas al desembalar.
         */
        const cargar = async () => {
            cargando.value = true
            error.value = ''
            liberar()
            control?.abort()
            control = new AbortController()
            const señal = { signal: control.signal }

            try {
                const compraId = route.params.compraId
                if (compraId) {
                    etiquetas.value = await lotesService.etiquetasDeCompra(Number(compraId), señal)
                } else {
                    const ids = String(route.query.ids || '')
                        .split(',')
                        .map(Number)
                        .filter(Boolean)

                    etiquetas.value = ids.length ? await lotesService.etiquetas(ids, señal) : []
                }

                await cargarQr(señal)
            } catch (e) {
                if (!e.esCancelado) error.value = e.message
            } finally {
                cargando.value = false
            }
        }

        /*
         * Los QR vienen como PNG protegido: la etiqueta <img> no manda el bearer,
         * así que hay que traerlos por el cliente autenticado. En paralelo, pero
         * tolerando fallos: una imagen que no llega no debería impedir imprimir
         * las otras veinte.
         */
        const cargarQr = async (señal) => {
            const resultados = await Promise.allSettled(
                etiquetas.value.map(e => lotesService.qr(e.codigo, señal))
            )

            const mapa = {}
            resultados.forEach((r, i) => {
                if (r.status === 'fulfilled') mapa[etiquetas.value[i].codigo] = r.value
            })
            qr.value = mapa
        }

        const liberar = () => {
            Object.values(qr.value).forEach(lotesService.liberarQr)
            qr.value = {}
        }

        const qrListos = computed(() => Object.keys(qr.value).length)
        const faltanQr = computed(() => etiquetas.value.length - qrListos.value)
        const listas = computed(() => (cargando.value ? [] : etiquetas.value))

        /*
         * La clase en <body> es lo que permite ocultar el resto de la aplicación
         * al imprimir: los estilos con scope no alcanzan al sidebar ni al
         * encabezado, que son de otro componente.
         */
        onMounted(() => {
            document.body.classList.add('modo-etiquetas')
            cargar()
        })

        onUnmounted(() => {
            document.body.classList.remove('modo-etiquetas')
            control?.abort()
            liberar()
        })

        const imprimir = () => window.print()

        const fmtFecha = new Intl.DateTimeFormat('es-CL', {
            day: '2-digit', month: '2-digit', year: '2-digit'
        })
        const fecha = (v) => (v ? fmtFecha.format(new Date(v)) : '—')

        return {
            FORMATOS,
            etiquetas, listas, qr, cargando, error, cargar,
            qrListos, faltanQr,
            formato, conVencimiento, conProveedor,
            imprimir, fecha
        }
    }
}
</script>

<!--
  Sin scope a propósito: al imprimir hay que esconder el sidebar y el
  encabezado, que viven en MainLayout. La clase en <body> se agrega al montar
  y se quita al salir, así que estas reglas no afectan al resto de la app.
-->
<style>
@media print {
    body.modo-etiquetas * {
        visibility: hidden;
    }

    body.modo-etiquetas .hoja,
    body.modo-etiquetas .hoja * {
        visibility: visible;
    }

    body.modo-etiquetas .hoja {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        margin: 0;
        padding: 0;
    }

    @page {
        size: A4;
        margin: 8mm;
    }
}
</style>

<style scoped>
.controles,
.controles *,
.hoja * {
    box-sizing: border-box;
}

/* ---------- Encabezado ---------- */
.cabecera {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 18px;
}

.migas {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 5px;
    font-size: 0.78rem;
    color: #94a3b8;
}

.migas a {
    color: #059669;
    text-decoration: none;
    font-weight: 600;
}

.migas a:hover {
    text-decoration: underline;
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
    max-width: 60ch;
    line-height: 1.5;
}

.min0 {
    min-width: 0;
}

.banda {
    display: flex;
    align-items: center;
    gap: 11px;
    flex-wrap: wrap;
    padding: 12px 16px;
    border-radius: 10px;
    margin-bottom: 16px;
    font-size: 0.875rem;
}

.banda-error {
    background: #fee2e2;
    border: 1px solid #fca5a5;
    color: #991b1b;
}

.banda .btn {
    margin-left: auto;
}

/* ---------- Barra de opciones ---------- */
.barra {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px;
    padding: 13px 15px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    margin-bottom: 12px;
}

.rango {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.campo {
    min-height: 40px;
    padding: 0.5rem 0.7rem;
    border: 1px solid #cbd5e1;
    border-radius: 0.5rem;
    background: #fff;
    font-family: inherit;
    font-size: max(0.88rem, 16px);
    color: #0f172a;
    outline: none;
}

.campo:focus {
    border-color: transparent;
    box-shadow: 0 0 0 2px #10b981;
}

.campo-corto {
    width: auto;
    min-width: 175px;
}

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

.mini {
    font-size: 0.76rem;
}

.suave {
    color: #64748b;
}

.alerta-texto {
    color: #b45309;
    margin-left: auto;
}

.ayuda {
    margin: 0 0 18px;
    font-size: 0.78rem;
    color: #94a3b8;
    line-height: 1.5;
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
    text-decoration: none;
    transition: background-color 0.2s;
}

.btn:hover:not(:disabled) {
    background: #047857;
}

.btn:disabled {
    background: #a7c9bb;
    cursor: not-allowed;
}

.btn-mini {
    min-height: 34px;
    padding: 0.35rem 0.75rem;
    font-size: 0.8rem;
}

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

.vacio .pista {
    margin: 0 auto 16px;
}

/* ---------- La hoja ---------- */
.hoja {
    display: grid;
    gap: 4mm;
    padding: 2mm 0;
}

.formato-chica {
    grid-template-columns: repeat(4, 1fr);
}

.formato-media {
    grid-template-columns: repeat(3, 1fr);
}

.formato-grande {
    grid-template-columns: repeat(2, 1fr);
}

.etiqueta {
    display: flex;
    align-items: stretch;
    gap: 2.5mm;
    padding: 2.5mm;
    background: #fff;
    border: 1px solid #cbd5e1;
    border-radius: 2mm;
    /* Una etiqueta partida entre dos hojas no sirve para nada */
    break-inside: avoid;
    page-break-inside: avoid;
}

.et-izq {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
}

.et-producto {
    display: flex;
    align-items: center;
    gap: 1.5mm;
    min-width: 0;
}

.et-producto .emoji {
    font-size: 3.6mm;
    flex-shrink: 0;
}

.et-producto b {
    font-size: 3mm;
    line-height: 1.2;
    color: #000;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

/* El código va grande: es lo que se tipea cuando el QR no se deja leer */
.et-codigo {
    margin: 1.5mm 0;
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    font-size: 4.2mm;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #000;
}

.et-datos {
    margin: auto 0 0;
    font-size: 2.4mm;
    line-height: 1.35;
}

.et-datos>div {
    display: flex;
    gap: 1.5mm;
}

.et-datos dt {
    color: #555;
    min-width: 9mm;
    flex-shrink: 0;
}

.et-datos dd {
    margin: 0;
    color: #000;
    font-weight: 600;
    min-width: 0;
}

.corta {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.et-der {
    display: flex;
    align-items: center;
    flex-shrink: 0;
}

.qr {
    width: 20mm;
    height: 20mm;
    display: block;
}

.qr-vacio {
    width: 20mm;
    height: 20mm;
    display: grid;
    place-items: center;
    padding: 1mm;
    border: 1px dashed #999;
    border-radius: 1mm;
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 2.4mm;
    text-align: center;
    word-break: break-all;
    color: #000;
}

/* Los formatos angostos no tienen espacio para el detalle */
.formato-chica .et-datos {
    display: none;
}

.formato-chica .qr {
    width: 16mm;
    height: 16mm;
}

.formato-chica .qr-vacio {
    width: 16mm;
    height: 16mm;
}

.formato-chica .et-codigo {
    font-size: 3.4mm;
}

.formato-grande .qr {
    width: 26mm;
    height: 26mm;
}

.formato-grande .qr-vacio {
    width: 26mm;
    height: 26mm;
}

.formato-grande .et-codigo {
    font-size: 5mm;
}

@media (max-width: 720px) {

    .formato-chica,
    .formato-media,
    .formato-grande {
        grid-template-columns: repeat(2, 1fr);
    }

    .alerta-texto {
        margin-left: 0;
    }
}

@media (prefers-reduced-motion: reduce) {
    .btn {
        transition: none;
    }
}
</style>