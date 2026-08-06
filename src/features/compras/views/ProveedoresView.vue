<template>
    <MainLayout>

        <div class="cabecera al-entrar">
            <div>
                <h2>Proveedores</h2>
                <p class="pista">
                    A quién le compras la flor. Lo que ves acá es con lo que se negocia:
                    cuánto le has comprado y cuándo fue el último pedido.
                </p>
            </div>
            <button v-if="puedeEditar" class="btn" @click="abrirNuevo">＋ Nuevo proveedor</button>
        </div>

        <div v-if="error" class="banda banda-error">
            <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
            <button class="btn btn-mini" @click="recargar">Reintentar</button>
        </div>

        <!-- ---------- Filtros ---------- -->
        <div class="barra-filtros al-entrar" style="--i: 2">
            <div class="buscador">
                <span aria-hidden="true">🔎</span>
                <input v-model="busqueda" placeholder="Nombre, RUT o contacto…" aria-label="Buscar proveedor">
                <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
            </div>

            <label class="check">
                <input type="checkbox" :checked="filtro.activo === null"
                    @change="filtrar({ activo: $event.target.checked ? null : true })">
                <span>Ver desactivados</span>
            </label>

            <span class="conteo mini suave">{{ proveedores.length }} proveedor(es)</span>
        </div>

        <!-- ---------- Listado ---------- -->
        <div v-if="cargando && !proveedores.length" class="vacio">Cargando proveedores…</div>

        <div v-else-if="!proveedores.length" class="vacio">
            <strong>{{ busqueda ? 'Ninguno coincide' : 'Sin proveedores' }}</strong>
            {{ busqueda
                ? 'Prueba con otro texto.'
                : 'Agrega el primero para poder registrar compras.' }}
        </div>

        <div v-else class="tarjetas">
            <article v-for="(p, ix) in proveedores" :key="p.id" class="tarjeta al-entrar"
                :style="{ '--i': Math.min(ix, 12) }" :class="{ inactivo: !p.activo, resaltada: p.id === resalte.id }">

                <header class="tarjeta-cab">
                    <div class="min0">
                        <h3>
                            {{ p.nombre }}
                            <span v-if="!p.activo" class="etiqueta et-gris">desactivado</span>
                        </h3>
                        <div v-if="p.rut" class="rut dato">{{ p.rut }}</div>
                    </div>
                </header>

                <dl class="ficha">
                    <div v-if="p.contacto">
                        <dt>Contacto</dt>
                        <dd>{{ p.contacto }}</dd>
                    </div>
                    <div v-if="p.telefono">
                        <dt>Teléfono</dt>
                        <dd>{{ p.telefono }}</dd>
                    </div>
                    <div v-if="p.correo">
                        <dt>Correo</dt>
                        <dd class="corta">{{ p.correo }}</dd>
                    </div>
                    <div v-if="p.direccion">
                        <dt>Dirección</dt>
                        <dd>{{ p.direccion }}</dd>
                    </div>
                </dl>

                <p v-if="p.notas" class="notas">“{{ p.notas }}”</p>

                <!--
          El historial es lo que hace útil esta pantalla: sin él es una
          agenda de teléfonos. Con él, se sabe a quién se le compra en serio
          antes de pedir un precio.
        -->
                <div class="historial">
                    <div>
                        <span>Compras</span>
                        <b class="dato">{{ p.compras }}</b>
                    </div>
                    <div>
                        <span>Total comprado</span>
                        <b class="dato">{{ clp(p.totalComprado) }}</b>
                    </div>
                    <div>
                        <span>Último pedido</span>
                        <b class="dato" :class="{ frio: diasSin(p) > 90 }">
                            {{ p.ultimaCompra ? fecha(p.ultimaCompra) : 'Nunca' }}
                        </b>
                    </div>
                </div>

                <p v-if="diasSin(p) > 90" class="aviso-frio mini">
                    Sin comprarle hace {{ diasSin(p) }} días.
                </p>

                <div v-if="puedeEditar" class="acciones">
                    <button class="btn btn-linea btn-mini" @click="abrirEdicion(p)">✏️ Editar</button>
                    <button v-if="p.activo" class="btn btn-linea btn-mini" @click="cambiarEstado(p, false)">
                        Desactivar
                    </button>
                    <button v-else class="btn btn-mini" @click="cambiarEstado(p, true)">Reactivar</button>
                </div>
            </article>
        </div>

        <!-- ================= MODAL ================= -->
        <div v-if="modal" class="fondo" @click.self="cerrarModal">
            <div class="modal">
                <div class="modal-cab">
                    <h3>{{ modal.f.id ? 'Editar proveedor' : 'Nuevo proveedor' }}</h3>
                    <p>Solo el nombre es obligatorio; el resto ayuda al hacer el pedido.</p>
                </div>

                <div class="modal-cuerpo">
                    <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

                    <div class="rejilla grupo">
                        <div>
                            <label for="p-nombre">Nombre</label>
                            <input id="p-nombre" class="campo" v-model="modal.f.nombre" maxlength="160"
                                placeholder="Flores del Maipo">
                        </div>
                        <div>
                            <label for="p-rut">RUT</label>
                            <input id="p-rut" class="campo dato" v-model="modal.f.rut" maxlength="20"
                                :class="{ 'campo-malo': rutMalo }" placeholder="76.543.210-K" @blur="normalizarRut">
                            <p v-if="rutMalo" class="ayuda mala">
                                El dígito verificador no calza{{ dvSugerido ? `: debería ser ${dvSugerido}` : '' }}.
                            </p>
                        </div>
                    </div>

                    <div class="rejilla grupo">
                        <div>
                            <label for="p-contacto">Persona de contacto</label>
                            <input id="p-contacto" class="campo" v-model="modal.f.contacto" maxlength="120"
                                placeholder="Don Manuel">
                        </div>
                        <div>
                            <label for="p-tel">Teléfono</label>
                            <input id="p-tel" class="campo dato" v-model="modal.f.telefono" maxlength="40"
                                placeholder="+56 9 1234 5678">
                        </div>
                    </div>

                    <div class="grupo">
                        <label for="p-correo">Correo</label>
                        <input id="p-correo" class="campo" type="email" v-model="modal.f.correo" maxlength="160">
                    </div>

                    <div class="grupo">
                        <label for="p-dir">Dirección</label>
                        <input id="p-dir" class="campo" v-model="modal.f.direccion" maxlength="240"
                            placeholder="Puesto 42, Terminal de Flores">
                    </div>

                    <div class="grupo">
                        <label for="p-notas">Notas</label>
                        <textarea id="p-notas" class="campo" v-model="modal.f.notas" maxlength="600"
                            placeholder="Llega los martes y viernes. Las peonías las trae solo en temporada."></textarea>
                        <p class="ayuda">
                            Días de entrega, qué especies maneja, cómo prefiere que le pidan.
                            Es lo que hace falta recordar al momento de comprar.
                        </p>
                    </div>
                </div>

                <div class="modal-pie">
                    <button class="btn btn-linea" @click="cerrarModal">Cancelar</button>
                    <button class="btn" :disabled="guardando" @click="guardar">
                        <span v-if="guardando" class="spinner" aria-hidden="true"></span>
                        {{ guardando ? 'Guardando…' : 'Guardar' }}
                    </button>
                </div>
            </div>
        </div>

        <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
    </MainLayout>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import MainLayout from '@/layouts/MainLayout.vue'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'
import { rutValido, formatearRut, limpiarRut, digitoVerificador } from '@/core/utils/rut'

export default {
    name: 'ProveedoresView',
    components: { MainLayout },

    setup() {
        const store = useStore()
        const { usarResalte, usarAviso } = useTemporizadores()

        const puedeEditar = computed(() => store.getters['auth/tieneRol']('admin', 'bodega'))

        /* ---------------- Datos ---------------- */
        const proveedores = computed(() => store.getters['proveedores/proveedores'])
        const filtro = computed(() => store.getters['proveedores/filtro'])
        const cargando = computed(() => store.getters['proveedores/cargando'])
        const guardando = computed(() => store.getters['proveedores/guardando'])
        const error = computed(() => store.getters['proveedores/error'])

        let control = null

        onMounted(() => {
            control = new AbortController()
            /* Forzar: el módulo cachea para el select de compras, pero acá la
               lista es el contenido de la pantalla y tiene que venir fresca. */
            store.dispatch('proveedores/cargar', { signal: control.signal, forzar: true })
        })

        onUnmounted(() => control?.abort())

        const recargar = () => store.dispatch('proveedores/cargar', { forzar: true })
        const filtrar = (cambios) => store.dispatch('proveedores/filtrar', cambios)

        const busqueda = ref(filtro.value.buscar || '')
        let tmr = null
        watch(busqueda, (v) => {
            clearTimeout(tmr)
            tmr = setTimeout(() => filtrar({ buscar: v.trim() }), 350)
        })
        onUnmounted(() => clearTimeout(tmr))

        /* ---------------- Modal ---------------- */
        const modal = ref(null)
        const resalte = usarResalte()
        const { aviso, avisar } = usarAviso()

        const cerrarModal = () => { modal.value = null }

        const fichaVacia = () => ({
            id: null, nombre: '', rut: '', contacto: '', telefono: '',
            correo: '', direccion: '', notas: '', error: ''
        })

        const abrirNuevo = () => { modal.value = { f: fichaVacia() } }

        const abrirEdicion = (p) => {
            modal.value = {
                f: {
                    ...fichaVacia(),
                    id: p.id,
                    nombre: p.nombre || '',
                    rut: p.rut || '',
                    contacto: p.contacto || '',
                    telefono: p.telefono || '',
                    correo: p.correo || '',
                    direccion: p.direccion || '',
                    notas: p.notas || ''
                }
            }
        }

        /* ---------------- RUT ----------------
         * Opcional acá, a diferencia del cliente: a un puesto del terminal a
         * veces se le compra sin factura. Pero si se escribe, tiene que estar
         * bien: un RUT malo en una factura es un problema tributario. */
        const rutMalo = computed(() =>
            !!modal.value?.f?.rut && !rutValido(modal.value.f.rut)
        )

        const dvSugerido = computed(() => {
            const limpio = limpiarRut(modal.value?.f?.rut || '')
            const cuerpo = limpio.slice(0, -1)
            return cuerpo.length >= 7 && /^\d+$/.test(cuerpo) ? digitoVerificador(cuerpo) : ''
        })

        const normalizarRut = () => {
            const f = modal.value.f
            if (f.rut && rutValido(f.rut)) f.rut = formatearRut(f.rut)
        }

        /* ---------------- Guardar ---------------- */
        const guardar = async () => {
            const f = modal.value.f
            f.error = ''

            const nombre = (f.nombre || '').trim()
            if (nombre.length < 2) return (f.error = 'El nombre debe tener al menos 2 caracteres.')
            if (rutMalo.value) return (f.error = 'El RUT no es válido.')

            const datos = {
                nombre,
                rut: (f.rut || '').trim() || null,
                contacto: (f.contacto || '').trim() || null,
                telefono: (f.telefono || '').trim() || null,
                correo: (f.correo || '').trim() || null,
                direccion: (f.direccion || '').trim() || null,
                notas: (f.notas || '').trim() || null
            }

            try {
                const guardado = f.id
                    ? await store.dispatch('proveedores/actualizar', { id: f.id, ...datos })
                    : await store.dispatch('proveedores/crear', datos)
                cerrarModal()
                avisar(`${guardado.nombre} guardado`)
                resalte.marcar(guardado.id)
            } catch (e) {
                f.error = e.message
            }
        }

        const cambiarEstado = async (p, activo) => {
            try {
                await store.dispatch('proveedores/cambiarEstado', { id: p.id, activo })
                avisar(`${p.nombre} ${activo ? 'reactivado' : 'desactivado'}`)
                resalte.marcar(p.id)
            } catch (e) {
                avisar(e.message, true)
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

        const diasSin = (p) => {
            if (!p.ultimaCompra) return 0
            const ms = Date.now() - new Date(p.ultimaCompra).getTime()
            return Math.floor(ms / 86400000)
        }

        return {
            Math,
            puedeEditar, proveedores, filtro, cargando, guardando, error,
            recargar, filtrar, busqueda,
            modal, cerrarModal, abrirNuevo, abrirEdicion, guardar, cambiarEstado,
            rutMalo, dvSugerido, normalizarRut,
            resalte, aviso, clp, fecha, diasSin
        }
    }
}
</script>

<style scoped>
.cabecera,
.cabecera *,
.tarjetas *,
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
    animation-delay: calc(var(--i, 0) * 45ms);
}

@keyframes resalta {
    0% {
        border-color: #059669;
        box-shadow: 0 0 0 3px #d1fae5;
    }

    100% {
        border-color: #e2e8f0;
        box-shadow: none;
    }
}

.tarjeta.resaltada {
    animation: resalta 1400ms ease-out;
}

.spinner {
    display: inline-block;
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: girar 0.8s linear infinite;
}

@keyframes girar {
    to {
        transform: rotate(360deg);
    }
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
    max-width: 62ch;
    line-height: 1.5;
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
    flex: 1 1 240px;
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

.conteo {
    margin-left: auto;
    white-space: nowrap;
}

/* ---------- Tarjetas ---------- */
.tarjetas {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 14px;
}

.tarjeta {
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
    transition: border-color 0.18s, box-shadow 0.18s;
}

.tarjeta:hover {
    border-color: #cbd5e1;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.tarjeta.inactivo {
    opacity: 0.55;
}

.tarjeta-cab {
    margin-bottom: 11px;
}

.tarjeta h3 {
    margin: 0;
    font-size: 1rem;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
}

.rut {
    font-size: 0.75rem;
    color: #94a3b8;
    margin-top: 2px;
}

.min0 {
    min-width: 0;
}

.ficha {
    margin: 0;
    font-size: 0.82rem;
}

.ficha>div {
    display: flex;
    gap: 10px;
    padding: 2px 0;
}

.ficha dt {
    min-width: 78px;
    color: #94a3b8;
    flex-shrink: 0;
}

.ficha dd {
    margin: 0;
    color: #334155;
    min-width: 0;
    overflow-wrap: break-word;
}

.corta {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.notas {
    margin: 11px 0 0;
    padding: 9px 11px;
    background: #f8fafc;
    border-left: 3px solid #6ee7b7;
    border-radius: 0 7px 7px 0;
    font-size: 0.8rem;
    color: #475569;
    font-style: italic;
    line-height: 1.5;
}

.historial {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: auto;
    padding-top: 12px;
    margin-bottom: 0;
}

.historial>div {
    display: flex;
    flex-direction: column;
    gap: 1px;
}

.historial span {
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #94a3b8;
}

.historial b {
    font-size: 0.9rem;
    color: #0f172a;
}

.historial b.frio {
    color: #d97706;
}

.aviso-frio {
    margin: 8px 0 0;
    color: #d97706;
}

.dato {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
}

.mini {
    font-size: 0.76rem;
}

.suave {
    color: #64748b;
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

.et-gris {
    background: #f1f5f9;
    color: #64748b;
}

.acciones {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 13px;
    padding-top: 12px;
    border-top: 1px solid #f1f5f9;
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
    max-width: 540px;
    max-height: 90vh;
    max-height: 90dvh;
    display: flex;
    flex-direction: column;
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
    overflow-y: auto;
}

.modal-pie {
    display: flex;
    gap: 9px;
    justify-content: flex-end;
    flex-wrap: wrap;
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

.campo-malo {
    border-color: #dc2626;
}

.campo-malo:focus {
    border-color: transparent;
    box-shadow: 0 0 0 2px #dc2626;
}

textarea.campo {
    min-height: 74px;
    resize: vertical;
}

.grupo {
    margin-bottom: 15px;
}

.rejilla {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 13px;
}

.ayuda {
    margin: 5px 0 0;
    font-size: 0.75rem;
    color: #94a3b8;
    line-height: 1.5;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 400;
}

.ayuda.mala {
    color: #dc2626;
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

@media (max-width: 640px) {
    .conteo {
        margin-left: 0;
    }

    .tarjetas {
        grid-template-columns: 1fr;
    }
}

@media (prefers-reduced-motion: reduce) {

    .btn,
    .btn-icono,
    .campo,
    .buscador,
    .tarjeta {
        transition: none;
    }

    .al-entrar,
    .tarjeta.resaltada,
    .spinner {
        animation: none;
    }
}
</style>