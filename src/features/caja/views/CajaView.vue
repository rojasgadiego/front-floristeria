<template>
  <div class="caja">
    <header class="cabecera">
      <div>
        <h1>Caja</h1>
        <p class="ayuda">
          Sin caja abierta no se puede vender. Al cerrar se compara lo que
          contaste contra lo que debería haber.
        </p>
      </div>
      <button v-if="abierta" class="btn btn-linea" @click="verHistorial = !verHistorial">
        {{ verHistorial ? 'Ver turno actual' : 'Ver turnos anteriores' }}
      </button>
    </header>

    <div v-if="error" class="banda banda-error">
      <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      <button class="btn btn-mini" @click="recargar">Reintentar</button>
    </div>

    <!-- ═══ El resumen del cierre recién hecho ═══
         Vive fuera de `abierta` porque el turno ya no existe, pero la
         diferencia es lo que la persona vino a ver. -->
    <div v-if="cierre" class="cierre" :class="claseDiferencia(cierre.diferencia)">
      <div class="cierre-icono" aria-hidden="true">
        {{ cierre.diferencia === 0 ? '✓' : cierre.diferencia > 0 ? '↑' : '↓' }}
      </div>
      <div class="min0">
        <h2>{{ tituloCierre(cierre.diferencia) }}</h2>
        <p class="cierre-detalle">
          Esperado <b>{{ clp(cierre.efectivoEsperado) }}</b> ·
          contado <b>{{ clp(cierre.efectivoContado) }}</b>
          <span v-if="cierre.diferencia !== 0">
            · diferencia <b>{{ clp(Math.abs(cierre.diferencia)) }}</b>
          </span>
        </p>
        <p v-if="cierre.notaCierre" class="cierre-nota">{{ cierre.notaCierre }}</p>
      </div>
      <button class="btn btn-linea" @click="limpiarCierre">Entendido</button>
    </div>

    <!-- ═══ Historial ═══ -->
    <section v-if="verHistorial" class="panel">
      <h2 class="panel-titulo">Turnos anteriores</h2>

      <div v-if="cargando && !historial.length" class="vacio">Cargando…</div>
      <div v-else-if="!historial.length" class="vacio">
        <strong>Sin turnos registrados</strong>
        Los turnos aparecen acá al cerrarse.
      </div>

      <div v-else class="tabla-envoltura">
        <table>
          <thead>
            <tr>
              <th class="izq">Turno</th>
              <th class="izq">Responsable</th>
              <th>Boletas</th>
              <th>Vendido</th>
              <th>Efectivo</th>
              <th>Diferencia</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in historial" :key="c.id">
              <td data-label="Turno" class="izq">
                <div class="dato">{{ fechaCorta(c.abiertaEn) }}</div>
                <div class="desglose">{{ hora(c.abiertaEn) }} — {{ c.cerradaEn ? hora(c.cerradaEn) : 'abierta' }}</div>
              </td>
              <td data-label="Responsable" class="izq suave">{{ c.abiertaPor || '—' }}</td>
              <td data-label="Boletas" class="der dato">{{ c.boletas }}</td>
              <td data-label="Vendido" class="der dato">{{ clp(c.totalVendido) }}</td>
              <td data-label="Efectivo" class="der dato suave">{{ clp(c.efectivo) }}</td>
              <td data-label="Diferencia" class="der">
                <span v-if="c.diferencia === null" class="tenue">—</span>
                <span v-else class="chip" :class="claseDiferencia(c.diferencia)">
                  {{ c.diferencia === 0 ? 'exacto' : clp(c.diferencia) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ═══ Sin caja abierta ═══ -->
    <section v-else-if="!abierta" class="panel abrir">
      <div class="abrir-icono" aria-hidden="true">🔒</div>
      <h2>No hay caja abierta</h2>
      <p class="ayuda">
        Cuenta el fondo que dejas en el cajón y ábrela. Contra ese monto se
        va a calcular la diferencia al cerrar.
      </p>

      <label class="campo-monto">
        <span>Fondo inicial</span>
        <div class="monto">
          <span class="signo">$</span>
          <input v-model.number="fondo" type="number" min="0" step="1000"
                 inputmode="numeric" placeholder="0" @keyup.enter="abrir">
        </div>
      </label>

      <p v-if="errorForm" class="error-form">{{ errorForm }}</p>

      <button class="btn btn-grande" :disabled="guardando" @click="abrir">
        {{ guardando ? 'Abriendo…' : 'Abrir caja' }}
      </button>
    </section>

    <!-- ═══ Caja abierta: el arqueo en vivo ═══ -->
    <template v-else>
      <section class="panel turno">
        <div class="turno-cab">
          <div class="min0">
            <div class="rot">Turno abierto</div>
            <h2>{{ clp(actual.enCajon) }} <span class="en-cajon">en el cajón</span></h2>
            <p class="desglose">
              Abierta por <b>{{ actual.abiertaPor }}</b> a las {{ hora(actual.abiertaEn) }}
              · fondo {{ clp(actual.fondoInicial) }}
            </p>
          </div>
          <div class="pastilla">{{ actual.boletas }} boleta(s)</div>
        </div>

        <!-- Solo el efectivo se cuenta contra el cajón. Débito, crédito y
             transferencia se cuadran con la liquidación del banco. -->
        <div class="medios">
          <div class="medio destacado">
            <div class="rot">Efectivo</div>
            <div class="val">{{ clp(actual.efectivo) }}</div>
            <div class="pie">Es lo que se cuenta</div>
          </div>
          <div class="medio">
            <div class="rot">Débito</div>
            <div class="val">{{ clp(actual.debito) }}</div>
          </div>
          <div class="medio">
            <div class="rot">Crédito</div>
            <div class="val">{{ clp(actual.credito) }}</div>
          </div>
          <div class="medio">
            <div class="rot">Transferencia</div>
            <div class="val">{{ clp(actual.transferencia) }}</div>
          </div>
        </div>

        <div class="totales">
          <div class="tot">
            <span class="rot">Vendido</span>
            <span class="dato">{{ clp(actual.totalVendido) }}</span>
          </div>
          <div v-if="actual.totalDescuentos" class="tot">
            <span class="rot">Descuentos</span>
            <span class="dato suave">−{{ clp(actual.totalDescuentos) }}</span>
          </div>
          <div v-if="actual.anuladas" class="tot">
            <span class="rot">Anuladas</span>
            <span class="dato suave">{{ actual.anuladas }}</span>
          </div>
          <div v-if="actual.puntosOtorgados" class="tot">
            <span class="rot">Puntos dados</span>
            <span class="dato suave">{{ actual.puntosOtorgados }}</span>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2 class="panel-titulo">Cerrar turno</h2>
        <p class="ayuda">
          Cuenta el efectivo del cajón —incluido el fondo— y anótalo. El
          sistema calcula lo que debería haber; tú solo informas lo que hay.
        </p>

        <div class="cerrar-form">
          <label class="campo-monto">
            <span>Efectivo contado</span>
            <div class="monto">
              <span class="signo">$</span>
              <input v-model.number="contado" type="number" min="0" step="1000"
                     inputmode="numeric" placeholder="0">
            </div>
          </label>

          <label class="campo">
            <span>Nota (opcional)</span>
            <input v-model="nota" type="text" maxlength="200"
                   placeholder="Se pagó al proveedor con caja, faltó vuelto…">
          </label>
        </div>

        <!-- La diferencia se muestra ANTES de confirmar: si va a faltar
             plata, es mejor que la persona lo vea y recuente. -->
        <div v-if="contado > 0" class="previa" :class="claseDiferencia(diferenciaPrevia)">
          <span v-if="diferenciaPrevia === 0">Cuadra exacto.</span>
          <span v-else-if="diferenciaPrevia > 0">
            Sobran <b>{{ clp(diferenciaPrevia) }}</b> respecto de lo esperado.
          </span>
          <span v-else>
            Faltan <b>{{ clp(Math.abs(diferenciaPrevia)) }}</b> respecto de lo esperado.
          </span>
        </div>

        <p v-if="errorForm" class="error-form">{{ errorForm }}</p>

        <button class="btn btn-grande btn-cerrar" :disabled="guardando" @click="cerrar">
          {{ guardando ? 'Cerrando…' : 'Cerrar caja' }}
        </button>
      </section>
    </template>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'

export default {
  name: 'CajaView',

  setup () {
    const store = useStore()

    const actual = computed(() => store.getters['caja/actual'])
    const abierta = computed(() => store.getters['caja/abierta'])
    const cierre = computed(() => store.getters['caja/cierre'])
    const historial = computed(() => store.getters['caja/historial'])
    const cargando = computed(() => store.getters['caja/cargando'])
    const guardando = computed(() => store.getters['caja/guardando'])
    const error = computed(() => store.getters['caja/error'])

    const fondo = ref(null)
    const contado = ref(null)
    const nota = ref('')
    const errorForm = ref('')
    const verHistorial = ref(false)

    let control = null
    onMounted(() => {
      control = new AbortController()
      store.dispatch('caja/cargar', { signal: control.signal })
    })
    onUnmounted(() => control?.abort())

    /* El historial se pide solo al abrirlo: son turnos cerrados y no
       cambian, así que traerlos siempre sería una consulta de más. */
    watch(verHistorial, (v) => {
      if (v) store.dispatch('caja/cargarHistorial')
    })

    const recargar = () => store.dispatch('caja/cargar')
    const limpiarCierre = () => store.dispatch('caja/limpiarCierre')

    const abrir = async () => {
      errorForm.value = ''
      const monto = Number(fondo.value) || 0

      if (monto < 0) return (errorForm.value = 'El fondo no puede ser negativo.')

      try {
        await store.dispatch('caja/abrir', monto)
        fondo.value = null
      } catch (e) {
        /* El mensaje viene del RAISE del SP: "Ya hay una caja abierta por
           Rosa Méndez". Nombra a la persona, que es lo que permite ir a
           buscarla. */
        errorForm.value = e.message
      }
    }

    const cerrar = async () => {
      errorForm.value = ''

      if (contado.value === null || contado.value === '')
        return (errorForm.value = 'Anota cuánto efectivo contaste.')

      if (Number(contado.value) < 0)
        return (errorForm.value = 'El monto no puede ser negativo.')

      try {
        await store.dispatch('caja/cerrar', {
          efectivoContado: Number(contado.value),
          nota: nota.value.trim() || null
        })
        contado.value = null
        nota.value = ''
      } catch (e) {
        errorForm.value = e.message
      }
    }

    /* Se calcula en el cliente solo para mostrarlo antes de confirmar. El
       número que queda guardado lo calcula el servidor. */
    const diferenciaPrevia = computed(() => {
      if (!actual.value || !contado.value) return 0
      return Number(contado.value) - actual.value.enCajon
    })

    const claseDiferencia = (d) =>
      d === 0 ? 'exacto' : d > 0 ? 'sobra' : 'falta'

    const tituloCierre = (d) =>
      d === 0 ? 'Caja cerrada · cuadró exacto'
        : d > 0 ? 'Caja cerrada · sobró plata'
          : 'Caja cerrada · faltó plata'

    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    const hora = (iso) => new Date(iso).toLocaleTimeString('es-CL',
      { hour: '2-digit', minute: '2-digit' })

    const fechaCorta = (iso) => new Date(iso).toLocaleDateString('es-CL',
      { day: '2-digit', month: 'short' })

    return {
      Math,
      actual, abierta, cierre, historial, cargando, guardando, error,
      fondo, contado, nota, errorForm, verHistorial,
      recargar, limpiarCierre, abrir, cerrar,
      diferenciaPrevia, claseDiferencia, tituloCierre,
      clp, hora, fechaCorta
    }
  }
}
</script>

<style scoped>
.caja {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 900px;
}

.min0 { min-width: 0; }

/* ─── Cabecera ─── */

.cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

h1 {
  font-size: clamp(1.2rem, 5vw, 1.5rem);
  font-weight: 700;
  letter-spacing: -.02em;
}

h2 {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -.01em;
}

.ayuda {
  font-size: .85rem;
  color: var(--text-muted);
  margin-top: 4px;
  max-width: 52ch;
  line-height: 1.5;
}

/* ─── Paneles ─── */

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.panel-titulo {
  font-size: .95rem;
  font-weight: 700;
  margin-bottom: 4px;
}

/* ─── Sin caja ─── */

.abrir {
  text-align: center;
  padding: 36px 20px;
}

.abrir-icono {
  font-size: 2rem;
  margin-bottom: 10px;
}

.abrir .ayuda {
  margin: 6px auto 22px;
}

/* ─── Turno abierto ─── */

.turno-cab {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.rot {
  font-size: .66rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.turno-cab h2 {
  font-size: clamp(1.5rem, 6vw, 2rem);
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}

.en-cajon {
  font-size: .85rem;
  font-weight: 500;
  color: var(--text-muted);
  letter-spacing: 0;
}

.pastilla {
  padding: 5px 12px;
  border-radius: var(--r-full);
  background: var(--accent-soft);
  color: var(--accent-text);
  font-size: .78rem;
  font-weight: 700;
  white-space: nowrap;
}

.medios {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.medio {
  background: var(--surface-2);
  border-radius: var(--r-sm);
  padding: 12px 14px;
}

/* El efectivo se destaca porque es el único que se cuenta contra el
   cajón: los otros tres se cuadran con la liquidación del banco. */
.medio.destacado {
  background: var(--accent-soft);
  border: 1px solid var(--accent);
}

.medio .val {
  font-size: 1.05rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  margin-top: 3px;
}

.medio .pie {
  font-size: .68rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.totales {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.tot {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* ─── Formularios ─── */

.cerrar-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin: 16px 0;
}

.campo-monto,
.campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.campo-monto > span,
.campo > span {
  font-size: .8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.abrir .campo-monto {
  max-width: 240px;
  margin: 0 auto 16px;
  text-align: left;
}

.monto {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  padding: 0 14px;
  min-height: 52px;
  transition: border-color var(--t-fast);
}

.monto:focus-within {
  border-color: var(--accent);
}

.signo {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-faint);
}

.monto input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  color: var(--text);
  font: inherit;
  /* Grande y tabular: se lee de un vistazo mientras se cuenta plata. */
  font-size: 1.4rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Sin las flechitas del number: al contar plata estorban más de lo que
   ayudan, y un click accidental cambia el monto. */
.monto input::-webkit-outer-spin-button,
.monto input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.monto input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.campo input {
  min-height: 44px;
  padding: .6rem .75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: max(.9rem, 16px);
}

.campo input:focus {
  outline: 0;
  border-color: var(--accent);
}

/* ─── La previa de la diferencia ─── */

.previa {
  padding: 12px 16px;
  border-radius: var(--r-sm);
  font-size: .9rem;
  margin-bottom: 14px;
}

.previa.exacto {
  background: var(--success-soft);
  color: var(--success);
}

.previa.sobra {
  background: var(--info-soft);
  color: var(--info);
}

.previa.falta {
  background: var(--danger-soft);
  color: var(--danger);
}

/* ─── El resumen del cierre ─── */

.cierre {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-radius: var(--r-md);
  border: 1px solid;
}

.cierre.exacto {
  background: var(--success-soft);
  border-color: var(--success);
  color: var(--success);
}

.cierre.sobra {
  background: var(--info-soft);
  border-color: var(--info-border);
  color: var(--info);
}

.cierre.falta {
  background: var(--danger-soft);
  border-color: var(--danger-border);
  color: var(--danger);
}

.cierre-icono {
  font-size: 1.6rem;
  font-weight: 700;
  flex-shrink: 0;
}

.cierre h2 {
  font-size: 1rem;
  color: inherit;
}

.cierre-detalle {
  font-size: .85rem;
  color: inherit;
  opacity: .9;
  margin-top: 3px;
  font-variant-numeric: tabular-nums;
}

.cierre-nota {
  font-size: .8rem;
  color: inherit;
  opacity: .75;
  margin-top: 4px;
  font-style: italic;
}

.cierre .btn {
  margin-left: auto;
  flex-shrink: 0;
}

/* ─── Tabla del historial ─── */

.tabla-envoltura {
  overflow: auto;
  margin-top: 14px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
}

table {
  width: 100%;
  min-width: 620px;
  border-collapse: separate;
  border-spacing: 0;
}

th {
  position: sticky;
  top: 0;
  z-index: 2;
  text-align: right;
  padding: 9px 12px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  font-size: .66rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
}

th.izq { text-align: left; }

td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  font-size: .85rem;
  vertical-align: middle;
  white-space: nowrap;
}

tbody tr:last-child td { border-bottom: 0; }

.izq { text-align: left; }
.der { text-align: right; }
.suave { color: var(--text-muted); }
.tenue { color: var(--text-faint); }

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.desglose {
  font-size: .72rem;
  color: var(--text-faint);
  margin-top: 1px;
}

.chip {
  display: inline-block;
  padding: 2px 9px;
  border-radius: var(--r-full);
  font-size: .76rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.chip.exacto { background: var(--success-soft); color: var(--success); }
.chip.sobra  { background: var(--info-soft);    color: var(--info); }
.chip.falta  { background: var(--danger-soft);  color: var(--danger); }

/* ─── Bandas y botones ─── */

.banda {
  display: flex;
  align-items: center;
  gap: 11px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: var(--r-sm);
  font-size: .875rem;
}

.banda-error {
  background: var(--danger-soft);
  border: 1px solid var(--danger-border);
  color: var(--danger);
}

.banda .btn { margin-left: auto; }

.error-form {
  color: var(--danger);
  font-size: .85rem;
  margin-bottom: 12px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
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

.btn:hover:not(:disabled) { background: var(--accent-hover); }

.btn:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.btn-grande {
  width: 100%;
  min-height: 52px;
  font-size: 1rem;
}

.abrir .btn-grande {
  max-width: 240px;
}

/* Cerrar caja es irreversible y descuadra un arqueo si se hace por error,
   así que va en el color de peligro y no en el de acción normal. */
.btn-cerrar {
  background: var(--danger);
}

.btn-cerrar:hover:not(:disabled) {
  background: var(--danger);
  filter: brightness(.92);
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
  min-height: 32px;
  padding: .3rem .75rem;
  font-size: .8rem;
}

.vacio {
  text-align: center;
  padding: 36px 20px;
  color: var(--text-muted);
  font-size: .88rem;
}

.vacio strong {
  display: block;
  color: var(--text);
  font-size: 1rem;
  margin-bottom: 4px;
}

/* ─── Móvil ─── */

@media (max-width: 700px) {
  .cierre {
    flex-wrap: wrap;
  }

  .cierre .btn {
    margin-left: 0;
    width: 100%;
  }

  table, thead, tbody, tr, td {
    display: block;
    width: 100%;
    min-width: 0;
  }

  thead { display: none; }

  tbody tr {
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    margin-bottom: 10px;
    padding: 12px 14px;
  }

  td {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    padding: 6px 0;
    border: none;
    white-space: normal;
  }

  td::before {
    content: attr(data-label) ":";
    font-size: .78rem;
    color: var(--text-muted);
    flex-shrink: 0;
  }
}
</style>
