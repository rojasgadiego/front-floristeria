<template>

  <div class="cabecera al-entrar">
    <div class="titulo">
      <h2>Configuración</h2>
      <!-- <p class="pista">Datos del local, parámetros de venta y reglas del club.</p> -->
    </div>
    <p v-if="actualizado" class="sello suave">{{ actualizado }}</p>
  </div>

  <Transition name="desliza">
    <div v-if="!esAdmin" class="banda banda-aviso">
      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      <span>Puedes consultar la configuración, pero solo un administrador la modifica.</span>
    </div>
  </Transition>

  <!-- ================= ESQUELETO ================= -->
  <div v-if="esqueleto.visible" class="columnas" aria-hidden="true">
    <section v-for="n in 4" :key="'s' + n" class="tarjeta">
      <EsqueletoBloque alto="18px" ancho="46%" />
      <EsqueletoBloque alto="11px" ancho="70%" class="sep-8" />
      <EsqueletoBloque alto="48px" ancho="100%" radio="10px" class="sep-18" />
      <EsqueletoBloque alto="48px" ancho="100%" radio="10px" class="sep-12" />
      <EsqueletoBloque alto="48px" ancho="100%" radio="10px" class="sep-12" />
    </section>
  </div>

  <Transition v-else name="cambio" mode="out-in">
    <div v-if="errorCarga" key="error" class="error suelto">
      {{ errorCarga }}
      <button class="btn btn-linea btn-mini" @click="recargar">Reintentar</button>
    </div>

    <div v-else key="columnas" class="columnas">

      <!-- ================= Datos del local ================= -->
      <section class="tarjeta al-entrar" :style="tono('local')" style="--i: 1"
        :class="{ resaltada: resalte.id === 'local' }">
        <header class="tarjeta-cab">
          <span class="emblema" aria-hidden="true">
            <svg class="ico" viewBox="0 0 24 24">
              <path d="M4 10l1.5-5h13L20 10M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
              <path d="M9.5 20v-5h5v5" />
            </svg>
          </span>
          <div class="min0">
            <h3>Datos del local</h3>
            <p class="sub">Aparecen en la cabecera de cada ticket.</p>
          </div>
          <span v-if="esAdmin && sucio('local')" class="pendiente">sin guardar</span>
        </header>

        <Transition name="desliza">
          <div v-if="errores.local" class="error">{{ errores.local }}</div>
        </Transition>

        <div class="grupo">
          <label for="c-nombre">Nombre</label>
          <input id="c-nombre" class="campo" v-model="local.nombre" maxlength="160" :disabled="!esAdmin">
        </div>

        <div class="grupo">
          <label for="c-giro">Giro</label>
          <input id="c-giro" class="campo" v-model="local.giro" maxlength="200" :disabled="!esAdmin">
        </div>

        <div class="rejilla grupo">
          <div>
            <label for="c-rut">RUT</label>
            <input id="c-rut" class="campo dato" :class="{ 'campo-malo': rutMalo }" v-model="local.rut"
              maxlength="20" placeholder="12.345.678-9" :disabled="!esAdmin" @blur="normalizarRut">
            <Transition name="desliza">
              <p v-if="rutMalo" class="ayuda mala">El dígito verificador no calza.</p>
            </Transition>
          </div>
          <div>
            <label for="c-tel">Teléfono / WhatsApp</label>
            <input id="c-tel" class="campo dato" v-model="local.telefono" maxlength="40" inputmode="tel"
              :disabled="!esAdmin">
          </div>
        </div>

        <div class="grupo">
          <label for="c-dir">Dirección</label>
          <input id="c-dir" class="campo" v-model="local.direccion" maxlength="240" :disabled="!esAdmin">
        </div>

        <div class="rejilla grupo">
          <div>
            <label for="c-comuna">Comuna</label>
            <input id="c-comuna" class="campo" v-model="local.comuna" maxlength="80" :disabled="!esAdmin">
          </div>
          <div>
            <label for="c-ciudad">Ciudad</label>
            <input id="c-ciudad" class="campo" v-model="local.ciudad" maxlength="80" :disabled="!esAdmin">
          </div>
        </div>

        <div class="rejilla grupo">
          <div>
            <label for="c-correo">Correo</label>
            <input id="c-correo" class="campo" type="email" v-model="local.correo" maxlength="160"
              inputmode="email" autocapitalize="off" autocorrect="off" :disabled="!esAdmin">
          </div>
          <div>
            <label for="c-ig">Instagram</label>
            <input id="c-ig" class="campo" v-model="local.instagram" maxlength="80" autocapitalize="off"
              :disabled="!esAdmin">
          </div>
        </div>

        <div v-if="esAdmin" class="pie-tarjeta">
          <button v-if="sucio('local')" class="btn btn-linea" @click="revertir('local')">Descartar</button>
          <button class="btn ancho" :class="{ 'btn-ocupado': guardando('local') }"
            :disabled="guardando('local') || rutMalo || !sucio('local')" @click="guardarLocal">
            <span v-if="guardando('local')" class="spinner" aria-hidden="true"></span>
            {{ guardando('local') ? 'Guardando…' : 'Guardar datos del local' }}
          </button>
        </div>
      </section>

      <!-- ================= Ticket ================= -->
      <section class="tarjeta al-entrar" :style="tono('ticket')" style="--i: 2"
        :class="{ resaltada: resalte.id === 'ticket' }">
        <header class="tarjeta-cab">
          <span class="emblema" aria-hidden="true">
            <svg class="ico" viewBox="0 0 24 24">
              <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
              <path d="M9.5 8.5h5M9.5 12.5h5" />
            </svg>
          </span>
          <div class="min0">
            <h3>Ticket</h3>
            <p class="sub">Lo que se imprime al cobrar.</p>
          </div>
          <span v-if="esAdmin && sucio('ticket')" class="pendiente">sin guardar</span>
        </header>

        <Transition name="desliza">
          <div v-if="errores.ticket" class="error">{{ errores.ticket }}</div>
        </Transition>

        <div class="grupo">
          <label for="c-msg">Mensaje de cierre</label>
          <input id="c-msg" class="campo" v-model="ticket.mensaje" maxlength="200" :disabled="!esAdmin">
        </div>

        <div class="grupo">
          <label for="c-ley">Leyenda legal</label>
          <input id="c-ley" class="campo" v-model="ticket.leyenda" maxlength="200" :disabled="!esAdmin">
        </div>

        <label class="interruptor" :class="{ apagado: !esAdmin }">
          <input type="checkbox" v-model="ticket.mostrarPuntos" :disabled="!esAdmin">
          <span>Mostrar los puntos del cliente en el ticket</span>
        </label>

        <div class="nota alerta">
          Este ticket <b>no es una boleta electrónica</b>. En Chile la boleta se
          emite al SII a través de un proveedor de documentos tributarios.
          La leyenda es lo que deja eso claro: cambiarla para que parezca
          tributaria es un problema legal, no de software.
        </div>

        <div v-if="esAdmin" class="pie-tarjeta">
          <button v-if="sucio('ticket')" class="btn btn-linea" @click="revertir('ticket')">Descartar</button>
          <button class="btn ancho" :class="{ 'btn-ocupado': guardando('ticket') }"
            :disabled="guardando('ticket') || !sucio('ticket')" @click="guardarTicket">
            <span v-if="guardando('ticket')" class="spinner" aria-hidden="true"></span>
            {{ guardando('ticket') ? 'Guardando…' : 'Guardar textos del ticket' }}
          </button>
        </div>

        <!-- El papel es blanco y la tinta negra en los dos temas: esto no es
             una superficie de la interfaz, es una simulación de impresión. -->
        <div class="previa">
          <span class="previa-rot">Así se ve</span>
          <div class="ticket">
            <div class="cen">
              <div class="logo" aria-hidden="true">🌸</div>
              <h4>{{ local.nombre || 'Nombre del local' }}</h4>
              <div class="chico">{{ direccionPrevia }}</div>
              <div class="chico" v-if="local.telefono">WhatsApp {{ local.telefono }}</div>
              <div class="chico" v-if="local.rut">RUT {{ local.rut }}</div>
              <div class="atencion">
                <span class="chico">TICKET DE ATENCIÓN</span>
                <b>#0042</b>
              </div>
            </div>
            <div class="sep"></div>
            <div>Boleta: B-1042</div>
            <div>Atendió: {{ nombreUsuario }}</div>
            <div class="sep"></div>
            <table>
              <tbody>
                <tr>
                  <td>1x Ramo 12 rosas rojas</td>
                  <td class="der">$24.990</td>
                </tr>
                <tr>
                  <td>2x Tarjeta escrita a mano</td>
                  <td class="der">$3.000</td>
                </tr>
              </tbody>
            </table>
            <div class="sep"></div>
            <div class="tot"><span>Neto</span><span>{{ clp(netoEjemplo) }}</span></div>
            <div class="tot"><span>IVA {{ venta.iva }}%</span><span>{{ clp(TOTAL_EJEMPLO - netoEjemplo) }}</span>
            </div>
            <div class="tot g"><span>TOTAL</span><span>{{ clp(TOTAL_EJEMPLO) }}</span></div>
            <template v-if="ticket.mostrarPuntos && club.activo">
              <div class="sep"></div>
              <div class="tot chico">
                <span>Puntos de esta compra</span>
                <span>{{ puntosEjemplo }}</span>
              </div>
            </template>
            <div class="sep"></div>
            <div class="cen chico">
              <b>{{ ticket.mensaje }}</b><br>
              {{ ticket.leyenda }}
            </div>
          </div>
        </div>
      </section>

      <!-- ================= Venta ================= -->
      <section class="tarjeta al-entrar" :style="tono('venta')" style="--i: 3"
        :class="{ resaltada: resalte.id === 'venta' }">
        <header class="tarjeta-cab">
          <span class="emblema" aria-hidden="true">
            <svg class="ico" viewBox="0 0 24 24">
              <rect x="3" y="6" width="18" height="12" rx="2" />
              <circle cx="12" cy="12" r="2.6" />
            </svg>
          </span>
          <div class="min0">
            <h3>Parámetros de venta</h3>
            <p class="sub">Afectan el cálculo de las boletas nuevas.</p>
          </div>
          <span v-if="esAdmin && sucio('venta')" class="pendiente">sin guardar</span>
        </header>

        <Transition name="desliza">
          <div v-if="errores.venta" class="error">{{ errores.venta }}</div>
        </Transition>

        <div class="grupo">
          <label for="c-iva">IVA (%)</label>
          <input id="c-iva" class="campo dato" type="number" min="0" max="100" step="1" inputmode="numeric"
            v-model.number="venta.iva" :disabled="!esAdmin">
          <p class="ayuda">
            Los precios del inventario se cargan con IVA incluido; este valor sirve
            para desglosar el neto en el ticket.
          </p>
        </div>

        <div class="nota">
          Cambiarlo <b>no modifica las boletas ya emitidas</b>: cada venta guarda
          la tasa con que se calculó, así el desglose histórico queda fiel.
        </div>

        <div class="grupo">
          <label for="c-desc">Descuento sin autorización</label>
          <input id="c-desc" class="campo dato" type="number" min="0" step="500" inputmode="numeric"
            v-model.number="venta.descuentoSinAutorizacion" :disabled="!esAdmin">
          <p class="ayuda">
            Hasta {{ clp(venta.descuentoSinAutorizacion) }} quien atiende puede rebajar
            solo. Por encima, la venta pide credenciales de una administradora.
          </p>
        </div>

        <Transition name="desliza">
          <div v-if="venta.descuentoSinAutorizacion > 20000" class="nota alerta">
            Es un tope alto. Un descuento sin autorización es la vía más directa
            para vaciar un punto de venta: conviene dejarlo en lo mínimo que
            permita trabajar sin interrumpir a cada rato.
          </div>
        </Transition>

        <div v-if="esAdmin" class="pie-tarjeta">
          <button v-if="sucio('venta')" class="btn btn-linea" @click="revertir('venta')">Descartar</button>
          <button class="btn ancho" :class="{ 'btn-ocupado': guardando('venta') }"
            :disabled="guardando('venta') || !sucio('venta')" @click="guardarVenta">
            <span v-if="guardando('venta')" class="spinner" aria-hidden="true"></span>
            {{ guardando('venta') ? 'Guardando…' : 'Guardar parámetros' }}
          </button>
        </div>
      </section>

      <!-- ================= Club de puntos ================= -->
      <section class="tarjeta al-entrar" :style="tono('club')" style="--i: 4"
        :class="{ resaltada: resalte.id === 'club' }">
        <header class="tarjeta-cab">
          <span class="emblema" aria-hidden="true">
            <svg class="ico" viewBox="0 0 24 24">
              <path d="M12 4l2.3 4.9 5.2.7-3.8 3.7 1 5.3-4.7-2.6-4.7 2.6 1-5.3L4.5 9.6l5.2-.7z" />
            </svg>
          </span>
          <div class="min0">
            <h3>Club de puntos</h3>
            <p class="sub">Reglas de acumulación y canje.</p>
          </div>
          <span v-if="esAdmin && sucio('club')" class="pendiente">sin guardar</span>
        </header>

        <Transition name="desliza">
          <div v-if="errores.club" class="error">{{ errores.club }}</div>
        </Transition>

        <label class="interruptor" :class="{ apagado: !esAdmin }">
          <input type="checkbox" v-model="club.activo" :disabled="!esAdmin">
          <span>Club activo</span>
        </label>
        <p class="ayuda separado">
          Al desactivarlo, el punto de venta deja de mostrar el selector de cliente
          y las compras no acumulan puntos. Los saldos existentes se conservan.
        </p>

        <div class="rejilla grupo">
          <div>
            <label for="c-ppp">1 punto por cada</label>
            <input id="c-ppp" class="campo dato" type="number" min="1" step="100" inputmode="numeric"
              v-model.number="club.puntosPorPeso" :disabled="!esAdmin || !club.activo">
          </div>
          <div>
            <label for="c-vp">Valor del punto</label>
            <input id="c-vp" class="campo dato" type="number" min="1" step="10" inputmode="numeric"
              v-model.number="club.valorPunto" :disabled="!esAdmin || !club.activo">
          </div>
        </div>

        <!-- Impacto de revaluar, mientras se escribe -->
        <Transition name="desliza">
          <div v-if="impacto && impacto.diferencia !== 0" class="nota alerta">
            <b>Cambiar el valor del punto revalúa los saldos existentes.</b><br>
            {{ impacto.clientesConPuntos }} cliente(s) con
            {{ impacto.puntosEnCirculacion.toLocaleString('es-CL') }} puntos:
            hoy valen {{ clp(impacto.compromisoActual) }} y pasarían a
            {{ clp(impacto.compromisoNuevo) }}
            <b class="dato" :class="[impacto.diferencia > 0 ? 'sube' : 'baja', { destella: dImpacto.activo }]">
              ({{ impacto.diferencia > 0 ? '+' : '' }}{{ clp(impacto.diferencia) }})
            </b>.
          </div>
        </Transition>

        <div class="grupo">
          <label for="c-cm">Canje mínimo (puntos)</label>
          <input id="c-cm" class="campo dato" type="number" min="1" step="10" inputmode="numeric"
            v-model.number="club.canjeMinimo" :disabled="!esAdmin || !club.activo">
        </div>

        <div class="nota">
          <b>Cómo queda:</b> una compra de {{ clp(50000) }} otorga
          {{ puntosPorCompra(50000) }} puntos.
          Con {{ club.canjeMinimo }} puntos el cliente descuenta
          {{ clp((club.canjeMinimo || 0) * (club.valorPunto || 0)) }}.<br>
          <span class="chica">
            Eso equivale a devolver un
            <b class="dato" :class="{ destella: dRetorno.activo }">{{ retornoPorcentaje.toFixed(1) }}%</b>
            de lo que gasta.
          </span>
        </div>

        <Transition name="desliza">
          <div v-if="retornoPorcentaje > 8" class="nota alerta">
            Un retorno sobre 8% es alto para una florería. Revisa que el margen
            de tus productos lo soporte.
          </div>
        </Transition>

        <div v-if="esAdmin" class="pie-tarjeta">
          <button v-if="sucio('club')" class="btn btn-linea" @click="revertir('club')">Descartar</button>
          <button class="btn ancho" :class="{ 'btn-ocupado': guardando('club') }"
            :disabled="guardando('club') || !sucio('club')" @click="guardarClub">
            <span v-if="guardando('club')" class="spinner" aria-hidden="true"></span>
            {{ guardando('club') ? 'Guardando…' : 'Guardar reglas del club' }}
          </button>
        </div>
      </section>
    </div>
  </Transition>

  <!-- Confirmación de revaluación -->
  <Transition name="modal">
    <div v-if="confirmacion" class="fondo" @click.self="cancelarConfirmacion">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-revaluar">
        <div class="modal-cab">
          <span class="agarre" aria-hidden="true"></span>
          <h3 id="titulo-revaluar">Revaluar los puntos</h3>
          <p>Los puntos son un compromiso con los clientes, no una preferencia.</p>
        </div>
        <div class="modal-cuerpo">
          <p class="parrafo">{{ confirmacion.mensaje }}</p>

          <div v-if="confirmacion.impacto" class="balance">
            <div class="fila">
              <span>Clientes con puntos</span>
              <b>{{ confirmacion.impacto.clientesConPuntos }}</b>
            </div>
            <div class="fila">
              <span>Puntos en circulación</span>
              <b>{{ confirmacion.impacto.puntosEnCirculacion.toLocaleString('es-CL') }}</b>
            </div>
            <div class="fila">
              <span>Valen hoy</span>
              <b>{{ clp(confirmacion.impacto.compromisoActual) }}</b>
            </div>
            <div class="fila">
              <span>Pasarían a valer</span>
              <b>{{ clp(confirmacion.impacto.compromisoNuevo) }}</b>
            </div>
            <div class="fila total">
              <span>Diferencia</span>
              <b :class="confirmacion.impacto.diferencia > 0 ? 'sube' : 'baja'">
                {{ confirmacion.impacto.diferencia > 0 ? '+' : '' }}{{ clp(confirmacion.impacto.diferencia) }}
              </b>
            </div>
          </div>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="cancelarConfirmacion">Cancelar</button>
          <button class="btn btn-rojo" :class="{ 'btn-ocupado': guardando('club') }"
            :disabled="guardando('club')" @click="confirmarRevaluacion">
            <span v-if="guardando('club')" class="spinner" aria-hidden="true"></span>
            Entiendo, revaluar
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <Transition name="aviso">
    <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
  </Transition>
</template>

<script>
import { reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { formatearRut, rutValido } from '@/core/utils/rut'
import EsqueletoBloque from '@/shared/components/EsqueletoBloque.vue'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'

/*
 * Un hex por sección y nada más. El fondo y el texto se derivan con
 * color-mix contra los tokens del tema, así los mismos cuatro colores
 * funcionan en claro y en oscuro: antes el fondo era un valor fijo que solo
 * servía sobre blanco.
 *
 * No es decoración: en una pantalla que es toda formulario, el color es lo
 * que permite volver a "la tarjeta del club" sin leer los cuatro títulos.
 */
const LINEAS = {
  local: '#22A97E',
  ticket: '#2C7BC4',
  venta: '#C4841C',
  club: '#6C62D6'
}

const SECCIONES = ['local', 'ticket', 'venta', 'club']

/* El total del ticket de ejemplo. Estaba escrito tres veces en la plantilla
   y una de ellas hacía la resta del IVA contra ese literal. */
const TOTAL_EJEMPLO = 27990

/* Orden de claves estable: JSON.stringify sobre un proxy reactivo y sobre el
   objeto del servidor puede dar el mismo contenido en distinto orden, y eso
   marcaría la sección como editada sin que nadie la tocara. */
const sellar = (o) => JSON.stringify(
  Object.keys(o || {}).sort().map(k => [k, o[k]])
)

export default {
  name: 'ConfiguracionView',
  components: { EsqueletoBloque },

  setup () {
    const store = useStore()
    const { usarDestello, usarResalte, usarAviso, usarEsqueleto } = useTemporizadores()

    const esAdmin = computed(() => store.getters['auth/esAdmin'])
    const nombreUsuario = computed(() =>
      store.getters['auth/currentUser']?.name || 'Vendedor'
    )

    const config = computed(() => store.getters['configuracion/config'])
    const cargada = computed(() => store.getters['configuracion/cargada'])
    const cargando = computed(() => store.getters['configuracion/cargando'])
    const errorCarga = computed(() => store.getters['configuracion/error'])
    const impacto = computed(() => store.getters['configuracion/impacto'])
    const confirmacion = computed(() => store.getters['configuracion/confirmacionClub'])
    const guardando = (seccion) => store.getters['configuracion/guardandoSeccion'](seccion)

    /* Copias locales: se editan libremente y solo viajan al guardar */
    const local = reactive({ ...config.value.local })
    const ticket = reactive({ ...config.value.ticket })
    const venta = reactive({ ...config.value.venta })
    const club = reactive({ ...config.value.club })

    const copias = { local, ticket, venta, club }

    /* El sello de cada sección es lo que trajo el servidor la última vez.
       Comparar contra él dice qué está editado sin guardar. */
    const sellos = reactive({
      local: sellar(config.value.local),
      ticket: sellar(config.value.ticket),
      venta: sellar(config.value.venta),
      club: sellar(config.value.club)
    })

    const sucio = (seccion) => sellar(copias[seccion]) !== sellos[seccion]

    /*
     * Sincroniza solo lo que NO está editado. Antes el watch reasignaba las
     * cuatro secciones en cada cambio del store: guardar los datos del local
     * pisaba en silencio lo que hubiera escrito sin guardar en el club.
     */
    const sincronizar = (nueva, forzar = null) => {
      for (const s of SECCIONES) {
        if (!nueva[s]) continue
        if (forzar === s || !sucio(s)) {
          Object.assign(copias[s], nueva[s])
          sellos[s] = sellar(nueva[s])
        }
      }
    }

    watch(config, (nueva) => sincronizar(nueva), { deep: true })

    /* Descartar: vuelve a lo último que trajo el servidor */
    const revertir = (seccion) => {
      Object.assign(copias[seccion], config.value[seccion])
      sellos[seccion] = sellar(config.value[seccion])
      errores[seccion] = ''
    }

    /* ---------------- Carga ---------------- */
    const esqueleto = usarEsqueleto()
    let control = null

    onMounted(async () => {
      control = new AbortController()
      document.addEventListener('keydown', alTeclado)
      /* El esqueleto solo aparece si todavía no hay configuración: al volver
         a la pantalla con datos en el store, parpadear placeholders sobre
         datos buenos se ve peor que no hacer nada. */
      await esqueleto.envolver(
        () => store.dispatch('configuracion/cargar', { signal: control.signal, forzar: true }),
        !cargada.value
      )
    })

    onUnmounted(() => {
      control?.abort()
      document.removeEventListener('keydown', alTeclado)
      document.body.style.overflow = ''
    })

    const recargar = () => store.dispatch('configuracion/cargar', { forzar: true })

    const errores = reactive({ local: '', ticket: '', venta: '', club: '' })

    /* ---------------- Presentación ---------------- */
    const tono = (seccion) => {
      const linea = LINEAS[seccion]
      return {
        '--tono-linea': linea,
        /* Teñido sobre la superficie del tema: claro sobre claro, oscuro
           sobre oscuro. */
        '--tono-fondo': `color-mix(in srgb, ${linea} 15%, var(--surface))`,
        /* Mayoría de color de texto del tema con un tinte de la sección, para
           que contraste contra --tono-fondo en los dos temas. */
        '--tono-texto': `color-mix(in srgb, ${linea} 42%, var(--text))`
      }
    }

    /* ---------------- RUT ---------------- */
    const rutMalo = computed(() => !!local.rut && !rutValido(local.rut))
    const normalizarRut = () => {
      if (local.rut && rutValido(local.rut)) local.rut = formatearRut(local.rut)
    }

    /* ---------------- Cálculos de la vista ---------------- */
    const direccionPrevia = computed(() =>
      [local.direccion, local.comuna, local.ciudad].filter(Boolean).join(' · ')
    )

    const netoEjemplo = computed(() =>
      Math.round(TOTAL_EJEMPLO / (1 + (venta.iva || 0) / 100))
    )

    const puntosPorCompra = (monto) =>
      club.puntosPorPeso ? Math.floor(monto / club.puntosPorPeso) : 0

    const puntosEjemplo = computed(() => puntosPorCompra(TOTAL_EJEMPLO))

    /** Cuánto devuelve el club como porcentaje de lo gastado */
    const retornoPorcentaje = computed(() => {
      if (!club.puntosPorPeso || !club.valorPunto) return 0
      return (club.valorPunto / club.puntosPorPeso) * 100
    })

    /* "sáb 1 ago, 16:44": el día de la semana ubica mejor que el año.
       Se arma en dos pasadas porque el formato de una sola mete comas y
       puntos que varían entre navegadores. */
    const fmtDia = new Intl.DateTimeFormat('es-CL', {
      weekday: 'short', day: 'numeric', month: 'short'
    })
    const fmtHora = new Intl.DateTimeFormat('es-CL', {
      hour: '2-digit', minute: '2-digit', hour12: false
    })

    const actualizado = computed(() => {
      const cfg = config.value
      if (!cfg.actualizadoEn) return ''
      const d = new Date(cfg.actualizadoEn)
      const dia = fmtDia.format(d).replace(/\./g, '').replace(/,/g, '')
      const cuando = `${dia}, ${fmtHora.format(d)}`
      return cfg.actualizadoPor
        ? `Última edición: ${cfg.actualizadoPor} · ${cuando}`
        : `Última edición: ${cuando}`
    })

    /* ---------------- Feedback ---------------- */
    /* El resalte se marca con el nombre de la sección, no con un id: acá
       lo que "se guardó" es una tarjeta entera. */
    const resalte = usarResalte()
    const { aviso, avisar } = usarAviso()
    const dImpacto = usarDestello()
    const dRetorno = usarDestello()

    watch(() => impacto.value?.diferencia, dImpacto.alCambiar)
    watch(retornoPorcentaje, dRetorno.alCambiar)

    /* ---------------- Impacto del club ---------------- */
    /*
     * Se consulta mientras se escribe, no al guardar: el número tiene que
     * estar a la vista cuando se toma la decisión. El retraso evita una
     * petición por cada tecla.
     */
    let tmrImpacto = null
    watch(() => club.valorPunto, (valor) => {
      clearTimeout(tmrImpacto)
      if (!esAdmin.value || valor === config.value.club.valorPunto) {
        store.commit('configuracion/SET_IMPACTO', null)
        return
      }
      tmrImpacto = setTimeout(() => {
        store.dispatch('configuracion/consultarImpacto', valor)
      }, 500)
    })
    onUnmounted(() => clearTimeout(tmrImpacto))

    /* Con el modal abierto, el fondo no debe scrollear detrás: en iOS el
       gesto se escapa al body y la hoja parece trabada. */
    watch(confirmacion, (abierta) => {
      document.body.style.overflow = abierta ? 'hidden' : ''
    })

    const alTeclado = (e) => {
      if (e.key === 'Escape' && confirmacion.value && !guardando('club')) {
        cancelarConfirmacion()
      }
    }

    /* ---------------- Validación ---------------- */
    const validar = {
      local: () => (rutMalo.value ? 'El RUT no es válido.' : ''),
      ticket: () => '',
      venta: () => {
        const iva = Number(venta.iva)
        if (!Number.isFinite(iva) || iva < 0 || iva > 100) {
          return 'El IVA debe ser un número entre 0 y 100.'
        }
        const d = Number(venta.descuentoSinAutorizacion)
        if (!Number.isFinite(d) || d < 0) return 'El descuento no puede ser negativo.'
        return ''
      },
      /* Sin club activo las tres reglas no se aplican y no hace falta
         exigirlas: se puede apagar el club con los campos como estén. */
      club: () => {
        if (!club.activo) return ''
        if (!(club.puntosPorPeso >= 1)) return 'Indica cada cuántos pesos se otorga un punto.'
        if (!(club.valorPunto >= 1)) return 'El valor del punto debe ser al menos 1.'
        if (!(club.canjeMinimo >= 1)) return 'El canje mínimo debe ser al menos 1 punto.'
        return ''
      }
    }

    /* ---------------- Guardar ---------------- */
    const guardarSeccion = async (seccion, accion, datos) => {
      errores[seccion] = validar[seccion]()
      if (errores[seccion]) return

      try {
        await store.dispatch(`configuracion/${accion}`, datos)
        /* Se fuerza la sincronización de esta sección: acaba de guardarse, y
           el sello tiene que pasar a ser lo recién confirmado. */
        sincronizar(config.value, seccion)
        avisar('Configuración guardada')
        resalte.marcar(seccion)
      } catch (e) {
        errores[seccion] = e.message
      }
    }

    const guardarLocal = () => guardarSeccion('local', 'guardarLocal', { ...local })
    const guardarTicket = () => guardarSeccion('ticket', 'guardarTicket', { ...ticket })
    const guardarVenta = () => guardarSeccion('venta', 'guardarVenta', { ...venta })

    const guardarClub = async () => {
      errores.club = validar.club()
      if (errores.club) return

      try {
        const resultado = await store.dispatch('configuracion/guardarClub', {
          datos: { ...club }, confirmar: false
        })
        /* 'requiere-confirmacion' abre el modal; el aviso sale al confirmar */
        if (resultado === 'guardado') {
          sincronizar(config.value, 'club')
          avisar('Reglas del club guardadas')
          resalte.marcar('club')
        }
      } catch (e) {
        errores.club = e.message
      }
    }

    const confirmarRevaluacion = async () => {
      try {
        await store.dispatch('configuracion/guardarClub', {
          datos: confirmacion.value.datos, confirmar: true
        })
        sincronizar(config.value, 'club')
        avisar('Puntos revaluados')
        resalte.marcar('club')
      } catch (e) {
        errores.club = e.message
        store.dispatch('configuracion/cancelarConfirmacionClub')
      }
    }

    const cancelarConfirmacion = () => store.dispatch('configuracion/cancelarConfirmacionClub')

    /* ---------------- Varios ---------------- */
    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    return {
      TOTAL_EJEMPLO,
      esAdmin, nombreUsuario, cargada, cargando, errorCarga, recargar,
      local, ticket, venta, club, errores, tono,
      sucio, revertir,
      rutMalo, normalizarRut,
      direccionPrevia, netoEjemplo, puntosEjemplo, puntosPorCompra,
      retornoPorcentaje, actualizado, impacto,
      esqueleto, resalte, dImpacto, dRetorno,
      guardando, guardarLocal, guardarTicket, guardarVenta, guardarClub,
      confirmacion, confirmarRevaluacion, cancelarConfirmacion,
      clp, aviso
    }
  }
}
</script>

<style scoped>
/* ==========================================================================
   MOBILE FIRST — consume los tokens globales (tokens.css), no define ninguno.
   La única excepción es la vista previa del ticket: ahí el papel es blanco y
   la tinta negra en los dos temas, porque simula una impresión.
   Puntos de quiebre: 600 (teléfono grande) · 1100 (dos columnas).
   ========================================================================== */

/* Universal y no una lista de contenedores: la lista se olvida de alguno
   y ahí `min-height` deja de medir la caja completa y el padding se suma
   encima. Al estar el estilo scoped, el `*` alcanza solo a este componente. */
*,
*::before,
*::after {
  box-sizing: border-box;
}

/* Una sola altura para todo control tocable. Con números sueltos por
   control, una fila de campos queda escalonada. */
.columnas,
.modal {
  --alto-control: 48px;
}

.btn,
.interruptor,
.campo {
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

.min0 { min-width: 0; }

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

/* Guardado: la tarjeta que se acaba de guardar se enciende con su propio
   tono. El aviso dice qué pasó; esto dice dónde. */
@keyframes resalta {
  0% { box-shadow: 0 0 0 3px var(--tono-linea); }
  100% { box-shadow: 0 0 0 3px transparent; }
}

.tarjeta.resaltada {
  animation: resalta 1400ms ease-out;
}

/* Destello de un número que se recalculó solo */
@keyframes destello {
  0% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.destella {
  display: inline-block;
  animation: destello 460ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* Bloques que aparecen a mitad de flujo: errores, avisos de impacto,
   notas de alerta que dependen de lo que se está escribiendo. */
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

/* Reemplazo de bloques excluyentes */
.cambio-enter-active {
  transition: opacity 0.16s ease, transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

.cambio-leave-active { transition: opacity 0.1s ease; }

.cambio-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

.cambio-leave-to { opacity: 0; }

/* Modal */
.modal-enter-active,
.modal-leave-active { transition: opacity 0.18s ease; }

.modal-enter-from,
.modal-leave-to { opacity: 0; }

.modal-enter-active .modal { transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1); }
.modal-leave-active .modal { transition: transform 0.16s ease; }

/* En móvil la hoja sube desde abajo, que es de donde viene el componente */
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

.btn-rojo.btn-ocupado:disabled {
  background: var(--danger);
}

/* ---------- Cabecera ---------- */
.cabecera {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
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
  margin: 5px 0 0;
  font-size: 0.9rem;
  color: var(--text-muted);
  max-width: 60ch;
  line-height: 1.5;
}

.sello {
  margin: 0;
  font-size: 0.82rem;
}

.suave { color: var(--text-muted); }

.banda {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 13px 16px;
  border-radius: var(--r-sm, 10px);
  margin-bottom: 16px;
  font-size: 0.95rem;
  line-height: 1.45;
}

.banda .ico {
  width: 20px;
  height: 20px;
}

.banda-aviso {
  background: var(--warn-soft);
  border: 1px solid var(--warn);
  color: var(--text);
}

.banda-aviso .ico { color: var(--warn); }

/* ---------- Tarjetas ---------- */
.columnas {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  align-items: start;
}

.tarjeta {
  background: var(--surface);
  border: 1px solid var(--border);
  border-top: 3px solid var(--tono-linea);
  border-radius: var(--r-lg, 14px);
  padding: 18px 16px;
}

.tarjeta-cab {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

/* El emblema repite el tono de la sección: se reconoce de un vistazo
   cuál de las cuatro tarjetas se está mirando. */
.emblema {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--r-md, 12px);
  background: var(--tono-fondo);
  color: var(--tono-texto);
}

.emblema .ico {
  width: 22px;
  height: 22px;
}

.tarjeta h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--tono-texto);
}

.sub {
  margin: 3px 0 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Cuatro formularios en una pantalla y un botón de guardar cada uno: sin
   esto no había forma de saber cuál quedó a medias. */
.pendiente {
  flex-shrink: 0;
  align-self: flex-start;
  padding: 3px 10px;
  border-radius: var(--r-full, 999px);
  background: var(--warn-soft);
  color: var(--warn);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

/* ---------- Formulario ---------- */
/* Etiquetas en minúscula y tamaño normal. El gris claro en mayúsculas de
   10px es de lo menos legible que hay, sobre todo a cierta edad. */
label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-muted);
}

.campo {
  width: 100%;
  min-height: var(--alto-control, 48px);
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm, 10px);
  background: var(--surface);
  font-family: inherit;
  /* 16px mínimos: por debajo, iOS hace zoom al enfocar y descuadra todo */
  font-size: max(0.95rem, 16px);
  color: var(--text);
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.campo:focus {
  border-color: var(--tono-linea);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--tono-linea) 30%, transparent);
}

.campo:disabled {
  background: var(--surface-2);
  color: var(--text-faint);
}

.campo-malo { border-color: var(--danger); }

.campo-malo:focus {
  border-color: var(--danger);
  box-shadow: 0 0 0 3px var(--danger-soft);
}

.grupo { margin-bottom: 16px; }

.rejilla {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.ayuda {
  margin: 7px 0 0;
  font-size: 0.85rem;
  color: var(--text-faint);
  line-height: 1.5;
}

.ayuda.mala { color: var(--danger); }

.ayuda.separado { margin-bottom: 16px; }

.dato { font-variant-numeric: tabular-nums; }

.chica { font-size: 0.85rem; }

/* Que el compromiso suba es lo que hay que mirar; que baje, no. */
.sube { color: var(--warn); }
.baja { color: var(--success); }

/* La casilla es una caja tocable completa, no un cuadradito de 18px con
   texto al lado: acertarle a 18px en un teléfono es un problema real. */
.interruptor {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: var(--alto-control, 48px);
  padding: 10px 14px;
  margin-bottom: 8px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm, 10px);
  background: var(--surface);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
  cursor: pointer;
  transition: border-color 0.18s, background-color 0.18s;
}

.interruptor:has(input:checked) {
  border-color: var(--tono-linea);
  background: var(--tono-fondo);
  color: var(--tono-texto);
}

.interruptor.apagado {
  cursor: default;
  opacity: 0.7;
}

.interruptor input {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  accent-color: var(--tono-linea);
  cursor: pointer;
}

/* ---------- Mensajes ---------- */
.error {
  padding: 11px 14px;
  margin-bottom: 14px;
  border-radius: 0 var(--r-sm, 8px) var(--r-sm, 8px) 0;
  border-left: 4px solid var(--danger);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 0.9rem;
  line-height: 1.45;
}

.error.suelto {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 0;
}

.nota {
  padding: 12px 14px;
  margin: 14px 0;
  border-radius: 0 var(--r-sm, 8px) var(--r-sm, 8px) 0;
  border-left: 3px solid var(--tono-linea);
  background: var(--tono-fondo);
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.6;
}

/* La alerta rompe el tono de la sección a propósito: si se avisa de un
   riesgo, no debe parecer parte del decorado de la tarjeta. */
.nota.alerta {
  border-color: var(--warn);
  background: var(--warn-soft);
  color: var(--text);
}

.parrafo {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-muted);
}

/* ---------- Botones ---------- */
.pie-tarjeta {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: var(--alto-control, 48px);
  padding: 0.65rem 1.15rem;
  border: none;
  border-radius: var(--r-sm, 10px);
  /* Antes era un verde propio de esta pantalla: el único botón primario del
     sistema que no usaba el acento. Si el verde era de marca, es esta línea
     la que vuelve atrás. */
  background: var(--accent);
  color: var(--accent-contrast);
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.btn:hover:not(:disabled) { background: var(--accent-hover); }

.btn:active:not(:disabled) { transform: scale(0.985); }

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-linea {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.btn-linea:hover:not(:disabled) {
  background: var(--surface-2);
  color: var(--text);
}

.btn-mini {
  min-height: 44px;
  padding: 0.35rem 0.85rem;
  font-size: 0.9rem;
}

.btn-rojo { background: var(--danger); }

.btn-rojo:hover:not(:disabled) {
  background: var(--danger);
  filter: brightness(0.92);
}

.ancho {
  flex: 1;
  min-width: 0;
}

/* ---------- Vista previa del ticket ----------
   Papel blanco y tinta negra en los dos temas: no es una superficie de la
   interfaz, es una simulación de lo que sale por la impresora térmica. */
.previa {
  margin-top: 18px;
  padding: 16px;
  background: var(--surface-2);
  border-radius: var(--r-md, 12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.previa-rot {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.ticket {
  width: 100%;
  max-width: 264px;
  padding: 14px;
  background: #fff;
  color: #000;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.72rem;
  line-height: 1.45;
  box-shadow: var(--shadow-lg);
}

.ticket .cen { text-align: center; }

.ticket .logo { font-size: 1.6rem; }

.ticket h4 {
  margin: 4px 0 2px;
  font-size: 0.82rem;
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  overflow-wrap: break-word;
}

.ticket .chico {
  font-size: 0.66rem;
  overflow-wrap: break-word;
}

.ticket .sep {
  border-top: 1px dashed #000;
  margin: 7px 0;
}

.ticket .atencion {
  border: 1px solid #000;
  padding: 5px;
  margin: 6px 0;
}

.ticket .atencion b {
  display: block;
  font-size: 1.2rem;
}

.ticket table {
  width: 100%;
  border-collapse: collapse;
}

.ticket td {
  padding: 2px 0;
  font-size: 0.68rem;
  vertical-align: top;
}

.ticket .der { text-align: right; }

.ticket .tot {
  display: flex;
  justify-content: space-between;
}

.ticket .tot.g {
  font-size: 0.92rem;
  font-weight: 700;
  border-top: 1px solid #000;
  margin-top: 4px;
  padding-top: 4px;
}

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
  font-size: 1.15rem;
  color: var(--text);
}

.modal-cab p {
  margin: 5px 0 0;
  font-size: 0.9rem;
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

.balance {
  margin-top: 16px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm, 10px);
  overflow: hidden;
}

.balance .fila {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 14px;
  font-size: 0.9rem;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}

.balance .fila:last-child { border-bottom: 0; }

.balance .fila b {
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.balance .fila.total {
  background: var(--surface-2);
  font-weight: 600;
}

/* ---------- Esqueleto ---------- */
.sep-8 { margin-top: 8px; }
.sep-12 { margin-top: 12px; }
.sep-18 { margin-top: 18px; }

/* ---------- Aviso ---------- */
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
  font-size: 0.95rem;
  font-weight: 600;
  box-shadow: var(--shadow-lg);
  text-align: center;
}

.aviso.malo { background: var(--danger); }

/* ==========================================================================
   ≥ 600px — teléfono grande y tablet
   ========================================================================== */
@media (min-width: 600px) {
  .cabecera {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    flex-wrap: wrap;
  }

  .cabecera h2 { font-size: 1.5rem; }

  .tarjeta { padding: 20px; }

  .rejilla { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }

  .pie-tarjeta { justify-content: flex-end; }

  .ancho {
    flex: 0 0 auto;
    min-width: 220px;
  }

  .fondo {
    align-items: center;
    padding: 20px;
  }

  .modal {
    max-width: 460px;
    max-height: 88dvh;
    border-radius: var(--r-lg, 14px);
  }

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
   ≥ 1100px — dos columnas
   El corte va acá y no en 900: con 320px de mínimo, dos tarjetas de
   formulario en una pantalla de 1000px quedan demasiado angostas para
   las rejillas de dos campos.
   ========================================================================== */
@media (min-width: 1100px) {
  .columnas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {

  .btn,
  .campo,
  .interruptor { transition: none; }

  .al-entrar,
  .tarjeta.resaltada,
  .destella,
  .spinner { animation: none; }

  .desliza-enter-active,
  .desliza-leave-active,
  .cambio-enter-active,
  .cambio-leave-active,
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal,
  .modal-leave-active .modal,
  .aviso-enter-active,
  .aviso-leave-active { transition: none; }
}
</style>