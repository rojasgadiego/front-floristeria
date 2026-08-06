/**
 * core/http/interceptors.js
 * =========================================================================
 * Se instala una vez desde main.js, antes de montar la app.
 *
 *   1. Desenvuelve ApiResponse<T> y deja el `mensaje` accesible aparte.
 *   2. Pone el bearer.
 *   3. Ante un 401, cierra sesión: sin endpoint de refresh no hay
 *      recuperación posible, y reintentar solo demora lo inevitable.
 * =========================================================================
 */

import { http, httpPublico } from './client'
import { desenvolver, esSobre } from './respuesta'
import { normalizarError } from './errores'
import { tokenStorage } from '@/core/auth/token-storage'
import { emitirSesionExpirada } from '@/core/auth/eventos'

/*
 * El mensaje del sobre se guarda en `res.mensaje` antes de descartarlo.
 * Es lo que permite el toast de "Hola, Rosa" del login o el "Cuenta
 * bloqueada" de usuarios, sin obligar a cada servicio a saber que el sobre
 * existe.
 */
const desenvolvedor = (res) => {
  if (esSobre(res.data)) res.mensaje = res.data.mensaje ?? null
  res.data = desenvolver(res.data)
  return res
}

export function instalarInterceptores () {
  http.interceptors.response.use(desenvolvedor)
  httpPublico.interceptors.response.use(desenvolvedor)

  /* --- Bearer ------------------------------------------------------- */
  http.interceptors.request.use((config) => {
    if (config.sinAuth) return config

    const token = tokenStorage.obtener()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  /* --- 401 terminal -------------------------------------------------- */
  http.interceptors.response.use(
    (res) => res,
    (error) => {
      const status = error.response?.status

      /*
       * Solo sobre `http`: un 401 en httpPublico es el login rechazando
       * credenciales, no una sesión que se murió. Si esto también corriera
       * ahí, escribir mal la clave te mandaría a la pantalla de "sesión
       * expirada" en vez de mostrarte el error en el formulario.
       */
      if (status === 401 && !error.config?.sinAuth) {
        tokenStorage.limpiar()
        emitirSesionExpirada()
      }

      return Promise.reject(normalizarError(error))
    }
  )
}