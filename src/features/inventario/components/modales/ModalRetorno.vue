<template>
    <div class="fondo" @click.self="$emit('cerrar')">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="r-titulo">
            <div class="modal-cab">
                <h3 id="r-titulo">Devolver a bodega</h3>
                <p>{{ producto.emoji }} {{ producto.nombre }}</p>
            </div>

            <div class="modal-cuerpo">
                <div v-if="error" class="error">{{ error }}</div>

                <div v-if="cargando" class="cargando">Buscando partidas en el mesón…</div>

                <div v-else-if="!partidas.length" class="error">
                    Este producto no tiene partidas con stock en el mesón.
                </div>

                <template v-else>
                    <div class="nota">
                        Hay <b class="dato">{{ enMeson }}</b> adelante repartidas en
                        <b class="dato">{{ partidas.length }}</b> partida(s).
                    </div>

                    <div class="grupo">
                        <label for="r-partida">¿Qué partida vuelve?</label>
                        <select id="r-partida" class="campo" v-model="partidaCodigo" @change="ajustarMaximo">
                            <option v-for="p in partidas" :key="p.codigo" :value="p.codigo">
                                {{ p.codigo }} · {{ p.cantidadDisponible }} disponibles
                                <template v-if="p.diasParaVencer != null">
                                    · vence en {{ p.diasParaVencer }} día(s)
                                </template>
                            </option>
                        </select>
                        <p class="ayuda">
                            Las varas vuelven al lote del que salió la partida, no a
                            uno cualquiera.
                        </p>
                    </div>

                    <div class="grupo">
                        <label for="r-cant">Cantidad</label>
                        <input id="r-cant" ref="campoCantidad" class="campo dato" type="number" min="1"
                            :max="maximo" v-model.number="cantidad">
                    </div>

                    <div class="grupo">
                        <label for="r-notas">Motivo (opcional)</label>
                        <textarea id="r-notas" class="campo" v-model.trim="notas" maxlength="200"
                            placeholder="Ej: se bajó de más, cierre del día"></textarea>
                    </div>
                </template>
            </div>

            <div class="modal-pie">
                <button class="btn btn-linea" @click="$emit('cerrar')">Cancelar</button>
                <button class="btn" :disabled="guardando || cargando || !partidas.length" @click="confirmar">
                    {{ guardando ? 'Devolviendo…' : 'Devolver' }}
                </button>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { inventarioVentaService } from '@/features/inventario/services/inventarioVenta.service'

export default {
    name: 'ModalRetorno',
    props: {
        producto: { type: Object, required: true }
    },
    emits: ['cerrar', 'retornado'],

    setup (props, { emit }) {
        const partidas = ref([])
        const partidaCodigo = ref(null)
        const cantidad = ref(0)
        const notas = ref('')
        const cargando = ref(true)
        const guardando = ref(false)
        const error = ref('')
        const campoCantidad = ref(null)

        const elegida = computed(() =>
            partidas.value.find(p => p.codigo === partidaCodigo.value) ?? null
        )

        const maximo = computed(() => elegida.value?.cantidadDisponible ?? 0)

        const enMeson = computed(() =>
            partidas.value.reduce((s, p) => s + p.cantidadDisponible, 0)
        )

        const ajustarMaximo = () => { cantidad.value = maximo.value }

        const control = new AbortController()

        onMounted(async () => {
            try {
                const r = await inventarioVentaService.partidasDeProducto(props.producto.id, {
                    signal: control.signal
                })
                const lista = Array.isArray(r) ? r : (r?.items ?? [])
                partidas.value = lista.filter(p => p.cantidadDisponible > 0)

                /* Vienen en orden de consumo: lo que vence antes va primero y
                   es lo que conviene dejar adelante. Se sugiere devolver la
                   última, la que más vida le queda en cámara. */
                partidaCodigo.value = partidas.value[partidas.value.length - 1]?.codigo ?? null
                ajustarMaximo()

                cargando.value = false
                await nextTick()
                campoCantidad.value?.select()
            } catch (e) {
                if (e.esCancelado || e.name === 'AbortError') return
                error.value = e.message
            } finally {
                cargando.value = false
            }
        })

        onUnmounted(() => control.abort())

        const confirmar = async () => {
            error.value = ''
            if (!partidaCodigo.value) return (error.value = 'Elige qué partida devolver.')
            if (!cantidad.value || cantidad.value < 1) return (error.value = 'La cantidad debe ser al menos 1.')
            if (cantidad.value > maximo.value) {
                return (error.value = `La partida ${partidaCodigo.value} tiene ${maximo.value} disponibles.`)
            }

            guardando.value = true
            try {
                const r = await inventarioVentaService.retornar({
                    partida: partidaCodigo.value,
                    cantidad: cantidad.value,
                    notas: notas.value || null
                })
                emit('retornado', { productoId: props.producto.id, cantidad: cantidad.value, ...r })
            } catch (e) {
                error.value = e.message
            } finally {
                guardando.value = false
            }
        }

        return {
            partidas, partidaCodigo, cantidad, notas, cargando, guardando, error, campoCantidad,
            maximo, enMeson, ajustarMaximo, confirmar
        }
    }
}
</script>

<style scoped src="./modal.css"></style>
