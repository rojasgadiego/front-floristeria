/**
 * router/guards.js
 * =========================================================================
 * Convenciones de meta:
 *
 *   publica: true        → accesible sin sesión (login, 404)
 *   requiresAuth: false  → equivalente a publica, por compatibilidad
 *   roles: [...]         → roles permitidos
 *   permiso: 'usuarios'  → módulo, contrastado con los permisos de SesionDto
 *
 * Todo lo que no diga `publica` exige sesión. Es al revés de `requiresAuth`
 * opt-in: así, olvidarse el flag en una ruta nueva la deja protegida de más
 * en vez de pública de menos. El error caro es el otro.
 * =========================================================================
 */

import store from '@/store'

/* Los nombres van acá arriba porque si uno no coincide con el de la ruta,
   vue-router falla en la navegación sin decir cuál de los tres fue. */
const RUTA_LOGIN = 'Login'
const RUTA_INICIO = 'Dashboard'
const RUTA_SIN_PERMISO = 'SinPermiso'

const esPublica = (to) =>
  to.meta.publica === true || to.meta.requiresAuth === false

export function instalarGuards (router) {
  router.beforeEach(async (to) => {
    /* Red de seguridad por si alguien navega antes de que main.js termine */
    if (!store.state.auth.iniciada) {
      await store.dispatch('auth/initAuth')
    }

    const autenticado = store.getters['auth/isAuthenticated']

    if (esPublica(to)) {
      /* Ya logueado entrando al login → al inicio */
      return autenticado && to.name === RUTA_LOGIN ? { name: RUTA_INICIO } : true
    }

    if (!autenticado) {
      return { name: RUTA_LOGIN, query: { redirect: to.fullPath } }
    }

    if (to.meta.roles?.length && !store.getters['auth/tieneRol'](...to.meta.roles)) {
      return { name: RUTA_SIN_PERMISO }
    }

    if (to.meta.permiso && !store.getters['auth/puede'](to.meta.permiso)) {
      return { name: RUTA_SIN_PERMISO }
    }

    if (to.meta.title) document.title = `${to.meta.title} · Colibrí`

    return true
  })
}