/**
 * core/constantes/roles.js
 * =========================================================================
 * Etiquetas de rol para selects y tablas. Nada más.
 *
 * NO hay mapa de permisos acá: SesionDto los trae del servidor en
 * `Permisos`. Un mapa local sería una segunda fuente de verdad que se
 * desincroniza de las políticas del backend en el primer cambio, y el
 * síntoma es un botón visible que devuelve 403 al tocarlo.
 * =========================================================================
 */

export const ROL = {
  ADMIN: 'admin',
  VENDEDOR: 'vendedor',
  BODEGA: 'bodega'
}

export const ROLES = [
  {
    valor: ROL.ADMIN,
    texto: 'Administradora',
    descripcion: 'Acceso total: caja, anulaciones, precios, equipo y reportes.'
  },
  {
    valor: ROL.VENDEDOR,
    texto: 'Vendedor',
    descripcion: 'Vende, cotiza y atiende clientes. Ve el inventario sin editarlo.'
  },
  {
    valor: ROL.BODEGA,
    texto: 'Bodega',
    descripcion: 'Inventario, mermas y reportes de stock. No accede a la caja.'
  }
]

export const textoRol = (valor) =>
  ROLES.find(r => r.valor === valor)?.texto ?? valor ?? '—'

export const esRolValido = (valor) => ROLES.some(r => r.valor === valor)