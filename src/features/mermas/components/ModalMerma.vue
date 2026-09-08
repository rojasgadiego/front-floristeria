<template>
  <div class="fondo" @click.self="$emit('cerrar')">
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-cab">
        <h3>Registrar merma</h3>
        <p v-if="!origen">Escanea el balde o la partida de donde sale.</p>
        <p v-else>{{ origen.producto }} · {{ origen.codigo }}</p>
      </div>

      <div class="modal-cuerpo">
        <div v-if="error" class="error">{{ error }}</div>

        <!-- ═══ PASO 1: escanear ═══
             El escaneo va primero y es el camino principal, no un atajo. De
             acá salen producto, lote, disponible y costo ya resueltos: que
             el costo venga del sistema y no se escriba a mano impide
             declarar que la flor cara valía poco. -->
        <template v-if="!origen">
          <EscanerCodigo ref="escaner" @leido="alEscanear" />

          <button class="enlace" @click="modoManual = !modoManual">
            No puedo escanear · registrar a mano
          </button>

          <!-- El camino manual existe porque las etiquetas se rompen, pero
               queda registrado como no escaneado: es el dato que después
               distingue a quien tiene el balde en la mano de quien no. -->
          <div v-if="modoManual" class="manual">
            <div class="grupo">
              <label for="mm-prod">Producto</label>
              <select id="mm-prod" class="campo" v-model.number="manual.productoId" @change="alElegirManual">
                <option :value="null">Selecciona…</option>
                <option v-for="p in productosConStock" :key="p.id" :value="p.id">
                  {{ p.emoji }} {{ p.nombre }} — {{ disponibleDe(p) }} disponibles
                </option>
              </select>
            </div>

            <div v-if="manual.lotes.length" class="grupo">
              <label for="mm-lote">¿De qué balde?</label>
              <select id="mm-lote" class="campo" v-model.number="manual.loteId">
                <option v-for="l in manual.lotes" :key="l.id" :value="l.id">
                  {{ l.codigo }} · {{ l.varasDisponibles }} varas
                </option>
              </select>
            </div>

            <p class="ayuda">
              Una merma registrada a mano queda marcada como tal. Si la
              etiqueta está rota, vale la pena reimprimirla.
            </p>

            <button class="btn btn-linea" :disabled="!manual.productoId" @click="confirmarManual">
              Continuar sin escanear
            </button>
          </div>
        </template>

        <!-- ═══ PASO 2: qué pasó ═══ -->
        <template v-else>
          <!-- La ficha de lo que se escaneó. Verla antes de seguir evita
               mermar el balde equivocado, que después no se deshace sin
               dejar rastro. -->
          <div class="ficha" :class="{ manual: !escaneado }">
            <div class="ficha-cab">
              <span class="emoji" aria-hidden="true">{{ origen.emoji }}</span>
              <div class="min0">
                <b>{{ origen.producto }}</b>
                <div class="desglose">
                  <span class="mono">{{ origen.codigo }}</span>
                  · {{ origen.origen === 'partida' ? 'mostrador' : 'bodega' }}
                  <template v-if="origen.proveedor"> · {{ origen.proveedor }}</template>
                </div>
              </div>
              <button class="btn-icono" @click="reiniciar" aria-label="Cambiar">↺</button>
            </div>

            <div class="ficha-datos">
              <div><span class="rot">Quedan</span><b class="dato">{{ origen.disponible }}</b></div>
              <div><span class="rot">Costo c/u</span><b class="dato">{{ clp(origen.costoUnitario) }}</b></div>
              <div v-if="origen.diasParaVencer != null">
                <span class="rot">Vence</span>
                <b class="dato" :class="{ rojo: origen.diasParaVencer < 0 }">
                  {{ origen.diasParaVencer < 0 ? `hace ${Math.abs(origen.diasParaVencer)}d` : `en
                    ${origen.diasParaVencer}d` }} </b>
              </div>
              <div v-if="origen.ubicacion">
                <span class="rot">Está en</span><b class="dato chico">{{ origen.ubicacion }}</b>
              </div>
            </div>

            <p v-if="!escaneado" class="marca-manual">
              Registrada a mano, sin escanear.
            </p>
          </div>

          <p v-if="origen.sugerencia" class="sugerencia">{{ origen.sugerencia }}</p>

          <div class="rejilla">
            <div class="grupo">
              <label for="m-cant">¿Cuántas salen?</label>
              <input id="m-cant" ref="campoCantidad" class="campo dato" type="number" min="1" :max="origen.disponible"
                v-model.number="f.cantidad">
              <button v-if="f.cantidad !== origen.disponible" class="enlace mini"
                @click="f.cantidad = origen.disponible">
                Usar todo ({{ origen.disponible }})
              </button>
            </div>

            <div class="grupo">
              <label for="m-motivo">Motivo</label>
              <select id="m-motivo" class="campo" v-model="f.motivo">
                <option value="">Selecciona…</option>
                <option v-for="m in nombresMotivo" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>
          </div>

          <!-- El costo de lo que se está sacando, a la vista. Es lo que
               decide si hace falta autorización, y verlo antes de confirmar
               hace pensar dos veces. -->
          <div class="costo" :class="{ alto: necesitaAutorizacion }">
            <span>Sale del inventario</span>
            <b class="dato">{{ clp(costoTotal) }}</b>
          </div>

          <div class="grupo">
            <label>¿Qué pasó con eso?</label>
            <div class="opciones">
              <button v-for="d in DESTINOS" :key="d.valor" type="button" class="opcion"
                :class="{ on: f.destino === d.valor }" @click="elegirDestino(d.valor)">
                <b>{{ d.texto }}</b>
                <span>{{ d.descripcion }}</span>
              </button>
            </div>
          </div>

          <template v-if="f.destino === 'reingreso'">
            <div class="rejilla">
              <div class="grupo">
                <label for="m-rec">¿Cuántas se salvan?</label>
                <input id="m-rec" class="campo dato" type="number" min="1" :max="f.cantidad"
                  v-model.number="f.cantidadRecuperada">
              </div>

              <div class="grupo">
                <label for="m-cal">¿En qué estado?</label>
                <select id="m-cal" class="campo" v-model="f.calidad">
                  <option :value="null">Selecciona…</option>
                  <option v-for="c in CALIDADES" :key="c.valor" :value="c.valor">
                    {{ c.texto }} — {{ c.descripcion }}
                  </option>
                </select>
              </div>
            </div>

            <div v-if="f.calidad" class="nota">
              Nacen <b>{{ f.cantidadRecuperada || 0 }}</b> varas en un lote nuevo con
              {{CALIDADES.find(c => c.valor === f.calidad)?.descripcion}}.
              Se vende solo escaneándolo, para que nadie lo cobre a precio normal.
            </div>
          </template>

          <div class="grupo">
            <label for="m-det">Detalle</label>
            <input id="m-det" class="campo" v-model="f.detalle" maxlength="200"
              placeholder="Se cayó el balde, llegaron golpeadas del terminal…">
          </div>

          <!-- ═══ Autorización ═══
               Sobre el umbral hace falta la clave de una administradora. Es
               el mismo mecanismo del descuento en la venta: quien se lleva
               flor de a poco no puede escalar sin un cómplice. -->
          <div v-if="necesitaAutorizacion" class="autorizacion">
            <div class="auth-cab">
              <span aria-hidden="true">🔐</span>
              <b>Esta merma necesita autorización</b>
            </div>
            <p class="ayuda">
              Son {{ clp(costoTotal) }}, sobre el tope de {{ clp(umbral) }}.
              Pídele a una administradora que ingrese sus credenciales; quedan
              registradas junto a la merma.
            </p>
            <div class="rejilla">
              <input class="campo" type="email" v-model="auth.email" placeholder="Correo" autocomplete="off">
              <input class="campo" type="password" v-model="auth.password" placeholder="Contraseña" autocomplete="off"
                @keyup.enter="registrar">
            </div>
          </div>
        </template>
      </div>

      <div class="modal-pie">
        <button class="btn btn-linea" :disabled="guardando" @click="$emit('cerrar')">
          Cancelar
        </button>
        <button v-if="origen" class="btn" :disabled="!puedeRegistrar || guardando" @click="registrar">
          {{ guardando ? 'Registrando…' : 'Registrar merma' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, nextTick } from 'vue'
import { useStore } from 'vuex'
import EscanerCodigo from './EscanerCodigo.vue'
import { DESTINOS, CALIDADES } from '@/features/mermas/store/mermas.module'
import { lotesService } from '@/features/lotes/services/lotes.service'

export default {
  name: 'ModalMerma',
  components: { EscanerCodigo },
  emits: ['cerrar', 'registrada'],

  setup(_, { emit }) {
    const store = useStore()

    const origen = ref(null)
    const escaneado = ref(false)
    const modoManual = ref(false)
    const error = ref('')

    const escaner = ref(null)
    const campoCantidad = ref(null)

    const f = reactive({
      cantidad: 1,
      motivo: '',
      detalle: '',
      destino: 'perdida',
      cantidadRecuperada: 0,
      calidad: null
    })

    const auth = reactive({ email: '', password: '' })
    const manual = reactive({ productoId: null, loteId: null, lotes: [] })

    const guardando = computed(() => store.getters['mermas/guardando'])
    const nombresMotivo = computed(() => store.getters['mermas/nombresMotivo'])
    const umbral = computed(() => store.getters['mermas/umbralAutorizacion'])

    /* Solo lo que se puede mermar: sin existencias no hay nada que sacar, y
       ofrecerlo lleva a un error que se pudo evitar antes de elegir. */
    const productosConStock = computed(() =>
      store.getters['productos/productos'].filter(p => p.activo && disponibleDe(p) > 0)
    )

    const disponibleDe = (p) =>
      p.tipo === 'armado' ? (p.stockListo ?? 0) : (p.stockTotal ?? 0)

    /* ---------------- Escaneo ---------------- */

    const alEscanear = async ({ codigo, escaneado: fueEscaneado }) => {
      error.value = ''

      try {
        const r = await store.dispatch('mermas/escanear', codigo)

        if (!r) {
          escaner.value?.mostrarError(
            `No hay ningún lote ni partida con el código ${codigo}.`)
          return
        }

        if (!r.puedeMermar) {
          escaner.value?.mostrarError(r.motivoBloqueo || 'De acá no se puede mermar.')
          return
        }

        origen.value = r
        escaneado.value = fueEscaneado
        f.cantidad = 1

        await nextTick()
        campoCantidad.value?.select()
      } catch (e) {
        escaner.value?.mostrarError(e.message)
      }
    }

    /* ---------------- Manual ---------------- */

    const alElegirManual = async () => {
      manual.lotes = []
      manual.loteId = null

      const p = productosConStock.value.find(x => x.id === manual.productoId)
      if (!p?.controlaLotes) return

      try {
        const res = await lotesService.listar({ productoId: manual.productoId, tamano: 50 })
        manual.lotes = (res.items || []).filter(l => l.varasDisponibles > 0)
        manual.loteId = manual.lotes[0]?.id ?? null
      } catch (e) {
        error.value = e.message
      }
    }

    /* Sin escanear se arma la misma ficha, pero marcada: es lo que después
       permite ver quién registra con el balde en la mano y quién no. */
    const confirmarManual = async () => {
      const p = productosConStock.value.find(x => x.id === manual.productoId)
      const l = manual.lotes.find(x => x.id === manual.loteId)

      origen.value = {
        origen: l ? 'lote' : 'stock',
        loteId: l?.id ?? null,
        partidaId: null,
        codigo: l?.codigo ?? 'sin lote',
        productoId: p.id,
        producto: p.nombre,
        emoji: p.emoji,
        disponible: l?.varasDisponibles ?? disponibleDe(p),
        costoUnitario: p.costoEfectivo ?? 0,
        diasParaVencer: l?.diasParaVencer ?? null,
        ubicacion: null,
        proveedor: null,
        sugerencia: null
      }

      escaneado.value = false
      modoManual.value = false
      f.cantidad = 1

      await nextTick()
      campoCantidad.value?.select()
    }

    /* ---------------- Formulario ---------------- */

    const costoTotal = computed(() =>
      Math.round((f.cantidad || 0) * (origen.value?.costoUnitario || 0))
    )

    const necesitaAutorizacion = computed(() => costoTotal.value > umbral.value)

    const elegirDestino = (d) => {
      f.destino = d
      if (d !== 'reingreso') {
        f.cantidadRecuperada = 0
        f.calidad = null
      } else if (!f.cantidadRecuperada) {
        /* La mitad como punto de partida: la persona lo ajusta mirando la
           flor, no es un número que deba aceptar. */
        f.cantidadRecuperada = Math.floor(f.cantidad / 2) || 1
      }
    }

    const puedeRegistrar = computed(() => {
      if (!origen.value) return false
      if (!f.cantidad || f.cantidad < 1) return false
      if (f.cantidad > origen.value.disponible) return false
      if (!f.motivo) return false
      if (f.destino === 'reingreso' && (!f.cantidadRecuperada || !f.calidad)) return false
      if (necesitaAutorizacion.value && (!auth.email || !auth.password)) return false
      return true
    })

    const reiniciar = async () => {
      origen.value = null
      escaneado.value = false
      modoManual.value = false
      error.value = ''
      Object.assign(f, {
        cantidad: 1, motivo: '', detalle: '',
        destino: 'perdida', cantidadRecuperada: 0, calidad: null
      })
      await nextTick()
      escaner.value?.reiniciar()
    }

    const registrar = async () => {
      if (!puedeRegistrar.value) return
      error.value = ''

      try {
        const m = await store.dispatch('mermas/registrar', {
          productoId: origen.value.productoId,
          loteId: origen.value.loteId,
          partidaId: origen.value.partidaId,
          cantidad: f.cantidad,
          motivo: f.motivo,
          detalle: f.detalle.trim() || null,
          destino: f.destino,
          cantidadRecuperada: f.cantidadRecuperada,
          calidad: f.calidad,
          codigoEscaneado: origen.value.codigo,
          escaneado: escaneado.value,
          autorizacion: necesitaAutorizacion.value
            ? { email: auth.email.trim(), password: auth.password }
            : null
        })

        emit('registrada', m)
      } catch (e) {
        /* El mensaje viene del RAISE: "El lote LOT-000015 tiene 12 varas y
           estás mermando 30". Ya está redactado. */
        error.value = e.message
        auth.password = ''
      }
    }

    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    return {
      Math, DESTINOS, CALIDADES,
      origen, escaneado, modoManual, error, escaner, campoCantidad,
      f, auth, manual, guardando, nombresMotivo, umbral,
      productosConStock, disponibleDe,
      alEscanear, alElegirManual, confirmarManual,
      costoTotal, necesitaAutorizacion, elegirDestino, puedeRegistrar,
      reiniciar, registrar, clp
    }
  }
}
</script>

<style scoped>
.fondo {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--overlay);
}

.modal {
  width: 100%;
  max-width: 500px;
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.min0 {
  min-width: 0;
}

.mono {
  font-family: var(--font-mono);
  font-size: .95em;
}

.rojo {
  color: var(--danger);
}

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.dato.chico {
  font-size: .85rem;
  font-weight: 600;
}

.rot {
  display: block;
  font-size: .62rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.desglose {
  font-size: .74rem;
  color: var(--text-faint);
  margin-top: 2px;
}

.modal-cab {
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.modal-cab h3 {
  font-size: 1.1rem;
  font-weight: 700;
}

.modal-cab p {
  font-size: .82rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.modal-cuerpo {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px;
}

.modal-pie {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}

.modal-pie .btn {
  flex: 1;
}

/* ─── Paso manual ─── */

.enlace {
  display: block;
  width: 100%;
  margin-top: 12px;
  padding: 8px;
  border: none;
  background: none;
  color: var(--text-muted);
  font: inherit;
  font-size: .82rem;
  text-decoration: underline;
  cursor: pointer;
}

.enlace:hover {
  color: var(--text);
}

.enlace.mini {
  width: auto;
  margin-top: 5px;
  padding: 0;
  font-size: .76rem;
  text-align: left;
}

.manual {
  margin-top: 14px;
  padding: 16px;
  background: var(--surface-2);
  border-radius: var(--r-sm);
}

.manual .btn {
  width: 100%;
  margin-top: 4px;
}

/* ─── La ficha de lo escaneado ─── */

.ficha {
  padding: 14px 16px;
  margin-bottom: 14px;
  background: var(--success-soft);
  border: 1px solid var(--success);
  border-radius: var(--r-sm);
}

/* Sin escanear se ve distinto: no es un error, pero tampoco lo mismo. */
.ficha.manual {
  background: var(--warn-soft);
  border-color: var(--warn-border);
}

.ficha-cab {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ficha-cab .emoji {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.ficha-cab b {
  font-size: .95rem;
}

.ficha-datos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.marca-manual {
  margin-top: 10px;
  font-size: .76rem;
  font-weight: 600;
  color: var(--warn);
}

.sugerencia {
  padding: 10px 13px;
  margin-bottom: 14px;
  background: var(--info-soft);
  border-left: 3px solid var(--info);
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
  font-size: .8rem;
  line-height: 1.5;
}

/* ─── El costo a la vista ─── */

.costo {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 15px;
  margin-bottom: 16px;
  background: var(--surface-2);
  border-radius: var(--r-sm);
  font-size: .86rem;
  color: var(--text-muted);
}

.costo .dato {
  font-size: 1.2rem;
  color: var(--text);
}

/* Sobre el umbral cambia de color antes de que la persona lo descubra al
   apretar el botón. */
.costo.alto {
  background: var(--warn-soft);
  border: 1px solid var(--warn-border);
  color: var(--warn);
}

.costo.alto .dato {
  color: inherit;
}

/* ─── Formulario ─── */

.rejilla {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.grupo {
  margin-bottom: 16px;
}

.rejilla .grupo {
  margin-bottom: 0;
}

label {
  display: block;
  font-size: .8rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.campo {
  width: 100%;
  min-height: 46px;
  padding: .6rem .75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: max(.9rem, 16px);
  transition: border-color var(--t-fast);
}

.campo:focus {
  outline: 0;
  border-color: var(--accent);
}

.campo[type=number]::-webkit-outer-spin-button,
.campo[type=number]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.campo[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* El destino como tarjetas y no como select: cada uno tiene una
   consecuencia contable distinta, y esa diferencia hay que poder leerla
   antes de elegir. */
.opciones {
  display: grid;
  gap: 8px;
}

.opcion {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 11px 14px;
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--t-fast), background-color var(--t-fast);
}

.opcion:hover {
  border-color: var(--border-strong);
}

.opcion b {
  font-size: .88rem;
}

.opcion span {
  font-size: .76rem;
  color: var(--text-muted);
}

.opcion.on {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.opcion.on span {
  color: var(--accent-text);
}

.nota {
  padding: 12px 14px;
  margin-bottom: 16px;
  background: var(--info-soft);
  border-left: 3px solid var(--info);
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
  font-size: .8rem;
  line-height: 1.55;
}

/* ─── Autorización ─── */

/* En ámbar y no en acento: no es un paso más, es una interrupción que pide
   traer a otra persona. */
.autorizacion {
  padding: 14px;
  border: 1.5px solid var(--warn-border);
  border-radius: var(--r-sm);
  background: var(--warn-soft);
}

.auth-cab {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  color: var(--warn);
  font-size: .9rem;
}

.autorizacion .ayuda {
  color: var(--warn);
  opacity: .9;
  margin-bottom: 12px;
}

.autorizacion .rejilla {
  margin-bottom: 0;
}

.ayuda {
  font-size: .78rem;
  color: var(--text-faint);
  line-height: 1.55;
  margin-top: 6px;
}

.error {
  padding: 11px 13px;
  margin-bottom: 16px;
  border-radius: var(--r-sm);
  border-left: 4px solid var(--danger);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: .85rem;
  line-height: 1.5;
}

/* ─── Botones ─── */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 46px;
  padding: .65rem 1.15rem;
  border: none;
  border-radius: var(--r-sm);
  background: var(--accent);
  color: var(--accent-contrast);
  font: inherit;
  font-size: .92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--t-fast);
}

.btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn:disabled {
  opacity: .5;
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

.btn-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  cursor: pointer;
}

.btn-icono:hover {
  border-color: var(--accent);
  color: var(--accent-text);
}

/* ─── Móvil ─── */

@media (max-width: 560px) {

  /* A pantalla completa desde abajo: el escáner necesita el alto, y con la
     cámara abierta un modal flotante deja el visor del tamaño de un sello. */
  .fondo {
    padding: 0;
    align-items: flex-end;
  }

  .modal {
    max-width: none;
    max-height: 100dvh;
    height: 100dvh;
    border: none;
    border-radius: 0;
  }

  .modal-pie {
    padding-bottom: calc(14px + env(safe-area-inset-bottom, 0));
  }
}
</style>
