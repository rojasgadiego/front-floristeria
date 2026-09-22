<template>
  <div class="inv-venta">
    <EncabezadoSeccion titulo="Inventario Venta" :volver-a="{ name: 'Inventario' }" />

    <TablaProductos
      foco="venta"
      :items="items"
      :filtros="filtros"
      :total="total"
      :cargando="cargando"
      :error="error"
      @filtrar="filtrar"
      @recargar="cargar"
      @traspasar="pedirTraspaso"
    />

  </div>
</template>


<script>
import { ref, onMounted } from 'vue'
import TablaProductos from './TablaProductos.vue'
import EncabezadoSeccion from '@/shared/components/EncabezadoSeccion.vue'
import { useProductos } from '../composables/useProductos'

/* El mostrador mira el mismo catálogo que bodega pero con otra pregunta:
   qué hay adelante para vender. No comparte estado con la vista de bodega
   —cada vista arma su propia instancia del composable— porque cuando lo
   compartían el filtro de una aparecía en la otra al navegar. */
export default {
  name: 'InventarioVenta',
  components: { TablaProductos, EncabezadoSeccion },

  setup() {
    const { items, filtros, total, cargando, error, cargar, filtrar } = useProductos({
      /* La tabla esconde el paginador cuando foco es 'venta', así que lo que
         no venga en esta primera carga no se puede alcanzar desde la interfaz.
         Con el límite por defecto el mostrador vería solo la primera página. */
      tamano: 200,
      activo: true,
      soloEnVenta: true
    })

    /* Desde el mostrador esto no baja varas: pide que las bajen. El botón de
       la tabla es 🔑, no ↓, y el emit viene con requiereAutorizacion en true.
       Se guarda el flag tal como llegó en vez de asumirlo por el rol: quien
       decide si hace falta firma es la tabla, que es la que conoce el permiso,
       y mañana un supervisor en el mesón podría no necesitarla. */
    const pedido = ref(null)

    const pedirTraspaso = (producto, opciones = {}) => {
      pedido.value = {
        producto,
        requiereAutorizacion: opciones.requiereAutorizacion === true
      }
    }

    const cerrarPedido = () => { pedido.value = null }

    const alConfirmarPedido = async () => {
      pedido.value = null
      await cargar()   // el stock de mesón cambió; se relee, no se parchea la fila
    }

    onMounted(cargar)

    return {
      items, filtros, total, cargando, error, cargar, filtrar,
      pedido, pedirTraspaso, cerrarPedido, alConfirmarPedido
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
</style>
