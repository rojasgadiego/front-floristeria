<template>
  <div class="landing">
    <header class="barra">
      <nav class="menu" aria-label="Secciones">
        <a v-if="catalogo.length" href="#catalogo">Catálogo</a>
        <a href="#pedir">Cómo pedir</a>
        <a href="#visitanos">Visítanos</a>
      </nav>

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
          Ramos, arreglos y flores por tallo en {{ c.comuna }}.
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
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { Clock, Flower2, Heart, Instagram, MapPin, MessageCircle, PartyPopper, Sprout } from 'lucide-vue-next'
import { CONTACTO as c } from '../contacto'
import LogoColibri from '../components/LogoColibri.vue'
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

onMounted(cargarCatalogo)
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

  position: relative;
  min-height: 100vh;
  background: var(--fondo);
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
.btn-principal {
  background: var(--rosa);
  color: #fff;
  box-shadow: 0 8px 20px -8px color-mix(in srgb, var(--rosa) 70%, transparent);
}
.btn-principal:hover { background: var(--rosa-hover); transform: translateY(-1px); }
.btn-secundario {
  background: #fff;
  color: var(--tinta);
  box-shadow: inset 0 0 0 1.5px var(--tinta-suave);
}
.btn-secundario:hover { background: var(--tinta); color: #fff; }

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
  line-height: 1.05;
  color: var(--tinta);
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
.servicio {
  padding: 26px 24px;
  background: #fff;
  border: 1px solid var(--linea);
  border-radius: 24px;
  box-shadow: 0 10px 30px -18px color-mix(in srgb, var(--tinta) 40%, transparent);
}
.servicio-icono {
  display: inline-grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin-bottom: 14px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--colibri-menta) 70%, #fff);
  color: var(--tinta-suave);
}
.servicio:nth-child(even) .servicio-icono {
  background: color-mix(in srgb, var(--colibri-rosa) 35%, #fff);
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
  background: #fff;
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

/* Cómo pedir: una caja suave en menta, con números rosados en círculo */
.pedir-caja {
  padding: 40px 14px;
  border-radius: 32px;
  background:
    radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, var(--colibri-rosa) 22%, transparent), transparent 60%),
    color-mix(in srgb, var(--colibri-menta) 55%, #fff);
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
  background: #fff;
  border: 1.5px solid var(--colibri-rosa);
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
  background: #fff;
  border: 1px solid var(--linea);
  border-radius: 24px;
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
  border-top: 1px solid var(--linea);
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
  .producto { transition: none; }
}
</style>
