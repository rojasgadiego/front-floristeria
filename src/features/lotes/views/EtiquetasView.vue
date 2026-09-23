<template>
    <!-- ═══════════ Controles: no se imprimen ═══════════ -->
    <div class="controles">
        <header class="cabecera">
            <div class="min0">
                <nav class="migas" aria-label="Ruta">
                    <router-link :to="{ name: origen.ruta }">{{ origen.texto }}</router-link>
                    <span class="migas-sep" aria-hidden="true">›</span>
                    <span aria-current="page">Etiquetas</span>
                </nav>

                <h2>{{ esPartida ? 'Etiqueta del mesón' : esCompra ? 'Etiquetas del balde' : 'Etiquetas' }}</h2>
                <p v-if="esPartida" class="pista">
                    Pégala al balde <b>antes</b> de dejarlo adelante. El vendedor la
                    escanea para vender: una partida sin etiqueta no se puede cobrar.
                </p>
                <p v-else class="pista">
                    <template v-if="esCompra">
                        Lo que entra por compra va directo al balde de bodega.
                    </template>
                    Imprímelas y pégalas <b>antes</b> de meter los paquetes a la cámara.
                    Un lote sin etiqueta no se puede escanear.
                </p>
            </div>

            <button
                class="btn btn-imprimir"
                :disabled="!listas.length || cargando || imprimiendo"
                @click="imprimir"
            >
                <span v-if="imprimiendo">Abriendo…</span>
                <span v-else>🖨️ Imprimir {{ listas.length }}</span>
            </button>
        </header>

        <!-- Error -->
        <div v-if="error" class="banda banda-error" role="alert">
            <span class="banda-ico" aria-hidden="true">⚠️</span>
            <span class="banda-txt">{{ error }}</span>
            <button class="btn btn-mini btn-fantasma" @click="cargar">Reintentar</button>
        </div>

        <!-- Cargando -->
        <div v-if="cargando" class="estado estado-cargando">
            <span class="spinner" aria-hidden="true"></span>
            <div class="estado-cuerpo">
                <strong>Preparando etiquetas…</strong>
                <template v-if="etiquetas.length">
                    <div class="progreso" role="progressbar" :aria-valuenow="qrListos"
                         :aria-valuemax="etiquetas.length">
                        <div class="progreso-fill"
                             :style="{ width: `${(qrListos / etiquetas.length) * 100}%` }"></div>
                    </div>
                    <span class="mini suave">{{ qrListos }} de {{ etiquetas.length }} códigos listos</span>
                </template>
                <span v-else class="mini suave">Cargando lotes…</span>
            </div>
        </div>

        <!-- Vacío -->
        <div v-else-if="!etiquetas.length" class="estado estado-vacio">
            <span class="estado-emoji" aria-hidden="true">🏷️</span>
            <strong>No hay etiquetas que imprimir</strong>
            <p class="pista centro">
                Selecciona lotes desde la lista, o entra desde una compra recién recibida.
            </p>
            <router-link class="btn" :to="{ name: 'Lotes' }">Ir a lotes</router-link>
        </div>

        <!-- Opciones -->
        <template v-else>
            <div class="toolbar">
                <!-- Desde una compra no se elige: todo va al balde de bodega. -->
                <template v-if="!esCompra && !esPartida">
                    <div class="grupo">
                        <span class="grupo-label">Qué imprimir</span>
                        <div class="segmento" role="radiogroup" aria-label="Tipo de etiqueta">
                            <button
                                v-for="t in TIPOS"
                                :key="t.valor"
                                class="segmento-btn"
                                :class="{ activo: tipo === t.valor }"
                                role="radio"
                                :aria-checked="tipo === t.valor"
                                @click="tipo = t.valor"
                            >
                                <span class="segmento-emoji" aria-hidden="true">{{ t.emoji }}</span>
                                <span class="segmento-txts">
                                    <span class="segmento-titulo">{{ t.titulo }}</span>
                                    <span class="segmento-sub">{{ t.sub }}</span>
                                </span>
                            </button>
                        </div>
                    </div>

                    <div class="separador" aria-hidden="true"></div>
                </template>

                <!-- El tamaño tiene que ser el del rollo cargado en la Zebra. -->
                <div class="grupo">
                    <span class="grupo-label">Tamaño del rollo (ancho × alto)</span>
                    <div class="segmento segmento-tamano" role="radiogroup" aria-label="Tamaño de etiqueta">
                        <button
                            v-for="t in TAMANOS"
                            :key="t.valor"
                            class="segmento-btn"
                            :class="{ activo: tamano === t.valor }"
                            role="radio"
                            :aria-checked="tamano === t.valor"
                            @click="tamano = t.valor"
                        >
                            <span class="segmento-txts">
                                <span class="segmento-titulo">{{ t.ancho }}×{{ t.alto }}</span>
                                <span class="segmento-sub">{{ t.sub }}</span>
                            </span>
                        </button>
                    </div>
                </div>

                <template v-if="muestraBalde && !esPartida">
                    <div class="separador" aria-hidden="true"></div>
                    <div class="grupo">
                        <span class="grupo-label">Incluir</span>
                        <div class="toggles">
                            <label class="pill" :class="{ activa: conVencimiento }">
                                <input type="checkbox" v-model="conVencimiento">
                                <span>Vencimiento</span>
                            </label>
                            <label class="pill" :class="{ activa: conProveedor }">
                                <input type="checkbox" v-model="conProveedor">
                                <span>Proveedor</span>
                            </label>
                        </div>
                    </div>
                </template>
            </div>

            <div class="notas">
                <span v-if="tipoEfectivo === 'ambas'" class="nota nota-info">
                    <span aria-hidden="true">🔀</span>
                    Se imprimen <b>dos por lote</b>: una para el balde y una para el mostrador.
                    Total: {{ listas.length }} etiquetas.
                </span>
                <span v-else-if="tipoEfectivo === 'venta'" class="nota nota-info">
                    <span aria-hidden="true">🛒</span>
                    Etiqueta de <b>venta</b>: nombre y QR grande, para escanear al cobrar.
                </span>
                <span v-if="faltanQr" class="nota nota-alerta">
                    <span aria-hidden="true">◐</span>
                    {{ faltanQr }} código(s) sin imagen: se imprimen igual con el código escrito,
                    pero conviene reintentar.
                </span>
                <!-- Chrome recuerda lo que se eligió la última vez, así que esto
                     solo hay que hacerlo una vez por navegador. -->
                <div class="nota nota-info ajustes-dialogo">
                    <span aria-hidden="true">🖨️</span>
                    <div>
                        <b>En el diálogo de impresión, la primera vez:</b>
                        <ul>
                            <li>Destino: la <b>Zebra</b></li>
                            <li>Márgenes: <b>Ninguno</b></li>
                            <li>Escala: <b>100%</b></li>
                            <li>Desmarca <b>Encabezados y pies de página</b> (es lo que agrega
                                la hora y el título)</li>
                        </ul>
                        Cada etiqueta es una página: en la vista previa se ven separadas,
                        en el rollo salen una tras otra.
                    </div>
                </div>
            </div>
        </template>
    </div>

    <!-- ═══════════ Las etiquetas: lo único que se imprime ═══════════ -->
    <div v-if="listas.length" class="mesa">
        <div class="hoja" :style="estiloHoja">
            <article
                v-for="e in listas"
                :key="e.clave"
                class="etiqueta"
                :class="e.venta ? 'etiqueta-venta' : 'etiqueta-balde'"
            >
                <!-- ---------- BALDE ---------- -->
                <template v-if="!e.venta">
                    <div class="et-izq">
                        <b class="et-producto">{{ e.producto }}</b>
                        <div class="et-codigo">{{ e.codigo }}</div>
                        <!-- Un dato por línea: juntos en una sola no caben al
                             lado del QR, y lo que se cortaba era el vencimiento. -->
                        <div v-if="conVencimiento && e.fechaVencimiento" class="et-linea et-vence">
                            Vence {{ fecha(e.fechaVencimiento) }}
                        </div>
                        <!-- En el mesón lo que se pregunta es cuánto sale; en el
                             balde de bodega, de dónde vino. -->
                        <div v-if="e.esPartida" class="et-linea et-vence">{{ clp(e.precio) }}</div>
                        <template v-else>
                            <div class="et-linea">Ing {{ fecha(e.fechaIngreso) }}</div>
                            <!-- Sin varas ni ubicación: la cantidad cambia apenas se saca
                                 la primera y la etiqueta quedaría mintiendo. -->
                            <div v-if="conProveedor && e.proveedor" class="et-linea et-prov">{{ e.proveedor }}</div>
                        </template>
                    </div>

                    <div class="et-der">
                        <img v-if="qr[e.codigo]" :src="qr[e.codigo]" :alt="`QR ${e.codigo}`" class="qr">
                        <div v-else class="qr qr-vacio">{{ e.codigo }}</div>
                    </div>
                </template>

                <!-- ---------- VENTA ---------- -->
                <template v-else>
                    <span class="venta-tag">VENTA</span>
                    <img v-if="qr[e.codigo]" :src="qr[e.codigo]" :alt="`QR ${e.codigo}`" class="qr-venta">
                    <div v-else class="qr-venta qr-vacio">{{ e.codigo }}</div>
                    <b class="venta-producto">{{ e.producto }}</b>
                    <div class="venta-codigo">{{ e.codigo }}</div>
                </template>
            </article>
        </div>
    </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { lotesService } from '@/features/lotes/services/lotes.service'
import { mostradorService } from '@/features/ventas/services/mostrador.service'

/* Medidas de rollo habituales en Zebra de escritorio (ancho × alto, mm).
   57×32 y 51×25 son 2.25"×1.25" y 2"×1", los más comunes. */
const TAMANOS = [
    { valor: '51x25', ancho: 51, alto: 25, sub: '2″ × 1″' },
    { valor: '50x30', ancho: 50, alto: 30, sub: 'mm' },
    { valor: '57x32', ancho: 57, alto: 32, sub: '2¼″ × 1¼″' },
    { valor: '60x40', ancho: 60, alto: 40, sub: 'mm' },
    { valor: '76x51', ancho: 76, alto: 51, sub: '3″ × 2″' },
    { valor: '102x51', ancho: 102, alto: 51, sub: '4″ × 2″' }
]

const TIPOS = [
    { valor: 'balde', emoji: '🪣', titulo: 'Balde', sub: 'Completa' },
    { valor: 'venta', emoji: '🛒', titulo: 'Venta', sub: 'Nombre + QR' },
    { valor: 'ambas', emoji: '🔀', titulo: 'Ambas', sub: '2 por lote' }
]

/* Lo que se elige una vez y queda: el rollo no cambia de un día a otro. */
const CLAVE_PREFERENCIAS = 'colibri.etiquetas'

const leerPreferencias = () => {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_PREFERENCIAS)) || {}
    } catch {
        return {}
    }
}

const guardarPreferencias = (p) => {
    try {
        localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify(p))
    } catch {
        /* Modo privado o almacenamiento bloqueado: se usa lo de la sesión. */
    }
}

export default {
    name: 'EtiquetasView',

    setup() {
        const route = useRoute()
        const pref = leerPreferencias()

        const etiquetas = ref([])
        const qr = ref({})
        const cargando = ref(true)
        const error = ref('')
        const imprimiendo = ref(false)

        const tamano = ref(TAMANOS.some(t => t.valor === pref.tamano) ? pref.tamano : '50x30')
        const tipo = ref('balde')            // balde | venta | ambas
        const conVencimiento = ref(pref.conVencimiento ?? true)
        const conProveedor = ref(pref.conProveedor ?? true)

        watch([tamano, conVencimiento, conProveedor], ([t, v, p]) =>
            guardarPreferencias({ tamano: t, conVencimiento: v, conProveedor: p })
        )

        /* Lo que entra por compra va al balde de bodega, siempre. */
        const esCompra = computed(() => !!route.params.compraId)

        /* La partida que se acaba de bajar al mesón: una sola etiqueta, con
           el mismo diseño que la del balde pero con el precio. */
        const esPartida = computed(() => !!route.params.codigo)

        const tipoEfectivo = computed(() =>
            esCompra.value || esPartida.value ? 'balde' : tipo.value
        )

        const origen = computed(() =>
            esPartida.value ? { ruta: 'InventarioBodega', texto: 'Inventario Bodega' }
                : esCompra.value ? { ruta: 'Compras', texto: 'Compras' }
                    : { ruta: 'Lotes', texto: 'Lotes' }
        )
        const muestraBalde = computed(() => tipoEfectivo.value !== 'venta')

        const medida = computed(() => TAMANOS.find(t => t.valor === tamano.value) || TAMANOS[1])


        /*
         * Todo el diseño de la etiqueta cuelga de estas variables. El QR se
         * lleva lo que deja el alto (con 2mm de margen arriba y abajo) sin
         * pasar del 40% del ancho, para que al texto le quede espacio. La
         * escala agranda las letras en los rollos grandes sin tocar el CSS.
         */
        const estiloHoja = computed(() => {
            const { ancho, alto } = medida.value
            const escala = Math.min(1.8, Math.max(1, Math.min(ancho / 50, alto / 30)))
            return {
                '--w': `${ancho}mm`,
                '--h': `${alto}mm`,
                '--qr': `${Math.min(alto - 4, Math.round(ancho * 0.40))}mm`,
                '--qr-venta': `${Math.max(12, Math.min(alto - 13, ancho - 10))}mm`,
                '--esc': escala
            }
        })

        /*
         * El tamaño de página no se puede poner en el CSS scoped: @page es
         * global, y print.css ya fija 80mm para la boleta del POS. Se inyecta
         * una regla al final del <head> —gana por venir después— y se retira
         * al salir, así el POS sigue imprimiendo su ticket.
         */
        let estiloPagina = null

        const aplicarPagina = () => {
            if (!estiloPagina) {
                estiloPagina = document.createElement('style')
                estiloPagina.dataset.origen = 'etiquetas'
                document.head.appendChild(estiloPagina)
            }
            const { ancho, alto } = medida.value
            estiloPagina.textContent =
                `@media print { @page { size: ${ancho}mm ${alto}mm; margin: 0; } }`
        }

        watch(medida, aplicarPagina)

        let control = null

        const cargar = async () => {
            cargando.value = true
            error.value = ''
            liberar()
            control?.abort()
            control = new AbortController()
            const señal = { signal: control.signal }

            try {
                const compraId = route.params.compraId
                if (route.params.codigo) {
                    const p = await mostradorService.escanear(String(route.params.codigo), señal)
                    etiquetas.value = p ? [{
                        loteId: p.id,
                        codigo: p.codigo,
                        producto: p.producto,
                        emoji: p.emoji,
                        fechaVencimiento: p.fechaVencimiento,
                        precio: p.precioUnitario,
                        esPartida: true
                    }] : []
                } else if (compraId) {
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
                if (!e.esCancelado) error.value = e.message || 'No se pudieron cargar las etiquetas.'
            } finally {
                cargando.value = false
            }
        }

        const cargarQr = async (señal) => {
            const resultados = await Promise.allSettled(
                etiquetas.value.map(e => e.esPartida
                    ? mostradorService.qr(e.codigo, señal)
                    : lotesService.qr(e.codigo, señal))
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
        const faltanQr = computed(() => Math.max(0, etiquetas.value.length - qrListos.value))

        /*
         * "Ambas" duplica cada lote: primero la de balde y enseguida la de
         * venta, así al cortar el rollo quedan juntas.
         *
         * La `clave` distingue las dos copias del mismo lote en el v-for; sin
         * ella Vue reusaría el nodo y no re-renderizaría la segunda variante.
         */
        const listas = computed(() => {
            if (cargando.value) return []

            const salida = []
            for (const e of etiquetas.value) {
                if (tipoEfectivo.value !== 'venta') {
                    salida.push({ ...e, venta: false, clave: `${e.loteId}-b` })
                }
                if (tipoEfectivo.value !== 'balde') {
                    salida.push({ ...e, venta: true, clave: `${e.loteId}-v` })
                }
            }
            return salida
        })

        onMounted(() => {
            /* En <html> y no en <body>: print.css tiene que poder anular el
               ancho de 80mm que le pone a los dos. */
            document.documentElement.classList.add('modo-etiquetas')
            aplicarPagina()
            cargar()
        })

        watch(
            () => [route.params.compraId, route.params.codigo, route.query.ids],
            () => cargar()
        )

        onUnmounted(() => {
            document.documentElement.classList.remove('modo-etiquetas')
            estiloPagina?.remove()
            control?.abort()
            liberar()
        })

        /*
         * Si en el diálogo quedaron activos "Encabezados y pies de página",
         * Chrome estampa el título de la pestaña en cada etiqueta. La página
         * no puede apagar esa opción, pero sí dejar el título vacío mientras
         * imprime. window.print() bloquea hasta que se cierra el diálogo, y
         * afterprint cubre a los navegadores que no bloquean.
         */
        const imprimir = async () => {
            imprimiendo.value = true
            aplicarPagina()
            await nextTick()

            const titulo = document.title
            const restaurar = () => {
                document.title = titulo
                window.removeEventListener('afterprint', restaurar)
            }
            window.addEventListener('afterprint', restaurar)
            document.title = ' '

            requestAnimationFrame(() => {
                window.print()
                restaurar()
                imprimiendo.value = false
            })
        }

        const fmtFecha = new Intl.DateTimeFormat('es-CL', {
            day: '2-digit', month: '2-digit', year: '2-digit'
        })
        const fmtClp = new Intl.NumberFormat('es-CL', {
            style: 'currency', currency: 'CLP', maximumFractionDigits: 0
        })
        const clp = (n) => fmtClp.format(Math.round(n || 0))

        const fecha = (v) => {
            if (!v) return '—'
            const d = /^\d{4}-\d{2}-\d{2}$/.test(v)
                ? new Date(`${v}T12:00:00`)
                : new Date(v)
            return isNaN(d) ? '—' : fmtFecha.format(d)
        }

        return {
            TAMANOS, TIPOS,
            etiquetas, listas, qr, cargando, error, cargar,
            qrListos, faltanQr, imprimiendo,
            esCompra, esPartida, origen, tipo, tipoEfectivo, muestraBalde,
            tamano, medida, estiloHoja, conVencimiento, conProveedor,
            imprimir, fecha, clp
        }
    }
}
</script>

<style scoped>
/* ═══════════ Reset local ═══════════ */
.controles,
.controles *,
.hoja * {
    box-sizing: border-box;
}

/* ═══════════ Encabezado ═══════════ */
.cabecera {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 20px;
}

.migas {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 6px;
    font-size: 0.78rem;
    color: var(--text-faint);
}

.migas a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
    transition: color var(--t-fast);
}

.migas a:hover {
    color: var(--accent-hover);
    text-decoration: underline;
}

.migas-sep {
    color: var(--border-strong);
}

.cabecera h2 {
    margin: 0;
    font-size: clamp(1.35rem, 4.5vw, 1.6rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text);
}

.pista {
    margin: 5px 0 0;
    font-size: 0.875rem;
    color: var(--text-muted);
    max-width: 62ch;
    line-height: 1.55;
}

.pista.centro {
    max-width: 42ch;
    margin: 5px auto 16px;
}

.min0 {
    min-width: 0;
}

/* ═══════════ Banda de error ═══════════ */
.banda {
    display: flex;
    align-items: center;
    gap: 11px;
    flex-wrap: wrap;
    padding: 13px 16px;
    border-radius: var(--r-md);
    margin-bottom: 16px;
    font-size: 0.875rem;
}

.banda-error {
    background: var(--danger-soft);
    border: 1px solid var(--danger-border);
    color: var(--danger);
}

.banda-ico {
    font-size: 1.05rem;
}

.banda-txt {
    flex: 1;
    min-width: 0;
}

/* ═══════════ Estados ═══════════ */
.estado {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: 32px 24px;
}

.estado-cargando {
    display: flex;
    align-items: center;
    gap: 16px;
    text-align: left;
}

.estado-cuerpo {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.estado-cuerpo strong {
    color: var(--text);
    font-size: 0.98rem;
}

.spinner {
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    border: 3px solid var(--accent-soft);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: girar 0.7s linear infinite;
}

@keyframes girar {
    to { transform: rotate(360deg); }
}

.progreso {
    height: 6px;
    background: var(--surface-2);
    border-radius: var(--r-full);
    overflow: hidden;
    max-width: 360px;
}

.progreso-fill {
    height: 100%;
    background: var(--accent);
    border-radius: var(--r-full);
    transition: width 0.3s ease;
}

.estado-vacio {
    text-align: center;
    border-style: dashed;
    border-color: var(--border-strong);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 24px;
}

.estado-emoji {
    font-size: 2.6rem;
    margin-bottom: 12px;
    opacity: 0.85;
}

.estado-vacio strong {
    color: var(--text);
    font-size: 1.1rem;
    font-weight: 700;
}

/* ═══════════ Toolbar ═══════════ */
.toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 20px;
    padding: 16px 18px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    margin-bottom: 14px;
    box-shadow: var(--shadow-sm);
}

.grupo {
    display: flex;
    flex-direction: column;
    gap: 7px;
}

.grupo-label {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-faint);
}

.separador {
    width: 1px;
    align-self: stretch;
    background: var(--border);
    margin: 4px 0;
}

.segmento {
    display: inline-flex;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 11px;
    padding: 3px;
    gap: 3px;
}

.segmento-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 46px;
    padding: 6px 14px;
    border: none;
    border-radius: var(--r-sm);
    background: transparent;
    font-family: inherit;
    cursor: pointer;
    transition: background-color var(--t-fast), box-shadow var(--t-fast), color var(--t-fast);
    color: var(--text-muted);
}

.segmento-btn:hover {
    color: var(--text);
}

.segmento-btn.activo {
    background: var(--bg-elev);
    color: var(--accent-text);
    box-shadow: var(--shadow-sm);
}

.segmento-emoji {
    font-size: 1.15rem;
    line-height: 1;
}

.segmento-txts {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
}

.segmento-titulo {
    font-size: 0.88rem;
    font-weight: 700;
    line-height: 1;
}

.segmento-sub {
    font-size: 0.68rem;
    color: var(--text-faint);
    line-height: 1;
}

.segmento-btn.activo .segmento-sub {
    color: var(--accent-text);
}

/* Toggles */
.toggles {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 42px;
    padding: 0 14px 0 12px;
    border: 1px solid var(--border-strong);
    border-radius: var(--r-sm);
    background: var(--surface);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
    cursor: pointer;
    user-select: none;
    transition: all var(--t-fast);
}

.pill:hover {
    border-color: var(--text-faint);
}

.pill.activa {
    background: var(--secondary-soft);
    border-color: var(--secondary);
    color: var(--secondary);
}

.pill input {
    width: 17px;
    height: 17px;
    accent-color: var(--secondary);
    cursor: pointer;
    margin: 0;
}

/* ═══════════ Notas ═══════════ */
.notas {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 18px;
}

.nota {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 0.78rem;
    line-height: 1.5;
}

.nota-info {
    color: var(--info);
    background: var(--info-soft);
    border: 1px solid var(--info-border);
    border-radius: var(--r-sm);
    padding: 9px 12px;
    font-weight: 500;
}

.nota-alerta {
    color: var(--warn);
    background: var(--warn-soft);
    border: 1px solid var(--warn-border);
    border-radius: var(--r-sm);
    padding: 9px 12px;
    font-weight: 500;
}

.ajustes-dialogo ul {
    margin: 4px 0 6px;
    padding-left: 18px;
}

.ajustes-dialogo li {
    margin: 2px 0;
}

.nota-suave {
    color: var(--text-faint);
    padding: 0 2px;
}

.mini {
    font-size: 0.76rem;
}

.suave {
    color: var(--text-muted);
}

/* ═══════════ Botones ═══════════ */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 44px;
    padding: 0.65rem 1.2rem;
    border: none;
    border-radius: var(--r-sm);
    background: var(--accent);
    color: var(--accent-contrast);
    font-family: inherit;
    font-size: 0.92rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition: background-color 0.18s, transform 0.05s;
}

.btn:hover:not(:disabled) {
    background: var(--accent-hover);
}

.btn:active:not(:disabled) {
    transform: translateY(1px);
}

.btn:disabled {
    background: var(--border-strong);
    color: var(--text-faint);
    cursor: not-allowed;
}

.btn-imprimir {
    align-self: flex-start;
    box-shadow: var(--sh-accent);
}

.btn-imprimir:disabled {
    box-shadow: none;
}

.btn-mini {
    min-height: 36px;
    padding: 0.4rem 0.85rem;
    font-size: 0.8rem;
}

.btn-fantasma {
    background: var(--surface);
    color: var(--danger);
    border: 1px solid var(--danger-border);
}

.btn-fantasma:hover:not(:disabled) {
    background: var(--danger-soft);
}

/* ═══════════ Mesa (decorado de pantalla) ═══════════ */
.mesa {
    margin-top: 4px;
    padding: 20px;
    background:
        repeating-linear-gradient(45deg,
            var(--surface) 0,
            var(--surface) 12px,
            var(--surface-2) 12px,
            var(--surface-2) 24px);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
}

/* ═══════════ Las etiquetas ═══════════
   Impresora térmica: solo imprime negro o nada. Sin grises, sin colores,
   sin emoji —se imprimen como una mancha— y sin bordes, que en un rollo
   troquelado salen corridos respecto del corte. Los colores van fijos a
   propósito, sin importar el tema.

   Las medidas salen de las variables que pone la vista (--w, --h, --qr,
   --esc): cambiar de rollo no obliga a tocar esto. */
.hoja {
    display: flex;
    flex-wrap: wrap;
    gap: 5mm;
}

.etiqueta {
    position: relative;
    width: var(--w);
    height: var(--h);
    overflow: hidden;
    padding: 1.6mm 2mm;
    background: #fff;
    color: #000;
    font-family: Arial, Helvetica, sans-serif;
    /* Sin esto el navegador se salta los fondos negros al imprimir. */
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    /* Solo en pantalla: marca el troquel. outline no ocupa espacio, así la
       vista previa mide lo mismo que la impresión. */
    outline: 1px dashed #9aa4b2;
    outline-offset: 0;
    border-radius: 1.5mm;
    box-shadow: 0 1px 3px rgba(0, 0, 0, .12);
}

/* ---------- BALDE ---------- */
.etiqueta-balde {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 2mm;
}

.et-izq {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: calc(.5mm * var(--esc));
    min-width: 0;
}

.et-producto {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: calc(3.1mm * var(--esc));
    font-weight: 800;
    line-height: 1.1;
    text-transform: uppercase;
    word-break: break-word;
}

/* Grande y grueso: es lo que se lee a mano si el lector no toma el QR. */
.et-codigo {
    font-size: calc(3.3mm * var(--esc));
    font-weight: 800;
    letter-spacing: .02em;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
    white-space: nowrap;
}

/* Negrita siempre: un trazo fino en térmica sale cortado. */
.et-linea {
    font-size: calc(2.5mm * var(--esc));
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Lo que decide qué balde sale primero: un punto más grande. */
.et-vence {
    font-size: calc(2.7mm * var(--esc));
    font-weight: 800;
}

.et-der {
    display: flex;
    align-items: center;
}

/* pixelated: el QR se agranda sin suavizar. El suavizado deja bordes
   grises que la térmica convierte en ruido y el lector no toma. */
.qr {
    display: block;
    width: var(--qr);
    height: var(--qr);
    image-rendering: crisp-edges;
    image-rendering: pixelated;
}

.qr-vacio {
    display: grid;
    place-items: center;
    padding: .8mm;
    border: .3mm dashed #000;
    font-size: 2.2mm;
    font-weight: 700;
    text-align: center;
    word-break: break-all;
}

/* ---------- VENTA ---------- */
.etiqueta-venta {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: .8mm;
    text-align: center;
}

/* Bloque negro con letras blancas: se distingue de la de balde sin color. */
.venta-tag {
    position: absolute;
    top: 1.2mm;
    left: 1.2mm;
    padding: .3mm 1.2mm;
    background: #000;
    color: #fff;
    font-size: 2.1mm;
    font-weight: 800;
    letter-spacing: .1em;
}

.qr-venta {
    display: block;
    width: var(--qr-venta);
    height: var(--qr-venta);
    image-rendering: crisp-edges;
    image-rendering: pixelated;
}

.venta-producto {
    max-width: 100%;
    overflow: hidden;
    font-size: calc(2.9mm * var(--esc));
    font-weight: 800;
    line-height: 1.1;
    text-transform: uppercase;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.venta-codigo {
    font-size: calc(2.5mm * var(--esc));
    font-weight: 700;
    letter-spacing: .04em;
}

/* ═══════════ Responsive ═══════════ */
@media (max-width: 720px) {
    .toolbar {
        gap: 16px;
    }

    .separador {
        display: none;
    }

    .grupo {
        width: 100%;
    }

    .segmento {
        width: 100%;
    }

    .segmento-btn {
        flex: 1;
        justify-content: center;
    }

    /* Seis tamaños no caben en una fila del celular: tres por fila. */
    .segmento-tamano {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
    }

    .btn-imprimir {
        width: 100%;
    }

    .mesa {
        padding: 12px;
    }

    .hoja {
        justify-content: center;
    }
}

@media (prefers-reduced-motion: reduce) {
    .btn,
    .segmento-btn,
    .pill,
    .progreso-fill {
        transition: none;
    }

    .spinner {
        animation: none;
    }
}

/* ═══════════ Impresión: una etiqueta por página ═══════════
   El tamaño de página lo inyecta la vista (ver aplicarPagina). */
@media print {
    .controles {
        display: none !important;
    }

    .mesa {
        margin: 0;
        padding: 0;
        background: none !important;
        border: 0 !important;
        border-radius: 0;
    }

    .hoja {
        display: block;
    }

    .etiqueta {
        outline: none;
        border-radius: 0;
        box-shadow: none;
        break-after: page;
        page-break-after: always;
        break-inside: avoid;
        page-break-inside: avoid;
    }

    /* Sin esto sale una etiqueta en blanco al final del lote. */
    .etiqueta:last-child {
        break-after: auto;
        page-break-after: auto;
    }
}
</style>
