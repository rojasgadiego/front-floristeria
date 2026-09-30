/**
 * features/landing/contacto.js
 * =========================================================================
 * Datos públicos del local para la landing. Viven acá y no se piden a
 * /configuracion porque ese endpoint exige sesión y la landing es anónima.
 *
 * ⚠️ PENDIENTE: reemplazar por los datos reales antes de desplegar.
 * =========================================================================
 */

export const CONTACTO = {
  /* Solo dígitos, con código de país: es lo que pide wa.me */
  whatsapp: '56900000000',
  whatsappVisible: '+56 9 0000 0000',
  mensajeWhatsapp: 'Hola, quiero hacer un pedido de flores.',

  direccion: 'Av. Siempre Viva 123',
  comuna: 'Comuna',
  ciudad: 'Ciudad',

  instagram: 'floristeriacolibri',

  horarios: [
    { dias: 'Lunes a viernes', horas: '9:00 a 19:00' },
    { dias: 'Sábado', horas: '9:00 a 14:00' },
    { dias: 'Domingo', horas: 'Cerrado' }
  ]
}
