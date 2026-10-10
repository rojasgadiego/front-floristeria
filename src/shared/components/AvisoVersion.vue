<template>
  <!-- Arriba y no abajo: abajo viven el botón flotante del carrito y la
       barra del teléfono. -->
  <Transition name="aviso-version">
    <div v-if="hayNueva" class="aviso-version" role="status">
      <span class="aviso-version__icono" aria-hidden="true">✨</span>
      <span class="aviso-version__texto">
        <b>Hay una versión nueva</b>
        <span>Actualiza cuando no estés cobrando.</span>
      </span>
      <span class="aviso-version__acciones">
        <Boton variante="fantasma" tam="sm" @click="descartar">Después</Boton>
        <Boton tam="sm" @click="actualizar">Actualizar</Boton>
      </span>
    </div>
  </Transition>
</template>

<script setup>
import Boton from '@/shared/components/ui/Boton.vue'
import { useVersionNueva } from '@/shared/composables/useVersionNueva.js'

const { hayNueva, actualizar, descartar } = useVersionNueva()
</script>

<style scoped>
.aviso-version {
  position: fixed;
  top: max(12px, env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: min(440px, calc(100vw - 24px));

  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 10px 10px 14px;

  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 4px solid var(--accent);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-lg);
  color: var(--text);
}

.aviso-version__icono { font-size: 1.2rem; }

.aviso-version__texto {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-size: .85rem;
  line-height: 1.3;
}
.aviso-version__texto span { color: var(--text-muted); font-size: .78rem; }

.aviso-version__acciones { display: flex; gap: 6px; }

/* En el teléfono no caben texto y botones en una fila: los botones bajan. */
@media (max-width: 420px) {
  .aviso-version { flex-wrap: wrap; }
  .aviso-version__acciones { width: 100%; justify-content: flex-end; }
}

.aviso-version-enter-active,
.aviso-version-leave-active { transition: opacity .2s, transform .2s; }
.aviso-version-enter-from,
.aviso-version-leave-to { opacity: 0; transform: translate(-50%, -8px); }
</style>
