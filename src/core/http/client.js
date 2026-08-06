/**
 * core/http/client.js
 * =========================================================================
 * La API no tiene endpoint de refresh: el token vale hasta ExpiraEn y ahí
 * se acabó la sesión. Por eso acá no hay nada de renovación — el
 * interceptor solo pone el bearer y detecta el 401 terminal.
 * =========================================================================
 */

import axios from 'axios'

const baseURL = process.env.VUE_APP_API_URL || '/api'

const config = {
  baseURL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' }
}

/** Instancia principal: lleva bearer. */
export const http = axios.create(config)

/** Para /auth/login, que es anónimo y no debe llevar Authorization. */
export const httpPublico = axios.create(config)