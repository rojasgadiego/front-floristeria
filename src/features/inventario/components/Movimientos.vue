<template>
  <section class="movimientos">
    <EncabezadoSeccion titulo="Movimientos" :volver-a="{ name: 'Inventario' }" />

    <div class="barra-filtros">
      <select v-if="esAdmin" class="campo campo-corto" v-model="usuarioMovimientos" @change="cargarMovimientos"
        aria-label="Filtrar por usuario">
        <option value="">Todos los usuarios</option>
        <option v-for="u in usuariosConMovimientos" :key="u" :value="u">{{ u }}</option>
      </select>
      <p v-else class="pista">Aquí ves solo los movimientos que registraste tú.</p>

      <button class="btn btn-linea btn-mini" @click="cargarMovimientos">Actualizar</button>
    </div>

    <div v-if="!movimientosVisibles.length" class="vacio">
      <strong>Sin movimientos</strong>
      {{ esAdmin ? 'Todavía no hay movimientos registrados.' : 'No has registrado movimientos todavía.' }}
    </div>

    <div v-else class="tabla-envoltura">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Dónde</th>
            <th>Producto</th>
            <th>Lote</th>
            <th class="der">Cantidad</th>
            <th>Motivo</th>
            <th v-if="esAdmin">Usuario</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in movimientosVisibles" :key="m.id" class="fila">
            <td data-label="Fecha" class="dato mini">{{ fechaHora(m.fecha) }}</td>
            <td data-label="Tipo">
              <span class="etiqueta" :class="claseMovimiento(m.tipo)">{{ m.tipo }}</span>
            </td>
            <td data-label="Dónde">
              <span class="etiqueta" :class="m.ubicacion === 'venta' ? 'et-rosa' : 'et-gris'">
                {{ m.ubicacion === 'venta' ? 'mostrador' : 'bodega' }}
              </span>
            </td>
            <td data-label="Producto">{{ m.producto }}</td>
            <td data-label="Lote" class="mini suave">{{ m.loteCodigo || '—' }}</td>
            <td data-label="Cantidad" class="der dato" :class="{ negativo: m.cantidad < 0 }">
              {{ m.cantidad > 0 ? '+' : '' }}{{ m.cantidad }}
            </td>
            <td data-label="Motivo" class="suave">{{ m.motivo }}</td>
            <td v-if="esAdmin" data-label="Usuario" class="suave mini">{{ m.usuario || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { claseMovimiento } from '@/features/inventario/store/inventario.module'
import EncabezadoSeccion from '@/shared/components/EncabezadoSeccion.vue';

export default {
  name: 'Movimientos',
  components: { EncabezadoSeccion },

  setup() {
    const store = useStore()

    const esAdmin = computed(() => store.getters['auth/esAdmin'])
    const movimientos = computed(() => store.getters['inventario/movimientos'])
    const yo = computed(() => store.getters['auth/currentUser'] || {})

    const usuarioMovimientos = ref('')

    /*
     * Este filtro es de presentación, no de seguridad: el endpoint devuelve ya
     * recortado según el token. Existe para que la interfaz sea coherente y
     * como red por si algún día el servidor manda de más.
     */
    const cargarMovimientos = () =>
      store.dispatch('inventario/cargarMovimientos', {
        usuario: esAdmin.value ? (usuarioMovimientos.value || null) : (yo.value.id ?? yo.value.email)
      })

    onMounted(cargarMovimientos)

    /* Comparar por id es lo correcto; el nombre es el plan B mientras el DTO
       no traiga usuarioId. Dos personas pueden llamarse igual. */
    const esMio = (m) => {
      if (m.usuarioId != null && yo.value.id != null) return m.usuarioId === yo.value.id
      const suyo = String(m.usuario || '').trim().toLowerCase()
      const mio = String(yo.value.name || yo.value.email || '').trim().toLowerCase()
      return !!suyo && suyo === mio
    }

    const movimientosVisibles = computed(() =>
      esAdmin.value ? movimientos.value : movimientos.value.filter(esMio)
    )

    const usuariosConMovimientos = computed(() =>
      [...new Set(movimientos.value.map(m => m.usuario).filter(Boolean))].sort()
    )

    const fmtFecha = new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
    const fechaHora = (v) => (v ? fmtFecha.format(new Date(v)) : '—')

    return {
      esAdmin, usuarioMovimientos, usuariosConMovimientos, movimientosVisibles,
      cargarMovimientos, claseMovimiento, fechaHora
    }
  }
}
</script>

<style scoped>
.movimientos {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pista {
  margin: 0;
  font-size: .875rem;
  color: var(--text-muted);
}

.btn-linea {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
  border-radius: var(--r-sm, 8px);
  font: inherit;
  cursor: pointer;
}

.btn-mini {
  min-height: 34px;
  padding: .35rem .75rem;
  font-size: .8rem;
}

.btn-linea:hover {
  background: var(--surface-2);
  color: var(--text);
}

.barra-filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
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

.campo-corto {
  width: auto;
  flex: 0 1 210px;
}

.tabla-envoltura {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md, 12px);
  overflow: auto;
  max-height: min(65vh, 720px);
}

table {
  width: 100%;
  min-width: 780px;
  border-collapse: separate;
  border-spacing: 0;
}

th {
  position: sticky;
  top: 0;
  z-index: 2;
  text-align: left;
  padding: 11px 14px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
}

td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--border);
  font-size: .875rem;
  color: var(--text);
  vertical-align: middle;
}

tbody tr:last-child td {
  border-bottom: 0;
}

.fila:hover td {
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}

.der {
  text-align: right;
}

.suave {
  color: var(--text-muted);
}

.mini {
  font-size: .78rem;
}

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.negativo {
  color: var(--danger);
}

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

.vacio {
  text-align: center;
  padding: 44px 20px;
  color: var(--text-muted);
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

@media (max-width: 860px) {
  .tabla-envoltura {
    border: none;
    background: transparent;
    overflow: visible;
    max-height: none;
  }

  table,
  thead,
  tbody,
  tr,
  td {
    display: block;
    width: 100%;
    min-width: 0;
  }

  thead {
    display: none;
  }

  tbody tr {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg, 14px);
    box-shadow: var(--shadow-sm);
    margin-bottom: 12px;
    padding: 14px 16px;
  }

  td {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 14px;
    padding: 9px 0;
    border: none;
    border-bottom: 1px solid var(--border);
    text-align: right;
  }

  tbody tr td:last-child {
    border-bottom: none;
  }

  td::before {
    content: attr(data-label) ":";
    font-size: .8rem;
    font-weight: 500;
    color: var(--text-muted);
    text-align: left;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .campo-corto {
    flex: 1 1 100%;
    width: 100%;
  }
}
</style>