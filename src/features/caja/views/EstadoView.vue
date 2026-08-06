<template>
  <div class="estado-vista">
    <div class="estado-caja">
      <div class="estado-icono" :class="tipo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <!-- En construcción: llave -->
          <template v-if="tipo === 'construccion'">
            <path d="M14.5 5.5a4 4 0 00-5.2 5.2L3 17v4h4l6.3-6.3a4 4 0 005.2-5.2l-2.6 2.6-2.6-.7-.7-2.6z"/>
          </template>
          <!-- Sin permiso: candado -->
          <template v-else-if="tipo === 'sin-permiso'">
            <rect x="4.5" y="10.5" width="15" height="10" rx="2"/>
            <path d="M8 10.5V7.8a4 4 0 018 0v2.7"/>
            <path d="M12 14.5v2.5"/>
          </template>
          <!-- No encontrado: brújula -->
          <template v-else>
            <circle cx="12" cy="12" r="8.5"/>
            <path d="M15.2 8.8l-1.7 4.7-4.7 1.7 1.7-4.7z"/>
          </template>
        </svg>
      </div>

      <h1>{{ titulo }}</h1>
      <p>{{ mensaje }}</p>

      <div class="estado-acciones">
        <button class="btn-principal" @click="$router.push('/dashboard')">
          Ir al inicio
        </button>
        <button class="btn-secundario" @click="$router.back()">
          Volver
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EstadoView',

  computed: {
    // 'construccion' | 'sin-permiso' | 'no-encontrado'
    tipo () {
      return this.$route.meta.estado || 'construccion'
    },

    titulo () {
      const t = {
        'construccion': this.$route.meta.title || 'Módulo en construcción',
        'sin-permiso': 'No tienes acceso a esta sección',
        'no-encontrado': 'Esta página no existe'
      }
      return t[this.tipo]
    },

    mensaje () {
      const m = {
        'construccion': 'Este módulo todavía no está desarrollado. La ruta y los permisos ya están configurados, solo falta crear la vista.',
        'sin-permiso': 'Tu rol no incluye permiso para entrar aquí. Si crees que es un error, pídeselo a la administradora del local.',
        'no-encontrado': 'Revisa la dirección o vuelve al inicio.'
      }
      return m[this.tipo]
    }
  }
}
</script>

<style scoped>
.estado-vista,
.estado-vista * {
  box-sizing: border-box;
}

.estado-vista {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem 1rem;
}

.estado-caja {
  max-width: 27rem;
  text-align: center;
}

.estado-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin-bottom: 1.25rem;
  border-radius: 50%;
  background-color: #d1fae5;
  color: #059669;
}

.estado-icono.sin-permiso {
  background-color: #fee2e2;
  color: #dc2626;
}

.estado-icono.no-encontrado {
  background-color: #e2e8f0;
  color: #475569;
}

.estado-icono svg {
  width: 34px;
  height: 34px;
}

h1 {
  margin: 0 0 0.6rem;
  font-size: clamp(1.15rem, 4.5vw, 1.4rem);
  font-weight: 700;
  color: #1e293b;
  line-height: 1.3;
}

p {
  margin: 0 0 1.75rem;
  font-size: clamp(0.85rem, 3.4vw, 0.95rem);
  line-height: 1.55;
  color: #64748b;
}

.estado-acciones {
  display: flex;
  gap: 0.6rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-principal,
.btn-secundario {
  min-height: 44px;
  padding: 0.65rem 1.4rem;
  border-radius: 0.5rem;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.btn-principal {
  border: none;
  background-color: #059669;
  color: #ffffff;
}

.btn-principal:hover {
  background-color: #047857;
}

.btn-secundario {
  border: 1px solid #cbd5e1;
  background-color: transparent;
  color: #475569;
}

.btn-secundario:hover {
  border-color: #94a3b8;
  background-color: #f8fafc;
}

@media (prefers-reduced-motion: reduce) {
  .btn-principal,
  .btn-secundario { transition: none; }
}
</style>