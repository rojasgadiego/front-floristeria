/**
 * features/landing/contacto.js
 * =========================================================================
 * Datos públicos del local para la landing. Viven acá y no se piden a
 * /configuracion porque ese endpoint exige sesión y la landing es anónima.
 * =========================================================================
 */

export const CONTACTO = {
  /* Solo dígitos, con código de país: es lo que pide wa.me */
  whatsapp: '56981999014',
  whatsappVisible: '+56 9 8199 9014',
  mensajeWhatsapp: 'Hola, quiero hacer un pedido de flores.',

  direccion: 'Jumbo, Av. Guillermo Ulriksen',
  comuna: 'La Serena',
  ciudad: 'Chile',

  instagram: 'colibri.creacion',

  horarios: [
    { dias: 'Lunes a domingo', horas: '9:30 AM a 8:00 PM' }
  ]
}
