<template>
  <div class="inv-venta">
    <EncabezadoSeccion titulo="Inventario Venta" :volver-a="{ name: 'Inventario' }" />
    <TablaProductos foco="venta" />
  </div>
</template>

<script>
import TablaProductos from './TablaProductos.vue'
import EncabezadoSeccion from '@/shared/components/EncabezadoSeccion.vue'; 

export default {
  name: 'InventarioVenta',
  components: { TablaProductos, EncabezadoSeccion }
}
</script>

<style scoped>
.inv-venta { display: flex; flex-direction: column; gap: 16px; }
</style>