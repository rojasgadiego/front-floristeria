<template>
    <!-- ═══════════ Controles: no se imprimen ═══════════ -->
    <div class="controles">
        <header class="cabecera">
            <div class="min0">
                <nav class="migas" aria-label="Ruta">
                    <router-link :to="{ name: 'Lotes' }">Lotes</router-link>
                    <span class="migas-sep" aria-hidden="true">›</span>
                    <span aria-current="page">Etiquetas</span>
                </nav>

                <h2>Etiquetas</h2>
                <p class="pista">
                    Imprímelas y pégalas <b>antes</b> de meter los paquetes a la cámara.
                    Un lote sin etiqueta no se puede escanear al vender.
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

        <!-- Toolbar de opciones + resumen -->
        <template v-else>
            <div class="toolbar">
                <!-- QUÉ IMPRIMIR -->
                <div class="grupo">
                    <span class="grupo-label">Qué imprimir</span>
                    <div class="segmento segmento-tipo" role="radiogroup" aria-label="Tipo de etiqueta">
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

                <!-- FORMATO (solo relevante para la de balde) -->
                <div class="grupo">
                    <span class="grupo-label">Ancho</span>
                    <div class="segmento" role="radiogroup" aria-label="Ancho de etiqueta">
                        <button
                            v-for="f in FORMATOS"
                            :key="f.valor"
                            class="segmento-btn"
                            :class="{ activo: formato === f.valor }"
                            role="radio"
                            :aria-checked="formato === f.valor"
                            @click="formato = f.valor"
                        >
                            <span class="segmento-txts">
                                <span class="segmento-titulo">{{ f.corto }}</span>
                                <span class="segmento-sub">{{ f.filas }}</span>
                            </span>
                        </button>
                    </div>
                </div>

                <!-- INCLUIR (solo aplica a la de balde) -->
                <template v-if="muestraBalde">
                    <div class="separador" aria-hidden="true"></div>
                    <div class="grupo">
                        <span class="grupo-label">Incluir en balde</span>
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
                <span v-if="tipo === 'ambas'" class="nota nota-info">
                    <span aria-hidden="true">🔀</span>
                    Se imprimen <b>dos por lote</b>: una completa para el balde y una simple
                    para el mostrador de ventas. Total: {{ listas.length }} etiquetas.
                </span>
                <span v-else-if="tipo === 'venta'" class="nota nota-info">
                    <span aria-hidden="true">🛒</span>
                    Etiqueta de <b>venta</b>: solo nombre y QR grande, pensada para escanear
                    al cobrar. Pégala en el mostrador o en una carpeta de consulta.
                </span>
                <span v-if="faltanQr" class="nota nota-alerta">
                    <span aria-hidden="true">◐</span>
                    {{ faltanQr }} código(s) sin imagen: se imprimen igual con el código escrito,
                    pero conviene reintentar.
                </span>
                <span class="nota nota-suave">
                    <span aria-hidden="true">👁️</span>
                    Vista previa. Al imprimir se oculta el resto de la pantalla; si tu impresora
                    agrega márgenes, ajústalos a cero en el diálogo.
                </span>
            </div>
        </template>
    </div>

    <!-- ═══════════ La hoja: lo único que se imprime ═══════════ -->
    <div v-if="listas.length" class="mesa">
        <div class="hoja" :class="`formato-${formato}`">
            <article
                v-for="e in listas"
                :key="e.clave"
                class="etiqueta"
                :class="e.venta ? 'etiqueta-venta' : 'etiqueta-balde'"
            >
                <!-- ---------- Versión BALDE ---------- -->
                <template v-if="!e.venta">
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
                        <div v-else class="qr-vacio">{{ e.codigo }}</div>
                    </div>
                </template>

                <!-- ---------- Versión VENTA ---------- -->
                <template v-else>
                    <span class="venta-tag" aria-hidden="true">VENTA</span>

                    <div class="venta-qr">
                        <img v-if="qr[e.codigo]" :src="qr[e.codigo]" :alt="`QR ${e.codigo}`" class="qr-grande">
                        <div v-else class="qr-vacio qr-vacio-grande">{{ e.codigo }}</div>
                    </div>

                    <div class="venta-pie">
                        <div class="venta-producto">
                            <span class="emoji" aria-hidden="true">{{ e.emoji }}</span>
                            <b>{{ e.producto }}</b>
                        </div>
                        <div class="venta-codigo">{{ e.codigo }}</div>
                    </div>
                </template>
            </article>
        </div>
    </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { lotesService } from '@/features/lotes/services/lotes.service'

const FORMATOS = [
    { valor: 'chica', corto: 'Chica', filas: '4 por fila' },
    { valor: 'media', corto: 'Media', filas: '3 por fila' },
    { valor: 'grande', corto: 'Grande', filas: '2 por fila' }
]

const TIPOS = [
    { valor: 'balde', emoji: '🪣', titulo: 'Balde', sub: 'Completa' },
    { valor: 'venta', emoji: '🛒', titulo: 'Venta', sub: 'Nombre + QR' },
    { valor: 'ambas', emoji: '🔀', titulo: 'Ambas', sub: '2 por lote' }
]

export default {
    name: 'EtiquetasView',

    setup() {
        const route = useRoute()

        const etiquetas = ref([])
        const qr = ref({})
        const cargando = ref(true)
        const error = ref('')
        const imprimiendo = ref(false)

        const formato = ref('media')
        const tipo = ref('balde')            // balde | venta | ambas
        const conVencimiento = ref(true)
        const conProveedor = ref(true)

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
                if (!e.esCancelado) error.value = e.message || 'No se pudieron cargar las etiquetas.'
            } finally {
                cargando.value = false
            }
        }

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
        const faltanQr = computed(() => Math.max(0, etiquetas.value.length - qrListos.value))
        const muestraBalde = computed(() => tipo.value !== 'venta')

        /*
         * Expandimos la lista según el tipo elegido. "Ambas" duplica cada lote:
         * primero la de balde, inmediatamente después la de venta, así al cortar
         * la tira quedan juntas y es fácil separarlas por destino.
         *
         * La `clave` distingue ambas copias del mismo lote en el v-for; sin ella
         * Vue reusaría el nodo y no re-renderizaría la segunda variante.
         */
        const listas = computed(() => {
            if (cargando.value) return []

            const salida = []
            for (const e of etiquetas.value) {
                if (tipo.value === 'balde' || tipo.value === 'ambas') {
                    salida.push({ ...e, venta: false, clave: `${e.loteId}-b` })
                }
                if (tipo.value === 'venta' || tipo.value === 'ambas') {
                    salida.push({ ...e, venta: true, clave: `${e.loteId}-v` })
                }
            }
            return salida
        })

        onMounted(() => {
            document.body.classList.add('modo-etiquetas')
            cargar()
        })

        watch(
            () => [route.params.compraId, route.query.ids],
            () => cargar()
        )

        onUnmounted(() => {
            document.body.classList.remove('modo-etiquetas')
            control?.abort()
            liberar()
        })

        const imprimir = async () => {
            imprimiendo.value = true
            await nextTick()
            requestAnimationFrame(() => {
                window.print()
                imprimiendo.value = false
            })
        }

        const fmtFecha = new Intl.DateTimeFormat('es-CL', {
            day: '2-digit', month: '2-digit', year: '2-digit'
        })
        const fecha = (v) => {
            if (!v) return '—'
            const d = /^\d{4}-\d{2}-\d{2}$/.test(v)
                ? new Date(`${v}T12:00:00`)
                : new Date(v)
            return isNaN(d) ? '—' : fmtFecha.format(d)
        }

        return {
            FORMATOS, TIPOS,
            etiquetas, listas, qr, cargando, error, cargar,
            qrListos, faltanQr, imprimiendo, muestraBalde,
            formato, tipo, conVencimiento, conProveedor,
            imprimir, fecha
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

/* ═══════════ La hoja (medidas en mm: NO tocar) ═══════════
   Impresión térmica/láser B/N: SIEMPRE negro sobre blanco,
   independiente del tema. Colores hardcodeados a propósito. */
.hoja {
    display: grid;
    gap: 4mm;
    background: #fff;
    border-radius: 8px;
    box-shadow: var(--shadow-md);
    padding: 6mm;
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
    background: #fff;
    border: 1px solid #cbd5e1;
    border-radius: 2mm;
    break-inside: avoid;
    page-break-inside: avoid;
}

/* ---------- Etiqueta BALDE ---------- */
.etiqueta-balde {
    display: flex;
    align-items: stretch;
    gap: 2.5mm;
    padding: 2.5mm;
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
    width: 20mm;
    height: 20mm;
}

/* ---------- Etiqueta VENTA ---------- */
/*
 * El QR manda: se escanea al vender, a veces con la mano ocupada, así que
 * va centrado y grande. El nombre debajo confirma que el vendedor escaneó lo
 * correcto; el código chico es el respaldo para tipear si el lector falla.
 * B/N hardcodeado para impresión térmica.
 */
.etiqueta-venta {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2mm;
    padding: 3mm 2.5mm;
    position: relative;
    border-color: #93c5fd;
    background: #fff;
}

.venta-tag {
    position: absolute;
    top: 1.5mm;
    right: 1.5mm;
    font-size: 1.9mm;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #1d4ed8;
    background: #dbeafe;
    padding: 0.5mm 1.5mm;
    border-radius: 1mm;
}

.venta-qr {
    display: grid;
    place-items: center;
}

.qr-grande {
    width: 30mm;
    height: 30mm;
    display: block;
}

.qr-vacio-grande {
    width: 30mm;
    height: 30mm;
    font-size: 3mm;
}

.venta-pie {
    text-align: center;
    max-width: 100%;
    min-width: 0;
}

.venta-producto {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5mm;
    min-width: 0;
}

.venta-producto .emoji {
    font-size: 4mm;
    flex-shrink: 0;
}

.venta-producto b {
    font-size: 3.4mm;
    line-height: 1.15;
    color: #000;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.venta-codigo {
    margin-top: 1mm;
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    font-size: 3mm;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #334155;
}

/* ---------- Ajustes por formato (balde) ---------- */
.formato-chica .et-datos {
    display: none;
}

.formato-chica .qr,
.formato-chica .qr-vacio {
    width: 16mm;
    height: 16mm;
}

.formato-chica .et-codigo {
    font-size: 3.4mm;
}

.formato-grande .qr,
.formato-grande .qr-vacio {
    width: 26mm;
    height: 26mm;
}

.formato-grande .et-codigo {
    font-size: 5mm;
}

/* ---------- QR de venta según ancho ---------- */
.formato-chica .qr-grande,
.formato-chica .qr-vacio-grande {
    width: 24mm;
    height: 24mm;
}

.formato-grande .qr-grande,
.formato-grande .qr-vacio-grande {
    width: 38mm;
    height: 38mm;
}

.formato-grande .venta-producto b {
    font-size: 4mm;
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

    .btn-imprimir {
        width: 100%;
    }

    .formato-chica,
    .formato-media,
    .formato-grande {
        grid-template-columns: repeat(2, 1fr);
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

/* ═══════════ Impresión: solo la hoja ═══════════ */
@media print {
    .controles,
    .mesa {
        /* la mesa mantiene la hoja; ocultamos su decorado */
    }

    .controles {
        display: none !important;
    }

    .mesa {
        margin: 0;
        padding: 0;
        background: none !important;
        border: none !important;
        border-radius: 0;
    }

    .hoja {
        box-shadow: none !important;
        padding: 0;
        border-radius: 0;
    }

    .etiqueta {
        break-inside: avoid;
        page-break-inside: avoid;
    }
}

@page {
    margin: 0;
}
</style>
