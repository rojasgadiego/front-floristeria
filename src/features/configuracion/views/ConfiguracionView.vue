<template>
  <MainLayout>

    <div class="cabecera al-entrar">
      <div class="titulo">
        <h2>Configuración</h2>
        <p class="pista">Datos del local, parámetros de venta y reglas del club.</p>
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
            <div>
              <h3>Datos del local</h3>
              <p class="sub">Aparecen en la cabecera de cada ticket.</p>
            </div>
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

          <button v-if="esAdmin" class="btn ancho" :class="{ 'btn-ocupado': guardando('local') }"
            :disabled="guardando('local') || rutMalo" @click="guardarLocal">
            <span v-if="guardando('local')" class="spinner" aria-hidden="true"></span>
            {{ guardando('local') ? 'Guardando…' : 'Guardar datos del local' }}
          </button>
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
            <div>
              <h3>Ticket</h3>
              <p class="sub">Lo que se imprime al cobrar.</p>
            </div>
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

          <button v-if="esAdmin" class="btn ancho" :class="{ 'btn-ocupado': guardando('ticket') }"
            :disabled="guardando('ticket')" @click="guardarTicket">
            <span v-if="guardando('ticket')" class="spinner" aria-hidden="true"></span>
            {{ guardando('ticket') ? 'Guardando…' : 'Guardar textos del ticket' }}
          </button>

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
              <div class="tot"><span>IVA {{ venta.iva }}%</span><span>{{ clp(27990 - netoEjemplo) }}</span></div>
              <div class="tot g"><span>TOTAL</span><span>$27.990</span></div>
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
            <div>
              <h3>Parámetros de venta</h3>
              <p class="sub">Afectan el cálculo de las boletas nuevas.</p>
            </div>
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

          <button v-if="esAdmin" class="btn ancho" :class="{ 'btn-ocupado': guardando('venta') }"
            :disabled="guardando('venta')" @click="guardarVenta">
            <span v-if="guardando('venta')" class="spinner" aria-hidden="true"></span>
            {{ guardando('venta') ? 'Guardando…' : 'Guardar parámetros' }}
          </button>
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
            <div>
              <h3>Club de puntos</h3>
              <p class="sub">Reglas de acumulación y canje.</p>
            </div>
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

          <button v-if="esAdmin" class="btn ancho" :class="{ 'btn-ocupado': guardando('club') }"
            :disabled="guardando('club')" @click="guardarClub">
            <span v-if="guardando('club')" class="spinner" aria-hidden="true"></span>
            {{ guardando('club') ? 'Guardando…' : 'Guardar reglas del club' }}
          </button>
        </section>
      </div>
    </Transition>

    <!-- Confirmación de revaluación -->
    <Transition name="modal">
      <div v-if="confirmacion" class="fondo" @click.self="cancelarConfirmacion">
        <div class="modal">
          <div class="modal-cab">
            <span class="agarre" aria-hidden="true"></span>
            <h3>Revaluar los puntos</h3>
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
  </MainLayout>
</template>

<script>
import { reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { formatearRut, rutValido } from '@/core/utils/rut'
import MainLayout from '@/layouts/MainLayout.vue'
import EsqueletoBloque from '@/shared/components/EsqueletoBloque.vue'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'

/*
 * Un tono por sección. No es decoración: en una pantalla que es toda
 * formulario, el color es lo que permite volver a "la tarjeta del club"
 * sin leer los cuatro títulos. Mismo criterio que el color por rol en
 * Equipo y accesos.
 */
const TONOS = {
  local: { linea: '#1D9E75', fondo: '#E1F5EE', texto: '#0F6E56', oscuro: '#04342C' },
  ticket: { linea: '#185FA5', fondo: '#E6F1FB', texto: '#0C447C', oscuro: '#042C53' },
  venta: { linea: '#BA7517', fondo: '#FAEEDA', texto: '#854F0B', oscuro: '#412402' },
  club: { linea: '#534AB7', fondo: '#EEEDFE', texto: '#3C3489', oscuro: '#26215C' }
}

export default {
  name: 'ConfiguracionView',
  components: { MainLayout, EsqueletoBloque },

  setup() {
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

    /* Cuando el servidor responde, las copias se sincronizan */
    watch(config, (nueva) => {
      Object.assign(local, nueva.local)
      Object.assign(ticket, nueva.ticket)
      Object.assign(venta, nueva.venta)
      Object.assign(club, nueva.club)
    }, { deep: true })

    /* ---------------- Carga ---------------- */
    const esqueleto = usarEsqueleto()
    let control = null

    onMounted(async () => {
      control = new AbortController()
      /* El esqueleto solo aparece si todavía no hay configuración: al volver
         a la pantalla con datos en el store, parpadear placeholders sobre
         datos buenos se ve peor que no hacer nada. */
      await esqueleto.envolver(
        () => store.dispatch('configuracion/cargar', { signal: control.signal, forzar: true }),
        !cargada.value
      )
    })
    onUnmounted(() => control?.abort())

    const recargar = () => store.dispatch('configuracion/cargar', { forzar: true })

    const errores = reactive({ local: '', ticket: '', venta: '', club: '' })

    /* ---------------- Presentación ---------------- */
    const tono = (seccion) => {
      const t = TONOS[seccion]
      return {
        '--tono-linea': t.linea, '--tono-fondo': t.fondo,
        '--tono-texto': t.texto, '--tono-oscuro': t.oscuro
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

    const netoEjemplo = computed(() => Math.round(27990 / (1 + (venta.iva || 0) / 100)))

    const puntosPorCompra = (monto) =>
      club.puntosPorPeso ? Math.floor(monto / club.puntosPorPeso) : 0

    const puntosEjemplo = computed(() => puntosPorCompra(27990))

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
    onUnmounted(() => { document.body.style.overflow = '' })

    /* ---------------- Guardar ---------------- */
    const guardarSeccion = async (seccion, accion, datos) => {
      errores[seccion] = ''
      try {
        await store.dispatch(`configuracion/${accion}`, datos)
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
      errores.club = ''
      try {
        const resultado = await store.dispatch('configuracion/guardarClub', {
          datos: { ...club }, confirmar: false
        })
        /* 'requiere-confirmacion' abre el modal; el aviso sale al confirmar */
        if (resultado === 'guardado') {
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
      esAdmin, nombreUsuario, cargada, cargando, errorCarga, recargar,
      local, ticket, venta, club, errores, tono,
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
   MOBILE FIRST
   La base es el teléfono; los @media son todos de min-width.
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

.cambio-leave-active {
  transition: opacity 0.1s ease;
}

.cambio-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

.cambio-leave-to {
  opacity: 0;
}

/* Modal */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal {
  transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.modal-leave-active .modal {
  transition: transform 0.16s ease;
}

/* En móvil la hoja sube desde abajo, que es de donde viene el componente */
.modal-enter-from .modal {
  transform: translateY(40px);
}

.modal-leave-to .modal {
  transform: translateY(20px);
}

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
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: girar 0.8s linear infinite;
}

.btn-ocupado:disabled {
  background: #0f6e56;
  opacity: 0.78;
  cursor: wait;
}

.btn-rojo.btn-ocupado:disabled {
  background: #A32D2D;
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
  color: #0f172a;
}

.pista {
  margin: 5px 0 0;
  font-size: 0.9rem;
  color: #64748b;
  max-width: 60ch;
  line-height: 1.5;
}

.sello {
  margin: 0;
  font-size: 0.82rem;
}

.suave {
  color: #64748b;
}

.banda {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 13px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 0.95rem;
  line-height: 1.45;
}

.banda .ico {
  width: 20px;
  height: 20px;
}

.banda-aviso {
  background: #FAEEDA;
  border: 1px solid #EF9F27;
  color: #633806;
}

/* ---------- Tarjetas ---------- */
.columnas {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  align-items: start;
}

.tarjeta {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-top: 3px solid var(--tono-linea);
  border-radius: 14px;
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
  border-radius: 12px;
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
  color: var(--tono-oscuro);
}

.sub {
  margin: 3px 0 0;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.4;
}

/* ---------- Formulario ---------- */
/* Etiquetas en minúscula y tamaño normal. El gris claro en mayúsculas de
   10px es de lo menos legible que hay, sobre todo a cierta edad. */
label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #475569;
}

.campo {
  width: 100%;
  min-height: var(--alto-control, 48px);
  padding: 0.6rem 0.8rem;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  font-family: inherit;
  /* 16px mínimos: por debajo, iOS hace zoom al enfocar y descuadra todo */
  font-size: max(0.95rem, 16px);
  color: #0f172a;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.campo:focus {
  border-color: transparent;
  box-shadow: 0 0 0 2px var(--tono-linea);
}

.campo:disabled {
  background: #f8fafc;
  color: #94a3b8;
}

.campo-malo {
  border-color: #dc2626;
}

.campo-malo:focus {
  box-shadow: 0 0 0 2px #dc2626;
}

.grupo {
  margin-bottom: 16px;
}

.rejilla {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.ayuda {
  margin: 7px 0 0;
  font-size: 0.85rem;
  color: #94a3b8;
  line-height: 1.5;
}

.ayuda.mala {
  color: #dc2626;
}

.ayuda.separado {
  margin-bottom: 16px;
}

.dato {
  font-variant-numeric: tabular-nums;
}

.chica {
  font-size: 0.85rem;
}

.sube {
  color: #A35A0B;
}

.baja {
  color: #0F6E56;
}

/* La casilla es una caja tocable completa, no un cuadradito de 18px con
   texto al lado: acertarle a 18px en un teléfono es un problema real. */
.interruptor {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: var(--alto-control, 48px);
  padding: 10px 14px;
  margin-bottom: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.4;
  cursor: pointer;
  transition: border-color 0.18s, background-color 0.18s;
}

.interruptor:has(input:checked) {
  border-color: var(--tono-linea);
  background: var(--tono-fondo);
  color: var(--tono-oscuro);
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
  border-radius: 0 8px 8px 0;
  border-left: 4px solid #dc2626;
  background: #fee2e2;
  color: #991b1b;
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
  border-radius: 0 8px 8px 0;
  border-left: 3px solid var(--tono-linea);
  background: var(--tono-fondo);
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.6;
}

/* La alerta rompe el tono de la sección a propósito: si se avisa de un
   riesgo, no debe parecer parte del decorado de la tarjeta. */
.nota.alerta {
  border-color: #EF9F27;
  background: #FAEEDA;
  color: #633806;
}

.parrafo {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: #475569;
}

/* ---------- Botones ---------- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: var(--alto-control, 48px);
  padding: 0.65rem 1.15rem;
  border: none;
  border-radius: 10px;
  background: #0f6e56;
  color: #fff;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.btn:hover:not(:disabled) {
  background: #085041;
}

.btn:active:not(:disabled) {
  transform: scale(0.985);
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
  min-height: 44px;
  padding: 0.35rem 0.85rem;
  font-size: 0.9rem;
}

.btn-rojo {
  background: #A32D2D;
}

.btn-rojo:hover:not(:disabled) {
  background: #7E2020;
}

.ancho {
  width: 100%;
  margin-top: 4px;
}

/* ---------- Vista previa del ticket ---------- */
.previa {
  margin-top: 18px;
  padding: 16px;
  background: #f1f5f9;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.previa-rot {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
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
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.ticket .cen {
  text-align: center;
}

.ticket .logo {
  font-size: 1.6rem;
}

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

.ticket .der {
  text-align: right;
}

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
  background: rgba(15, 23, 42, 0.55);
}

.modal {
  width: 100%;
  /* dvh evita el salto cuando la barra del navegador se esconde */
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.3);
}

.agarre {
  display: block;
  width: 38px;
  height: 4px;
  margin: 0 auto 12px;
  border-radius: 999px;
  background: #e2e8f0;
}

.modal-cab {
  padding: 10px 18px 14px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-cab h3 {
  margin: 0;
  font-size: 1.15rem;
  color: #0f172a;
}

.modal-cab p {
  margin: 5px 0 0;
  font-size: 0.9rem;
  line-height: 1.45;
  color: #64748b;
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
  border-top: 1px solid #e2e8f0;
}

.modal-pie .btn {
  flex: 1 1 0;
}

.balance {
  margin-top: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

.balance .fila {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 14px;
  font-size: 0.9rem;
  color: #475569;
  border-bottom: 1px solid #f1f5f9;
}

.balance .fila:last-child {
  border-bottom: 0;
}

.balance .fila b {
  font-variant-numeric: tabular-nums;
  color: #0f172a;
}

.balance .fila.total {
  background: #f8fafc;
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
  border-radius: 10px;
  background: #04342c;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
  text-align: center;
}

.aviso.malo {
  background: #b91c1c;
}

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

  .cabecera h2 {
    font-size: 1.5rem;
  }

  .tarjeta {
    padding: 20px;
  }

  .rejilla {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  .ancho {
    width: auto;
    min-width: 220px;
  }

  .fondo {
    align-items: center;
    padding: 20px;
  }

  .modal {
    max-width: 460px;
    max-height: 88dvh;
    border-radius: 14px;
  }

  /* Acá el diálogo no "sube": aparece apenas más chico y centrado */
  .modal-enter-from .modal {
    transform: translateY(18px) scale(0.97);
  }

  .modal-leave-to .modal {
    transform: translateY(8px) scale(0.98);
  }

  .agarre {
    display: none;
  }

  .modal-cab {
    padding-top: 18px;
  }

  .modal-pie {
    justify-content: flex-end;
    padding-bottom: 14px;
  }

  .modal-pie .btn {
    flex: 0 0 auto;
  }

  .aviso {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    max-width: 90vw;
  }

  .aviso-enter-from,
  .aviso-leave-to {
    transform: translate(-50%, 16px);
  }
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
  .interruptor {
    transition: none;
  }

  .al-entrar,
  .tarjeta.resaltada,
  .destella,
  .spinner {
    animation: none;
  }

  .desliza-enter-active,
  .desliza-leave-active,
  .cambio-enter-active,
  .cambio-leave-active,
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal,
  .modal-leave-active .modal,
  .aviso-enter-active,
  .aviso-leave-active {
    transition: none;
  }
}
</style>