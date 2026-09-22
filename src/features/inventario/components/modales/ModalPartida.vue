<template>
    <div class="fondo" @click.self="$emit('cerrar')">
        <div class="modal angosto" role="dialog" aria-modal="true" aria-labelledby="p-titulo">
            <div class="modal-cab">
                <h3 id="p-titulo">Partida creada</h3>
                <p>{{ partida.cantidad }} de {{ partida.producto }} en el mesón</p>
            </div>

            <div class="modal-cuerpo cen">
                <div class="codigo-partida">{{ partida.codigo }}</div>

                <div class="nota">
                    <template v-if="partida.loteCodigo">Del lote <b>{{ partida.loteCodigo }}</b> · </template>
                    quedan <b class="dato">{{ partida.enBodega ?? '—' }}</b> en bodega
                    <template v-if="partida.vencimiento">
                        <br>Vence el {{ fecha(partida.vencimiento) }}
                    </template>
                </div>

                <p class="ayuda">
                    Imprime la etiqueta y pégala al balde <b>antes</b> de dejarlo
                    adelante. Una partida sin etiqueta no se puede escanear al
                    vender.
                </p>
            </div>

            <div class="modal-pie">
                <button class="btn btn-linea" @click="$emit('cerrar')">Después</button>
                <button class="btn" @click="$emit('imprimir', partida.codigo)">🏷️ Imprimir etiqueta</button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'ModalPartida',
    props: {
        partida: { type: Object, required: true }
    },
    emits: ['cerrar', 'imprimir'],

    setup () {
        const fecha = (iso) => new Date(iso).toLocaleDateString('es-CL',
            { day: '2-digit', month: 'short' })

        return { fecha }
    }
}
</script>

<style scoped src="./modal.css"></style>

<style scoped>
/* El código en grande: es lo que se va a escribir en el balde si la
   impresora falla. */
.codigo-partida {
    font-family: var(--font-mono);
    font-size: 1.6rem;
    font-weight: 700;
    letter-spacing: .06em;
    color: var(--accent-text);
    padding: 14px;
    margin-bottom: 12px;
    background: var(--accent-soft);
    border-radius: var(--r-sm);
}
</style>
