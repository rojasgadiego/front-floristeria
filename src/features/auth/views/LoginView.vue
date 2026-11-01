<template>
  <div class="login-container">
    <div class="login-card" :class="{ 'card-exito': estado === 'exito', 'card-sacudida': sacudiendo }">
      <!-- Barrido de confirmación -->
      <span class="card-barrido" aria-hidden="true"></span>

      <!-- Logo de la marca. El colibrí llega volando al cargar y se va
           volando al ingresar (clases en el SVG, ver .logo-ave abajo) -->
      <h1 class="brand">
        <LogoColibri class="brand-logo" :class="{ 'logo-exito': estado === 'exito' }"
          etiqueta="Colibrí, floristería y decoración" />
      </h1>
      <p class="brand-bajada">Acceso del equipo</p>

      <form @submit.prevent="handleSubmit" class="login-form">

        <!-- Alerta de error -->
        <div v-if="loginError" class="alert-error" role="alert">
          <p>{{ loginError }}</p>
        </div>

        <!-- Campo de email -->
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" ref="campoEmail" v-model="formData.email"
            :class="{ 'input-error': errors.email }" :disabled="ocupado" required autocomplete="email"
            inputmode="email" autocapitalize="off" autocorrect="off"
            :aria-invalid="!!errors.email" :aria-describedby="errors.email ? 'err-email' : undefined" />
          <p v-if="errors.email" id="err-email" class="error-message">{{ errors.email }}</p>
        </div>

        <!-- Campo de contraseña -->
        <div class="form-group">
          <label for="password">Contraseña</label>
          <div class="password-input">
            <input :type="showPassword ? 'text' : 'password'" id="password" v-model="formData.password"
              :class="{ 'input-error': errors.password }" :disabled="ocupado" required
              autocomplete="current-password" :aria-invalid="!!errors.password"
              :aria-describedby="errors.password ? 'err-password' : undefined"
              @keyup="revisarMayus" @keydown="revisarMayus" />
            <button type="button" class="toggle-password" :disabled="ocupado"
              :aria-pressed="showPassword" @click="showPassword = !showPassword">
              {{ showPassword ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>
          <p v-if="errors.password" id="err-password" class="error-message">{{ errors.password }}</p>
          <!-- La causa más común de "contraseña incorrecta" que no lo es -->
          <p v-else-if="mayusActiva" class="aviso-mayus">Bloq Mayús está activado.</p>
        </div>

        <!-- Recordar sesión -->
        <div class="form-check">
          <input type="checkbox" id="remember" v-model="formData.remember" :disabled="ocupado" />
          <label for="remember">Recordar sesión</label>
        </div>

        <!-- Botón de envío -->
        <div class="login-button-wrap">
          <button type="submit" class="login-button"
            :class="{ compacto: ocupado, cargando: estado === 'cargando', exito: estado === 'exito' }"
            :disabled="ocupado">
            <span class="btn-label">Ingresar al Sistema</span>
            <span class="btn-spinner" aria-hidden="true"></span>
            <svg class="btn-check" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12.5 L10 17.5 L19 7" />
            </svg>
          </button>
        </div>

        <!-- Estado para lectores de pantalla -->
        <p class="sr-only" aria-live="polite">{{ mensajeEstado }}</p>

      </form>

      <!-- Enlaces adicionales -->
      <div class="additional-links">
        <router-link to="/">Volver al sitio</router-link>
      </div>

    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import { useRouter, useRoute } from 'vue-router'
import LogoColibri from '@/shared/components/LogoColibri.vue'

/*
 * Tiempos de la coreografía de ingreso.
 * cargaMinima evita que el botón parpadee cuando el backend responde
 * más rápido de lo que dura la propia animación de contracción.
 *
 * Los valores son más cortos que antes: sumados daban casi dos segundos
 * entre tocar el botón y ver el dashboard, y en un local se entra al
 * sistema al empezar el turno y cada vez que alguien cambia de caja.
 */
const DURACION = {
  cargaMinima: 450,
  check: 360,
  exito: 320,
  salida: 100,
  sacudida: 460
}

export default {
  name: 'LoginView',

  components: { LogoColibri },

  setup () {
    const store = useStore()
    const router = useRouter()
    const route = useRoute()

    const formData = reactive({
      email: '',
      password: '',
      remember: false
    })

    const errors = reactive({
      email: '',
      password: ''
    })

    /* 'inactivo' | 'cargando' | 'exito' */
    const estado = ref('inactivo')
    const sacudiendo = ref(false)
    const showPassword = ref(false)
    const mayusActiva = ref(false)
    const campoEmail = ref(null)

    const loginError = computed(() => store.getters['auth/loginError'])
    const ocupado = computed(() => estado.value !== 'inactivo')

    const mensajeEstado = computed(() => {
      if (estado.value === 'cargando') return 'Iniciando sesión'
      if (estado.value === 'exito') return 'Sesión iniciada'
      return ''
    })

    /*
     * Si el sistema pide menos movimiento, las esperas se reducen a cero:
     * el flujo sigue siendo el mismo pero sin tiempos muertos decorativos.
     * Se consulta al usarse, no una vez al montar: la preferencia del
     * sistema puede cambiar con la pantalla ya abierta.
     */
    const mqlMovimiento = typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null

    /*
     * Los timers quedan registrados para poder cancelarlos al desmontar.
     * Si se cancela un timer su promesa nunca resuelve, así que la cadena
     * async se detiene sola y no escribe estado sobre un componente muerto.
     */
    const temporizadores = new Set()

    const espera = (ms) => new Promise((resolve) => {
      const duracion = mqlMovimiento?.matches ? 0 : ms
      const id = setTimeout(() => {
        temporizadores.delete(id)
        resolve()
      }, duracion)
      temporizadores.add(id)
    })

    /* La causa más común de un "usuario o contraseña incorrectos" que en
       realidad no lo es. */
    const revisarMayus = (e) => {
      if (typeof e.getModifierState !== 'function') return
      mayusActiva.value = e.getModifierState('CapsLock')
    }

    /*
     * El error se borra al escribir. Antes quedaba en pantalla hasta el
     * envío siguiente: se corregía el email y el mensaje seguía diciendo que
     * estaba malo.
     */
    watch(() => formData.email, () => {
      errors.email = ''
      if (loginError.value) store.commit('auth/SET_LOGIN_ERROR', null)
    })

    watch(() => formData.password, () => {
      errors.password = ''
      if (loginError.value) store.commit('auth/SET_LOGIN_ERROR', null)
    })

    onMounted(async () => {
      /* Un error que quedó de un intento anterior no corresponde a esta
         visita a la pantalla. */
      if (loginError.value) store.commit('auth/SET_LOGIN_ERROR', null)
      await nextTick()
      campoEmail.value?.focus()
    })

    onUnmounted(() => {
      temporizadores.forEach(clearTimeout)
      temporizadores.clear()
      store.commit('auth/SET_LOGIN_ERROR', null)
    })

    const validateForm = () => {
      let isValid = true

      errors.email = ''
      errors.password = ''

      if (!formData.email) {
        errors.email = 'El email es obligatorio'
        isValid = false
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Debe ser un email válido'
        isValid = false
      }

      if (!formData.password) {
        errors.password = 'La contraseña es obligatoria'
        isValid = false
      } else if (formData.password.length < 6) {
        errors.password = 'Debe tener al menos 6 caracteres'
        isValid = false
      }

      return isValid
    }

    const sacudir = async () => {
      sacudiendo.value = false
      await espera(0)
      sacudiendo.value = true
      await espera(DURACION.sacudida)
      sacudiendo.value = false
    }

    const handleSubmit = async () => {
      if (ocupado.value) return

      if (!validateForm()) {
        await sacudir()
        return
      }

      store.commit('auth/SET_LOGIN_ERROR', null)
      estado.value = 'cargando'

      try {
        const [success] = await Promise.all([
          store.dispatch('auth/login', {
            email: formData.email,
            password: formData.password
          }),
          espera(DURACION.cargaMinima)
        ])

        if (!success) {
          estado.value = 'inactivo'
          await sacudir()
          return
        }

        estado.value = 'exito'
        await espera(DURACION.check + DURACION.exito)

        const redirectPath = route.query.redirect || '/dashboard'
        await espera(DURACION.salida)
        router.push(redirectPath)
      } catch (error) {
        console.error('Error en login:', error)
        estado.value = 'inactivo'
        await sacudir()
      }
    }

    return {
      formData,
      errors,
      estado,
      ocupado,
      sacudiendo,
      mensajeEstado,
      showPassword,
      mayusActiva,
      revisarMayus,
      campoEmail,
      loginError,
      handleSubmit
    }
  }
}
</script>

<style scoped>
/*
 * Sin esta línea, width:100% + padding + borde se suman y los campos
 * se desbordan de la tarjeta en pantallas angostas.
 */
.login-container,
.login-container *,
.login-container *::before,
.login-container *::after {
  box-sizing: border-box;
}

.login-container {
  /*
   * Fondo de acuarela como el de la landing: manchas menta, rosa y lima
   * sobre --bg (tokens --acuarela-*, que en oscuro van más tenues).
   */
  --mancha-menta: var(--acuarela-menta);
  --mancha-rosa: var(--acuarela-rosa);
  --mancha-lima: var(--acuarela-lima);

  display: flex;
  justify-content: center;
  align-items: center;

  min-height: 100vh;
  min-height: 100dvh;

  padding:
    max(1.5rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1.5rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));

  background-color: var(--bg);
  background-image:
    radial-gradient(42% 38% at 22% 18%, var(--mancha-menta), transparent 70%),
    radial-gradient(36% 34% at 82% 22%, var(--mancha-rosa), transparent 70%),
    radial-gradient(40% 36% at 70% 88%, var(--mancha-menta), transparent 70%),
    radial-gradient(30% 28% at 15% 85%, var(--mancha-lima), transparent 70%);
  overflow-y: auto;

  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

.login-card {
  position: relative;
  width: 100%;
  max-width: 28rem;
  margin: auto;

  padding: clamp(1.25rem, 5vw, 2rem);
  background-color: var(--surface);
  color: var(--text);
  /* El borde importa en tema oscuro: sin él, tarjeta oscura sobre plano
     oscuro no tiene dónde terminar. */
  border: 1px solid var(--border);
  border-radius: var(--r-lg, clamp(0.75rem, 3vw, 1rem));
  box-shadow: var(--shadow-lg, 0 25px 50px -12px rgba(0, 0, 0, 0.45));
  text-align: center;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

/* ---------- Barrido de confirmación ---------- */
/*
 * clip-path anima de abajo hacia arriba sin tocar el layout,
 * así que no fuerza reflow del formulario.
 * Va en el color de éxito, no en el de marca: dice "correcto", no "Colibrí".
 */
.card-barrido {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-color: var(--success);
  opacity: 0;
  pointer-events: none;
  clip-path: inset(100% 0 0 0);
  z-index: 2;
}

.card-exito .card-barrido {
  animation: barrido 700ms ease-out;
}

@keyframes barrido {
  0% { opacity: 0; clip-path: inset(100% 0 0 0); }
  45% { opacity: 0.22; clip-path: inset(0 0 0 0); }
  100% { opacity: 0; clip-path: inset(0 0 0 0); }
}

/* ---------- Rebote y sacudida de la tarjeta ---------- */
.card-exito {
  animation: rebote 620ms cubic-bezier(0.34, 1.4, 0.64, 1);
}

@keyframes rebote {
  0%, 100% { transform: scale(1); }
  40% { transform: scale(1.028); }
}

.card-sacudida {
  animation: sacudida 460ms ease-in-out;
}

@keyframes sacudida {
  0%, 100% { transform: translateX(0); }
  18% { transform: translateX(-9px); }
  38% { transform: translateX(8px); }
  58% { transform: translateX(-5px); }
  78% { transform: translateX(3px); }
}

/* ---------- Logo ---------- */
.brand { margin: 0; line-height: 0; }

/* El SVG no trae ancho propio: sin width el h1 lo encoge al mínimo */
.brand-logo {
  display: block;
  width: min(100%, 17rem);
  height: auto;
  margin: 0 auto;
  overflow: visible;
}

/*
 * El colibrí del logo (piezas en <g class="logo-ave">, ver LogoColibri.vue).
 * transform-box: view-box hace que las 70 piezas se muevan desde el mismo
 * punto, como una sola. Llega volando al cargar y revolotea; al ingresar
 * se va volando hacia arriba a la derecha mientras se arma la salida.
 */
.brand-logo :deep(.logo-ave) {
  transform-box: view-box;
  transform-origin: 88px 40px;
  animation:
    llegar 1.3s cubic-bezier(.2, .8, .25, 1) .15s both,
    revolotear 3.2s ease-in-out 1.45s infinite;
}

.brand-logo.logo-exito :deep(.logo-ave) {
  animation: irse 700ms cubic-bezier(.5, 0, .75, .4) forwards;
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

@keyframes irse {
  from { transform: none; opacity: 1; }
  to { transform: translate(150px, -70px) rotate(12deg) scale(.6); opacity: 0; }
}

.brand-bajada {
  margin-top: 6px;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-style: italic;
  font-weight: 600;
  color: var(--text-muted);
}

/* ---------- Formulario ---------- */
.login-form {
  display: flex;
  flex-direction: column;
  gap: clamp(0.8rem, 3.5vw, 1rem);
  margin-top: clamp(1rem, 4vw, 1.4rem);
}

.form-group {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

label {
  margin-bottom: 0.35rem;
  text-align: left;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

input[type="email"],
input[type="password"],
input[type="text"] {
  width: 100%;
  min-width: 0;
  min-height: 48px;
  padding: 0.75rem;

  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm, 0.5rem);

  /* Nunca bajar de 16px: si no, iOS hace zoom solo al enfocar el campo */
  font-size: max(1rem, 16px);
  font-family: inherit;
  color: var(--text);
  background-color: var(--surface);
  outline: none;
  transition: box-shadow 0.2s, border-color 0.2s, opacity 0.25s;
}

input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

input:disabled {
  opacity: 0.6;
}

.input-error {
  border-color: var(--danger);
}

.input-error:focus {
  border-color: var(--danger);
  box-shadow: 0 0 0 3px var(--danger-soft);
}

/* ---------- Mostrar / ocultar contraseña ---------- */
.password-input {
  position: relative;
  display: flex;
}

.password-input input {
  flex: 1;
  padding-right: 6rem;
}

.toggle-password {
  position: absolute;
  right: 1px;
  top: 1px;
  bottom: 1px;
  /* Ancho fijo: "Mostrar" y "Ocultar" no miden lo mismo y el borde del
     botón saltaba al alternar. */
  width: 5.5rem;
  padding: 0;
  border: none;
  border-left: 1px solid var(--border-strong);
  border-radius: 0 var(--r-sm, 0.5rem) var(--r-sm, 0.5rem) 0;
  background: transparent;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, opacity 0.25s;
  -webkit-tap-highlight-color: transparent;
}

.toggle-password:hover:not(:disabled) {
  background-color: var(--accent-soft);
  color: var(--accent-text);
}

.toggle-password:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-password:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

/* ---------- Recordar sesión ---------- */
.form-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
}

.form-check input[type="checkbox"] {
  width: 18px;
  height: 18px;
  min-height: 0;
  flex-shrink: 0;
  margin: 0;
  accent-color: var(--accent);
  cursor: pointer;
}

.form-check label {
  margin-bottom: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
}

/* ---------- Mensajes ---------- */
.error-message,
.aviso-mayus {
  margin: 0.4rem 0 0;
  text-align: left;
  font-size: 0.8rem;
  line-height: 1.45;
}

.error-message { color: var(--danger); }

.aviso-mayus { color: var(--warn); }

.alert-error {
  padding: 0.75rem 0.9rem;
  border-radius: var(--r-sm, 0.5rem);
  border-left: 4px solid var(--danger);
  background-color: var(--danger-soft);
  color: var(--danger);
  text-align: left;
  font-size: 0.9rem;
  line-height: 1.5;
  overflow-wrap: break-word;
  animation: entra-alerta 320ms cubic-bezier(0.34, 1.3, 0.64, 1);
}

.alert-error p {
  margin: 0;
}

@keyframes entra-alerta {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---------- Botón ---------- */
/*
 * El wrap centra el botón mientras su ancho se contrae hasta 48px.
 * Sin él, la contracción se vería anclada al borde izquierdo.
 */
.login-button-wrap {
  display: flex;
  justify-content: center;
  margin-top: 0.2rem;
}

.login-button {
  position: relative;
  width: 100%;
  min-height: 48px;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: var(--r-sm, 0.5rem);
  background-color: var(--accent);
  color: var(--accent-contrast);
  font-size: max(0.95rem, 15px);
  font-family: inherit;
  font-weight: 700;
  cursor: pointer;
  overflow: hidden;
  box-shadow: var(--shadow-sm, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
  transition:
    width 0.45s cubic-bezier(0.65, 0, 0.35, 1),
    border-radius 0.45s cubic-bezier(0.65, 0, 0.35, 1),
    background-color 0.3s;
  -webkit-tap-highlight-color: transparent;
}

.login-button:hover:not(:disabled) {
  background-color: var(--accent-hover);
}

.login-button:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}

/* El atenuado de deshabilitado solo aplica cuando NO está en la coreografía */
.login-button:disabled:not(.compacto) {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.login-button.compacto {
  width: 48px;
  padding: 0;
  border-radius: 24px;
  cursor: default;
  box-shadow: none;
}

/* Al confirmar, el botón pasa al color de éxito: es el mismo mensaje que
   el barrido de la tarjeta y el check. */
.login-button.exito {
  background-color: var(--success);
}

.btn-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  transition: opacity 0.18s;
}

.login-button.compacto .btn-label {
  opacity: 0;
}

.btn-spinner {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 20px;
  height: 20px;
  border: 2px solid color-mix(in srgb, var(--accent-contrast) 35%, transparent);
  border-top-color: var(--accent-contrast);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.15s;
  animation: spin 0.8s linear infinite;
}

.login-button.cargando .btn-spinner {
  opacity: 1;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* El check se dibuja con stroke-dashoffset en vez de aparecer de golpe */
.btn-check {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 22px;
  height: 22px;
  opacity: 0;
}

.btn-check path {
  fill: none;
  stroke: var(--accent-contrast);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 26;
  stroke-dashoffset: 26;
}

.login-button.exito .btn-check {
  opacity: 1;
}

.login-button.exito .btn-check path {
  animation: dibuja-check 380ms 40ms cubic-bezier(0.65, 0, 0.35, 1) forwards;
}

@keyframes dibuja-check {
  to { stroke-dashoffset: 0; }
}

/* ---------- Enlaces ---------- */
.additional-links {
  margin-top: clamp(1rem, 4vw, 1.5rem);
  text-align: center;
  font-size: 0.9rem;
}

.additional-links a {
  display: inline-block;
  padding: 0.5rem 0.7rem;
  color: var(--accent-text);
  font-weight: 600;
  text-decoration: none;
  border-radius: var(--r-sm, 0.5rem);
  transition: color 0.2s, background-color 0.2s;
}

.additional-links a:hover {
  background-color: var(--accent-soft);
  text-decoration: underline;
}

.additional-links a:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ---------- Ajustes por pantalla ---------- */

/* Teléfono acostado o pantalla muy baja: comprime lo vertical */
@media (max-height: 700px) {
  .login-container {
    align-items: flex-start;
  }

  .brand-logo { width: min(100%, 12rem); }
  .brand-bajada { margin-top: 2px; font-size: 1.1rem; }

  .login-form {
    gap: 0.7rem;
    margin-top: 0.9rem;
  }
}

@media (min-width: 1024px) {
  .login-card {
    max-width: 30rem;
    padding: 2.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {

  .btn-spinner,
  .card-exito,
  .card-sacudida,
  .brand-logo :deep(.logo-ave),
  .brand-logo.logo-exito :deep(.logo-ave),
  .card-exito .card-barrido,
  .alert-error,
  .login-button.exito .btn-check path {
    animation: none;
  }

  .btn-check path {
    stroke-dashoffset: 0;
  }

  .login-button,
  .btn-label,
  .toggle-password,
  .additional-links a,
  input {
    transition: none;
  }
}
</style>