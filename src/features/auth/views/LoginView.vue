<template>
  <div class="login-container">
    <div
      class="login-card"
      :class="{ 'card-exito': estado === 'exito', 'card-sacudida': sacudiendo }"
    >
      <!-- Barrido verde de confirmación -->
      <span class="card-barrido" aria-hidden="true"></span>

      <!-- Logo: colibrí dentro del círculo -->
      <div class="brand-icon" :class="{ 'icon-exito': estado === 'exito' }">
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <path
            d="M44 15 C50 15 53 19 52 23 C50 32 40 40 26 43 L8 47 L15 37 C22 29 30 17 44 15 Z"
            fill="currentColor"
          />
          <path
            class="ala"
            d="M30 27 C36 18 46 14 55 16 C50 25 41 31 32 32 Z"
            fill="currentColor"
            opacity="0.55"
          />
          <circle cx="46" cy="21" r="1.7" fill="#ffffff" />
        </svg>
      </div>

      <h1 class="brand-name">Floristería Colibrí</h1>

      <form @submit.prevent="handleSubmit" class="login-form">

        <!-- Alerta de error -->
        <div v-if="loginError" class="alert-error" role="alert">
          <p>{{ loginError }}</p>
        </div>

        <!-- Campo de email -->
        <div class="form-group">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            v-model="formData.email"
            :class="{ 'input-error': errors.email }"
            :disabled="ocupado"
            required
            autocomplete="email"
            inputmode="email"
          />
          <div v-if="errors.email" class="error-message">
            <p>{{ errors.email }}</p>
          </div>
        </div>

        <!-- Campo de contraseña -->
        <div class="form-group">
          <label for="password">Contraseña</label>
          <div class="password-input">
            <input
              :type="showPassword ? 'text' : 'password'"
              id="password"
              v-model="formData.password"
              :class="{ 'input-error': errors.password }"
              :disabled="ocupado"
              required
              autocomplete="current-password"
            />
            <button
              type="button"
              class="toggle-password"
              :disabled="ocupado"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>
          <div v-if="errors.password" class="error-message">
            <p>{{ errors.password }}</p>
          </div>
        </div>

        <!-- Recordar sesión -->
        <div class="form-check">
          <input
            type="checkbox"
            id="remember"
            v-model="formData.remember"
            :disabled="ocupado"
          />
          <label for="remember">Recordar sesión</label>
        </div>

        <!-- Botón de envío -->
        <div class="login-button-wrap">
          <button
            type="submit"
            class="login-button"
            :class="{ compacto: ocupado, cargando: estado === 'cargando', exito: estado === 'exito' }"
            :disabled="ocupado"
          >
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
        <router-link to="/">Registrarse</router-link>
      </div>

    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter, useRoute } from 'vue-router'

/*
 * Tiempos de la coreografía de ingreso.
 * cargaMinima evita que el botón parpadee cuando el backend responde
 * más rápido de lo que dura la propia animación de contracción.
 */
const DURACION = {
  cargaMinima: 700,
  check: 420,
  exito: 680,
  salida: 120,
  sacudida: 480
}

export default {
  name: 'LoginView',

  setup() {
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
     */
    const sinMovimiento =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /*
     * Los timers quedan registrados para poder cancelarlos al desmontar.
     * Si se cancela un timer su promesa nunca resuelve, así que la cadena
     * async se detiene sola y no escribe estado sobre un componente muerto.
     */
    const temporizadores = new Set()

    const espera = (ms) => new Promise((resolve) => {
      const duracion = sinMovimiento ? 0 : ms
      const id = setTimeout(() => {
        temporizadores.delete(id)
        resolve()
      }, duracion)
      temporizadores.add(id)
    })

    onUnmounted(() => {
      temporizadores.forEach(clearTimeout)
      temporizadores.clear()
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
  --emerald-50:  #ecfdf5;
  --emerald-100: #d1fae5;
  --emerald-500: #10b981;
  --emerald-600: #059669;
  --emerald-700: #047857;
  --emerald-800: #065f46;
  --slate-300: #cbd5e1;
  --slate-500: #64748b;
  --slate-600: #475569;
  --slate-800: #1e293b;

  display: flex;
  justify-content: center;
  align-items: center;

  min-height: 100vh;
  min-height: 100dvh;

  padding:
    max(1.5rem, env(safe-area-inset-top))
    max(1rem, env(safe-area-inset-right))
    max(1.5rem, env(safe-area-inset-bottom))
    max(1rem, env(safe-area-inset-left));

  background-color: var(--emerald-800);
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
  background-color: #ffffff;
  border-radius: clamp(0.75rem, 3vw, 1rem);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
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
 */
.card-barrido {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-color: var(--emerald-500);
  opacity: 0;
  pointer-events: none;
  clip-path: inset(100% 0 0 0);
  z-index: 2;
}

.card-exito .card-barrido {
  animation: barrido 700ms ease-out;
}

@keyframes barrido {
  0%   { opacity: 0;    clip-path: inset(100% 0 0 0); }
  45%  { opacity: 0.22; clip-path: inset(0 0 0 0); }
  100% { opacity: 0;    clip-path: inset(0 0 0 0); }
}

/* ---------- Rebote y sacudida de la tarjeta ---------- */
.card-exito {
  animation: rebote 620ms cubic-bezier(0.34, 1.4, 0.64, 1);
}

@keyframes rebote {
  0%, 100% { transform: scale(1); }
  40%      { transform: scale(1.028); }
}

.card-sacudida {
  animation: sacudida 460ms ease-in-out;
}

@keyframes sacudida {
  0%, 100% { transform: translateX(0); }
  18%      { transform: translateX(-9px); }
  38%      { transform: translateX(8px); }
  58%      { transform: translateX(-5px); }
  78%      { transform: translateX(3px); }
}

/* ---------- Logo ---------- */
.brand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1rem, 4.5vw, 1.5rem);
  margin-bottom: clamp(0.6rem, 2.5vw, 1rem);
  border-radius: 9999px;
  background-color: var(--emerald-100);
  color: var(--emerald-600);
}

.brand-icon svg {
  width: clamp(3.75rem, 15vw, 5.5rem);
  height: clamp(3.75rem, 15vw, 5.5rem);
  display: block;
}

/*
 * transform-box: fill-box hace que el porcentaje se calcule sobre la caja
 * del propio path y no sobre todo el viewBox. El pivote queda en el punto
 * donde el ala se une al cuerpo.
 */
.ala {
  transform-box: fill-box;
  transform-origin: 8% 94%;
}

.icon-exito {
  animation: pulso-icono 520ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.icon-exito .ala {
  animation: aleteo 110ms ease-in-out 6;
}

@keyframes pulso-icono {
  0%, 100% { transform: scale(1); }
  45%      { transform: scale(1.16); }
}

@keyframes aleteo {
  0%, 100% { transform: rotate(0deg) scaleY(1); }
  50%      { transform: rotate(-26deg) scaleY(0.5); }
}

.brand-name {
  margin: 0;
  font-size: clamp(1.2rem, 5.5vw, 1.5rem);
  line-height: 1.3;
  font-weight: 700;
  color: var(--slate-800);
  overflow-wrap: break-word;
}

/* ---------- Formulario ---------- */
.login-form {
  display: flex;
  flex-direction: column;
  gap: clamp(0.8rem, 3.5vw, 1rem);
}

.form-group {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

label {
  margin-bottom: 0.3rem;
  text-align: left;
  font-size: clamp(0.7rem, 3vw, 0.75rem);
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--slate-600);
}

input[type="email"],
input[type="password"],
input[type="text"] {
  width: 100%;
  min-width: 0;
  min-height: 48px;
  padding: 0.75rem;

  border: 1px solid var(--slate-300);
  border-radius: 0.5rem;

  /* Nunca bajar de 16px: si no, iOS hace zoom solo al enfocar el campo */
  font-size: max(1rem, 16px);
  font-family: inherit;
  color: var(--slate-800);
  background-color: #ffffff;
  outline: none;
  transition: box-shadow 0.2s, border-color 0.2s, opacity 0.25s;
}

input:focus {
  border-color: transparent;
  box-shadow: 0 0 0 2px var(--emerald-500);
}

input:disabled {
  opacity: 0.6;
  background-color: #ffffff;
}

.input-error {
  border-color: #f44336;
}

/* ---------- Mostrar / ocultar contraseña ---------- */
.password-input {
  position: relative;
  display: flex;
}

.password-input input {
  flex: 1;
  padding-right: 5.75rem;
}

.toggle-password {
  position: absolute;
  right: 1px;
  top: 1px;
  bottom: 1px;
  padding: 0 0.9rem;
  border: none;
  border-left: 1px solid var(--slate-300);
  border-radius: 0 0.5rem 0.5rem 0;
  background: transparent;
  color: var(--slate-600);
  font-family: inherit;
  font-size: clamp(0.8rem, 3.2vw, 0.875rem);
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, opacity 0.25s;
  -webkit-tap-highlight-color: transparent;
}

.toggle-password:hover:not(:disabled) {
  background-color: var(--emerald-50);
  color: var(--emerald-700);
}

.toggle-password:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-password:focus-visible {
  outline: 2px solid var(--emerald-500);
  outline-offset: -2px;
}

/* ---------- Recordar sesión ---------- */
.form-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-check input[type="checkbox"] {
  width: 18px;
  height: 18px;
  min-height: 0;
  flex-shrink: 0;
  margin: 0;
  accent-color: var(--emerald-600);
  cursor: pointer;
}

.form-check label {
  margin-bottom: 0;
  font-size: clamp(0.8rem, 3.2vw, 0.9rem);
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  color: var(--slate-600);
  cursor: pointer;
}

/* ---------- Mensajes ---------- */
.error-message {
  margin-top: 0.35rem;
  text-align: left;
  font-size: clamp(0.75rem, 3vw, 0.8rem);
  color: #dc2626;
}

.error-message p {
  margin: 0;
}

.alert-error {
  padding: 0.75rem 0.9rem;
  border-radius: 0.5rem;
  border-left: 4px solid #f44336;
  background-color: #fee2e2;
  color: #991b1b;
  text-align: left;
  font-size: clamp(0.82rem, 3.4vw, 0.9rem);
  overflow-wrap: break-word;
  animation: entra-alerta 320ms cubic-bezier(0.34, 1.3, 0.64, 1);
}

.alert-error p {
  margin: 0;
}

@keyframes entra-alerta {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
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
  border-radius: 0.5rem;
  background-color: var(--emerald-600);
  color: #ffffff;
  font-size: max(0.95rem, 15px);
  font-family: inherit;
  font-weight: 700;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transition:
    width 0.45s cubic-bezier(0.65, 0, 0.35, 1),
    border-radius 0.45s cubic-bezier(0.65, 0, 0.35, 1),
    background-color 0.3s;
  -webkit-tap-highlight-color: transparent;
}

.login-button:hover:not(:disabled) {
  background-color: var(--emerald-700);
}

.login-button:focus-visible {
  outline: 3px solid var(--emerald-500);
  outline-offset: 2px;
}

/* El gris de deshabilitado solo aplica cuando NO está en la coreografía */
.login-button:disabled:not(.compacto) {
  background-color: #a7c9bb;
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

.login-button.exito {
  background-color: var(--emerald-700);
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
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
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
  stroke: #ffffff;
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
  font-size: clamp(0.8rem, 3.2vw, 0.9rem);
}

.additional-links a {
  display: inline-block;
  padding: 0.4rem 0.6rem;
  color: var(--emerald-700);
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s;
}

.additional-links a:hover {
  color: var(--emerald-800);
  text-decoration: underline;
}

/* ---------- Ajustes por pantalla ---------- */

/* Teléfono acostado o pantalla muy baja: comprime lo vertical */
@media (max-height: 700px) {
  .login-container {
    align-items: flex-start;
  }

  .brand-icon {
    padding: 0.7rem;
    margin-bottom: 0.5rem;
  }

  .brand-icon svg {
    width: 2.75rem;
    height: 2.75rem;
  }

  .login-form {
    gap: 0.7rem;
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
  .icon-exito,
  .icon-exito .ala,
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
  input {
    transition: none;
  }
}
</style>