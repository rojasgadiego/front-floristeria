import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { instalarInterceptores } from '@/core/http/interceptors'

instalarInterceptores()

// Restaurar ANTES de montar: si no, el primer guard corre sin usuario y
// patea al login a alguien que sí tenía sesión.
store.dispatch('auth/initAuth').finally(() => {
  createApp(App).use(store).use(router).mount('#app')
})

// Bloquear una cuenta no corta la sesión abierta: el token sigue válido
// hasta ExpiraEn. El corte real ocurre en /auth/me, así que revalidamos al
// volver el foco a la ventana.
window.addEventListener('focus', () => {
  if (store.getters['auth/isAuthenticated']) store.dispatch('auth/revalidar')
})