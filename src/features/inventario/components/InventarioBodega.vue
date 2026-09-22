<template>
    <div class="inv-bodega">
        <EncabezadoSeccion titulo="Inventario Bodega" :volver-a="{ name: 'Inventario' }">
            <template v-if="puedeEditar" #acciones>
                <button class="btn btn-linea" @click="abrirRamo(null)">💐 Nuevo ramo</button>
                <button class="btn" @click="abrirNuevo">＋ Nuevo producto</button>
            </template>
        </EncabezadoSeccion>

        <!-- La tabla ya no lee nada por su cuenta: recibe lo que esta vista
             acaba de traer del endpoint y avisa hacia arriba cuando el
             usuario cambia un filtro. Una sola fuente de datos. -->
        <TablaProductos foco="bodega" :items="items" :filtros="filtros" :total="total" :cargando="cargando"
            :error="error" :categorias="categorias" :bajo-minimo="filtros.bajoMinimo" @filtrar="filtrar"
            @recargar="cargar" @traspasar="abrirTraspaso" @retornar="p => retorno = p" @armar="p => armando = p"
            @editar="abrirEditar" @baja="p => baja = p" @estado="cambiarEstado" />

        <!-- Cada acción de la tabla abre su propio modal. Los modales piden
             sus datos al abrirse y avisan con un evento al terminar; esta
             vista solo decide qué recargar y qué avisar. -->
        <ModalTraspaso v-if="traspaso" :producto="traspaso.producto"
            :requiere-autorizacion="traspaso.requiereAutorizacion" @cerrar="traspaso = null"
            @traspasado="alTraspasar" />

        <ModalPartida v-if="partida" :partida="partida" @cerrar="partida = null" @imprimir="imprimirEtiqueta" />

        <ModalRetorno v-if="retorno" :producto="retorno" @cerrar="retorno = null" @retornado="alRetornar" />

        <ModalArmado v-if="armando" :producto="armando" @cerrar="armando = null" @armado="alArmar" />

        <ModalBaja v-if="baja" :producto="baja" @cerrar="baja = null" @confirmado="alDarDeBaja" />

        <ModalProducto v-if="formularioAbierto" :producto="editando" @cerrar="cerrarFormulario"
            @guardado="alGuardarProducto" />

        <ModalRamo v-if="ramo" :producto="ramo.producto" @cerrar="ramo = null" @guardado="alGuardarRamo" />

        <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
    </div>
</template>

<script>
import { ref, computed, onMounted, onActivated, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import TablaProductos from './TablaProductos.vue'
import EncabezadoSeccion from '@/shared/components/EncabezadoSeccion.vue'
import ModalArmado from './ModalArmado.vue'
import ModalProducto from './ModalProducto.vue'
import ModalRamo from './ModalRamo.vue'
import ModalTraspaso from './modales/ModalTraspaso.vue'
import ModalPartida from './modales/ModalPartida.vue'
import ModalRetorno from './modales/ModalRetorno.vue'
import ModalBaja from './modales/ModalBaja.vue'
import { productosService } from '@/features/inventario/services/productos.service'
import { useProductos } from '@/features/inventario/composables/useProductos'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'

/* Si el usuario vuelve a la pestaña después de este rato, lo que hay en
   pantalla ya no sirve: se relee. Menos que esto es recargar por nada. */
const FRESCURA_MS = 30_000

export default {
    name: 'InventarioBodega',
    components: {
        TablaProductos, EncabezadoSeccion,
        ModalArmado, ModalProducto, ModalRamo,
        ModalTraspaso, ModalPartida, ModalRetorno, ModalBaja
    },
    setup() {
        const store = useStore()      // sesión y categorías; el inventario ya no pasa por acá
        const router = useRouter()

        const puedeEditar = computed(() => store.getters['auth/tieneRol']('admin', 'bodega'))

        const { usarResalte, usarAviso } = useTemporizadores()
        const resalte = usarResalte()
        const { aviso, avisar } = usarAviso()

        /* ---------------- Grilla ----------------
           Bodega no filtra por stock: un producto en cero es justo lo que
           hay que ver para saber qué reponer. */
        const { items, total, cargando, error, filtros, ultimaCarga, cargar, filtrar } =
            useProductos({ soloEnVenta: false, activo: true })

        /* Las categorías del select vienen del store: cambian poco y las
           comparten los formularios de producto y de ramo. */
        const categorias = computed(() => store.getters['inventario/categorias'])

        /* ---------------- Formulario de producto ---------------- */
        const formularioAbierto = ref(false)
        const editando = ref(null)

        const abrirNuevo = () => { editando.value = null; formularioAbierto.value = true }
        const cerrarFormulario = () => { formularioAbierto.value = false; editando.value = null }

        const alGuardarProducto = async (p) => {
            cerrarFormulario()
            avisar(`${p.nombre} guardado`)
            resalte.marcar(p.id)
            await cargar()   // la fila la manda el servidor, no la parcheamos a mano
        }

        /* ---------------- Ramos ---------------- */
        const ramo = ref(null)
        const abrirRamo = (p) => { ramo.value = { producto: p } }

        const alGuardarRamo = async (p) => {
            ramo.value = null
            avisar(`${p.nombre} guardado`)
            resalte.marcar(p.id)
            await cargar()
        }

        /* ModalProducto solo maneja simples: un armado lleva receta, y la
           receta se edita en ModalRamo. */
        const abrirEditar = (p) => {
            if (p.tipo === 'armado') return abrirRamo(p)
            editando.value = p
            formularioAbierto.value = true
        }

        /* ---------------- Armado ---------------- */
        const armando = ref(null)

        const alArmar = async (resultado) => {
            armando.value = null
            avisar(`${resultado.armadas} unidad(es) armadas`)
            resalte.marcar(resultado.productoId)
            await cargar()
        }

        /* ---------------- Bajar al mostrador ----------------
           `opciones` es el segundo argumento del emit de TablaProductos. Desde
           bodega siempre llega vacío —el permiso es directo—, pero se lee igual
           para que no se cuele un traspaso sin firma por omisión del parámetro. */
        const traspaso = ref(null)
        const partida = ref(null)

        const abrirTraspaso = (producto, opciones = {}) => {
            traspaso.value = {
                producto,
                requiereAutorizacion: opciones.requiereAutorizacion === true
            }
        }

        const alTraspasar = async (r) => {
            traspaso.value = null
            partida.value = r
            /* Con await: el modal de la partida y la grilla de atrás tienen
               que mostrar el mismo stock, no uno cada uno. */
            await cargar()
        }

        const imprimirEtiqueta = (codigo) => {
            partida.value = null
            router.push({ name: 'EtiquetasPartida', params: { codigo } })
        }

        /* ---------------- Devolver a bodega ---------------- */
        const retorno = ref(null)

        const alRetornar = async (r) => {
            retorno.value = null
            avisar(`${r.devuelto ?? r.cantidad} de ${r.producto ?? 'producto'} de vuelta en bodega`)
            resalte.marcar(r.productoId)
            await cargar()
        }

        /* ---------------- Baja y reactivación ---------------- */
        const baja = ref(null)

        const alDarDeBaja = async (p) => {
            baja.value = null
            avisar(`${p.nombre} dado de baja`)
            await cargar()
        }

        /* Reactivar no pide confirmación: no se pierde nada y se deshace
           con la misma facilidad. */
        const cambiarEstado = async (p, activo) => {
            try {
                await productosService.cambiarEstado(p.id, activo)
                avisar(`${p.nombre} ${activo ? 'reactivado' : 'dado de baja'}`)
                resalte.marcar(p.id)
                await cargar()
            } catch (e) {
                avisar(e.message, true)
            }
        }

        /* ---------------- Entrar a la pantalla = pedir datos ---------------- */

        /* Con <keep-alive> el orden en la primera entrada es mounted →
           activated; sin esta bandera se pediría dos veces. */
        let recienMontado = false

        const alVolverAlFrente = () => {
            if (document.visibilityState !== 'visible') return
            if (Date.now() - ultimaCarga.value < FRESCURA_MS) return
            cargar()
        }

        onMounted(() => {
            recienMontado = true
            cargar()
            store.dispatch('inventario/cargarCategorias')
            document.addEventListener('visibilitychange', alVolverAlFrente)
        })

        onActivated(() => {
            if (recienMontado) { recienMontado = false; return }
            cargar()
        })

        onUnmounted(() => {
            document.removeEventListener('visibilitychange', alVolverAlFrente)
        })

        return {
            puedeEditar,
            items, total, cargando, error, filtros, categorias, cargar, filtrar,
            formularioAbierto, editando, abrirNuevo, abrirEditar, cerrarFormulario, alGuardarProducto,
            ramo, abrirRamo, alGuardarRamo,
            armando, alArmar,
            traspaso, partida, abrirTraspaso, alTraspasar, imprimirEtiqueta,
            retorno, alRetornar,
            baja, alDarDeBaja, cambiarEstado,
            aviso, resalte
        }
    }
}
</script>

<style scoped>
.inv-bodega {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 44px;
    padding: .65rem 1.15rem;
    border: none;
    border-radius: var(--r-sm, 8px);
    background: var(--accent);
    color: var(--accent-contrast, #fff);
    font: inherit;
    font-size: .92rem;
    font-weight: 600;
    cursor: pointer;
}

.btn-linea {
    background: transparent;
    border: 1px solid var(--border-strong);
    color: var(--text-muted);
}

.aviso {
    position: fixed;
    bottom: max(22px, env(safe-area-inset-bottom));
    left: 50%;
    transform: translateX(-50%);
    z-index: 80;
    max-width: 90vw;
    padding: 12px 20px;
    border-radius: var(--r-sm, 10px);
    background: var(--text);
    color: var(--bg);
    font-size: .875rem;
    font-weight: 600;
    box-shadow: var(--shadow-lg);
    text-align: center;
}

.aviso.malo {
    background: var(--danger);
    color: var(--surface);
}
</style>
