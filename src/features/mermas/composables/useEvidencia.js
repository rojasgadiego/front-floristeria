/*
 * Lo que comparten los formularios de merma (ReporteMerma, DesarmeMerma):
 * las fotos de evidencia y el código de autorización.
 */
import { ref, onBeforeUnmount } from 'vue'
import { reducirImagen } from '@/core/utils/reducirImagen'

export const MAX_FOTOS = 3

const aBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result).split(',')[1])
  r.onerror = () => reject(new Error('No se pudo leer la foto.'))
  r.readAsDataURL(blob)
})

/**
 * Las fotos: se reducen a ~200 KB antes de subir (con datos móviles en el
 * mesón, 5 MB por foto es esperar, y en la base pesarían por años) y se
 * mandan en base64 dentro del JSON; la base las guarda como binario.
 */
export function useFotos (error) {
  const fotos = ref([])
  const procesando = ref(false)

  const alTomarFoto = async (e) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo || fotos.value.length >= MAX_FOTOS) return
    procesando.value = true
    error.value = ''
    try {
      const blob = await reducirImagen(archivo)
      fotos.value.push({ url: URL.createObjectURL(blob), base64: await aBase64(blob), tipoMime: 'image/jpeg' })
    } catch (err) {
      error.value = err.message
    } finally {
      procesando.value = false
    }
  }

  const quitarFoto = (i) => {
    URL.revokeObjectURL(fotos.value[i].url)
    fotos.value.splice(i, 1)
  }

  const paraEnviar = () => fotos.value.map(f => ({ base64: f.base64, tipoMime: f.tipoMime }))

  onBeforeUnmount(() => fotos.value.forEach(f => URL.revokeObjectURL(f.url)))

  return { fotos, procesando, alTomarFoto, quitarFoto, paraEnviar }
}

/**
 * El código que llega por correo a la administración cuando la merma pasa
 * el tope. Solo sirve en la sesión de quien lo pidió.
 */
export function useCodigoAutorizacion (store, valor, error) {
  const enviado = ref(false)
  const codigo = ref('')
  const enviando = ref(false)

  const solicitar = async () => {
    if (enviando.value) return
    enviando.value = true
    error.value = ''
    try {
      await store.dispatch('mermas/solicitarCodigo', Math.round(valor.value))
      enviado.value = true
      codigo.value = ''
    } catch (e) {
      error.value = e.message
    } finally {
      enviando.value = false
    }
  }

  const listo = () => codigo.value.trim().length === 6

  return { enviado, codigo, enviando, solicitar, listo }
}
