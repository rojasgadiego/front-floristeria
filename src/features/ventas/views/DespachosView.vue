<template>
  <div class="despachos">
    <header class="cabecera">
      <div>
        <h2>Despachos</h2>
        <p class="capitalizar">{{ esHoy ? 'Hoy, ' : '' }}{{ fechaEntrega(fecha) }}</p>
      </div>

      <div class="navegador" role="group" aria-label="Elegir día">
        <button class="btn btn-icono" type="button" aria-label="Día anterior" @click="moverDia(-1)">‹</button>
        <input v-model="fecha" class="campo-fecha" type="date" aria-label="Fecha de entrega">
        <button class="btn btn-icono" type="button" aria-label="Día siguiente" @click="moverDia(1)">›</button>
        <button class="btn" type="button" :disabled="esHoy" @click="fecha = hoy()">Hoy</button>
        <button class="btn" type="button" :disabled="cargando" @click="cargar">Actualizar</button>
      </div>
    </header>

    <div v-if="error" class="banda" role="alert">
      <span>{{ error }}</span>
      <button class="btn" type="button" @click="cargar">Reintentar</button>
    </div>

    <div class="filtros" role="group" aria-label="Filtrar por estado">
      <button
        v-for="f in FILTROS" :key="f.valor" type="button" class="filtro"
        :class="{ activo: filtro === f.valor }" :aria-pressed="filtro === f.valor"
        @click="filtro = f.valor">
        {{ f.texto }} <b>{{ conteo(f.valor) }}</b>
      </button>
    </div>

    <p v-if="cargando && !despachos.length" class="vacio">Cargando despachos…</p>

    <p v-else-if="!visibles.length && !error" class="vacio">
      {{ despachos.length ? 'No hay despachos con ese estado.' : 'No hay despachos para este día.' }}
    </p>

    <div v-else class="grilla">
      <article v-for="d in visibles" :key="d.ventaId" class="tarjeta" :class="[`estado-${d.estado}`, { atrasado: d.atrasado }]">
        <div class="tarjeta-cab">
          <div>
            <strong class="hora">{{ d.hora || 'Sin hora' }}</strong>
            <span v-if="d.atrasado" class="atraso">Atrasado · {{ fechaCorta(d.fecha) }}</span>
          </div>
          <span class="estado">{{ textoEstado(d.estado) }}</span>
        </div>

        <div class="recibe">
          <strong>{{ d.recibe }}</strong>
          <a :href="`tel:${telefonoLimpio(d.telefono)}`">{{ d.telefono }}</a>
        </div>

        <a class="direccion" :href="enlaceMapa(d.direccion)" target="_blank" rel="noopener noreferrer">
          {{ d.direccion }}
        </a>

        <div v-if="d.indicaciones" class="nota">
          <span class="rotulo">Indicaciones</span>
          <p>{{ d.indicaciones }}</p>
        </div>

        <div class="bloque">
          <span class="rotulo">Productos</span>
          <p class="multilinea">{{ d.productos || 'Sin productos registrados' }}</p>
        </div>

        <div v-if="d.mensaje" class="tarjeta-mensaje">
          <span class="rotulo">Mensaje de la tarjeta</span>
          <p class="multilinea">{{ d.mensaje }}</p>
        </div>

        <div class="pie">
          <div class="segmentos" role="group" :aria-label="`Estado del despacho ${d.folio}`">
            <button
              v-for="e in ESTADOS" :key="e.valor" type="button" class="segmento"
              :class="{ activo: d.estado === e.valor }" :aria-pressed="d.estado === e.valor"
              :disabled="guardando === d.ventaId" @click="cambiar(d, e.valor)">
              {{ e.texto }}
            </button>
          </div>

          <div class="pie-datos">
            <span>Boleta {{ d.folio }} · #{{ d.numeroAtencion }}</span>
            <button class="btn" type="button" @click="imprimirComprobante(d)">Imprimir</button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref, watch } from 'vue'
import { aDateOnly, hoy } from '@/core/utils/fechas'
import { fechaEntrega, imprimirComprobante } from '@/core/impresion/comprobanteDespacho'
import { despachosService } from '../services/despachos.service'

const ESTADOS = [
  { valor: 'pendiente', texto: 'Pendiente' },
  { valor: 'en_camino', texto: 'En camino' },
  { valor: 'entregado', texto: 'Entregado' }
]

const FILTROS = [{ valor: 'todos', texto: 'Todos' }, ...ESTADOS]

export default {
  name: 'DespachosView',

  setup () {
    const fecha = ref(hoy())
    const filtro = ref('todos')
    const despachos = ref([])
    const cargando = ref(false)
    const guardando = ref(null)
    const error = ref('')

    const esHoy = computed(() => fecha.value === hoy())
    const conteo = (valor) => valor === 'todos'
      ? despachos.value.length
      : despachos.value.filter(d => d.estado === valor).length
    const visibles = computed(() => filtro.value === 'todos'
      ? despachos.value
      : despachos.value.filter(d => d.estado === filtro.value))

    /* Cambiar de día rápido no puede dejar en pantalla la respuesta anterior. */
    let controlador = null

    const cargar = async () => {
      if (!fecha.value) return
      controlador?.abort()
      const actual = new AbortController()
      controlador = actual
      cargando.value = true
      error.value = ''
      try {
        const lista = await despachosService.listar(fecha.value, { signal: actual.signal })
        if (controlador === actual) despachos.value = lista ?? []
      } catch (e) {
        if (controlador === actual && !actual.signal.aborted) {
          despachos.value = []
          error.value = e?.mensaje || e?.message || 'No se pudieron cargar los despachos.'
        }
      } finally {
        if (controlador === actual) cargando.value = false
      }
    }

    const cambiar = async (d, estado) => {
      if (d.estado === estado) return
      guardando.value = d.ventaId
      error.value = ''
      try {
        await despachosService.cambiarEstado(d.ventaId, estado)
        await cargar()
      } catch (e) {
        error.value = e?.mensaje || e?.message || 'No se pudo actualizar el despacho.'
      } finally {
        guardando.value = null
      }
    }

    const moverDia = (dias) => {
      const f = new Date(`${fecha.value || hoy()}T12:00:00`)
      f.setDate(f.getDate() + dias)
      fecha.value = aDateOnly(f)
    }

    const textoEstado = (v) => ESTADOS.find(e => e.valor === v)?.texto ?? v
    const fechaCorta = (iso) => new Date(`${iso}T12:00:00`)
      .toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
    const telefonoLimpio = (t) => String(t ?? '').replace(/[^\d+]/g, '')
    const enlaceMapa = (direccion) =>
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion ?? '')}`

    watch(fecha, cargar)
    onMounted(cargar)

    return {
      ESTADOS, FILTROS, fecha, filtro, despachos, visibles, cargando, guardando, error, esHoy,
      conteo, cargar, cambiar, moverDia, hoy, textoEstado, fechaCorta, fechaEntrega,
      telefonoLimpio, enlaceMapa, imprimirComprobante
    }
  }
}
</script>

<style scoped>
.despachos { display: flex; flex-direction: column; gap: 16px; color: var(--text); }

.cabecera {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
}

.cabecera h2 { margin: 0; font-size: 26px; font-weight: 800; }
.cabecera p { margin: 2px 0 0; color: var(--text-muted); }
.capitalizar::first-letter { text-transform: uppercase; }

.navegador { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }

.btn {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.btn:hover:not(:disabled) { background: var(--surface-2); }
.btn:disabled { opacity: .55; cursor: default; }
.btn-icono { width: 40px; padding: 0; font-size: 20px; line-height: 1; }

.campo-fecha {
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
}

.banda {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--danger-border);
  border-radius: 10px;
  background: var(--danger-soft);
  color: var(--text);
}

.filtros { display: flex; flex-wrap: wrap; gap: 8px; }

.filtro {
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.filtro b { margin-left: 4px; color: var(--text); }
.filtro.activo { border-color: var(--accent); background: var(--accent); color: var(--accent-contrast); }
.filtro.activo b { color: inherit; }

.vacio {
  margin: 0;
  padding: 48px 16px;
  border: 1px dashed var(--border-strong);
  border-radius: 14px;
  color: var(--text-muted);
  text-align: center;
}

.grilla {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  align-items: start;
  gap: 14px;
}

.tarjeta {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--border);
  border-left: 4px solid var(--border-strong);
  border-radius: 14px;
  background: var(--surface);
}

.tarjeta.estado-en_camino { border-left-color: var(--info); }
.tarjeta.estado-entregado { border-left-color: var(--success); }
.tarjeta.atrasado { border-left-color: var(--danger); }

.tarjeta-cab { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.hora { display: block; font-size: 22px; font-weight: 800; line-height: 1.1; }
.atraso { display: block; margin-top: 3px; color: var(--danger); font-size: 13px; font-weight: 700; }

.estado {
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
}

.estado-en_camino .estado { background: var(--info-soft); color: var(--text); }
.estado-entregado .estado { background: var(--success-soft); color: var(--text); }

.recibe { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 12px; }
.recibe strong { font-size: 17px; overflow-wrap: anywhere; }
.recibe a, .direccion { color: var(--accent-text); font-weight: 600; overflow-wrap: anywhere; }

.rotulo {
  display: block;
  margin-bottom: 2px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .03em;
  text-transform: uppercase;
}

.bloque p, .nota p, .tarjeta-mensaje p { margin: 0; overflow-wrap: anywhere; }
.multilinea { white-space: pre-line; }

.nota {
  padding: 8px 10px;
  border: 1px solid var(--warn-border);
  border-radius: 8px;
  background: var(--warn-soft);
}

.tarjeta-mensaje {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--secondary-soft);
}

.pie {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.segmentos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; }

.segmento {
  min-height: 44px;
  padding: 0 4px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.segmento:hover:not(:disabled):not(.activo) { background: var(--surface-2); }
.segmento.activo { border-color: var(--accent); background: var(--accent); color: var(--accent-contrast); }
.segmento:disabled { cursor: wait; }

.pie-datos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

button:focus-visible, a:focus-visible, input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
