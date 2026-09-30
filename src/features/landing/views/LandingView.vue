<template>
  <div ref="raiz" class="landing">
    <header class="barra">
      <router-link to="/" class="marca" aria-label="Floristería Colibrí, inicio">
        <svg class="marca-ave" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <path d="M44 15 C50 15 53 19 52 23 C50 32 40 40 26 43 L8 47 L15 37 C22 29 30 17 44 15 Z" />
          <path d="M30 27 C36 18 46 14 55 16 C50 25 41 31 32 32 Z" opacity="0.55" />
        </svg>
        <span>Colibrí</span>
      </router-link>

      <router-link v-if="autenticado" :to="{ name: 'Dashboard' }" class="acceso">
        Ir al sistema
      </router-link>
      <router-link v-else :to="{ name: 'Login' }" class="acceso">
        Acceso equipo
      </router-link>
    </header>

    <main>
      <!-- ============ Portada ============ -->
      <section class="portada">
        <div class="portada-texto">
          <h1>Flores frescas, armadas a mano.</h1>
          <p class="bajada">
            Ramos, arreglos y flores por tallo en {{ c.comuna }}.
            Escríbenos por WhatsApp y lo dejamos listo para retirar o despachar.
          </p>
          <div class="acciones">
            <a :href="enlaceWhatsapp" class="btn btn-principal" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Z" />
              </svg>
              Pedir por WhatsApp
            </a>
            <a href="#visitanos" class="btn btn-secundario">Cómo llegar</a>
          </div>
        </div>

        <!-- Chilco con el colibrí: la llegada del ave es la única animación
             que no depende del usuario -->
        <div class="portada-ilustracion" aria-hidden="true">
          <svg ref="heroSvg" viewBox="0 0 400 520" focusable="false">
            <defs>
              <!-- Tonos de hoja compartidos con las enredaderas: viven acá
                   porque este SVG siempre está en la página -->
              <linearGradient id="enr-hoja" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#3f7a4f" />
                <stop offset="0.6" stop-color="#0f7c74" />
                <stop offset="1" stop-color="#7fd1c0" />
              </linearGradient>
              <linearGradient id="enr-hoja-oscura" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#1f4d36" />
                <stop offset="1" stop-color="#2f8a6a" />
              </linearGradient>

              <!-- Una flor de chilco colgando, dibujada desde su punto de unión -->
              <g id="chilco">
                <path d="M0 0 C2 14 1 26 0 38" class="pedicelo" />
                <ellipse cx="0" cy="42" rx="4.5" ry="5" class="ovario" />
                <path d="M0 47 C-14 52 -30 64 -40 86 C-26 76 -12 68 0 64 Z" class="sepalo" />
                <path d="M0 47 C14 52 30 64 40 86 C26 76 12 68 0 64 Z" class="sepalo" />
                <path d="M-6 46 L6 46 L7 64 L-7 64 Z" class="sepalo" />
                <path d="M-11 62 C-15 78 -12 94 0 99 C12 94 15 78 11 62 Z" class="corola" />
                <path d="M-3 96 L-7 128 M0 97 L0 134 M3 96 L7 128" class="estambre" />
                <circle cx="-7" cy="129" r="2.2" class="antera" />
                <circle cx="0" cy="135" r="2.6" class="antera" />
                <circle cx="7" cy="129" r="2.2" class="antera" />
              </g>
              <!-- Piezas de la rama de móvil, dibujadas desde su punto de unión -->
              <path id="hm-larga" d="M0 0 C10 -15 34 -17 52 -5 C34 8 12 8 0 0 Z" />
              <path id="hm-corazon" d="M0 0 L7 0 C8 -12 24 -18 33 -11 C40 -6 45 -2 50 0 C45 2 40 6 33 11 C24 18 8 12 7 0 Z" />
              <path id="hm-zarcillo" d="M0 0 C8 -2 16 -10 16 -18 C16 -26 6 -28 4 -21 C2 -16 9 -14 10 -19" />
              <g id="hm-capullo">
                <path class="pedicelo" d="M0 0 C1 7 0 12 0 16" />
                <path class="sepalo" d="M0 15 C-5 19 -5 31 0 37 C5 31 5 19 0 15 Z" />
              </g>
            </defs>

            <!-- Todo lo que cuelga va en .planta: en móvil se mece entera
                 desde el punto donde nace, arriba -->
            <g class="planta">
              <!-- ===== Escritorio: rama que sube desde abajo ===== -->
              <!-- El tronco se desvanece abajo: la planta cuelga de la
                   enredadera de la derecha, no está plantada en el borde -->
              <linearGradient id="tronco-fade" gradientUnits="userSpaceOnUse" x1="0" y1="420" x2="0" y2="520">
                <stop offset="0" stop-color="#17392c" />
                <stop offset="1" stop-color="#17392c" stop-opacity="0" />
              </linearGradient>
              <g class="solo-escritorio">
                <path class="rama rama-tronco" d="M232 520 C236 420 214 330 238 240 C254 180 300 130 360 104" />
                <path class="rama rama-fina" d="M238 244 C210 214 176 204 140 206" />
                <path class="rama rama-fina" d="M300 146 C318 160 326 184 324 212" />
                <path class="hoja" d="M236 360 C200 346 176 316 172 282 C206 292 230 318 236 360 Z" />
                <path class="hoja" d="M240 300 C272 284 300 256 306 222 C274 234 248 262 240 300 Z" />
                <path class="hoja hoja-oscura" d="M234 430 C268 420 292 394 298 362 C266 372 242 398 234 430 Z" />
                <path class="hoja" d="M346 110 C352 84 372 66 396 60 C388 86 370 104 346 110 Z" />
                <path class="hoja hoja-oscura" d="M182 206 C170 186 150 176 128 178 C142 196 160 206 182 206 Z" />
              </g>

              <!-- ===== Móvil: rama que cuelga desde el borde superior =====
                   Nace arriba, entre el logo y el botón de acceso, y cae en
                   un arco relajado hacia la derecha. La flor del colibrí
                   cuelga de una ramita a la izquierda, la del medio del
                   tallo y la tercera de la punta, como cuelgan los chilcos.
                   Las curvas empalman con la misma tangente en cada unión
                   y terminan verticales donde nace cada flor. -->
              <!-- Guías invisibles: de ellas se calcula el contorno que se
                   afina y dónde va cada hoja (ver armarRamaMovil) -->
              <path ref="guiaTallo" class="guia" d="M170 -30 C171 30 184 72 208 104 C230 134 252 152 272 166 C296 182 318 190 324 212" />
              <path ref="guiaColibri" class="guia" d="M206 100 C196 128 170 150 156 168 C146 181 140 192 140 206" />
              <g class="solo-movil">
                <path class="cuerpo-rama" :d="formaMovil.colibri" />
                <path class="cuerpo-rama" :d="formaMovil.tallo" />
                <!-- Tres grupos por pieza: el exterior la ubica sobre la
                     rama, el interior la mece desde su punto de unión -->
                <g v-for="(pieza, i) in formaMovil.piezas" :key="i" :transform="pieza.t">
                  <g class="pieza-viva" :style="{ '--dur': pieza.dur + 's', '--ret': pieza.ret + 's', '--giro': pieza.giro + 'deg' }">
                    <use :href="'#hm-' + pieza.tipo" :class="pieza.clase" />
                  </g>
                </g>
              </g>

              <!-- Flores. La del colibrí no se mueve (el pico tiene que
                   seguir en la flor); las otras dos se balancean apenas. -->
              <use href="#chilco" transform="translate(140 206)" />
              <g transform="translate(324 212) rotate(-6) scale(1.1)">
                <use href="#chilco" class="flor-mece" style="--dur: 5.5s; --ret: -2s" />
              </g>
              <g transform="translate(270 170) rotate(8) scale(0.78)">
                <use href="#chilco" class="flor-mece" style="--dur: 4.6s; --ret: -1s" />
              </g>

              <!-- Colibrí comiendo desde abajo en la boca de la flor izquierda.
                   Tres grupos anidados: el exterior lo ubica (atributo SVG),
                   los interiores lo animan (CSS), así no se pisan. -->
              <g transform="translate(-31 284) rotate(-10) scale(2.2)">
                <g class="ave-llegada">
                  <g class="ave-flotar">
                    <path class="ave-pico" d="M51 20 L72 19" />
                    <path class="ave-cuerpo" d="M44 15 C50 15 53 19 52 23 C50 32 40 40 26 43 L8 47 L15 37 C22 29 30 17 44 15 Z" />
                    <path class="ave-garganta" d="M49 23 C47 28 43 31 38 33 C42 29 45 26 47 22 Z" />
                    <path class="ave-ala" d="M30 27 C36 18 46 14 55 16 C50 25 41 31 32 32 Z" />
                    <circle cx="46" cy="19.5" r="1.6" class="ave-ojo" />
                  </g>
                </g>
              </g>
            </g>
          </svg>
        </div>
      </section>

      <!-- ============ Qué hacemos ============ -->
      <section class="seccion servicios" aria-labelledby="t-servicios">
        <h2 id="t-servicios">Lo que armamos</h2>
        <ul class="lista-servicios">
          <li v-for="s in servicios" :key="s.titulo">
            <h3>{{ s.titulo }}</h3>
            <p>{{ s.texto }}</p>
          </li>
        </ul>
      </section>

      <!-- ============ Cómo pedir ============ -->
      <section class="seccion pedir" aria-labelledby="t-pedir">
        <div class="pedir-interior">
          <h2 id="t-pedir">Cómo pedir</h2>
          <ol class="pasos">
            <li v-for="p in pasos" :key="p.titulo">
              <h3>{{ p.titulo }}</h3>
              <p>{{ p.texto }}</p>
            </li>
          </ol>
          <a :href="enlaceWhatsapp" class="btn btn-claro" target="_blank" rel="noopener">
            Escribir al {{ c.whatsappVisible }}
          </a>
        </div>
      </section>

      <!-- ============ Visítanos ============ -->
      <section id="visitanos" class="seccion visita" aria-labelledby="t-visita">
        <h2 id="t-visita">Visítanos</h2>
        <div class="visita-grilla">
          <div>
            <p class="direccion">
              {{ c.direccion }}<br>
              {{ c.comuna }}, {{ c.ciudad }}
            </p>
            <a :href="enlaceMapa" class="btn btn-secundario" target="_blank" rel="noopener">
              Abrir en Google Maps
            </a>
          </div>

          <table class="horario">
            <caption>Horario de atención</caption>
            <tbody>
              <tr v-for="h in c.horarios" :key="h.dias">
                <th scope="row">{{ h.dias }}</th>
                <td>{{ h.horas }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <footer class="pie">
      <p>Floristería Colibrí</p>
      <a v-if="c.instagram" :href="`https://instagram.com/${c.instagram}`" target="_blank" rel="noopener">
        @{{ c.instagram }} en Instagram
      </a>
      <router-link :to="{ name: 'Login' }">Acceso equipo</router-link>
    </footer>

    <!-- Enredaderas: crecen con el scroll y sus hojas se mecen. Se miden
         sobre la página real (ver construirEnredaderas). -->
    <svg
      v-if="enr.ramas.length"
      class="enredadera"
      :width="enr.w"
      :height="enr.h"
      :viewBox="`0 0 ${enr.w} ${enr.h}`"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <!-- Verdes de tallo: oscuro donde nace, más claro hacia la punta -->
        <linearGradient id="enr-tallo" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" :y2="enr.h">
          <stop v-for="([o, color], i) in enr.colores" :key="i" :offset="o" :stop-color="color" />
        </linearGradient>

        <!-- Formas, dibujadas desde su punto de unión hacia +x -->
        <path id="hoja-larga" d="M0 0 C8 -12 28 -14 42 -4 C28 6 10 7 0 0 Z" />
        <path id="hoja-corazon" d="M0 0 L8 0 C8 -10 22 -16 30 -10 C36 -6 40 -2 44 0 C40 2 36 6 30 10 C22 16 8 10 8 0 Z" />
        <path id="hoja-chica" d="M0 0 C4 -6 14 -7 20 -2 C14 3 5 3 0 0 Z" />
        <path id="zarcillo" d="M0 0 C8 -2 16 -10 16 -18 C16 -26 6 -28 4 -21 C2 -16 9 -14 10 -19" />
        <!-- Ramita lateral con sus propias hojas -->
        <g id="ramilla">
          <path class="enr-ramilla" d="M0 0 C10 -5 24 -3 40 7" />
          <use href="#hoja-larga" class="enr-hoja" transform="translate(17 -3) rotate(-60) scale(.75)" />
          <use href="#hoja-chica" class="enr-hoja-oscura" transform="translate(27 0) rotate(55) scale(.9)" />
          <use href="#hoja-corazon" class="enr-hoja" transform="translate(39 6) rotate(20) scale(.85)" />
        </g>
        <!-- Capullo de chilco colgando, dibujado hacia +y -->
        <g id="capullo">
          <path class="enr-pedicelo" d="M0 0 C1 7 0 12 0 16" />
          <path class="enr-capullo" d="M0 15 C-5 19 -5 31 0 37 C5 31 5 19 0 15 Z" />
        </g>

        <!-- El cuerpo del tallo es una forma que se afina; crece con el
             scroll porque lo revela una guía trazada, no porque se trace -->
        <mask
          v-for="(rama, i) in enr.ramas"
          :id="'enr-crece-' + i"
          :key="'m' + i"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          :width="enr.w"
          :height="enr.h"
        >
          <path
            :ref="(el) => { tallos[i] = el }"
            :d="rama.d"
            class="enr-guia"
            pathLength="1"
            :style="{ strokeDashoffset: 1 - avances[i], strokeWidth: rama.ancho * 2 + 10 }"
          />
        </mask>
      </defs>

      <template v-for="(rama, i) in enr.ramas" :key="'t' + i">
        <path v-if="rama.union" :d="rama.union" class="enr-union" :style="{ strokeWidth: rama.ancho }" />
        <path v-if="rama.forma" :d="rama.forma" class="enr-cuerpo" :mask="`url(#enr-crece-${i})`" />
      </template>

      <!-- Tres grupos por brote: el exterior lo ubica (atributo SVG), el
           segundo lo hace brotar y el interior lo mece; así no se pisan. -->
      <g
        v-for="(b, i) in enr.brotes"
        :key="i"
        :transform="`translate(${b.x} ${b.y}) rotate(${b.rot}) scale(${b.esc})`"
      >
        <g class="enr-brote" :class="{ abierta: b.y < alcance }">
          <g
            class="enr-mecer"
            :class="{ viva: b.y > ventana.desde && b.y < ventana.hasta }"
            :style="{ '--dur': b.dur + 's', '--ret': b.ret + 's', '--giro': b.giro + 'deg' }"
          >
            <use v-if="b.tipo === 'flor'" href="#chilco" />
            <use v-else-if="b.tipo === 'capullo'" href="#capullo" />
            <use v-else-if="b.tipo === 'ramilla'" href="#ramilla" />
            <use v-else-if="b.tipo === 'zarcillo'" href="#zarcillo" class="enr-rizo" />
            <use v-else :href="'#hoja-' + b.tipo" :class="b.oscura ? 'enr-hoja-oscura' : 'enr-hoja'" />
          </g>
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useStore } from 'vuex'
import { CONTACTO as c } from '../contacto'

const store = useStore()
const autenticado = computed(() => store.getters['auth/isAuthenticated'])

const enlaceWhatsapp = `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(c.mensajeWhatsapp)}`
const enlaceMapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  [c.direccion, c.comuna, c.ciudad].join(', ')
)}`

const servicios = [
  { titulo: 'Ramos para regalar', texto: 'Cumpleaños, aniversarios o un simple porque sí. Nos dices el presupuesto y lo armamos.' },
  { titulo: 'Arreglos para eventos', texto: 'Matrimonios, bautizos y celebraciones. Conversemos con tiempo para tener las flores que quieres.' },
  { titulo: 'Coronas y condolencias', texto: 'Arreglos sobrios con despacho a velatorios y cementerios.' },
  { titulo: 'Flores por tallo', texto: 'Elige en el mesón lo que llevas, tallo por tallo, y te lo envolvemos al momento.' }
]

const pasos = [
  { titulo: 'Escríbenos', texto: 'Cuéntanos por WhatsApp qué buscas, para cuándo y tu presupuesto.' },
  { titulo: 'Elige', texto: 'Te enviamos fotos de opciones con su precio.' },
  { titulo: 'Recibe', texto: 'Lo retiras en el local o lo despachamos a la dirección que nos indiques.' }
]

/* ---------------- Enredaderas ----------------
 * El trazado depende del alto real de cada sección (cambia con el ancho,
 * la fuente y el texto), así que se mide en el navegador en vez de
 * dibujarse fijo.
 * Una por cada margen, colgando desde arriba; la punta de la rama de la
 * ilustración se une a la de la derecha. Bajan por un carril: el margen
 * libre en escritorio, o la franja que el CSS le cede al contenido
 * (--gutter-izq / --gutter-der) en tablet. En móvil no hay enredaderas:
 * solo la rama que cuelga dentro de la ilustración.
 */
const raiz = ref(null)
const heroSvg = ref(null)
const tallos = []

/* Rama de móvil: su contorno se afina a partir de las guías del SVG */
const guiaTallo = ref(null)
const guiaColibri = ref(null)
const formaMovil = reactive({ tallo: '', colibri: '', piezas: [] })

/* Hojas de la rama de móvil: [posición a lo largo (0–1), lado, abertura
   en grados, tamaño, forma, oscura]. Lado +1 = cae por debajo del tallo,
   -1 = asoma por encima. Hasta ~0.3 el tallo pasa junto a la barra: ahí
   solo van hojas hacia el lado del logo, para no tapar el botón. */
const HOJAS_TALLO = [
  [0.05, 1, 75, 0.65, 'larga', false],
  [0.14, 1, 62, 0.8, 'corazon', true],
  [0.24, 1, 50, 0.9, 'larga', false],
  [0.31, -1, 35, 0.85, 'larga', true],
  [0.36, 1, 58, 1, 'larga', false],
  [0.47, -1, 38, 0.9, 'corazon', false],
  [0.55, 1, 68, 0.75, 'larga', true],
  [0.66, -1, 42, 0.8, 'larga', false],
  [0.74, 1, 60, 0.7, 'corazon', true],
  [0.84, -1, 34, 0.6, 'larga', false]
]
const HOJAS_COLIBRI = [
  [0.3, -1, 45, 0.6, 'larga', true],
  [0.6, 1, 55, 0.55, 'larga', false]
]

/* Ubica cada pieza sobre la curva real de su guía, con el ángulo de la
   rama en ese punto: así ninguna hoja queda flotando */
function armarRamaMovil () {
  const tallo = guiaTallo.value
  const colibri = guiaColibri.value
  if (!tallo || !colibri) return

  const en = (guia, t) => {
    const L = guia.getTotalLength()
    const l = t * L
    const a = guia.getPointAtLength(Math.max(0, l - 1))
    const b = guia.getPointAtLength(Math.min(L, l + 1))
    const q = guia.getPointAtLength(l)
    return { x: q.x, y: q.y, th: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI }
  }
  const piezas = []
  const hojas = (guia, lista) => lista.forEach(([t, lado, abertura, esc, tipo, oscura], i) => {
    const q = en(guia, t)
    piezas.push({
      t: `translate(${q.x} ${q.y}) rotate(${q.th + lado * abertura}) scale(${esc})`,
      tipo,
      clase: oscura ? 'hoja hoja-oscura' : 'hoja',
      dur: 3.4 + (i % 4) * 0.8,
      ret: -i * 1.1,
      giro: 2.5
    })
  })
  hojas(tallo, HOJAS_TALLO)
  hojas(colibri, HOJAS_COLIBRI)

  /* Capullos: cuelgan derechos, sin importar hacia dónde va la rama */
  for (const [t, esc, ret] of [[0.43, 0.9, -1], [0.8, 0.8, -2.5]]) {
    const q = en(tallo, t)
    piezas.push({ t: `translate(${q.x} ${q.y}) scale(${esc})`, tipo: 'capullo', clase: '', dur: 4.2, ret, giro: 5 })
  }
  /* Un zarcillo que se enrosca hacia arriba */
  const z = en(tallo, 0.4)
  piezas.push({ t: `translate(${z.x} ${z.y}) rotate(${z.th - 80})`, tipo: 'zarcillo', clase: 'zarcillo-h', dur: 5, ret: -3, giro: 4 })

  /* Paso fino: la rama se ve grande en pantalla y el contorno debe ser liso */
  formaMovil.tallo = contorno(tallo, 7, 2)
  formaMovil.colibri = contorno(colibri, 3.4, 2)
  formaMovil.piezas = piezas
}

const enr = reactive({ w: 0, h: 0, colores: [], ramas: [], brotes: [] })

/* Hasta qué altura (px desde el tope de la página) ya creció la planta */
const alcance = ref(Infinity)
/* Franja visible: solo se mecen las hojas que están en pantalla */
const ventana = reactive({ desde: 0, hasta: Infinity })

/* Por rama: [{ l, y }] para traducir una altura a largo recorrido */
let muestras = []
let largos = []
const medidas = ref(0)

const avances = computed(() => {
  medidas.value // se recalcula al terminar de medir
  return enr.ramas.map((_, i) => {
    const m = muestras[i]
    if (alcance.value === Infinity || !m?.length) return 1
    let l = 0
    for (const s of m) {
      if (s.y > alcance.value) break
      l = s.l
    }
    return l / largos[i]
  })
})

const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)')

/* Azar con semilla: la misma planta en cada reconstrucción, sin saltos */
function azar (semilla) {
  let a = semilla
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* Curva suave que pasa por todos los puntos (Catmull-Rom → Bézier). El
   primero y el último solo fijan la dirección de entrada y de salida. */
function suavizar (pts) {
  let d = ''
  for (let i = 1; i < pts.length - 2; i++) {
    const [a, b, c, e] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]]
    d += ` C${b[0] + (c[0] - a[0]) / 6} ${b[1] + (c[1] - a[1]) / 6},` +
      ` ${c[0] - (e[0] - b[0]) / 6} ${c[1] - (e[1] - b[1]) / 6}, ${c[0]} ${c[1]}`
  }
  return d
}

/* Ondas hacia abajo por el carril, alternando de lado pero cada una con
   su propio largo y su propia amplitud: una planta no repite la curva.
   Arranca y termina vertical para empalmar sin quiebres. */
function ondular (carril, y, yFin, amp, lado, rg) {
  const pts = [[carril, y - 60], [carril, y]]
  while (y < yFin) {
    const t = yFin - y < 340 ? yFin - y : 200 + rg() * 140
    pts.push([carril + amp * (0.5 + rg() * 0.9) * lado, y + t * (0.4 + rg() * 0.2)])
    y += t
    pts.push([y >= yFin ? carril : carril + amp * 0.3 * (rg() - 0.5), y])
    lado = -lado
  }
  pts.push([carril, yFin + 60])
  return suavizar(pts)
}

/* Contorno del tallo a lo largo de la guía: grueso donde nace y cada vez
   más fino hacia la punta, como una rama de verdad. */
function contorno (guia, ancho, paso = 5) {
  const L = guia.getTotalLength()
  const izq = []
  const der = []
  for (let l = 0; l <= L + paso - 1; l += paso) {
    const t = Math.min(l, L) / L
    const a = guia.getPointAtLength(Math.max(0, Math.min(L, l) - 0.5))
    const b = guia.getPointAtLength(Math.min(L, Math.min(l, L) + 0.5))
    const q = guia.getPointAtLength(Math.min(l, L))
    const n = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const nx = -(b.y - a.y) / n
    const ny = (b.x - a.x) / n
    const w = (ancho / 2) * (0.35 + 0.65 * Math.pow(1 - t, 1.3))
    izq.push(`${(q.x + nx * w).toFixed(1)} ${(q.y + ny * w).toFixed(1)}`)
    der.push(`${(q.x - nx * w).toFixed(1)} ${(q.y - ny * w).toFixed(1)}`)
  }
  return `M${izq.join(' L')} L${der.reverse().join(' L')} Z`
}

async function construirEnredaderas () {
  const el = raiz.value
  const svg = heroSvg.value
  const pie = el?.querySelector('.pie')
  const ilustracion = el?.querySelector('.portada-ilustracion')
  if (!el || !svg || !pie || !ilustracion) return

  const W = el.clientWidth
  const base = el.getBoundingClientRect()
  const margen = (W - Math.min(W, 72 * 16)) / 2
  /* El corte coincide con el media query de --gutter-der en el CSS */
  const holgado = margen > 70
  /* Móvil (portada apilada, igual que en el CSS): sin enredaderas; solo
     la rama que cuelga en la ilustración */
  if (window.matchMedia('(max-width: 959px)').matches) {
    Object.assign(enr, { ramas: [], brotes: [] })
    return
  }
  const amp = holgado ? Math.min(26, margen / 4) : 5
  /* Termina sobre el pie para que el chilco de la punta cuelgue dentro
     de la página y no agregue scroll */
  const yFin = pie.offsetTop - (holgado ? 90 : 56)
  const H = Math.floor(pie.offsetTop + pie.offsetHeight)
  const rg = azar(11)

  const ctm = svg.getScreenCTM()
  const aPagina = (x, y) => {
    const q = new DOMPoint(x, y).matrixTransform(ctm)
    return [q.x - base.left, q.y - base.top]
  }
  /* Grosor de la rama de la ilustración (5 en su viewBox) */
  const grosor = 5 * ctm.a
  const cDer = holgado ? W - margen / 2 : W - 15
  const [x0, y0] = aPagina(360, 104)
  /* Cuelga desde arriba y baja hasta la altura de la punta de la rama */
  const yArriba = holgado ? -10 : el.querySelector('.barra').offsetHeight - 4
  const yUnion = y0 + 10
  const der = {
    d:
      `M${cDer} ${yArriba} C${cDer} ${yArriba + (yUnion - yArriba) / 3}, ${cDer} ${yUnion - (yUnion - yArriba) / 3}, ${cDer} ${yUnion}` +
      ondular(cDer, yUnion, yFin, amp, 1, rg),
    ancho: grosor * 1.25
  }
  /* La unión: la punta de la rama sigue hacia arriba a la derecha, con la
     misma dirección con que llega (≈ 60, -26), y se funde en la enredadera */
  const dx = cDer - x0
  der.union =
    `M${x0} ${y0} C${x0 + dx * 0.5} ${y0 - dx * 0.22}, ${cDer} ${yUnion - 45}, ${cDer} ${yUnion}`

  /* Izquierda: en escritorio cuelga desde el borde superior; en tablet
     entra desde el costado bajo la ilustración */
  const cIzq = holgado ? margen / 2 : 14
  const yI = holgado ? -10 : ilustracion.getBoundingClientRect().bottom - base.top - 20
  const izq = {
    d:
      (holgado
        ? `M${cIzq} ${yI} C${cIzq} ${yI + 40}, ${cIzq} ${yI + 70}, ${cIzq} ${yI + 110}`
        : `M-12 ${yI} C${cIzq * 0.2} ${yI - 4}, ${cIzq} ${yI + 30}, ${cIzq} ${yI + 110}`) +
      ondular(cIzq, yI + 110, yFin - 40, amp, -1, rg),
    ancho: holgado ? 5 : 4
  }

  /* Verdes naturales: igual a la rama de la ilustración mientras dura la
     portada (para que no se note la unión) y más claro hacia la punta.
     El color lo ponen las hojas y los chilcos. */
  const finPortada = Math.min(0.6, (el.querySelector('.portada').offsetHeight + 60) / H)
  const colores = [
    [0, '#17392c'], [finPortada, '#17392c'],
    [finPortada + (1 - finPortada) * 0.5, '#24574a'], [1, '#4f6f3c']
  ]

  Object.assign(enr, { w: W, h: H, colores, ramas: [der, izq], brotes: [] })
  await nextTick()

  const rnd = azar(7)
  const brotes = []
  const flores = []

  enr.ramas.forEach((rama, i) => {
    const p = tallos[i]
    if (!p) return
    const L = p.getTotalLength()
    largos[i] = L
    muestras[i] = []
    for (let l = 0; l <= L; l += 8) muestras[i].push({ l, y: p.getPointAtLength(l).y })
    rama.forma = contorno(p, rama.ancho)

    const punto = (l) => p.getPointAtLength(Math.max(0, Math.min(L, l)))
    const angulo = (l) => {
      const a = punto(l - 1)
      const b = punto(l + 1)
      return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
    }
    /* +1: apunta a la derecha del tallo; -1: a la izquierda. "Afuera" es
       hacia el borde de la pantalla. */
    const afuera = i === 0 ? 1 : -1
    const colgando = () => rnd() * 16 - 8

    /* Follaje cada 26–40px de tallo. Las hojas cuelgan: las que miran al
       contenido van casi pegadas al tallo para no tapar texto. */
    for (let l = 40; l < L - 20; l += 26 + rnd() * 14) {
      const q = punto(l)
      const th = angulo(l)
      if (rama.sinHojas && q.y > rama.sinHojas[0] && q.y < rama.sinHojas[1]) continue
      const vida = () => ({ dur: 2.8 + rnd() * 3, ret: -rnd() * 5, giro: 2 + rnd() * 4 })

      const n = rnd() < 0.5 ? 2 : 1
      for (let k = 0; k < n; k++) {
        const hacia = rnd() < 0.5 ? 1 : -1
        const haciaAfuera = hacia === afuera
        const abertura = haciaAfuera ? 40 + rnd() * 35 : 20 + rnd() * 14
        const r = rnd()
        const tipo = r < 0.5 ? 'larga' : r < 0.85 ? 'corazon' : 'chica'
        const esc = holgado
          ? 0.8 + rnd() * 0.7
          : haciaAfuera ? 0.55 + rnd() * 0.4 : 0.45 + rnd() * 0.2
        brotes.push({ x: q.x, y: q.y, rot: th - abertura * hacia, esc, tipo, oscura: rnd() < 0.35, ...vida() })
      }

      const r = rnd()
      if (r < 0.07) {
        /* Ramita: en escritorio hacia afuera; en móvil afuera se sale de
           la pantalla, así que va hacia adentro y muy caída */
        const hacia = holgado ? afuera : -afuera
        const abertura = holgado ? 45 + rnd() * 20 : 16 + rnd() * 8
        brotes.push({
          x: q.x, y: q.y, rot: th - abertura * hacia, esc: holgado ? 1.1 + rnd() * 0.4 : 0.7 + rnd() * 0.2,
          tipo: 'ramilla', ...vida(), giro: 3
        })
      } else if (r < 0.12) {
        brotes.push({ x: q.x, y: q.y, rot: colgando(), esc: holgado ? 1 : 0.75, tipo: 'capullo', ...vida(), giro: 5 })
      } else if (r < 0.22) {
        brotes.push({
          x: q.x, y: q.y, rot: th - 70 * afuera, esc: holgado ? 1.2 : 0.8, tipo: 'zarcillo', ...vida(), giro: 6
        })
      }
    }

    /* Chilcos: la derecha los cuelga al comienzo de cada sección, la
       izquierda a media sección; así se alternan. Y uno en cada punta. */
    const colgar = (y, esc) => {
      const m = muestras[i].find((s) => s.y >= y)
      if (!m) return
      const q = punto(m.l)
      flores.push({ x: q.x, y: q.y, rot: colgando(), esc, tipo: 'flor', dur: 3.5 + rnd() * 2, ret: -rnd() * 5, giro: 3 })
    }
    const escFlor = holgado ? 1 : 0.6
    el.querySelectorAll('.seccion').forEach((sec) => {
      if (i === 0) colgar(sec.offsetTop + (holgado ? 36 : 10), escFlor)
      else colgar(sec.offsetTop + sec.offsetHeight * 0.55, escFlor * 0.85)
    })
    if (i === 1 && holgado) colgar(y0 + 180, escFlor * 0.85)
    const fin = punto(L)
    flores.push({ x: fin.x, y: fin.y, rot: 0, esc: escFlor * 0.9, tipo: 'flor', dur: 4, ret: -rnd() * 4, giro: 3 })
  })

  /* Flores al final del arreglo: se pintan sobre las hojas */
  enr.brotes = brotes.concat(flores)
  medidas.value++
  medirAlcance()
}

/* Se redondea para no re-renderizar cientos de brotes por cada píxel */
const redondear = (v) => Math.round(v / 24) * 24

function medirAlcance () {
  const top = raiz.value?.getBoundingClientRect().top ?? 0
  const alto = window.innerHeight
  ventana.desde = redondear(-top - 150)
  ventana.hasta = redondear(-top + alto + 150)
  alcance.value = sinMovimiento.matches ? Infinity : redondear(alto * 0.85 - top)
}

let cuadro = 0
const alScroll = () => {
  cancelAnimationFrame(cuadro)
  cuadro = requestAnimationFrame(medirAlcance)
}

let observador = null
let pendiente = 0
const reconstruir = () => {
  clearTimeout(pendiente)
  pendiente = setTimeout(construirEnredaderas, 120)
}

onMounted(() => {
  /* En coordenadas del dibujo: no depende del ancho, se calcula una vez */
  armarRamaMovil()
  medirAlcance()
  construirEnredaderas()
  /* La fuente web cambia el alto de los textos al terminar de cargar */
  document.fonts?.ready.then(construirEnredaderas)
  observador = new ResizeObserver(reconstruir)
  observador.observe(raiz.value.querySelector('main'))
  window.addEventListener('scroll', alScroll, { passive: true })
  window.addEventListener('resize', alScroll)
})

onUnmounted(() => {
  observador?.disconnect()
  clearTimeout(pendiente)
  cancelAnimationFrame(cuadro)
  window.removeEventListener('scroll', alScroll)
  window.removeEventListener('resize', alScroll)
})
</script>

<style scoped>
.landing {
  --petalo: #fcedf1;
  --tallo: #17392c;
  --tallo-suave: #3d5a4c;
  --fucsia: #c8306e;
  --fucsia-hover: #a92459;
  --garganta: #0f7c74;
  --hoja: #d5e6cc;
  --morado: #5b2a86;

  --medida: 34rem;
  --gutter: 16px;

  min-height: 100vh;
  background: var(--petalo);
  color: var(--tallo);
  font-family: 'Bricolage Grotesque', var(--font);
  font-optical-sizing: auto;
  font-size: 1.0625rem;
  line-height: 1.55;
  /* clip y no hidden: hidden convierte a .landing en contenedor de scroll
     propio y aparece una segunda barra cuando algo sobresale */
  overflow-x: clip;
  position: relative;
}

/* ---------------- Enredaderas ---------------- */
.enredadera {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}
.enr-cuerpo { fill: url(#enr-tallo); }
/* La guía vive dentro de la máscara: blanca = visible. El dash la revela
   de a poco a medida que se hace scroll. */
.enr-guia {
  fill: none;
  stroke: #fff;
  stroke-linecap: round;
  stroke-dasharray: 1 1;
  transition: stroke-dashoffset .35s ease-out;
}
.enr-union { fill: none; stroke: var(--tallo); stroke-linecap: round; }
.enr-hoja { fill: url(#enr-hoja); }
.enr-hoja-oscura { fill: url(#enr-hoja-oscura); }
.enr-rizo { fill: none; stroke: #2f6f52; stroke-width: 1.3; stroke-linecap: round; }
.enr-ramilla { fill: none; stroke: #24574a; stroke-width: 1.8; stroke-linecap: round; }
.enr-pedicelo { fill: none; stroke: #24574a; stroke-width: 1.4; }
.enr-capullo { fill: #d8325f; }

/* Todo gira y escala desde su punto de unión (el origen local) */
.enr-brote, .enr-mecer { transform-origin: 0 0; }

/* Brotan cuando el tallo llega a ellos */
.enr-brote {
  transform: scale(0);
  opacity: 0;
  transition: transform .7s cubic-bezier(.2, .9, .3, 1.2), opacity .4s;
}
.enr-brote.abierta { transform: scale(1); opacity: 1; }

/* Brisa: cada hoja con su propio ritmo y desfase */
.enr-mecer.viva {
  animation: mecer var(--dur) ease-in-out var(--ret) infinite alternate;
}
@keyframes mecer {
  from { transform: rotate(calc(var(--giro) * -1)); }
  to { transform: rotate(var(--giro)); }
}

/* ---------------- Barra ---------------- */
.barra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 72rem;
  margin: 0 auto;
  padding: 14px var(--gutter);
}
.marca {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--tallo);
  text-decoration: none;
  font-weight: 700;
  font-size: 1.25rem;
  letter-spacing: -0.02em;
}
.marca-ave { width: 30px; height: 30px; fill: var(--fucsia); }
.acceso {
  color: var(--tallo-suave);
  font-size: 0.9375rem;
  font-weight: 500;
  text-decoration: none;
  padding: 8px 14px;
  border: 1.5px solid color-mix(in srgb, var(--tallo) 25%, transparent);
  border-radius: 999px;
}
.acceso:hover { color: var(--tallo); border-color: var(--tallo); }

/* ---------------- Botones ---------------- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 24px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 1rem;
  text-decoration: none;
  transition: background-color .15s, color .15s;
}
.btn svg {
  width: 20px; height: 20px;
  fill: none; stroke: currentColor; stroke-width: 2; stroke-linejoin: round;
}
.btn-principal { background: var(--fucsia); color: #fff; }
.btn-principal:hover { background: var(--fucsia-hover); }
.btn-secundario { color: var(--tallo); box-shadow: inset 0 0 0 1.5px var(--tallo); }
.btn-secundario:hover { background: var(--tallo); color: var(--petalo); }
.btn-claro { background: var(--petalo); color: var(--tallo); }
.btn-claro:hover { background: #fff; }

.landing a:focus-visible {
  outline: 3px solid var(--garganta);
  outline-offset: 3px;
}

/* ---------------- Portada ---------------- */
.portada {
  display: grid;
  max-width: 72rem;
  margin: 0 auto;
  padding: 0 var(--gutter);
}
.landing h1, .landing h2, .landing h3 { color: inherit; }
h1 {
  font-size: clamp(2.75rem, 11vw, 5.75rem);
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -0.035em;
  font-variation-settings: 'wdth' 80;
  text-wrap: balance;
}
.bajada {
  margin-top: 16px;
  max-width: var(--medida);
  font-size: 1.1875rem;
  color: var(--tallo-suave);
}
/* Móvil: los dos botones comparten una fila. El de WhatsApp toma el
   espacio que sobra; el otro mide lo que su texto. */
.acciones {
  display: flex;
  gap: 8px;
  margin-top: 22px;
}
.acciones .btn {
  min-height: 46px;
  padding: 0 14px;
  font-size: 0.9375rem;
  gap: 8px;
  white-space: nowrap;
}
.acciones .btn-principal { flex: 1; }
.acciones .btn svg { width: 18px; height: 18px; }
/* En teléfonos angostos el ícono no cabe junto al texto */
@media (max-width: 380px) {
  .acciones .btn svg { display: none; }
}

/* Móvil: la ilustración va primero y ocupa la franja y = 50…400 del
   viewBox. No recorta: la rama sube por detrás de la barra hasta el borde
   superior de la pantalla (por eso no captura toques, para no tapar los
   enlaces de la barra). */
.portada-ilustracion {
  order: -1;
  margin: 0 calc(var(--gutter) * -1) 4px;
  aspect-ratio: 400 / 350;
  pointer-events: none;
  /* Sin overflow: hidden, la caja tomaría el tamaño mínimo del SVG: la
     grilla lo agrandaría y aspect-ratio dejaría de recortar el alto */
  min-width: 0;
  min-height: 0;
}
.portada-ilustracion svg {
  display: block;
  width: 100%;
  height: auto;
  margin-top: -12.5%;
  overflow: visible;
}

.rama { fill: none; stroke: var(--tallo); stroke-width: 5; stroke-linecap: round; }
.rama-tronco { stroke: url(#tronco-fade); }
.rama-fina { stroke-width: 3; }
.guia { fill: none; stroke: none; }
.solo-movil { display: none; }
.cuerpo-rama { fill: var(--tallo); }
.zarcillo-h { fill: none; stroke: #2f6f52; stroke-width: 1.3; stroke-linecap: round; }

/* La rama de móvil se mece apenas, desde el punto donde cuelga. Ida y
   vuelta en un mismo ciclo con curva senoidal: sin frenadas en los
   extremos. */
@keyframes mecer-planta {
  0%, 100% { transform: rotate(-0.8deg); }
  50% { transform: rotate(0.8deg); }
}
/* Cada hoja tiembla desde su punto de unión, con su propio ritmo */
.pieza-viva {
  transform-origin: 0 0;
  animation: mecer var(--dur) cubic-bezier(.45, 0, .55, 1) var(--ret) infinite alternate;
}
/* Las flores se balancean como péndulo desde donde nacen */
.flor-mece {
  transform-origin: 0 0;
  animation: pendulo var(--dur) cubic-bezier(.45, 0, .55, 1) var(--ret) infinite alternate;
}
@keyframes pendulo {
  from { transform: rotate(-2.5deg); }
  to { transform: rotate(2.5deg); }
}
.hoja { fill: url(#enr-hoja); }
.hoja-oscura { fill: url(#enr-hoja-oscura); }
.pedicelo { fill: none; stroke: var(--tallo); stroke-width: 2; }
.ovario { fill: #3f7a4f; }
.sepalo { fill: #d8325f; }
.corola { fill: var(--morado); }
.estambre { fill: none; stroke: #d8325f; stroke-width: 1.6; stroke-linecap: round; }
.antera { fill: #f5d7e3; }

.ave-cuerpo { fill: var(--fucsia); }
.ave-garganta { fill: var(--garganta); }
.ave-ala { fill: #e98ab0; }
.ave-ojo { fill: var(--petalo); }
.ave-pico { stroke: var(--tallo); stroke-width: 1.6; stroke-linecap: round; }

/* Llega volando una vez y se queda suspendido frente a la flor */
.ave-llegada { animation: llegar 1.6s cubic-bezier(.2, .8, .25, 1) both; }
.ave-flotar { animation: flotar 2.4s ease-in-out 1.6s infinite; }
.ave-ala {
  transform-box: fill-box;
  transform-origin: 10% 100%;
  animation: aletear 0.11s linear infinite alternate;
}

@keyframes llegar {
  from { transform: translate(-120px, 90px); opacity: 0; }
  30% { opacity: 1; }
  to { transform: none; opacity: 1; }
}
@keyframes flotar {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@keyframes aletear {
  from { transform: scaleY(1); }
  to { transform: scaleY(0.35); }
}

@media (prefers-reduced-motion: reduce) {
  .ave-llegada, .ave-flotar, .ave-ala { animation: none; }
  .enr-guia, .enr-brote { transition: none; }
  .planta, .pieza-viva, .flor-mece { animation: none !important; }
  .enr-mecer.viva { animation: none; }
}

/* ---------------- Secciones ---------------- */
.seccion {
  max-width: 72rem;
  margin: 0 auto;
  padding: 64px var(--gutter);
}
h2 {
  font-size: clamp(2rem, 7vw, 3.25rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
  font-variation-settings: 'wdth' 85;
  margin-bottom: 32px;
}
h3 {
  font-size: 1.3125rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.lista-servicios { list-style: none; display: grid; }
.lista-servicios li {
  padding: 22px 0 22px 30px;
  border-top: 1.5px solid color-mix(in srgb, var(--tallo) 18%, transparent);
  position: relative;
}
/* Un brote como viñeta: tallo + botón fucsia */
.lista-servicios li::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 30px;
  width: 11px;
  height: 14px;
  background: var(--fucsia);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
}
.lista-servicios p { margin-top: 6px; max-width: var(--medida); color: var(--tallo-suave); }

/* Cómo pedir: la única banda oscura */
.pedir {
  max-width: none;
  background: var(--tallo);
  color: var(--petalo);
}
.pedir-interior { max-width: calc(72rem - 2 * var(--gutter)); margin: 0 auto; }
.pasos {
  list-style: none;
  counter-reset: paso;
  display: grid;
  gap: 28px;
  margin-bottom: 36px;
}
.pasos li {
  counter-increment: paso;
  display: grid;
  grid-template-columns: 3.25rem 1fr;
  column-gap: 12px;
}
.pasos li::before {
  content: counter(paso);
  grid-row: span 2;
  font-size: 3.25rem;
  font-weight: 800;
  line-height: 0.9;
  color: #f28bb3;
}
.pasos p { margin-top: 4px; color: color-mix(in srgb, var(--petalo) 78%, transparent); max-width: 28rem; }

/* Visítanos */
.visita-grilla { display: grid; gap: 40px; }
.direccion { font-size: 1.5rem; font-weight: 600; line-height: 1.3; margin-bottom: 20px; }
.horario { border-collapse: collapse; width: 100%; max-width: 26rem; }
.horario caption { text-align: left; font-weight: 700; font-size: 1.125rem; margin-bottom: 8px; }
.horario th, .horario td {
  padding: 12px 0;
  border-top: 1.5px solid color-mix(in srgb, var(--tallo) 18%, transparent);
  text-align: left;
  font-weight: 400;
}
.horario td { text-align: right; font-variant-numeric: tabular-nums; }

/* Pie */
.pie {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 72rem;
  margin: 0 auto;
  padding: 32px var(--gutter) 40px;
  border-top: 1.5px solid color-mix(in srgb, var(--tallo) 18%, transparent);
  font-size: 0.9375rem;
  color: var(--tallo-suave);
}
.pie p { font-weight: 700; color: var(--tallo); }
.pie a { color: inherit; }

/* ---------------- Escritorio ---------------- */
@media (min-width: 720px) {
  .acciones { gap: 12px; margin-top: 28px; }
  .acciones .btn { min-height: 52px; padding: 0 24px; font-size: 1rem; }
  .acciones .btn-principal { flex: none; }
  .lista-servicios { grid-template-columns: 1fr 1fr; column-gap: 48px; }
  .pasos { grid-template-columns: repeat(3, 1fr); gap: 32px; }
  .visita-grilla { grid-template-columns: 1fr 1fr; align-items: start; }
  .pie { flex-direction: row; align-items: center; gap: 28px; }
  .pie a:last-child { margin-left: auto; }
}

@media (min-width: 960px) {
  .portada {
    grid-template-columns: 1.1fr 1fr;
    align-items: center;
    padding-top: 56px;
  }
  h1 { max-width: 11ch; }
  .portada-ilustracion { order: 0; margin: 0; aspect-ratio: auto; overflow: visible; }
  .portada-ilustracion svg { margin-top: 0; max-height: 82vh; }
  .seccion { padding-top: 96px; padding-bottom: 96px; }
}

/* Mientras no haya margen lateral libre, el contenido cede una franja a
   cada lado para que las enredaderas no pasen sobre el texto. El corte
   coincide con `holgado` en construirEnredaderas: 72rem + 2 × 70px. */
@media (max-width: 1291px) {
  .landing { --gutter-izq: 32px; --gutter-der: 36px; }
  .seccion, .pie {
    padding-left: var(--gutter-izq);
    padding-right: var(--gutter-der);
  }
  .pedir-interior { max-width: calc(72rem - var(--gutter-izq) - var(--gutter-der)); }
  .portada-texto {
    padding-left: calc(var(--gutter-izq) - var(--gutter));
    padding-right: calc(var(--gutter-der) - var(--gutter));
  }
}

/* Móvil: sin enredaderas, solo la rama que cuelga desde arriba en la
   ilustración, y el texto recupera sus márgenes. El corte coincide con el
   de construirEnredaderas. */
@media (max-width: 959px) {
  .landing { --gutter-izq: var(--gutter); --gutter-der: var(--gutter); }
  .solo-escritorio { display: none; }
  .solo-movil { display: inline; }
  .planta {
    /* El punto donde nace la rama, en unidades del viewBox */
    transform-origin: 170px -30px;
    animation: mecer-planta 9s cubic-bezier(.45, 0, .55, 1) infinite;
  }
}
</style>
