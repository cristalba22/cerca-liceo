import { isUploadedImage } from './businessRules'

const noPhotoSurfaceClasses = new Set(['business-photo', 'detail-image', 'photo-tile', 'product-thumb'])
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024
const MAX_SOURCE_PIXELS = 24_000_000
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const validateImageFile = (file) => {
  if (!file) return ''

  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return 'Usa una foto JPG, PNG o WebP. Si tu celular la guarda como HEIC, elegi una captura de pantalla o converti la foto primero.'
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return 'La foto es muy pesada. Elegi una de hasta 12 MB o sacale una captura antes de subirla.'
  }

  return ''
}

const imageSurfaceProps = (image, baseClass, options = {}) => {
  const hasUploadedPhoto = isUploadedImage(image)
  const shouldShowNoPhoto = noPhotoSurfaceClasses.has(baseClass) && !hasUploadedPhoto
  return {
    className: `${baseClass} ${hasUploadedPhoto ? 'custom-image' : shouldShowNoPhoto ? 'no-photo' : `image-${image || 'generic'}`}`,
    style: hasUploadedPhoto
      ? {
          backgroundImage: `url(${image})`,
          backgroundPosition: options.imagePosition || 'center center',
          backgroundSize: options.imageZoom ? `${options.imageZoom}%` : 'cover',
        }
      : undefined,
  }
}

const readCompressedImage = (file) => new Promise((resolve, reject) => {
  if (!file) {
    resolve('')
    return
  }

  const validationError = validateImageFile(file)
  if (validationError) {
    reject(new Error(validationError))
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    const image = new Image()
    image.onload = () => {
      try {
        if (image.width * image.height > MAX_SOURCE_PIXELS) {
          reject(new Error('La foto tiene demasiada resolucion para este celular. Elegi una mas chica o sacale una captura.'))
          return
        }

        const maxSide = 1200
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d', { alpha: false })
        if (!context) {
          reject(new Error('No pudimos preparar la foto en este navegador. Proba con otra imagen.'))
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      } catch {
        reject(new Error('No pudimos preparar esa foto. Proba con una captura de pantalla o una imagen mas chica.'))
      }
    }
    image.onerror = () => reject(new Error('No pudimos leer esa foto. Proba con JPG, PNG o WebP.'))
    image.src = reader.result
  }
  reader.onerror = () => reject(new Error('No pudimos leer el archivo de imagen.'))
  reader.readAsDataURL(file)
})


export { imageSurfaceProps, readCompressedImage, validateImageFile }
