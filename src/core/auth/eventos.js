/*
 * El interceptor necesita avisarle al store que la sesión murió, pero el
 * store importa los servicios que importan el cliente http. Un bus mínimo
 * corta ese ciclo sin traer una librería.
 */
const suscriptores = new Set()

export const onSesionExpirada = (fn) => {
  suscriptores.add(fn)
  return () => suscriptores.delete(fn)
}

export const emitirSesionExpirada = (motivo = 'expirada') => {
  suscriptores.forEach((fn) => fn(motivo))
}