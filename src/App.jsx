import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Camera,
  Flame,
  Grid2X2,
  Hammer,
  Heart,
  Home,
  Eye,
  List,
  MapPin,
  MessageCircle,
  Moon,
  Navigation,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Store,
  Timer,
  UserRound,
  Utensils,
  Wheat,
  Wrench,
} from 'lucide-react'
import './App.css'
import { cercaApi } from './lib/cercaApi'
import { defaultBusinesses, defaultOffers } from './lib/fallbackData'

const sections = ['Todos', 'Liceo Procrear', 'Liceo 1ra', 'Liceo 2da', 'Liceo 3ra']
const weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

const categories = [
  { name: 'Todas', icon: Grid2X2, tone: 'lime' },
  { name: 'Comida', icon: Utensils, tone: 'orange' },
  { name: 'Verduleria', icon: ShoppingBasket, tone: 'green' },
  { name: 'Carniceria', icon: Store, tone: 'red' },
  { name: 'Despensa', icon: Store, tone: 'yellow' },
  { name: 'Ferreteria', icon: Wrench, tone: 'teal' },
  { name: 'Panaderia', icon: Wheat, tone: 'amber' },
  { name: 'Belleza', icon: Sparkles, tone: 'pink' },
  { name: 'Servicios', icon: Hammer, tone: 'blue' },
]

const readStoredJson = (key) => {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

const offers = defaultOffers
const businesses = defaultBusinesses
const realDataMode = cercaApi.isSupabaseEnabled()
const liceoMapQuery = 'Barrio Liceo Procrear Cordoba Argentina'
const liceoMapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(liceoMapQuery)}&output=embed`
const liceoMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(liceoMapQuery)}`

const isUploadedImage = (image) => typeof image === 'string' && (
  image.startsWith('data:') ||
  image.startsWith('blob:') ||
  image.startsWith('http')
)

const directScreens = new Set(['home', 'profile', 'login', 'register', 'forgot-password', 'reset-password'])
const androidHardScreens = new Set(['profile', 'login', 'register', 'forgot-password', 'reset-password'])

const getInitialScreen = () => {
  const params = new URLSearchParams(window.location.search)
  const requestedScreen = params.get('screen')
  return directScreens.has(requestedScreen) ? requestedScreen : 'welcome'
}

const formatOpenDays = (days = []) => {
  if (days.length === 7) return 'Todos los dias'
  if (days.join(',') === 'Lun,Mar,Mie,Jue,Vie') return 'Lun a Vie'
  if (days.join(',') === 'Lun,Mar,Mie,Jue,Vie,Sab') return 'Lun a Sab'
  if (days.join(',') === 'Sab,Dom') return 'Sab y Dom'
  return days.length ? days.join(', ') : 'Dias a definir'
}

const formatSchedule = (schedule = {}) => {
  const { openDays = [], openTime = '', closeTime = '', hours = '' } = schedule || {}
  const days = formatOpenDays(openDays)
  if (openTime && closeTime) return `${days} - ${openTime} a ${closeTime}`
  return hours || `${days} - Horario a definir`
}

const normalizePhone = (phone = '') => {
  const digits = String(phone).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('54')) return digits
  if (digits.startsWith('0')) return `54${digits.slice(1)}`
  return `54${digits}`
}

const makeWhatsAppUrl = (phone, message) => {
  const normalizedPhone = normalizePhone(phone)
  const encoded = encodeURIComponent(message)
  return normalizedPhone ? `https://wa.me/${normalizedPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`
}

const toNoticeText = (value, fallback = 'Ocurrio un problema. Proba de nuevo.') => {
  if (!value) return fallback
  const raw = typeof value === 'string'
    ? value
    : value.message || value.error_description || value.error || ''
  if (raw === '{}' || raw === '[object Object]') return fallback
  if (/email rate limit exceeded|rate limit/i.test(raw)) {
    return 'Se alcanzo el limite temporal de emails. Proba de nuevo en unos minutos o escribi al soporte 351 766 2142.'
  }
  if (/internal server error|500/i.test(raw)) {
    return 'No pudimos crear la cuenta porque fallo el envio del email de verificacion. Proba de nuevo en unos minutos o escribi al soporte 351 766 2142.'
  }
  if (raw) return raw
  return fallback
}

const normalizeInstagramHandle = (value = '') => String(value)
  .trim()
  .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
  .replace(/^@/, '')
  .replace(/\/$/, '')

const makeInstagramUrl = (value = '') => {
  const handle = normalizeInstagramHandle(value)
  return handle ? `https://instagram.com/${handle}` : ''
}

const getBusinessMenu = (business = {}) => (
  Array.isArray((business || {}).menu) ? (business || {}).menu : []
)

const hasBusinessPublicAddress = (business = {}) => {
  const safeBusiness = business || {}
  return (
    safeBusiness.hasPublicAddress !== false &&
    Boolean(String(safeBusiness.address || '').trim()) &&
    !String(safeBusiness.address || '').toLowerCase().includes('completar')
  )
}

const isFounderPlanActive = (business = {}) => {
  const safeBusiness = business || {}
  return safeBusiness.plan === 'pedidos' && safeBusiness.planStatus === 'active'
}

const isFounderPlanRequested = (business = {}) => {
  const safeBusiness = business || {}
  return safeBusiness.plan === 'pedidos' && safeBusiness.planStatus !== 'active'
}

const getOpenStatus = (business = {}) => {
  const safeBusiness = business || {}
  const days = safeBusiness.openDays || safeBusiness.open_days || []
  const openTime = safeBusiness.openTime || safeBusiness.open_time
  const closeTime = safeBusiness.closeTime || safeBusiness.close_time

  if (safeBusiness.open === false) {
    return {
      open: false,
      label: 'Cerrado ahora',
      detail: safeBusiness.hours || safeBusiness.orderHours || formatSchedule({ openDays: days, openTime, closeTime }),
    }
  }

  if (!days.length || !openTime || !closeTime) {
    return {
      open: safeBusiness.open !== false,
      label: safeBusiness.open === false ? 'Cerrado' : 'Consultar horario',
      detail: safeBusiness.hours || safeBusiness.orderHours || 'Horario a confirmar',
    }
  }

  const now = new Date()
  const day = weekDays[(now.getDay() + 6) % 7]
  const [openHour, openMinute] = openTime.split(':').map(Number)
  const [closeHour, closeMinute] = closeTime.split(':').map(Number)
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  const opensAt = openHour * 60 + (openMinute || 0)
  let closesAt = closeHour * 60 + (closeMinute || 0)
  let currentMinutes = minutesNow

  if (closesAt <= opensAt) {
    closesAt += 24 * 60
    if (currentMinutes < opensAt) currentMinutes += 24 * 60
  }

  const opensToday = days.includes(day)
  const isOpen = opensToday && currentMinutes >= opensAt && currentMinutes <= closesAt

  return {
    open: isOpen,
    label: isOpen ? 'Abierto ahora' : 'Cerrado ahora',
    detail: isOpen ? `Hasta ${closeTime}` : formatSchedule(safeBusiness),
  }
}

const getOfferOpenStatus = (offer = {}) => getOpenStatus({
  open: offer.open,
  hours: offer.hours,
  openDays: offer.openDays || offer.open_days || [],
  openTime: offer.openTime || offer.open_time || '',
  closeTime: offer.closeTime || offer.close_time || '',
})

const getOfferBusiness = (offer) => businesses.find((business) => business.name === offer.business)

const getOfferWhatsappUrl = (offer) => {
  const matchedBusiness = getOfferBusiness(offer)
  const phone = offer.whatsapp || matchedBusiness?.whatsapp || ''
  const message = `Hola ${offer.business}, vi en Cerca Liceo la promo "${offer.title}" (${offer.price}). Queria consultar si sigue disponible.`
  return makeWhatsAppUrl(phone, message)
}

const createMenuSlot = (index) => ({
  name: index === 0 ? 'Producto principal' : '',
  price: '',
  available: true,
})

const ensureMenuSlots = (menu = [], minSlots = 5) => {
  const normalized = menu.map((item) => ({
    name: item.name || '',
    price: item.price || '',
    available: item.available !== false,
  }))

  while (normalized.length < minSlots) {
    normalized.push(createMenuSlot(normalized.length))
  }

  return normalized
}

const mergeUniqueById = (items) => {
  const seen = new Set()
  return items.filter((item) => {
    const id = item.id || item.name || item.title
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

const buildLocalDraft = (local, account) => ({
  name: local?.name || account?.businessName || '',
  businessType: local?.businessType || account?.businessType || 'local',
  hasPublicAddress: local?.hasPublicAddress ?? true,
  category: local?.category || account?.category || 'Comida',
  section: local?.section || account?.section || 'Liceo Procrear',
  address: local?.address || '',
  reference: local?.reference || 'Cerca de la plaza o ingreso principal',
  hours: local?.hours || '20:00 a 00:30',
  openDays: local?.openDays || ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'],
  openTime: local?.openTime || '09:00',
  closeTime: local?.closeTime || '21:00',
  whatsapp: local?.whatsapp || account?.whatsapp || '',
  instagram: local?.instagram || '',
  description: local?.description || 'Comercio del barrio con atencion por WhatsApp.',
  paymentMethods: local?.paymentMethods || 'Efectivo y transferencia',
  delivery: local?.delivery || account?.salesMode || 'Retiro y delivery',
  plan: local?.plan || 'gratis',
  image: local?.image || 'milanesa',
  imageZoom: local?.imageZoom || 120,
  imagePosition: local?.imagePosition || 'center center',
  menu: ensureMenuSlots(
    local?.menu?.length
      ? local.menu
      : [
        { name: 'Producto principal', price: '$' },
        { name: 'Promo del dia', price: '$' },
        { name: 'Combo familiar', price: '$' },
        { name: 'Bebida o extra', price: '$' },
        { name: 'Consultar por WhatsApp', price: '' },
      ],
  ),
})

const imageSurfaceProps = (image, baseClass, options = {}) => ({
  className: `${baseClass} ${isUploadedImage(image) ? 'custom-image' : `image-${image || 'milanesa'}`}`,
  style: isUploadedImage(image)
    ? {
        backgroundImage: `url(${image})`,
        backgroundPosition: options.imagePosition || 'center center',
        backgroundSize: options.imageZoom ? `${options.imageZoom}%` : 'cover',
      }
    : undefined,
})

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

function App() {
  const [screen, setScreen] = useState(getInitialScreen)
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todas')
  const [selectedSection, setSelectedSection] = useState('Todos')
  const [darkMode, setDarkMode] = useState(false)
  const [featuredBusinessIndex, setFeaturedBusinessIndex] = useState(0)
  const [registerType, setRegisterType] = useState('neighbor')
  const [account, setAccount] = useState(() => readStoredJson('cerca-liceo-account'))
  const [merchantLocal, setMerchantLocal] = useState(() => readStoredJson('cerca-liceo-business'))
  const [feedOffers, setFeedOffers] = useState(realDataMode ? [] : offers)
  const [feedBusinesses, setFeedBusinesses] = useState(realDataMode ? [] : businesses)
  const [adminBusinesses, setAdminBusinesses] = useState([])
  const [publishTemplate, setPublishTemplate] = useState(null)
  const [authNotice, setAuthNotice] = useState('')
  const [pageViews, setPageViews] = useState(() => Number(window.localStorage.getItem('cerca-liceo-page-views') || 0))

  const goToScreen = (nextScreen, options = {}) => {
    const isAndroidCompat = document.documentElement.classList.contains('android-compat')
    if (isAndroidCompat && androidHardScreens.has(nextScreen) && screen !== nextScreen && !options.soft) {
      const params = new URLSearchParams(window.location.search)
      params.set('screen', nextScreen)
      params.set('androidCompat', '1')
      params.set('viewReset', Date.now().toString())
      window.location.assign(`${window.location.pathname}?${params.toString()}`)
      return
    }

    if (nextScreen === 'home' || nextScreen === 'welcome') {
      const params = new URLSearchParams(window.location.search)
      if (params.has('screen')) {
        params.delete('screen')
        params.delete('viewReset')
        const nextUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname
        window.history.replaceState({}, '', nextUrl)
      }
    }

    setScreen(nextScreen)
  }

  useEffect(() => {
    const currentViews = Number(window.localStorage.getItem('cerca-liceo-page-views') || 0)
    const nextViews = currentViews + 1
    window.localStorage.setItem('cerca-liceo-page-views', String(nextViews))
    setPageViews(nextViews)
  }, [])

  const loadMerchantOffers = async () => {
    const { offers: myOffers, error } = await cercaApi.listMyOffers()
    if (error || !myOffers?.length) return
    setFeedOffers((current) => mergeUniqueById([...myOffers, ...current]))
  }

  useEffect(() => {
    let ignore = false

    const hydrateSession = async () => {
      const { account } = await cercaApi.getSession()
      if (ignore) return
      if (account) {
        setAccount(account)
        if (account.type === 'merchant') {
          const { business } = await cercaApi.getMyBusiness()
          if (!ignore && business) {
            setMerchantLocal(business)
            await loadMerchantOffers()
          }
        }
      }
    }

    hydrateSession()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const isPasswordRecovery = params.get('reset') === 'password' || hashParams.get('type') === 'recovery'
    if (isPasswordRecovery) {
      setAuthNotice('Crea una nueva clave para volver a entrar a Cerca Liceo.')
      setScreen('reset-password')
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFeaturedBusinessIndex((index) => (index + 1) % Math.max(feedBusinesses.length, feedOffers.length, 1))
    }, 3600)

    return () => window.clearInterval(timer)
  }, [feedBusinesses.length, feedOffers.length])

  useEffect(() => {
    let ignore = false

    const loadOffers = async () => {
      const { offers: nextOffers, error } = await cercaApi.listOffers({
        section: selectedSection,
        category: selectedCategory,
        query,
      })
      if (!ignore && !error) {
        setFeedOffers(nextOffers)
      }
    }

    loadOffers()

    return () => {
      ignore = true
    }
  }, [query, selectedCategory, selectedSection])

  useEffect(() => {
    let ignore = false

    const loadBusinesses = async () => {
      const { businesses: nextBusinesses, error } = await cercaApi.listBusinesses()
      if (!ignore && !error) {
        setFeedBusinesses(nextBusinesses)
      }
    }

    loadBusinesses()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    const loadAdminBusinesses = async () => {
      if (screen !== 'admin') return
      const { businesses: nextBusinesses, error } = await cercaApi.listAdminBusinesses()
      if (!ignore && !error) {
        setAdminBusinesses(nextBusinesses)
      }
    }

    loadAdminBusinesses()

    return () => {
      ignore = true
    }
  }, [screen])

  useEffect(() => {
    if (account) {
      window.localStorage.setItem('cerca-liceo-account', JSON.stringify(account))
    } else {
      window.localStorage.removeItem('cerca-liceo-account')
    }
  }, [account])

  useEffect(() => {
    if (merchantLocal) {
      window.localStorage.setItem('cerca-liceo-business', JSON.stringify(merchantLocal))
    } else {
      window.localStorage.removeItem('cerca-liceo-business')
    }
  }, [merchantLocal])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  useEffect(() => {
    if (!authNotice) return undefined
    const timer = window.setTimeout(() => setAuthNotice(''), 4300)
    return () => window.clearTimeout(timer)
  }, [authNotice])

  const resetSession = async () => {
    await cercaApi.signOut()
    setAccount(null)
    setMerchantLocal(null)
    setRegisterType('neighbor')
    setAuthNotice('Sesion cerrada. Podes seguir navegando como visitante.')
  }

  const loginQuick = async (type) => {
    const { account, error } = await cercaApi.signInQuick(type)
    if (error) {
      setAuthNotice('No se pudo iniciar sesion. Proba de nuevo.')
      return
    }
    setAccount(account)
    if (type !== 'merchant') {
      setMerchantLocal(null)
    }
    setAuthNotice(type === 'merchant' ? 'Sesion iniciada como comercio.' : 'Sesion iniciada como vecino.')
    goToScreen('profile')
  }

  const loginAccount = async (credentials) => {
    const { account, error } = await cercaApi.signInWithPassword(credentials)
    if (error) {
      setAuthNotice(error.message || 'No se pudo iniciar sesion.')
      return
    }
    if (!account) {
      setAuthNotice('No pudimos cargar tu perfil. Proba cerrar sesion e ingresar otra vez.')
      return
    }
    setAccount(account)
    if (account.type === 'merchant') {
      const { business, error: businessError } = await cercaApi.getMyBusiness()
      if (business) {
        setMerchantLocal(business)
        await loadMerchantOffers()
      } else {
        setMerchantLocal(null)
      }
      setAuthNotice(businessError
        ? 'Sesion iniciada. No pudimos cargar tu local, pero podes completarlo desde Panel comercio.'
        : business
          ? 'Sesion iniciada. Tu local ya esta cargado.'
          : 'Sesion iniciada. Ahora podes cargar tu local gratis.')
      goToScreen('profile')
      return
    }
    setMerchantLocal(null)
    setAuthNotice('Sesion iniciada correctamente.')
    goToScreen('profile')
  }

  const requestPasswordReset = async (email) => {
    const { error } = await cercaApi.requestPasswordReset(email)
    if (error) {
      setAuthNotice(error.message || 'No pudimos enviar el correo de recuperacion.')
      return
    }
    setAuthNotice('Te mandamos un correo de Cerca Liceo para crear una nueva clave. Revisa Recibidos y Spam.')
  }

  const updatePassword = async (password) => {
    const { error } = await cercaApi.updatePassword(password)
    if (error) {
      setAuthNotice(error.message || 'No pudimos guardar la nueva clave.')
      return
    }
    setAuthNotice('Clave actualizada. Ya podes iniciar sesion con tu nueva clave.')
    goToScreen('login')
    window.history.replaceState({}, '', window.location.pathname)
  }

  const saveMerchantLocal = async (draft) => {
    const { business, error, warning } = await cercaApi.saveBusiness(draft)
    if (error) {
      setAuthNotice(error.message || 'No se pudo guardar el local.')
      return { ok: false, error }
    }
    const nextBusiness = warning && isUploadedImage(draft.image)
      ? { ...business, image: draft.image, imageZoom: draft.imageZoom, imagePosition: draft.imagePosition }
      : business
    setMerchantLocal(nextBusiness)
    setFeedBusinesses((current) => [nextBusiness, ...current.filter((item) => item.id !== nextBusiness.id)])
    setAuthNotice(warning || 'Local guardado correctamente.')
    return { ok: true, business: nextBusiness, warning: warning || '' }
  }

  const registerAccount = async (account) => {
    const { account: savedAccount, error, pendingConfirmation, message, warning } = await cercaApi.registerAccount(account)
    if (error) {
      setAuthNotice(toNoticeText(error, 'No se pudo crear la cuenta. Revisa email, clave y conexion.'))
      return false
    }
    if (pendingConfirmation) {
      setAuthNotice(message || 'Cuenta creada. Revisa tu email para confirmar el acceso.')
      return 'pending-confirmation'
    }
    if (!savedAccount) {
      setAuthNotice('La cuenta se creo, pero no pudimos cargar el perfil. Inicia sesion para continuar.')
      goToScreen('login')
      return false
    }
    setAccount(savedAccount)
    if (account.type !== 'merchant') {
      setMerchantLocal(null)
    }
    setAuthNotice(warning || message || (account.type === 'merchant' ? 'Cuenta comercio creada. Ya podes cargar tu ficha.' : 'Cuenta vecino creada.'))
    return true
  }

  const publishOffer = async (offerDraft) => {
    const { offer, error, warning } = await cercaApi.createOffer(offerDraft)
    if (error) {
      setAuthNotice(error.message || 'No se pudo publicar la promo.')
      return { ok: false, message: error.message || 'No se pudo publicar la promo.' }
    }
    setFeedOffers((current) => [offer, ...current.filter((item) => item.id !== offer.id)])
    setPublishTemplate(null)
    setAuthNotice(warning || 'Promo publicada correctamente.')
    return { ok: true, message: warning || 'Promo publicada correctamente.' }
  }

  const openPublish = (template = null) => {
    setPublishTemplate(template)
    setScreen('publish')
  }

  const pauseOffer = async (offer) => {
    const nextActive = !offer.open
    const { offer: savedOffer, error } = await cercaApi.updateOfferStatus({ offerId: offer.id, isActive: nextActive })
    if (error) {
      setAuthNotice(error.message || 'No se pudo actualizar la publicacion.')
      return
    }
    setFeedOffers((current) => current.map((item) => (
      item.id === offer.id ? { ...item, ...(savedOffer || {}), open: nextActive, paused: !nextActive } : item
    )))
    setAuthNotice(nextActive ? 'Publicacion activada.' : 'Publicacion pausada.')
  }

  const deleteOffer = async (offer) => {
    const { error } = await cercaApi.deleteOffer({ offerId: offer.id })
    if (error) {
      setAuthNotice(error.message || 'No se pudo eliminar la publicacion.')
      return
    }
    setFeedOffers((current) => current.filter((item) => item.id !== offer.id))
    setAuthNotice('Publicacion eliminada.')
  }

  const repostOffer = async (offer) => {
    const { offer: reposted, error } = await cercaApi.repostOffer({ offer, expiresInDays: 4 })
    if (error) {
      setAuthNotice(error.message || 'No se pudo republicar la promo.')
      return
    }
    setFeedOffers((current) => [reposted, ...current])
    setAuthNotice('Promo republicada por 4 dias.')
  }

  const updateAdminBusiness = async (business, changes, message) => {
    const { business: savedBusiness, error } = await cercaApi.updateBusinessAdmin({ businessId: business.id, changes })
    if (error) {
      setAuthNotice(error.message || 'No se pudo actualizar el local.')
      return
    }
    if (savedBusiness) {
      setAdminBusinesses((current) => current.map((item) => (item.id === savedBusiness.id ? savedBusiness : item)))
      setFeedBusinesses((current) => {
        const without = current.filter((item) => item.id !== savedBusiness.id)
        return savedBusiness.isPublic ? [savedBusiness, ...without] : without
      })
      if (merchantLocal?.id === savedBusiness.id) setMerchantLocal(savedBusiness)
    }
    setAuthNotice(message || 'Local actualizado.')
  }

  const deleteBusinessAdmin = async (business) => {
    if (!business?.id) {
      setAuthNotice('No se encontro el comercio para eliminar.')
      return
    }
    const confirmDelete = window.confirm(`Eliminar "${business.name}" completo? Se borran tambien sus publicaciones. Esta accion no se puede deshacer.`)
    if (!confirmDelete) return
    const { error } = await cercaApi.deleteBusinessAdmin({ businessId: business.id })
    if (error) {
      setAuthNotice(error.message || 'No se pudo eliminar el comercio. Revisa permisos de admin en Supabase.')
      return
    }
    setAdminBusinesses((current) => current.filter((item) => item.id !== business.id))
    setFeedBusinesses((current) => current.filter((item) => item.id !== business.id))
    setFeedOffers((current) => current.filter((offer) => offer.businessId !== business.id && offer.business !== business.name))
    if (merchantLocal?.id === business.id) setMerchantLocal(null)
    setAuthNotice('Comercio eliminado del sistema.')
  }

  const publicFeedOffers = useMemo(() => {
    const seen = new Set()
    return feedOffers.map((offer) => {
      const matchedBusiness = feedBusinesses.find((business) => (
        business.id === offer.businessId ||
        business.name === offer.business
      ))

      return matchedBusiness
        ? {
            ...offer,
            address: offer.address || matchedBusiness.address,
            reference: offer.reference || matchedBusiness.reference,
            hours: offer.hours || matchedBusiness.hours,
            openDays: offer.openDays?.length ? offer.openDays : matchedBusiness.openDays,
            openTime: offer.openTime || matchedBusiness.openTime,
            closeTime: offer.closeTime || matchedBusiness.closeTime,
            open: matchedBusiness.open,
            whatsapp: offer.whatsapp || matchedBusiness.whatsapp,
          }
        : offer
    }).filter((offer) => {
      const key = `${offer.businessId || offer.business}-${offer.title}-${offer.price}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [feedBusinesses, feedOffers])

  const filteredOffers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return publicFeedOffers.filter((offer) => {
      if (offer.open === false) return false
      const byCategory = selectedCategory === 'Todas' || offer.category === selectedCategory
      const bySection = selectedSection === 'Todos' || offer.section === selectedSection
      const byQuery =
        normalizedQuery.length === 0 ||
        `${offer.title} ${offer.business} ${offer.category}`.toLowerCase().includes(normalizedQuery)

      return byCategory && bySection && byQuery
    })
  }, [publicFeedOffers, query, selectedCategory, selectedSection])

  const visibleFeedOffers = publicFeedOffers.filter((offer) => offer.open !== false)
  const heroOffers = visibleFeedOffers
  const heroOffer = heroOffers[featuredBusinessIndex % Math.max(heroOffers.length, 1)]
  const liveMapBusinesses = useMemo(() => mergeUniqueById([
    ...feedBusinesses,
    ...visibleFeedOffers.map((offer) => ({
      id: offer.businessId || `offer-${offer.business}`,
      name: offer.business,
      category: offer.category,
      section: offer.section,
      address: offer.address || offer.section,
      reference: offer.reference || '',
      hours: offer.hours || 'Horario a confirmar',
      whatsapp: offer.whatsapp || '',
      tone: offer.tone || 'orange',
      image: offer.image || 'milanesa',
      open: getOfferOpenStatus(offer).open,
      isPublic: true,
      menu: [{ name: offer.title, price: offer.price }],
      distance: offer.distance || 'cerca',
    })),
  ]), [feedBusinesses, visibleFeedOffers])

  return (
    <main className={`app-shell ${darkMode ? 'night-mode' : ''}`}>
      <section className="app-screen" aria-label="Cerca Liceo">
        {screen === 'welcome' && <WelcomeScreen onEnter={() => goToScreen('home')} />}

        {screen === 'detail' && selectedOffer && (
          <DetailScreen
            offer={selectedOffer}
            relatedOffers={feedOffers}
            onToggleTheme={() => setDarkMode((value) => !value)}
            onBack={() => {
              goToScreen('home')
              setSelectedOffer(null)
            }}
          />
        )}

        {screen === 'business-detail' && selectedBusiness && (
          <BusinessDetailScreen
            business={selectedBusiness}
            onToggleTheme={() => setDarkMode((value) => !value)}
            onBack={() => {
              setScreen('directory')
              setSelectedBusiness(null)
            }}
          />
        )}

        {screen === 'directory' && (
          <DirectoryScreen
            businesses={feedBusinesses}
            onToggleTheme={() => setDarkMode((value) => !value)}
            onBack={() => goToScreen('home')}
            onOpen={(business) => {
              setSelectedBusiness(business)
              setScreen('business-detail')
            }}
          />
        )}

        {screen === 'publish' && (
          <PublishScreen
            account={account}
            local={merchantLocal}
            template={publishTemplate}
            offers={feedOffers}
            pageViews={pageViews}
            onBack={() => goToScreen('profile', { soft: true })}
            onMerchantPanel={() => setScreen('my-posts')}
            onPublishOffer={publishOffer}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'my-posts' && (
          <MyPostsScreen
            account={account}
            local={merchantLocal}
            offers={feedOffers}
            onSaveLocal={saveMerchantLocal}
            onBack={() => goToScreen('profile', { soft: true })}
            onPublish={openPublish}
            onPauseOffer={pauseOffer}
            onDeleteOffer={deleteOffer}
            onRepostOffer={repostOffer}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'admin' && (
          <AdminScreen
            businesses={adminBusinesses.length ? adminBusinesses : feedBusinesses}
            offers={feedOffers}
            onBack={() => goToScreen('profile', { soft: true })}
            onOpenBusiness={(business) => {
              setSelectedBusiness(business)
              setScreen('business-detail')
            }}
            onTogglePublic={(business) => updateAdminBusiness(
              business,
              { isPublic: !business.isPublic },
              business.isPublic ? 'Local ocultado de la guia.' : 'Local visible en la guia.',
            )}
            onToggleVerified={(business) => updateAdminBusiness(
              business,
              { verified: !business.verified },
              business.verified ? 'Local marcado como no verificado.' : 'Local verificado.',
            )}
            onActivateOrders={(business) => updateAdminBusiness(
              business,
              isFounderPlanActive(business)
                ? { plan: 'gratis', planStatus: 'free' }
                : { plan: 'pedidos', planStatus: 'active' },
              isFounderPlanActive(business) ? 'Plan fundador desactivado.' : 'Plan fundador activado.',
            )}
            onSaveNote={(business, adminNotes) => updateAdminBusiness(
              business,
              { adminNotes },
              'Nota interna guardada.',
            )}
            onEditBusiness={(business, changes) => updateAdminBusiness(
              business,
              changes,
              'Datos del comercio actualizados.',
            )}
            onDeleteBusiness={deleteBusinessAdmin}
            onOpenOffer={(offer) => {
              setSelectedOffer(offer)
              setScreen('detail')
            }}
            onPauseOffer={pauseOffer}
            onDeleteOffer={deleteOffer}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'profile' && (
          <ProfileScreen
            onBack={() => goToScreen('home')}
            onLogin={() => goToScreen('login')}
            onMerchantPanel={() => setScreen('my-posts')}
            onPublish={() => openPublish()}
            onAdmin={() => setScreen('admin')}
            onResetSession={resetSession}
            authNotice={authNotice}
            account={account}
            local={merchantLocal}
            onRegister={(type) => {
              setRegisterType(type)
              goToScreen('register')
            }}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'login' && (
          <LoginScreen
            authNotice={authNotice}
            onBack={() => goToScreen('profile', { soft: true })}
            onLogin={loginAccount}
            onForgotPassword={() => goToScreen('forgot-password')}
            onQuickAccess={loginQuick}
            allowQuickAccess={!cercaApi.isSupabaseEnabled()}
            onRegister={(type) => {
              setRegisterType(type)
              goToScreen('register')
            }}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'forgot-password' && (
          <ForgotPasswordScreen
            authNotice={authNotice}
            onBack={() => goToScreen('login', { soft: true })}
            onSubmit={requestPasswordReset}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'reset-password' && (
          <ResetPasswordScreen
            authNotice={authNotice}
            onBack={() => goToScreen('login', { soft: true })}
            onSubmit={updatePassword}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'register' && (
          <RegisterScreen
            initialType={registerType}
            onComplete={registerAccount}
            onBack={() => goToScreen('profile', { soft: true })}
            onLogin={() => goToScreen('login')}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'home' && (
          <>
            <header className="app-header">
              <div className="brand-lockup">
                <span className="app-logo">C</span>
                <div>
                  <strong>Cerca</strong>
                  <small>Liceo</small>
                </div>
              </div>
              <div className="header-actions">
                <button className="theme-button" type="button" onClick={() => setDarkMode((value) => !value)} aria-label="Cambiar modo noche">
                  <Moon size={19} />
                </button>
                <button className="notify-button" type="button" aria-label="Notificaciones">
                  <Bell size={21} />
                  <span></span>
                </button>
              </div>
            </header>

            <div className="search-panel">
              <div className="search-row">
                <Search size={20} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar en Liceo"
                />
              </div>
              <div className="section-row">
                {sections.map((section) => (
                  <button
                    className={selectedSection === section ? 'active' : ''}
                    type="button"
                    onClick={() => setSelectedSection(section)}
                    key={section}
                  >
                    {section}
                  </button>
                ))}
              </div>
            </div>

            <section className="neighbor-toolbar" aria-label="Accesos rapidos">
              <button type="button" onClick={() => {
                setSelectedCategory('Comida')
                setQuery('')
              }}>
                <Utensils size={18} />
                <span>Cena hoy</span>
              </button>
              <button type="button" onClick={() => {
                setSelectedCategory('Despensa')
                setQuery('')
              }}>
                <ShoppingBasket size={18} />
                <span>Despensa</span>
              </button>
              <button type="button" onClick={() => {
                setSelectedCategory('Servicios')
                setQuery('')
              }}>
                <Hammer size={18} />
                <span>Servicios</span>
              </button>
              <button type="button" onClick={() => setScreen('directory')}>
                <MapPin size={18} />
                <span>Mapa guia</span>
              </button>
            </section>

            <nav className="category-dock" aria-label="Categorias">
              {categories.map(({ name, icon: Icon, tone }) => (
                <button
                  className={`cat-${tone} ${selectedCategory === name ? 'active' : ''}`}
                  type="button"
                  onClick={() => setSelectedCategory(name)}
                  key={name}
                >
                  <span>
                    <Icon size={20} />
                  </span>
                  <small>{name}</small>
                </button>
              ))}
            </nav>
            <ScrollCue label="Desliza categorias" />

            <div className="home-section-title">
              <div>
                <Flame size={17} />
                <strong>Ofertas publicadas</strong>
              </div>
              <button type="button" onClick={() => setScreen('directory')}>Ver guia</button>
            </div>

            {heroOffer ? (
              <HeroDeal
                offer={heroOffer}
                onOpen={() => {
                  setSelectedOffer(heroOffer)
                  setScreen('detail')
                }}
              />
            ) : (
              <section className="empty-state home-empty-real">
                <Sparkles size={22} />
                <strong>Todavia no hay ofertas activas</strong>
                <span>Cuando un comercio publique una promo, aparece aca y se baja sola a los 3 o 4 dias.</span>
                <button type="button" onClick={() => setScreen('directory')}>Ver locales cargados</button>
              </section>
            )}

            <NeighborhoodLiveMap
              businesses={liveMapBusinesses}
              onOpen={(business) => {
                setSelectedBusiness(business)
                setScreen('business-detail')
              }}
              onDirectory={() => setScreen('directory')}
            />

            <section className="business-strip top compact-home">
              <div className="feed-head compact">
                <div>
                  <Store size={17} />
                  <strong>Locales del barrio</strong>
                </div>
                <button type="button" onClick={() => setScreen('directory')}>Ver guia</button>
              </div>
              <div className="featured-business-carousel">
                {feedBusinesses.length > 0 ? (
                  <BusinessCard
                    business={feedBusinesses[featuredBusinessIndex % feedBusinesses.length]}
                    key={feedBusinesses[featuredBusinessIndex % feedBusinesses.length].name}
                    onOpen={() => {
                      setSelectedBusiness(feedBusinesses[featuredBusinessIndex % feedBusinesses.length])
                      setScreen('business-detail')
                    }}
                  />
                ) : (
                  <div className="empty-state">
                    <Store size={22} />
                    <strong>Todavia no hay locales cargados</strong>
                    <span>Cuando los comercios completen su ficha van a aparecer aca.</span>
                  </div>
                )}
                {feedBusinesses.length > 1 && (
                  <>
                    <div className="carousel-footer">
                      <span>Van rotando para no favorecer siempre al mismo</span>
                      <div>
                        {feedBusinesses.map((business, index) => (
                          <button
                            className={index === featuredBusinessIndex ? 'active' : ''}
                            type="button"
                            aria-label={`Ver ${business.name}`}
                            key={business.id || `${business.name}-${index}`}
                            onClick={() => setFeaturedBusinessIndex(index)}
                          ></button>
                        ))}
                      </div>
                    </div>
                    <ScrollCue label="Cambian automaticamente" />
                  </>
                )}
              </div>
            </section>

            {query.trim() && (
              <section className="search-results-panel">
                <span>Busqueda activa</span>
                <h2>{filteredOffers.length} resultados cerca tuyo</h2>
                <p>Mostramos primero publicaciones vivas. Tambien podes ir a la guia para buscar locales fijos.</p>
                {filteredOffers.length > 0 && (
                  <div className="instant-results">
                    {filteredOffers.slice(0, 3).map((offer, index) => (
                      <button
                        className={`instant-card offer-${offer.tone}`}
                        type="button"
                        key={offer.id || `${offer.title}-${index}`}
                        onClick={() => {
                          setSelectedOffer(offer)
                          setScreen('detail')
                        }}
                      >
                        <strong>{offer.title}</strong>
                        <small>{offer.business} - {offer.section}</small>
                        <b>{offer.price}</b>
                      </button>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => setScreen('directory')}>Buscar en guia</button>
              </section>
            )}

            {(filteredOffers.length > 0 || query.trim()) && (
              <>
                <div className="feed-head">
                  <div>
                    <MapPin size={17} />
                    <strong>{query.trim() ? `Resultados para "${query.trim()}"` : 'Ofertas activas'}</strong>
                  </div>
                  <button type="button" onClick={() => setScreen('directory')}>{filteredOffers.length} ahora</button>
                </div>

                <section className="offer-list">
                  {filteredOffers.length > 0 ? (
                filteredOffers.map((offer, index) => (
                  <OfferCard
                    offer={offer}
                    key={offer.id || `${offer.title}-${index}`}
                    onOpen={() => {
                      setSelectedOffer(offer)
                      setScreen('detail')
                    }}
                  />
                ))
                  ) : (
                <div className="empty-state">
                  <Sparkles size={22} />
                  <strong>No encontramos eso en vivo</strong>
                  <span>Puede que no haya promo publicada ahora. Proba buscar el local fijo en la guia o limpiar filtros.</span>
                  <div className="empty-actions">
                    <button type="button" onClick={() => {
                      setSelectedCategory('Todas')
                      setSelectedSection('Todos')
                      setQuery('')
                    }}>
                      Limpiar filtros
                    </button>
                    <button type="button" onClick={() => setScreen('directory')}>
                      Ir a guia
                    </button>
                  </div>
                </div>
                  )}
                </section>
              </>
            )}

            <ContactFooter />

            <nav className="bottom-nav" aria-label="Navegacion inferior">
              <button className="active" type="button">
                <Home size={21} />
                Inicio
              </button>
              <button type="button" onClick={() => setScreen('directory')}>
                <Search size={21} />
                Explorar
              </button>
              <button className="publish" type="button" onClick={() => goToScreen('profile')}>
                <Heart size={23} />
                Favoritos
              </button>
              <button type="button" onClick={() => goToScreen('profile')}>
                <Bell size={21} />
                Avisos
              </button>
              <button type="button" onClick={() => goToScreen('profile')}>
                <UserRound size={21} />
                Mi cuenta
              </button>
            </nav>
          </>
        )}
      </section>
      <ActionToast notice={authNotice} onClose={() => setAuthNotice('')} />
    </main>
  )
}

function HeroDeal({ offer, onOpen }) {
  return (
    <section className={`hero-deal offer-${offer.tone}`} onClick={onOpen}>
      <div {...imageSurfaceProps(offer.image, 'hero-deal-image')}></div>
      <div className="hero-deal-copy">
        <span>Oferta protagonista</span>
        <small>{offer.business} - {offer.section}</small>
        <h2>{offer.title}</h2>
        <div>
          <b>{offer.price}</b>
          <button type="button" onClick={(event) => {
            event.stopPropagation()
            onOpen()
          }}>
            Ver detalle
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  )
}

function ContactFooter() {
  const supportMessage = 'Hola Cristian, vi Cerca Liceo y queria consultar por el proyecto.'
  const whatsappUrl = makeWhatsAppUrl('3517662142', supportMessage)

  return (
    <footer className="contact-footer" aria-label="Contacto y soporte">
      <div>
        <span>Proyecto local</span>
        <strong>Cerca Liceo</strong>
        <p>Creado por Cristian Eduardo Alba para conectar vecinos, comercios y ofertas del barrio.</p>
      </div>
      <div className="contact-actions">
        <a href={whatsappUrl} target="_blank" rel="noreferrer">
          <MessageCircle size={16} />
          WhatsApp
        </a>
        <a href="mailto:crisalbavideografo@gmail.com?subject=Consulta%20por%20Cerca%20Liceo">
          <Share2 size={16} />
          Email
        </a>
      </div>
      <small>Soporte: 351 766 2142 - crisalbavideografo@gmail.com</small>
    </footer>
  )
}

function ThemeToggle({ onToggleTheme }) {
  return (
    <button className="theme-button in-header" type="button" onClick={onToggleTheme} aria-label="Cambiar modo noche">
      <Moon size={19} />
    </button>
  )
}

function ActionToast({ notice, onClose }) {
  if (!notice) return null
  const noticeText = toNoticeText(notice)
  const isError = /no se pudo|falta|error|problema|fallo/i.test(noticeText)

  return (
    <aside className={`action-toast ${isError ? 'is-error' : 'is-success'}`} role="status" aria-live="polite">
      <div>
        <Check size={17} />
      </div>
      <p>{noticeText}</p>
      <button type="button" onClick={onClose} aria-label="Cerrar aviso">×</button>
    </aside>
  )
}

function ScrollCue({ label = 'Desliza para ver mas' }) {
  return (
    <div className="scroll-cue" aria-hidden="true">
      <span>{label}</span>
      <i></i>
      <ChevronRight size={14} />
    </div>
  )
}

function NeighborhoodLiveMap({ businesses = [], onOpen, onDirectory }) {
  const visibleBusinesses = businesses.filter((business) => business.isPublic !== false).slice(0, 8)
  const openBusinesses = visibleBusinesses.filter((business) => getOpenStatus(business).open)
  const pinPositions = [
    { x: 34, y: 45 },
    { x: 56, y: 36 },
    { x: 72, y: 52 },
    { x: 44, y: 68 },
    { x: 22, y: 58 },
    { x: 66, y: 72 },
    { x: 82, y: 34 },
    { x: 30, y: 28 },
  ]

  return (
    <section className="live-map-card" aria-label="Mapa vivo de locales del barrio">
      <div className="live-map-head">
        <div>
          <span>Locales cerca</span>
          <strong>Mapa vivo del barrio</strong>
          <small>{openBusinesses.length} abiertos ahora - {visibleBusinesses.length} en el radar</small>
        </div>
        <a href={liceoMapUrl} target="_blank" rel="noreferrer">
          Abrir Maps
          <Navigation size={14} />
        </a>
      </div>

      <div className="live-map-canvas">
        <span className="map-zone zone-procrear">Liceo Procrear</span>
        <span className="map-zone zone-1">1ra seccion</span>
        <span className="map-zone zone-2">2da seccion</span>
        <span className="map-zone zone-3">3ra seccion</span>
        <i className="map-road road-one"></i>
        <i className="map-road road-two"></i>
        <i className="map-road road-three"></i>

        {visibleBusinesses.length ? (
          visibleBusinesses.map((business, index) => {
            const status = getOpenStatus(business)
            const position = pinPositions[index % pinPositions.length]

            return (
              <button
                className={`live-map-pin ${status.open ? 'is-open' : 'is-closed'}`}
                type="button"
                style={{ '--x': `${position.x}%`, '--y': `${position.y}%` }}
                key={business.id || `${business.name}-${index}`}
                onClick={() => onOpen(business)}
                aria-label={`Abrir ${business.name}`}
              >
                <span>{business.category.slice(0, 1)}</span>
                <b>{business.name}</b>
              </button>
            )
          })
        ) : (
          <div className="live-map-empty">
            <Store size={20} />
            <strong>Todavia no hay locales cargados</strong>
          </div>
        )}
      </div>

      <div className="live-map-list">
        {visibleBusinesses.slice(0, 5).map((business, index) => {
          const status = getOpenStatus(business)

          return (
            <button type="button" key={business.id || `${business.name}-chip-${index}`} onClick={() => onOpen(business)}>
              <i className={status.open ? 'is-open' : 'is-closed'}></i>
              <span>{business.name}</span>
              <small>{business.section}</small>
            </button>
          )
        })}
        <button className="see-all" type="button" onClick={onDirectory}>
          Ver todos
          <ChevronRight size={14} />
        </button>
      </div>
      <ScrollCue label="Toca un pin o desliza locales" />
    </section>
  )
}

function PublishScreen({ account, local, template, offers = [], onBack, onMerchantPanel, onPublishOffer, onToggleTheme }) {
  const firstOfferTemplate = {
    title: local?.category === 'Comida' ? 'Promo del dia' : 'Oferta del barrio',
    description: 'Contale al vecino que incluye, hasta cuando vale y como pedirlo por WhatsApp.',
    price: 'Consultar',
    image: local?.image || 'milanesa',
    business: local?.name || account?.businessName || 'Mi local',
    category: local?.category || account?.category || 'Comida',
    section: local?.section || account?.section || 'Liceo Procrear',
    address: local?.address || '',
    reference: local?.reference || 'Referencia a completar',
    hours: local?.hours || 'Horario a confirmar',
    tone: local?.tone || 'orange',
  }
  const suggestedOffer = offers.find((offer) => offer.category === local?.category) || offers[0] || firstOfferTemplate
  const [offerDraft, setOfferDraft] = useState({
    title: template?.title || suggestedOffer.title,
    description: template?.description || suggestedOffer.description,
    price: template?.price || suggestedOffer.price,
    image: template?.image || local?.image || suggestedOffer.image,
    expiresInDays: 4,
    hasPrice: (template?.price || suggestedOffer.price) !== 'Consultar',
    ordersEnabled: isFounderPlanActive(local),
    hasDelivery: String(local?.delivery || '').toLowerCase().includes('delivery'),
    orderHours: local?.hours || '20:00 a 00:30',
    deliveryZone: local?.section || 'Liceo Procrear',
    eta: '30 a 45 min',
  })
  const previewOffer = {
    ...suggestedOffer,
    title: offerDraft.title || suggestedOffer.title,
    description: offerDraft.description || suggestedOffer.description,
    price: offerDraft.hasPrice ? offerDraft.price || 'Consultar' : 'Consultar',
    expires: `${offerDraft.expiresInDays} dias`,
    business: local?.name || suggestedOffer.business,
    category: local?.category || suggestedOffer.category,
    section: local?.section || suggestedOffer.section,
    address: local?.address || suggestedOffer.address,
    reference: local?.reference || suggestedOffer.reference,
    hours: local?.hours || suggestedOffer.hours,
    image: offerDraft.image || local?.image || suggestedOffer.image,
  }
  const hasMerchantAccount = account?.type === 'merchant'
  const canPublish = hasMerchantAccount && local
  const weekStart = Date.now() - 7 * 86400000
  const weeklyPosts = offers.filter((offer) => (
    (offer.businessId === local?.id || offer.business === local?.name) &&
    new Date(offer.createdAt || Date.now()).getTime() >= weekStart
  ))
  const freePostUsed = weeklyPosts.length > 0 && !template
  const founderActive = isFounderPlanActive(local)
  const canUseExtraPost = !freePostUsed || founderActive
  const founderPlanUrl = makeWhatsAppUrl(
    '3517662142',
    `Hola Cristian, quiero pedir el plan fundador Liceo para ${local?.name || account?.businessName || 'mi comercio'}. Necesito mini carta, 4 publicaciones extra al mes y pedidos por WhatsApp.`,
  )
  const [publishStatus, setPublishStatus] = useState('')
  const publishMissing = [
    !String(offerDraft.title || '').trim() && 'titulo',
    offerDraft.hasPrice && !String(offerDraft.price || '').trim() && 'precio o desactivar precio',
    !String(offerDraft.description || '').trim() && 'descripcion corta',
    !local?.whatsapp && 'WhatsApp del local',
  ].filter(Boolean)
  const canSendOffer = canPublish && publishMissing.length === 0 && canUseExtraPost
  const updateOfferDraft = (field, value) => {
    setOfferDraft((current) => ({ ...current, [field]: value }))
    setPublishStatus('')
  }

  const applySuggestion = () => {
    setOfferDraft((current) => ({
      ...current,
      title: suggestedOffer.title,
      description: suggestedOffer.description,
      price: suggestedOffer.price,
      hasPrice: suggestedOffer.price !== 'Consultar',
    }))
  }

  const handleOfferPhoto = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const image = await readCompressedImage(file)
    updateOfferDraft('image', image)
  }

  const publishPreparedOffer = async () => {
    if (!canSendOffer) {
      setPublishStatus(canPublish ? `Falta completar: ${publishMissing.join(', ')}.` : 'Primero carga la ficha del local.')
      return
    }
    const result = await onPublishOffer({
      business: local,
      title: previewOffer.title,
      description: previewOffer.description,
      priceLabel: previewOffer.price,
      imageKey: previewOffer.image,
      expiresInDays: offerDraft.expiresInDays,
    })
    setPublishStatus(result.message)
  }

  return (
    <div className="utility-screen publish-screen">
      <header className="detail-header">
        <button type="button" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <strong>Publicar</strong>
        <ThemeToggle onToggleTheme={onToggleTheme} />
      </header>

      <section className="publish-hero">
        <span>{template ? 'Editar similar' : canPublish ? '1 gratis por semana' : 'Antes de publicar'}</span>
        <h1>{template ? 'Ajusta esta promo y publicala de nuevo.' : canPublish ? 'Subi una promo que se vea fuerte en el feed.' : 'Primero deja tu local listo.'}</h1>
        <p>{template ? 'Trajimos el texto, precio y foto de la publicacion anterior. Cambia lo necesario y sale como una nueva promo.' : canPublish ? 'Elegis rubro, seccion, precio opcional, direccion y WhatsApp. La promo dura 3 o 4 dias y despues se baja sola.' : 'Para que la publicacion sea confiable, primero cargamos nombre del local, direccion, horario y WhatsApp.'}</p>
      </section>

      <section className="merchant-status-card">
        <div>
          <span>Estado para publicar</span>
          <h2>{canPublish ? `${local.name} puede publicar hoy.` : hasMerchantAccount ? 'Falta cargar la ficha del local.' : 'Falta crear cuenta comercio.'}</h2>
        <p>{canPublish ? (freePostUsed ? (founderActive ? 'Ya usaste la gratis. Como tenes plan fundador, podes usar una publicacion extra del mes.' : 'Ya usaste la promo gratis de esta semana. Para publicar extras, pedi el plan fundador y te lo activa el admin.') : 'Tenes 1 publicacion semanal gratis. Dura 3 o 4 dias y se baja sola.') : 'No se pide tarjeta ni pago para empezar. La ficha del local queda gratis y visible para vecinos.'}</p>
        </div>
        <button type="button" onClick={onMerchantPanel}>
          {canPublish ? 'Ver panel' : 'Completar local'}
        </button>
      </section>

      <section className="upload-stage">
        <div>
          <Camera size={24} />
          <strong>{isUploadedImage(offerDraft.image) ? 'Foto de la promo cargada' : 'Subi foto de la promo'}</strong>
          <span>Se usa como tapa en el feed y en el detalle.</span>
        </div>
        <label className="file-pill">
          <input type="file" accept="image/*" onChange={handleOfferPhoto} />
          {isUploadedImage(offerDraft.image) ? 'Cambiar foto' : 'Agregar foto'}
        </label>
      </section>

      <section className="publish-grid">
        <div className="template-card wide">
          <span>{freePostUsed ? 'Publicacion extra' : 'Publicacion semanal gratis'}</span>
          <strong>{freePostUsed ? 'Ya usaste la gratis de esta semana.' : 'Carga una promo simple y clara.'}</strong>
          <p>{freePostUsed ? (founderActive ? 'Esta sale como extra del plan fundador.' : 'Disponible cuando el admin active tu plan fundador.') : 'La promo queda visible 3 o 4 dias y despues se baja sola.'}</p>
        </div>
        <div className="fake-field wide progress-field">
          <span>Calidad de publicacion</span>
          <strong>{publishMissing.length === 0 ? 'Lista para salir' : `Falta ${publishMissing[0]}`}</strong>
          <i></i>
        </div>
        <div className="suggestion-row wide">
          <button type="button" onClick={applySuggestion}>Usar texto sugerido</button>
          <button type="button" onClick={() => updateOfferDraft('title', `${previewOffer.title} de hoy`)}>Duplicar y adaptar</button>
        </div>
        <label className="publish-field wide">
          <span>Titulo</span>
          <input value={offerDraft.title} onChange={(event) => updateOfferDraft('title', event.target.value)} placeholder="Ej: Promo del dia, combo, producto o servicio" />
        </label>
        <div className="fake-field">
          <span>Rubro</span>
          <strong>{local?.category || 'Desde tu local'}</strong>
        </div>
        <div className="fake-field">
          <span>Seccion</span>
          <strong>{local?.section || 'Pendiente'}</strong>
        </div>
        <label className="publish-field">
          <span>Precio</span>
          <input value={offerDraft.price} onChange={(event) => updateOfferDraft('price', event.target.value)} placeholder="$6.500 o Consultar" disabled={!offerDraft.hasPrice} />
        </label>
        <label className="publish-field select-field">
          <span>Vigencia</span>
          <select value={offerDraft.expiresInDays} onChange={(event) => updateOfferDraft('expiresInDays', Number(event.target.value))}>
            <option value={3}>3 dias</option>
            <option value={4}>4 dias</option>
          </select>
        </label>
        <label className="publish-toggle wide">
          <input type="checkbox" checked={offerDraft.hasPrice} onChange={(event) => updateOfferDraft('hasPrice', event.target.checked)} />
          <span>Mostrar precio en la publicacion</span>
        </label>
        <label className="publish-field wide text-field">
          <span>Descripcion corta</span>
          <textarea value={offerDraft.description} onChange={(event) => updateOfferDraft('description', event.target.value)} placeholder="Conta que incluye, hasta cuando vale y como pedirlo." />
        </label>
        <div className="fake-field wide">
          <span>Direccion o referencia</span>
          <strong>{local?.address || 'Cargala desde el panel comercio'}</strong>
        </div>
        <div className="fake-field wide">
          <span>WhatsApp</span>
          <strong>{local?.whatsapp || account?.whatsapp || 'Pendiente'}</strong>
        </div>
      </section>

      {founderActive && (
      <section className="delivery-setup">
        <div className="delivery-setup-copy">
          <span>Para comida nocturna</span>
          <h2>Configura pedidos, delivery y horario.</h2>
          <p>Ideal para locales que venden de noche: el vecino sabe si puede pedir envio, retirar o consultar antes de escribir.</p>
        </div>
        <div className="delivery-toggle-grid">
          <button className={offerDraft.ordersEnabled ? 'active' : ''} type="button" onClick={() => updateOfferDraft('ordersEnabled', !offerDraft.ordersEnabled)}>
            <strong>Pedidos activos</strong>
            <small>Recibir pedido armado por WhatsApp</small>
          </button>
          <button className={offerDraft.hasDelivery ? 'active' : ''} type="button" onClick={() => updateOfferDraft('hasDelivery', !offerDraft.hasDelivery)}>
            <strong>{offerDraft.hasDelivery ? 'Delivery si' : 'Sin delivery'}</strong>
            <small>Mostrar opcion de envio</small>
          </button>
        </div>
        <div className="delivery-fields">
          <label>
            <span>Horario de pedidos</span>
            <input value={offerDraft.orderHours} onChange={(event) => updateOfferDraft('orderHours', event.target.value)} />
          </label>
          <label>
            <span>Zona de delivery</span>
            <input value={offerDraft.deliveryZone} onChange={(event) => updateOfferDraft('deliveryZone', event.target.value)} disabled={!offerDraft.hasDelivery} />
          </label>
          <label>
            <span>Demora estimada</span>
            <input value={offerDraft.eta} onChange={(event) => updateOfferDraft('eta', event.target.value)} disabled={!offerDraft.ordersEnabled} />
          </label>
        </div>
      </section>
      )}

      <section className="live-preview">
        <div className="feed-head compact">
          <div>
            <Sparkles size={17} />
            <strong>Vista previa</strong>
          </div>
          <span>En inicio</span>
        </div>
        <OfferCard offer={previewOffer} onOpen={() => {}} />
      </section>

      {publishStatus && (
        <section className={`auth-notice publish-ready ${publishStatus.startsWith('Falta') || publishStatus.startsWith('Primero') ? 'needs-attention' : ''}`}>
          <Check size={16} />
          <span>{publishStatus}</span>
        </section>
      )}

      <div className="publish-checks">
        <span><Check size={15} /> 1 semanal gratis</span>
        <span><Check size={15} /> Precio opcional</span>
        <span><Check size={15} /> Baja automatica</span>
        <span><Check size={15} /> Sin comision</span>
      </div>

      <button
        className="primary-action"
        type="button"
        onClick={canPublish
          ? (freePostUsed && !founderActive ? () => window.open(founderPlanUrl, '_blank', 'noopener,noreferrer') : publishPreparedOffer)
          : onMerchantPanel}
      >
        {canPublish ? (canSendOffer ? (freePostUsed ? 'Publicar extra fundador' : 'Publicar gratis') : freePostUsed && !founderActive ? 'Pedir plan fundador' : `Completar ${publishMissing[0]}`) : 'Completar local primero'}
      </button>
    </div>
  )
}

function MyPostsScreen({ account, local, offers = [], onSaveLocal, onBack, onPublish, onPauseOffer, onDeleteOffer, onRepostOffer, onToggleTheme }) {
  const [openPanel, setOpenPanel] = useState(local ? 'preview' : 'basic')
  const [saveStatus, setSaveStatus] = useState('')
  const [localDraft, setLocalDraft] = useState(() => buildLocalDraft(local, account))

  useEffect(() => {
    if (!local?.id) return
    setLocalDraft(buildLocalDraft(local, account))
    setOpenPanel('preview')
  }, [local, account])

  const updateLocalDraft = (field, value) => {
    setLocalDraft((current) => ({ ...current, [field]: value }))
    setSaveStatus('')
  }

  const updateBusinessType = (businessType) => {
    setLocalDraft((current) => ({
      ...current,
      businessType,
      hasPublicAddress: businessType === 'local' ? current.hasPublicAddress !== false : false,
      delivery: businessType === 'entrepreneur' && current.delivery === 'Retiro y delivery' ? 'Por encargo' : current.delivery,
    }))
    setSaveStatus('')
  }

  const handleLocalPhoto = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const image = await readCompressedImage(file)
    updateLocalDraft('image', image)
  }

  const toggleOpenDay = (day) => {
    setLocalDraft((current) => {
      const hasDay = current.openDays.includes(day)
      const nextDays = hasDay
        ? current.openDays.filter((item) => item !== day)
        : weekDays.filter((item) => [...current.openDays, day].includes(item))
      return { ...current, openDays: nextDays }
    })
    setSaveStatus('')
  }

  const updateMenuItem = (index, field, value) => {
    setLocalDraft((current) => ({
      ...current,
      menu: ensureMenuSlots(current.menu).map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }))
    setSaveStatus('')
  }

  const clearMenuItem = (index) => {
    setLocalDraft((current) => ({
      ...current,
      menu: ensureMenuSlots(current.menu).map((item, itemIndex) => (
        itemIndex === index ? createMenuSlot(index) : item
      )),
    }))
    setSaveStatus('')
  }

  const saveLocal = async () => {
    const needsPublicAddress = localDraft.businessType !== 'entrepreneur' && localDraft.hasPublicAddress !== false
    const missing = [
      !localDraft.name.trim() && (localDraft.businessType === 'entrepreneur' ? 'nombre del emprendimiento' : 'nombre del local'),
      !localDraft.whatsapp.trim() && 'WhatsApp',
      needsPublicAddress && !localDraft.address.trim() && 'direccion o referencia',
      !localDraft.openDays.length && 'dias que abre',
      (!localDraft.openTime.trim() || !localDraft.closeTime.trim()) && 'horario',
    ].filter(Boolean)

    if (missing.length) {
      setSaveStatus(`Falta completar: ${missing.join(', ')}.`)
      setOpenPanel(!localDraft.name.trim() || !localDraft.whatsapp.trim() ? 'basic' : 'location')
      return
    }

    setSaveStatus('Guardando cambios...')
    const result = await onSaveLocal({
      ...localDraft,
      name: localDraft.name || 'Mi local',
      hours: formatSchedule(localDraft),
      menu: ensureMenuSlots(localDraft.menu),
      ready: true,
    })

    if (result?.ok === false) {
      setSaveStatus(result.error?.message || 'No se pudo guardar. Revisa los datos e intenta de nuevo.')
      return
    }

    setSaveStatus(result?.warning || 'Local guardado. Ya aparece en la guia del barrio.')
    setOpenPanel(result?.warning ? 'photo' : 'preview')
  }

  const completedFields = [
    localDraft.name,
    localDraft.businessType,
    localDraft.category,
    localDraft.section,
    hasBusinessPublicAddress(localDraft) || localDraft.businessType === 'entrepreneur',
    localDraft.openDays.length,
    localDraft.openTime,
    localDraft.closeTime,
    localDraft.whatsapp,
    isUploadedImage(localDraft.image),
  ].filter(Boolean).length
  const completion = Math.round((completedFields / 10) * 100)
  const scheduleLabel = formatSchedule(localDraft)
  const founderActive = isFounderPlanActive(localDraft)
  const founderRequested = isFounderPlanRequested(localDraft)
  const dashboardTasks = [
    {
      id: 'basic',
      done: Boolean(localDraft.name && localDraft.whatsapp),
      title: 'Datos basicos',
      meta: localDraft.name && localDraft.whatsapp ? 'Nombre y WhatsApp listos' : 'Nombre y WhatsApp',
    },
    {
      id: 'photo',
      done: isUploadedImage(localDraft.image),
      title: 'Foto real',
      meta: isUploadedImage(localDraft.image) ? 'Foto cargada' : 'Subi una foto propia',
    },
    {
      id: 'location',
      done: Boolean((hasBusinessPublicAddress(localDraft) || localDraft.businessType === 'entrepreneur') && localDraft.openDays.length && localDraft.openTime && localDraft.closeTime),
      title: localDraft.businessType === 'entrepreneur' ? 'Zona y horario' : 'Direccion y horario',
      meta: hasBusinessPublicAddress(localDraft) || localDraft.businessType === 'entrepreneur' ? scheduleLabel : 'Direccion, dias y horas',
    },
    {
      id: 'menu',
      done: founderActive,
      title: 'Mini carta',
      meta: founderActive ? 'Plan fundador activo' : founderRequested ? 'Solicitud pendiente' : 'Plan fundador',
    },
    {
      id: 'plan',
      done: Boolean(localDraft.plan),
      title: 'Plan',
      meta: founderActive ? 'Fundador activo' : founderRequested ? 'Fundador pendiente' : 'Ficha gratis',
    },
  ]
  const pendingTasks = dashboardTasks.filter((task) => !task.done)
  const nextPanel = pendingTasks[0]?.id || 'preview'
  const localIsPublic = Boolean(local)
  const publicStateLabel = localIsPublic
    ? pendingTasks.length
      ? 'Visible con pendientes'
      : 'Local completo'
    : 'Alta pendiente'
  const planLabel = founderActive ? 'Plan fundador activo' : founderRequested ? 'Fundador pendiente' : 'Ficha gratis'
  const founderPlanUrl = makeWhatsAppUrl(
    '3517662142',
    `Hola Cristian, quiero activar el plan fundador Liceo para ${localDraft.name || account?.businessName || 'mi comercio'}. Me interesa mini carta, 4 publicaciones extra al mes y pedidos por WhatsApp.`
  )
  const filledMenuItems = ensureMenuSlots(localDraft.menu).filter((item) => item.name.trim())
  const localOffers = offers.filter((offer) => (
    offer.businessId === local?.id ||
    offer.business === local?.name ||
    (!local && account?.businessName && offer.business === account.businessName)
  ))
  const activeLocalOffers = localOffers.filter((offer) => offer.open !== false)
  const pausedLocalOffers = localOffers.filter((offer) => offer.open === false)

  const panelButton = (id, eyebrow, title, meta, Icon) => (
    <button
      className={`merchant-panel-trigger ${openPanel === id ? 'active' : ''}`}
      type="button"
      onClick={() => setOpenPanel(openPanel === id ? '' : id)}
      aria-expanded={openPanel === id}
    >
      <Icon size={18} />
      <span>
        <small>{eyebrow}</small>
        <strong>{title}</strong>
      </span>
      <em>{meta}</em>
      <ChevronRight size={18} />
    </button>
  )

  if (account && account.type !== 'merchant') {
    return (
      <div className="utility-screen posts-screen">
        <header className="detail-header">
          <button type="button" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <strong>Panel comercio</strong>
          <ThemeToggle onToggleTheme={onToggleTheme} />
        </header>
        <section className="merchant-empty-posts account-gate">
          <Store size={24} />
          <strong>Esta seccion es para comercios.</strong>
          <p>Como vecino podes mirar ofertas gratis. Si tambien tenes un local, crea una cuenta comercio para cargar ficha, foto, horario y publicaciones.</p>
          <button type="button" onClick={onBack}>Volver a mi cuenta</button>
        </section>
      </div>
    )
  }

  return (
    <div className="utility-screen posts-screen">
      <header className="detail-header">
        <button type="button" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <strong>Mis publicaciones</strong>
        <ThemeToggle onToggleTheme={onToggleTheme} />
      </header>

      <section className="merchant-dashboard-hero">
        <div className="merchant-hero-copy">
          <span>{publicStateLabel}</span>
          <h1>{localDraft.name || 'Tu local'}</h1>
          <p>{localIsPublic ? `Aparece en la guia como ${localDraft.category} en ${localDraft.section}. ${pendingTasks.length ? 'Completa los pendientes para que se vea mas confiable.' : 'Ya esta listo para recibir consultas.'}` : 'Completa los datos importantes y guardalo para aparecer gratis en la guia.'}</p>
        </div>
        <div className="merchant-score-card">
          <strong>{completion}%</strong>
          <span>{pendingTasks.length ? `${pendingTasks.length} pendientes` : 'Listo'}</span>
          <i style={{ '--progress': `${completion}%` }}></i>
        </div>
      </section>

      <section className="dashboard-actions" aria-label="Acciones principales del comercio">
        <button type="button" onClick={() => setOpenPanel(nextPanel)}>
          <Check size={18} />
          <span>{pendingTasks.length ? 'Completar pendiente' : 'Ver ficha'}</span>
        </button>
        <button type="button" onClick={() => onPublish()}>
          <Flame size={18} />
          <span>Publicar promo</span>
        </button>
        <button type="button" onClick={() => setOpenPanel(founderActive ? 'menu' : 'plan')}>
          <ShoppingBasket size={18} />
          <span>{founderActive ? 'Mini carta' : 'Plan fundador'}</span>
        </button>
      </section>

      <section className="dashboard-status-card">
        <div>
          <span>Estado actual</span>
          <strong>{planLabel}</strong>
          <p>{localIsPublic ? (founderActive ? 'Mini carta, pedidos y publicaciones extra estan activos.' : founderRequested ? 'Tu ficha gratis sigue visible. El plan fundador queda pendiente hasta que el admin lo active.' : 'Tu ficha queda gratis con 1 promo semanal. Mini carta, pedidos y extras se piden aparte.') : 'Todavia no esta publicada. Guardala cuando completes los datos basicos.'}</p>
        </div>
        <button type="button" onClick={saveLocal}>{localIsPublic ? 'Actualizar' : 'Guardar'}</button>
      </section>

      <section className="dashboard-checklist" aria-label="Checklist del local">
        {dashboardTasks.map((task) => (
          <button className={task.done ? 'done' : 'todo'} type="button" key={task.id} onClick={() => setOpenPanel(task.id)}>
            <b>{task.done ? <Check size={15} /> : <ChevronRight size={15} />}</b>
            <span>
              <strong>{task.title}</strong>
              <small>{task.meta}</small>
            </span>
          </button>
        ))}
      </section>

      <section className="dashboard-metrics" aria-label="Resumen del comercio">
        <article>
          <strong>{activeLocalOffers.length}</strong>
          <span>promos activas</span>
        </article>
        <article>
          <strong>{localDraft.openDays.length}</strong>
          <span>dias abierto</span>
        </article>
        <article>
          <strong>{filledMenuItems.length}</strong>
          <span>productos en carta</span>
        </article>
      </section>

      <section className="dashboard-tip">
        <div>
          <Timer size={18} />
          <strong>Consejo para vender mas</strong>
        </div>
        <p>Publica promos cerca de la hora de compra: comida entre 18 y 22, panaderia temprano y despensa al mediodia.</p>
      </section>

      <section className="local-builder">
        <div className="merchant-hub-head">
          <div>
            <span>Configuracion guiada</span>
            <h2>{localDraft.name || 'Tu local'}</h2>
            <p>{completion}% listo para mostrarse bien en la guia.</p>
          </div>
          <div className="merchant-hub-meter" style={{ '--progress': `${completion}%` }}>
            <strong>{completion}%</strong>
            <i></i>
          </div>
        </div>

        <div className="merchant-panel-stack">
          {saveStatus && (
            <section className={`auth-notice local-save-note ${saveStatus.startsWith('Falta') || saveStatus.includes('temporal') ? 'needs-attention' : ''}`}>
              <Check size={16} />
              <span>{saveStatus}</span>
            </section>
          )}

          {panelButton('basic', 'Paso 1', 'Datos basicos', localDraft.name ? 'Completo' : 'Pendiente', Store)}
          {openPanel === 'basic' && (
            <div className="merchant-panel-body">
              <section className="presence-selector" aria-label="Tipo de comercio">
                <button
                  className={localDraft.businessType !== 'entrepreneur' ? 'active' : ''}
                  type="button"
                  onClick={() => updateBusinessType('local')}
                >
                  <Store size={17} />
                  <span>Tengo local</span>
                  <small>Muestro direccion y como llegar.</small>
                </button>
                <button
                  className={localDraft.businessType === 'entrepreneur' ? 'active' : ''}
                  type="button"
                  onClick={() => updateBusinessType('entrepreneur')}
                >
                  <UserRound size={17} />
                  <span>Soy emprendedor</span>
                  <small>Sin direccion publica. Contacto directo.</small>
                </button>
              </section>
              <div className="presence-note">
                <ShieldCheck size={16} />
                <span>{localDraft.businessType === 'entrepreneur' ? 'Sin direccion publica. Te contactan por WhatsApp o Instagram.' : 'Con direccion publica y boton para llegar.'}</span>
              </div>
              <div className="local-builder-fields">
                <label>
                  <span>{localDraft.businessType === 'entrepreneur' ? 'Nombre del emprendimiento' : 'Nombre del local'}</span>
                  <input value={localDraft.name} onChange={(event) => updateLocalDraft('name', event.target.value)} placeholder={localDraft.businessType === 'entrepreneur' ? 'Ej: Dulces de Lau' : 'Ej: Lo de Meli'} />
                </label>
                <label>
                  <span>Rubro</span>
                  <select value={localDraft.category} onChange={(event) => {
                    const category = event.target.value
                    const imageByCategory = {
                      Comida: 'milanesa',
                      Panaderia: 'bread',
                      Verduleria: 'veggie',
                      Despensa: 'pantry',
                      Ferreteria: 'tools',
                      Belleza: 'beauty',
                    }
                    updateLocalDraft('category', category)
                    updateLocalDraft('image', imageByCategory[category] || 'milanesa')
                  }}>
                    <option>Comida</option>
                    <option>Panaderia</option>
                    <option>Verduleria</option>
                    <option>Despensa</option>
                    <option>Ferreteria</option>
                    <option>Belleza</option>
                  </select>
                </label>
                <label>
                  <span>WhatsApp</span>
                  <input value={localDraft.whatsapp} onChange={(event) => updateLocalDraft('whatsapp', event.target.value)} placeholder="351 000 0000" />
                </label>
                <label>
                  <span>Instagram</span>
                  <input value={localDraft.instagram} onChange={(event) => updateLocalDraft('instagram', event.target.value)} placeholder="@mi_local" />
                </label>
                <label>
                  <span>Medios de pago</span>
                  <input value={localDraft.paymentMethods} onChange={(event) => updateLocalDraft('paymentMethods', event.target.value)} placeholder="Efectivo, transferencia..." />
                </label>
                <label className="wide">
                  <span>Descripcion corta</span>
                  <input value={localDraft.description} onChange={(event) => updateLocalDraft('description', event.target.value)} placeholder="Que vendes, que te diferencia o que deberia saber el vecino" />
                </label>
              </div>
            </div>
          )}

          {panelButton('photo', 'Paso 2', 'Foto y encuadre', isUploadedImage(localDraft.image) ? 'Foto cargada' : localDraft.category || 'Elegir', Camera)}
          {openPanel === 'photo' && (
            <div className="merchant-panel-body">
              <div className="local-builder-top">
                <div {...imageSurfaceProps(localDraft.image, 'local-builder-photo', localDraft)}>
                  <span>Foto del local</span>
                </div>
                <div className="local-photo-actions">
                  <span>Imagen principal</span>
                  <strong>{isUploadedImage(localDraft.image) ? 'Foto propia cargada' : localDraft.category || 'Rubro'}</strong>
                  <p>La foto puede ser del frente, mostrador o producto estrella. Tiene que ayudar al vecino a reconocer el local rapido.</p>
                  <label className="file-pill wide-file">
                    <input type="file" accept="image/*" onChange={handleLocalPhoto} />
                    {isUploadedImage(localDraft.image) ? 'Cambiar foto del local' : 'Cargar foto del local'}
                  </label>
                  {isUploadedImage(localDraft.image) && (
                    <div className="photo-adjust-panel" aria-label="Ajustar foto del local">
                      <label>
                        <span>Zoom</span>
                        <input type="range" min="100" max="180" step="5" value={localDraft.imageZoom} onChange={(event) => updateLocalDraft('imageZoom', Number(event.target.value))} />
                      </label>
                      <div>
                        <span>Encuadre</span>
                        <button className={localDraft.imagePosition === 'center top' ? 'active' : ''} type="button" onClick={() => updateLocalDraft('imagePosition', 'center top')}>Arriba</button>
                        <button className={localDraft.imagePosition === 'center center' ? 'active' : ''} type="button" onClick={() => updateLocalDraft('imagePosition', 'center center')}>Centro</button>
                        <button className={localDraft.imagePosition === 'center bottom' ? 'active' : ''} type="button" onClick={() => updateLocalDraft('imagePosition', 'center bottom')}>Abajo</button>
                      </div>
                    </div>
                  )}
                  <div>
                    <button type="button" onClick={() => updateLocalDraft('image', 'milanesa')}>Comida</button>
                    <button type="button" onClick={() => updateLocalDraft('image', 'bread')}>Panaderia</button>
                    <button type="button" onClick={() => updateLocalDraft('image', 'pantry')}>Despensa</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {panelButton('location', 'Paso 3', localDraft.businessType === 'entrepreneur' ? 'Zona, dias y horario' : 'Direccion, dias y horario', dashboardTasks.find((task) => task.id === 'location')?.done ? 'Completo' : 'Pendiente', MapPin)}
          {openPanel === 'location' && (
            <div className="merchant-panel-body">
              <section className={`local-map-editor ${localDraft.businessType === 'entrepreneur' ? 'contact-first' : ''}`}>
                <div className="local-map-preview">
                  {localDraft.businessType === 'entrepreneur' ? <MessageCircle size={24} /> : <MapPin size={24} />}
                  <strong>{localDraft.section}</strong>
                  <span>
                    {localDraft.businessType === 'entrepreneur'
                      ? 'Sin direccion publica'
                      : localDraft.address || 'Direccion pendiente'}
                  </span>
                  <small>{scheduleLabel}</small>
                  <i></i>
                </div>
                <div className="local-map-copy">
                  <span>{localDraft.businessType === 'entrepreneur' ? 'Contacto directo' : 'Ubicacion publica'}</span>
                  <h3>{localDraft.businessType === 'entrepreneur' ? 'Que te consulten sin exponer una direccion.' : 'Que el vecino sepa donde queda antes de escribir.'}</h3>
                  <p>{localDraft.businessType === 'entrepreneur' ? 'Ideal para venta por encargo, servicios a domicilio, Instagram o WhatsApp. La direccion queda opcional.' : 'Carga direccion exacta o referencia. Despues se puede abrir directo en Google Maps.'}</p>
                </div>
              </section>
              <div className="local-builder-fields compact">
                <label>
                  <span>Seccion</span>
                  <select value={localDraft.section} onChange={(event) => updateLocalDraft('section', event.target.value)}>
                    <option>Liceo Procrear</option>
                    <option>Liceo 1ra</option>
                    <option>Liceo 2da</option>
                    <option>Liceo 3ra</option>
                  </select>
                </label>
                {localDraft.businessType !== 'entrepreneur' && (
                  <label className="inline-toggle-field">
                    <span>Mostrar direccion publica</span>
                    <button
                      className={localDraft.hasPublicAddress !== false ? 'active' : ''}
                      type="button"
                      onClick={() => updateLocalDraft('hasPublicAddress', localDraft.hasPublicAddress === false)}
                    >
                      {localDraft.hasPublicAddress !== false ? 'Si' : 'No'}
                    </button>
                  </label>
                )}
                <label>
                  <span>{localDraft.businessType === 'entrepreneur' || localDraft.hasPublicAddress === false ? 'Zona o referencia' : 'Direccion'}</span>
                  <input
                    value={localDraft.address}
                    onChange={(event) => updateLocalDraft('address', event.target.value)}
                    placeholder={localDraft.businessType === 'entrepreneur' || localDraft.hasPublicAddress === false ? 'Ej: Liceo Procrear, entrego por zona' : 'Mza, calle o referencia'}
                  />
                </label>
                <label className="wide">
                  <span>Referencia para llegar</span>
                  <input value={localDraft.reference} onChange={(event) => updateLocalDraft('reference', event.target.value)} placeholder={localDraft.businessType === 'entrepreneur' ? 'Ej: coordino punto de entrega o envio por zona' : 'Ej: frente a la plaza, porton negro...'} />
                </label>
                <div className="open-days-field wide">
                  <span>Dias que abre</span>
                  <div>
                    {weekDays.map((day) => (
                      <button className={localDraft.openDays.includes(day) ? 'active' : ''} type="button" key={day} onClick={() => toggleOpenDay(day)}>
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <label>
                  <span>Abre</span>
                  <input value={localDraft.openTime} onChange={(event) => updateLocalDraft('openTime', event.target.value)} placeholder="09:00" />
                </label>
                <label>
                  <span>Cierra</span>
                  <input value={localDraft.closeTime} onChange={(event) => updateLocalDraft('closeTime', event.target.value)} placeholder="21:00" />
                </label>
                <div className="schedule-preview wide">
                  <Clock3 size={15} />
                  <strong>{scheduleLabel}</strong>
                </div>
                <label>
                  <span>Entrega</span>
                  <select value={localDraft.delivery} onChange={(event) => updateLocalDraft('delivery', event.target.value)}>
                    <option>Retiro y delivery</option>
                    <option>Solo retiro</option>
                    <option>Delivery propio</option>
                    <option>Por encargo</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {panelButton('menu', 'Paso 4', 'Mini carta', founderActive ? `${filledMenuItems.length}/5 productos` : founderRequested ? 'Pendiente' : 'Bloqueada', ShoppingBasket)}
          {openPanel === 'menu' && (
            <div className="merchant-panel-body">
              {!founderActive ? (
                <section className="paid-feature-preview locked-feature">
                  <div>
                    <span>{founderRequested ? 'Solicitud pendiente' : 'Plan fundador'}</span>
                    <h3>La mini carta se activa cuando el admin habilita el plan.</h3>
                    <p>
                      Tu ficha gratis puede aparecer igual con foto, WhatsApp, horario y 1 promo semanal.
                      La mini carta, pedidos por WhatsApp y 4 publicaciones extra quedan reservados para el plan fundador.
                    </p>
                  </div>
                  <ul>
                    <li><Check size={14} /> Mini carta de productos</li>
                    <li><Check size={14} /> Pedido armado por WhatsApp</li>
                    <li><Check size={14} /> 4 publicaciones extra por mes</li>
                  </ul>
                  <button type="button" onClick={() => setOpenPanel('plan')}>
                    {founderRequested ? 'Ver solicitud' : 'Pedir plan fundador'}
                  </button>
                </section>
              ) : (
                <section className="menu-editor menu-editor-standalone" aria-label="Mini carta del local">
                <div>
                  <span>Mini carta editable</span>
                  <h3>Productos simples, precio opcional y disponibilidad.</h3>
                  <p>Completas hasta 5 productos. Si no queres mostrar precio, dejalo vacio y aparece como consulta por WhatsApp.</p>
                </div>
                {ensureMenuSlots(localDraft.menu).slice(0, 5).map((item, index) => (
                  <div className="menu-editor-row" key={`menu-${index}`}>
                    <label>
                      <span>Producto {index + 1}</span>
                      <input value={item.name} onChange={(event) => updateMenuItem(index, 'name', event.target.value)} placeholder={index === 0 ? 'Ej: Mila completa con papas' : 'Ej: Empanadas, gaseosa, combo...'} />
                    </label>
                    <label>
                      <span>Precio</span>
                      <input value={item.price || ''} onChange={(event) => updateMenuItem(index, 'price', event.target.value)} placeholder="Opcional" />
                    </label>
                    <div className="menu-row-actions">
                      <label className="menu-available">
                        <input type="checkbox" checked={item.available !== false} onChange={(event) => updateMenuItem(index, 'available', event.target.checked)} />
                        <span>Disponible</span>
                      </label>
                      <button type="button" onClick={() => clearMenuItem(index)}>Limpiar</button>
                    </div>
                  </div>
                ))}
                <div className="menu-save-actions">
                  <span>{filledMenuItems.length ? `${filledMenuItems.length} productos listos para la ficha.` : 'Todavia no cargaste productos.'}</span>
                  <button type="button" onClick={saveLocal}>Guardar mini carta</button>
                </div>
              </section>
              )}
            </div>
          )}

          {panelButton('plan', 'Paso 5', 'Gratis o fundador', founderActive ? 'Activo' : founderRequested ? 'Pendiente' : 'Gratis', ShoppingBasket)}
          {openPanel === 'plan' && (
            <div className="merchant-panel-body">
              <section className="local-plan-selector" aria-label="Plan del comercio">
                <button
                  className={!founderActive && !founderRequested ? 'active' : ''}
                  type="button"
                  onClick={() => {
                    updateLocalDraft('plan', 'gratis')
                    updateLocalDraft('planStatus', 'free')
                  }}
                >
                  <span>Gratis</span>
                  <strong>Ficha + 1 promo semanal</strong>
                  <small>Nombre, foto, direccion, WhatsApp, horario y 1 publicacion gratis por semana. Dura 3 dias y se vence sola.</small>
                  <b>$0</b>
                </button>
                <button
                  className={founderActive || founderRequested ? 'active paid' : 'paid'}
                  type="button"
                  onClick={() => {
                    if (!founderActive) {
                      updateLocalDraft('plan', 'pedidos')
                      updateLocalDraft('planStatus', 'manual_pending')
                    }
                  }}
                >
                  <span>{founderActive ? 'Activo por admin' : founderRequested ? 'Pendiente de admin' : 'Pago opcional'}</span>
                  <strong>Plan fundador Liceo</strong>
                  <small>Mini carta, 4 publicaciones extra al mes y pedido armado para mandar por WhatsApp.</small>
                  <b>$8.000 fundador Liceo</b>
                </button>
              </section>

              <section className={`paid-feature-preview ${founderActive ? 'is-active' : ''}`}>
                <div>
                  <span>{founderActive ? 'Activo en plan fundador' : founderRequested ? 'Solicitud pendiente' : 'Disponible al pedir plan'}</span>
                  <h3>Mini carta y pedido por WhatsApp</h3>
                  <p>{founderActive ? 'El vecino elige productos, suma el pedido y lo manda listo al comercio.' : founderRequested ? 'Tu solicitud queda pendiente hasta que Cristian active el plan desde administracion.' : 'En el plan gratis la ficha aparece igual, con 1 publicacion semanal que dura 3 dias.'}</p>
                </div>
                <ul>
                  <li><Check size={14} /> Mini carta de productos</li>
                  <li><Check size={14} /> 4 publicaciones extra por mes</li>
                  <li><Check size={14} /> Pedido armado al WhatsApp del comercio</li>
                  <li><Check size={14} /> Precio opcional</li>
                </ul>
                <a
                  className="founder-plan-cta"
                  href={founderPlanUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    if (!founderActive) {
                      updateLocalDraft('plan', 'pedidos')
                      updateLocalDraft('planStatus', 'manual_pending')
                    }
                  }}
                >
                  <MessageCircle size={16} />
                  {founderRequested ? 'Avisar por WhatsApp' : founderActive ? 'Consultar plan' : 'Quiero plan fundador'}
                </a>
                {founderRequested && !founderActive && (
                  <button className="founder-plan-cta secondary" type="button" onClick={saveLocal}>
                    Guardar solicitud
                  </button>
                )}
              </section>

              <section className="local-visibility-comparison" aria-label="Diferencia entre ficha gratis y plan pago">
                <article className={!founderActive && !founderRequested ? 'active' : ''}>
                  <span>Cuenta gratis</span>
                  <strong>Ficha publica del local</strong>
                  <p>Aparece en la guia con foto, direccion, WhatsApp, horarios, rubro y 1 publicacion semanal gratis que dura 3 dias.</p>
                  <b>Siempre $0</b>
                </article>
                <article className={founderActive || founderRequested ? 'active paid' : 'paid'}>
                  <span>Plan fundador Liceo</span>
                  <strong>Mini carta + pedidos + extras</strong>
                  <p>Incluye mini carta, 4 publicaciones extra al mes y pedido armado que llega directo por WhatsApp.</p>
                  <b>$8.000 / mes</b>
                </article>
              </section>
            </div>
          )}

          {panelButton('preview', 'Final', 'Vista previa publica', 'Ver ficha', Eye)}
          {openPanel === 'preview' && (
            <div className="merchant-panel-body">
              <section className="public-local-preview">
                <div className="public-local-head">
                  <span>Asi lo ve el vecino</span>
                  <strong>{founderActive ? 'Pedidos activos' : founderRequested ? 'Ficha gratis + solicitud pendiente' : 'Ficha gratis'}</strong>
                </div>
                <div className="public-local-card">
                  <div {...imageSurfaceProps(localDraft.image, 'public-local-image', localDraft)}></div>
                  <div>
                    <small>{localDraft.category} - {localDraft.section}</small>
                    <h3>{localDraft.name || 'Nombre del local'}</h3>
                    <p>{localDraft.description || 'Descripcion breve del local.'}</p>
                    <div className="public-local-tags">
                      <span>
                        {hasBusinessPublicAddress(localDraft) ? <MapPin size={12} /> : <MessageCircle size={12} />}
                        {hasBusinessPublicAddress(localDraft) ? localDraft.address : 'Sin direccion publica'}
                      </span>
                      <span><Navigation size={12} /> {localDraft.reference || 'Referencia pendiente'}</span>
                      <span><Clock3 size={12} /> {scheduleLabel}</span>
                      <span><MessageCircle size={12} /> {localDraft.whatsapp || 'WhatsApp pendiente'}</span>
                    </div>
                    <div className="public-local-pay">
                      <b>{localDraft.paymentMethods || 'Medios de pago a definir'}</b>
                      {localDraft.instagram && <b>{localDraft.instagram}</b>}
                    </div>
                    {founderActive ? (
                      <ul className="public-menu-list">
                        {ensureMenuSlots(localDraft.menu).slice(0, 5).filter((item) => item.available !== false).map((item, index) => (
                          <li key={`${item.name || 'producto'}-${index}`}>
                            <span>{item.name || 'Producto'}</span>
                            {item.price && <b>{item.price}</b>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="public-menu-locked">
                        <ShieldCheck size={14} />
                        <span>Mini carta y pedidos se muestran cuando el admin activa el plan fundador.</span>
                      </div>
                    )}
                  </div>
                </div>
                {founderActive && (
                  <div className="public-order-strip">
                    <span>Mini menu</span>
                    <strong>3 productos seleccionados</strong>
                    <button type="button">Enviar pedido por WhatsApp</button>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        <button type="button" onClick={saveLocal}>
          <Store size={17} />
          {local ? 'Actualizar local' : 'Guardar local'}
        </button>
      </section>

      {local && (
        <section className="local-public-preview">
          <span>Vista previa</span>
          <BusinessCard
            business={{
              name: local.name,
              category: local.category,
              section: local.section,
              businessType: local.businessType,
              hasPublicAddress: local.hasPublicAddress,
              address: local.address || '',
              reference: local.reference || 'Referencia a completar',
              hours: local.hours || formatSchedule(local),
              tone: 'orange',
              image: local.image,
              imageZoom: local.imageZoom,
              imagePosition: local.imagePosition,
              open: true,
              rating: 'Nuevo',
              followers: 0,
              verified: false,
              delivery: local.delivery || 'A definir',
              hasDelivery: (local.delivery || '').toLowerCase().includes('delivery'),
              orderHours: local.hours ? `Pedidos ${local.hours}` : 'Pedidos a definir',
              distance: 'cerca',
              menu: [
                { name: 'Producto principal' },
                { name: 'Agregar productos desde el menu' },
              ],
            }}
            onOpen={() => {}}
            large
          />
        </section>
      )}

      <section className="managed-list">
        <div className="managed-list-head">
          <div>
            <span>Publicaciones</span>
            <h2>Promos del local</h2>
          </div>
          <button type="button" onClick={() => onPublish()}>Nueva promo</button>
        </div>

        {localOffers.length === 0 ? (
          <section className="merchant-empty-posts">
            <Flame size={22} />
            <strong>Todavia no tenes promos publicadas.</strong>
            <p>Cuando tengas una oferta del dia, subila en menos de un minuto. Dura 3 o 4 dias y despues se baja sola.</p>
            <button type="button" onClick={() => onPublish()}>Crear primera promo</button>
          </section>
        ) : (
          <>
            {activeLocalOffers.map((offer) => (
              <ManagedPost
                key={offer.id}
                offer={offer}
                status="Activa"
                action="Republicar"
                secondaryAction="Editar similar"
                onAction={() => onRepostOffer(offer)}
                onSecondaryAction={() => onPublish(offer)}
                onPause={() => onPauseOffer(offer)}
                onDelete={() => onDeleteOffer(offer)}
              />
            ))}
            {pausedLocalOffers.map((offer) => (
              <ManagedPost
                key={offer.id}
                offer={offer}
                status="Pausada"
                action="Republicar"
                secondaryAction="Editar similar"
                onAction={() => onRepostOffer(offer)}
                onSecondaryAction={() => onPublish(offer)}
                onPause={() => onPauseOffer(offer)}
                onDelete={() => onDeleteOffer(offer)}
              />
            ))}
          </>
        )}
      </section>

      <section className="boost-card">
        <span>Extra opcional</span>
        <h2>Mas publicaciones cuando haga falta.</h2>
        <p>La ficha y una promo semanal quedan gratis. Si una semana queres publicar mas ofertas, ahi se cobra extra.</p>
        <button type="button" onClick={() => onPublish()}>Preparar otra promo</button>
      </section>
    </div>
  )
}

function ManagedPost({ offer, status, action, secondaryAction, onAction, onSecondaryAction, onPause, onDelete }) {
  return (
    <article className={`managed-card offer-${offer.tone || 'orange'} ${offer.open === false ? 'is-paused' : ''}`}>
      <div {...imageSurfaceProps(offer.image, 'managed-image')}></div>
      <div>
        <span>{status}</span>
        <h2>{offer.title}</h2>
        <p>{offer.section} - {offer.expires} - {offer.price}</p>
        <div className="managed-actions">
          <button type="button" onClick={onAction}>{action}</button>
          <button type="button" onClick={onSecondaryAction}>{secondaryAction}</button>
          <button type="button" onClick={onPause}>{offer.open === false ? 'Activar' : 'Pausar'}</button>
          <button className="danger" type="button" onClick={onDelete}>Eliminar</button>
        </div>
      </div>
    </article>
  )
}

function AdminScreen({
  businesses,
  offers,
  pageViews,
  onBack,
  onOpenBusiness,
  onOpenOffer,
  onTogglePublic,
  onToggleVerified,
  onActivateOrders,
  onSaveNote,
  onEditBusiness,
  onDeleteBusiness,
  onPauseOffer,
  onDeleteOffer,
  onToggleTheme,
}) {
  const [notesDraft, setNotesDraft] = useState({})
  const [editDrafts, setEditDrafts] = useState({})
  const [adminView, setAdminView] = useState('pendientes')
  const needsReview = businesses.filter((business) => (
    !business.whatsapp ||
    (business.businessType !== 'entrepreneur' && !hasBusinessPublicAddress(business)) ||
    !business.verified ||
    business.isPublic === false
  ))
  const pendingOrders = businesses.filter((business) => business.plan === 'pedidos' && business.planStatus !== 'active')
  const visibleBusinesses = businesses.filter((business) => business.isPublic !== false)
  const activeOffers = offers.filter((offer) => offer.open !== false)
  const pausedOffers = offers.filter((offer) => offer.open === false)
  const readyBusinesses = businesses.filter((business) => (
    business.whatsapp &&
    (business.businessType === 'entrepreneur' || hasBusinessPublicAddress(business)) &&
    business.verified &&
    business.isPublic !== false
  ))
  const priorityBusinesses = [
    ...needsReview,
    ...businesses.filter((business) => business.plan === 'pedidos'),
    ...businesses,
  ].filter((business, index, list) => (
    list.findIndex((item) => (item.id || item.name) === (business.id || business.name)) === index
  ))
  const activeRate = businesses.length ? Math.round((readyBusinesses.length / businesses.length) * 100) : 0
  const offersByBusiness = offers.reduce((acc, offer) => {
    const key = offer.businessId || offer.business
    if (!acc[key]) acc[key] = []
    acc[key].push(offer)
    return acc
  }, {})
  useEffect(() => {
    setNotesDraft((current) => {
      const next = { ...current }
      businesses.forEach((business) => {
        const id = business.id || business.name
        if (!(id in next)) next[id] = business.adminNotes || ''
      })
      return next
    })
  }, [businesses])

  useEffect(() => {
    setEditDrafts((current) => {
      const next = { ...current }
      businesses.forEach((business) => {
        const id = business.id || business.name
        if (!(id in next)) {
          next[id] = {
            name: business.name || '',
            category: business.category || 'Comida',
            section: business.section || 'Liceo Procrear',
            address: business.address || '',
            reference: business.reference || '',
            hours: business.hours || '',
            whatsapp: business.whatsapp || '',
            instagram: business.instagram || '',
            isOpen: business.open !== false,
          }
        }
      })
      return next
    })
  }, [businesses])

  const getBusinessQuality = (business) => {
    const issues = []
    if (!business.whatsapp) issues.push('WhatsApp')
    if (business.businessType !== 'entrepreneur' && !hasBusinessPublicAddress(business)) issues.push('direccion')
    if (!business.openDays?.length) issues.push('dias')
    if (!business.hours || business.hours.includes('completar')) issues.push('horario')
    if (isFounderPlanActive(business) && !business.menu?.filter((item) => item.name).length) issues.push('mini carta')
    if (!business.verified) issues.push('verificar')
    if (business.isPublic === false) issues.push('oculto')
    return issues
  }

  const getStatusLabel = (business) => {
    if (business.isPublic === false) return 'Oculto'
    if (getBusinessQuality(business).length) return 'Revisar'
    if (isFounderPlanActive(business)) return 'Fundador activo'
    if (isFounderPlanRequested(business)) return 'Fundador pendiente'
    return 'Publicado'
  }

  const getPlanActionLabel = (business) => {
    if (isFounderPlanActive(business)) return 'Quitar fundador'
    if (isFounderPlanRequested(business)) return 'Activar fundador'
    return 'Activar fundador'
  }

  const saveNote = (business) => {
    const id = business.id || business.name
    onSaveNote(business, notesDraft[id] || '')
  }

  const updateEditDraft = (business, field, value) => {
    const id = business.id || business.name
    setEditDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] || {}),
        [field]: value,
      },
    }))
  }

  const saveEditDraft = (business) => {
    const id = business.id || business.name
    const draft = editDrafts[id] || {}
    onEditBusiness(business, draft)
  }

  const businessListByView = adminView === 'pendientes'
    ? priorityBusinesses.filter((business) => getBusinessQuality(business).length)
    : adminView === 'planes'
      ? priorityBusinesses.filter((business) => isFounderPlanRequested(business) || isFounderPlanActive(business))
      : priorityBusinesses
  const visibleAdminBusinesses = adminView === 'promos' ? [] : businessListByView
  const adminOffers = adminView === 'promos' ? offers : activeOffers

  return (
    <div className="utility-screen admin-screen">
      <header className="detail-header">
        <button type="button" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <strong>Administracion</strong>
        <ThemeToggle onToggleTheme={onToggleTheme} />
      </header>

      <section className="admin-hero">
        <span>Control interno</span>
        <h1>Operacion clara para Cerca Liceo.</h1>
        <p>Revisa altas, activa fundador solo cuando lo coordinaste, controla promos y limpia datos raros sin entrar a la base.</p>
      </section>

      <section className="admin-stats">
        <article>
          <strong>{businesses.length}</strong>
          <span>locales</span>
        </article>
        <article>
          <strong>{visibleBusinesses.length}</strong>
          <span>visibles</span>
        </article>
        <article>
          <strong>{activeRate}%</strong>
          <span>listos</span>
        </article>
        <article className={needsReview.length ? 'needs' : ''}>
          <strong>{needsReview.length}</strong>
          <span>para revisar</span>
        </article>
        <article className={pendingOrders.length ? 'needs' : ''}>
          <strong>{pendingOrders.length}</strong>
          <span>fundador pendiente</span>
        </article>
        <article>
          <strong>{activeOffers.length}</strong>
          <span>promos activas</span>
        </article>
        <article>
          <strong>{pageViews}</strong>
          <span>visitas en este dispositivo</span>
        </article>
      </section>

      <section className="admin-tabs" aria-label="Vistas de administracion">
        {[
          ['pendientes', `Pendientes ${needsReview.length}`],
          ['planes', `Fundador ${pendingOrders.length}`],
          ['locales', `Locales ${businesses.length}`],
          ['promos', `Promos ${offers.length}`],
        ].map(([id, label]) => (
          <button className={adminView === id ? 'active' : ''} type="button" key={id} onClick={() => setAdminView(id)}>
            {label}
          </button>
        ))}
      </section>

      <section className="admin-command-center">
        <article>
          <span>Paso 1</span>
          <strong>Corregir datos</strong>
          <p>{needsReview.length ? `${needsReview.length} locales necesitan revisar WhatsApp, direccion, horario o verificacion.` : 'No hay locales urgentes para revisar.'}</p>
        </article>
        <article>
          <span>Paso 2</span>
          <strong>Verificar y publicar</strong>
          <p>{readyBusinesses.length} locales tienen datos suficientes para mostrarse con confianza.</p>
        </article>
        <article>
          <span>Paso 3</span>
          <strong>Planes manuales</strong>
          <p>{pendingOrders.length ? `${pendingOrders.length} comercio(s) pidieron fundador y esperan tu activacion.` : 'No hay solicitudes de fundador pendientes.'}</p>
        </article>
      </section>

      <section className="admin-guidance">
        <div>
          <BadgeCheck size={18} />
          <strong>Regla de calidad</strong>
        </div>
        <p>Antes de compartir fuerte el link, apunta a pocos comercios bien cargados: foto real, WhatsApp, horario claro y promos vigentes. La mini carta solo cuenta si tienen fundador activo.</p>
      </section>

      {adminView !== 'promos' && (
      <section className="admin-list">
        <div className="feed-head compact">
          <div>
            <Store size={17} />
            <strong>{adminView === 'planes' ? 'Solicitudes y planes' : adminView === 'locales' ? 'Todos los locales' : 'Locales para revisar'}</strong>
          </div>
          <span>{visibleAdminBusinesses.length ? `${visibleAdminBusinesses.length} items` : 'Todo bien'}</span>
        </div>
        {visibleAdminBusinesses.length === 0 && (
          <article className="admin-empty-state">
            <strong>No hay nada urgente aca.</strong>
            <p>Cuando un comercio quede incompleto, pida fundador o se cargue algo nuevo, va a aparecer en esta vista.</p>
          </article>
        )}
        {visibleAdminBusinesses.slice(0, 40).map((business) => {
          const issues = getBusinessQuality(business)
          const id = business.id || business.name
          const businessOffers = offersByBusiness[business.id] || offersByBusiness[business.name] || []
          const editDraft = editDrafts[id] || {}
          return (
          <article className={`admin-row ${business.isPublic === false ? 'is-hidden' : ''}`} key={id}>
            <div className="admin-row-main">
              <span className={`admin-dot ${issues.length ? 'warn' : 'ok'}`}></span>
              <div>
                <strong>{business.name}</strong>
                <small>{business.category} - {business.section}</small>
                <small>{hasBusinessPublicAddress(business) ? business.address : 'Sin direccion publica'} - {business.whatsapp || 'Sin WhatsApp'}</small>
              </div>
              <em>{getStatusLabel(business)}</em>
            </div>
            {issues.length > 0 && (
              <div className="admin-issues">
                {issues.map((issue) => <span key={issue}>Falta {issue}</span>)}
              </div>
            )}
            <div className="admin-plan-line">
              <span>{isFounderPlanActive(business) ? 'Plan fundador activo' : isFounderPlanRequested(business) ? 'Pidio plan fundador' : 'Ficha gratis'}</span>
              <span>{business.planStatus === 'active' ? 'Activo por admin' : business.planStatus === 'manual_pending' ? 'Pendiente de activar' : 'Gratis'}</span>
              <span>{business.open ? 'Abierto segun ficha' : 'Marcado cerrado'}</span>
              <span>{businessOffers.length} promos</span>
            </div>
            <div className="admin-row-actions">
              <button type="button" onClick={() => onOpenBusiness(business)}>Ver</button>
              <button type="button" onClick={() => onToggleVerified(business)}>{business.verified ? 'Quitar check' : 'Verificar'}</button>
              <button type="button" onClick={() => onTogglePublic(business)}>{business.isPublic === false ? 'Mostrar' : 'Ocultar'}</button>
              <button type="button" onClick={() => onActivateOrders(business)}>{getPlanActionLabel(business)}</button>
              <button className="danger" type="button" onClick={() => onDeleteBusiness(business)}>Eliminar local</button>
            </div>
            <details className="admin-edit-box">
              <summary>Editar datos rapidos</summary>
              <div className="admin-edit-grid">
                <label>
                  <span>Nombre</span>
                  <input value={editDraft.name || ''} onChange={(event) => updateEditDraft(business, 'name', event.target.value)} />
                </label>
                <label>
                  <span>WhatsApp</span>
                  <input value={editDraft.whatsapp || ''} onChange={(event) => updateEditDraft(business, 'whatsapp', event.target.value)} />
                </label>
                <label>
                  <span>Rubro</span>
                  <select value={editDraft.category || 'Comida'} onChange={(event) => updateEditDraft(business, 'category', event.target.value)}>
                    {categories.filter((category) => category.name !== 'Todas').map((category) => (
                      <option key={category.name}>{category.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Seccion</span>
                  <select value={editDraft.section || 'Liceo Procrear'} onChange={(event) => updateEditDraft(business, 'section', event.target.value)}>
                    {sections.filter((section) => section !== 'Todos').map((section) => (
                      <option key={section}>{section}</option>
                    ))}
                  </select>
                </label>
                <label className="wide">
                  <span>Direccion</span>
                  <input value={editDraft.address || ''} onChange={(event) => updateEditDraft(business, 'address', event.target.value)} />
                </label>
                <label className="wide">
                  <span>Referencia</span>
                  <input value={editDraft.reference || ''} onChange={(event) => updateEditDraft(business, 'reference', event.target.value)} />
                </label>
                <label>
                  <span>Horario</span>
                  <input value={editDraft.hours || ''} onChange={(event) => updateEditDraft(business, 'hours', event.target.value)} />
                </label>
                <label>
                  <span>Instagram</span>
                  <input value={editDraft.instagram || ''} onChange={(event) => updateEditDraft(business, 'instagram', event.target.value)} />
                </label>
              </div>
              <button type="button" onClick={() => saveEditDraft(business)}>Guardar cambios</button>
            </details>
            {businessOffers.length > 0 && (
              <div className="admin-business-offers">
                <strong>Publicaciones de este comercio</strong>
                {businessOffers.slice(0, 4).map((offer) => (
                  <div key={offer.id || `${offer.title}-${offer.price}`}>
                    <span>{offer.title}</span>
                    <small>{offer.price} - {offer.expires}</small>
                    <button type="button" onClick={() => onOpenOffer(offer)}>Ver</button>
                    <button type="button" onClick={() => onPauseOffer(offer)}>{offer.open === false ? 'Activar' : 'Pausar'}</button>
                    <button className="danger" type="button" onClick={() => onDeleteOffer(offer)}>Eliminar</button>
                  </div>
                ))}
              </div>
            )}
            <label className="admin-note">
              <span>Nota interna</span>
              <textarea
                value={notesDraft[id] || ''}
                onChange={(event) => setNotesDraft((current) => ({ ...current, [id]: event.target.value }))}
                placeholder="Ej: falta foto real, paga el viernes, llamar por promo..."
                rows={2}
              />
              <button type="button" onClick={() => saveNote(business)}>Guardar nota</button>
            </label>
          </article>
          )
        })}
      </section>
      )}

      {(adminView === 'promos' || adminView === 'locales') && (
      <section className="admin-list">
        <div className="feed-head compact">
          <div>
            <Flame size={17} />
            <strong>Promos activas</strong>
          </div>
          <span>{pausedOffers.length} pausadas</span>
        </div>
        {adminOffers.slice(0, 40).map((offer) => (
          <article className="admin-row promo" key={offer.id || offer.title}>
            <span className={`admin-dot ${offer.open === false ? 'warn' : 'ok'}`}></span>
            <div>
              <strong>{offer.title}</strong>
              <small>{offer.business} - {offer.expires}</small>
            </div>
            <div className="admin-row-actions">
              <em>{offer.price}</em>
              <button type="button" onClick={() => onOpenOffer(offer)}>Ver</button>
              <button type="button" onClick={() => onPauseOffer(offer)}>{offer.open === false ? 'Activar' : 'Pausar'}</button>
              <button className="danger" type="button" onClick={() => onDeleteOffer(offer)}>Eliminar</button>
            </div>
          </article>
        ))}
      </section>
      )}

      <section className="admin-next">
        <span>Checklist antes de compartir</span>
        <h2>Que el primer vecino no se pierda.</h2>
        <p>Necesitas al menos 5 locales reales, 3 promos actuales, fotos reconocibles, horarios claros y WhatsApp funcionando. Si eso esta, ya se puede ofrecer.</p>
      </section>
    </div>
  )
}

function LoginScreen({ authNotice, onBack, onLogin, onForgotPassword, onQuickAccess, allowQuickAccess, onRegister, onToggleTheme }) {
  const [credentials, setCredentials] = useState({ email: '', password: '' })

  return (
    <div className="utility-screen auth-screen">
      <header className="detail-header">
        <button type="button" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <strong>Iniciar sesion</strong>
        <ThemeToggle onToggleTheme={onToggleTheme} />
      </header>

      <section className="auth-hero">
        <span>Acceso seguro</span>
        <h1>Entrar o registrarte en Cerca Liceo.</h1>
        <p>Podes seguir como visitante. La cuenta sirve para guardar favoritos, publicar como comercio y administrar tu local.</p>
      </section>

      {authNotice && (
        <section className={`auth-notice ${authNotice.toLowerCase().includes('email') ? 'mail-note' : ''}`}>
          <Check size={16} />
          <span>{authNotice}</span>
        </section>
      )}

      <section className="auth-form-card">
        <span>Cuenta existente</span>
        <h2>Ingresar con email y clave.</h2>
        <label>
          <span>Email</span>
          <input value={credentials.email} onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))} placeholder="nombre@email.com" />
        </label>
        <label>
          <span>Clave</span>
          <input value={credentials.password} onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))} placeholder="Tu clave" type="password" />
        </label>
        <div className="auth-form-actions">
          <button type="button" onClick={() => onLogin(credentials)}>Iniciar sesion</button>
          <button className="link-button" type="button" onClick={onForgotPassword}>Olvide mi clave</button>
        </div>
      </section>

      {allowQuickAccess && (
        <section className="auth-options">
          <button type="button" onClick={() => onQuickAccess('neighbor')}>
            <UserRound size={22} />
            <span>Continuar como vecino</span>
            <strong>Favoritos y avisos</strong>
            <small>Tambien podes navegar sin cuenta.</small>
          </button>
          <button type="button" onClick={() => onQuickAccess('merchant')}>
            <Store size={22} />
            <span>Soy comerciante</span>
            <strong>Panel, local y publicaciones</strong>
            <small>Ficha gratis + 1 promo semanal.</small>
          </button>
        </section>
      )}

      <section className="auth-register-strip">
        <div>
          <strong>No tenes cuenta?</strong>
          <span>Crear cuenta es gratis y sin tarjeta.</span>
        </div>
        <button type="button" onClick={() => onRegister('neighbor')}>Registrarme</button>
      </section>

      <section className="auth-register-strip commerce">
        <div>
          <strong>Tenes un comercio?</strong>
          <span>Aparecer en la guia puede ser gratis.</span>
        </div>
        <button type="button" onClick={() => onRegister('merchant')}>Registrar comercio</button>
      </section>
    </div>
  )
}

function ForgotPasswordScreen({ authNotice, onBack, onSubmit, onToggleTheme }) {
  const [email, setEmail] = useState('')

  return (
    <div className="utility-screen auth-screen">
      <header className="detail-header">
        <button type="button" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <strong>Recuperar clave</strong>
        <ThemeToggle onToggleTheme={onToggleTheme} />
      </header>

      <section className="auth-hero">
        <span>Acceso seguro</span>
        <h1>Volver a entrar sin vueltas.</h1>
        <p>Escribi el email de tu cuenta y te mandamos un enlace para crear una clave nueva.</p>
      </section>

      {authNotice && (
        <section className={`auth-notice ${authNotice.toLowerCase().includes('correo') ? 'mail-note' : ''}`}>
          <Check size={16} />
          <span>{authNotice}</span>
        </section>
      )}

      <section className="auth-form-card recovery-card">
        <span>Recuperacion</span>
        <h2>Te enviamos un mail de Cerca Liceo.</h2>
        <label>
          <span>Email de la cuenta</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@email.com" type="email" />
        </label>
        <button type="button" onClick={() => onSubmit(email)}>Mandar enlace</button>
        <p>Si no aparece en unos minutos, revisa Spam o Promociones. El enlace sirve para crear una clave nueva.</p>
      </section>

      <section className="auth-register-strip">
        <div>
          <strong>Te acordaste?</strong>
          <span>Volver a probar con email y clave.</span>
        </div>
        <button type="button" onClick={onBack}>Iniciar sesion</button>
      </section>
    </div>
  )
}

function ResetPasswordScreen({ authNotice, onBack, onSubmit, onToggleTheme }) {
  const [form, setForm] = useState({ password: '', confirm: '' })
  const keysMismatch = form.password && form.confirm && form.password !== form.confirm

  const savePassword = () => {
    if (keysMismatch) return
    onSubmit(form.password)
  }

  return (
    <div className="utility-screen auth-screen">
      <header className="detail-header">
        <button type="button" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <strong>Nueva clave</strong>
        <ThemeToggle onToggleTheme={onToggleTheme} />
      </header>

      <section className="auth-hero">
        <span>Cuenta verificada</span>
        <h1>Crea tu nueva clave.</h1>
        <p>Usa una clave de al menos 6 caracteres. Despues vas a poder entrar normalmente.</p>
      </section>

      {authNotice && (
        <section className="auth-notice mail-note">
          <Check size={16} />
          <span>{authNotice}</span>
        </section>
      )}

      <section className="auth-form-card recovery-card">
        <span>Ultimo paso</span>
        <h2>Elegir nueva clave.</h2>
        <label>
          <span>Nueva clave</span>
          <input value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Minimo 6 caracteres" type="password" />
        </label>
        <label>
          <span>Repetir clave</span>
          <input value={form.confirm} onChange={(event) => setForm((current) => ({ ...current, confirm: event.target.value }))} placeholder="Escribila otra vez" type="password" />
        </label>
        {keysMismatch && <p className="form-warning">Las claves no coinciden.</p>}
        <button type="button" onClick={savePassword}>Guardar clave</button>
      </section>
    </div>
  )
}

function ProfileScreen({ account, local, onBack, onLogin, onRegister, onMerchantPanel, onPublish, onAdmin, onResetSession, authNotice, onToggleTheme }) {
  const isLogged = Boolean(account)
  const isMerchant = account?.type === 'merchant'
  const isAdmin = account?.role === 'admin' || !cercaApi.isSupabaseEnabled()

  return (
    <div className="utility-screen profile-screen">
      <header className="detail-header">
        <button type="button" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <strong>Mi usuario</strong>
        <ThemeToggle onToggleTheme={onToggleTheme} />
      </header>

      {isLogged && (
        <section className="profile-head">
          <div className="profile-avatar">{account.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <span>{isMerchant ? 'Cuenta comercio' : 'Cuenta vecino'}</span>
            <h1>{account.name}</h1>
            <p>
              {isMerchant
                ? `Registrado para publicar como ${account.businessName || 'comercio del barrio'}.`
                : 'Cuenta lista para guardar favoritos, seguir locales y recibir avisos.'}
            </p>
          </div>
        </section>
      )}

      {isLogged && (
        <section className="session-bar">
          <div>
            <span>Sesion activa</span>
            <strong>{isMerchant ? 'Comercio' : 'Vecino'}</strong>
          </div>
          <button type="button" onClick={onResetSession}>Cerrar sesion</button>
          <button type="button" onClick={onLogin}>Cambiar cuenta</button>
        </section>
      )}

      {authNotice && (
        <section className="auth-notice">
          <Check size={16} />
          <span>{authNotice}</span>
        </section>
      )}

      {!isLogged && (
        <section className="account-start-card">
          <span>Acceso</span>
          <h2>Entrar es opcional.</h2>
          <p>Para mirar ofertas y locales no hace falta registrarse. La cuenta sirve para guardar favoritos o administrar un comercio.</p>
          <div className="account-choice-grid">
            <button type="button" onClick={() => onRegister('neighbor')}>
              <UserRound size={19} />
              <strong>Crear cuenta vecino</strong>
              <small>Favoritos y avisos.</small>
            </button>
            <button type="button" onClick={onLogin}>
              <UserRound size={19} />
              <strong>Iniciar sesion</strong>
              <small>Vecino o comercio.</small>
            </button>
            <button type="button" onClick={() => onRegister('merchant')}>
              <Store size={19} />
              <strong>Crear cuenta comercio</strong>
              <small>Ficha gratis.</small>
            </button>
          </div>
        </section>
      )}

      {isLogged && (
        <section className="profile-actions compact">
          {!isMerchant && (
            <>
              <button type="button">
                <Heart size={19} />
                Mis favoritos
              </button>
              <button type="button">
                <Bell size={19} />
                Avisos del barrio
              </button>
            </>
          )}
          {isMerchant && (
            <>
              <button type="button" onClick={onMerchantPanel}>
                <List size={19} />
                Panel comercio
              </button>
              <button type="button" onClick={onPublish}>
                <Flame size={19} />
                Publicar promo
              </button>
            </>
          )}
          {isAdmin && (
            <button type="button" onClick={onAdmin}>
              <ShieldCheck size={19} />
              Administrar
            </button>
          )}
        </section>
      )}

      {isMerchant && (
        <section className="merchant-entry-card">
          <span>{local ? 'Local publicado' : 'Para comercios'}</span>
          <h2>{local ? local.name : 'Carga tu ficha y apareces en la guia.'}</h2>
          <p>{local ? `${local.category} en ${local.section}. ${hasBusinessPublicAddress(local) ? local.address : 'Contacto directo por WhatsApp o Instagram.'}` : 'Completa foto, zona, horarios, WhatsApp y mini carta para que los vecinos te encuentren.'}</p>
          <div>
            <button type="button" onClick={onMerchantPanel}>{local ? 'Editar local' : 'Cargar local'}</button>
          </div>
        </section>
      )}

      <section className="merchant-plans-card" id="planes-comercio">
        <div className="merchant-plans-head">
          <span>Opciones para comercios</span>
          <h2>Arrancas gratis y sumas extras solo si te sirven.</h2>
          <p>La ficha del local no se cobra: sirve para aparecer en la guia, mostrar datos claros y publicar una promo semanal que vence sola.</p>
        </div>
        <div className="merchant-plan-list">
          <article>
            <Store size={18} />
            <strong>Plan gratis</strong>
            <p>Ficha del local con foto, direccion, horarios, WhatsApp, rubro y 1 publicacion semanal gratis.</p>
            <span>La promo dura 3 dias y se baja sola</span>
          </article>
          <article>
            <Flame size={18} />
            <strong>4 publicaciones extra</strong>
            <p>Para subir mas promos en el mes cuando hay combos, cambios de precio o ventas puntuales.</p>
            <span>Incluido en el plan fundador Liceo</span>
          </article>
          <article>
            <ShoppingBasket size={18} />
            <strong>Mini carta + pedidos</strong>
            <p>El vecino elige productos, suma el pedido y lo envia armado al WhatsApp del comercio.</p>
            <span>$8.000 / mes precio fundador</span>
          </article>
        </div>
        <a
          className="founder-plan-cta merchant-plan-cta"
          href={makeWhatsAppUrl('3517662142', 'Hola Cristian, quiero consultar por el plan fundador Liceo de Cerca Liceo.')}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle size={16} />
          Quiero activar el plan fundador
        </a>
      </section>

      <ContactFooter />
    </div>
  )
}

function RegisterScreen({ initialType = 'neighbor', onComplete, onBack, onLogin, onToggleTheme }) {
  const [accountType, setAccountType] = useState(initialType)
  const [submitted, setSubmitted] = useState(false)
  const [pendingEmail, setPendingEmail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitFeedback, setSubmitFeedback] = useState('')
  const [form, setForm] = useState({
    name: '',
    whatsapp: '',
    email: '',
    password: '',
    confirmPassword: '',
    section: '',
    businessName: '',
    businessType: 'local',
    category: '',
    salesMode: '',
    interests: '',
  })
  const isMerchant = accountType === 'merchant'
  const updateForm = (field, value) => {
    const cleanValue = field === 'whatsapp'
      ? value.replace(/\D/g, '').slice(0, 15)
      : value
    setForm((current) => ({ ...current, [field]: cleanValue }))
  }
  const validateRegisterForm = () => {
    const fullName = form.name.trim().replace(/\s+/g, ' ')
    const email = form.email.trim()
    if (fullName.split(' ').filter(Boolean).length < 2) {
      return 'Escribi nombre y apellido para que la cuenta quede clara.'
    }
    if (form.whatsapp && form.whatsapp.length < 8) {
      return 'El WhatsApp tiene que tener solo numeros y al menos 8 digitos.'
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
      return 'Escribi un email valido. Ahi va a llegar la confirmacion de Cerca Liceo.'
    }
    if (form.password.length < 6) {
      return 'La clave tiene que tener al menos 6 caracteres.'
    }
    if (form.password !== form.confirmPassword) {
      return 'Las claves no coinciden. Escribilas igual en los dos campos.'
    }
    if (isMerchant && !form.category) {
      return 'Elegi el rubro principal para que despues el local aparezca bien filtrado.'
    }
    return ''
  }
  const submitRegister = async () => {
    if (isSubmitting) return
    setSubmitFeedback('')
    const validationMessage = validateRegisterForm()
    if (validationMessage) {
      setSubmitFeedback(validationMessage)
      return
    }
    setIsSubmitting(true)
    try {
      const created = await onComplete({
        ...form,
        type: accountType,
        name: form.name.trim(),
        email: form.email.trim(),
        section: form.section || 'Liceo Procrear',
        businessName: form.businessName || '',
        businessType: form.businessType,
        category: form.category || 'Comida',
      })
      if (created === 'pending-confirmation') {
        setPendingEmail(true)
        return
      }
      if (created !== false) {
        setSubmitted(true)
        return
      }
      setSubmitFeedback('No se pudo crear la cuenta. Revisa el aviso de abajo o proba de nuevo en unos minutos.')
    } catch {
      setSubmitFeedback('No se pudo crear la cuenta. Proba de nuevo o escribi al soporte 351 766 2142.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (pendingEmail) {
    return (
      <div className="utility-screen register-screen">
        <header className="detail-header">
          <button type="button" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <strong>Confirmar email</strong>
          <ThemeToggle onToggleTheme={onToggleTheme} />
        </header>

        <section className="register-success pending-email">
          <span>{isMerchant ? 'Comercio registrado' : 'Cuenta creada'}</span>
          <h1>{isMerchant ? 'Confirma el mail para activar tu comercio.' : 'Confirma el mail para activar tu cuenta.'}</h1>
          <p>
            Entra a <strong>{form.email || 'tu email'}</strong>, abri el correo de <strong>Cerca Liceo</strong> y toca el boton de confirmacion.
            Despues volve a la pagina e inicia sesion con tu email y clave.
          </p>
          <p className="mail-trust-note">
            Este paso protege tu cuenta y evita que otra persona publique usando el nombre de tu local.
            No te vamos a pedir tarjetas ni pagos por email.
          </p>
          <div className="email-confirm-steps">
            <article>
              <b>1</b>
              <span>Abrir el correo</span>
            </article>
            <article>
              <b>2</b>
              <span>Confirmar cuenta</span>
            </article>
            <article>
              <b>3</b>
              <span>Volver e ingresar</span>
            </article>
          </div>
          <button type="button" onClick={onLogin || onBack}>Ya confirme, iniciar sesion</button>
          <small>Si no aparece, revisa spam o escribi por WhatsApp al 351 766 2142.</small>
        </section>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="utility-screen register-screen">
        <header className="detail-header">
          <button type="button" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <strong>Cuenta creada</strong>
          <ThemeToggle onToggleTheme={onToggleTheme} />
        </header>

        <section className="register-success">
          <span>{isMerchant ? 'Comercio listo' : 'Vecino listo'}</span>
          <h1>{isMerchant ? 'Ahora carga tu local desde el panel.' : 'Ya podes guardar favoritos.'}</h1>
          <p>
            {isMerchant
              ? 'El registro queda simple. El local, horarios, fotos, publicaciones y productos se agregan despues desde el panel comercio.'
              : 'Recorda que Cerca Liceo se puede usar igual sin cuenta. La cuenta solo suma preferencias y avisos.'}
          </p>
          <button type="button" onClick={onBack}>
            {isMerchant ? 'Ir a mi cuenta' : 'Volver a mi cuenta'}
          </button>
        </section>
        {isMerchant && (
          <section className="register-roadmap post-success">
            <article className="active">
              <b>1</b>
              <strong>Cuenta creada</strong>
              <span>Listo</span>
            </article>
            <article>
              <b>2</b>
              <strong>Cargar local</strong>
              <span>Foto, direccion y horario</span>
            </article>
            <article>
              <b>3</b>
              <strong>Primer promo</strong>
              <span>Gratis semanal</span>
            </article>
          </section>
        )}
      </div>
    )
  }

  return (
    <div className="utility-screen register-screen">
      <header className="detail-header">
        <button type="button" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <strong>Registro</strong>
        <ThemeToggle onToggleTheme={onToggleTheme} />
      </header>

      <section className="register-hero">
        <span>{isMerchant ? 'Alta sin tarjeta' : 'Cuenta opcional'}</span>
        <h1>{isMerchant ? 'Crea tu comercio sin pagar nada.' : 'Usa Cerca Liceo a tu manera.'}</h1>
        <p>
          {isMerchant
            ? 'Primero registras datos basicos. Puede ser local fisico o emprendimiento sin direccion publica.'
            : 'Para buscar ofertas no hace falta registrarse. La cuenta sirve para guardar favoritos, seguir locales y recibir avisos utiles.'}
        </p>
      </section>

      {isMerchant && (
        <section className="register-roadmap">
          <article className="active">
            <b>1</b>
            <strong>Cuenta</strong>
            <span>Datos basicos</span>
          </article>
          <article>
            <b>2</b>
            <strong>Local</strong>
            <span>Direccion y horarios</span>
          </article>
          <article>
            <b>3</b>
            <strong>Promos</strong>
            <span>1 gratis semanal</span>
          </article>
        </section>
      )}

      <section className="account-switch" aria-label="Tipo de cuenta">
        <button className={!isMerchant ? 'active' : ''} type="button" onClick={() => setAccountType('neighbor')}>
          <UserRound size={18} />
          <strong>Vecino</strong>
          <small>Opcional y gratis</small>
        </button>
        <button className={isMerchant ? 'active' : ''} type="button" onClick={() => setAccountType('merchant')}>
          <Store size={18} />
          <strong>Comerciante</strong>
          <small>Para publicar</small>
        </button>
      </section>

      <section className="register-form">
        <label>
          <span>Nombre y apellido</span>
          <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder={isMerchant ? 'Ej: Cristian Alba' : 'Ej: Laura Perez'} autoComplete="name" />
        </label>
        <label>
          <span>WhatsApp</span>
          <input value={form.whatsapp} onChange={(event) => updateForm('whatsapp', event.target.value)} placeholder="3517662142" inputMode="numeric" pattern="[0-9]*" autoComplete="tel" />
        </label>
        <label>
          <span>Email</span>
          <input value={form.email} onChange={(event) => updateForm('email', event.target.value)} placeholder="nombre@gmail.com" type="email" inputMode="email" autoComplete="email" />
        </label>
        <label>
          <span>Clave</span>
          <input value={form.password} onChange={(event) => updateForm('password', event.target.value)} placeholder="Minimo 6 caracteres" type="password" autoComplete="new-password" />
        </label>
        <label>
          <span>Repetir clave</span>
          <input value={form.confirmPassword} onChange={(event) => updateForm('confirmPassword', event.target.value)} placeholder="Escribila otra vez" type="password" autoComplete="new-password" />
        </label>
        <label>
          <span>Seccion</span>
          <select value={form.section} onChange={(event) => updateForm('section', event.target.value)}>
            <option value="" disabled>Elegir seccion</option>
            <option>Liceo Procrear</option>
            <option>Liceo 1ra</option>
            <option>Liceo 2da</option>
            <option>Liceo 3ra</option>
          </select>
        </label>
        {isMerchant ? (
          <>
            <label className="wide">
              <span>Nombre comercial si ya lo tenes</span>
              <input value={form.businessName} onChange={(event) => updateForm('businessName', event.target.value)} placeholder={form.businessType === 'entrepreneur' ? 'Ej: Dulces de Lau' : 'Ej: Lo de Meli'} />
            </label>
            <div className="merchant-type-register wide">
              <span>Tipo de comercio</span>
              <div>
                <button
                  className={form.businessType !== 'entrepreneur' ? 'active' : ''}
                  type="button"
                  onClick={() => updateForm('businessType', 'local')}
                >
                  Tengo local
                </button>
                <button
                  className={form.businessType === 'entrepreneur' ? 'active' : ''}
                  type="button"
                  onClick={() => updateForm('businessType', 'entrepreneur')}
                >
                  Sin local
                </button>
              </div>
              <small>{form.businessType === 'entrepreneur' ? 'Contacto por WhatsApp o Instagram.' : 'Direccion y Maps visibles.'}</small>
            </div>
            <label>
              <span>Rubro principal</span>
              <select value={form.category} onChange={(event) => updateForm('category', event.target.value)}>
                <option value="" disabled>Elegir rubro</option>
                <option>Comida</option>
                <option>Panaderia</option>
                <option>Verduleria</option>
                <option>Despensa</option>
                <option>Belleza</option>
                <option>Ferreteria</option>
                <option>Servicios</option>
              </select>
            </label>
            <label>
              <span>Como vendes hoy</span>
              <select value={form.salesMode} onChange={(event) => updateForm('salesMode', event.target.value)}>
                <option value="" disabled>Seleccionar</option>
                <option>Solo retiro</option>
                <option>Delivery propio</option>
                <option>Por encargo</option>
                <option>Local fisico</option>
              </select>
            </label>
          </>
        ) : (
          <label className="wide">
            <span>Que te interesa ver</span>
            <input value={form.interests} onChange={(event) => updateForm('interests', event.target.value)} placeholder="Comida, despensa, belleza, ferreteria..." />
          </label>
        )}
      </section>

      <section className="register-mail-note">
        <ShieldCheck size={18} />
        <div>
          <strong>Despues de crear la cuenta, revisa tu email.</strong>
          <span>Te va a llegar un correo de confirmacion. Si todavia figura como Supabase Auth, es el sistema seguro que usa Cerca Liceo para activar cuentas.</span>
        </div>
      </section>

      <section className="register-next">
        <span>{isMerchant ? 'Que pasa despues' : 'Privacidad clara'}</span>
        <h2>{isMerchant ? 'Primero entrar, despues vender.' : 'Podes entrar sin cuenta.'}</h2>
        <p>
          {isMerchant
            ? 'Desde el panel cargas tu ficha gratis. Si no tenes local, dejas la direccion vacia y te contactan por WhatsApp o Instagram.'
            : 'La cuenta no bloquea el uso de la app. Solo mejora favoritos, avisos y preferencias del barrio.'}
        </p>
      </section>

      {isMerchant && (
        <section className="register-free-note">
          <ShieldCheck size={19} />
          <div>
            <strong>Alta gratis y sin compromiso</strong>
            <span>La ficha del local puede quedar visible gratis. Los planes son extras opcionales.</span>
          </div>
        </section>
      )}

      <div className="register-checks">
        <span><Check size={15} /> Sin tarjeta</span>
        <span><Check size={15} /> Gratis para empezar</span>
        <span><Check size={15} /> Datos editables</span>
      </div>

      {submitFeedback && (
        <section className="auth-notice needs-attention register-inline-feedback">
          <MessageCircle size={16} />
          <span>{submitFeedback}</span>
        </section>
      )}

      <button className="primary-action" type="button" onClick={submitRegister} disabled={isSubmitting}>
        {isSubmitting ? 'Creando cuenta...' : isMerchant ? 'Crear cuenta de comercio' : 'Crear cuenta gratis'}
      </button>
    </div>
  )
}

function DirectoryScreen({ businesses, onBack, onOpen, onToggleTheme }) {
  const [businessQuery, setBusinessQuery] = useState('')
  const [businessCategory, setBusinessCategory] = useState('Todas')
  const [businessSection, setBusinessSection] = useState('Todos')
  const [openOnly, setOpenOnly] = useState(false)

  const filteredBusinesses = useMemo(() => {
    const normalizedQuery = businessQuery.trim().toLowerCase()
    return businesses.filter((business) => {
      const byCategory = businessCategory === 'Todas' || business.category === businessCategory
      const bySection = businessSection === 'Todos' || business.section === businessSection
      const byOpen = !openOnly || getOpenStatus(business).open
      const byQuery =
        normalizedQuery.length === 0 ||
        `${business.name} ${business.category} ${business.address} ${business.instagram || ''} ${getBusinessMenu(business).map((item) => item.name).join(' ')}`.toLowerCase().includes(normalizedQuery)

      return byCategory && bySection && byOpen && byQuery
    })
  }, [businessQuery, businessCategory, businessSection, openOnly, businesses])

  return (
    <div className="directory-screen">
      <header className="detail-header">
        <button type="button" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <strong>Guia de locales</strong>
        <ThemeToggle onToggleTheme={onToggleTheme} />
      </header>
      <section className="directory-intro">
        <span>Guia del barrio</span>
        <h1>Locales, horarios y como llegar.</h1>
        <p>Busca por rubro, producto o seccion. Si el local cargo datos, podes escribir por WhatsApp o abrir la direccion en Maps.</p>
      </section>
      <section className="directory-map-card">
        <div>
          <MapPin size={20} />
          <strong>{filteredBusinesses.length} locales encontrados</strong>
          <span>{filteredBusinesses.filter((business) => getOpenStatus(business).open).length} abiertos ahora - {businessSection === 'Todos' ? 'todo Liceo' : businessSection}</span>
        </div>
        <a href={liceoMapUrl} target="_blank" rel="noreferrer">Abrir Maps</a>
      </section>
      <section className="real-map-card directory-real-map">
        <iframe title="Mapa de Barrio Liceo" src={liceoMapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
      </section>
      <section className="directory-zone-map" aria-label="Mapa rapido de secciones">
        {sections.slice(1).map((section) => (
          <button
            className={businessSection === section ? 'active' : ''}
            type="button"
            key={section}
            onClick={() => setBusinessSection(section)}
          >
            <span>{section.replace('Liceo ', '')}</span>
            <b>{businesses.filter((business) => business.section === section).length}</b>
          </button>
        ))}
      </section>
      <section className="directory-filters">
        <div className="search-row compact">
          <Search size={18} />
          <input
            value={businessQuery}
            onChange={(event) => setBusinessQuery(event.target.value)}
            placeholder="Buscar local o producto"
          />
        </div>
        <div className="directory-switches">
          <button
            className={businessSection === 'Todos' ? 'active' : ''}
            type="button"
            onClick={() => setBusinessSection('Todos')}
          >
            Todo Liceo
          </button>
          <button
            className={openOnly ? 'active' : ''}
            type="button"
            onClick={() => setOpenOnly((value) => !value)}
          >
            Solo abiertos
          </button>
        </div>
        <div className="section-row">
          {categories.map(({ name }) => (
            <button
              className={businessCategory === name ? 'active' : ''}
              type="button"
              key={name}
              onClick={() => setBusinessCategory(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </section>
      <section className="directory-list">
        {filteredBusinesses.length > 0 ? (
          filteredBusinesses.map((business, index) => (
            <BusinessCard business={business} key={business.id || `${business.name}-${index}`} onOpen={() => onOpen(business)} large />
          ))
        ) : (
          <div className="empty-state directory-empty">
            <strong>No hay locales con esos filtros</strong>
            <span>Proba otra seccion, rubro o saca "Solo abiertos".</span>
            <button type="button" onClick={() => {
              setBusinessCategory('Todas')
              setBusinessSection('Todos')
              setOpenOnly(false)
              setBusinessQuery('')
            }}>
              Limpiar filtros
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function BusinessCard({ business, onOpen, large = false }) {
  const openStatus = getOpenStatus(business)
  const publicAddress = hasBusinessPublicAddress(business)
  const founderActive = isFounderPlanActive(business)
  const availableMenu = getBusinessMenu(business).filter((item) => item.available !== false)
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${business.address || business.section}, Cordoba, Argentina`)}`
  const whatsappUrl = makeWhatsAppUrl(
    business.whatsapp,
    `Hola ${business.name}, te encontre en Cerca Liceo. Queria consultar por productos y horarios.`,
  )
  const instagramUrl = makeInstagramUrl(business.instagram)

  return (
    <article className={`business-card business-${business.tone} ${large ? 'large' : ''}`} onClick={onOpen}>
      <div {...imageSurfaceProps(business.image, 'business-photo', business)}></div>
      <div className="business-info">
        <small>{business.category} - {business.section}</small>
        <h3>{business.name}</h3>
        <div className="business-trust-row">
          {business.verified && (
            <span>
              <BadgeCheck size={12} />
              Verificado
            </span>
          )}
          <span>{business.rating === 'Nuevo' ? 'Nuevo local' : `${business.rating} rating`}</span>
          <span>{business.distance}</span>
        </div>
        <div className={`open-badge ${openStatus.open ? 'is-open' : 'is-closed'}`}>
          <i></i>
          {openStatus.open ? 'Abierto' : 'Cerrado'}
        </div>
        <p>
          {publicAddress ? <MapPin size={13} /> : <MessageCircle size={13} />}
          {publicAddress ? business.address : 'Coordina por WhatsApp o Instagram'}
        </p>
        {large && (
          <div className="business-extra-line">
            <span>{business.delivery}</span>
            <span>{business.orderHours}</span>
            <span>{business.followers} seguidores</span>
          </div>
        )}
        {founderActive && availableMenu.length > 0 && (
          <ul>
            {availableMenu.slice(0, large ? 5 : 2).map((item, index) => (
              <li key={`${item.name}-${index}`}>
                <span>{item.name}</span>
                {item.price && <b>{item.price}</b>}
              </li>
            ))}
          </ul>
        )}
        {large && (
          <div className="business-actions">
            <button type="button" onClick={(event) => {
              event.stopPropagation()
              onOpen()
            }}>
              Ver local
            </button>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
              WhatsApp
            </a>
            {instagramUrl && (
              <a href={instagramUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                Instagram
              </a>
            )}
            {publicAddress && (
              <a href={mapUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                Como llegar
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

function BusinessDetailScreen({ business, onBack, onToggleTheme }) {
  const publicAddress = hasBusinessPublicAddress(business)
  const founderActive = isFounderPlanActive(business)
  const mapQuery = `${business.address || business.section}, Cordoba, Argentina`
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
  const instagramUrl = makeInstagramUrl(business.instagram)
  const openStatus = getOpenStatus(business)
  const [cart, setCart] = useState({})
  const [orderMode, setOrderMode] = useState('Retiro')
  const [note, setNote] = useState('')
  const orderModes = business.hasDelivery ? ['Retiro', 'Envio', 'Consultar'] : ['Retiro', 'Consultar']
  const priceToNumber = (price) => Number(String(price || '').replace(/[^\d]/g, ''))
  const availableMenu = founderActive ? getBusinessMenu(business).filter((item) => item.available !== false) : []
  const cartItems = availableMenu
    .map((item) => ({
      ...item,
      quantity: cart[item.name] || 0,
      numericPrice: priceToNumber(item.price),
    }))
    .filter((item) => item.quantity > 0)
  const total = cartItems.reduce((sum, item) => sum + item.numericPrice * item.quantity, 0)
  const formattedTotal = total > 0 ? `$${total.toLocaleString('es-AR')}` : 'A confirmar'
  const selectedCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const orderText = encodeURIComponent(
    `Hola ${business.name}, quiero hacer este pedido desde Cerca Liceo:\n\n${cartItems
      .map((item) => `- ${item.quantity}x ${item.name}${item.price ? ` (${item.price})` : ' (consultar precio)'}`)
      .join('\n')}\n\nTotal: ${formattedTotal}\nEntrega: ${orderMode}\nNota: ${note || 'Sin nota'}\n${publicAddress ? `Direccion del local: ${business.address}` : `Zona: ${business.section}. Coordinar entrega o consulta por mensaje.`}`,
  )
  const whatsappUrl = makeWhatsAppUrl(business.whatsapp, decodeURIComponent(orderText))
  const updateQuantity = (itemName, change) => {
    setCart((current) => ({
      ...current,
      [itemName]: Math.max(0, (current[itemName] || 0) + change),
    }))
  }

  return (
    <div className="detail-screen">
      <header className="detail-header">
        <button type="button" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <strong>Local</strong>
        <ThemeToggle onToggleTheme={onToggleTheme} />
      </header>
      <div className={`detail-hero offer-${business.tone}`}>
        <div {...imageSurfaceProps(business.image, 'detail-image', business)}></div>
        <span>{business.category}</span>
      </div>
      <section className="detail-content">
        <div className="detail-title">
          <div>
            <small>{business.section}</small>
            <h1>{business.name}</h1>
            <div className={`open-badge ${openStatus.open ? 'is-open' : 'is-closed'}`}>
              <i></i>
              {openStatus.label}
            </div>
          </div>
        </div>
        <div className="business-detail-stats">
          <article>
            <BadgeCheck size={16} />
            <strong>{business.verified ? 'Verificado' : 'Nuevo'}</strong>
            <span>estado</span>
          </article>
          <article>
            <Heart size={16} />
            <strong>{business.followers}</strong>
            <span>seguidores</span>
          </article>
          <article>
            <Navigation size={16} />
            <strong>{business.distance}</strong>
            <span>de tu zona</span>
          </article>
        </div>
        <section className="local-decision-strip" aria-label="Datos rapidos del local">
          <article className={openStatus.open ? 'good' : 'muted'}>
            <Clock3 size={15} />
            <span>{openStatus.label}</span>
            <strong>{openStatus.detail}</strong>
          </article>
          <article>
            <MessageCircle size={15} />
            <span>Contacto</span>
            <strong>{founderActive ? 'Pedido armado por WhatsApp' : 'Consulta directa por WhatsApp'}</strong>
          </article>
          <article className={business.hasDelivery ? 'good' : 'muted'}>
            <Navigation size={15} />
            <span>{business.hasDelivery ? 'Delivery' : 'Retiro'}</span>
            <strong>{business.deliveryZone}</strong>
          </article>
        </section>
        <div className="detail-grid">
          <InfoItem icon={publicAddress ? <MapPin size={18} /> : <MessageCircle size={18} />} label={publicAddress ? 'Direccion' : 'Contacto'} value={publicAddress ? business.address : 'Sin direccion publica'} />
          <InfoItem icon={<Clock3 size={18} />} label="Horario" value={business.hours} />
          <InfoItem icon={<Store size={18} />} label="Rubro" value={business.category} />
        </div>
        <section className="photo-strip" aria-label="Fotos del local">
          {[0, 1, 2].map((item) => (
            <div {...imageSurfaceProps(business.image, 'photo-tile', business)} key={item}>
              <span>{item === 0 ? 'Producto' : item === 1 ? 'Local' : 'Promo'}</span>
            </div>
          ))}
        </section>
        {founderActive && (
          <>
            <div className="delivery-panel">
              <div>
                <span>{business.hasDelivery ? 'Delivery activo' : 'Solo retiro'}</span>
                <strong>{business.hasDelivery ? 'El local puede enviar tu pedido' : 'Retiras por el local'}</strong>
              </div>
              <div>
                <span>Horario de pedidos</span>
                <strong>{business.orderHours}</strong>
              </div>
              <div className={business.hasDelivery ? 'is-on' : 'is-off'}>
                <span>Zona</span>
                <strong>{business.deliveryZone}</strong>
              </div>
            </div>
            <div className="order-studio">
              <div className="order-studio-head">
                <span>Pedido por WhatsApp</span>
                <h2>Elegis productos y sale el mensaje listo.</h2>
                <p>Sin cuenta, sin comision y sin escribir todo de nuevo. Ideal para comida de noche o pedidos rapidos.</p>
              </div>
              {!openStatus.open && (
                <div className="closed-note">
                  <Clock3 size={16} />
                  <span>El local figura cerrado. Igual podes dejar consulta para cuando atienda.</span>
                </div>
              )}
              <div className="order-tabs" aria-label="Secciones del local">
                <button className="active" type="button">Productos</button>
                <button type="button">Ofertas</button>
                <button type="button">Info</button>
              </div>
              <div className="order-catalog">
                {availableMenu.map((item, index) => {
                  const quantity = cart[item.name] || 0

                  return (
                    <div className={`product-row ${quantity > 0 ? 'is-selected' : ''}`} key={`${item.name}-${index}`}>
                      <div {...imageSurfaceProps(business.image, 'product-thumb', business)}>
                        <span>{index + 1}</span>
                      </div>
                      <div className="product-copy">
                        <strong>{item.name}</strong>
                        <small>{index === 0 ? 'Mas pedido hoy' : business.category}</small>
                        {item.price ? <b>{item.price}</b> : <em>Consultar precio</em>}
                      </div>
                      <div className="qty-control">
                        <button type="button" onClick={() => updateQuantity(item.name, -1)} aria-label={`Quitar ${item.name}`}>
                          -
                        </button>
                        <strong>{quantity}</strong>
                        <button type="button" onClick={() => updateQuantity(item.name, 1)} aria-label={`Agregar ${item.name}`}>
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className={`order-options ${business.hasDelivery ? '' : 'compact'}`}>
                {orderModes.map((mode) => (
                  <button
                    className={orderMode === mode ? 'active' : ''}
                    type="button"
                    key={mode}
                    onClick={() => setOrderMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <label className="order-note">
                <span>Nota para el local</span>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Ej: paso en 30 min, sin cebolla..."
                />
              </label>
            </div>
          </>
        )}
        {!founderActive && (
          <section className="order-studio locked-feature public-contact-only">
            <div className="order-studio-head">
              <span>Ficha gratis</span>
              <h2>Contacta directo al comercio.</h2>
              <p>Este comercio todavia no tiene mini carta ni pedidos armados. Podes consultar productos, disponibilidad y precios por WhatsApp.</p>
            </div>
            <a className="map-link-button" href={makeWhatsAppUrl(business.whatsapp, `Hola ${business.name}, te encontre en Cerca Liceo. Queria consultar.`)} target="_blank" rel="noreferrer">
              <MessageCircle size={14} /> Consultar por WhatsApp
            </a>
          </section>
        )}
        {publicAddress ? (
          <section className="real-location-map">
            <div>
              <span>Ubicacion</span>
              <strong>{business.address || business.section}</strong>
            </div>
            <iframe title={`Mapa de ${business.name}`} src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
            <a className="map-link-button" href={mapUrl} target="_blank" rel="noreferrer">
              <Navigation size={14} /> Abrir en Google Maps
            </a>
          </section>
        ) : (
          <section className="real-location-map contact-location-card">
            <div>
              <span>Emprendimiento sin local publico</span>
              <strong>Coordina directo por mensaje</strong>
            </div>
            <p>Esta ficha no muestra direccion. Podes consultar disponibilidad, punto de entrega o envio por WhatsApp.</p>
            <div className="contact-location-actions">
              <a className="map-link-button" href={makeWhatsAppUrl(business.whatsapp, `Hola ${business.name}, te encontre en Cerca Liceo. Queria consultar.`)} target="_blank" rel="noreferrer">
                <MessageCircle size={14} /> WhatsApp
              </a>
              {instagramUrl && (
                <a className="map-link-button secondary" href={instagramUrl} target="_blank" rel="noreferrer">
                  Instagram
                </a>
              )}
            </div>
          </section>
        )}
        {founderActive && (
        <a className={`detail-whatsapp ${cartItems.length ? '' : 'is-disabled'}`} href={cartItems.length ? whatsappUrl : undefined} target="_blank" rel="noreferrer" aria-disabled={!cartItems.length}>
          <MessageCircle size={19} />
          {cartItems.length ? 'Consultar por WhatsApp' : 'Elegir productos primero'}
        </a>
        )}
      </section>
      {founderActive && cartItems.length > 0 && (
        <div className="order-cart-bar">
          <div>
            <span>{selectedCount} productos</span>
            <strong>{formattedTotal}</strong>
          </div>
          <a href={whatsappUrl} target="_blank" rel="noreferrer">
            Enviar pedido
            <MessageCircle size={17} />
          </a>
        </div>
      )}
    </div>
  )
}

function WelcomeScreen({ onEnter }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-top">
        <span className="app-logo big">C</span>
        <div>
          <strong>Cerca</strong>
          <small>Liceo</small>
        </div>
      </div>
      <div className="welcome-art">
        <div className="welcome-phone">
          <div className="phone-topline">
            <span>Cerca Liceo</span>
            <b>Barrio</b>
          </div>
          <div className="phone-search">Buscar comida, ferreteria, belleza</div>
          <div className="phone-offer offer-orange">
            <i className="image-milanesa"></i>
            <strong>Que hay hoy</strong>
            <b>Cerca</b>
          </div>
          <div className="phone-offer offer-green compact">
            <i className="image-veggie"></i>
            <strong>Locales abiertos</strong>
            <b>Maps</b>
          </div>
        </div>
        <div className="welcome-orbit orbit-a">Comercios cerca</div>
        <div className="welcome-orbit orbit-b">Info actualizada</div>
        <div className="welcome-orbit orbit-c">Contacto directo</div>
      </div>
      <div className="welcome-copy">
        <span>Guia simple para moverte por Liceo</span>
        <h1>Encontra rapido lo que hay cerca.</h1>
        <p>
          Mira comercios del barrio, promos vigentes, horarios, direccion y contacto.
          Todo pensado para resolver sin perderte en grupos ni preguntar mil veces.
        </p>
        <button className="enter-button welcome-main-cta" type="button" onClick={onEnter}>
          Ingresar
          <ChevronRight size={19} />
        </button>
        <div className="welcome-explainer" aria-label="Como funciona">
          <article>
            <Search size={16} />
            <strong>Busca facil</strong>
            <span>por rubro, producto o servicio</span>
          </article>
          <article>
            <MapPin size={16} />
            <strong>Ubica el local</strong>
            <span>direccion, seccion y horario</span>
          </article>
          <article>
            <MessageCircle size={16} />
            <strong>Consulta directo</strong>
            <span>sin intermediarios ni vueltas</span>
          </article>
        </div>
        <div className="welcome-rules">
          <span>Promos vigentes</span>
          <span>Locales del barrio</span>
          <span>Servicios a mano</span>
        </div>
      </div>
    </div>
  )
}

function DetailScreen({ offer, relatedOffers = [], onBack, onToggleTheme }) {
  const publicAddress = hasBusinessPublicAddress(offer)
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${offer.address}, Cordoba, Argentina`)}`
  const whatsappUrl = getOfferWhatsappUrl(offer)
  const instagramUrl = makeInstagramUrl(offer.instagram)
  const openStatus = getOfferOpenStatus(offer)

  return (
    <div className="detail-screen">
      <header className="detail-header">
        <button type="button" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <strong>Detalle de oferta</strong>
        <ThemeToggle onToggleTheme={onToggleTheme} />
      </header>

      <div className={`detail-hero offer-${offer.tone}`}>
        <div {...imageSurfaceProps(offer.image, 'detail-image')}></div>
        <div className="photo-stack">
          <i {...imageSurfaceProps(offer.image, '')}></i>
          <i className="image-bread"></i>
          <i className="image-pantry"></i>
        </div>
        <div className="carousel-dots">
          <i></i>
          <i></i>
          <i></i>
        </div>
        <span>{offer.category}</span>
      </div>

      <section className="detail-action-strip">
        <button type="button">
          <Heart size={17} />
          Guardar
        </button>
        <button type="button">
          <Share2 size={17} />
          Compartir
        </button>
        <button type="button">
          <ShieldCheck size={17} />
          Verificado
        </button>
      </section>

      <section className="detail-content">
        <div className="detail-title">
          <div>
            <small>{offer.business}</small>
            <h1>{offer.title}</h1>
            <div className={`open-badge ${openStatus.open ? 'is-open' : 'is-closed'}`}>
              <i></i>
              {openStatus.label}
            </div>
          </div>
          <b>{offer.price}</b>
        </div>
        <button className="follow-button" type="button">
          <Heart size={17} />
          Seguir local
        </button>
        <div className="detail-proof">
          <span>{offer.distance} de tu zona</span>
          <span>{offer.saves} vecinos lo guardaron</span>
          <span>{offer.highlight}</span>
        </div>
        <p>{offer.description}</p>

        <div className="detail-grid">
          <InfoItem icon={publicAddress ? <MapPin size={18} /> : <MessageCircle size={18} />} label={publicAddress ? 'Ubicacion' : 'Contacto'} value={publicAddress ? offer.address : 'Coordinar por WhatsApp'} />
          <InfoItem icon={<Store size={18} />} label="Referencia" value={offer.reference} />
          <InfoItem icon={<Clock3 size={18} />} label="Horario" value={offer.hours} />
          <InfoItem icon={<Bell size={18} />} label="Vigencia" value={`Vence en ${offer.expires}`} />
        </div>

        {publicAddress ? (
          <a className="map-preview map-link" href={mapUrl} target="_blank" rel="noreferrer">
            <span></span>
            <b><Navigation size={14} /> Como llegar</b>
          </a>
        ) : (
          <section className="map-preview contact-offer-card">
            <div>
              <MessageCircle size={18} />
              <strong>Sin direccion publica</strong>
            </div>
            <p>Consultale al emprendimiento y coordina entrega, retiro o disponibilidad.</p>
            {instagramUrl && <a href={instagramUrl} target="_blank" rel="noreferrer">Ver Instagram</a>}
          </section>
        )}

        <section className="related-block">
          <div className="feed-head compact">
            <div>
              <Sparkles size={17} />
              <strong>Tambien cerca</strong>
            </div>
          </div>
          <div className="related-row">
            {relatedOffers
              .filter((item) => item.title !== offer.title)
              .slice(0, 3)
              .map((item) => (
                <button className={`related-card offer-${item.tone}`} type="button" key={item.title}>
                  <span>{item.category}</span>
                  <strong>{item.title}</strong>
                  <b>{item.price}</b>
                </button>
              ))}
          </div>
        </section>

        <a className="detail-whatsapp sticky-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer">
          <MessageCircle size={19} />
          Consultar por WhatsApp
        </a>
      </section>
    </div>
  )
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="info-item">
      {icon}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

function OfferCard({ offer, onOpen }) {
  const whatsappUrl = getOfferWhatsappUrl(offer)
  const openStatus = getOfferOpenStatus(offer)

  return (
    <article className={`offer-card offer-${offer.tone}`} onClick={onOpen}>
      <div {...imageSurfaceProps(offer.image, 'offer-image')}>
        <span>{offer.category}</span>
      </div>
      <div className="offer-info">
        <div className="offer-top">
          <small>{offer.business}</small>
          <span>{offer.expires}</span>
        </div>
        <div className="offer-category-line">
          <span>{offer.category}</span>
          <b>{offer.highlight}</b>
        </div>
        <h2>{offer.title}</h2>
        <div className="offer-meta">
          <span>
            <MapPin size={13} />
            {offer.section} - {offer.distance}
          </span>
          <b>{offer.price}</b>
        </div>
        <div className="offer-bottom-line">
          <div className={`open-badge mini ${openStatus.open ? 'is-open' : 'is-closed'}`}>
            <i></i>
            {openStatus.open ? 'Abierto' : 'Cerrado'}
          </div>
          <span>{offer.saves} guardados</span>
        </div>
      </div>
      <a className="whatsapp-button" href={whatsappUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
        <MessageCircle size={17} />
        WhatsApp
      </a>
    </article>
  )
}

export default App
