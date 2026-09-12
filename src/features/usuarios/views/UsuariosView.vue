<template>

    <div class="cabecera al-entrar">
        <div class="titulo">
            <h2>Equipo y accesos</h2>
            <p class="pista">Quién entra al sistema y qué puede tocar.</p>
        </div>
        <button class="btn btn-crear" @click="abrirNuevo">
            <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
            </svg>
            Crear cuenta
        </button>
    </div>

    <!-- ================= ESQUELETO ================= -->
    <div v-if="esqueleto.visible" aria-hidden="true">
        <div class="roles">
            <article v-for="n in 3" :key="'r' + n" class="rol-tarjeta esq-rol">
                <EsqueletoBloque alto="14px" ancho="54%" />
                <EsqueletoBloque alto="10px" ancho="88%" class="sep-9" />
                <EsqueletoBloque alto="22px" ancho="66%" radio="999px" class="sep-9" />
            </article>
        </div>

        <div class="esq-barra">
            <EsqueletoBloque alto="46px" ancho="100%" radio="10px" />
        </div>

        <div v-for="n in 4" :key="'f' + n" class="esq-fila">
            <EsqueletoBloque alto="44px" ancho="44px" radio="999px" />
            <div class="esq-col">
                <EsqueletoBloque alto="14px" ancho="150px" />
                <EsqueletoBloque alto="10px" ancho="92px" class="sep-6" />
            </div>
            <EsqueletoBloque alto="22px" ancho="82px" radio="999px" />
        </div>
    </div>

    <template v-else>

        <!-- ---------- Roles ----------
             En móvil es un carrusel con scroll-snap: tres tarjetas apiladas
             empujaban la lista de cuentas fuera de la primera pantalla. -->
        <section class="roles" aria-label="Roles del sistema">
            <article v-for="(r, i) in ROLES" :key="r.valor" class="rol-tarjeta al-entrar"
                :style="{ ...tono(r.valor), '--i': i + 1 }">
                <header>
                    <h3>{{ r.texto }}</h3>
                    <span class="contador" :class="{ destella: dRol[r.valor]?.activo }">
                        {{ conteos[r.valor] }}
                    </span>
                </header>
                <p>{{ r.descripcion }}</p>
                <ul class="modulos">
                    <li v-for="m in modulosCorto(r.valor)" :key="m">{{ m }}</li>
                    <li v-if="modulosResto(r.valor)" class="mas">+{{ modulosResto(r.valor) }}</li>
                </ul>
            </article>
        </section>

        <!-- ---------- Panel de cuentas ---------- -->
        <div class="panel al-entrar" style="--i: 4">

            <div class="barra">
                <div class="buscador">
                    <svg class="ico lupa" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M20 20l-3.5-3.5" />
                    </svg>
                    <input class="campo" v-model="busqueda" type="search"
                        placeholder="Buscar por nombre o correo…" aria-label="Buscar cuentas">
                </div>

                <div class="filtros">
                    <select class="campo" :value="filtro.rol" @change="filtrarPor('rol', $event.target.value)"
                        aria-label="Filtrar por rol">
                        <option value="">Todos los roles</option>
                        <option v-for="r in ROLES" :key="r.valor" :value="r.valor">{{ r.texto }}</option>
                    </select>

                    <select class="campo" :value="estadoSel"
                        @change="filtrarPor('activo', $event.target.value)" aria-label="Filtrar por estado">
                        <option value="">Todos los estados</option>
                        <option value="true">Solo activas</option>
                        <option value="false">Solo bloqueadas</option>
                    </select>
                </div>

                <!-- <span class="conteo mini suave">{{ visibles.length }} de {{ total }}</span> -->
            </div>

            <Transition name="cambio" mode="out-in">
                <div v-if="errorCarga" key="error" class="error error-panel">
                    {{ errorCarga }}
                    <button class="btn btn-linea btn-mini reintentar" @click="cargar">Reintentar</button>
                </div>

                <div v-else-if="visibles.length === 0" key="vacio" class="vacio">
                    {{ busqueda ? 'Ninguna cuenta coincide con la búsqueda.' : 'Todavía no hay cuentas.' }}
                </div>

                <!-- ═══ Escritorio: tabla real ═══ -->
                <!-- La tabla ya no se desarma en tarjetas con CSS. Pasar de
                     `table` a `block` y volver obliga al navegador a rearmar
                     cajas anónimas, y en ese viaje thead y tbody pueden quedar
                     en tablas distintas. Bajo el breakpoint se monta otro
                     marcado, no la misma tabla disfrazada. -->
                <div v-else-if="!esMovil" key="tabla" class="tabla-envoltura" :class="{ atenuada: cargando }">
                    <table>
                        <!-- El reparto de columnas se declara acá y no se deja
                             al algoritmo de tabla: con `auto` toda la holgura
                             cae en la primera columna y abre un hueco enorme
                             entre el correo y el resto de la fila. -->
                        <colgroup>
                            <col class="c-cuenta">
                            <col class="c-rol">
                            <col class="c-estado">
                            <col class="c-acceso">
                            <col class="c-boletas">
                            <col class="c-vendido">
                            <col class="c-acciones">
                        </colgroup>
                        <thead>
                            <tr>
                                <th>Cuenta</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th>Último acceso</th>
                                <th>Boletas</th>
                                <th>Vendido</th>
                                <th class="acciones-col">Acciones</th>
                            </tr>
                        </thead>
                        <tbody :class="{ escalonada: escalonar }">
                            <tr v-for="(u, idx) in visibles" :key="u.id" class="fila"
                                :style="{ ...tono(u.role), '--i': Math.min(idx, 12) }"
                                :class="{ inactiva: !u.activo, resaltada: u.id === resalte.id }">
                                <td class="celda-cuenta">
                                    <div class="persona">
                                        <span class="avatar" aria-hidden="true">{{ iniciales(u.name) }}</span>
                                        <span class="identidad">
                                            <b>{{ u.name }}<span v-if="u.id === yoId"
                                                    class="etiqueta marca">tú</span></b>
                                            <span class="correo">{{ u.email }}</span>
                                        </span>
                                    </div>
                                </td>

                                <td>
                                    <span class="rol-envoltura" :class="{ fijo: u.id === yoId }">
                                        <select class="select-rol" :value="u.role"
                                            :disabled="u.id === yoId || ocupado === u.id"
                                            @change="pedirCambioRol(u, $event)">
                                            <option v-for="r in ROLES" :key="r.valor" :value="r.valor">
                                                {{ r.texto }}
                                            </option>
                                        </select>
                                    </span>
                                </td>

                                <td>
                                    <Transition name="cambio" mode="out-in">
                                        <span :key="u.activo" class="estado"
                                            :class="u.activo ? 'es-activa' : 'es-bloqueada'">
                                            <svg v-if="u.activo" class="ico" viewBox="0 0 24 24" aria-hidden="true">
                                                <circle cx="12" cy="12" r="9" />
                                                <path d="M8.4 12.4l2.4 2.4 4.8-5.2" />
                                            </svg>
                                            <svg v-else class="ico" viewBox="0 0 24 24" aria-hidden="true">
                                                <rect x="5" y="11" width="14" height="9" rx="2" />
                                                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                                            </svg>
                                            {{ u.activo ? 'Activa' : 'Bloqueada' }}
                                        </span>
                                    </Transition>
                                </td>

                                <td class="col-acceso">{{ fecha(u.ultimoAcceso) }}</td>
                                <td class="dato">{{ u.boletas }}</td>
                                <td class="dato">{{ clp(u.vendido) }}</td>

                                <td class="acciones-col">
                                    <div class="acciones">
                                        <button class="btn-icono" title="Editar datos" aria-label="Editar datos"
                                            @click="abrirEdicion(u)">
                                            <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
                                                <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z" />
                                            </svg>
                                        </button>
                                        <button class="btn-icono" title="Restablecer contraseña"
                                            aria-label="Restablecer contraseña" @click="abrirClave(u)">
                                            <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
                                                <circle cx="8" cy="12" r="4" />
                                                <path d="M12 12h9M18 12v3" />
                                            </svg>
                                        </button>
                                        <button v-if="u.id !== yoId" class="btn-icono btn-bloqueo"
                                            :class="{ reactivar: !u.activo, ocupado: ocupado === u.id }"
                                            :disabled="ocupado === u.id"
                                            :title="u.activo ? 'Bloquear cuenta' : 'Reactivar cuenta'"
                                            :aria-label="u.activo ? 'Bloquear cuenta' : 'Reactivar cuenta'"
                                            @click="alternarEstado(u)">
                                            <svg v-if="u.activo" class="ico" viewBox="0 0 24 24" aria-hidden="true">
                                                <rect x="5" y="11" width="14" height="9" rx="2" />
                                                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                                            </svg>
                                            <svg v-else class="ico" viewBox="0 0 24 24" aria-hidden="true">
                                                <rect x="5" y="11" width="14" height="9" rx="2" />
                                                <path d="M8 11V8a4 4 0 0 1 7.7-1.4" />
                                            </svg>
                                        </button>
                                        <span v-else class="propia" aria-hidden="true"></span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- ═══ Móvil: acordeón ═══ -->
                <div v-else key="lista" class="lista" :class="{ atenuada: cargando }">
                    <article v-for="u in visibles" :key="u.id" class="cuenta" :style="tono(u.role)"
                        :class="{ inactiva: !u.activo, resaltada: u.id === resalte.id, abierta: abiertaId === u.id }">

                        <!-- Cabecera mínima: quién es y qué puede tocar -->
                        <button class="cab" :aria-expanded="abiertaId === u.id" @click="alternar(u.id)">
                            <span class="chevron" aria-hidden="true">›</span>
                            <span class="avatar" aria-hidden="true">{{ iniciales(u.name) }}</span>
                            <span class="cab-nombre">
                                {{ u.name }}
                                <span v-if="u.id === yoId" class="etiqueta marca">tú</span>
                            </span>
                            <span class="rol-chip">{{ textoRol(u.role) }}</span>
                        </button>

                        <div v-if="abiertaId === u.id" class="cuerpo">
                            <p class="correo-movil">{{ u.email }}</p>

                            <div class="fila-dato">
                                <span>Estado</span>
                                <span class="estado" :class="u.activo ? 'es-activa' : 'es-bloqueada'">
                                    {{ u.activo ? 'Activa' : 'Bloqueada' }}
                                </span>
                            </div>
                            <div class="fila-dato">
                                <span>Último acceso</span>
                                <b>{{ fecha(u.ultimoAcceso) || '—' }}</b>
                            </div>
                            <div class="fila-dato">
                                <span>Boletas</span>
                                <b class="dato">{{ u.boletas }}</b>
                            </div>
                            <div class="fila-dato">
                                <span>Vendido</span>
                                <b class="dato">{{ clp(u.vendido) }}</b>
                            </div>

                            <div v-if="u.id !== yoId" class="grupo-rol">
                                <label :for="`rol-${u.id}`">Rol</label>
                                <span class="rol-envoltura">
                                    <select :id="`rol-${u.id}`" class="select-rol" :value="u.role"
                                        :disabled="ocupado === u.id" @change="pedirCambioRol(u, $event)">
                                        <option v-for="r in ROLES" :key="r.valor" :value="r.valor">
                                            {{ r.texto }}
                                        </option>
                                    </select>
                                </span>
                            </div>

                            <div class="acciones">
                                <button class="btn-icono" @click="abrirEdicion(u)">
                                    <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z" />
                                    </svg>
                                    Editar
                                </button>
                                <button class="btn-icono" @click="abrirClave(u)">
                                    <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
                                        <circle cx="8" cy="12" r="4" />
                                        <path d="M12 12h9M18 12v3" />
                                    </svg>
                                    Clave
                                </button>
                                <button v-if="u.id !== yoId" class="btn-icono btn-bloqueo"
                                    :class="{ reactivar: !u.activo, ocupado: ocupado === u.id }"
                                    :disabled="ocupado === u.id" @click="alternarEstado(u)">
                                    {{ u.activo ? 'Bloquear' : 'Reactivar' }} cuenta
                                </button>
                                <span v-else class="propia">Es tu cuenta</span>
                            </div>
                        </div>
                    </article>
                </div>
            </Transition>
        </div>
    </template>

    <!-- ================= MODALES ================= -->
    <Transition name="modal">
        <div v-if="modal" class="fondo" @click.self="intentarCerrar">
            <Transition name="cambio" mode="out-in">

                <!-- Crear / editar -->
                <div v-if="modal.tipo === 'cuenta'" key="cuenta" class="modal" role="dialog" aria-modal="true"
                    aria-labelledby="titulo-cuenta">
                    <div class="modal-cab">
                        <span class="agarre" aria-hidden="true"></span>
                        <h3 id="titulo-cuenta">{{ modal.f.id ? 'Editar cuenta' : 'Crear cuenta' }}</h3>
                        <p>El correo es el usuario con el que se inicia sesión.</p>
                    </div>
                    <div class="modal-cuerpo">
                        <Transition name="desliza">
                            <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>
                        </Transition>

                        <div class="grupo">
                            <label for="f-nombre">Nombre</label>
                            <input id="f-nombre" ref="campoNombre" class="campo" v-model="modal.f.name"
                                placeholder="Camila Rojas" maxlength="120" autocomplete="name">
                        </div>

                        <div class="grupo">
                            <label for="f-email">Correo</label>
                            <input id="f-email" class="campo" type="email" v-model="modal.f.email"
                                placeholder="camila@colibri.cl" autocomplete="email" autocapitalize="off"
                                autocorrect="off" inputmode="email">
                        </div>

                        <div v-if="!modal.f.id" class="grupo">
                            <label for="f-pass">Contraseña</label>
                            <input id="f-pass" class="campo" type="password" v-model="modal.f.password"
                                :placeholder="`Mínimo ${MINIMO} caracteres`" autocomplete="new-password">
                        </div>

                        <div class="grupo">
                            <label>Rol</label>
                            <div class="opciones-rol">
                                <button v-for="r in ROLES" :key="r.valor" type="button" class="opcion-rol"
                                    :style="tono(r.valor)" :class="{ on: modal.f.role === r.valor }"
                                    @click="modal.f.role = r.valor">
                                    <b>{{ r.texto }}</b>
                                    <span>{{ r.descripcion }}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-pie">
                        <button class="btn btn-linea" @click="intentarCerrar">Cancelar</button>
                        <button class="btn" :class="{ 'btn-ocupado': guardando }" :disabled="guardando"
                            @click="guardar">
                            <span v-if="guardando" class="spinner" aria-hidden="true"></span>
                            {{ guardando ? 'Guardando…' : 'Guardar' }}
                        </button>
                    </div>
                </div>

                <!-- Contraseña -->
                <div v-else-if="modal.tipo === 'clave'" key="clave" class="modal" role="dialog" aria-modal="true"
                    aria-labelledby="titulo-clave">
                    <div class="modal-cab">
                        <span class="agarre" aria-hidden="true"></span>
                        <h3 id="titulo-clave">Contraseña de {{ modal.f.name }}</h3>
                        <p>Se aplica de inmediato en el próximo inicio de sesión.</p>
                    </div>
                    <div class="modal-cuerpo">
                        <Transition name="desliza">
                            <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>
                        </Transition>
                        <label for="f-clave">Nueva contraseña</label>
                        <input id="f-clave" ref="campoClave" class="campo" type="password"
                            v-model="modal.f.password" :placeholder="`Mínimo ${MINIMO} caracteres`"
                            autocomplete="new-password" @keyup.enter="guardarClave">
                        <div class="nota">
                            Restablecer no pide la contraseña anterior. Avisale a la persona
                            por un canal aparte y pedile que la cambie desde su perfil.
                        </div>
                    </div>
                    <div class="modal-pie">
                        <button class="btn btn-linea" @click="intentarCerrar">Cancelar</button>
                        <button class="btn" :class="{ 'btn-ocupado': guardando }" :disabled="guardando"
                            @click="guardarClave">
                            <span v-if="guardando" class="spinner" aria-hidden="true"></span>
                            {{ guardando ? 'Guardando…' : 'Guardar' }}
                        </button>
                    </div>
                </div>

            </Transition>
        </div>
    </Transition>

    <!-- Conceder administración ================================
         Anular una boleta pide motivo y revertir una merma también.
         Dar permisos totales no pedía nada: un toque en un select. -->
    <Transition name="modal">
        <div v-if="confirmRol" class="fondo z-alto" @click.self="cancelarCambioRol">
            <div class="modal angosto" role="dialog" aria-modal="true" aria-labelledby="titulo-rol">
                <div class="modal-cab">
                    <span class="agarre" aria-hidden="true"></span>
                    <h3 id="titulo-rol">¿{{ confirmRol.nombre }} como administrador?</h3>
                    <p>Pasa de {{ textoRol(confirmRol.previo) }} a {{ textoRol(confirmRol.nuevo) }}.</p>
                </div>
                <div class="modal-cuerpo">
                    <div class="nota alerta">
                        Un administrador ve los costos y los márgenes, anula boletas,
                        revierte mermas y puede crear o bloquear cuentas — incluida la tuya.
                    </div>
                </div>
                <div class="modal-pie">
                    <button class="btn btn-linea" @click="cancelarCambioRol">Cancelar</button>
                    <button class="btn" @click="confirmarCambioRol">Conceder</button>
                </div>
            </div>
        </div>
    </Transition>

    <!-- Descartar formulario -->
    <Transition name="modal">
        <div v-if="confirmarDescarte" class="fondo z-alto" @click.self="confirmarDescarte = false">
            <div class="modal angosto" role="dialog" aria-modal="true">
                <div class="modal-cab">
                    <span class="agarre" aria-hidden="true"></span>
                    <h3>¿Descartar los cambios?</h3>
                    <p>Lo que escribiste se va a perder.</p>
                </div>
                <div class="modal-pie">
                    <button class="btn btn-linea" @click="confirmarDescarte = false">Seguir editando</button>
                    <button class="btn peligro" @click="descartar">Descartar</button>
                </div>
            </div>
        </div>
    </Transition>

    <Transition name="aviso">
        <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
    </Transition>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useStore } from 'vuex'
import { ROLES, textoRol } from '@/core/constantes/roles'
import { modulosPorRol } from '@/config/menuColibri'
import { LARGO_MINIMO_PASSWORD } from '@/features/usuarios/store/usuarios.module'
import EsqueletoBloque from '@/shared/components/EsqueletoBloque.vue'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'

/*
 * Un hex por rol y nada más. El fondo y el texto se derivan con color-mix
 * contra los tokens del tema, así los mismos tres colores funcionan en claro
 * y en oscuro: antes el fondo era un #EEEDFE fijo que solo servía sobre
 * blanco. El lugar natural de esto sigue siendo @/core/constantes/roles,
 * junto a `valor`, `texto` y `descripcion`.
 */
const LINEA_ADMIN = '#6C62D6'
const LINEAS = {
    admin: LINEA_ADMIN,
    administrador: LINEA_ADMIN,
    administradora: LINEA_ADMIN,
    vendedor: '#2C7BC4',
    bodega: '#C4841C'
}
const LINEA_NEUTRA = '#8B94A3'

/* Los roles que dan permisos totales, para pedir confirmación al concederlos */
const ROLES_ADMIN = new Set(['admin', 'administrador', 'administradora'])

const MODULOS_VISIBLES = 3

/* El mismo valor que el @media de abajo. Si se cambia uno hay que cambiar el
   otro: no hay forma de leer un breakpoint de CSS desde JS. */
const MOVIL = '(max-width: 959.98px)'

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default {
    name: 'UsuariosView',
    components: { EsqueletoBloque },

    setup () {
        const store = useStore()
        const { espera, usarDestello, usarResalte, usarAviso, usarEsqueleto } = useTemporizadores()

        /* ---------------- Datos ---------------- */
        const visibles = computed(() => store.getters['usuarios/usuariosVisibles'])
        const todos = computed(() => store.getters['usuarios/usuarios'])
        const total = computed(() => store.getters['usuarios/total'])
        const cargando = computed(() => store.getters['usuarios/cargando'])
        const errorCarga = computed(() => store.getters['usuarios/error'])
        const filtro = computed(() => store.getters['usuarios/filtro'])
        const yoId = computed(() => store.getters['auth/currentUser']?.id)

        /*
         * Boletas y vendido vienen en UsuarioDto. Antes se calculaban
         * cruzando el store de ventas por email, lo que además ataba esta
         * pantalla a que ventas estuviera cargado.
         */
        const conteos = computed(() => {
            const mapa = {}
            for (const r of ROLES) mapa[r.valor] = todos.value.filter(u => u.role === r.valor).length
            return mapa
        })

        /* Un destello por rol: al mover a alguien de rol, los dos contadores
           afectados avisan que cambiaron. Sin eso, el cambio ocurre en una
           tarjeta que puede estar fuera de la vista y no se nota. */
        const dRol = {}
        for (const r of ROLES) {
            dRol[r.valor] = usarDestello()
            watch(() => conteos.value[r.valor], dRol[r.valor].alCambiar)
        }

        const cargar = () => store.dispatch('usuarios/cargar')

        /* ---------------- Ancho ---------------- */
        /* Se decide en JS porque bajo el breakpoint se monta otro marcado, no
           la misma tabla convertida en bloques. */
        const esMovil = ref(false)
        let mql = null
        const alCambiarAncho = (e) => {
            esMovil.value = e.matches
            if (!e.matches) abiertaId.value = null
        }

        /* ---------------- Carga ---------------- */
        const esqueleto = usarEsqueleto()
        const escalonar = ref(true)

        /* Cancela la petición si salís de la pantalla antes de que responda */
        let control = null
        onMounted(async () => {
            control = new AbortController()

            mql = window.matchMedia(MOVIL)
            esMovil.value = mql.matches
            mql.addEventListener('change', alCambiarAncho)
            document.addEventListener('keydown', alTeclado)

            /* El esqueleto solo aparece si todavía no hay nada que mostrar:
               al volver a la pantalla con datos en el store, parpadear un
               esqueleto sobre datos ya buenos se ve peor que no hacer nada. */
            await esqueleto.envolver(
                () => store.dispatch('usuarios/cargar', { signal: control.signal }),
                !todos.value.length
            )
            await espera(900)
            escalonar.value = false
        })

        onUnmounted(() => {
            control?.abort()
            mql?.removeEventListener('change', alCambiarAncho)
            document.removeEventListener('keydown', alTeclado)
            document.body.style.overflow = ''
        })

        /* ---------------- Presentación ---------------- */
        /* Devuelve variables CSS: cada bloque que lleve color de rol las
           hereda, así el hex aparece una sola vez por fila o tarjeta. */
        const tono = (rol) => {
            const linea = LINEAS[String(rol || '').toLowerCase()] || LINEA_NEUTRA
            return {
                '--rol-linea': linea,
                /* Teñido sobre la superficie del tema: claro sobre claro,
                   oscuro sobre oscuro. */
                '--rol-fondo': `color-mix(in srgb, ${linea} 16%, var(--surface))`,
                /* Mayoría de color de texto del tema con un tinte del rol:
                   así contrasta contra --rol-fondo en los dos temas. */
                '--rol-texto': `color-mix(in srgb, ${linea} 42%, var(--text))`
            }
        }

        const iniciales = (nombre) => String(nombre || '?')
            .trim().split(/\s+/).slice(0, 2)
            .map(p => p[0]).join('').toUpperCase()

        const modulosCorto = (rol) => modulosPorRol(rol).slice(0, MODULOS_VISIBLES)
        const modulosResto = (rol) => Math.max(0, modulosPorRol(rol).length - MODULOS_VISIBLES)

        /* ---------------- Acordeón ---------------- */
        const abiertaId = ref(null)
        const alternar = (id) => { abiertaId.value = abiertaId.value === id ? null : id }

        /* ---------------- Filtros ---------------- */
        /* La búsqueda es local — UsuarioFiltro no tiene campo de texto — así
           que no necesita debounce ni viaja al servidor. */
        const busqueda = ref('')
        watch(busqueda, (v) => {
            store.dispatch('usuarios/buscar', v)
            abiertaId.value = null
        })

        const estadoSel = computed(() =>
            filtro.value.activo === null ? '' : String(filtro.value.activo)
        )

        const filtrarPor = (campo, valor) => {
            const limpio = valor === '' ? null : valor
            abiertaId.value = null
            store.dispatch('usuarios/filtrar', {
                [campo]: campo === 'activo' && limpio !== null ? limpio === 'true' : limpio
            })
        }

        /* ---------------- Feedback ---------------- */
        const resalte = usarResalte()
        const { aviso, avisar } = usarAviso()

        /* ---------------- Modales ---------------- */
        const modal = ref(null)
        const confirmarDescarte = ref(false)
        /* Se declara acá y no junto a su lógica más abajo: el watch de
           overflow lo lee, y un watch se evalúa apenas se crea. */
        const confirmRol = ref(null)
        const campoNombre = ref(null)
        const campoClave = ref(null)
        const guardando = computed(() => store.getters['usuarios/guardando'])
        /* Id de la fila con una operación en curso, para deshabilitarla sola
           y no congelar toda la tabla */
        const ocupado = ref(null)

        /* Con el modal abierto, el fondo no debe scrollear detrás: en iOS
           el gesto se "escapa" al body y la hoja parece trabada. */
        watch([modal, confirmarDescarte, confirmRol], ([m, d, r]) => {
            document.body.style.overflow = (m || d || r) ? 'hidden' : ''
        })

        /* El sello es la ficha tal como se abrió. Comparar contra él evita
           preguntar "¿descartar?" cuando no se tocó nada. */
        const sellar = (f) => JSON.stringify({ ...f, error: '' })

        const abrir = (tipo, f, campo) => {
            modal.value = { tipo, f: reactive(f), sello: sellar(f) }
            nextTick(() => campo?.value?.focus())
        }

        const abrirNuevo = () => abrir(
            'cuenta',
            { id: null, name: '', email: '', password: '', role: 'vendedor', error: '' },
            campoNombre
        )

        const abrirEdicion = (u) => abrir(
            'cuenta',
            { id: u.id, name: u.name, email: u.email, password: '', role: u.role, error: '' },
            campoNombre
        )

        const abrirClave = (u) => abrir(
            'clave',
            { id: u.id, name: u.name, password: '', error: '' },
            campoClave
        )

        const cerrarModal = () => {
            modal.value = null
            confirmarDescarte.value = false
        }

        const sucio = () => !!modal.value && sellar(modal.value.f) !== modal.value.sello

        /* Un clic al fondo borraba el formulario sin preguntar */
        const intentarCerrar = () => {
            if (guardando.value) return
            if (sucio()) {
                confirmarDescarte.value = true
                return
            }
            cerrarModal()
        }

        const descartar = () => cerrarModal()

        /* ---------------- Acciones ---------------- */
        const validarCuenta = (f) => {
            if ((f.name || '').trim().length < 2) return 'El nombre debe tener al menos 2 caracteres.'
            if (!CORREO.test((f.email || '').trim())) return 'Revisa el correo: no tiene un formato válido.'
            if (!f.id && (f.password || '').length < LARGO_MINIMO_PASSWORD) {
                return `La contraseña necesita al menos ${LARGO_MINIMO_PASSWORD} caracteres.`
            }
            return ''
        }

        const guardar = async () => {
            const f = modal.value.f
            /* El placeholder decía "Mínimo N caracteres" y nada lo comprobaba:
               la validación quedaba entera en el servidor. */
            f.error = validarCuenta(f)
            if (f.error) return

            try {
                if (f.id) {
                    await store.dispatch('usuarios/actualizarUsuario', {
                        id: f.id, name: f.name.trim(), email: f.email.trim(), role: f.role
                    })
                    resalte.marcar(f.id)
                } else {
                    await store.dispatch('usuarios/crearUsuario', {
                        name: f.name.trim(), email: f.email.trim(), password: f.password, role: f.role
                    })
                }
                cerrarModal()
                avisar('Cuenta guardada')
            } catch (e) {
                f.error = e.message
            }
        }

        const guardarClave = async () => {
            const f = modal.value.f
            f.error = ''
            if ((f.password || '').length < LARGO_MINIMO_PASSWORD) {
                f.error = `La contraseña necesita al menos ${LARGO_MINIMO_PASSWORD} caracteres.`
                return
            }

            try {
                await store.dispatch('usuarios/restablecerPassword', { id: f.id, password: f.password })
                const id = f.id
                cerrarModal()
                avisar('Contraseña restablecida')
                resalte.marcar(id)
            } catch (e) {
                f.error = e.message
            }
        }

        /* ---------------- Cambio de rol ---------------- */

        /* Conceder administración pasa por confirmación; bajar de rol o mover
           entre vendedor y bodega no, porque quita permisos en vez de darlos. */
        const pedirCambioRol = (u, evento) => {
            const nuevo = evento.target.value
            if (nuevo === u.role) return

            if (ROLES_ADMIN.has(String(nuevo).toLowerCase())) {
                /* El select ya muestra el valor nuevo aunque todavía no se
                   aplicó: se devuelve a la vista hasta que se confirme. */
                evento.target.value = u.role
                confirmRol.value = { id: u.id, nombre: u.name, previo: u.role, nuevo }
                return
            }

            aplicarRol(u.id, u.name, nuevo)
        }

        const cancelarCambioRol = () => { confirmRol.value = null }

        const confirmarCambioRol = () => {
            const c = confirmRol.value
            confirmRol.value = null
            aplicarRol(c.id, c.nombre, c.nuevo)
        }

        const aplicarRol = async (id, nombre, role) => {
            ocupado.value = id
            try {
                await store.dispatch('usuarios/cambiarRolUsuario', { id, role })
                avisar(`${nombre} ahora es ${textoRol(role)}`)
                resalte.marcar(id)
            } catch (e) {
                /* El select ya mostró el valor nuevo; recargar lo devuelve a
                   lo que realmente quedó en la base. */
                await cargar()
                avisar(e.message, true)
            } finally {
                ocupado.value = null
            }
        }

        const alternarEstado = async (u) => {
            ocupado.value = u.id
            try {
                await store.dispatch('usuarios/cambiarEstadoUsuario', { id: u.id, activo: !u.activo })
                avisar(u.activo ? `${u.name} bloqueado` : `${u.name} reactivado`)
                resalte.marcar(u.id)
            } catch (e) {
                avisar(e.message, true)
            } finally {
                ocupado.value = null
            }
        }

        /* ---------------- Teclado ---------------- */
        const alTeclado = (e) => {
            if (e.key !== 'Escape') return
            if (confirmarDescarte.value) confirmarDescarte.value = false
            else if (confirmRol.value) cancelarCambioRol()
            else if (modal.value) intentarCerrar()
            else if (abiertaId.value) abiertaId.value = null
        }

        /* ---------------- Varios ---------------- */
        const fmt = new Intl.NumberFormat('es-CL', {
            style: 'currency', currency: 'CLP', maximumFractionDigits: 0
        })
        const clp = (n) => fmt.format(Math.round(n || 0))

        /* "sáb 1 ago, 16:44". El día de la semana ayuda más que el año
           para ubicarse: uno recuerda "el sábado", no "el 01-08-26".
           Se arma en dos partes porque el formato de una sola pasada mete
           comas y puntos que varían entre navegadores. */
        const fmtDia = new Intl.DateTimeFormat('es-CL', {
            weekday: 'short', day: 'numeric', month: 'short'
        })
        const fmtHora = new Intl.DateTimeFormat('es-CL', {
            hour: '2-digit', minute: '2-digit', hour12: false
        })
        /* Sin acceso previo se devuelve vacío a propósito: una celda en
           blanco se lee más rápido que la palabra "Nunca" repetida. */
        const fecha = (valor) => {
            if (!valor) return ''
            const d = new Date(valor)
            const dia = fmtDia.format(d).replace(/\./g, '').replace(/,/g, '')
            return `${dia}, ${fmtHora.format(d)}`
        }

        return {
            ROLES, MINIMO: LARGO_MINIMO_PASSWORD, textoRol, Math,
            tono, iniciales, modulosCorto, modulosResto,
            visibles, total, cargando, errorCarga, filtro, yoId, cargar,
            busqueda, estadoSel, filtrarPor, conteos, dRol,
            esqueleto, escalonar, resalte, aviso,
            esMovil, abiertaId, alternar,
            modal, guardando, ocupado, campoNombre, campoClave,
            confirmarDescarte, intentarCerrar, descartar,
            abrirNuevo, abrirEdicion, abrirClave, cerrarModal,
            guardar, guardarClave,
            confirmRol, pedirCambioRol, cancelarCambioRol, confirmarCambioRol,
            alternarEstado,
            clp, fecha
        }
    }
}
</script>

<style scoped>
/* ==========================================================================
   MOBILE FIRST — consume los tokens globales (tokens.css), no define ninguno.
   Antes esta vista tenía los colores escritos a mano y era la única del
   sistema que no cambiaba con el tema.
   Puntos de quiebre: 600 (teléfono grande) · 960 (tabla real).
   ========================================================================== */

/* Universal y no una lista de contenedores: la lista se olvida de alguno
   y ahí `min-height` deja de medir la caja completa y el padding se suma
   encima. Al estar el estilo scoped, el `*` alcanza solo a este componente. */
*,
*::before,
*::after {
    box-sizing: border-box;
}

/* Sin resaltado gris al tocar; el :active de cada control ya da feedback */
.btn,
.btn-icono,
.opcion-rol,
.select-rol,
.cab {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
}

.ico {
    width: 1.1em;
    height: 1.1em;
    flex-shrink: 0;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.suave { color: var(--text-muted); }
.mini { font-size: 0.78rem; }

.dato {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
}

/* ================================================================
 * ANIMACIONES
 * ================================================================ */

@keyframes entra {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: none; }
}

.al-entrar {
    animation: entra 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
    animation-delay: calc(var(--i, 0) * 55ms);
}

@keyframes aparece {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
}

.fila {
    animation: aparece 200ms ease-out backwards;
}

tbody.escalonada .fila {
    animation-duration: 300ms;
    animation-delay: calc(var(--i, 0) * 35ms);
}

/* Resalte tras un cambio. Acá los cambios son de permisos, así que el
   verde dice "quedó guardado", no "todo bien con esta cuenta". */
@keyframes resalta {
    0% { background: var(--success-soft); }
    100% { background: transparent; }
}

.fila.resaltada,
.fila.resaltada td,
.cuenta.resaltada {
    animation: resalta 1400ms ease-out;
}

/* Destello de un contador que se recalculó solo */
@keyframes destello {
    0% { transform: scale(1.14); }
    100% { transform: scale(1); }
}

.destella {
    animation: destello 460ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* Reemplazo de bloques excluyentes: tabla ↔ vacío ↔ error, y el estado
   activa/bloqueada dentro de su celda. */
.cambio-enter-active {
    transition: opacity 0.16s ease, transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

.cambio-leave-active { transition: opacity 0.1s ease; }

.cambio-enter-from {
    opacity: 0;
    transform: scale(0.98);
}

.cambio-leave-to { opacity: 0; }

/* Bloques que aparecen a mitad de flujo (el error dentro de un modal) */
.desliza-enter-active {
    transition: opacity 0.22s ease, transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}

.desliza-leave-active {
    transition: opacity 0.16s ease, transform 0.16s ease;
}

.desliza-enter-from,
.desliza-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

/* Modales */
.modal-enter-active,
.modal-leave-active { transition: opacity 0.18s ease; }

.modal-enter-from,
.modal-leave-to { opacity: 0; }

.modal-enter-active .modal { transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1); }
.modal-leave-active .modal { transition: transform 0.16s ease; }

/* En móvil la hoja sube desde abajo, que es de donde viene el componente.
   En escritorio (ver ≥600) el diálogo solo aparece apenas más chico. */
.modal-enter-from .modal { transform: translateY(40px); }
.modal-leave-to .modal { transform: translateY(20px); }

/* Toast */
.aviso-enter-active {
    transition: opacity 0.2s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.aviso-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.aviso-enter-from,
.aviso-leave-to {
    opacity: 0;
    transform: translateY(16px);
}

/* Spinner */
@keyframes girar {
    to { transform: rotate(360deg); }
}

.spinner {
    display: inline-block;
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    border: 2px solid color-mix(in srgb, var(--accent-contrast) 35%, transparent);
    border-top-color: var(--accent-contrast);
    border-radius: 50%;
    animation: girar 0.8s linear infinite;
}

.btn-ocupado:disabled {
    background: var(--accent);
    opacity: 0.78;
    cursor: wait;
}

/* Recarga sobre datos ya visibles: se atenúa, no se reemplaza por un
   esqueleto. Cambiar datos buenos por placeholders se siente más lento. */
.atenuada {
    opacity: 0.45;
    transition: opacity 0.14s ease;
}

/* El botón que está esperando respuesta del servidor late despacio */
@keyframes late-suave {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
}

.btn-icono.ocupado {
    animation: late-suave 1s ease-in-out infinite;
}

/* ---------- Cabecera ---------- */
.cabecera {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    margin-bottom: 16px;
}

.cabecera h2 {
    margin: 0;
    font-size: 1.3rem;
    line-height: 1.25;
    letter-spacing: -0.01em;
    color: var(--text);
}

.pista {
    margin: 4px 0 0;
    font-size: 0.85rem;
    line-height: 1.45;
    color: var(--text-muted);
}

/* ---------- Roles: carrusel con snap ---------- */
.roles {
    display: flex;
    gap: 10px;
    margin-bottom: 18px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    /* El scroll llega al borde de la pantalla aunque MainLayout tenga
       padding: si no, la última tarjeta queda "cortada" contra el margen. */
    margin-inline: calc(-1 * var(--margen-vista, 16px));
    padding-inline: var(--margen-vista, 16px);
    padding-bottom: 2px;
}

.roles::-webkit-scrollbar { display: none; }

.rol-tarjeta {
    flex: 0 0 min(78%, 280px);
    scroll-snap-align: start;
    background: var(--surface);
    border: 1px solid var(--border);
    border-top: 3px solid var(--rol-linea);
    border-radius: var(--r-md, 12px);
    padding: 14px 15px 15px;
    transition: box-shadow 0.18s, transform 0.18s;
}

.rol-tarjeta:hover {
    box-shadow: var(--shadow-sm);
    transform: translateY(-2px);
}

.esq-rol { border-top-color: var(--border); }

.rol-tarjeta header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 9px;
    margin-bottom: 6px;
}

.rol-tarjeta h3 {
    margin: 0;
    font-size: 0.95rem;
    color: var(--rol-texto);
}

.contador {
    min-width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
    border-radius: var(--r-full, 999px);
    background: var(--rol-fondo);
    color: var(--rol-texto);
    font-size: 0.75rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.rol-tarjeta p {
    margin: 0 0 10px;
    font-size: 0.78rem;
    color: var(--text-muted);
    line-height: 1.5;
}

.modulos {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}

.modulos li {
    padding: 3px 9px;
    border-radius: var(--r-full, 999px);
    background: var(--rol-fondo);
    color: var(--rol-texto);
    font-size: 0.68rem;
    font-weight: 600;
}

.modulos .mas {
    background: transparent;
    border: 1px dashed var(--border-strong);
    color: var(--text-faint);
}

/* ---------- Barra de filtros ---------- */
.barra {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 14px;
}

.buscador { position: relative; }

.buscador .campo { padding-left: 38px; }

.lupa {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 17px;
    height: 17px;
    color: var(--text-faint);
    pointer-events: none;
}

/* Dos selects a mitad de ancho: caben en 320px sin truncar el texto */
.filtros {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
}

.conteo { align-self: flex-end; }

.vacio {
    padding: 36px 18px;
    border: 1px dashed var(--border-strong);
    border-radius: var(--r-md, 12px);
    background: var(--surface);
    text-align: center;
    color: var(--text-muted);
    font-size: 0.9rem;
}

.error-panel { margin: 0; }
.reintentar { margin-left: 10px; }

/* ---------- Lista en móvil: acordeón ---------- */

.lista {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.cuenta {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md, 12px);
    overflow: hidden;
}

.cuenta.inactiva { opacity: 0.6; }

.cuenta.abierta {
    border-color: var(--rol-linea);
}

.cab {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 60px;
    padding: 0 14px;
    border: 0;
    background: none;
    color: inherit;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
}

.cab:focus-visible {
    outline: 2px solid var(--rol-linea);
    outline-offset: -2px;
}

.cab-nombre {
    flex: 1;
    min-width: 0;
    font-size: 0.98rem;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.rol-chip {
    flex-shrink: 0;
    padding: 3px 11px;
    border-radius: var(--r-full, 999px);
    background: var(--rol-fondo);
    color: var(--rol-texto);
    font-size: 0.72rem;
    font-weight: 700;
}

.chevron {
    flex-shrink: 0;
    color: var(--text-faint);
    font-size: 1.15rem;
    line-height: 1;
    transition: transform 0.16s ease;
}

.cuenta.abierta .chevron { transform: rotate(90deg); }

.cuerpo {
    padding: 2px 14px 14px;
    border-top: 1px solid var(--border);
}

.correo-movil {
    margin: 10px 0 6px;
    font-size: 0.85rem;
    color: var(--text-muted);
    overflow-wrap: anywhere;
}

.fila-dato {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 7px 0;
    border-bottom: 1px solid var(--border);
    font-size: 0.86rem;
}

.fila-dato > span:first-child { color: var(--text-muted); }

.grupo-rol { margin: 14px 0 4px; }

/* ---------- Persona ---------- */
.persona {
    display: flex;
    align-items: center;
    gap: 11px;
    width: 100%;
    min-width: 0;
}

.avatar {
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--rol-fondo);
    color: var(--rol-texto);
    font-size: 0.8rem;
    font-weight: 700;
    /* El color viene de una variable: al cambiar de rol, la transición
       hace el cruce de un tono al otro en vez de saltar. */
    transition: background-color 0.24s ease, color 0.24s ease;
}

.identidad {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.identidad b {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text);
}

/* El correo es lo único que puede desbordar: se corta con puntos
   suspensivos en vez de estirar la fila. */
.correo {
    display: block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.75rem;
    color: var(--text-faint);
}

.marca { margin-left: 7px; }

/* ---------- Select de rol ----------
   16px reales de fuente: por debajo de eso iOS hace zoom al enfocarlo. */
.rol-envoltura {
    position: relative;
    display: block;
    max-width: 100%;
}

.rol-envoltura::after {
    content: '';
    position: absolute;
    right: 16px;
    top: 50%;
    width: 6px;
    height: 6px;
    margin-top: -4px;
    border-right: 1.5px solid var(--rol-texto);
    border-bottom: 1.5px solid var(--rol-texto);
    transform: rotate(45deg);
    pointer-events: none;
}

.rol-envoltura.fijo::after { display: none; }

.select-rol {
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    max-width: 100%;
    min-height: 46px;
    padding: 0 36px 0 16px;
    border: 1px solid transparent;
    border-radius: var(--r-full, 999px);
    background: var(--rol-fondo);
    color: var(--rol-texto);
    font-family: inherit;
    font-size: max(0.8rem, 16px);
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.24s ease, color 0.24s ease, border-color 0.15s;
}

.rol-envoltura.fijo .select-rol { padding-right: 16px; }

.select-rol:focus-visible {
    outline: 2px solid var(--rol-linea);
    outline-offset: 1px;
}

.select-rol:disabled {
    opacity: 0.75;
    cursor: default;
}

/* ---------- Estado ---------- */
.estado {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 0.86rem;
    font-weight: 600;
}

.es-activa { color: var(--success); }
.es-bloqueada { color: var(--text-faint); }

.etiqueta {
    display: inline-block;
    padding: 2px 8px;
    border-radius: var(--r-full, 999px);
    background: var(--rol-fondo);
    color: var(--rol-texto);
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
}

/* ---------- Acciones ---------- */
.acciones {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
    width: 100%;
    margin-top: 14px;
}

.btn-bloqueo,
.propia { grid-column: 1 / -1; }

/* Bloquear y reactivar no son la misma acción: cada una con su color */
.btn-bloqueo {
    border-color: var(--danger-border, var(--danger));
    color: var(--danger);
}

.btn-bloqueo.reactivar {
    border-color: var(--success);
    background: var(--success-soft);
    color: var(--success);
}

.propia {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 44px;
    font-size: 0.875rem;
    color: var(--text-faint);
}

/* ---------- Botones ---------- */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 46px;
    padding: 0.65rem 1.15rem;
    border: none;
    border-radius: var(--r-sm, 8px);
    /* Antes era un #0f6e56 propio de esta pantalla: el único botón primario
       del sistema que no usaba el acento. Si el verde era de marca, es esta
       línea la que vuelve atrás. */
    background: var(--accent);
    color: var(--accent-contrast);
    font-family: inherit;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s, transform 0.1s;
}

.btn:active:not(:disabled) { transform: scale(0.97); }
.btn:hover:not(:disabled) { background: var(--accent-hover); }

.btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.btn.peligro { background: var(--danger); }

.btn-linea {
    background: transparent;
    border: 1px solid var(--border-strong);
    color: var(--text-muted);
}

.btn-linea:hover:not(:disabled) {
    background: var(--surface-2);
    color: var(--text);
}

.btn-linea:disabled {
    background: transparent;
    color: var(--text-faint);
}

.btn-mini {
    min-height: 44px;
    padding: 0.3rem 0.7rem;
    border-radius: var(--r-sm, 8px);
    font-size: 0.88rem;
}

.btn-icono {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 46px;
    padding: 0 0.7rem;
    border: 1px solid var(--border-strong);
    border-radius: var(--r-sm, 8px);
    background: var(--surface);
    color: var(--text-muted);
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background-color 0.15s, transform 0.1s;
}

.btn-icono:active:not(:disabled) {
    background: var(--surface-2);
    transform: scale(0.96);
}

/* ---------- Esqueleto ---------- */
.esq-barra { margin-bottom: 14px; }

.esq-fila {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md, 12px);
    margin-bottom: 14px;
}

.esq-col {
    flex: 1;
    min-width: 0;
}

.sep-6 { margin-top: 6px; }
.sep-9 { margin-top: 9px; }

/* ---------- Modal: hoja inferior en móvil ---------- */
.fondo {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: var(--overlay);
}

.fondo.z-alto { z-index: 70; }

.modal {
    width: 100%;
    /* dvh evita el salto cuando la barra del navegador se esconde */
    max-height: 92dvh;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border-radius: var(--r-lg, 16px) var(--r-lg, 16px) 0 0;
    box-shadow: var(--shadow-lg);
}

.agarre {
    display: block;
    width: 38px;
    height: 4px;
    margin: 0 auto 12px;
    border-radius: var(--r-full, 999px);
    background: var(--border-strong);
}

.modal-cab {
    padding: 10px 18px 14px;
    border-bottom: 1px solid var(--border);
}

.modal-cab h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text);
}

.modal-cab p {
    margin: 4px 0 0;
    font-size: 0.82rem;
    line-height: 1.45;
    color: var(--text-muted);
}

.modal-cuerpo {
    padding: 18px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
}

.modal-pie {
    display: flex;
    gap: 9px;
    padding: 14px 18px;
    /* Deja libre la barra de gestos del iPhone */
    padding-bottom: calc(14px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--border);
}

.modal-pie .btn { flex: 1 1 0; }

label {
    display: block;
    margin-bottom: 5px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-muted);
}

.campo {
    width: 100%;
    min-height: 46px;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--border-strong);
    border-radius: var(--r-sm, 8px);
    background: var(--surface);
    font-family: inherit;
    /* 16px mínimos: si no, iOS hace zoom al enfocar y descuadra la vista */
    font-size: max(0.9rem, 16px);
    color: var(--text);
    outline: none;
    transition: border-color 0.18s, box-shadow 0.18s;
}

.campo:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
}

.grupo { margin-bottom: 15px; }

.error {
    padding: 10px 13px;
    margin-bottom: 14px;
    border-radius: 0 var(--r-sm, 8px) var(--r-sm, 8px) 0;
    border-left: 4px solid var(--danger);
    background: var(--danger-soft);
    color: var(--danger);
    font-size: 0.85rem;
}

.nota {
    padding: 10px 13px;
    margin-top: 14px;
    border-radius: 0 var(--r-sm, 8px) var(--r-sm, 8px) 0;
    border-left: 3px solid var(--accent);
    background: var(--accent-soft);
    font-size: 0.82rem;
    color: var(--text-muted);
    line-height: 1.55;
}

.nota.alerta {
    margin-top: 0;
    border-left-color: var(--warn);
    background: var(--warn-soft);
    color: var(--text);
}

.opciones-rol {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.opcion-rol {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-height: 56px;
    padding: 11px 13px;
    border: 1.5px solid var(--border);
    border-radius: var(--r-sm, 10px);
    background: var(--surface);
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: border-color 0.18s, background-color 0.18s, transform 0.1s;
}

.opcion-rol:active { transform: scale(0.99); }

.opcion-rol b {
    font-size: 0.9rem;
    color: var(--text);
}

.opcion-rol span {
    font-size: 0.75rem;
    color: var(--text-muted);
    line-height: 1.45;
}

.opcion-rol.on {
    border-color: var(--rol-linea);
    background: var(--rol-fondo);
}

.opcion-rol.on b { color: var(--rol-texto); }

.aviso {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(16px + env(safe-area-inset-bottom));
    z-index: 80;
    padding: 13px 18px;
    border-radius: var(--r-sm, 10px);
    background: var(--success);
    color: #fff;
    font-size: 0.875rem;
    font-weight: 600;
    box-shadow: var(--shadow-lg);
    text-align: center;
}

.aviso.malo { background: var(--danger); }

/* ==========================================================================
   ≥ 600px — teléfono grande y tablet vertical
   ========================================================================== */
@media (min-width: 600px) {
    .cabecera {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-end;
    }

    .cabecera h2 { font-size: 1.5rem; }

    .btn-crear { flex-shrink: 0; }

    .roles {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
        overflow: visible;
        margin-inline: 0;
        padding-inline: 0;
    }

    .rol-tarjeta { flex: initial; }

    .barra {
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
    }

    .buscador {
        flex: 1 1 220px;
        min-width: 0;
    }

    .filtros { flex: 1 1 300px; }

    .conteo {
        margin-left: auto;
        align-self: center;
    }

    .acciones { grid-template-columns: repeat(3, 1fr); }

    .btn-bloqueo,
    .propia { grid-column: auto; }

    .fondo {
        align-items: center;
        padding: 20px;
    }

    .modal {
        max-width: 500px;
        max-height: 88dvh;
        border-radius: var(--r-lg, 14px);
    }

    .modal.angosto { max-width: 400px; }

    /* Acá el diálogo no "sube": aparece apenas más chico y centrado */
    .modal-enter-from .modal { transform: translateY(18px) scale(0.97); }
    .modal-leave-to .modal { transform: translateY(8px) scale(0.98); }

    .agarre { display: none; }

    .modal-cab { padding-top: 18px; }

    .modal-pie {
        justify-content: flex-end;
        padding-bottom: 14px;
    }

    .modal-pie .btn { flex: 0 0 auto; }

    .aviso {
        left: 50%;
        right: auto;
        transform: translateX(-50%);
        max-width: 90vw;
    }

    .aviso-enter-from,
    .aviso-leave-to { transform: translate(-50%, 16px); }
}

/* ==========================================================================
   ≥ 960px — la tabla. Solo se monta acá, así que sus estilos no necesitan
   convivir con los de la lista.
   ========================================================================== */
@media (min-width: 960px) {
    .panel {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--r-md, 12px);
        overflow: hidden;
    }

    .barra {
        gap: 9px;
        margin-bottom: 0;
        padding: 11px 12px;
        border-bottom: 1px solid var(--border);
        background: var(--surface-2);
    }

    .filtros { flex: 0 1 390px; }

    .vacio {
        border: none;
        border-radius: 0;
    }

    .error-panel { margin: 14px; }

    .tabla-envoltura { overflow-x: auto; }

    /* `fixed` respeta los anchos del colgroup al pie de la letra y reparte
       el 100% del ancho disponible entre las siete columnas. */
    table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        min-width: 940px;
    }

    .c-cuenta { width: 26%; }
    .c-rol { width: 15%; }
    .c-estado { width: 11%; }
    .c-acceso { width: 14%; }
    .c-boletas { width: 7%; }
    .c-vendido { width: 13%; }
    .c-acciones { width: 14%; }

    tbody tr {
        /* Altura fija: todas las filas comparten el mismo eje horizontal
           tenga o no datos cada celda. */
        height: 64px;
        border-bottom: 1px solid var(--border);
    }

    tbody tr:last-child { border-bottom: 0; }

    tr.inactiva .persona,
    tr.inactiva .dato {
        opacity: 0.6;
        transition: opacity 0.24s ease;
    }

    .fila td { transition: background-color 0.16s ease; }

    tbody tr:hover { background: var(--surface-2); }

    th {
        padding: 11px 12px;
        background: var(--surface-2);
        border-bottom: 1px solid var(--border);
        font-size: 0.66rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--text-muted);
    }

    td {
        padding: 8px 12px;
        vertical-align: middle;
        font-size: 0.875rem;
        color: var(--text);
        /* Con `fixed` nada puede estirar una columna: lo que no entra se
           corta con puntos suspensivos en vez de romper el reparto. */
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    th,
    td { text-align: center; }

    /* El bloque tiene ancho propio y se centra como bloque; adentro el
       contenido va a la izquierda. Si se centrara por su contenido, un
       nombre corto correría el avatar y los círculos no formarían línea. */
    .persona {
        width: 100%;
        max-width: 230px;
        margin: 0 auto;
    }

    .avatar {
        width: 36px;
        height: 36px;
        font-size: 0.74rem;
    }

    .identidad b {
        font-size: 0.875rem;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* El colgroup ya limita la columna: el correo se corta contra ese
       ancho, no contra un valor fijo inventado. */
    .correo {
        max-width: 100%;
        font-size: 0.78rem;
    }

    /* Todos los controles de la fila miden 36px de alto y tienen ancho
       declarado, así comparten eje vertical y horizontal entre filas. */
    .rol-envoltura {
        width: 100%;
        max-width: 150px;
        margin: 0 auto;
    }

    .rol-envoltura::after { right: 14px; }

    .select-rol {
        min-height: 36px;
        padding: 0 32px 0 14px;
        font-size: 0.8rem;
        text-align: left;
    }

    .rol-envoltura.fijo .select-rol {
        padding-right: 14px;
        text-align: center;
        text-align-last: center;
    }

    .select-rol:hover:not(:disabled) { border-color: var(--rol-linea); }

    .estado {
        justify-content: center;
        gap: 7px;
        width: 100%;
        max-width: 104px;
        height: 36px;
        margin: 0 auto;
        font-size: 0.8rem;
    }

    .estado .ico {
        width: 16px;
        height: 16px;
    }

    .col-acceso {
        color: var(--text-muted);
        font-size: 0.82rem;
    }

    /* El tercer botón es un ícono igual que los otros dos, pero con el
       color de su acción. */
    .btn-bloqueo:hover:not(:disabled) {
        border-color: var(--danger);
        background: var(--danger-soft);
        color: var(--danger);
    }

    .btn-bloqueo.reactivar {
        background: transparent;
    }

    .btn-bloqueo.reactivar:hover:not(:disabled) {
        border-color: var(--success);
        background: var(--success-soft);
        color: var(--success);
    }

    .acciones-col { overflow: visible; }

    /* Tres carriles iguales. `grid-column: auto` es obligatorio: sin eso
       el botón de bloqueo hereda el `1 / -1` de la tarjeta y se monta en
       una segunda fila debajo de los íconos. */
    .acciones {
        display: grid;
        grid-template-columns: repeat(3, 36px);
        gap: 8px;
        justify-content: center;
        align-items: center;
        width: auto;
        margin-top: 0;
    }

    .btn-bloqueo,
    .propia { grid-column: auto; }

    /* En la cuenta propia el tercer carril queda vacío, para que los dos
       íconos no se corran de lugar respecto de las otras filas. */
    .propia {
        width: 36px;
        height: 36px;
    }

    .btn-icono {
        width: 36px;
        min-height: 36px;
        padding: 0;
    }

    .btn-icono:hover:not(:disabled) {
        border-color: var(--rol-linea);
        color: var(--rol-linea);
    }

    .btn-mini {
        min-height: 36px;
        padding: 0 0.6rem;
        font-size: 0.8rem;
    }
}

@media (prefers-reduced-motion: reduce) {

    .btn,
    .btn-icono,
    .campo,
    .rol-tarjeta,
    .select-rol,
    .avatar,
    .opcion-rol,
    .atenuada,
    .chevron,
    .fila td,
    tr.inactiva .persona,
    tr.inactiva .dato { transition: none; }

    .al-entrar,
    .fila,
    .fila.resaltada,
    .fila.resaltada td,
    .cuenta.resaltada,
    .destella,
    .spinner,
    .btn-icono.ocupado { animation: none; }

    .cambio-enter-active,
    .cambio-leave-active,
    .desliza-enter-active,
    .desliza-leave-active,
    .modal-enter-active,
    .modal-leave-active,
    .modal-enter-active .modal,
    .modal-leave-active .modal,
    .aviso-enter-active,
    .aviso-leave-active { transition: none; }

    .rol-tarjeta:hover { transform: none; }

    .atenuada { opacity: 1; }
}
</style>