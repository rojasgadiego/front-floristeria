<template>
  <div ref="raiz" class="landing">
    <header class="barra">
      <nav class="menu" aria-label="Secciones">
        <a v-if="catalogo.length" href="#catalogo">Catálogo</a>
        <a href="#galeria">Galería</a>
        <a href="#pedir">Cómo pedir</a>
        <a href="#visitanos">Visítanos</a>
      </nav>

      <router-link v-if="autenticado" :to="{ name: 'Dashboard' }" class="acceso">
        Ir al sistema
      </router-link>
    </header>

    <main>
      <!-- ============ Portada ============ -->
      <section class="portada">
        <!-- Manchas de acuarela: solo color de fondo, sin contenido -->
        <div class="acuarela" aria-hidden="true">
          <span class="mancha mancha-menta"></span>
          <span class="mancha mancha-rosa"></span>
          <span class="mancha mancha-lima"></span>
        </div>

        <h1 class="portada-marca">
          <LogoColibri class="portada-logo" />
        </h1>

        <p class="portada-titular">Flores frescas, armadas a mano.</p>
        <p class="bajada">
          Ramos, arreglos y flores por tallo.
          Escríbenos por WhatsApp y lo dejamos listo para retirar o despachar.
        </p>

        <div class="acciones">
          <a :href="enlaceWhatsapp" class="btn btn-principal" target="_blank" rel="noopener">
            <MessageCircle :size="20" aria-hidden="true" />
            Pedir por WhatsApp
          </a>
          <a href="#visitanos" class="btn btn-secundario">Cómo llegar</a>
        </div>
      </section>

      <div class="separador" aria-hidden="true"><img :src="enredadera" alt="" width="148" height="50" loading="lazy"></div>

      <!-- ============ Qué hacemos ============ -->
      <section class="seccion servicios" aria-labelledby="t-servicios">
        <h2 id="t-servicios">Lo que armamos</h2>
        <ul class="tarjetas">
          <li v-for="s in servicios" :key="s.titulo" class="servicio">
            <span class="servicio-icono" aria-hidden="true">
              <component :is="s.icono" :size="26" :stroke-width="1.6" />
            </span>
            <h3>{{ s.titulo }}</h3>
            <p>{{ s.texto }}</p>
          </li>
        </ul>
      </section>

      <!-- ============ Catálogo ============ -->
      <!-- Lo activo y con foto: subir la foto en el inventario es lo que
           decide qué ve el cliente. Sin productos con foto, la sección no
           aparece. -->
      <section v-if="catalogo.length" id="catalogo" class="seccion catalogo" aria-labelledby="t-catalogo">
        <h2 id="t-catalogo">Catálogo</h2>
        <p class="seccion-bajada">
          Una muestra de lo que tenemos. Toca un producto para pedirlo por WhatsApp.
        </p>
        <ul class="catalogo-grilla">
          <li v-for="p in catalogoVisible" :key="p.id">
            <a class="producto" :href="enlacePedido(p)" target="_blank" rel="noopener">
              <img class="producto-foto" :src="fotoCatalogo(p)" :alt="p.nombre" loading="lazy">
              <span class="producto-nombre">{{ p.nombre }}</span>
              <span class="producto-precio">{{ p.precio > 0 ? pesos(p.precio) : 'Consultar' }}</span>
            </a>
          </li>
        </ul>
        <button v-if="catalogo.length > catalogoVisible.length" class="btn btn-secundario catalogo-mas"
          @click="verTodo = true">
          Ver los {{ catalogo.length }} productos
        </button>
      </section>

      <!-- ============ Galería ============ -->
      <section id="galeria" class="seccion galeria" aria-labelledby="t-galeria">
        <h2 id="t-galeria">Galería</h2>
        <p class="seccion-bajada">Algunos de los ramos y arreglos que hemos armado.</p>
        <ul class="galeria-grilla">
          <li v-for="(foto, i) in galeriaVisible" :key="foto">
            <button class="galeria-foto" type="button" :aria-label="`Ampliar foto ${i + 1}`" @click="abrirVisor(i)">
              <img :src="urlFoto(foto)" :alt="`Trabajo de Colibrí, foto ${i + 1}`" loading="lazy">
            </button>
          </li>
        </ul>
        <button v-if="FOTOS_GALERIA.length > galeriaVisible.length" class="btn btn-secundario galeria-mas"
          type="button" @click="verMasFotos">
          Ver más fotos
        </button>

        <h3 class="galeria-subtitulo">Reels</h3>
        <ul class="galeria-grilla">
          <li v-for="(reel, i) in reelsVisibles" :key="reel.codigo">
            <button class="galeria-foto reel-portada" type="button" :aria-label="`Ver reel ${i + 1}`" @click="abrirReel(reel)">
              <img :src="urlFoto(reel.portada)" alt="" loading="lazy">
              <span class="reel-play" aria-hidden="true"><Play :size="26" /></span>
            </button>
          </li>
        </ul>
        <button v-if="REELS_GALERIA.length > reelsVisibles.length" class="btn btn-secundario galeria-mas"
          type="button" @click="verMasReels">
          Ver más reels
        </button>
      </section>

      <!-- El iframe existe solo mientras el visor está abierto: así Instagram
           no carga con la página y el video se detiene al cerrar. -->
      <dialog ref="visorReel" class="visor" aria-label="Reel" @click.self="cerrarReel" @close="reelAbierto = null">
        <iframe v-if="reelAbierto" class="visor-reel" :src="`https://www.instagram.com/reel/${reelAbierto}/embed/`"
          title="Reel de Colibrí en Instagram" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
        <button class="visor-btn visor-cerrar" type="button" aria-label="Cerrar" @click="cerrarReel">
          <X :size="24" aria-hidden="true" />
        </button>
      </dialog>

      <dialog ref="visor" class="visor" aria-label="Foto ampliada" @click.self="cerrarVisor"
        @close="fotoAbierta = null" @keydown.left="moverVisor(-1)" @keydown.right="moverVisor(1)">
        <img v-if="fotoAbierta !== null" :src="urlFoto(FOTOS_GALERIA[fotoAbierta])"
          :alt="`Trabajo de Colibrí, foto ${fotoAbierta + 1}`">
        <button class="visor-btn visor-cerrar" type="button" aria-label="Cerrar" @click="cerrarVisor">
          <X :size="24" aria-hidden="true" />
        </button>
        <button class="visor-btn visor-anterior" type="button" aria-label="Foto anterior" @click="moverVisor(-1)">
          <ChevronLeft :size="28" aria-hidden="true" />
        </button>
        <button class="visor-btn visor-siguiente" type="button" aria-label="Foto siguiente" @click="moverVisor(1)">
          <ChevronRight :size="28" aria-hidden="true" />
        </button>
      </dialog>

      <div class="separador separador-espejo" aria-hidden="true"><img :src="enredadera" alt="" width="148" height="50" loading="lazy"></div>

      <!-- ============ Cómo pedir ============ -->
      <section id="pedir" class="seccion pedir" aria-labelledby="t-pedir">
        <div class="pedir-caja">
          <h2 id="t-pedir">Cómo pedir</h2>
          <ol class="pasos">
            <li v-for="p in pasos" :key="p.titulo">
              <h3>{{ p.titulo }}</h3>
              <p>{{ p.texto }}</p>
            </li>
          </ol>
          <a :href="enlaceWhatsapp" class="btn btn-principal" target="_blank" rel="noopener">
            <MessageCircle :size="20" aria-hidden="true" />
            Escribir al {{ c.whatsappVisible }}
          </a>
        </div>
      </section>

      <!-- ============ Visítanos ============ -->
      <section id="visitanos" class="seccion visita" aria-labelledby="t-visita">
        <h2 id="t-visita">Visítanos</h2>
        <div class="visita-grilla">
          <div class="visita-direccion">
            <MapPin class="visita-icono" :size="26" :stroke-width="1.6" aria-hidden="true" />
            <p class="direccion">
              {{ c.direccion }}<br>
              {{ c.comuna }}, {{ c.ciudad }}
            </p>
            <a :href="enlaceMapa" class="btn btn-secundario" target="_blank" rel="noopener">
              Abrir en Google Maps
            </a>
          </div>

          <div class="horario-caja">
            <h3 id="t-horario" class="horario-titulo">
              <Clock :size="22" :stroke-width="1.8" aria-hidden="true" />
              Horario de atención
            </h3>
            <table class="horario" aria-labelledby="t-horario">
              <tbody>
                <tr v-for="h in c.horarios" :key="h.dias">
                  <th scope="row">{{ h.dias }}</th>
                  <td>{{ h.horas }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>

    <footer class="pie">
      <img class="pie-logo" src="@/assets/logo-colibri.svg" alt="Colibrí, floristería y decoración"
        width="333" height="184" loading="lazy">
      <div class="pie-enlaces">
        <a v-if="c.instagram" :href="`https://instagram.com/${c.instagram}`" target="_blank" rel="noopener">
          <Instagram :size="18" aria-hidden="true" />
          @{{ c.instagram }}
        </a>
        <router-link :to="{ name: 'Login' }">Acceso equipo</router-link>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useStore } from 'vuex'
import { ChevronLeft, ChevronRight, Clock, Flower2, Heart, Instagram, MapPin, MessageCircle, PartyPopper, Play, Sprout, X } from 'lucide-vue-next'
import { CONTACTO as c } from '../contacto'
import { FOTOS_GALERIA, REELS_GALERIA } from '../galeria'
import LogoColibri from '@/shared/components/LogoColibri.vue'
import enredadera from '@/assets/enredadera.svg'
import { imagenesService } from '@/features/inventario/services/imagenes.service'

const store = useStore()
const autenticado = computed(() => store.getters['auth/isAuthenticated'])

const enlaceWhatsapp = `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(c.mensajeWhatsapp)}`
const enlaceMapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  [c.direccion, c.comuna, c.ciudad].join(', ')
)}`

const servicios = [
  { icono: Flower2, titulo: 'Ramos para regalar', texto: 'Cumpleaños, aniversarios o un simple porque sí. Nos dices el presupuesto y lo armamos.' },
  { icono: PartyPopper, titulo: 'Arreglos para eventos', texto: 'Matrimonios, bautizos y celebraciones. Conversemos con tiempo para tener las flores que quieres.' },
  { icono: Heart, titulo: 'Coronas y condolencias', texto: 'Arreglos sobrios con despacho a velatorios y cementerios.' },
  { icono: Sprout, titulo: 'Flores por tallo', texto: 'Elige en el mesón lo que llevas, tallo por tallo, y te lo envolvemos al momento.' }
]

const pasos = [
  { titulo: 'Escríbenos', texto: 'Cuéntanos por WhatsApp qué buscas, para cuándo y tu presupuesto.' },
  { titulo: 'Elige', texto: 'Te enviamos fotos de opciones con su precio.' },
  { titulo: 'Recibe', texto: 'Lo retiras en el local o lo despachamos a la dirección que nos indiques.' }
]

/* ---------------- Catálogo ----------------
 * Lo pide sin sesión. Si falla o viene vacío la sección no se muestra: la
 * landing funciona igual sin catálogo.
 */
const LIMITE_CATALOGO = 8
const catalogo = ref([])
const verTodo = ref(false)
const catalogoVisible = computed(() =>
  verTodo.value ? catalogo.value : catalogo.value.slice(0, LIMITE_CATALOGO))

const fotoCatalogo = (p) => imagenesService.url(p.id, p.version)
const enlacePedido = (p) =>
  `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(`Hola, me interesa: ${p.nombre}`)}`
const pesos = (n) => '$' + Math.round(n).toLocaleString('es-CL')

async function cargarCatalogo () {
  try {
    catalogo.value = (await imagenesService.catalogo()) || []
  } catch {
    catalogo.value = []
  }
}

/* ---------------- Galería ----------------
 * Fotos estáticas de public/galeria. Se muestran por tandas y cada imagen
 * carga recién al acercarse a la pantalla.
 */
const FOTOS_POR_TANDA = 12
const cantidadFotos = ref(FOTOS_POR_TANDA)
const galeriaVisible = computed(() => FOTOS_GALERIA.slice(0, cantidadFotos.value))
const urlFoto = (archivo) => `/galeria/${archivo}`

async function verMasFotos () {
  cantidadFotos.value += FOTOS_POR_TANDA
  // La página creció: las animaciones de más abajo deben recalcular su lugar
  await nextTick()
  ScrollTrigger.refresh()
}

const visor = ref(null)
const fotoAbierta = ref(null)

function abrirVisor (i) {
  fotoAbierta.value = i
  visor.value.showModal()
}
function cerrarVisor () {
  visor.value.close()
}
function moverVisor (paso) {
  const total = FOTOS_GALERIA.length
  fotoAbierta.value = (fotoAbierta.value + paso + total) % total
}

const REELS_POR_TANDA = 8
const cantidadReels = ref(REELS_POR_TANDA)
const reelsVisibles = computed(() => REELS_GALERIA.slice(0, cantidadReels.value))

async function verMasReels () {
  cantidadReels.value += REELS_POR_TANDA
  await nextTick()
  ScrollTrigger.refresh()
}

const visorReel = ref(null)
const reelAbierto = ref(null)

function abrirReel (reel) {
  reelAbierto.value = reel.codigo
  visorReel.value.showModal()
}
function cerrarReel () {
  visorReel.value.close()
}

/* ---------------- Animaciones (GSAP) ----------------
 * Todo dentro de un matchMedia: con "reducir movimiento" activado no se
 * crea ninguna animación y la página queda quieta y visible. Las entradas
 * por scroll corren una sola vez; no se esconden de nuevo al subir.
 */
gsap.registerPlugin(ScrollTrigger)

const raiz = ref(null)
let mm = null

const alEntrar = (trigger) => ({ trigger, start: 'top 85%', once: true })

function animarPortada () {
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    // El titular se descubre de izquierda a derecha. No se separa en
    // palabras: el degradado del texto se cortaría en cada una.
    .from('.portada-titular', { clipPath: 'inset(0 100% 0 0)', y: 12, duration: 1.1, clearProps: 'clipPath' }, 0.7)
    .from('.bajada', { autoAlpha: 0, y: 16, duration: 0.8 }, 1.05)
    .from('.acciones .btn', { autoAlpha: 0, y: 18, scale: 0.96, duration: 0.7, stagger: 0.12, clearProps: 'transform' }, 1.25)

  // Las manchas de acuarela bajan más lento que la página: profundidad
  gsap.to('.acuarela', {
    yPercent: 22,
    ease: 'none',
    scrollTrigger: { trigger: '.portada', start: 'top top', end: 'bottom top', scrub: true }
  })
}

function animarSecciones () {
  // Títulos: suben y el trazo de colores se dibuja desde el centro
  gsap.utils.toArray('.seccion h2').forEach((h2) => {
    gsap.timeline({ scrollTrigger: alEntrar(h2) })
      .from(h2, { autoAlpha: 0, y: 24, duration: 0.8, ease: 'power3.out' })
      .from(h2, { '--trazo': 0, duration: 0.7, ease: 'power2.inOut' }, 0.3)
  })

  // La enredadera se "dibuja" desplegándose hacia los lados
  gsap.utils.toArray('.separador img').forEach((img) => {
    gsap.from(img, {
      clipPath: 'inset(0 50% 0 50%)',
      duration: 1.2,
      ease: 'power2.inOut',
      clearProps: 'clipPath',
      scrollTrigger: alEntrar(img)
    })
  })

  gsap.from('.servicio', {
    autoAlpha: 0, y: 40, duration: 0.8, ease: 'power3.out', stagger: 0.12,
    clearProps: 'transform',
    scrollTrigger: alEntrar('.tarjetas')
  })

  const pasos = gsap.timeline({ scrollTrigger: alEntrar('.pedir-caja') })
  pasos
    .from('.pedir-caja', { autoAlpha: 0, scale: 0.97, y: 30, duration: 0.9, ease: 'power3.out' })
    .from('.pasos li', { autoAlpha: 0, y: 24, duration: 0.6, ease: 'back.out(1.6)', stagger: 0.18 }, 0.35)
    .from('.pedir-caja > .btn', { autoAlpha: 0, y: 14, duration: 0.5, ease: 'power2.out' }, '-=0.2')

  gsap.from('.visita-direccion', { autoAlpha: 0, x: -36, duration: 0.9, ease: 'power3.out', scrollTrigger: alEntrar('.visita-grilla') })
  gsap.from('.horario-caja', { autoAlpha: 0, x: 36, duration: 0.9, ease: 'power3.out', delay: 0.1, scrollTrigger: alEntrar('.visita-grilla') })
  gsap.from('.horario tr', { autoAlpha: 0, x: 12, duration: 0.4, stagger: 0.07, delay: 0.4, scrollTrigger: alEntrar('.visita-grilla') })

  gsap.from('.pie > *', { autoAlpha: 0, y: 16, duration: 0.7, stagger: 0.12, scrollTrigger: alEntrar('.pie') })
}

// El catálogo llega después (fetch) y se anima en tandas al aparecer
function animarCatalogo () {
  ScrollTrigger.batch('.catalogo-grilla li', {
    start: 'top 90%',
    once: true,
    onEnter: (items) => gsap.from(items, { autoAlpha: 0, y: 30, duration: 0.6, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' })
  })
}

onMounted(async () => {
  mm = gsap.matchMedia(raiz.value)
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    animarPortada()
    animarSecciones()
  })

  await cargarCatalogo()
  await nextTick()
  if (catalogo.value.length) {
    mm.add('(prefers-reduced-motion: no-preference)', animarCatalogo)
  }
  // El catálogo y las fuentes cambian la altura: recalcular los disparadores
  ScrollTrigger.refresh()
  document.fonts?.ready.then(() => ScrollTrigger.refresh())
})

onBeforeUnmount(() => mm?.revert())
</script>

<style scoped>
/*
 * Paleta de la marca (tokens.css, --colibri-*). Los "profundos" son los
 * tonos del manual oscurecidos para que el texto pase contraste AA.
 */
.landing {
  --fondo: #f6f9f5;
  --tinta: var(--colibri-verde-noche);
  --tinta-suave: var(--colibri-verde-profundo);
  --linea: color-mix(in srgb, var(--colibri-verde) 28%, transparent);
  --rosa: var(--colibri-rosa-profundo);
  --rosa-hover: #8c4441;

  --serif: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
  --sans: 'Nunito Sans', var(--font);

  --ancho: 68rem;
  --gutter: 20px;

  /* Degradado de marca para botones, títulos y adornos */
  --degradado-rosa: linear-gradient(135deg, #b0544f 0%, var(--rosa) 55%, #8c4441 100%);
  --degradado-marca: linear-gradient(90deg, var(--colibri-rosa), var(--colibri-lima), var(--colibri-salvia));

  position: relative;
  min-height: 100vh;
  /* Al bajar la página el fondo pasa de menta a blanco, se tiñe de rosa
     a media altura y vuelve a menta al pie */
  background:
    linear-gradient(180deg,
      #eaf3e8 0%,
      var(--fondo) 18%,
      #fbf7f6 46%,
      #f8faf7 66%,
      #e8f1e6 100%);
  color: var(--tinta);
  font-family: var(--sans);
  font-size: 1.0625rem;
  line-height: 1.6;
  /* Cormorant trae números de estilo antiguo: el 1 parece una I y las
     direcciones se ven desparejas. Números de altura uniforme en todo. */
  font-variant-numeric: lining-nums;
  /* clip y no hidden: hidden convierte a .landing en contenedor de scroll
     propio y aparece una segunda barra cuando algo sobresale */
  overflow-x: clip;
}

.landing h2,
.landing h3 {
  color: inherit;
  font-family: var(--serif);
  font-weight: 600;
  letter-spacing: 0;
}

/* ---------------- Barra ---------------- */
.barra {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: var(--ancho);
  margin: 0 auto;
  padding: 16px var(--gutter);
}
/* En el teléfono el menú no cabe junto al botón: queda solo el acceso */
.menu { display: none; }
.menu a {
  color: var(--tinta-suave);
  font-weight: 600;
  font-size: 0.9375rem;
  text-decoration: none;
  padding: 6px 2px;
  border-bottom: 1.5px solid transparent;
}
.menu a:hover { color: var(--tinta); border-bottom-color: var(--colibri-rosa); }
.acceso {
  margin-left: auto;
  color: var(--tinta-suave);
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
  padding: 8px 16px;
  border: 1.5px solid var(--linea);
  border-radius: 999px;
  background: color-mix(in srgb, #fff 70%, transparent);
}
.acceso:hover { color: var(--tinta); border-color: var(--tinta-suave); }

/* ---------------- Botones ---------------- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 26px;
  border: 0;
  border-radius: 999px;
  font-family: var(--sans);
  font-weight: 700;
  font-size: 1rem;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color .15s, color .15s, box-shadow .15s, transform .15s;
}
/* El degradado mide el doble y al pasar el mouse se corre: así cambia de
   tono suave, sin el salto de un background que no se puede animar */
.btn-principal {
  background: var(--degradado-rosa);
  background-size: 200% 100%;
  background-position: 0% 0;
  color: #fff;
  box-shadow: 0 10px 24px -10px color-mix(in srgb, var(--rosa) 80%, transparent);
  transition: background-position .35s ease, box-shadow .15s, transform .15s;
}
.btn-principal:hover {
  background-position: 100% 0;
  transform: translateY(-1px);
  box-shadow: 0 14px 28px -10px color-mix(in srgb, var(--rosa) 85%, transparent);
}
.btn-secundario {
  background: linear-gradient(180deg, #fff, color-mix(in srgb, var(--colibri-menta) 22%, #fff));
  color: var(--tinta);
  box-shadow: inset 0 0 0 1.5px var(--tinta-suave);
}
.btn-secundario:hover {
  background: linear-gradient(135deg, var(--colibri-verde-profundo), var(--tinta));
  color: #fff;
}

.landing a:focus-visible,
.landing button:focus-visible {
  outline: 3px solid var(--colibri-rosa-fuerte);
  outline-offset: 3px;
}

/* ---------------- Portada ---------------- */
.portada {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: var(--ancho);
  margin: 0 auto;
  padding: 8px var(--gutter) 40px;
  text-align: center;
}

/* Acuarela: manchas difusas detrás del logo */
.acuarela {
  position: absolute;
  inset: -80px 0 0;
  z-index: 0;
  pointer-events: none;
}
.mancha {
  position: absolute;
  border-radius: 50%;
  filter: blur(48px);
  opacity: .55;
  animation: flotar-mancha 18s ease-in-out infinite alternate;
}
.mancha-menta {
  width: min(70vw, 560px); height: min(56vw, 440px);
  left: 50%; top: 40px;
  transform: translateX(-62%);
  background: var(--colibri-menta);
}
.mancha-rosa {
  width: min(48vw, 380px); height: min(40vw, 320px);
  left: 50%; top: 10px;
  background: color-mix(in srgb, var(--colibri-rosa) 60%, #fff);
  animation-delay: -6s;
}
.mancha-lima {
  width: min(38vw, 300px); height: min(30vw, 240px);
  left: 18%; top: 320px;
  background: color-mix(in srgb, var(--colibri-lima) 45%, #fff);
  opacity: .4;
  animation-delay: -12s;
}
@keyframes flotar-mancha {
  from { translate: 0 0; }
  to { translate: 24px 18px; }
}

.portada > :not(.acuarela) { position: relative; z-index: 1; }

/* width: 100% porque la portada centra en columna: sin él el h1 se encoge
   al ancho mínimo del SVG (que no trae ancho propio) */
.portada-marca { width: 100%; margin: 0; line-height: 0; }
.portada-logo {
  display: block;
  width: min(100%, 580px);
  height: auto;
  margin: 0 auto;
  overflow: visible;
  animation: aparecer 1s ease-out both;
}

/*
 * El colibrí del logo llega volando y se queda flotando. Sus piezas van
 * en <g class="logo-ave"> dentro del componente; :deep porque el estilo
 * es de esta vista. transform-box: view-box hace que todas giren y se
 * muevan desde el mismo punto (el cuerpo del ave), como una sola pieza.
 */
.portada-logo :deep(.logo-ave) {
  transform-box: view-box;
  transform-origin: 88px 40px;
  animation:
    llegar 1.6s cubic-bezier(.2, .8, .25, 1) .2s both,
    revolotear 3.2s ease-in-out 1.8s infinite;
}
@keyframes llegar {
  from { transform: translate(-70px, 34px) rotate(-14deg) scale(.7); opacity: 0; }
  35% { opacity: 1; }
  to { transform: none; opacity: 1; }
}
@keyframes revolotear {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-2.5px) rotate(-1.5deg); }
}
@keyframes aparecer {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

.portada-titular {
  margin-top: 18px;
  font-family: var(--serif);
  font-size: clamp(2rem, 7.5vw, 3.5rem);
  font-weight: 600;
  font-style: italic;
  line-height: 1.15;
  color: var(--tinta);
  /* Verde noche → verde → rosa: los tres tonos pasan AA sobre el fondo.
     Si el navegador no recorta el fondo al texto, queda el color plano. */
  background: linear-gradient(100deg, var(--tinta) 10%, var(--colibri-verde-profundo) 50%, var(--rosa) 92%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  /* Sin este relleno, la cola de las cursivas queda fuera del recorte */
  padding: 0 .08em .06em;
  text-wrap: balance;
}
.bajada {
  margin-top: 14px;
  max-width: 34rem;
  font-size: 1.125rem;
  color: var(--tinta-suave);
  text-wrap: pretty;
}
.acciones {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 26px;
}
/* Teléfono: los dos botones en una fila, más compactos */
@media (max-width: 719px) {
  .acciones { gap: 8px; }
  .pedir-caja .btn { padding: 0 18px; font-size: 0.9375rem; }
  .acciones .btn { min-height: 48px; padding: 0 15px; font-size: 0.9375rem; gap: 7px; }
}

/* ---------------- Separador ---------------- */
.separador {
  display: flex;
  justify-content: center;
  padding: 8px var(--gutter);
}
.separador img {
  display: block;
  width: min(64vw, 300px);
  height: auto;
  opacity: .9;
}
.separador-espejo img { transform: scaleX(-1); }

/* ---------------- Secciones ---------------- */
.seccion {
  max-width: var(--ancho);
  margin: 0 auto;
  padding: 48px var(--gutter);
}
h2 {
  font-size: clamp(2.25rem, 7vw, 3.25rem);
  line-height: 1;
  text-align: center;
  margin-bottom: 12px;
  --trazo: 1;
}
/* Trazo bajo cada título con los tres colores de la marca */
h2::after {
  content: '';
  display: block;
  width: 72px;
  height: 3px;
  margin: 14px auto 0;
  border-radius: 3px;
  background: var(--degradado-marca);
  /* GSAP lleva --trazo de 0 a 1 para dibujar la línea desde el centro */
  transform: scaleX(var(--trazo));
}
h3 {
  font-size: 1.5rem;
  line-height: 1.15;
}
.seccion-bajada {
  max-width: 34rem;
  margin: 0 auto 28px;
  text-align: center;
  color: var(--tinta-suave);
}

/* Servicios: tarjetas blancas con un ícono en un círculo menta */
.tarjetas {
  list-style: none;
  display: grid;
  gap: 16px;
  margin-top: 28px;
}
/*
 * Tarjetas con un degradado que baja de blanco a un tinte (menta en las
 * impares, rosa en las pares). El borde también es degradado: dos fondos,
 * uno recortado al relleno y otro al borde transparente.
 */
.servicio {
  --tinte: color-mix(in srgb, var(--colibri-menta) 30%, #fff);
  --borde: linear-gradient(160deg, color-mix(in srgb, var(--colibri-salvia) 70%, transparent), transparent 60%);
  padding: 26px 24px;
  background:
    linear-gradient(170deg, #fff 45%, var(--tinte)) padding-box,
    var(--borde) border-box;
  border: 1px solid transparent;
  border-radius: 24px;
  box-shadow: 0 10px 30px -18px color-mix(in srgb, var(--tinta) 40%, transparent);
  transition: transform .2s ease, box-shadow .2s ease;
}
.servicio:nth-child(even) {
  --tinte: color-mix(in srgb, var(--colibri-rosa) 18%, #fff);
  --borde: linear-gradient(160deg, color-mix(in srgb, var(--colibri-rosa) 80%, transparent), transparent 60%);
}
.servicio:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 36px -20px color-mix(in srgb, var(--tinta) 55%, transparent);
}
.servicio-icono {
  display: inline-grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin-bottom: 14px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 25%, #fff 0%, color-mix(in srgb, var(--colibri-menta) 85%, #fff) 70%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--colibri-salvia) 45%, transparent);
  color: var(--tinta-suave);
}
.servicio:nth-child(even) .servicio-icono {
  background: radial-gradient(circle at 30% 25%, #fff 0%, color-mix(in srgb, var(--colibri-rosa) 55%, #fff) 70%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--colibri-rosa) 50%, transparent);
  color: var(--rosa);
}
.servicio p { margin-top: 8px; color: var(--tinta-suave); }

/* Catálogo: dos columnas en el teléfono, cuatro en escritorio */
.catalogo-grilla {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.producto {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 10px 14px;
  background: linear-gradient(180deg, #fff 60%, color-mix(in srgb, var(--colibri-menta) 22%, #fff));
  border: 1px solid var(--linea);
  border-radius: 20px;
  color: inherit;
  text-decoration: none;
  transition: transform .2s ease, box-shadow .2s ease;
}
.producto:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 30px -18px color-mix(in srgb, var(--tinta) 50%, transparent);
}
.producto-foto {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 14px;
  background: color-mix(in srgb, var(--colibri-menta) 50%, #fff);
  margin-bottom: 8px;
}
.producto-nombre { font-weight: 700; line-height: 1.3; }
.producto-precio { color: var(--rosa); font-weight: 700; }
.catalogo-mas { display: flex; margin: 28px auto 0; }

/* Galería: dos columnas en el teléfono, cuatro en escritorio */
.galeria-grilla {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.galeria-foto {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: 16px;
  overflow: hidden;
  background: color-mix(in srgb, var(--colibri-menta) 50%, #fff);
  cursor: zoom-in;
}
.galeria-foto img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  transition: transform .3s ease;
}
.galeria-foto:hover img { transform: scale(1.04); }
.galeria-mas { display: flex; margin: 28px auto 0; }
.galeria-subtitulo { text-align: center; margin: 48px 0 20px; font-size: 2rem; }
.reel-portada { position: relative; }
.reel-portada img { aspect-ratio: 9 / 16; }
.reel-play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #fff;
  pointer-events: none;
}
.reel-play svg {
  box-sizing: content-box;
  padding: 12px;
  border-radius: 50%;
  background: rgba(16, 26, 21, .55);
}

/* Visor a pantalla completa. Tocar el fondo lo cierra. */
.visor {
  width: 100vw;
  height: 100dvh;
  max-width: none;
  max-height: none;
  padding: 16px;
  border: 0;
  background: rgba(16, 26, 21, .94);
}
.visor[open] {
  display: grid;
  place-items: center;
}
.visor::backdrop { background: transparent; }
.visor > img {
  max-width: 100%;
  max-height: calc(100dvh - 32px);
  border-radius: 10px;
}
.visor-reel {
  width: min(100%, 420px);
  height: min(calc(100dvh - 32px), 760px);
  border: 0;
  border-radius: 10px;
  background: #fff;
}
.visor-btn {
  position: fixed;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, .9);
  color: var(--tinta);
  cursor: pointer;
}
.visor-cerrar { top: 14px; right: 14px; }
.visor-anterior { left: 14px; top: 50%; translate: 0 -50%; }
.visor-siguiente { right: 14px; top: 50%; translate: 0 -50%; }

/* Cómo pedir: una caja suave en menta, con números rosados en círculo */
/* Varias capas: luz blanca arriba al centro, rosa en una esquina, lima en
   la otra, y debajo un degradado menta → salvia claro */
.pedir-caja {
  padding: 40px 14px;
  border-radius: 32px;
  background:
    radial-gradient(60% 50% at 50% 0%, rgba(255, 255, 255, .7), transparent 70%),
    /* Rosa claro casi opaco: translúcido sobre el verde se volvía beige */
    radial-gradient(60% 65% at 100% 0%, rgba(248, 226, 225, .92), rgba(248, 226, 225, 0) 70%),
    radial-gradient(60% 60% at 0% 100%, color-mix(in srgb, var(--colibri-lima) 26%, transparent), transparent 65%),
    linear-gradient(160deg, color-mix(in srgb, var(--colibri-menta) 50%, #fff), color-mix(in srgb, var(--colibri-salvia) 42%, #fff));
  box-shadow: 0 24px 50px -30px color-mix(in srgb, var(--tinta) 55%, transparent);
  text-align: center;
}
.pasos {
  list-style: none;
  counter-reset: paso;
  display: grid;
  gap: 26px;
  margin: 28px 0 32px;
}
.pasos li { counter-increment: paso; }
.pasos li::before {
  content: counter(paso);
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  margin: 0 auto 12px;
  border-radius: 50%;
  /* Anillo degradado en rosas (con lima en medio salía un tono dorado) */
  background:
    radial-gradient(circle at 35% 30%, #fff, color-mix(in srgb, var(--colibri-rosa) 14%, #fff)) padding-box,
    linear-gradient(135deg, var(--colibri-rosa-fuerte), var(--colibri-rosa) 60%, #f1d6d5) border-box;
  border: 2px solid transparent;
  box-shadow: 0 8px 18px -10px color-mix(in srgb, var(--rosa) 70%, transparent);
  color: var(--rosa);
  font-family: var(--serif);
  font-size: 1.75rem;
  font-weight: 700;
  font-variant-numeric: lining-nums;
}
.pasos p { margin: 6px auto 0; max-width: 18rem; color: var(--tinta-suave); }

/* Visítanos */
.visita-grilla {
  display: grid;
  gap: 20px;
  margin-top: 28px;
}
.visita-direccion,
.horario-caja {
  padding: 28px 24px;
  background:
    linear-gradient(165deg, #fff 50%, color-mix(in srgb, var(--colibri-menta) 26%, #fff)) padding-box,
    linear-gradient(160deg, color-mix(in srgb, var(--colibri-salvia) 60%, transparent), transparent 55%) border-box;
  border: 1px solid transparent;
  border-radius: 24px;
  box-shadow: 0 10px 30px -18px color-mix(in srgb, var(--tinta) 40%, transparent);
}
.horario-caja {
  background:
    linear-gradient(165deg, #fff 50%, color-mix(in srgb, var(--colibri-rosa) 16%, #fff)) padding-box,
    linear-gradient(160deg, color-mix(in srgb, var(--colibri-rosa) 70%, transparent), transparent 55%) border-box;
}
.visita-icono { color: var(--rosa); }
.direccion {
  margin: 10px 0 20px;
  font-family: var(--serif);
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1.2;
}
.horario-titulo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.horario-titulo svg { color: var(--rosa); }
.horario {
  border-collapse: collapse;
  width: 100%;
}
.horario th,
.horario td {
  padding: 12px 0;
  border-top: 1px solid var(--linea);
  text-align: left;
  font-weight: 400;
}
.horario tr:first-child th,
.horario tr:first-child td { border-top: 0; }
.horario td { text-align: right; font-variant-numeric: lining-nums tabular-nums; font-weight: 600; }

/* Pie */
.pie {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: var(--ancho);
  margin: 24px auto 0;
  padding: 36px var(--gutter) 44px;
  /* Línea superior que se desvanece en las puntas */
  border-top: 1px solid transparent;
  border-image: linear-gradient(90deg, transparent, var(--colibri-salvia) 25%, var(--colibri-rosa) 75%, transparent) 1;
  color: var(--tinta-suave);
  font-size: 0.9375rem;
}
.pie-logo { width: 150px; height: auto; }
.pie-enlaces {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 24px;
}
.pie a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: inherit;
  text-decoration: none;
}
.pie a:hover { color: var(--tinta); text-decoration: underline; }

/* ---------------- Tablet y escritorio ---------------- */
@media (min-width: 720px) {
  .menu { display: flex; gap: 24px; }
  .acceso { margin-left: 0; }
  .portada { padding-top: 40px; padding-bottom: 64px; }
  .tarjetas { grid-template-columns: repeat(2, 1fr); gap: 20px; }
  .catalogo-grilla { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; }
  .galeria-grilla { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
  .pedir-caja { padding: 56px 48px; }
  .pasos { grid-template-columns: repeat(3, 1fr); gap: 32px; }
  .visita-grilla { grid-template-columns: 1.1fr 1fr; }
  .pie { flex-direction: row; justify-content: space-between; }
}

@media (min-width: 1080px) {
  .tarjetas { grid-template-columns: repeat(4, 1fr); }
  .seccion { padding-top: 64px; padding-bottom: 64px; }
}

@media (prefers-reduced-motion: reduce) {
  .mancha,
  .portada-logo,
  .portada-logo :deep(.logo-ave) { animation: none; }
  .btn,
  .btn-principal,
  .servicio,
  .producto,
  .galeria-foto img { transition: none; }
}
</style>
