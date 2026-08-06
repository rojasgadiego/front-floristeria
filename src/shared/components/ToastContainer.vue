<template>
    <!--
    Teleport a body: así el toast nunca queda atrapado bajo el z-index de
    un modal, un sidebar o un contenedor con overflow:hidden.
  -->
    <Teleport to="body">
        <TransitionGroup name="toast" tag="div" class="toast-zona" :style="{ '--teclado': teclado + 'px' }">
            <div v-for="n in notificaciones" :key="n.id" class="toast" :class="[
                't-' + n.tipo,
                { pausado: n.pausado, arrastrando: arrastre.id === n.id }
            ]" :style="estiloDe(n)" :role="n.tipo === 'error' ? 'alert' : 'status'" @mouseenter="pausar(n.id)"
                @mouseleave="reanudar(n.id)" @pointerdown="tomar($event, n)" @pointermove="mover($event, n)"
                @pointerup="soltar($event, n)" @pointercancel="soltar($event, n)">

                <span class="icono" aria-hidden="true">{{ ICONOS[n.tipo] }}</span>

                <p class="texto">{{ n.texto }}</p>

                <button class="cerrar" @click.stop="cerrar(n.id)" aria-label="Cerrar notificación">
                    <span aria-hidden="true">✕</span>
                </button>

                <button v-if="n.accion" class="accion" @click.stop="ejecutarAccion(n)">
                    {{ n.accion.texto }}
                </button>

                <!-- La barra se pausa con la clase .pausado, no con :hover, para que
             también funcione al mantener el dedo sobre el toast. -->
                <div v-if="n.duracion > 0" class="progreso" aria-hidden="true">
                    <i :style="{ animationDuration: n.duracion + 'ms' }"></i>
                </div>
            </div>
        </TransitionGroup>
    </Teleport>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useNotificaciones } from '@/shared/composables/useNotificaciones'

const ICONOS = {
    exito: '✓',
    error: '✕',
    alerta: '!',
    info: 'i'
}

/* Umbrales del gesto */
const MINIMO_PARA_MOVER = 6      // px antes de considerar que hay arrastre
const DISTANCIA_DESCARTE = 72    // px para descartar por posición
const VELOCIDAD_DESCARTE = 0.45  // px/ms para descartar por impulso

export default {
    name: 'ToastContainer',

    setup() {
        const { notificaciones, cerrar, pausar, reanudar, ejecutarAccion } = useNotificaciones()

        /* ================================================================
         * TECLADO MÓVIL
         *
         * El problema: con el toast anclado abajo, al abrirse el teclado
         * Android reduce innerHeight y el `fixed` sube solo, pero iOS deja el
         * innerHeight igual y el toast queda TAPADO por el teclado. En un POS
         * eso significa perder el aviso justo mientras se digita un monto.
         *
         * visualViewport resuelve ambos casos con la misma cuenta: lo que hay
         * entre el fondo del viewport visual y el fondo de la ventana.
         * ================================================================ */
        const teclado = ref(0)

        const medirTeclado = () => {
            const vv = window.visualViewport
            if (!vv) return
            const tapado = window.innerHeight - vv.height - vv.offsetTop
            // Menos de 120px no es un teclado, es la barra de direcciones
            teclado.value = tapado > 120 ? Math.round(tapado) : 0
        }

        onMounted(() => {
            const vv = window.visualViewport
            if (!vv) return
            vv.addEventListener('resize', medirTeclado)
            vv.addEventListener('scroll', medirTeclado)
            medirTeclado()
        })

        onUnmounted(() => {
            const vv = window.visualViewport
            if (!vv) return
            vv.removeEventListener('resize', medirTeclado)
            vv.removeEventListener('scroll', medirTeclado)
        })

        /* ================================================================
         * ARRASTRAR PARA DESCARTAR
         *
         * Pointer Events unifica mouse y dedo, así que el gesto es el mismo
         * en escritorio y en móvil sin duplicar código.
         *
         * Solo eje horizontal: con `touch-action: pan-y` el scroll vertical
         * de la página sigue funcionando aunque el dedo empiece sobre el
         * toast. Mezclar los dos ejes obliga a decidir la intención y se
         * siente errático.
         * ================================================================ */
        const arrastre = reactive({
            id: null,
            inicioX: 0,
            dx: 0,
            activo: false,       // ya superó MINIMO_PARA_MOVER
            tiempo: 0,
            ultimaX: 0,
            ultimoTiempo: 0,
            velocidad: 0
        })

        const anchoDe = (el) => el?.offsetWidth || 320

        const reset = () => {
            arrastre.id = null
            arrastre.dx = 0
            arrastre.activo = false
            arrastre.velocidad = 0
        }

        const tomar = (e, n) => {
            // Botón derecho no arrastra; los botones internos se manejan solos
            if (e.button !== undefined && e.button !== 0) return
            if (e.target.closest('button')) return

            arrastre.id = n.id
            arrastre.inicioX = e.clientX
            arrastre.ultimaX = e.clientX
            arrastre.dx = 0
            arrastre.activo = false
            arrastre.tiempo = e.timeStamp
            arrastre.ultimoTiempo = e.timeStamp
            arrastre.velocidad = 0

            pausar(n.id)
        }

        const mover = (e, n) => {
            if (arrastre.id !== n.id) return

            const dx = e.clientX - arrastre.inicioX

            if (!arrastre.activo) {
                if (Math.abs(dx) < MINIMO_PARA_MOVER) return
                arrastre.activo = true
                /* Capturar el puntero evita perder el gesto si el dedo se sale
                 * del toast, que con 60px de alto pasa constantemente. */
                e.currentTarget.setPointerCapture?.(e.pointerId)
            }

            const dt = e.timeStamp - arrastre.ultimoTiempo
            if (dt > 0) {
                arrastre.velocidad = (e.clientX - arrastre.ultimaX) / dt
                arrastre.ultimaX = e.clientX
                arrastre.ultimoTiempo = e.timeStamp
            }

            arrastre.dx = dx
        }

        const soltar = (e, n) => {
            if (arrastre.id !== n.id) return

            const dx = arrastre.dx
            const v = arrastre.velocidad
            const hubo = arrastre.activo

            /*
             * Se descarta por distancia O por impulso. Considerar la velocidad
             * es lo que hace que un flick corto y rápido funcione: sin eso hay
             * que arrastrar los 72px completos y el gesto se siente pesado.
             */
            const fuera = hubo && (Math.abs(dx) > DISTANCIA_DESCARTE || Math.abs(v) > VELOCIDAD_DESCARTE)

            if (fuera) {
                const ancho = anchoDe(e.currentTarget)
                const signo = (Math.abs(v) > VELOCIDAD_DESCARTE ? Math.sign(v) : Math.sign(dx)) || 1
                // Sale disparado hacia donde iba el dedo; el TransitionGroup
                // reacomoda la pila con su FLIP.
                arrastre.dx = signo * (ancho + 40)
                const id = n.id
                setTimeout(() => cerrar(id), 180)
                arrastre.id = null
                arrastre.activo = false
                return
            }

            reset()
            reanudar(n.id)
        }

        /** Transform y opacidad ligados al dedo, 1 a 1 */
        const estiloDe = (n) => {
            if (arrastre.id !== n.id && !(arrastre.dx && arrastre.id === n.id)) {
                return null
            }
            const dx = arrastre.dx
            const opacidad = Math.max(0, 1 - Math.abs(dx) / 180)
            return {
                transform: `translate3d(${dx}px, 0, 0)`,
                opacity: opacidad
            }
        }

        return {
            ICONOS, notificaciones,
            cerrar, pausar, reanudar, ejecutarAccion,
            teclado, arrastre, tomar, mover, soltar, estiloDe
        }
    }
}
</script>

<style scoped>
/* ================================================================
 * POSICIÓN
 *
 * Escritorio: pila arriba a la derecha, lo más nuevo arriba.
 * Móvil: snackbar abajo, ancho completo, lo más nuevo abajo (cerca del
 * pulgar). El array tiene lo nuevo primero, así que en móvil se invierte
 * con column-reverse.
 *
 * Variables que puede ajustar el layout:
 *   --toast-abajo   separación del borde inferior (súbela si hay barra
 *                   de navegación fija o barra de acciones en la vista)
 *   --teclado       lo pone el componente desde visualViewport
 * ================================================================ */

.toast-zona {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 200;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 380px;
    /* max-width con % y no con vw: vw incluye el ancho de la barra de
     scroll y provoca desbordes horizontales de un par de píxeles. */
    max-width: calc(100% - 32px);
    pointer-events: none;
}

.toast {
    pointer-events: auto;
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 11px;
    padding: 13px 14px;
    border-radius: 12px;
    border: 1px solid;
    background: #fff;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.16);
    overflow: hidden;

    /* pan-y deja pasar el scroll vertical de la página aunque el gesto
     empiece sobre el toast; el horizontal lo tomamos nosotros. */
    touch-action: pan-y;
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;

    /* Al soltar sin descartar, vuelve con un rebote corto */
    transition: transform 0.34s cubic-bezier(0.22, 1.4, 0.4, 1), opacity 0.2s ease;
}

/* Durante el arrastre no hay transición: el toast tiene que ir pegado al
   dedo, cualquier interpolación se siente como lag. */
.toast.arrastrando {
    transition: none;
    cursor: grabbing;
    will-change: transform, opacity;
}

/* ---------------- Tipos ---------------- */

.t-exito {
    border-color: #6ee7b7;
    background: #f0fdf4;
}

.t-error {
    border-color: #fca5a5;
    background: #fef2f2;
}

.t-alerta {
    border-color: #fcd34d;
    background: #fffbeb;
}

.t-info {
    border-color: #cbd5e1;
    background: #f8fafc;
}

.icono {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 21px;
    height: 21px;
    margin-top: 1px;
    border-radius: 50%;
    font-size: 0.72rem;
    font-weight: 700;
    line-height: 1;
    color: #fff;
}

.t-exito .icono {
    background: #059669;
}

.t-error .icono {
    background: #dc2626;
}

.t-alerta .icono {
    background: #d97706;
}

.t-info .icono {
    background: #64748b;
}

.texto {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 0.86rem;
    font-weight: 500;
    line-height: 1.45;
    overflow-wrap: break-word;
}

.t-exito .texto {
    color: #065f46;
}

.t-error .texto {
    color: #991b1b;
}

.t-alerta .texto {
    color: #78350f;
}

.t-info .texto {
    color: #334155;
}

/* ---------------- Acción y cierre ---------------- */

.accion {
    flex-shrink: 0;
    align-self: center;
    min-height: 34px;
    padding: 0.3rem 0.75rem;
    border: 1px solid currentColor;
    border-radius: 8px;
    background: transparent;
    font-family: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.16s, color 0.16s, transform 0.1s;
}

.accion:active {
    transform: scale(0.95);
}

.t-exito .accion {
    color: #047857;
}

.t-exito .accion:hover {
    background: #059669;
    color: #fff;
}

.t-error .accion {
    color: #b91c1c;
}

.t-error .accion:hover {
    background: #dc2626;
    color: #fff;
}

.t-alerta .accion {
    color: #b45309;
}

.t-alerta .accion:hover {
    background: #d97706;
    color: #fff;
}

.t-info .accion {
    color: #475569;
}

.t-info .accion:hover {
    background: #475569;
    color: #fff;
}

.cerrar {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: #94a3b8;
    font-size: 0.72rem;
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;
}

.cerrar:hover {
    background: rgba(15, 23, 42, 0.07);
    color: #475569;
}

/* ---------------- Barra de progreso ---------------- */

.progreso {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 3px;
    background: rgba(15, 23, 42, 0.07);
}

.progreso i {
    display: block;
    height: 100%;
    width: 100%;
    transform-origin: left;
    animation: vaciar linear forwards;
}

/* Ligada al estado, no a :hover, para que también pause con el dedo */
.toast.pausado .progreso i {
    animation-play-state: paused;
}

@keyframes vaciar {
    from {
        transform: scaleX(1);
    }

    to {
        transform: scaleX(0);
    }
}

.t-exito .progreso i {
    background: #059669;
}

.t-error .progreso i {
    background: #dc2626;
}

.t-alerta .progreso i {
    background: #d97706;
}

.t-info .progreso i {
    background: #64748b;
}

/* ================================================================
 * ANIMACIONES DE ENTRADA Y SALIDA
 * ================================================================ */

.toast-enter-active {
    transition: opacity 0.26s ease, transform 0.42s cubic-bezier(0.22, 1.3, 0.36, 1);
}

.toast-leave-active {
    position: absolute;
    width: 100%;
    transition: opacity 0.2s ease, transform 0.24s ease;
}

.toast-enter-from {
    opacity: 0;
    transform: translate3d(30px, 0, 0) scale(0.94);
}

.toast-leave-to {
    opacity: 0;
    transform: translate3d(30px, 0, 0) scale(0.94);
}

/* El FLIP reacomoda la pila cuando uno sale del medio */
.toast-move {
    transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

/* ================================================================
 * MÓVIL — snackbar abajo
 * ================================================================ */

@media (max-width: 640px) {
    .toast-zona {
        top: auto;
        right: 10px;
        left: 10px;
        /* safe-area para la barra de gestos del iPhone, --toast-abajo para
       que el layout pueda subirlo si hay barra fija, y --teclado para
       que nunca quede debajo del teclado numérico. */
        bottom: calc(var(--toast-abajo, 12px) + env(safe-area-inset-bottom, 0px) + var(--teclado, 0px));
        width: auto;
        max-width: none;
        flex-direction: column-reverse;
        /* El desplazamiento por teclado se acompaña, no salta */
        transition: bottom 0.24s cubic-bezier(0.22, 1, 0.36, 1);
    }

    /*
   * Grid en móvil: icono | texto | cerrar en la primera fila, y la
   * acción abajo a la derecha. En una sola fila, un "Deshacer" deja el
   * texto en dos palabras por línea.
   */
    .toast {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: start;
        gap: 8px 11px;
        padding: 13px 12px 13px 13px;
    }

    .icono {
        grid-column: 1;
        grid-row: 1;
    }

    .texto {
        grid-column: 2;
        grid-row: 1;
        font-size: 0.875rem;
    }

    /* Área táctil de 44px sin agrandar el dibujo: el ::after extiende el
     objetivo más allá de la caja visible. */
    .cerrar {
        grid-column: 3;
        grid-row: 1;
        width: 28px;
        height: 28px;
        margin: -2px -2px 0 0;
    }

    .cerrar::after {
        content: '';
        position: absolute;
        top: 6px;
        right: 4px;
        width: 44px;
        height: 44px;
    }

    .accion {
        grid-column: 2 / -1;
        grid-row: 2;
        justify-self: end;
        min-height: 40px;
        padding: 0.4rem 0.95rem;
        font-size: 0.8rem;
    }

    /* Entra desde abajo, no desde el costado */
    .toast-enter-from,
    .toast-leave-to {
        transform: translate3d(0, 22px, 0) scale(0.96);
    }
}

/* Pantallas muy bajas en horizontal: un solo toast a la vez cabe */
@media (max-height: 420px) {
    .toast-zona> :nth-child(n+3) {
        display: none;
    }
}

@media (prefers-reduced-motion: reduce) {

    .toast,
    .toast-zona,
    .accion,
    .cerrar {
        transition: none;
    }

    .progreso i {
        animation: none;
        transform: scaleX(0);
    }

    .toast-enter-active,
    .toast-leave-active,
    .toast-move {
        transition: opacity 0.15s ease;
    }

    .toast-enter-from,
    .toast-leave-to {
        transform: none;
    }
}
</style>