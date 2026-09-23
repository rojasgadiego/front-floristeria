<template>
  <div class="inv-venta">
    <EncabezadoSeccion titulo="Inventario Venta" :volver-a="{ name: 'Inventario' }" />

    <!-- El mesón: qué hay adelante para vender. La única acción es devolver
         a bodega lo que sobró (admin y bodega); bajar se hace desde Bodega.
         Para quien vende es solo lectura. -->
    <TablaProductos
      foco="venta"
      :items="items"
      :filtros="filtros"
      :total="total"
      :cargando="cargando"
      :error="error"
      @filtrar="filtrar"
      @recargar="cargar"
      @retornar="p => retorno = p"
    />

    <ModalRetorno v-if="retorno" :producto="retorno" @cerrar="retorno = null" @retornado="alRetornar" />

    <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
  </div>
</template>


<script>
import { ref, onMounted } from 'vue'
import TablaProductos from './TablaProductos.vue'
import EncabezadoSeccion from '@/shared/components/EncabezadoSeccion.vue'
import ModalRetorno from './modales/ModalRetorno.vue'
import { useProductos } from '../composables/useProductos'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'

/* El mostrador mira el mismo catálogo que bodega pero con otra pregunta:
   qué hay adelante para vender. No comparte estado con la vista de bodega
   —cada vista arma su propia instancia del composable— porque cuando lo
   compartían el filtro de una aparecía en la otra al navegar. */
export default {
  name: 'InventarioVenta',
  components: { TablaProductos, EncabezadoSeccion, ModalRetorno },

  setup() {
    const { usarAviso } = useTemporizadores()
    const { aviso, avisar } = usarAviso()

    const { items, filtros, total, cargando, error, cargar, filtrar } = useProductos({
      /* La tabla esconde el paginador cuando foco es 'venta', así que lo que
         no venga en esta primera carga no se puede alcanzar desde la interfaz.
         Con el tamaño por defecto el mostrador vería solo la primera página. */
      tamano: 200,
      activo: true,
      soloEnVenta: true
    })

    /* ---------------- Devolver a bodega ---------------- */
    const retorno = ref(null)

    const alRetornar = async (r) => {
      retorno.value = null
      avisar(`${r.devuelto ?? r.cantidad} de ${r.producto ?? 'producto'} de vuelta en bodega`)
      await cargar()
    }

    onMounted(cargar)

    return {
      items, filtros, total, cargando, error, cargar, filtrar,
      retorno, alRetornar,
      aviso
    }
  }
}
</script>


<style scoped>
.inv-venta {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.aviso {
  position: fixed;
  bottom: max(22px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: 80;
  max-width: 90vw;
  padding: 12px 20px;
  border-radius: var(--r-sm, 10px);
  background: var(--text);
  color: var(--bg);
  font-size: .875rem;
  font-weight: 600;
  box-shadow: var(--shadow-lg);
  text-align: center;
}

.aviso.malo {
  background: var(--danger);
  color: var(--surface);
}
</style>
