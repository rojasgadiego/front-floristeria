/**
 * Menú del ERP Floristería Colibrí
 * =========================================================================
 * Un solo lugar donde viven las rutas, los íconos y a qué módulo
 * corresponde cada entrada.
 *
 * QUIÉN VE QUÉ lo decide el servidor: SesionDto trae `permisos` con las
 * claves de módulo, y `filtrarMenuPorPermisos` las contrasta contra `clave`.
 * Así el backend queda como única autoridad y el front solo obedece.
 *
 * El array `roles` de cada ítem ya NO filtra el menú. Sobrevive para las
 * tarjetas de rol de la vista Equipo, que muestran qué ve cada rol —
 * información que el servidor no expone, porque /auth/me solo habla de
 * quien está conectado. Es descriptivo, no una barrera.
 * =========================================================================
 */

const ico = (contenido) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
        stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${contenido}</svg>`

export const MENU_COLIBRI = [
  // ---------------- Operación ----------------
  {
    path: '/dashboard',
    clave: 'dashboard',
    name: 'Inicio',
    seccion: 'Operación',
    roles: ['Admin', 'Vendedor', 'Bodega'],
    icon: ico('<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/>')
  },
  {
    path: '/pos',
    clave: 'pos',
    name: 'Punto de Venta',
    seccion: 'Operación',
    roles: ['Admin', 'Vendedor'],
    icon: ico('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M6.5 12.5h3.5M6.5 16h3.5"/><rect x="14" y="12.5" width="3.5" height="3.5" rx="0.6"/>')
  },
  {
    path: '/cotizaciones',
    clave: 'cotizaciones',
    name: 'Cotizaciones y Eventos',
    seccion: 'Operación',
    roles: ['Admin', 'Vendedor'],
    icon: ico('<path d="M9 3.5h6v2.8H9z"/><path d="M15 4.9h3.5V21H5.5V4.9H9"/><path d="M8.8 11h6.4M8.8 14.5h6.4M8.8 18h4"/>')
  },
  {
    path: '/ventas',
    clave: 'ventas',
    name: 'Ventas y Caja',
    seccion: 'Operación',
    roles: ['Admin', 'Vendedor'],
    icon: ico('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9.5 8.5h5M9.5 12.5h5"/>')
  },

  // ---------------- Catálogo ----------------
  {
    path: '/inventario',
    clave: 'inventario',
    name: 'Inventario',
    seccion: 'Catálogo',
    roles: ['Admin', 'Vendedor', 'Bodega'],
    icon: ico('<path d="M3 8l9-4 9 4v8l-9 4-9-4z"/><path d="M3 8l9 4 9-4"/><path d="M12 12v8"/>')
  },
  {
    path: '/compras',
    clave: 'compras',
    name: 'Compras',
    seccion: 'Catálogo',
    roles: ['Admin', 'Bodega'],
    icon: ico('<path d="M3.5 4.5h2.2l2.1 10.2h9.4l1.9-7.4H7.2"/><circle cx="10" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>')
  },
  {
    path: '/proveedores',
    clave: 'proveedores',
    name: 'Proveedores',
    seccion: 'Catálogo',
    roles: ['Admin', 'Bodega'],
    icon: ico('<path d="M3 13.5V8.5h11v8H3z"/><path d="M14 11h3.5l2.5 3v2.5h-6z"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>')
  },
  {
    path: '/lotes',
    clave: 'lotes',
    name: 'Lotes',
    seccion: 'Catálogo',
    roles: ['Admin', 'Bodega'],
    icon: ico('<path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5z"/><path d="M4 7.5 12 11l8-3.5M12 11v9"/><path d="M8 5.8v3.6"/>')
  },
  {
    path: '/mermas',
    clave: 'mermas',
    name: 'Mermas',
    seccion: 'Catálogo',
    roles: ['Admin', 'Bodega'],
    icon: ico('<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6.2 7l.9 13.5h9.8L17.8 7"/><path d="M10 11v6M14 11v6"/>')
  },
  {
    path: '/clientes',
    clave: 'clientes',
    name: 'Clientes y Fidelización',
    seccion: 'Catálogo',
    roles: ['Admin', 'Vendedor'],
    icon: ico('<path d="M12 20.3C7.2 16.5 3.8 13.6 3.8 10.1 3.8 7.6 5.7 5.8 8 5.8c1.6 0 3.1.8 4 2.1.9-1.3 2.4-2.1 4-2.1 2.3 0 4.2 1.8 4.2 4.3 0 3.5-3.4 6.4-8.2 10.2z"/>')
  },
  {
    path: '/promociones',
    clave: 'promociones',
    name: 'Promociones',
    seccion: 'Catálogo',
    roles: ['Admin'],
    icon: ico('<path d="M3.6 12.4l8.8-8.8H20v7.6l-8.8 8.8z"/><circle cx="16.4" cy="7.6" r="1.4"/>')
  },

  // ---------------- Gestión ----------------
  {
    path: '/reportes',
    clave: 'reportes',
    name: 'Reportes',
    seccion: 'Gestión',
    roles: ['Admin', 'Bodega'],
    icon: ico('<path d="M4 20h16"/><path d="M7.5 20v-5.5M12 20V7M16.5 20v-9"/>')
  },
  {
    path: '/usuarios',
    clave: 'usuarios',
    name: 'Equipo y Accesos',
    seccion: 'Gestión',
    roles: ['Admin'],
    icon: ico('<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20c0-3.4 2.8-6.2 6.2-6.2s6.2 2.8 6.2 6.2"/><path d="M15.8 5.3a3.4 3.4 0 010 5.4"/><path d="M17.6 14.2c2 .9 3.6 2.9 3.6 5.2"/>')
  },
  {
    path: '/configuracion',
    clave: 'configuracion',
    name: 'Configuración',
    seccion: 'Gestión',
    roles: ['Admin'],
    icon: ico('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.4 5.4l1.9 1.9M16.7 16.7l1.9 1.9M18.6 5.4l-1.9 1.9M7.3 16.7l-1.9 1.9"/>')
  }
]

/**
 * Filtra el menú con los permisos que mandó el servidor.
 * Un ítem sin `clave` se muestra siempre.
 *
 * El backend puede mandar módulos que todavía no tienen pantalla ("lotes",
 * "compras"): no aparecen porque no están en este array. Al revés no pasa,
 * y ese es el punto — nada se muestra sin que el servidor lo autorice.
 */
export function filtrarMenuPorPermisos(permisos = []) {
  const lista = permisos || []
  if (lista.includes('*')) return MENU_COLIBRI

  return MENU_COLIBRI.filter(item => !item.clave || lista.includes(item.clave))
}

/**
 * Solo para mostrar qué módulos ve cada rol en las tarjetas de la vista
 * Equipo. NO usar para decidir accesos: el servidor es quien manda.
 */
export function modulosPorRol(rol) {
  const buscado = String(rol).toLowerCase()
  return MENU_COLIBRI
    .filter(item => item.roles?.some(r => r.toLowerCase() === buscado))
    .map(item => item.name)
}

export default MENU_COLIBRI