import { isUploadedImage } from './businessRules'

const noPhotoSurfaceClasses = new Set(['business-photo', 'detail-image', 'photo-tile', 'product-thumb'])

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

  const reader = new FileReader()
  reader.onload = () => {
    const image = new Image()
    image.onload = () => {
      const maxSide = 900
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)
      const context = canvas.getContext('2d')
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    image.onerror = reject
    image.src = reader.result
  }
  reader.onerror = reject
  reader.readAsDataURL(file)
})


export { imageSurfaceProps, readCompressedImage }
