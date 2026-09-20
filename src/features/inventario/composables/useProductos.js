// src/features/inventario/composables/useProductos.js
import { ref, reactive, onUnmounted } from 'vue'
import { productosService } from '@/features/inventario/services/productos.service'

/**
 * Estado de la grilla de productos, local a quien lo llame.
 *
 * Antes esto vivía en Vuex y lo compartían el POS y Bodega: al cambiar de
 * pantalla la grilla arrancaba con los datos del otro módulo y recién
 * después llegaba la respuesta buena. Acá el estado nace y muere con el
 * componente, así que no hay nada viejo que mostrar.
 */
export function useProductos(filtrosIniciales = {}) {
    const items = ref([])
    const total = ref(0)
    const cargando = ref(false)
    const error = ref('')
    const ultimaCarga = ref(0)

    const filtros = reactive({
        buscar: '',
        categoriaId: null,
        activo: true,
        soloEnVenta: false,
        bajoMinimo: false,
        pagina: 1,
        tamano: 50,
        ...filtrosIniciales
    })

    let control = null
    let peticion = 0   // el nº de la última pedida: descarta respuestas atrasadas

    const cargar = async () => {
        control?.abort()
        control = new AbortController()
        const mia = ++peticion

        cargando.value = true
        error.value = ''

        try {
            const r = await productosService.listar(
                { ...filtros },
                { signal: control.signal }
            )

            /* Llegó tarde: ya hay otra búsqueda en curso, esta respuesta
               es basura. Sin esto, escribir rápido en el buscador deja la
               grilla con el resultado de una letra anterior. */
            if (mia !== peticion) return

            items.value = r.items ?? []
            total.value = r.total ?? items.value.length
            ultimaCarga.value = Date.now()
        } catch (e) {
            if (e.name === 'AbortError' || mia !== peticion) return
            error.value = e.message || 'No se pudo cargar el inventario.'
            items.value = []
            total.value = 0
        } finally {
            if (mia === peticion) cargando.value = false
        }
    }

    /* Cualquier cambio de filtro vuelve a la página 1, salvo que lo que
       se esté cambiando sea justamente la página. */
    const filtrar = (cambios = {}) => {
        if (!('pagina' in cambios)) cambios.pagina = 1
        Object.assign(filtros, cambios)
        return cargar()
    }

    onUnmounted(() => control?.abort())

    return { items, total, cargando, error, filtros, ultimaCarga, cargar, filtrar }
}
