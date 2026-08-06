<template>
  <MainLayout>

    <!-- ---------- Cargando ---------- -->
    <div v-if="cargando" class="vacio">Buscando el lote…</div>

    <!-- ---------- No encontrado ---------- -->
    <div v-else-if="!lote" class="vacio">
      <strong>No hay ningún lote con el código {{ codigo }}</strong>
      <p class="pista">
        Puede que la etiqueta esté borrada o que el código se haya tipeado mal.
        Revisa el paquete: el código va bajo el QR.
      </p>
      <div class="acciones-vacio">
        <button class="btn btn-linea" @click="reintentar">Reintentar</button>
        <router-link class="btn" :to="{ name: 'Lotes' }">Ver todos los lotes</router-link>
      </div>
    </div>

    <template v-else>

      <!-- ---------- Encabezado ---------- -->
      <div class="cabecera al-entrar">
        <div class="min0">
          <div class="migas">
            <router-link :to="{ name: 'Lotes' }">Lotes</router-link>
            <span aria-hidden="true">›</span>
            <span>{{ lote.codigo }}</span>
          </div>
          <h2>{{ lote.emoji }} {{ lote.producto }}</h2>
          <p class="pista">
            Ingresó el {{ fecha(lote.fechaIngreso) }} · {{ lote.diasEnCamara }} días en cámara
            <span v-if="lote.proveedor"> · {{ lote.proveedor }}</span>
          </p>
        </div>
        <span class="etiqueta grande" :class="claseAlerta(lote.alerta)">{{ textoAlerta(lote.alerta) }}</span>
      </div>

      <!--
        Lo primero que necesita quien escanea en el mesón: cuánto queda y a
        qué precio se vende ESTE lote, que puede no ser el del producto.
      -->
      <div class="destacados">
        <div class="dest al-entrar" style="--i: 1">
          <span class="rot">Quedan</span>
          <b class="val">{{ lote.varasDisponibles }}</b>
          <span class="pie">de {{ lote.varasIniciales }} · {{ Number(lote.porcentajeVendido).toFixed(0) }}% vendido</span>
        </div>
        <div class="dest al-entrar" style="--i: 2">
          <span class="rot">Precio de venta</span>
          <b class="val">{{ clp(lote.precioVenta) }}</b>
          <span class="pie">
            {{ lote.precioUnitario ? 'Precio propio de este lote' : 'Precio del producto' }}
          </span>
        </div>
        <div class="dest al-entrar" style="--i: 3">
          <span class="rot">Costo por vara</span>
          <b class="val">{{ clp(lote.costoPorVara) }}</b>
          <span class="pie">{{ clp(lote.valorRestante) }} inmovilizados</span>
        </div>
        <div class="dest al-entrar" style="--i: 4" :class="{ alerta: vencePronto }">
          <span class="rot">Vencimiento</span>
          <b class="val">{{ lote.fechaVencimiento ? fecha(lote.fechaVencimiento) : 'Sin fecha' }}</b>
          <span class="pie">{{ textoVencimiento }}</span>
        </div>
      </div>

      <!-- ---------- Avisos ---------- -->
      <div v-if="lote.requiereEscaneo" class="banda banda-aviso al-entrar" style="--i: 5">
        <span aria-hidden="true">📷</span>
        <span>
          <b>Este lote solo se vende escaneándolo.</b>
          Está fuera del reparto automático porque tiene precio propio: si entrara
          en la fila normal, una venta sin escaneo cobraría flor de segunda a
          precio de primera sin que nadie lo note.
        </span>
      </div>

      <div v-if="lote.alerta === 'resto por liquidar'" class="banda banda-aviso al-entrar" style="--i: 5">
        <span aria-hidden="true">⏳</span>
        <span>
          Quedó atrás porque se empezó a vender de un lote más nuevo. Todavía
          sirve: liquidarlo hoy evita la merma de la próxima semana.
        </span>
      </div>

      <div v-if="lote.alerta === 'vencido'" class="banda banda-error al-entrar" style="--i: 5">
        <span aria-hidden="true">⚠️</span>
        <span>
          Venció. Revísalo antes de vender: si ya no sirve, regístralo como
          merma para que salga del inventario y del cálculo de costos.
        </span>
      </div>

      <!-- ---------- Contenido ---------- -->
      <div class="columnas">

        <section class="tarjeta al-entrar" style="--i: 6">
          <h3>Procedencia</h3>
          <dl class="ficha">
            <div><dt>Código</dt><dd class="dato">{{ lote.codigo }}</dd></div>
            <div><dt>Estado</dt><dd>{{ lote.estado }}</dd></div>
            <div><dt>Compra</dt><dd>{{ lote.compraFolio || '—' }}</dd></div>
            <div><dt>Documento</dt><dd>{{ lote.documento || '—' }}</dd></div>
            <div><dt>Proveedor</dt><dd>{{ lote.proveedor || '—' }}</dd></div>
            <div><dt>Presentación</dt><dd>{{ lote.presentacion || '—' }}</dd></div>
            <div>
              <dt>Orden de venta</dt>
              <dd>
                <span v-if="lote.ordenFifo">
                  N° {{ lote.ordenFifo }}
                  <span v-if="lote.ordenFifo === 1" class="verde">— es el que toca vender</span>
                </span>
                <span v-else class="suave">Fuera del reparto automático</span>
              </dd>
            </div>
            <div v-if="lote.esRecuperado">
              <dt>Origen</dt>
              <dd>
                Recuperado<span v-if="lote.calidad"> · calidad {{ lote.calidad }}</span>
                <span v-if="lote.loteOrigen"> del lote {{ lote.loteOrigen }}</span>
              </dd>
            </div>
          </dl>

          <p v-if="lote.notas" class="notas">“{{ lote.notas }}”</p>

          <div class="ubicacion">
            <div class="min0">
              <span class="rot">Ubicación</span>
              <b>{{ lote.ubicacion || 'Sin registrar' }}</b>
            </div>
            <button v-if="puedeEditar" class="btn btn-linea btn-mini" @click="abrirUbicacion">
              {{ lote.ubicacion ? 'Cambiar' : 'Registrar' }}
            </button>
          </div>
        </section>

        <section class="tarjeta al-entrar" style="--i: 7">
          <h3>Etiqueta</h3>
          <div class="qr-caja">
            <img v-if="qr" :src="qr" :alt="`Código QR de ${lote.codigo}`" class="qr">
            <div v-else class="qr-vacio suave mini">Cargando QR…</div>
            <b class="dato codigo">{{ lote.codigo }}</b>
          </div>
          <p class="ayuda">
            En el papel no viaja ningún dato: el QR solo lleva la dirección de
            esta ficha. Si la etiqueta se moja o se pierde, se reimprime y listo.
          </p>
          <router-link class="btn btn-linea ancho" :to="{ name: 'Etiquetas', query: { ids: String(lote.id) } }">
            🏷️ Reimprimir etiqueta
          </router-link>
        </section>

        <section class="tarjeta ancha al-entrar" style="--i: 8">
          <h3>Movimientos</h3>
          <div v-if="!lote.movimientos.length" class="suave mini">
            Sin movimientos desde que ingresó.
          </div>
          <table v-else>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th class="der">Cantidad</th>
                <th>Motivo</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in lote.movimientos" :key="m.id">
                <td data-label="Fecha" class="dato mini">{{ fechaHora(m.fecha) }}</td>
                <td data-label="Tipo"><span class="etiqueta et-gris">{{ m.tipo }}</span></td>
                <td data-label="Cantidad" class="der dato" :class="m.cantidad < 0 ? 'rojo' : 'verde'">
                  {{ m.cantidad > 0 ? '+' : '' }}{{ m.cantidad }}
                </td>
                <td data-label="Motivo" class="suave">{{ m.motivo }}</td>
                <td data-label="Usuario" class="suave mini">{{ m.usuario || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </template>

    <!-- ================= MODAL ================= -->
    <div v-if="modal" class="fondo" @click.self="cerrarModal">
      <div class="modal">
        <div class="modal-cab">
          <h3>Ubicación del lote</h3>
          <p>{{ lote.codigo }} · {{ lote.producto }}</p>
        </div>
        <div class="modal-cuerpo">
          <div v-if="modal.error" class="error">{{ modal.error }}</div>
          <label for="u-ubi">¿Dónde está el paquete?</label>
          <input id="u-ubi" class="campo" v-model="modal.ubicacion" maxlength="120"
            placeholder="Cámara 1, balde 3" @keyup.enter="guardarUbicacion">
          <p class="ayuda">
            Es lo único editable de un lote: las varas se mueven recibiendo,
            vendiendo o mermando.
          </p>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="cerrarModal">Cancelar</button>
          <button class="btn" @click="guardarUbicacion">Guardar</button>
        </div>
      </div>
    </div>

    <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
  </MainLayout>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRoute } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'
import { claseAlerta, textoAlerta } from '@/features/lotes/store/lotes.module'
import { lotesService } from '@/features/lotes/services/lotes.service'

export default {
  name: 'LoteDetalleView',
  components: { MainLayout },

  setup () {
    const store = useStore()
    const route = useRoute()
    const { usarAviso } = useTemporizadores()

    const puedeEditar = computed(() => store.getters['auth/tieneRol']('admin', 'bodega'))

    const codigo = computed(() => route.params.codigo)
    const lote = ref(null)
    const qr = ref(null)
    const cargando = ref(true)

    let control = null

    /*
     * Se busca por código y no por id: es lo que trae el QR. La ficha
     * completa (LoteDetalleDto) incluye los movimientos, que la lista no.
     */
    const cargar = async () => {
      cargando.value = true
      lote.value = null
      control?.abort()
      control = new AbortController()

      try {
        lote.value = await lotesService.porCodigo(codigo.value, { signal: control.signal })
        cargarQr()
      } catch (e) {
        /* Un 404 acá no es un fallo: es una etiqueta mal tipeada, y la
           pantalla ya lo explica mejor que un toast rojo. */
        if (!e.esCancelado && e.status !== 404) avisar(e.message, true)
      } finally {
        cargando.value = false
      }
    }

    /* El PNG está protegido: la etiqueta <img> no manda el bearer, así que
       hay que traerlo como blob con el cliente autenticado. */
    const cargarQr = async () => {
      if (!lote.value) return
      try {
        qr.value = await lotesService.qr(lote.value.codigo, { signal: control.signal })
      } catch {
        qr.value = null
      }
    }

    onMounted(cargar)

    /* Escanear otro QR con la ficha abierta cambia solo el parámetro: el
       componente se reutiliza y sin esto quedaría mostrando el lote viejo. */
    watch(codigo, cargar)

    onUnmounted(() => {
      control?.abort()
      lotesService.liberarQr(qr.value)
    })

    const reintentar = () => cargar()

    /* ---------------- Vencimiento ---------------- */
    const vencePronto = computed(() =>
      lote.value?.diasParaVencer != null && lote.value.diasParaVencer <= 3
    )

    const textoVencimiento = computed(() => {
      const d = lote.value?.diasParaVencer
      if (d == null) return 'Este producto no vence'
      if (d < 0) return `Venció hace ${-d} día(s)`
      if (d === 0) return 'Vence hoy'
      return `Faltan ${d} día(s)`
    })

    /* ---------------- Ubicación ---------------- */
    const modal = ref(null)
    const { aviso, avisar } = usarAviso()

    const cerrarModal = () => { modal.value = null }

    const abrirUbicacion = () => {
      modal.value = { ubicacion: lote.value.ubicacion || '', error: '' }
    }

    const guardarUbicacion = async () => {
      const m = modal.value
      m.error = ''
      if (!m.ubicacion.trim() || m.ubicacion.trim().length < 2) {
        return (m.error = 'Indica dónde está, con al menos 2 caracteres.')
      }
      try {
        const actualizado = await store.dispatch('lotes/actualizarUbicacion', {
          id: lote.value.id, ubicacion: m.ubicacion.trim()
        })
        lote.value = { ...lote.value, ubicacion: actualizado.ubicacion }
        cerrarModal()
        avisar('Ubicación registrada')
      } catch (e) {
        m.error = e.message
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

    const fmtHora = new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
    const fechaHora = (v) => (v ? fmtHora.format(new Date(v)) : '—')

    return {
      Number, claseAlerta, textoAlerta,
      puedeEditar, codigo, lote, qr, cargando, reintentar,
      vencePronto, textoVencimiento,
      modal, abrirUbicacion, cerrarModal, guardarUbicacion,
      aviso, clp, fecha, fechaHora
    }
  }
}
</script>

<style scoped>
.cabecera,
.cabecera *,
.destacados *,
.columnas *,
.fondo * {
  box-sizing: border-box;
}

@keyframes entra {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}

.al-entrar {
  animation: entra 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: calc(var(--i, 0) * 50ms);
}

/* ---------- Encabezado ---------- */
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
  margin-bottom: 5px;
  font-size: 0.78rem;
  color: #94a3b8;
}

.migas a {
  color: #059669;
  text-decoration: none;
  font-weight: 600;
}

.migas a:hover { text-decoration: underline; }

.cabecera h2 {
  margin: 0;
  font-size: clamp(1.25rem, 4.5vw, 1.55rem);
  color: #0f172a;
}

.pista {
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.5;
}

.min0 { min-width: 0; }

/* ---------- Destacados ---------- */
.destacados {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.dest {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 15px;
}

.dest.alerta { border-color: #fcd34d; background: #fffbeb; }

.dest .rot {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.dest .val {
  font-size: clamp(1.2rem, 4.5vw, 1.45rem);
  font-weight: 700;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}

.dest .pie {
  font-size: 0.72rem;
  color: #94a3b8;
  line-height: 1.4;
}

/* ---------- Bandas ---------- */
.banda {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 13px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 0.875rem;
  line-height: 1.55;
}

.banda-aviso {
  background: #fef3c7;
  border: 1px solid #fcd34d;
  color: #78350f;
}

.banda-error {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #991b1b;
}

/* ---------- Columnas ---------- */
.columnas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 16px;
  align-items: start;
}

.tarjeta {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px;
}

.tarjeta.ancha { grid-column: 1 / -1; }

.tarjeta h3 {
  margin: 0 0 13px;
  font-size: 0.95rem;
  color: #0f172a;
}

/* ---------- Ficha ---------- */
.ficha { margin: 0; font-size: 0.84rem; }

.ficha > div {
  display: flex;
  gap: 10px;
  padding: 4px 0;
  border-bottom: 1px dotted #f1f5f9;
}

.ficha > div:last-child { border-bottom: 0; }

.ficha dt { min-width: 106px; color: #94a3b8; flex-shrink: 0; }
.ficha dd { margin: 0; color: #334155; min-width: 0; overflow-wrap: break-word; }

.notas {
  margin: 12px 0 0;
  padding: 9px 11px;
  background: #f8fafc;
  border-left: 3px solid #6ee7b7;
  border-radius: 0 7px 7px 0;
  font-size: 0.8rem;
  color: #475569;
  font-style: italic;
}

.ubicacion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding-top: 13px;
  border-top: 1px solid #f1f5f9;
}

.ubicacion .rot {
  display: block;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.ubicacion b { color: #0f172a; font-size: 0.9rem; }

/* ---------- QR ---------- */
.qr-caja {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 10px;
}

.qr {
  width: 168px;
  height: 168px;
  display: block;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
}

.qr-vacio {
  width: 168px;
  height: 168px;
  display: grid;
  place-items: center;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
}

.codigo {
  font-size: 1rem;
  letter-spacing: 0.06em;
  color: #0f172a;
}

/* ---------- Tabla de movimientos ---------- */
table { width: 100%; border-collapse: collapse; }

th {
  text-align: left;
  padding: 9px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64748b;
  white-space: nowrap;
}

td {
  padding: 9px 12px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.84rem;
}

tbody tr:last-child td { border-bottom: 0; }

.der { text-align: right; }
.suave { color: #64748b; }
.mini { font-size: 0.76rem; }
.rojo { color: #dc2626; }
.verde { color: #047857; }

.dato { font-variant-numeric: tabular-nums; font-weight: 600; }

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

.etiqueta.grande {
  padding: 5px 13px;
  font-size: 0.72rem;
}

.et-verde { background: #d1fae5; color: #047857; }
.et-ambar { background: #fef3c7; color: #92400e; }
.et-rojo { background: #fee2e2; color: #991b1b; }
.et-gris { background: #f1f5f9; color: #64748b; }

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

.btn:hover:not(:disabled) { background: #047857; }
.btn:disabled { background: #a7c9bb; cursor: not-allowed; }

.btn-linea {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #475569;
}

.btn-linea:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }

.btn-mini {
  min-height: 34px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}

.ancho { width: 100%; margin-top: 12px; }

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
  max-width: 460px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
}

.modal-cab {
  padding: 18px 20px 14px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-cab h3 { margin: 0; font-size: 1.15rem; color: #0f172a; }
.modal-cab p { margin: 4px 0 0; font-size: 0.82rem; color: #64748b; }

.modal-cuerpo { padding: 18px 20px; }

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
}

.campo:focus {
  border-color: transparent;
  box-shadow: 0 0 0 2px #10b981;
}

.ayuda {
  margin: 8px 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
  line-height: 1.5;
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
  padding: 52px 20px;
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

.vacio .pista { max-width: 44ch; margin: 0 auto; }

.acciones-vacio {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 18px;
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

.aviso.malo { background: #b91c1c; }

/* ---------- Móvil ---------- */
@media (max-width: 720px) {
  table, thead, tbody, tr, td { display: block; width: 100%; }
  thead { display: none; }

  tbody tr {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    margin-bottom: 10px;
    padding: 10px;
  }

  td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 5px 0;
    border: none;
    text-align: right;
  }

  td::before {
    content: attr(data-label);
    font-size: 0.64rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #94a3b8;
    text-align: left;
    flex-shrink: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn { transition: none; }
  .al-entrar { animation: none; }
}
</style>