/**
 * core/utils/reducirImagen.js
 * =========================================================================
 * Achica una foto en el navegador antes de subirla: una foto de teléfono
 * pesa 3–6 MB y en el mesón, con datos móviles, eso es esperar. A 1200 px
 * de lado mayor y JPG al 85 % queda en ~150–300 KB y se ve igual de bien
 * en la grilla del POS y en el catálogo.
 *
 * `imageOrientation: 'from-image'` respeta la rotación EXIF: sin eso, las
 * fotos verticales del iPhone quedan acostadas.
 * =========================================================================
 */

const NO_SE_PUEDE_LEER =
  'No se pudo leer la foto. Prueba con otra o guárdala como JPG o PNG.'

/* Safari viejo no trae createImageBitmap con opciones: se decodifica con
   un <img>, que en los navegadores actuales también respeta el EXIF. */
function cargarConImg (archivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(NO_SE_PUEDE_LEER))
    }
    img.src = url
  })
}

async function decodificar (archivo) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(archivo, { imageOrientation: 'from-image' })
    } catch { /* se intenta con <img> */ }
  }
  return cargarConImg(archivo)
}

/**
 * @param {File} archivo
 * @returns {Promise<Blob>} JPG reducido
 */
export async function reducirImagen (archivo, { lado = 1200, calidad = 0.85 } = {}) {
  /* Algunos teléfonos no informan el tipo (queda en ''): se deja pasar y
     que decida la decodificación. */
  if (archivo.type && !archivo.type.startsWith('image/')) {
    throw new Error('Elige una imagen: una foto de la galería o un archivo JPG o PNG.')
  }

  const img = await decodificar(archivo)
  const ancho = img.width
  const alto = img.height
  if (!ancho || !alto) throw new Error(NO_SE_PUEDE_LEER)

  const escala = Math.min(1, lado / Math.max(ancho, alto))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(ancho * escala)
  canvas.height = Math.round(alto * escala)

  const ctx = canvas.getContext('2d')
  /* Fondo blanco: un PNG con transparencia pasado a JPG quedaría negro. */
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  if (typeof img.close === 'function') img.close()

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', calidad))
  if (!blob) throw new Error(NO_SE_PUEDE_LEER)
  return blob
}
