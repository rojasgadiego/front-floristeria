import { ref } from 'vue'

/* Fuente única de verdad del tema. Se resuelve una sola vez al cargar:
   1) lo que el usuario eligió antes, 2) preferencia del sistema. */
const guardado = localStorage.getItem('tema')
const prefiereDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const tema = ref(guardado || (prefiereDark ? 'dark' : 'light'))

function aplicar (valor) {
  document.documentElement.setAttribute('data-theme', valor)
  localStorage.setItem('tema', valor)
  tema.value = valor
}

// Aplica de inmediato para evitar el "flash" de tema incorrecto.
aplicar(tema.value)

export function useTema () {
  const alternar = () => aplicar(tema.value === 'dark' ? 'light' : 'dark')
  return { tema, alternar }
}
