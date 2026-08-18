import { createRouter, createWebHistory } from 'vue-router'

import { MENU_COLIBRI } from '@/config/menuColibri'
import { instalarGuards } from './guards'

import Login from '@/features/auth/views/LoginView.vue'

// Layout como componente diferido también
const MainLayout = () => import('@/layouts/MainLayout.vue') // ⚠️ AJUSTA LA RUTA

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

const routes = [
  { path: '/', redirect: '/dashboard' },

  /* ---------------- Fuera del shell (sin sidebar/header) ---------------- */
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { publica: true, title: 'Iniciar sesión' }
  },
  {
    path: '/sin-permiso',
    name: 'SinPermiso',
    component: Estado,
    meta: { title: 'Sin permiso', estado: 'sin-permiso' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NoEncontrado',
    component: Estado,
    meta: { publica: true, title: 'Página no encontrada', estado: 'no-encontrado' }
  },

  /* ---------------- Dentro del shell (MainLayout) ---------------- */
  {
    path: '/',
    component: MainLayout,
    children: [
      /* ---------------- Operación ---------------- */
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard,
        meta: { permiso: 'dashboard', title: 'Inicio', estado: 'construccion' }
      },
      {
        path: 'reportes',
        name: 'Reportes',
        component: Reportes,
        meta: { permiso: 'reportes', title: 'Reportes' }
      },
      {
        path: 'pos',
        name: 'PuntoDeVenta',
        component: Pos,
        meta: { permiso: 'pos', title: 'Punto de Venta', estado: 'construccion' }
      },
      {
        path: 'ventas',
        name: 'Ventas',
        component: Ventas,
        meta: { permiso: 'ventas', title: 'Ventas y Caja' }
      },

      /* ---------------- Cotizaciones ---------------- */
      {
        path: 'cotizaciones',
        name: 'Cotizaciones',
        component: Cotizaciones,
        meta: { permiso: 'cotizaciones', title: 'Cotizaciones' }
      },

      /* ---------------- Catálogo ---------------- */
      {
        path: 'inventario',
        name: 'Inventario',
        component: Inventario,
        meta: { permiso: 'inventario', title: 'Inventario' }
      },
      {
        path: 'lotes',
        name: 'Lotes',
        component: Lotes,
        meta: { permiso: 'lotes', title: 'Lotes' }
      },
      {
        path: 'lotes/codigo/:codigo',
        name: 'LotePorCodigo',
        component: LoteDetalle,
        meta: { permiso: 'lotes', title: 'Lote', estado: 'construccion' }
      },
      {
        path: 'etiquetas',
        name: 'Etiquetas',
        component: Etiquetas,
        meta: { permiso: 'lotes', title: 'Etiquetas' }
      },
      {
        path: 'etiquetas/compra/:compraId',
        name: 'EtiquetasCompra',
        component: Etiquetas,
        meta: { permiso: 'lotes', title: 'Etiquetas de la compra' }
      },
      {
        path: 'compras',
        name: 'Compras',
        component: Compras,
        meta: { permiso: 'compras', title: 'Compras' }
      },
      {
        path: 'proveedores',
        name: 'Proveedores',
        component: Proveedores,
        meta: { permiso: 'compras', title: 'Proveedores' }
      },
      {
        path: 'mermas',
        name: 'Mermas',
        component: Mermas,
        meta: { permiso: 'mermas', title: 'Mermas' }
      },
      {
        path: 'clientes',
        name: 'Clientes',
        component: Clientes,
        meta: { permiso: 'clientes', title: 'Clientes y Fidelización' }
      },

      /* ---------------- Gestión ---------------- */
      {
        path: 'usuarios',
        name: 'Usuarios',
        component: Usuarios,
        meta: { permiso: 'usuarios', title: 'Equipo y Accesos' }
      },
      {
        path: 'configuracion',
        name: 'Configuracion',
        component: Configuracion,
        meta: { permiso: 'configuracion', title: 'Configuración' }
      },
      {
        path: 'promociones',
        name: 'Promociones',
        component: Promociones,
        meta: { permiso: 'promociones', title: 'Promociones' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior (to, from, savedPosition) {
    return savedPosition || { top: 0 }
  }
})

instalarGuards(router)

if (process.env.NODE_ENV === 'development') {
  // Recorre rutas y children para armar la lista de paths absolutos
  const definidas = []
  const recolectar = (lista, base = '') => {
    lista.forEach(r => {
      // Une base + path evitando dobles barras
      const full = (base + '/' + (r.path || '')).replace(/\/+/g, '/').replace(/\/$/, '') || '/'
      if (r.path !== undefined) definidas.push(full)
      if (r.children) recolectar(r.children, full)
    })
  }
  recolectar(routes)

  MENU_COLIBRI.forEach(item => {
    if (!definidas.includes(item.path)) {
      console.warn(
        `[router] El menú apunta a "${item.path}" (${item.name}) pero no hay ruta con ese path.`
      )
    }
  })
}

export default router
