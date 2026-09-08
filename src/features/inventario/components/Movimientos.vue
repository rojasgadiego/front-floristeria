<template>
  <section class="movimientos">
    <EncabezadoSeccion titulo="Movimientos" :volver-a="{ name: 'Inventario' }" />

    <div v-if="error" class="banda banda-error">
      <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      <button class="btn btn-mini" @click="cargar">Reintentar</button>
    </div>

    <p v-if="!esAdmin" class="pista">Aquí ves solo los movimientos que registraste tú.</p>

    <!-- ─── Barra ─── -->
    <div class="barra">
      <div class="buscador">
        <span aria-hidden="true">🔎</span>
        <input v-model="busqueda" placeholder="Producto, lote o motivo…" aria-label="Buscar movimiento">
        <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
      </div>

      <button class="btn btn-linea filtros-btn" :class="{ activo: nFiltros > 0 }" @click="filtrosAbiertos = true"
        :aria-label="`Filtros${nFiltros ? `, ${nFiltros} activos` : ''}`">
        Filtros
        <span v-if="nFiltros" class="globo">{{ nFiltros }}</span>
      </button>

      <button class="btn btn-linea btn-icono grande" @click="cargar" :disabled="cargando" aria-label="Actualizar">
        <span aria-hidden="true">↻</span>
      </button>
    </div>

    <div v-if="chips.length" class="chips">
      <button v-for="c in chips" :key="c.clave" class="chip" @click="c.quitar()">
        {{ c.texto }} <span aria-hidden="true">✕</span>
      </button>
      <button class="chip limpiar" @click="limpiarFiltros">Limpiar todo</button>
    </div>

    <div v-if="cargando && !movimientos.length" class="vacio">Cargando movimientos…</div>

    <div v-else-if="!filtrados.length" class="vacio">
      <strong>{{ hayFiltro ? 'Ningún movimiento coincide' : 'Sin movimientos' }}</strong>
      {{ hayFiltro
        ? 'Prueba con otro texto o quita los filtros.'
        : (esAdmin ? 'Todavía no hay movimientos registrados.' : 'No has registrado movimientos todavía.') }}
    </div>

    <!-- ─── Bitácora ─── -->
    <div v-else class="bitacora" :class="{ atenuada: cargando }">
      <div class="cab" :class="{ 'sin-usuario': !esAdmin }" aria-hidden="true">
        <span>Fecha</span>
        <span>Tipo</span>
        <span>Dónde</span>
        <span>Producto</span>
        <span>Lote</span>
        <span class="der">Cantidad</span>
        <span>Motivo</span>
        <span v-if="esAdmin">Usuario</span>
      </div>

      <article v-for="m in pagina" :key="m.id" class="mov" :class="{ 'sin-usuario': !esAdmin }">
        <div class="c-fecha dato mini suave">{{ fechaHora(m.fecha) }}</div>

        <div class="c-tipo">
          <span class="etiqueta" :class="claseMovimiento(m.tipo)">{{ m.tipo }}</span>
        </div>

        <div class="c-donde">
          <span class="etiqueta" :class="m.ubicacion === 'venta' ? 'et-rosa' : 'et-gris'">
            {{ m.ubicacion === 'venta' ? 'mostrador' : 'bodega' }}
          </span>
        </div>

        <div class="c-prod">{{ m.producto }}</div>

        <div class="c-lote mini suave">
          <span v-if="m.loteCodigo" class="mono">{{ m.loteCodigo }}</span>
          <span v-else class="tenue">—</span>
        </div>

        <!-- El signo importa más que el número: dice si entró o salió flor -->
        <div class="c-cant der dato" :class="m.cantidad < 0 ? 'negativo' : 'positivo'">
          {{ m.cantidad > 0 ? '+' : '' }}{{ m.cantidad }}
        </div>

        <div class="c-motivo suave">{{ m.motivo }}</div>

        <div v-if="esAdmin" class="c-usuario mini suave">{{ m.usuario || '—' }}</div>
      </article>
    </div>

    <p v-if="totalPaginas > 1" class="paginador">
      <button class="btn btn-linea btn-mini" :disabled="nPagina <= 1" @click="nPagina--">Anterior</button>
      <span class="mini suave">
        Página {{ nPagina }} de {{ totalPaginas }} · {{ filtrados.length }} movimiento(s)
      </span>
      <button class="btn btn-linea btn-mini" :disabled="nPagina >= totalPaginas" @click="nPagina++">Siguiente</button>
    </p>

    <p v-else-if="filtrados.length" class="paginador">
      <span class="mini suave">{{ filtrados.length }} movimiento(s)</span>
    </p>

    <!-- ─── Hoja de filtros ─── -->
    <div v-if="filtrosAbiertos" class="fondo" @click.self="filtrosAbiertos = false">
      <div class="hoja" role="dialog" aria-modal="true" aria-labelledby="titulo-filtros">
        <div class="hoja-cab">
          <span class="agarre" aria-hidden="true"></span>
          <h3 id="titulo-filtros">Filtros</h3>
          <button class="btn-icono" @click="filtrosAbiertos = false" aria-label="Cerrar">✕</button>
        </div>

        <div class="hoja-cuerpo">
          <div class="grupo">
            <label>Tipo de movimiento</label>
            <div class="pastillas">
              <button class="pastilla" :class="{ on: !fTipo }" @click="fTipo = ''">Todos</button>
              <button v-for="t in tipos" :key="t" class="pastilla" :class="{ on: fTipo === t }"
                @click="fTipo = t">{{ t }}</button>
            </div>
          </div>

          <div class="grupo">
            <label>Dónde</label>
            <div class="pastillas">
              <button class="pastilla" :class="{ on: !fUbicacion }" @click="fUbicacion = ''">Ambas</button>
              <button class="pastilla" :class="{ on: fUbicacion === 'bodega' }"
                @click="fUbicacion = 'bodega'">Bodega</button>
              <button class="pastilla" :class="{ on: fUbicacion === 'venta' }"
                @click="fUbicacion = 'venta'">Mostrador</button>
            </div>
          </div>

          <div v-if="esAdmin" class="grupo">
            <label for="f-usuario">Usuario</label>
            <select id="f-usuario" class="campo" v-model="fUsuario">
              <option value="">Todos los usuarios</option>
              <option v-for="u in usuarios" :key="u" :value="u">{{ u }}</option>
            </select>
          </div>

          <div class="grupo">
            <label>Periodo</label>
            <div class="pastillas">
              <button v-for="p in PRESETS" :key="p.clave" class="pastilla" :class="{ on: presetActivo === p.clave }"
                @click="aplicarPreset(p.clave)">{{ p.texto }}</button>
            </div>
          </div>

          <div v-if="presetActivo === 'personalizado'" class="grupo par">
            <label class="campo-fecha">
              <span>Desde</span>
              <input type="date" v-model="fDesde">
            </label>
            <label class="campo-fecha">
              <span>Hasta</span>
              <input type="date" v-model="fHasta">
            </label>
          </div>
        </div>

        <div class="hoja-pie">
          <button class="btn btn-linea" @click="limpiarFiltros">Limpiar</button>
          <button class="btn" @click="filtrosAbiertos = false">Ver {{ filtrados.length }} movimiento(s)</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { claseMovimiento } from '@/features/inventario/store/inventario.module'
import EncabezadoSeccion from '@/shared/components/EncabezadoSeccion.vue'

const POR_PAGINA = 50

const PRESETS = [
  { clave: 'todo', texto: 'Todo' },
  { clave: 'hoy', texto: 'Hoy' },
  { clave: '7d', texto: '7 días' },
  { clave: 'mes', texto: 'Este mes' },
  { clave: 'personalizado', texto: 'Otro rango' }
]

/* YYYY-MM-DD en hora local. toISOString() da UTC y en Chile adelanta el día
   durante la tarde. */
const iso = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const sumarDias = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export default {
  name: 'Movimientos',
  components: { EncabezadoSeccion },

  setup () {
    const store = useStore()

    const esAdmin = computed(() => store.getters['auth/esAdmin'])
    const movimientos = computed(() => store.getters['inventario/movimientos'])
    const yo = computed(() => store.getters['auth/currentUser'] || {})

    const cargando = ref(false)
    const error = ref('')

    /* ---------------- Carga ---------------- */
    /* El admin trae todo y filtra en el cliente. Antes el select de usuario
       recargaba filtrando en el servidor, y como la lista de usuarios salía
       de lo cargado, al elegir a alguien el select se quedaba con esa sola
       persona: había que volver a "Todos" para poder cambiar. */
    let control = null

    const cargar = async () => {
      control?.abort()
      control = new AbortController()

      cargando.value = true
      error.value = ''
      try {
        await store.dispatch('inventario/cargarMovimientos', {
          usuario: esAdmin.value ? null : (yo.value.id ?? yo.value.email),
          signal: control.signal
        })
      } catch (e) {
        if (e.name !== 'AbortError') error.value = e.message || 'No se pudieron cargar los movimientos.'
      } finally {
        cargando.value = false
      }
    }

    onMounted(cargar)
    onUnmounted(() => control?.abort())

    /* ---------------- Filtros ---------------- */
    const filtrosAbiertos = ref(false)
    const busqueda = ref('')
    const fTipo = ref('')
    const fUbicacion = ref('')
    const fUsuario = ref('')
    const fDesde = ref('')
    const fHasta = ref('')
    const rangoManual = ref(false)

    /* Comparar por id es lo correcto; el nombre es el plan B mientras el DTO
       no traiga usuarioId. Dos personas pueden llamarse igual. */
    const esMio = (m) => {
      if (m.usuarioId != null && yo.value.id != null) return m.usuarioId === yo.value.id
      const suyo = String(m.usuario || '').trim().toLowerCase()
      const mio = String(yo.value.name || yo.value.email || '').trim().toLowerCase()
      return !!suyo && suyo === mio
    }

    /* Este recorte es de presentación, no de seguridad: el endpoint ya
       devuelve recortado según el token. Es la red por si el servidor manda
       de más algún día. */
    const mios = computed(() =>
      esAdmin.value ? movimientos.value : movimientos.value.filter(esMio)
    )

    /* Tipos y usuarios salen del conjunto completo, no del filtrado: si
       salieran del filtrado, elegir uno vaciaría la lista de los demás. */
    const tipos = computed(() =>
      [...new Set(mios.value.map(m => m.tipo).filter(Boolean))].sort()
    )

    const usuarios = computed(() =>
      [...new Set(mios.value.map(m => m.usuario).filter(Boolean))].sort()
    )

    const rangoPreset = (clave) => {
      const h = new Date()
      switch (clave) {
        case 'hoy': return { desde: iso(h), hasta: iso(h) }
        case '7d': return { desde: iso(sumarDias(h, -6)), hasta: iso(h) }
        case 'mes': return { desde: iso(new Date(h.getFullYear(), h.getMonth(), 1)), hasta: iso(h) }
        default: return { desde: '', hasta: '' }
      }
    }

    const presetActivo = computed(() => {
      if (!fDesde.value && !fHasta.value) return rangoManual.value ? 'personalizado' : 'todo'
      for (const p of ['hoy', '7d', 'mes']) {
        const r = rangoPreset(p)
        if (r.desde === fDesde.value && r.hasta === fHasta.value) return p
      }
      return 'personalizado'
    })

    const aplicarPreset = (clave) => {
      rangoManual.value = clave === 'personalizado'
      if (clave === 'personalizado') return
      const r = rangoPreset(clave)
      fDesde.value = r.desde
      fHasta.value = r.hasta
    }

    const filtrados = computed(() => {
      const q = busqueda.value.trim().toLowerCase()
      /* El "hasta" incluye el día completo: un rango de un solo día no puede
         devolver vacío porque el movimiento fue a las tres de la tarde. */
      const desde = fDesde.value ? new Date(`${fDesde.value}T00:00:00`).getTime() : null
      const hasta = fHasta.value ? new Date(`${fHasta.value}T23:59:59.999`).getTime() : null

      return mios.value.filter(m => {
        if (fTipo.value && m.tipo !== fTipo.value) return false
        if (fUbicacion.value && m.ubicacion !== fUbicacion.value) return false
        if (fUsuario.value && m.usuario !== fUsuario.value) return false

        if (desde || hasta) {
          const t = new Date(m.fecha).getTime()
          if (desde && t < desde) return false
          if (hasta && t > hasta) return false
        }

        if (q) {
          const heno = `${m.producto || ''} ${m.loteCodigo || ''} ${m.motivo || ''}`.toLowerCase()
          if (!heno.includes(q)) return false
        }

        return true
      })
    })

    const chips = computed(() => {
      const out = []
      if (fTipo.value) out.push({ clave: 'tipo', texto: fTipo.value, quitar: () => { fTipo.value = '' } })
      if (fUbicacion.value) {
        out.push({
          clave: 'ubicacion',
          texto: fUbicacion.value === 'venta' ? 'Mostrador' : 'Bodega',
          quitar: () => { fUbicacion.value = '' }
        })
      }
      if (fUsuario.value) {
        out.push({ clave: 'usuario', texto: fUsuario.value, quitar: () => { fUsuario.value = '' } })
      }
      if (fDesde.value || fHasta.value) {
        const texto = presetActivo.value === 'personalizado'
          ? `${fDesde.value || '…'} a ${fHasta.value || '…'}`
          : PRESETS.find(p => p.clave === presetActivo.value)?.texto
        out.push({
          clave: 'fechas',
          texto,
          quitar: () => { fDesde.value = ''; fHasta.value = ''; rangoManual.value = false }
        })
      }
      return out
    })

    const nFiltros = computed(() => chips.value.length)
    const hayFiltro = computed(() => nFiltros.value > 0 || !!busqueda.value.trim())

    const limpiarFiltros = () => {
      busqueda.value = ''
      fTipo.value = ''
      fUbicacion.value = ''
      fUsuario.value = ''
      fDesde.value = ''
      fHasta.value = ''
      rangoManual.value = false
    }

    /* ---------------- Paginación ---------------- */
    /* En cliente: la bitácora solo crece —cada venta, traspaso, merma y
       recepción escribe una fila— y montar miles de <article> de una deja la
       vista pegada. El arreglo de fondo es paginar en el servidor. */
    const nPagina = ref(1)

    const totalPaginas = computed(() =>
      Math.max(1, Math.ceil(filtrados.value.length / POR_PAGINA))
    )

    const pagina = computed(() => {
      const inicio = (nPagina.value - 1) * POR_PAGINA
      return filtrados.value.slice(inicio, inicio + POR_PAGINA)
    })

    /* Al filtrar, la página 7 puede dejar de existir */
    watch(filtrados, () => { nPagina.value = 1 })

    /* ---------------- Utilidades ---------------- */
    const fmtFecha = new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
    const fechaHora = (v) => (v ? fmtFecha.format(new Date(v)) : '—')

    return {
      PRESETS,
      esAdmin, movimientos, cargando, error, cargar,
      filtrosAbiertos, busqueda, fTipo, fUbicacion, fUsuario, fDesde, fHasta,
      tipos, usuarios, presetActivo, aplicarPreset,
      filtrados, chips, nFiltros, hayFiltro, limpiarFiltros,
      nPagina, totalPaginas, pagina,
      claseMovimiento, fechaHora
    }
  }
}
</script>

<style scoped>
.movimientos {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.der { text-align: right; }
.suave { color: var(--text-muted); }
.tenue { color: var(--text-faint); }
.mini { font-size: .78rem; }
.mono { font-family: var(--font-mono); font-size: .95em; }

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.pista {
  margin: 0;
  font-size: .875rem;
  color: var(--text-muted);
}

/* ─── Barra ─── */

.barra {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

.buscador {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 44px;
  padding: 0 12px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm, 8px);
  transition: border-color var(--t-fast);
}

.buscador:focus-within { border-color: var(--accent); }

.buscador input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  color: var(--text);
  font: inherit;
  font-size: max(.9rem, 16px);
}

.filtros-btn {
  flex: 0 0 auto;
  gap: 8px;
}

.filtros-btn.activo {
  border-color: var(--accent);
  color: var(--accent-text, var(--accent));
}

.globo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  border-radius: var(--r-full, 999px);
  background: var(--accent);
  color: var(--accent-contrast, #fff);
  font-size: .7rem;
  font-weight: 700;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  border: 1px solid var(--accent-soft);
  border-radius: var(--r-full, 999px);
  background: var(--accent-soft);
  color: var(--accent-text, var(--accent));
  font: inherit;
  font-size: .76rem;
  font-weight: 600;
  padding: 4px 11px;
  cursor: pointer;
}

.chip.limpiar {
  background: transparent;
  border-color: var(--border-strong);
  color: var(--text-muted);
}

/* ─── Bitácora ─── */

.bitacora {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md, 12px);
  overflow: hidden;
  transition: opacity .14s ease;
}

.bitacora.atenuada { opacity: .45; }

/* Una sola definición de columnas para rótulos y filas */
.cab,
.mov {
  display: grid;
  grid-template-columns:
    120px 106px 98px minmax(130px, 1.3fr) 104px 82px minmax(120px, 1fr) 104px;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
}

/* Sin la columna de usuario cuando no es admin: dejarla vacía corría todo
   hacia la izquierda y sobraba una franja al final. */
.cab.sin-usuario,
.mov.sin-usuario {
  grid-template-columns:
    120px 106px 98px minmax(130px, 1.3fr) 104px 82px minmax(120px, 1fr);
}

.cab {
  padding-top: 10px;
  padding-bottom: 10px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  font-size: .66rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
}

.mov {
  padding-top: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
  font-size: .86rem;
  white-space: nowrap;
}

.mov:last-child { border-bottom: 0; }

.mov:hover { background: color-mix(in srgb, var(--accent) 4%, var(--surface)); }

.c-prod,
.c-motivo,
.c-lote,
.c-usuario {
  overflow: hidden;
  text-overflow: ellipsis;
}

.c-prod { font-weight: 600; }

/* El signo dice si entró o salió flor. Es el dato que se busca al recorrer
   la bitácora, así que lleva color en los dos sentidos, no solo en rojo. */
.negativo { color: var(--danger); }
.positivo { color: var(--success); }

.etiqueta {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--r-full, 999px);
  font-size: .62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
  white-space: nowrap;
}

.et-rosa {
  background: var(--accent-soft);
  color: var(--accent-text, var(--accent));
}

.et-gris {
  background: var(--surface-2);
  color: var(--text-muted);
}

/* ─── Hoja de filtros ─── */

.fondo {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 16px;
  background: var(--overlay, rgba(0, 0, 0, .5));
}

.hoja {
  width: 100%;
  max-width: 520px;
  max-height: 88dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg, 14px);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.hoja-cab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.hoja-cab h3 { flex: 1; font-size: 1.05rem; font-weight: 700; }

.agarre { display: none; }

.hoja-cuerpo {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px;
}

.hoja-pie {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}

.hoja-pie .btn { flex: 1; }

.grupo { margin-bottom: 18px; }
.grupo:last-child { margin-bottom: 0; }
.grupo.par { display: flex; gap: 12px; }

.grupo > label {
  display: block;
  font-size: .8rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 7px;
}

.pastillas {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pastilla {
  padding: 8px 13px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-full, 999px);
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  font-size: .82rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color var(--t-fast), color var(--t-fast), background-color var(--t-fast);
}

.pastilla.on {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent-text, var(--accent));
}

.pastilla:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.campo {
  width: 100%;
  min-height: 44px;
  padding: .6rem .75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm, 8px);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: max(.9rem, 16px);
}

.campo:focus { outline: 0; border-color: var(--accent); }

.campo-fecha {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}

.campo-fecha > span {
  font-size: .74rem;
  font-weight: 600;
  color: var(--text-faint);
}

.campo-fecha input {
  height: 44px;
  width: 100%;
  padding: 0 .6rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm, 8px);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: max(.85rem, 16px);
}

/* ─── Botones ─── */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: .65rem 1.15rem;
  border: none;
  border-radius: var(--r-sm, 8px);
  background: var(--accent);
  color: var(--accent-contrast, #fff);
  font: inherit;
  font-size: .92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--t-fast);
}

.btn:hover:not(:disabled) { background: var(--accent-hover, var(--accent)); }
.btn:disabled { opacity: .55; cursor: not-allowed; }

.btn-linea {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.btn-linea:hover:not(:disabled) { background: var(--surface-2); color: var(--text); }

.btn-mini {
  min-height: 34px;
  padding: .35rem .75rem;
  font-size: .8rem;
}

.btn-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--r-sm, 8px);
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  cursor: pointer;
}

.btn-icono.chico { width: 26px; height: 26px; font-size: .78rem; }

.btn-icono.grande {
  width: 44px;
  height: auto;
  min-height: 44px;
  font-size: 1.05rem;
}

/* ─── Bandas y vacío ─── */

.banda {
  display: flex;
  align-items: center;
  gap: 11px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: var(--r-sm, 8px);
  font-size: .85rem;
}

.banda-error {
  background: var(--danger-soft);
  border: 1px solid var(--danger-border, transparent);
  color: var(--danger);
}

.banda .btn { margin-left: auto; }

.vacio {
  text-align: center;
  padding: 44px 20px;
  color: var(--text-muted);
  font-size: .88rem;
  background: var(--surface);
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-md, 12px);
}

.vacio strong {
  display: block;
  color: var(--text);
  font-size: 1.05rem;
  margin-bottom: 5px;
}

.paginador {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 0;
  color: var(--text-muted);
}

/* ─── Anchos intermedios ─── */

@media (max-width: 1080px) {

  .cab,
  .mov,
  .cab.sin-usuario,
  .mov.sin-usuario {
    grid-template-columns: 120px 106px 98px minmax(130px, 1.3fr) 82px minmax(110px, 1fr) 104px;
  }

  .c-lote,
  .cab > span:nth-child(5) { display: none; }
}

/* ─── Móvil ─── */
/* Sin acordeón: los ocho campos pesan lo mismo y ninguno es "detalle". Lo
   que sobraba era repetir "Producto:", "Lote:", "Motivo:" en cada tarjeta. */

@media (max-width: 860px) {
  .cab { display: none; }

  .mov,
  .mov.sin-usuario {
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas:
      "tipo prod  cant"
      "meta meta  meta"
      "motivo motivo motivo";
    gap: 4px 10px;
    padding: 12px;
    white-space: normal;
  }

  .c-tipo { grid-area: tipo; }
  .c-prod { grid-area: prod; }
  .c-cant { grid-area: cant; font-size: 1rem; }

  /* Fecha, dónde, lote y usuario en una sola línea de metadatos */
  .c-fecha,
  .c-donde,
  .c-lote,
  .c-usuario {
    grid-area: meta;
    display: inline;
  }

  .c-fecha::after,
  .c-donde::after,
  .c-lote::after {
    content: " · ";
    color: var(--text-faint);
  }

  .c-donde .etiqueta {
    padding: 0;
    background: none;
    color: var(--text-faint);
    font-size: .74rem;
    letter-spacing: 0;
  }

  .c-lote { display: none; }

  .c-motivo {
    grid-area: motivo;
    font-size: .8rem;
  }

  .buscador { flex: 1 1 100%; }

  .fondo { place-items: end center; padding: 0; }

  .hoja {
    max-width: none;
    max-height: 92dvh;
    border-radius: var(--r-lg, 14px) var(--r-lg, 14px) 0 0;
    border-bottom: 0;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .hoja-cab { padding-top: 22px; }

  .agarre {
    display: block;
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 34px;
    height: 4px;
    border-radius: var(--r-full, 999px);
    background: var(--border-strong);
  }

  .hoja-pie { flex-direction: column-reverse; }

  .paginador .btn { flex: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .btn, .pastilla, .buscador, .campo, .bitacora { transition: none; }
}
</style>