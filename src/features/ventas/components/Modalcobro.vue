<template>
  <div class="fondo" @click.self="$emit('cerrar')">
    <div class="modal">
      <div class="modal-cab">
        <h3>Cobrar</h3>
        <p>{{ unidades }} unidad(es) · {{ carrito.length }} línea(s)</p>
      </div>

      <div class="modal-cuerpo">
        <div v-if="error" class="error">{{ error }}</div>

        <!-- ================= Medio de pago ================= -->
        <div class="grupo">
          <label>¿Cómo paga?</label>
          <div class="medios">
            <button v-for="m in MEDIOS_PAGO" :key="m.valor" type="button" class="medio"
              :class="{ on: medioPago === m.valor }" @click="elegirMedio(m.valor)">
              <span class="icono" aria-hidden="true">{{ m.icono }}</span>
              <span>{{ m.texto }}</span>
            </button>
          </div>
        </div>

        <!-- ================= Efectivo ================= -->
        <div v-if="medioPago === 'efectivo'" class="grupo">
          <label for="c-recibido">¿Con cuánto paga?</label>
          <input id="c-recibido" ref="campoRecibido" class="campo grande dato" type="number"
            min="0" step="1000" v-model.number="recibido" @keyup.enter="cobrar">

          <!-- Los billetes que existen en Chile, más el monto exacto: cubre
               casi todos los casos sin tipear. -->
          <div class="billetes">
            <button class="chip-boton" @click="recibido = totalEstimado">Justo</button>
            <button v-for="b in billetesUtiles" :key="b" class="chip-boton" @click="recibido = b">
              {{ clp(b) }}
            </button>
          </div>

          <div class="vuelto" :class="{ falta: faltaEfectivo }">
            <span>{{ faltaEfectivo ? 'Falta' : 'Vuelto' }}</span>
            <b class="dato grande">{{ clp(faltaEfectivo ? -vuelto : vuelto) }}</b>
          </div>
        </div>

        <!-- ================= Puntos ================= -->
        <div v-if="cliente && clubActivo" class="grupo">
          <div class="seccion-cab">
            <label>Puntos de {{ primerNombre }}</label>
            <span class="mini suave">
              tiene {{ cliente.puntos }} · valen {{ clp(cliente.puntos * valorPunto) }}
            </span>
          </div>

          <div v-if="cliente.puntos < canjeMinimo" class="mini suave">
            Necesita {{ canjeMinimo }} puntos para canjear.
          </div>

          <template v-else>
            <div class="fila-canje">
              <input class="campo dato" type="number" min="0" :max="maxCanjeable"
                :step="canjeMinimo" v-model.number="puntos">
              <button class="btn btn-linea btn-mini" @click="puntos = maxCanjeable">
                Todo ({{ maxCanjeable }})
              </button>
              <button v-if="puntos" class="btn btn-linea btn-mini" @click="puntos = 0">Nada</button>
            </div>
            <p class="ayuda">
              Descuenta {{ clp(descuentoCanje) }}.
              <span v-if="puntos && puntos < canjeMinimo" class="mala">
                El mínimo de canje es {{ canjeMinimo }}.
              </span>
            </p>
          </template>
        </div>

        <!-- ================= Descuento manual ================= -->
        <div class="grupo">
          <div class="seccion-cab">
            <label for="c-desc">Descuento a mano</label>
            <span class="mini suave">
              hasta {{ clp(umbral) }} sin autorización
            </span>
          </div>
          <input id="c-desc" class="campo dato" type="number" min="0" step="500"
            v-model.number="descuento">

          <input v-if="descuento > 0" class="campo motivo" v-model="motivo" maxlength="200"
            placeholder="Motivo del descuento">

          <!--
            Sobre el umbral hay que verificar credenciales contra la base. No
            alcanza con que la pantalla diga que alguien autorizó: subir el
            tope de descuento es el atajo más rentable para vaciar un punto
            de venta.
          -->
          <div v-if="necesitaAutorizacion" class="autorizacion">
            <div class="auth-cab">
              <span aria-hidden="true">🔐</span>
              <b>Este descuento necesita autorización</b>
            </div>
            <p class="ayuda">
              Pídele a una administradora que ingrese sus credenciales. Se
              verifican en el servidor y quedan registradas en la boleta.
            </p>
            <div class="rejilla">
              <input class="campo" type="email" v-model="auth.email" placeholder="Correo"
                autocomplete="off">
              <input class="campo" type="password" v-model="auth.password" placeholder="Contraseña"
                autocomplete="off" @keyup.enter="cobrar">
            </div>
          </div>
        </div>

        <!-- ================= Totales ================= -->
        <div class="totales">
          <div class="linea"><span>Productos</span><b class="dato">{{ clp(bruto) }}</b></div>
          <div v-if="descuentoPromo" class="linea verde">
            <span>{{ promocionElegida?.nombre }}</span>
            <b class="dato">−{{ clp(descuentoPromo) }}</b>
          </div>
          <div v-if="descuentoCanje" class="linea verde">
            <span>{{ puntos }} puntos</span>
            <b class="dato">−{{ clp(descuentoCanje) }}</b>
          </div>
          <div v-if="descuento" class="linea verde">
            <span>Descuento a mano</span>
            <b class="dato">−{{ clp(descuento) }}</b>
          </div>
          <div class="linea total">
            <span>Total</span>
            <b class="dato grande">{{ clp(totalEstimado) }}</b>
          </div>
        </div>

        <!--
          El servidor arma el total de cero al cobrar: lee los precios de la
          base y recalcula la promoción. Lo de arriba es una estimación para
          poder decir un número en voz alta.
        -->
        <p class="ayuda">
          El total definitivo lo calcula el servidor con los precios vigentes.
        </p>
      </div>

      <div class="modal-pie">
        <button class="btn btn-linea" :disabled="cobrando" @click="$emit('cerrar')">Cancelar</button>
        <button class="btn grande" :disabled="!puedeCobrar || cobrando" @click="cobrar">
          <span v-if="cobrando" class="spinner" aria-hidden="true"></span>
          {{ cobrando ? 'Cobrando…' : `Cobrar ${clp(totalEstimado)}` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import { MEDIOS_PAGO } from '@/features/ventas/store/ventas.module'

/* Los billetes que circulan en Chile. Ofrecer los que superan el total
   cubre casi todos los pagos sin que nadie tipee. */
const BILLETES = [1000, 2000, 5000, 10000, 20000]

export default {
  name: 'ModalCobro',
  emits: ['cerrar', 'cobrada'],

  setup (_, { emit }) {
    const store = useStore()

    const carrito = computed(() => store.getters['ventas/carrito'])
    const unidades = computed(() => store.getters['ventas/unidades'])
    const bruto = computed(() => store.getters['ventas/bruto'])
    const descuentoPromo = computed(() => store.getters['ventas/descuentoPromo'])
    const promocionElegida = computed(() => store.getters['ventas/promocionElegida'])
    const cliente = computed(() => store.getters['ventas/cliente'])
    const cobrando = computed(() => store.getters['ventas/cobrando'])

    const valorPunto = computed(() => store.getters['configuracion/valorPunto'] || 0)
    const clubActivo = computed(() => store.getters['configuracion/clubActivo'])
    const canjeMinimo = computed(() => store.getters['configuracion/club']?.canjeMinimo || 1)
    const umbral = computed(() =>
      store.getters['configuracion/venta']?.descuentoSinAutorizacion ?? 0
    )

    const medioPago = ref('efectivo')
    const recibido = ref(null)
    const puntos = ref(0)
    const descuento = ref(0)
    const motivo = ref('')
    const auth = reactive({ email: '', password: '' })
    const error = ref('')
    const campoRecibido = ref(null)

    onMounted(async () => {
      await nextTick()
      campoRecibido.value?.focus()
    })

    /* ---------------- Puntos ---------------- */
    /* No se puede canjear más de lo que cubre la compra: descontar de más
       dejaría un total negativo y le regalaría puntos al aire. */
    const maxCanjeable = computed(() => {
      if (!cliente.value || !valorPunto.value) return 0
      const topePorCompra = Math.floor(
        Math.max(0, bruto.value - descuentoPromo.value) / valorPunto.value
      )
      return Math.min(cliente.value.puntos, topePorCompra)
    })

    const descuentoCanje = computed(() => (puntos.value || 0) * valorPunto.value)

    /* ---------------- Totales ---------------- */
    const totalEstimado = computed(() => Math.max(
      0,
      bruto.value - descuentoPromo.value - descuentoCanje.value - (descuento.value || 0)
    ))

    const vuelto = computed(() => (recibido.value || 0) - totalEstimado.value)
    const faltaEfectivo = computed(() =>
      medioPago.value === 'efectivo' && recibido.value != null && vuelto.value < 0
    )

    const billetesUtiles = computed(() => {
      const t = totalEstimado.value
      /* Solo los billetes que alcanzan, más el redondeo al siguiente diez mil */
      const utiles = BILLETES.filter(b => b > t)
      const redondeo = Math.ceil(t / 10000) * 10000
      if (redondeo > t && !utiles.includes(redondeo)) utiles.push(redondeo)
      return utiles.sort((a, b) => a - b).slice(0, 4)
    })

    /* ---------------- Autorización ---------------- */
    const necesitaAutorizacion = computed(() =>
      (descuento.value || 0) > umbral.value
    )

    const puedeCobrar = computed(() => {
      if (!carrito.value.length) return false
      if (medioPago.value === 'efectivo' && recibido.value != null && vuelto.value < 0) return false
      if (descuento.value > 0 && !motivo.value.trim()) return false
      if (necesitaAutorizacion.value && (!auth.email || !auth.password)) return false
      if (puntos.value > 0 && puntos.value < canjeMinimo.value) return false
      return true
    })

    const elegirMedio = (valor) => {
      medioPago.value = valor
      if (valor !== 'efectivo') recibido.value = null
    }

    /* ---------------- Cobrar ---------------- */
    const cobrar = async () => {
      if (!puedeCobrar.value || cobrando.value) return
      error.value = ''

      store.dispatch('ventas/aplicarDescuento', {
        monto: descuento.value || 0,
        motivo: motivo.value
      })
      store.dispatch('ventas/canjearPuntos', puntos.value || 0)

      try {
        const venta = await store.dispatch('ventas/cobrar', {
          medioPago: medioPago.value,
          recibido: medioPago.value === 'efectivo' ? recibido.value : null,
          autorizacion: necesitaAutorizacion.value
            ? { email: auth.email.trim(), password: auth.password }
            : null
        })
        emit('cobrada', venta)
      } catch (e) {
        /* El 403 es credenciales que no corresponden a una administradora;
           el 400, stock o caja. Los dos mensajes vienen redactados. */
        error.value = e.message
        auth.password = ''
      }
    }

    const primerNombre = computed(() =>
      (cliente.value?.nombre || '').split(' ')[0] || 'el cliente'
    )

    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    return {
      MEDIOS_PAGO,
      carrito, unidades, bruto, descuentoPromo, promocionElegida, cliente, cobrando,
      valorPunto, clubActivo, canjeMinimo, umbral, primerNombre,
      medioPago, recibido, puntos, descuento, motivo, auth, error, campoRecibido,
      maxCanjeable, descuentoCanje, totalEstimado, vuelto, faltaEfectivo,
      billetesUtiles, necesitaAutorizacion, puedeCobrar,
      elegirMedio, cobrar, clp
    }
  }
}
</script>

<style scoped>
.fondo, .fondo * { box-sizing: border-box; }

.fondo {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.6);
}

.modal {
  width: 100%;
  max-width: 480px;
  max-height: 92vh;
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
}

.modal-cab {
  padding: 18px 20px 14px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-cab h3 { margin: 0; font-size: 1.15rem; color: #0f172a; }
.modal-cab p { margin: 4px 0 0; font-size: 0.82rem; color: #64748b; }

.modal-cuerpo { padding: 18px 20px; overflow-y: auto; }

.modal-pie {
  display: flex;
  gap: 9px;
  justify-content: flex-end;
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

.seccion-cab {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.grupo { margin-bottom: 18px; }

.campo {
  width: 100%;
  min-height: 46px;
  padding: 0.6rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: #fff;
  font-family: inherit;
  font-size: max(0.95rem, 16px);
  color: #0f172a;
  outline: none;
}

.campo:focus {
  border-color: transparent;
  box-shadow: 0 0 0 2px #10b981;
}

.campo.grande {
  min-height: 58px;
  font-size: 1.5rem;
  font-weight: 700;
  text-align: right;
}

.campo.motivo { margin-top: 9px; }

.rejilla {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}

/* ---------- Medios de pago ---------- */
.medios {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.medio {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 52px;
  padding: 0 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  color: #475569;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}

.medio .icono { font-size: 1.15rem; }

.medio.on {
  border-color: #059669;
  background: #059669;
  color: #fff;
}

/* ---------- Efectivo ---------- */
.billetes {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 9px;
}

.chip-boton {
  padding: 8px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #fff;
  color: #475569;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
}

.chip-boton:hover { border-color: #059669; color: #047857; }

.vuelto {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding: 13px 15px;
  border-radius: 10px;
  background: #f0fdf4;
  color: #166534;
}

.vuelto span {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.vuelto b { font-size: 1.6rem; }

.vuelto.falta { background: #fee2e2; color: #991b1b; }

/* ---------- Canje ---------- */
.fila-canje {
  display: flex;
  gap: 8px;
  align-items: center;
}

.fila-canje .campo { flex: 1; }

/* ---------- Autorización ---------- */
.autorizacion {
  margin-top: 12px;
  padding: 13px 14px;
  border: 1.5px solid #fcd34d;
  border-radius: 10px;
  background: #fffbeb;
}

.auth-cab {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  color: #78350f;
  font-size: 0.9rem;
}

.autorizacion .ayuda { color: #92400e; margin-bottom: 11px; }

/* ---------- Totales ---------- */
.totales {
  padding: 13px 15px;
  background: #f8fafc;
  border-radius: 10px;
}

.totales .linea {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0;
  font-size: 0.86rem;
  color: #64748b;
}

.totales .linea.verde { color: #047857; }

.totales .linea.total {
  margin-top: 7px;
  padding-top: 9px;
  border-top: 1px solid #e2e8f0;
  color: #0f172a;
  font-weight: 700;
}

.totales .linea.total b { font-size: 1.4rem; }

/* ---------- Botones ---------- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 46px;
  padding: 0.65rem 1.15rem;
  border: none;
  border-radius: 0.5rem;
  background: #059669;
  color: #fff;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:hover:not(:disabled) { background: #047857; }
.btn:disabled { background: #a7c9bb; cursor: not-allowed; }

.btn.grande { min-height: 54px; font-size: 1.05rem; flex: 1; }

.btn-linea {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #475569;
}

.btn-linea:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }

.btn-mini {
  min-height: 40px;
  padding: 0.35rem 0.8rem;
  font-size: 0.82rem;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: girar 0.8s linear infinite;
}

@keyframes girar { to { transform: rotate(360deg); } }

/* ---------- Varios ---------- */
.dato { font-variant-numeric: tabular-nums; font-weight: 600; }
.dato.grande { font-size: 1.3rem; }
.mini { font-size: 0.76rem; }
.suave { color: #64748b; }
.mala { color: #dc2626; }

.ayuda {
  margin: 7px 0 0;
  font-size: 0.76rem;
  color: #94a3b8;
  line-height: 1.5;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

.error {
  padding: 11px 13px;
  margin-bottom: 15px;
  border-radius: 8px;
  border-left: 4px solid #dc2626;
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.86rem;
  line-height: 1.5;
}

@media (max-width: 480px) {
  .medios { grid-template-columns: 1fr; }
  .rejilla { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .btn, .medio { transition: none; }
  .spinner { animation: none; }
}
</style>