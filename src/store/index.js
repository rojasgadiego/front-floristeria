import { createStore } from 'vuex'
import auth, { conectarEventosAuth } from '@/features/auth/store/auth.module'
import usuarios from '@/features/usuarios/store/usuarios.module'
import clientes from '@/features/clientes/store/clientes.module'
import configuracion from '@/features/configuracion/store/configuracion.module'
import inventario from '@/features/inventario/store/inventario.module'
import productos from '@/features/inventario/store/productos.module'
import lotes from '@/features/lotes/store/lotes.module'
import mermas from '@/features/mermas/store/mermas.module'
import proveedores from '@/features/compras/store/proveedores.module'
import presentaciones from '@/features/compras/store/presentaciones.module'
import compras from '@/features/compras/store/compras.module'
import reportes from '@/features/reportes/store/reportes.module'
import promociones from '@/features/promociones/store/promociones.module'
import cotizaciones from '@/features/cotizaciones/store/cotizaciones.modules'
import ventas from '@/features/ventas/store/ventas.module'
import caja from '@/features/ventas/store/caja.module'

const store = createStore({
  modules: {
    auth,
    usuarios,
    clientes,
    proveedores,
    configuracion,
    presentaciones,
    compras,
    cotizaciones,
    inventario,
    productos,
    lotes,
    mermas,
    reportes,
    promociones,
    ventas,
    caja
  }
})

// El interceptor no puede importar el store (ciclo), así que avisa por el bus
conectarEventosAuth(store)

export default store