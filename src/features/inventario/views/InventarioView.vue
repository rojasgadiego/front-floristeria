<template>
  <div class="inv-app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'InventarioView'
}
</script>

<style scoped>
.inv-app {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>