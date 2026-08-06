/**
 * core/auth/token-storage.js
 * =========================================================================
 * Guarda el token y su vencimiento. Sin refresh token: la API no lo emite.
 *
 * El token vive en memoria; la copia en storage existe solo para sobrevivir
 * a un F5. `localStorage` o `sessionStorage` según el checkbox "Recordar
 * sesión" del login: sin marcar, cerrar la pestaña cierra la sesión — que
 * es lo que corresponde en el computador compartido del mesón.
 * =========================================================================
 */

const CLAVE_TOKEN = 'colibri.token'
const CLAVE_EXPIRA = 'colibri.expira'
const CLAVE_PERSISTE = 'colibri.persiste'

let enMemoria = null

const persistente = () => localStorage.getItem(CLAVE_PERSISTE) === '1'
const almacen = () => (persistente() ? localStorage : sessionStorage)
const leer = (clave) => sessionStorage.getItem(clave) ?? localStorage.getItem(clave)

export const tokenStorage = {
  obtener () {
    if (enMemoria) return enMemoria
    enMemoria = leer(CLAVE_TOKEN)
    return enMemoria
  },

  /** Instante de vencimiento en ms, o 0 si no hay sesión. */
  expiraEn () {
    const valor = leer(CLAVE_EXPIRA)
    return valor ? Number(valor) : 0
  },

  msRestantes () {
    const expira = this.expiraEn()
    return expira ? expira - Date.now() : 0
  },

  /* Margen de 30s por el desfase de reloj entre navegador y servidor. */
  vencido (margenSeg = 30) {
    const expira = this.expiraEn()
    return expira ? expira - Date.now() <= margenSeg * 1000 : false
  },

  guardar ({ token, expiraEn }, recordar = false) {
    localStorage.setItem(CLAVE_PERSISTE, recordar ? '1' : '0')

    enMemoria = token
    almacen().setItem(CLAVE_TOKEN, token)

    if (expiraEn) {
      almacen().setItem(CLAVE_EXPIRA, String(new Date(expiraEn).getTime()))
    }
  },

  limpiar () {
    enMemoria = null
    for (const s of [localStorage, sessionStorage]) {
      s.removeItem(CLAVE_TOKEN)
      s.removeItem(CLAVE_EXPIRA)
    }
    localStorage.removeItem(CLAVE_PERSISTE)
  }
}