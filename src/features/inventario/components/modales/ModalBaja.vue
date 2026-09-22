<template>
    <div class="fondo" @click.self="$emit('cerrar')">
        <div class="modal angosto" role="dialog" aria-modal="true" aria-labelledby="b-titulo">
            <div class="modal-cab">
                <h3 id="b-titulo">Dar de baja</h3>
                <p>{{ producto.emoji }} {{ producto.nombre }} · {{ producto.codigo }}</p>
            </div>

            <div class="modal-cuerpo">
                <div v-if="error" class="error">{{ error }}</div>

                <p class="texto">
                    El producto deja de aparecer en el mesón y en las compras.
                    Las boletas y los lotes que ya lo usan no se tocan, y se
                    puede reactivar cuando quieras.
                </p>

                <div v-if="conStock" class="nota alerta">
                    Todavía tiene
                    <b class="dato">{{ producto.enBodega ?? 0 }}</b> en bodega y
                    <b class="dato">{{ producto.enVenta ?? 0 }}</b> en el mesón.
                    Conviene venderlo o registrar la merma antes.
                </div>
            </div>

            <div class="modal-pie">
                <button class="btn btn-linea" @click="$emit('cerrar')">Cancelar</button>
                <button class="btn btn-peligro" :disabled="guardando" @click="confirmar">
                    {{ guardando ? 'Dando de baja…' : 'Dar de baja' }}
                </button>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, computed } from 'vue'
import { productosService } from '@/features/inventario/services/productos.service'

/* No hay DELETE: las boletas y los lotes históricos referencian el
   producto. Dar de baja es desactivarlo. */
export default {
    name: 'ModalBaja',
    props: {
        producto: { type: Object, required: true }
    },
    emits: ['cerrar', 'confirmado'],

    setup (props, { emit }) {
        const guardando = ref(false)
        const error = ref('')

        const conStock = computed(() =>
            Number(props.producto.enBodega ?? 0) > 0 || Number(props.producto.enVenta ?? 0) > 0
        )

        const confirmar = async () => {
            error.value = ''
            guardando.value = true
            try {
                const p = await productosService.cambiarEstado(props.producto.id, false)
                emit('confirmado', { ...props.producto, ...p, activo: false })
            } catch (e) {
                error.value = e.message
            } finally {
                guardando.value = false
            }
        }

        return { guardando, error, conStock, confirmar }
    }
}
</script>

<style scoped src="./modal.css"></style>

<style scoped>
.texto {
    margin: 0 0 14px;
    font-size: .88rem;
    line-height: 1.55;
    color: var(--text-muted);
}
</style>
