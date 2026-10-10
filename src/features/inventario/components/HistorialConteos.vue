<template>
  <div class="historial">
    <div v-if="error" class="banda banda-error">
      <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      <button class="btn btn-mini" @click="cargar">Reintentar</button>
    </div>

    <div v-if="cargando && !conteos.length" class="vacio">Cargando el historial…</div>

    <div v-else-if="!conteos.length" class="vacio">
      <strong>Todavía no hay conteos</strong>
      Cuando alguien aplique un conteo, aparece acá con lo que contó.
    </div>

    <ul v-else class="lista">
      <li v-for="c in conteos" :key="c.id">
        <button class="conteo" @click="abrir(c)">
          <span class="lugar" :class="c.ubicacion">{{ c.ubicacion === 'bodega' ? '🏠 Bodega' : '🛍️ Vitrina' }}</span>
          <span class="quien">
            <b>{{ c.usuario || '—' }}</b>
            <span class="sub">{{ fecha(c.creadoEn) }} · {{ hora(c.creadoEn) }}</span>
            <span v-if="c.detalle" class="sub">{{ c.detalle }}</span>
          </span>
          <span class="cifras">
            <span class="sub">{{ c.lineas }} contado(s)</span>
            <span v-if="!c.conDiferencia" class="verde">todo cuadró</span>
            <template v-else>
              <span v-if="c.sobrantes" class="azul">+{{ c.sobrantes }} sobra</span>
              <span v-if="c.faltantes" class="rojo">−{{ c.faltantes }} falta · {{ clp(c.valorFaltante) }}</span>
            </template>
            <span v-if="c.autorizadoPor" class="sub" :title="`Firmado: ${c.autorizadoPor}`">🔐</span>
          </span>
        </button>
      </li>
    </ul>

    <!-- ═══ Detalle ═══ -->
    <div v-if="abierto" class="fondo" @click.self="abierto = null">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-detalle-conteo">
        <div class="modal-cab">
          <h3 id="titulo-detalle-conteo">
            Conteo de {{ abierto.conteo.ubicacion }} · {{ fecha(abierto.conteo.creadoEn) }}
          </h3>
          <p>
            {{ abierto.conteo.usuario || '—' }} · {{ hora(abierto.conteo.creadoEn) }}
            <template v-if="abierto.conteo.detalle"> · {{ abierto.conteo.detalle }}</template>
          </p>
        </div>

        <div class="modal-cuerpo">
          <div class="resumen">
            <div><span class="rot">Contado</span><b class="dato">{{ abierto.conteo.lineas }}</b></div>
            <div><span class="rot">Sobró</span><b class="dato azul">{{ abierto.conteo.sobrantes }}</b></div>
            <div><span class="rot">Faltó</span><b class="dato rojo">{{ abierto.conteo.faltantes }}</b></div>
            <div><span class="rot">Valor faltante</span><b class="dato rojo">{{ clp(abierto.conteo.valorFaltante) }}</b></div>
          </div>

          <!-- Lo que cambió primero: es lo que se viene a mirar. -->
          <table class="lineas">
            <thead>
              <tr><th class="izq">Producto</th><th>Sistema</th><th>Contado</th><th>Dif.</th></tr>
            </thead>
            <tbody>
              <tr v-for="(l, i) in abierto.lineas" :key="i" :class="{ sobra: l.diferencia > 0, falta: l.diferencia < 0 }">
                <td class="izq">
                  {{ l.emoji }} {{ l.producto }}
                  <span v-if="l.origen" class="sub mono"> {{ l.origen }}</span>
                  <span v-if="l.mermaId" class="sub" title="Registrado como merma 'Faltante en conteo'"> · merma</span>
                </td>
                <td class="dato">{{ l.sistema }}</td>
                <td class="dato">{{ l.contado }}</td>
                <td class="dato dif">{{ l.diferencia > 0 ? '+' : '' }}{{ l.diferencia }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" @click="abierto = null">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { inventarioService } from '@/features/inventario/services/inventario.service'

const conteos = ref([])
const cargando = ref(false)
const error = ref('')
const abierto = ref(null)

const cargar = async () => {
  cargando.value = true
  error.value = ''
  try {
    conteos.value = await inventarioService.conteos() || []
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
}

const abrir = async (c) => {
  try {
    abierto.value = await inventarioService.detalleConteo(c.id)
  } catch (e) {
    error.value = e.message
  }
}

defineExpose({ cargar })
onMounted(cargar)

const fmt = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
const clp = (n) => fmt.format(Math.round(n || 0))
const fecha = (v) => new Date(v).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
const hora = (v) => new Date(v).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
</script>

<style scoped>
.historial { display: flex; flex-direction: column; gap: 12px; }

.lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.conteo {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.conteo:hover { border-color: var(--border-strong); }
.lugar { font-size: .8rem; font-weight: 700; white-space: nowrap; }
.quien { display: flex; flex-direction: column; min-width: 0; }
.cifras { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: .82rem; font-weight: 600; }

.sub { font-size: .76rem; color: var(--text-muted); font-weight: 400; }
.mono { font-family: var(--font-mono); }
.dato { font-variant-numeric: tabular-nums; font-weight: 700; }
.verde { color: var(--success); }
.azul { color: var(--info); }
.rojo { color: var(--danger); }
.rot {
  display: block;
  font-size: .62rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.vacio { padding: 28px 16px; text-align: center; color: var(--text-muted); font-size: .9rem; }
.vacio strong { display: block; color: var(--text); margin-bottom: 4px; }

.banda {
  display: flex; align-items: center; gap: 10px; padding: 11px 13px;
  border-radius: var(--r-sm); font-size: .86rem;
}
.banda > span:nth-child(2) { flex: 1; }
.banda-error { background: var(--danger-soft); color: var(--danger); border-left: 4px solid var(--danger); }

.fondo {
  position: fixed; inset: 0; z-index: 70; display: grid; place-items: center;
  padding: 16px; background: var(--overlay);
}
.modal {
  width: 100%; max-width: 620px; max-height: 92dvh; display: flex; flex-direction: column;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
}
.modal-cab { padding: 16px 20px 12px; border-bottom: 1px solid var(--border); }
.modal-cab h3 { margin: 0; font-size: 1.05rem; }
.modal-cab p { margin: 4px 0 0; font-size: .82rem; color: var(--text-muted); }
.modal-cuerpo { padding: 14px 20px; overflow-y: auto; }
.modal-pie {
  display: flex; justify-content: flex-end; padding: 12px 20px;
  border-top: 1px solid var(--border); background: var(--surface-2);
}

.resumen { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
.resumen > div { padding: 8px 10px; border-radius: var(--r-sm); background: var(--surface-2); }

.lineas { width: 100%; border-collapse: collapse; font-size: .86rem; }
.lineas th {
  padding: 6px 8px; text-align: right; font-size: .66rem; letter-spacing: .06em;
  text-transform: uppercase; color: var(--text-faint); border-bottom: 1px solid var(--border);
}
.lineas td { padding: 7px 8px; text-align: right; border-bottom: 1px solid var(--border); }
.lineas .izq { text-align: left; }
.lineas tr.sobra .dif { color: var(--info); }
.lineas tr.falta .dif { color: var(--danger); }

.btn {
  display: inline-flex; align-items: center; justify-content: center; min-height: 44px;
  padding: 0 16px; border: 1px solid transparent; border-radius: var(--r-sm);
  background: var(--accent); color: var(--accent-contrast); font: inherit; font-weight: 700; cursor: pointer;
}
.btn-linea { background: var(--surface); border-color: var(--border-strong); color: var(--text-muted); }
.btn-mini { min-height: 34px; padding: 0 12px; font-size: .8rem; }

@media (max-width: 560px) {
  .conteo { grid-template-columns: 1fr auto; }
  .lugar { grid-column: 1 / -1; }
  .resumen { grid-template-columns: repeat(2, 1fr); }
}
</style>
