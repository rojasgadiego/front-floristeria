import { createRouter, createWebHistory } from 'vue-router'

import { MENU_COLIBRI } from '@/config/menuColibri'
import { instalarGuards } from './guards'

import Login from '@/features/auth/views/LoginView.vue'

/*
 * Todo lo demás va en carga diferida: con quince vistas, el eager mete el
 * POS completo en el bundle inicial y la pantalla de login lo descarga
 * antes de que nadie se autentique.
 */
const Dashboard = () => import('@/features/reportes/views/DashboardView.vue')
const Pos = () => import('@/features/ventas/views/PosView.vue')
const Ventas = () => import('@/features/ventas/views/VentasView.vue')
const Inventario = () => import('@/features/inventario/views/InventarioView.vue')
const Lotes = () => import('@/features/lotes/views/LotesView.vue')
const LoteDetalle = () => import('@/features/lotes/views/LotedetalleView.vue')
const Mermas = () => import('@/features/mermas/views/MermasView.vue')
const Compras = () => import('@/features/compras/views/ComprasView.vue')
const Etiquetas = () => import('@/features/lotes/views/EtiquetasView.vue')
const Proveedores = () => import('@/features/compras/views/ProveedoresView.vue')
const Clientes = () => import('@/features/clientes/views/ClientesView.vue')
const Usuarios = () => import('@/features/usuarios/views/UsuariosView.vue')
const Configuracion = () => import('@/features/configuracion/views/ConfiguracionView.vue')
const Estado = () => import('@/features/caja/views/EstadoView.vue')
const Reportes = () => import('@/features/reportes/views/ReportesView.vue')
const Promociones = () => import('@/features/promociones/views/PromocionesView.vue')
const Cotizaciones = () => import('@/features/cotizaciones/views/CotizacionesView.vue')

/*
 * QUIÉN VE QUÉ lo decide el servidor: SesionDto trae `permisos` con las
 * claves de módulo, y el guard las contrasta contra `meta.permiso`. Ya no
 * existe rolesDe(): mantener un mapa de roles en el front en paralelo a las
 * políticas del backend garantizaba que tarde o temprano dijeran cosas
 * distintas.
 *
 * `meta.publica` es lo único que exime de tener sesión. Todo lo que no la
 * declare exige estar autenticado: al revés —opt-in con requiresAuth—
 * olvidarse el flag en una ruta nueva la dejaba abierta.
 */
const routes = [
  { path: '/', redirect: '/dashboard' },

  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { publica: true, title: 'Iniciar sesión' }
  },

  /* ---------------- Operación ---------------- */
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { permiso: 'dashboard', title: 'Inicio', estado: 'construccion' }
  }, {
    path: '/reportes',
    name: 'Reportes',
    component: Reportes,
    meta: { permiso: 'reportes', title: 'Reportes' }
  },
  {
    path: '/pos',
    name: 'PuntoDeVenta',
    component: Pos,
    meta: { permiso: 'pos', title: 'Punto de Venta', estado: 'construccion' }
  },
  {
    path: '/ventas',
    name: 'Ventas',
    component: Ventas,
    meta: { permiso: 'ventas', title: 'Ventas y Caja' }
  },

  /* ---------------- Cotizaciones ---------------- */
  {
    path: '/cotizaciones',
    name: 'Cotizaciones',
    component: Cotizaciones,
    meta: { permiso: 'cotizaciones', title: 'Cotizaciones' }
  },
  /* ---------------- Catálogo ---------------- */
  {
    path: '/inventario',
    name: 'Inventario',
    component: Inventario,
    meta: { permiso: 'inventario', title: 'Inventario' }
  },
  {
    path: '/lotes',
    name: 'Lotes',
    component: Lotes,
    meta: { permiso: 'lotes', title: 'Lotes' }
  },
  {
    /*
     * La URL que va dentro del QR de la etiqueta. Como el guard preserva el
     * `redirect`, alguien que escanea sin sesión entra al login y vuelve
     * directo a la ficha del lote.
     */
    path: '/lotes/codigo/:codigo',
    name: 'LotePorCodigo',
    component: LoteDetalle,
    meta: { permiso: 'lotes', title: 'Lote', estado: 'construccion' }
  },
  {
    path: '/etiquetas',
    name: 'Etiquetas',
    component: Etiquetas,
    meta: { permiso: 'lotes', title: 'Etiquetas' }
  },
  {
    /* El flujo real: se recibe la compra y se imprimen todas juntas al
       desembalar, antes de guardar los paquetes. */
    path: '/etiquetas/compra/:compraId',
    name: 'EtiquetasCompra',
    component: Etiquetas,
    meta: { permiso: 'lotes', title: 'Etiquetas de la compra' }
  },
  {
    path: '/compras',
    name: 'Compras',
    component: Compras,
    meta: { permiso: 'compras', title: 'Compras' }
  },
  {
    path: '/proveedores',
    name: 'Proveedores',
    component: Proveedores,
    meta: { permiso: 'compras', title: 'Proveedores' }
  },
  {
    path: '/mermas',
    name: 'Mermas',
    component: Mermas,
    meta: { permiso: 'mermas', title: 'Mermas' }
  },
  {
    path: '/clientes',
    name: 'Clientes',
    component: Clientes,
    meta: { permiso: 'clientes', title: 'Clientes y Fidelización' }
  },

  /* ---------------- Gestión ---------------- */
  {
    path: '/usuarios',
    name: 'Usuarios',
    component: Usuarios,
    meta: { permiso: 'usuarios', title: 'Equipo y Accesos' }
  },
  {
    path: '/configuracion',
    name: 'Configuracion',
    component: Configuracion,
    meta: { permiso: 'configuracion', title: 'Configuración' }
  },
   {
    path: '/promociones',
    name: 'Promociones',
    component: Promociones,
    meta: { permiso: 'promociones', title: 'Promociones' }
  },

  /* ---------------- Estados ---------------- */
  {
    path: '/sin-permiso',
    name: 'SinPermiso',
    component: Estado,
    /* Sin `permiso`: si la pantalla que explica que no tenés acceso
       exigiera acceso, el guard entraría en bucle. */
    meta: { title: 'Sin permiso', estado: 'sin-permiso' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NoEncontrado',
    component: Estado,
    meta: { publica: true, title: 'Página no encontrada', estado: 'no-encontrado' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 }
  }
})

instalarGuards(router)

/* Aviso en desarrollo si el menú apunta a una ruta que no existe. Sin esto,
   el ítem aparece y al tocarlo tira un error de navegación sin explicación. */
if (process.env.NODE_ENV === 'development') {
  const definidas = routes.map(r => r.path)
  MENU_COLIBRI.forEach(item => {
    if (!definidas.includes(item.path)) {
      console.warn(
        `[router] El menú apunta a "${item.path}" (${item.name}) pero no hay ruta con ese path.`
      )
    }
  })
}

export default router