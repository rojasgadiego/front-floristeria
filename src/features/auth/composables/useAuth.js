/**
 * features/auth/composables/useAuth.js
 * =========================================================================
 * Contexto del usuario para las vistas. Evita que cada componente conozca
 * los nombres de los getters del store.
 * =========================================================================
 */

import { computed } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ROL, textoRol } from '@/core/constantes/roles'

export function useAuth () {
  const store = useStore()
  const router = useRouter()

  const usuario = computed(() => store.getters['auth/currentUser'])
  const autenticado = computed(() => store.getters['auth/isAuthenticated'])
  const rol = computed(() => usuario.value?.role ?? null)

  /**
   * Permisos según el servidor. Sirve para decidir qué se dibuja, no si algo
   * se permite: la barrera real son las políticas de cada endpoint. Si acá
   * decís que sí y allá que no, el resultado es un botón que devuelve 403.
   */
  const puede = (permiso) => store.getters['auth/puede'](permiso)
  const tieneRol = (...roles) => store.getters['auth/tieneRol'](...roles)

  const salir = async () => {
    await store.dispatch('auth/logout')
    router.push({ name: 'login' })
  }

  return {
    usuario,
    autenticado,
    rol,
    nombre: computed(() => usuario.value?.name ?? ''),
    /* Para saludar: "Rosa" en vez de "Rosa Méndez" */
    primerNombre: computed(() => (usuario.value?.name ?? '').split(' ')[0]),
    rolTexto: computed(() => textoRol(rol.value)),

    esAdmin: computed(() => rol.value === ROL.ADMIN),
    esVendedor: computed(() => rol.value === ROL.VENDEDOR),
    esBodega: computed(() => rol.value === ROL.BODEGA),

    minutosParaExpirar: computed(() => store.getters['auth/minutosParaExpirar']),

    puede,
    tieneRol,
    salir
  }
}