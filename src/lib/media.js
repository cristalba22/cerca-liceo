import { isUploadedImage } from './businessRules'

const noPhotoSurfaceClasses = new Set(['business-photo', 'detail-image', 'photo-tile', 'product-thumb'])
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
const SUPPORTED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i

const isHeicFile = (file) => /image\/hei[cf]/i.test(file?.type || '') || /\.hei[cf]$/i.test(file?.name || '')

const validateImageFile = (file) => {
  if (!file) return ''

  if (!SUPPORTED_IMAGE_TYPES.has(file.type) && !SUPPORTED_IMAGE_EXTENSIONS.test(file.name || '')) {
    return 'Usa una foto JPG, PNG, WebP o HEIC.'
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return 'La foto es muy pesada. Elegi una de hasta 30 MB.'
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

const decodeHeic = async (file) => {
  const { default: heic2any } = await import('heic2any')
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.86 })
  return Array.isArray(result) ? result[0] : result
}

const canvasToDataUrl = (canvas) => canvas.toDataURL('image/jpeg', 0.82)

const compressWithBitmap = async (blob) => {
  if (typeof createImageBitmap !== 'function') return ''

  const bitmap = await createImageBitmap(blob)
  try {
    const maxSide = 1200
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Canvas no disponible')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvasToDataUrl(canvas)
  } finally {
    bitmap.close?.()
  }
}

const compressWithImage = (blob) => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(blob)
  const image = new Image()
  image.onload = () => {
    try {
      const maxSide = 1200
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const context = canvas.getContext('2d', { alpha: false })
      if (!context) throw new Error('Canvas no disponible')
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvasToDataUrl(canvas))
    } catch (error) {
      reject(error)
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl)
    reject(new Error('No pudimos leer esa foto.'))
  }
  image.src = objectUrl
})

const readCompressedImage = async (file) => {
  if (!file) {
    return ''
  }

  const validationError = validateImageFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  try {
    const source = isHeicFile(file) ? await decodeHeic(file) : file
    return await compressWithBitmap(source) || await compressWithImage(source)
  } catch {
    throw new Error('No pudimos preparar esa foto. Proba con otra imagen o una captura de pantalla.')
  }
}


export { imageSurfaceProps, isHeicFile, readCompressedImage, validateImageFile }
