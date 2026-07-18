import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Camera,
  Flame,
  BookOpen,
  Gift,
  Grid2X2,
  Hammer,
  Heart,
  Home,
  HeartPulse,
  Eye,
  Laptop,
  List,
  MapPin,
  MessageCircle,
  Moon,
  Navigation,
  PawPrint,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBasket,
  Shirt,
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
  { name: 'Indumentaria', icon: Shirt, tone: 'sky' },
  { name: 'Lenceria', icon: Heart, tone: 'rose' },
  { name: 'Salud', icon: HeartPulse, tone: 'mint' },
  { name: 'Mascotas', icon: PawPrint, tone: 'violet' },
  { name: 'Libreria', icon: BookOpen, tone: 'sand' },
  { name: 'Regaleria', icon: Gift, tone: 'coral' },
  { name: 'Tecnologia', icon: Laptop, tone: 'cyan' },
  { name: 'Hogar', icon: Home, tone: 'olive' },
]

const commerceCategories = categories.filter((category) => category.name !== 'Todas')

const readStoredJson = (key) => {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

const getOrCreateVisitorId = () => {
  const key = 'cerca-liceo-visitor-id'
  const saved = window.localStorage.getItem(key)
  if (saved) return saved
  const randomUuid = window.crypto?.randomUUID
  const id = typeof randomUuid === 'function'
    ? randomUuid.call(window.crypto)
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
  window.localStorage.setItem(key, id)
  return id
}

const offers = defaultOffers
const businesses = defaultBusinesses
const realDataMode = cercaApi.isSupabaseEnabled()
const liceoMapQuery = 'Barrio Liceo Procrear Cordoba Argentina'
const liceoMapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(liceoMapQuery)}&output=embed`
const liceoMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(liceoMapQuery)}`
const liceoMapCenter = { lat: -31.3583, lng: -64.1212 }
const liceoMapBounds = {
  north: -31.3518,
  south: -31.3658,
  west: -64.1328,
  east: -64.1088,
}

const clampPercent = (value, min = 8, max = 92) => Math.max(min, Math.min(max, value))

const getMapPointFromCoordinates = (business = {}, bounds = liceoMapBounds) => {
  if (!hasBusinessPin(business)) return null
  const lat = Number(business.locationLat ?? business.location_lat)
  const lng = Number(business.locationLng ?? business.location_lng)
  const x = ((lng - bounds.west) / (bounds.east - bounds.west)) * 100
  const y = ((bounds.north - lat) / (bounds.north - bounds.south)) * 100
  return {
    x: clampPercent(x),
    y: clampPercent(y),
  }
}

const parseMapCoordinates = (value = '') => {
  const text = String(value).trim()
  if (!text) return null
  const normalized = text
    .replace(/%2C/gi, ',')
    .replace(/\s+/g, ' ')
  const numberPattern = '-?\\d+(?:[.,]\\d+)?'
  const patterns = [
    new RegExp(`@(${numberPattern}),\\s*(${numberPattern})`),
    new RegExp(`!3d(${numberPattern})!4d(${numberPattern})`),
    new RegExp(`(?:q|query)=(${numberPattern})\\s*[,;]\\s*(${numberPattern})`, 'i'),
    new RegExp(`(${numberPattern})\\s*[,;]\\s*(${numberPattern})`),
  ]
  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (!match) continue
    const lat = Number(String(match[1]).replace(',', '.'))
    const lng = Number(String(match[2]).replace(',', '.'))
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }
    }
  }
  return null
}

const hasBusinessPin = (business = {}) => {
  const latValue = business.locationLat ?? business.location_lat
  const lngValue = business.locationLng ?? business.location_lng
  if (String(latValue ?? '').trim() === '' || String(lngValue ?? '').trim() === '') return false
  const lat = Number(latValue)
  const lng = Number(lngValue)
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

const getBusinessMapUrl = (business = {}) => {
  const lat = business.locationLat ?? business.location_lat
  const lng = business.locationLng ?? business.location_lng
  if (hasBusinessPin(business)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${business.address || business.section || 'Barrio Liceo'}, Cordoba, Argentina`)}`
}

function RealLocationPicker({ location = {}, onPick, mapUrl }) {
  const mapNodeRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const onPickRef = useRef(onPick)
  const selectedLat = hasBusinessPin(location) ? Number(location.locationLat ?? location.location_lat) : null
  const selectedLng = hasBusinessPin(location) ? Number(location.locationLng ?? location.location_lng) : null
  const initialMapStateRef = useRef({
    center: selectedLat !== null && selectedLng !== null
      ? { lat: selectedLat, lng: selectedLng }
      : liceoMapCenter,
    zoom: selectedLat !== null && selectedLng !== null ? 17 : 15,
  })

  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return undefined
    const initialCenter = initialMapStateRef.current.center
    const map = L.map(mapNodeRef.current, {
      attributionControl: false,
      zoomControl: true,
      scrollWheelZoom: false,
      tap: true,
    }).setView([initialCenter.lat, initialCenter.lng], initialMapStateRef.current.zoom)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(map)

    map.on('click', (event) => {
      const lat = Number(event.latlng.lat.toFixed(6))
      const lng = Number(event.latlng.lng.toFixed(6))
      onPickRef.current?.({ lat, lng })
    })

    mapRef.current = map
    window.setTimeout(() => map.invalidateSize(), 160)

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (selectedLat === null || selectedLng === null) {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      return
    }

    const latLng = [selectedLat, selectedLng]
    if (!markerRef.current) {
      markerRef.current = L.marker(latLng, {
        icon: L.divIcon({
          className: 'cerca-leaflet-pin',
          html: '<span></span>',
          iconSize: [34, 42],
          iconAnchor: [17, 40],
        }),
      }).addTo(map)
    } else {
      markerRef.current.setLatLng(latLng)
    }
    map.setView(latLng, Math.max(map.getZoom(), 17), { animate: true })
  }, [selectedLat, selectedLng])

  return (
    <div className="real-map-picker">
      <div ref={mapNodeRef} className="real-map-canvas" aria-label="Mapa real para tocar la ubicacion del local" />
      <div className="map-link-row">
        <a className="map-link-button" href={mapUrl} target="_blank" rel="noreferrer">
          Abrir Google Maps
        </a>
        <span>{selectedLat !== null && selectedLng !== null ? `${selectedLat}, ${selectedLng}` : 'Toca el mapa para poner el pin real del local.'}</span>
      </div>
    </div>
  )
}

const isUploadedImage = (image) => typeof image === 'string' && (
  image.startsWith('data:') ||
  image.startsWith('blob:') ||
  image.startsWith('http')
)

const isAndroidCompatMode = () => document.documentElement.classList.contains('android-compat')

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

const cleanPhoneDigits = (phone = '') => String(phone).replace(/\D/g, '')

const normalizeArgentineWhatsapp = (phone = '') => {
  const digits = cleanPhoneDigits(phone)
  if (!digits) return ''
  if (digits.startsWith('549') && digits.length === 13) return digits.slice(3)
  if (digits.startsWith('54') && digits.length === 12) return digits.slice(2)
  if (digits.startsWith('0') && digits.length === 11) return digits.slice(1)
  return digits
}

const isValidArgentineWhatsapp = (phone = '') => {
  const local = normalizeArgentineWhatsapp(phone)
  return local.length === 10
}

const normalizePhone = (phone = '') => {
  const digits = String(phone).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('549') && digits.length === 13) return digits
  if (digits.startsWith('54') && digits.length === 12) return `549${digits.slice(2)}`
  const local = normalizeArgentineWhatsapp(digits)
  if (local.length === 10) return `549${local}`
  return digits
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
    (
      hasBusinessPin(safeBusiness) ||
      (
        Boolean(String(safeBusiness.address || '').trim()) &&
        !String(safeBusiness.address || '').toLowerCase().includes('completar')
      )
    )
  )
}

const isFounderPlanActive = (business = {}) => {
  const safeBusiness = business || {}
  const plan = safeBusiness.plan === 'orders' ? 'pedidos' : safeBusiness.plan
  if (plan !== 'pedidos' || safeBusiness.planStatus !== 'active') return false
  if (!safeBusiness.paidUntil) return true
  const paidUntil = new Date(`${safeBusiness.paidUntil}T23:59:59`)
  return Number.isNaN(paidUntil.getTime()) || paidUntil.getTime() >= Date.now()
}

const isFounderPlanRequested = (business = {}) => {
  const safeBusiness = business || {}
  const plan = safeBusiness.plan === 'orders' ? 'pedidos' : safeBusiness.plan
  return plan === 'pedidos' && safeBusiness.planStatus !== 'active'
}

const isFounderPlanExpired = (business = {}) => {
  const safeBusiness = business || {}
  const plan = safeBusiness.plan === 'orders' ? 'pedidos' : safeBusiness.plan
  if (plan !== 'pedidos' || safeBusiness.planStatus !== 'active' || !safeBusiness.paidUntil) return false
  const paidUntil = new Date(`${safeBusiness.paidUntil}T23:59:59`)
  return !Number.isNaN(paidUntil.getTime()) && paidUntil.getTime() < Date.now()
}

const getFounderPaidUntil = (days = 30) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const MS_DAY = 86400000

const getDaysLeft = (dateValue) => {
  if (!dateValue) return null
  const end = new Date(String(dateValue).includes('T') ? dateValue : `${dateValue}T23:59:59`)
  if (Number.isNaN(end.getTime())) return null
  return Math.ceil((end.getTime() - Date.now()) / MS_DAY)
}

const getFounderDaysLeft = (business = {}) => getDaysLeft(business.paidUntil)

const isFounderExpiringSoon = (business = {}) => {
  const days = getFounderDaysLeft(business)
  return isFounderPlanActive(business) && days !== null && days <= 5
}

const isOfferExpired = (offer = {}) => {
  const days = getDaysLeft(offer.expiresAt)
  return days !== null && days <= 0
}

const isOfferPaused = (offer = {}) => (
  offer.paused === true
  || offer.isActive === false
  || offer.active === false
)

const isOfferActiveNow = (offer = {}) => !isOfferExpired(offer) && !isOfferPaused(offer)

const getOfferDaysLeft = (offer = {}) => getDaysLeft(offer.expiresAt)

const hasRealBusinessPhoto = (business = {}) => isUploadedImage(business.image)

const isRecentBusiness = (business = {}) => {
  if (!business.createdAt) return false
  const created = new Date(business.createdAt)
  return !Number.isNaN(created.getTime()) && Date.now() - created.getTime() <= 7 * MS_DAY
}

const getPublicUrl = () => {
  if (typeof window === 'undefined') return 'https://www.cercaliceo.com.ar'
  return window.location.origin || 'https://www.cercaliceo.com.ar'
}

const buildCercaWhatsAppMessage = ({ business, offer, orderLines = '', total = '', note = '', mode = '' }) => {
  const title = offer
    ? `Hola ${business?.name || offer.business}, vi esta promo en Cerca Liceo:`
    : `Hola ${business?.name || 'comercio'}, te encontre en Cerca Liceo.`
  const parts = [
    title,
    offer ? `${offer.title}${offer.price ? ` - ${offer.price}` : ''}` : '',
    orderLines ? `Pedido:\n${orderLines}` : '',
    total ? `Total: ${total}` : '',
    mode ? `Entrega: ${mode}` : '',
    note ? `Nota: ${note}` : '',
    `Link: ${getPublicUrl()}`,
  ].filter(Boolean)
  return parts.join('\n')
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
  if (!Number.isFinite(openHour) || !Number.isFinite(closeHour)) {
    return {
      open: safeBusiness.open !== false,
      label: safeBusiness.open === false ? 'Cerrado ahora' : 'Horario a confirmar',
      detail: safeBusiness.hours || 'Horario a confirmar',
    }
  }
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
  const message = buildCercaWhatsAppMessage({
    business: matchedBusiness || { name: offer.business },
    offer,
    note: 'Queria consultar si sigue disponible.',
  })
  return makeWhatsAppUrl(phone, message)
}

const MAX_MENU_ITEMS = 15
const MENU_SECTION_SIZE = 5
const menuCatalogSections = [
  {
    title: 'Destacados',
    shortTitle: 'Destacados',
    hint: 'Combos, promos o lo mas pedido',
  },
  {
    title: 'Catalogo principal',
    shortTitle: 'Catalogo',
    hint: 'Productos o servicios que siempre ofreces',
  },
  {
    title: 'Extras y variantes',
    shortTitle: 'Extras',
    hint: 'Packs, tamanos, marcas, agregados o consultas',
  },
]

const createMenuSlot = (_index) => ({
  name: '',
  price: '',
  available: true,
})

const ensureMenuSlots = (menu = [], minSlots = MAX_MENU_ITEMS) => {
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

const buildMenuSections = (menu = []) => {
  const slots = ensureMenuSlots(menu, MAX_MENU_ITEMS).slice(0, MAX_MENU_ITEMS)

  return menuCatalogSections.map((section, sectionIndex) => {
    const start = sectionIndex * MENU_SECTION_SIZE
    return {
      ...section,
      start,
      items: slots.slice(start, start + MENU_SECTION_SIZE).map((item, index) => ({
        ...item,
        slotIndex: start + index,
      })),
    }
  })
}

const buildFilledMenuSections = (menu = []) => buildMenuSections(menu)
  .map((section) => ({
    ...section,
    items: section.items.filter((item) => item.available !== false && item.name?.trim()),
  }))
  .filter((section) => section.items.length)

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
  hasPublicAddress: local?.hasPublicAddress ?? (account?.businessType !== 'entrepreneur'),
  category: local?.category || account?.category || 'Comida',
  section: local?.section || account?.section || 'Liceo Procrear',
  address: local?.address || account?.address || '',
  reference: local?.reference || account?.reference || '',
  locationMode: local?.locationMode || account?.locationMode || (local?.businessType === 'entrepreneur' || account?.businessType === 'entrepreneur' ? 'none' : hasBusinessPin(local || account) ? 'pin' : 'address'),
  locationLat: local?.locationLat || account?.locationLat || '',
  locationLng: local?.locationLng || account?.locationLng || '',
  locationPrecision: local?.locationPrecision || account?.locationPrecision || 'approximate',
  locationNote: local?.locationNote || account?.locationNote || '',
  hours: local?.hours || '',
  openDays: local?.openDays || [],
  openTime: local?.openTime || '',
  closeTime: local?.closeTime || '',
  whatsapp: local?.whatsapp || account?.whatsapp || '',
  instagram: local?.instagram || account?.instagram || '',
  description: local?.description || '',
  paymentMethods: local?.paymentMethods || '',
  delivery: local?.delivery || account?.salesMode || 'Retiro y delivery',
  plan: local?.plan || 'gratis',
  planStatus: local?.planStatus || 'free',
  paidUntil: local?.paidUntil || '',
  adminNotes: local?.adminNotes || '',
  isPublic: local?.isPublic ?? true,
  open: local?.open ?? true,
  image: local?.image || '',
  imageZoom: local?.imageZoom || 120,
  imagePosition: local?.imagePosition || 'center center',
  menu: ensureMenuSlots(
    local?.menu?.length
      ? local.menu
      : [
        { name: '', price: '' },
        { name: '', price: '' },
        { name: '', price: '' },
        { name: '', price: '' },
        { name: '', price: '' },
      ],
  ),
})

const imageSurfaceProps = (image, baseClass, options = {}) => ({
  className: `${baseClass} ${isUploadedImage(image) ? 'custom-image' : `image-${image || 'generic'}`}`,
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
  const [screen, setScreen] = useState('home')
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
  const [merchantOffers, setMerchantOffers] = useState([])
  const [feedBusinesses, setFeedBusinesses] = useState(realDataMode ? [] : businesses)
  const [offersLoading, setOffersLoading] = useState(realDataMode)
  const [businessesLoading, setBusinessesLoading] = useState(realDataMode)
  const [adminBusinesses, setAdminBusinesses] = useState([])
  const [adminOffers, setAdminOffers] = useState([])
  const [adminMetrics, setAdminMetrics] = useState({
    pageViews: 0,
    uniqueVisitors: 0,
    businessViews: 0,
    offerViews: 0,
    whatsappClicks: 0,
    favoriteClicks: 0,
  })
  const [publishTemplate, setPublishTemplate] = useState(null)
  const [merchantMetrics, setMerchantMetrics] = useState({
    businessViews: 0,
    offerViews: 0,
    whatsappClicks: 0,
    favoriteClicks: 0,
  })
  const [authNotice, setAuthNotice] = useState('')
  const [pageViews, setPageViews] = useState(() => Number(window.localStorage.getItem('cerca-liceo-page-views') || 0))
  const [sessionHydrated, setSessionHydrated] = useState(false)
  const [analyticsExcluded, setAnalyticsExcluded] = useState(() => window.localStorage.getItem('cerca-liceo-exclude-analytics') === 'true')

  useEffect(() => {
    const currentViews = Number(window.localStorage.getItem('cerca-liceo-page-views') || 0)
    const nextViews = currentViews + 1
    window.localStorage.setItem('cerca-liceo-page-views', String(nextViews))
    setPageViews(nextViews)
  }, [])

  const loadMerchantOffers = async () => {
    const { offers: myOffers, error } = await cercaApi.listMyOffers({ includeExpired: true })
    if (error || !myOffers?.length) return
    setMerchantOffers(myOffers)
    setFeedOffers((current) => mergeUniqueById([...myOffers, ...current]))
  }

  const loadMerchantMetrics = async (businessId = merchantLocal?.id) => {
    if (!businessId) return
    const { metrics } = await cercaApi.getBusinessMetrics({ businessId })
    if (metrics) setMerchantMetrics(metrics)
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
            await loadMerchantMetrics(business.id)
          }
        }
      }
      if (!ignore) setSessionHydrated(true)
    }

    hydrateSession()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!sessionHydrated) return
    const pathKey = `${window.location.pathname}${window.location.hash || ''}`
    const today = new Date().toISOString().slice(0, 10)
    const sentKey = `cerca-liceo-page-view-${today}-${pathKey}`
    if (window.sessionStorage.getItem(sentKey)) return
    window.sessionStorage.setItem(sentKey, '1')

    const visitorId = getOrCreateVisitorId()
    cercaApi.trackEvent({
      type: 'page_view',
      metadata: {
        visitorId,
        exclude: analyticsExcluded || account?.role === 'admin',
        device: isAndroidCompatMode() ? 'android-compat' : 'default',
      },
    })
  }, [sessionHydrated, analyticsExcluded, account?.role])

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
      setOffersLoading(true)
      const { offers: nextOffers, error } = await cercaApi.listOffers({
        section: selectedSection,
        category: selectedCategory,
        query,
      })
      if (!ignore && !error) {
        setFeedOffers(nextOffers)
      }
      if (!ignore) setOffersLoading(false)
    }

    loadOffers()

    return () => {
      ignore = true
    }
  }, [query, selectedCategory, selectedSection])

  useEffect(() => {
    let ignore = false

    const loadBusinesses = async () => {
      setBusinessesLoading(true)
      const { businesses: nextBusinesses, error } = await cercaApi.listBusinesses()
      if (!ignore && !error) {
        setFeedBusinesses(nextBusinesses)
      }
      if (!ignore) setBusinessesLoading(false)
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
      const [{ businesses: nextBusinesses, error }, { offers: nextAdminOffers }, { metrics }] = await Promise.all([
        cercaApi.listAdminBusinesses(),
        cercaApi.listAdminOffers(),
        cercaApi.getAdminMetrics(),
      ])
      if (!ignore && !error) {
        setAdminBusinesses(nextBusinesses)
      }
      if (!ignore && nextAdminOffers) setAdminOffers(nextAdminOffers)
      if (!ignore && metrics) setAdminMetrics(metrics)
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
    if (!account?.id || !merchantLocal?.ownerId) return
    if (merchantLocal.ownerId !== account.id) {
      setMerchantLocal(null)
    }
  }, [account?.id, merchantLocal?.ownerId])

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
    setScreen('profile')
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
        await loadMerchantMetrics(business.id)
      } else {
        setMerchantLocal(null)
      }
      setAuthNotice(businessError
        ? 'Sesion iniciada. No pudimos cargar tu local, pero podes completarlo desde Panel comercio.'
        : business
          ? 'Sesion iniciada. Tu local ya esta cargado.'
          : 'Sesion iniciada. Ahora podes cargar tu local gratis.')
      setScreen('profile')
      return
    }
    setMerchantLocal(null)
    setAuthNotice('Sesion iniciada correctamente.')
    setScreen('profile')
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
    setScreen('login')
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
    await loadMerchantMetrics(nextBusiness.id)
    setFeedBusinesses((current) => {
      const without = current.filter((item) => item.id !== nextBusiness.id)
      return nextBusiness.isPublic === false ? without : [nextBusiness, ...without]
    })
    if (isFounderPlanActive(nextBusiness)) {
      const { businesses: refreshedBusinesses } = await cercaApi.listBusinesses()
      if (refreshedBusinesses?.length) {
        setFeedBusinesses(refreshedBusinesses)
      }
    }
    setFeedOffers((current) => current.map((offer) => (
      offer.businessId === nextBusiness.id || offer.business === nextBusiness.name
        ? {
            ...offer,
            open: nextBusiness.open !== false,
            openDays: nextBusiness.openDays,
            openTime: nextBusiness.openTime,
            closeTime: nextBusiness.closeTime,
            hours: nextBusiness.hours,
          }
        : offer
    )))
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
      setScreen('login')
      return false
    }
    setAccount(savedAccount)
    if (account.type !== 'merchant') {
      setMerchantLocal(null)
    }
    setAuthNotice(warning || message || (account.type === 'merchant' ? 'Cuenta comercio creada. Ya podes cargar tu ficha.' : 'Cuenta vecino creada.'))
    return true
  }

  const upgradeAccountToMerchant = async () => {
    const { account: merchantAccount, error } = await cercaApi.upgradeAccountToMerchant({
      businessType: 'local',
      category: 'Comida',
      salesMode: 'WhatsApp',
    })
    if (error) {
      setAuthNotice(error.message || 'No pudimos cambiar la cuenta a comercio.')
      return
    }
    setAccount(merchantAccount)
    setAuthNotice('Listo. Tu cuenta ahora puede publicar como comercio. Carga tu ficha desde Panel comercio.')
  }

  const publishOffer = async (offerDraft) => {
    const isEditing = Boolean(offerDraft.offerId)
    const { offer, error, warning } = isEditing
      ? await cercaApi.updateOffer(offerDraft)
      : await cercaApi.createOffer(offerDraft)
    if (error) {
      const message = error.message || (isEditing ? 'No se pudo editar la promo.' : 'No se pudo publicar la promo.')
      setAuthNotice(message)
      return { ok: false, message }
    }
    setFeedOffers((current) => isEditing
      ? current.map((item) => (item.id === offer.id ? offer : item))
      : [offer, ...current.filter((item) => item.id !== offer.id)])
    setMerchantOffers((current) => isEditing
      ? current.map((item) => (item.id === offer.id ? offer : item))
      : [offer, ...current.filter((item) => item.id !== offer.id)])
    setAdminOffers((current) => isEditing
      ? current.map((item) => (item.id === offer.id ? offer : item))
      : [offer, ...current.filter((item) => item.id !== offer.id)])
    setPublishTemplate(null)
    const message = warning || (isEditing ? 'Promo actualizada correctamente.' : 'Promo publicada correctamente.')
    setAuthNotice(message)
    return { ok: true, message }
  }

  const openPublish = (template = null, mode = 'new') => {
    setPublishTemplate(template ? { ...template, editMode: mode } : null)
    setScreen('publish')
  }

  const trackInteraction = async ({ type, businessId, offerId, metadata }) => {
    await cercaApi.trackEvent({ type, businessId, offerId, metadata })
    if (merchantLocal?.id && businessId === merchantLocal.id) {
      await loadMerchantMetrics(merchantLocal.id)
    }
  }

  const pauseOffer = async (offer) => {
    const currentActive = !isOfferPaused(offer)
    const nextActive = !currentActive
    const { offer: savedOffer, error } = await cercaApi.updateOfferStatus({ offerId: offer.id, isActive: nextActive, offer })
    if (error) {
      setAuthNotice(error.message || 'No se pudo actualizar la publicacion.')
      return
    }
    setFeedOffers((current) => current.map((item) => (
      item.id === offer.id ? { ...item, ...(savedOffer || {}), isActive: nextActive, paused: !nextActive } : item
    )))
    setMerchantOffers((current) => current.map((item) => (
      item.id === offer.id ? { ...item, ...(savedOffer || {}), isActive: nextActive, paused: !nextActive } : item
    )))
    setAdminOffers((current) => current.map((item) => (
      item.id === offer.id ? { ...item, ...(savedOffer || {}), isActive: nextActive, paused: !nextActive } : item
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
    setMerchantOffers((current) => current.filter((item) => item.id !== offer.id))
    setAdminOffers((current) => current.filter((item) => item.id !== offer.id))
    setAuthNotice('Publicacion eliminada.')
  }

  const repostOffer = async (offer) => {
    const { offer: reposted, error } = await cercaApi.repostOffer({ offer, expiresInDays: 4 })
    if (error) {
      setAuthNotice(error.message || 'No se pudo republicar la promo.')
      return
    }
    setFeedOffers((current) => [reposted, ...current])
    setMerchantOffers((current) => [reposted, ...current])
    setAdminOffers((current) => [reposted, ...current])
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
    setMerchantOffers((current) => current.filter((offer) => offer.businessId !== business.id && offer.business !== business.name))
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
      if (!isOfferActiveNow(offer)) return false
      const key = `${offer.businessId || offer.business}-${offer.title}-${offer.price}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [feedBusinesses, feedOffers])

  const filteredOffers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return publicFeedOffers.filter((offer) => {
      const byCategory = selectedCategory === 'Todas' || offer.category === selectedCategory
      const bySection = selectedSection === 'Todos' || offer.section === selectedSection
      const byQuery =
        normalizedQuery.length === 0 ||
        `${offer.title} ${offer.business} ${offer.category}`.toLowerCase().includes(normalizedQuery)

      return byCategory && bySection && byQuery
    })
  }, [publicFeedOffers, query, selectedCategory, selectedSection])

  const visibleFeedOffers = publicFeedOffers
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
      image: offer.image || 'generic',
      open: getOfferOpenStatus(offer).open,
      isPublic: true,
      menu: [{ name: offer.title, price: offer.price }],
      distance: offer.distance || 'cerca',
    })),
  ]), [feedBusinesses, visibleFeedOffers])
  const merchantOfferHistory = useMemo(() => mergeUniqueById([...merchantOffers, ...feedOffers]), [merchantOffers, feedOffers])

  return (
    <main className={`app-shell ${darkMode ? 'night-mode' : ''}`}>
      <section className="app-screen" aria-label="Cerca Liceo">
        {screen === 'welcome' && <WelcomeScreen onEnter={() => setScreen('home')} />}

        {screen === 'detail' && selectedOffer && (
          <DetailScreen
            offer={selectedOffer}
            relatedOffers={feedOffers}
            onToggleTheme={() => setDarkMode((value) => !value)}
            onTrack={trackInteraction}
            onBack={() => {
              setScreen('home')
              setSelectedOffer(null)
            }}
          />
        )}

        {screen === 'business-detail' && selectedBusiness && (
          <BusinessDetailScreen
            business={selectedBusiness}
            onToggleTheme={() => setDarkMode((value) => !value)}
            onTrack={trackInteraction}
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
            onBack={() => setScreen('home')}
            onOpen={(business) => {
              trackInteraction({ type: 'business_view', businessId: business.id })
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
            offers={merchantOfferHistory}
            pageViews={pageViews}
            onBack={() => setScreen('profile')}
            onMerchantPanel={() => setScreen('my-posts')}
            onPublishOffer={publishOffer}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'my-posts' && (
          <MyPostsScreen
            account={account}
            local={merchantLocal}
            offers={merchantOfferHistory}
            onSaveLocal={saveMerchantLocal}
            onBack={() => setScreen('profile')}
            onPublish={openPublish}
            onPauseOffer={pauseOffer}
            onDeleteOffer={deleteOffer}
            onRepostOffer={repostOffer}
            metrics={merchantMetrics}
            onToggleTheme={() => setDarkMode((value) => !value)}
            onPrivacy={() => setScreen('privacy')}
          />
        )}

        {screen === 'admin' && (
          <AdminScreen
            businesses={adminBusinesses.length ? adminBusinesses : feedBusinesses}
            offers={adminOffers.length ? adminOffers : feedOffers}
            adminMetrics={adminMetrics}
            analyticsExcluded={analyticsExcluded}
            onToggleAnalyticsExcluded={() => {
              const next = !analyticsExcluded
              setAnalyticsExcluded(next)
              window.localStorage.setItem('cerca-liceo-exclude-analytics', String(next))
              setAuthNotice(next ? 'Este dispositivo no se cuenta en visitas.' : 'Este dispositivo vuelve a contar visitas.')
            }}
            onBack={() => setScreen('profile')}
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
                ? { plan: 'gratis', planStatus: 'free', paidUntil: '' }
                : { plan: 'pedidos', planStatus: 'active', paidUntil: getFounderPaidUntil(30) },
              isFounderPlanActive(business) ? 'Plan fundador desactivado.' : 'Plan fundador activado por 30 dias.',
            )}
            onRenewFounder={(business) => updateAdminBusiness(
              business,
              { plan: 'pedidos', planStatus: 'active', paidUntil: getFounderPaidUntil(30) },
              'Plan fundador renovado por 30 dias.',
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
            onRepostOffer={repostOffer}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'profile' && (
          <ProfileScreen
            onBack={() => setScreen('home')}
            onLogin={() => setScreen('login')}
            onMerchantPanel={() => setScreen('my-posts')}
            onPublish={() => openPublish()}
            onAdmin={() => setScreen('admin')}
            onResetSession={resetSession}
            authNotice={authNotice}
            account={account}
            local={merchantLocal}
            onUpgradeToMerchant={upgradeAccountToMerchant}
            onPrivacy={() => setScreen('privacy')}
            onRegister={(type) => {
              setRegisterType(type)
              setScreen('register')
            }}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'privacy' && (
          <PrivacyScreen
            onBack={() => setScreen('profile')}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'login' && (
          <LoginScreen
            authNotice={authNotice}
            onBack={() => setScreen('profile')}
            onLogin={loginAccount}
            onForgotPassword={() => setScreen('forgot-password')}
            onQuickAccess={loginQuick}
            allowQuickAccess={!cercaApi.isSupabaseEnabled()}
            onRegister={(type) => {
              setRegisterType(type)
              setScreen('register')
            }}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'forgot-password' && (
          <ForgotPasswordScreen
            authNotice={authNotice}
            onBack={() => setScreen('login')}
            onSubmit={requestPasswordReset}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'reset-password' && (
          <ResetPasswordScreen
            authNotice={authNotice}
            onBack={() => setScreen('login')}
            onSubmit={updatePassword}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'register' && (
          <RegisterScreen
            initialType={registerType}
            onComplete={registerAccount}
            onBack={() => setScreen('profile')}
            onLogin={() => setScreen('login')}
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

            <HomeAccessCard
              account={account}
              local={merchantLocal}
              onLogin={() => setScreen('login')}
              onRegisterNeighbor={() => {
                setRegisterType('neighbor')
                setScreen('register')
              }}
              onRegisterMerchant={() => {
                setRegisterType('merchant')
                setScreen('register')
              }}
              onUpgradeMerchant={() => upgradeAccountToMerchant()}
              onMerchantPanel={() => setScreen('my-posts')}
              onPublish={() => openPublish()}
            />

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
            ) : offersLoading ? (
              <section className="empty-state home-empty-real is-loading">
                <Sparkles size={22} />
                <strong>Cargando ofertas del barrio</strong>
                <span>Estamos buscando las promos vigentes de los comercios.</span>
              </section>
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
              loading={businessesLoading}
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
                ) : businessesLoading ? (
                  <div className="empty-state is-loading">
                    <Store size={22} />
                    <strong>Cargando locales del barrio</strong>
                    <span>En unos segundos aparecen los comercios publicados.</span>
                  </div>
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
                      trackInteraction({ type: 'offer_view', businessId: offer.businessId, offerId: offer.id })
                      setSelectedOffer(offer)
                      setScreen('detail')
                    }}
                    onTrack={trackInteraction}
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

            <ContactFooter onPrivacy={() => setScreen('privacy')} />

            <nav className="bottom-nav" aria-label="Navegacion inferior">
              <button className="active" type="button">
                <Home size={21} />
                Inicio
              </button>
              <button type="button" onClick={() => setScreen('directory')}>
                <Search size={21} />
                Explorar
              </button>
              <button className="publish" type="button" onClick={() => setScreen('profile')}>
                <Heart size={23} />
                Favoritos
              </button>
              <button type="button" onClick={() => setScreen('profile')}>
                <Bell size={21} />
                Avisos
              </button>
              <button type="button" onClick={() => setScreen('profile')}>
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

function HomeAccessCard({ account, local, onLogin, onRegisterMerchant, onUpgradeMerchant, onMerchantPanel, onPublish }) {
  const isMerchant = account?.type === 'merchant'
  const merchantAction = account ? onUpgradeMerchant : onRegisterMerchant

  if (isMerchant) {
    return (
      <section className="home-access-card merchant">
        <div>
          <span>Tu comercio</span>
          <strong>{local?.name || account.businessName || 'Completa tu ficha'}</strong>
          <small>{local ? 'Edita datos o publica una oferta en pocos toques.' : 'Carga tu local gratis para aparecer en la guia.'}</small>
        </div>
        <div className="home-access-actions">
          <button className="primary" type="button" onClick={onMerchantPanel}>
            <Store size={18} />
            Panel
          </button>
          <button className="hot" type="button" onClick={onPublish}>
            <Flame size={18} />
            Promo
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="home-access-card">
      <div>
        <span>{account ? 'Cuenta activa' : 'Acceso'}</span>
        <strong>{account ? 'Queres publicar como comercio?' : 'Entrar o registrarte.'}</strong>
        <small>{account ? 'Activa el panel comercio con esta misma cuenta.' : 'Si tenes un local o emprendimiento, registrate y carga tu ficha gratis. Si ya tenes cuenta, inicia sesion.'}</small>
      </div>
      <div className={`home-access-actions ${account ? 'single' : 'login-choice'}`}>
        <button className="primary" type="button" onClick={merchantAction}>
          <Store size={18} />
          {account ? 'Activar comercio' : 'Registrarme gratis'}
        </button>
        {!account && (
          <button className="dark" type="button" onClick={onLogin}>
            <UserRound size={18} />
            Iniciar sesion
          </button>
        )}
      </div>
    </section>
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

function ContactFooter({ onPrivacy }) {
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
        {onPrivacy && (
          <button type="button" onClick={onPrivacy}>
            <ShieldCheck size={16} />
            Privacidad
          </button>
        )}
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

function NeighborhoodLiveMap({ businesses = [], loading = false, onOpen, onDirectory }) {
  const visibleBusinesses = businesses
    .filter((business) => business.isPublic !== false)
    .sort((a, b) => Number(hasBusinessPin(b)) - Number(hasBusinessPin(a)))
    .slice(0, 8)
  const pinnedBusinesses = visibleBusinesses.filter((business) => hasBusinessPin(business))
  const pinnedCoordinates = pinnedBusinesses.map((business) => ({
    lat: Number(business.locationLat ?? business.location_lat),
    lng: Number(business.locationLng ?? business.location_lng),
  }))
  const liveBounds = pinnedCoordinates.length > 1
    ? (() => {
        const lats = pinnedCoordinates.map((point) => point.lat)
        const lngs = pinnedCoordinates.map((point) => point.lng)
        const latPadding = Math.max((Math.max(...lats) - Math.min(...lats)) * 0.22, 0.0016)
        const lngPadding = Math.max((Math.max(...lngs) - Math.min(...lngs)) * 0.22, 0.0024)
        return {
          north: Math.max(...lats) + latPadding,
          south: Math.min(...lats) - latPadding,
          west: Math.min(...lngs) - lngPadding,
          east: Math.max(...lngs) + lngPadding,
        }
      })()
    : liceoMapBounds
  const pendingPinBusinesses = visibleBusinesses.filter((business) => !hasBusinessPin(business))
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
          <strong>Mapa de comercios</strong>
          <small>
            {openBusinesses.length} abiertos ahora - {pinnedBusinesses.length} con pin real
          </small>
        </div>
        <a href={liceoMapUrl} target="_blank" rel="noreferrer">
          Abrir Maps
          <Navigation size={14} />
        </a>
      </div>

      <div className="live-map-canvas">
        <span className="live-map-badge">
          <MapPin size={12} />
          Pines cargados por comercios
        </span>
        <span className="live-map-grid-label top">Radar de locales cargados</span>
        <span className="live-map-grid-label bottom">Toca un pin para ver la ficha</span>

        {pinnedBusinesses.length ? (
          pinnedBusinesses.map((business, index) => {
            const status = getOpenStatus(business)
            const position = pinnedBusinesses.length === 1
              ? { x: 50, y: 48 }
              : (getMapPointFromCoordinates(business, liveBounds) || pinPositions[index % pinPositions.length])

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
        ) : loading ? (
          <div className="live-map-empty">
            <Store size={20} />
            <strong>Cargando locales cercanos</strong>
          </div>
        ) : (
          <div className="live-map-empty">
            <Store size={20} />
            <strong>Todavia no hay locales con pin real</strong>
            <small>Los locales aparecen aca cuando marcan su punto.</small>
          </div>
        )}
      </div>

      <div className="live-map-list">
        {visibleBusinesses.slice(0, 5).map((business, index) => {
          const status = getOpenStatus(business)
          const mapUrl = getBusinessMapUrl(business)
          const hasPin = hasBusinessPin(business)

          return (
            <article className="live-map-local" key={business.id || `${business.name}-chip-${index}`}>
              <button type="button" onClick={() => onOpen(business)}>
                <i className={status.open ? 'is-open' : 'is-closed'}></i>
                <span>{business.name}</span>
                <small>{hasPin ? `${business.section} - pin real` : `${business.section} - sin pin exacto`}</small>
              </button>
              <a href={mapUrl} target="_blank" rel="noreferrer" aria-label={`Abrir ubicacion de ${business.name} en Maps`}>
                Maps
              </a>
            </article>
          )
        })}
        <button className="see-all" type="button" onClick={onDirectory}>
          Ver todos
          <ChevronRight size={14} />
        </button>
      </div>
      {pendingPinBusinesses.length > 0 && (
        <p className="live-map-note">
          {pendingPinBusinesses.length} local{pendingPinBusinesses.length === 1 ? '' : 'es'} todavia sin pin exacto. Igual aparecen en la guia.
        </p>
      )}
      <ScrollCue label="Toca un pin, Maps o desliza locales" />
    </section>
  )
}

function PublishScreen({ account, local, template, offers = [], onBack, onMerchantPanel, onPublishOffer, onToggleTheme }) {
  const isEditingOffer = template?.editMode === 'edit' && template?.id
  const firstOfferTemplate = {
    title: '',
    description: '',
    price: '',
    image: 'generic',
    business: local?.name || account?.businessName || 'Mi local',
    category: local?.category || account?.category || 'Comida',
    section: local?.section || account?.section || 'Liceo Procrear',
    address: local?.address || '',
    reference: local?.reference || 'Referencia a completar',
    hours: local?.hours || 'Horario a confirmar',
    tone: local?.tone || 'orange',
  }
  const suggestedOffer = template || firstOfferTemplate
  const helperOffer = {
    title: 'Oferta del barrio',
    description: 'Contale al vecino que incluye, hasta cuando vale y como pedirlo por WhatsApp.',
    price: 'Consultar',
  }
  const [offerDraft, setOfferDraft] = useState({
    title: template?.title || '',
    description: template?.description || '',
    price: template?.price || '',
    image: template?.image || 'generic',
    expiresInDays: 4,
    hasPrice: template ? template.price !== 'Consultar' : true,
    ordersEnabled: isFounderPlanActive(local),
    hasDelivery: String(local?.delivery || '').toLowerCase().includes('delivery'),
    orderHours: local?.hours || '20:00 a 00:30',
    deliveryZone: local?.section || 'Liceo Procrear',
    eta: '30 a 45 min',
  })
  const previewOffer = {
    ...suggestedOffer,
    title: offerDraft.title || helperOffer.title,
    description: offerDraft.description || helperOffer.description,
    price: offerDraft.hasPrice ? offerDraft.price || 'Consultar' : 'Consultar',
    expires: `${offerDraft.expiresInDays} dias`,
    business: local?.name || suggestedOffer.business,
    category: local?.category || suggestedOffer.category,
    section: local?.section || suggestedOffer.section,
    address: local?.address || suggestedOffer.address,
    reference: local?.reference || suggestedOffer.reference,
    hours: local?.hours || suggestedOffer.hours,
    image: offerDraft.image || 'generic',
  }
  const hasMerchantAccount = account?.type === 'merchant'
  const canPublish = hasMerchantAccount && local
  const weekStart = Date.now() - 7 * 86400000
  const weeklyPosts = offers.filter((offer) => (
    offer.id !== template?.id &&
    (offer.businessId === local?.id || offer.business === local?.name) &&
    new Date(offer.createdAt || Date.now()).getTime() >= weekStart
  ))
  const freePostUsed = weeklyPosts.length > 0 && !template
  const founderActive = isFounderPlanActive(local)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthlyPosts = offers.filter((offer) => (
    offer.id !== template?.id &&
    (offer.businessId === local?.id || offer.business === local?.name) &&
    new Date(offer.createdAt || Date.now()).getTime() >= monthStart.getTime()
  ))
  const founderExtraLimit = 4
  const founderExtraUsed = founderActive ? Math.max(0, monthlyPosts.length - 1) : 0
  const founderExtraLeft = founderActive ? Math.max(0, founderExtraLimit - founderExtraUsed) : 0
  const isFounderExtraPost = founderActive && freePostUsed && !isEditingOffer
  const founderMonthlyLimitReached = isFounderExtraPost && founderExtraLeft <= 0
  const canUseExtraPost = isEditingOffer || !freePostUsed || founderActive
  const founderPlanUrl = makeWhatsAppUrl(
    '3517662142',
    `Hola Cristian, quiero pedir el plan fundador Liceo para ${local?.name || account?.businessName || 'mi comercio'}. Necesito catalogo, 4 publicaciones extra al mes y pedidos por WhatsApp.`,
  )
  const [publishStatus, setPublishStatus] = useState('')
  const publishMissing = [
    !String(offerDraft.title || '').trim() && 'titulo',
    offerDraft.hasPrice && !String(offerDraft.price || '').trim() && 'precio o desactivar precio',
    !String(offerDraft.description || '').trim() && 'descripcion corta',
    !local?.whatsapp && 'WhatsApp del local',
    founderMonthlyLimitReached && 'cupo extra mensual',
  ].filter(Boolean)
  const canSendOffer = canPublish && publishMissing.length === 0 && canUseExtraPost
  const updateOfferDraft = (field, value) => {
    setOfferDraft((current) => ({ ...current, [field]: value }))
    setPublishStatus('')
  }

  const applySuggestion = () => {
    setOfferDraft((current) => ({
      ...current,
      title: helperOffer.title,
      description: helperOffer.description,
      price: '',
      hasPrice: false,
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
      offerId: isEditingOffer ? template.id : null,
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

      <section className={`publish-hero ${founderActive ? 'founder' : ''}`}>
        <span>{isEditingOffer ? 'Editar publicacion' : founderActive ? 'Plan fundador activo' : template ? 'Reusar texto' : canPublish ? '1 gratis por semana' : 'Antes de publicar'}</span>
        <h1>{isEditingOffer ? 'Corregi esta promo sin duplicarla.' : founderActive ? 'Publica con mas margen este mes.' : template ? 'Ajusta esta promo y publicala de nuevo.' : canPublish ? 'Subi una promo que se vea fuerte en el feed.' : 'Primero deja tu local listo.'}</h1>
        <p>{isEditingOffer ? 'Cambia titulo, descripcion, precio, foto o vigencia. Se actualiza la misma publicacion.' : founderActive ? 'Tenes la promo semanal gratis y 4 publicaciones extra al mes. Todas duran 3 o 4 dias y se bajan solas.' : template ? 'Trajimos el texto, precio y foto de la publicacion anterior. Cambia lo necesario y sale como una nueva promo.' : canPublish ? 'Elegis rubro, seccion, precio opcional, direccion y WhatsApp. La promo dura 3 o 4 dias y despues se baja sola.' : 'Para que la publicacion sea confiable, primero cargamos nombre del local, direccion, horario y WhatsApp.'}</p>
      </section>

      <section className="merchant-status-card">
        <div>
          <span>Estado para publicar</span>
          <h2>{canPublish ? `${local.name} puede publicar hoy.` : hasMerchantAccount ? 'Falta cargar la ficha del local.' : 'Falta crear cuenta comercio.'}</h2>
          <p>{canPublish ? (isEditingOffer ? 'Estas editando una promo ya publicada. No consume otra publicacion semanal.' : freePostUsed ? (founderActive ? 'Ya usaste la gratis. Como tenes plan fundador, podes usar una publicacion extra del mes.' : 'Ya usaste la promo gratis de esta semana. Para publicar extras, pedi el plan fundador y te lo activa el admin.') : 'Tenes 1 publicacion semanal gratis. Dura 3 o 4 dias y se baja sola.') : 'No se pide tarjeta ni pago para empezar. La ficha del local queda gratis y visible para vecinos.'}</p>
        </div>
        <button type="button" onClick={onMerchantPanel}>
          {canPublish ? 'Ver panel' : 'Completar local'}
        </button>
      </section>

      {founderActive && (
        <section className="publish-quota founder-publish-quota" aria-label="Cupo de publicaciones fundador">
          <article className={freePostUsed ? '' : 'is-free'}>
            <span>Gratis semanal</span>
            <strong>{freePostUsed ? 'Usada' : 'Disponible'}</strong>
            <small>{freePostUsed ? 'La proxima sale como extra fundador.' : 'Usala primero: vence sola.'}</small>
          </article>
          <article className={isFounderExtraPost ? 'is-free' : ''}>
            <span>Extras del mes</span>
            <strong>{founderExtraLeft}/{founderExtraLimit}</strong>
            <small>Para combos, cambios de precio, stock o servicios puntuales.</small>
          </article>
          <article>
            <span>Tipo actual</span>
            <strong>{isEditingOffer ? 'Edicion' : isFounderExtraPost ? 'Extra' : 'Gratis'}</strong>
            <small>{isEditingOffer ? 'No consume cupo.' : isFounderExtraPost ? 'Sale por plan fundador.' : 'Publicacion semanal.'}</small>
          </article>
        </section>
      )}

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
          <span>{isEditingOffer ? 'Edicion directa' : isFounderExtraPost ? 'Extra fundador' : freePostUsed ? 'Publicacion extra' : 'Publicacion semanal gratis'}</span>
          <strong>{isEditingOffer ? 'No se crea duplicado.' : founderMonthlyLimitReached ? 'Sin extras disponibles este mes.' : freePostUsed ? 'Ya usaste la gratis de esta semana.' : 'Carga una promo simple y clara.'}</strong>
          <p>{isEditingOffer ? 'Se actualiza esta publicacion en el inicio y en tu panel.' : founderMonthlyLimitReached ? 'Podes editar o pausar publicaciones existentes, o coordinar otra habilitacion por fuera.' : freePostUsed ? (founderActive ? 'Esta sale como extra del plan fundador.' : 'Disponible cuando el admin active tu plan fundador.') : 'La promo queda visible 3 o 4 dias y despues se baja sola.'}</p>
        </div>
        <div className="fake-field wide progress-field">
          <span>Calidad de publicacion</span>
          <strong>{publishMissing.length === 0 ? 'Lista para salir' : `Falta ${publishMissing[0]}`}</strong>
          <i></i>
        </div>
        <div className="suggestion-row wide">
          <button type="button" onClick={applySuggestion}>Usar texto sugerido</button>
          <button type="button" onClick={() => updateOfferDraft('title', template ? `${previewOffer.title} de hoy` : helperOffer.title)}>Titulo rapido</button>
        </div>
        <label className="publish-field wide">
          <span>Titulo</span>
          <input value={offerDraft.title} onChange={(event) => updateOfferDraft('title', event.target.value)} placeholder="Ej: Combo, descuento, producto o servicio" />
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
          <span>Pedido o consulta</span>
          <h2>Configura como te escriben.</h2>
          <p>Sirve para comida, despensa, belleza, servicios o emprendedores: el vecino sabe si puede pedir, retirar, coordinar envio o consultar.</p>
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
        <PublishPreviewCard offer={previewOffer} local={local} draft={offerDraft} />
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
        {canPublish ? (canSendOffer ? (isEditingOffer ? 'Guardar cambios' : freePostUsed ? 'Publicar extra fundador' : 'Publicar gratis') : freePostUsed && !founderActive && !isEditingOffer ? 'Pedir plan fundador' : `Completar ${publishMissing[0]}`) : 'Completar local primero'}
      </button>
    </div>
  )
}

function PublishPreviewCard({ offer, local, draft }) {
  const hasPrice = Boolean(offer?.price && offer.price !== 'Consultar')
  const deliveryText = draft?.ordersEnabled
    ? (draft?.hasDelivery ? 'Pedido y delivery' : 'Pedido por WhatsApp')
    : 'Consulta directa'

  return (
    <article className={`publish-preview-card offer-${offer.tone || 'orange'}`} aria-label="Vista previa de publicacion">
      <div className="publish-preview-art">
        <div {...imageSurfaceProps(offer.image, 'publish-preview-image')}></div>
        <span>{offer.expires || '3 dias'}</span>
      </div>
      <div className="publish-preview-copy">
        <div className="publish-preview-kicker">
          <small>{offer.business || local?.name || 'Tu comercio'}</small>
          <b>{offer.category || local?.category || 'Promo'}</b>
        </div>
        <h3>{offer.title || 'Oferta del barrio'}</h3>
        <p>{offer.description || 'Texto corto para que el vecino entienda rapido que estas ofreciendo.'}</p>
        <div className="publish-preview-meta">
          <span><MapPin size={13} /> {offer.section || local?.section || 'Liceo'}</span>
          <span><MessageCircle size={13} /> {deliveryText}</span>
        </div>
        <div className="publish-preview-bottom">
          <strong>{hasPrice ? offer.price : 'Consultar'}</strong>
          <button type="button">
            WhatsApp
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </article>
  )
}

function MyPostsScreen({ account, local, offers = [], metrics = {}, onSaveLocal, onBack, onPublish, onPauseOffer, onDeleteOffer, onRepostOffer, onToggleTheme, onPrivacy }) {
  const initialPanel = local ? '' : 'basic'
  const [openPanel, setOpenPanel] = useState(initialPanel)
  const [saveStatus, setSaveStatus] = useState('')
  const [localDraft, setLocalDraft] = useState(() => buildLocalDraft(local, account))
  const [activeMenuIndex, setActiveMenuIndex] = useState(() => {
    const menu = ensureMenuSlots(local?.menu || [])
    const firstFilled = menu.findIndex((item) => item.name?.trim())
    return firstFilled >= 0 ? firstFilled : 0
  })

  useEffect(() => {
    if (!local?.id) return
    setLocalDraft(buildLocalDraft(local, account))
    setOpenPanel('')
    const menu = ensureMenuSlots(local.menu || [])
    const firstFilled = menu.findIndex((item) => item.name?.trim())
    setActiveMenuIndex(firstFilled >= 0 ? firstFilled : 0)
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
      locationMode: businessType === 'entrepreneur' ? 'none' : current.locationMode === 'none' ? 'address' : current.locationMode,
      delivery: businessType === 'entrepreneur' && current.delivery === 'Retiro y delivery' ? 'Por encargo' : current.delivery,
    }))
    setSaveStatus('')
  }

  const updateLocationMode = (locationMode) => {
    setLocalDraft((current) => ({
      ...current,
      locationMode,
      hasPublicAddress: locationMode === 'none' ? false : current.businessType !== 'entrepreneur',
    }))
    setSaveStatus('')
  }

  const updateMapLink = (value) => {
    const coords = parseMapCoordinates(value)
    setLocalDraft((current) => ({
      ...current,
      locationMode: 'pin',
      hasPublicAddress: current.businessType !== 'entrepreneur',
      locationLat: coords?.lat ?? current.locationLat,
      locationLng: coords?.lng ?? current.locationLng,
      locationPrecision: coords ? 'exact' : current.locationPrecision,
      locationNote: value,
      address: current.address || `${current.section || 'Liceo Procrear'} - ubicacion marcada`,
    }))
    setSaveStatus('')
  }

  const updateMapCoordinates = ({ lat, lng }) => {
    setLocalDraft((current) => ({
      ...current,
      locationMode: 'pin',
      hasPublicAddress: current.businessType !== 'entrepreneur',
      locationLat: lat,
      locationLng: lng,
      locationPrecision: 'exact',
      locationNote: `${lat}, ${lng}`,
      address: current.address || `${current.section || 'Liceo Procrear'} - ubicacion marcada`,
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
    const needsPublicAddress = localDraft.businessType !== 'entrepreneur' && localDraft.hasPublicAddress !== false && localDraft.locationMode !== 'pin'
    const normalizedWhatsapp = normalizeArgentineWhatsapp(localDraft.whatsapp)
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

    if (!isValidArgentineWhatsapp(localDraft.whatsapp)) {
      setSaveStatus('El WhatsApp tiene que ser argentino, solo numeros y sin 0 ni 15. Ejemplo: 3517662142.')
      setOpenPanel('basic')
      return
    }

    setSaveStatus('Guardando cambios...')
    const result = await onSaveLocal({
      ...localDraft,
      name: localDraft.name || 'Mi local',
      whatsapp: normalizedWhatsapp,
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

  const saveLocalWithOverrides = async (overrides, successMessage) => {
    const nextDraft = {
      ...localDraft,
      ...overrides,
      menu: ensureMenuSlots(localDraft.menu),
    }
    setLocalDraft(nextDraft)
    setSaveStatus('Guardando cambios...')
    const result = await onSaveLocal({
      ...nextDraft,
      name: nextDraft.name || 'Nombre del comercio',
      whatsapp: normalizeArgentineWhatsapp(nextDraft.whatsapp),
      hours: formatSchedule(nextDraft),
      ready: true,
    })
    if (result?.ok === false) {
      setSaveStatus(result.error?.message || 'No se pudo guardar. Revisa los datos e intenta de nuevo.')
      return
    }
    setSaveStatus(successMessage || result?.warning || 'Cambios guardados.')
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
  ].filter(Boolean).length
  const completion = Math.round((completedFields / 9) * 100)
  const scheduleLabel = formatSchedule(localDraft)
  const locationMode = localDraft.businessType === 'entrepreneur' ? 'none' : (localDraft.locationMode || 'address')
  const hasPinLocation = locationMode === 'pin' && hasBusinessPin(localDraft)
  const localMapUrl = getBusinessMapUrl(localDraft)
  const hasPublicLocation = hasBusinessPublicAddress(localDraft) || hasPinLocation || localDraft.businessType === 'entrepreneur'
  const publicLocationLabel = localDraft.businessType === 'entrepreneur'
    ? 'Sin direccion publica'
    : hasPinLocation
      ? `${localDraft.section} - pin aproximado`
      : localDraft.address || 'Direccion pendiente'
  const founderActive = isFounderPlanActive(localDraft)
  const founderRequested = isFounderPlanRequested(localDraft)
  const requiredTasks = [
    {
      id: 'basic',
      done: Boolean(localDraft.name && localDraft.whatsapp),
      title: 'Nombre y WhatsApp',
      meta: localDraft.name && localDraft.whatsapp ? 'Listo para contacto' : 'Obligatorio para aparecer',
    },
    {
      id: 'location',
      done: Boolean(hasPublicLocation && localDraft.openDays.length && localDraft.openTime && localDraft.closeTime),
      title: localDraft.businessType === 'entrepreneur' ? 'Zona y horario' : 'Ubicacion y horario',
      meta: hasPublicLocation ? scheduleLabel : 'Obligatorio para orientar al vecino',
    },
  ]
  const qualityTasks = [
    {
      id: 'photo',
      done: isUploadedImage(localDraft.image),
      title: 'Foto real',
      meta: isUploadedImage(localDraft.image) ? 'Foto cargada' : 'Recomendado para dar confianza',
      optional: true,
    },
  ]
  const optionalTasks = [
    {
      id: 'menu',
      done: founderActive,
      title: 'Catalogo opcional',
      meta: founderActive ? 'Plan fundador activo' : founderRequested ? 'Solicitud pendiente' : 'Extra del fundador',
      optional: true,
    },
    {
      id: 'plan',
      done: Boolean(localDraft.plan),
      title: 'Plan fundador opcional',
      meta: founderActive ? 'Fundador activo' : founderRequested ? 'Fundador pendiente' : 'Ficha gratis',
      optional: true,
    },
  ]
  const dashboardTasks = [...requiredTasks, ...qualityTasks, ...optionalTasks]
  const pendingTasks = requiredTasks.filter((task) => !task.done)
  const pendingQualityTasks = qualityTasks.filter((task) => !task.done)
  const nextPanel = pendingTasks[0]?.id || 'preview'
  const localIsPublic = Boolean(local)
  const publicStateLabel = localIsPublic
    ? pendingTasks.length
      ? 'Visible con datos pendientes'
      : pendingQualityTasks.length
        ? 'Ficha gratis activa'
        : 'Ficha completa'
    : 'Alta pendiente'
  const planLabel = founderActive ? 'Plan fundador activo' : founderRequested ? 'Fundador pendiente' : 'Ficha gratis'
  const founderPlanUrl = makeWhatsAppUrl(
    '3517662142',
    `Hola Cristian, quiero activar el plan fundador Liceo para ${localDraft.name || account?.businessName || 'mi comercio'}. Me interesa catalogo, 4 publicaciones extra al mes y pedidos por WhatsApp.`
  )
  const menuSlots = ensureMenuSlots(localDraft.menu)
  const filledMenuItems = menuSlots
    .map((item, index) => ({
      ...item,
      index,
      localIndex: index % MENU_SECTION_SIZE,
      section: menuCatalogSections[Math.floor(index / MENU_SECTION_SIZE)] || menuCatalogSections[0],
    }))
    .filter((item) => item.name.trim())
  const activeMenuIndexSafe = Math.max(0, Math.min(activeMenuIndex, MAX_MENU_ITEMS - 1))
  const activeMenuItem = menuSlots[activeMenuIndexSafe] || createMenuSlot(activeMenuIndexSafe)
  const activeMenuSection = menuCatalogSections[Math.floor(activeMenuIndexSafe / MENU_SECTION_SIZE)] || menuCatalogSections[0]
  const activeMenuLocalIndex = activeMenuIndexSafe % MENU_SECTION_SIZE
  const pickEmptyMenuIndex = (sectionIndex = null) => {
    const sectionStart = typeof sectionIndex === 'number' ? sectionIndex * MENU_SECTION_SIZE : 0
    const sectionEnd = typeof sectionIndex === 'number' ? sectionStart + MENU_SECTION_SIZE : MAX_MENU_ITEMS
    const inSection = menuSlots.findIndex((item, index) => (
      index >= sectionStart &&
      index < sectionEnd &&
      !item.name.trim() &&
      !item.price?.trim() &&
      item.available !== false
    ))
    if (inSection >= 0) return inSection
    const anywhere = menuSlots.findIndex((item) => !item.name.trim() && !item.price?.trim() && item.available !== false)
    return anywhere >= 0 ? anywhere : activeMenuIndexSafe
  }
  const startNewMenuItem = (sectionIndex = 0) => {
    setActiveMenuIndex(pickEmptyMenuIndex(sectionIndex))
    setSaveStatus('')
  }
  const publicMenuSections = buildFilledMenuSections(localDraft.menu)
  const localOffers = offers.filter((offer) => (
    offer.businessId === local?.id ||
    offer.business === local?.name ||
    (!local && account?.businessName && offer.business === account.businessName)
  ))
  const activeLocalOffers = localOffers.filter(isOfferActiveNow)
  const pausedLocalOffers = localOffers.filter((offer) => isOfferPaused(offer) && !isOfferExpired(offer))
  const expiredLocalOffers = localOffers.filter(isOfferExpired)
  const expiringLocalOffers = activeLocalOffers.filter((offer) => {
    const days = getOfferDaysLeft(offer)
    return days !== null && days <= 1
  })
  const founderDaysLeft = getFounderDaysLeft(localDraft)
  const handlePublishFromPanel = () => {
    if (!local) {
      setSaveStatus('Primero guarda la ficha gratis. Despues podes publicar tu promo semanal.')
      setOpenPanel(nextPanel === 'preview' ? 'basic' : nextPanel)
      return
    }

    if (pendingTasks.length) {
      setSaveStatus(`Primero completa: ${pendingTasks[0].title}.`)
      setOpenPanel(pendingTasks[0].id)
      return
    }

    onPublish()
  }

  if (isAndroidCompatMode()) {
    if (account && account.type !== 'merchant') {
      return (
        <div className="android-safe-screen">
          <header className="android-safe-header">
            <button type="button" onClick={onBack} aria-label="Volver">
              <ArrowLeft size={22} />
            </button>
            <strong>Panel comercio</strong>
            <ThemeToggle onToggleTheme={onToggleTheme} />
          </header>

          <section className="android-safe-card android-safe-intro">
            <span>Cuenta vecino</span>
            <h1>Esta parte es para comercios.</h1>
            <p>Si tambien vendes algo en el barrio, podes usar tu cuenta como comercio y cargar ficha, WhatsApp, foto y promos.</p>
          </section>

          <section className="android-safe-actions">
            <button type="button" onClick={onBack}>
              <strong>Volver a mi cuenta</strong>
              <small>Desde ahi podes cambiar tu cuenta a comercio.</small>
            </button>
          </section>
        </div>
      )
    }

    const safePhotoSrc = isUploadedImage(localDraft.image) ? localDraft.image : ''
    const requestFounderPlan = async () => {
      const nextDraft = {
        ...localDraft,
        plan: 'pedidos',
        planStatus: 'manual_pending',
        menu: ensureMenuSlots(localDraft.menu),
      }
      setLocalDraft(nextDraft)
      setSaveStatus('Guardando solicitud de plan fundador...')
      const result = await onSaveLocal({
        ...nextDraft,
        name: nextDraft.name || 'Nombre del comercio',
        hours: formatSchedule(nextDraft),
        ready: true,
      })
      setSaveStatus(result?.ok === false
        ? (result.error?.message || 'No se pudo guardar la solicitud.')
        : 'Solicitud guardada. Cristian la activa cuando coordinen el pago por fuera.')
      window.open(founderPlanUrl, '_blank', 'noopener,noreferrer')
    }

    return (
      <div className="android-safe-screen">
        <header className="android-safe-header">
          <button type="button" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <strong>Mis publicaciones</strong>
          <ThemeToggle onToggleTheme={onToggleTheme} />
        </header>

        <section className="android-safe-card android-safe-intro">
          <span>{publicStateLabel}</span>
          <h1>{localDraft.name || 'Tu comercio'}</h1>
          <p>
            Carga lo basico para aparecer gratis en la guia. El plan fundador se activa solo si lo pedis y el admin lo habilita.
          </p>
        </section>

        {saveStatus && (
          <section className={`android-safe-notice ${saveStatus.startsWith('Falta') ? 'needs-attention' : ''}`}>
            <Check size={18} />
            <span>{saveStatus}</span>
          </section>
        )}

        <section className="android-safe-card android-safe-progress-card">
          <span>Ficha gratis</span>
          <h2>{pendingTasks.length ? 'Completa lo basico' : localIsPublic ? 'Lista para publicar promos' : 'Lista para guardar'}</h2>
          <p>{completion}% completo. {pendingTasks.length ? `Falta: ${pendingTasks.map((task) => task.title.toLowerCase()).join(' y ')}.` : pendingQualityTasks.length ? 'Ya podes aparecer. Sumale foto cuando puedas para dar mas confianza.' : 'Tu ficha esta completa.'}</p>
          <i style={{ '--progress': `${completion}%` }}></i>
        </section>

        <section className="android-safe-actions android-safe-main-actions" aria-label="Acciones principales">
          <button className={`safe-action-edit ${openPanel === 'basic' ? 'active' : ''}`} type="button" onClick={() => setOpenPanel(openPanel === 'basic' ? '' : 'basic')}>
            <Store size={20} />
            <span>
              <strong>Editar ficha</strong>
              <small>Datos del local</small>
            </span>
          </button>
          <button className="safe-action-promo" type="button" onClick={handlePublishFromPanel}>
            <Flame size={20} />
            <span>
              <strong>Publicar promo</strong>
              <small>1 gratis semanal</small>
            </span>
          </button>
          <button className={`safe-action-plan ${openPanel === 'plan' ? 'active' : ''}`} type="button" onClick={() => setOpenPanel(openPanel === 'plan' ? '' : 'plan')}>
            <ShoppingBasket size={20} />
            <span>
              <strong>Plan</strong>
              <small>Gratis o fundador</small>
            </span>
          </button>
          <button className={`safe-action-menu ${openPanel === 'menu' ? 'active' : ''}`} type="button" onClick={() => setOpenPanel(openPanel === 'menu' ? '' : 'menu')}>
            <List size={20} />
            <span>
              <strong>Catalogo</strong>
              <small>{founderActive ? 'Productos' : 'Con fundador'}</small>
            </span>
          </button>
        </section>

        <section className="android-safe-actions android-safe-dashboard-actions android-safe-status-actions">
          <button type="button" onClick={() => saveLocalWithOverrides(
            { open: localDraft.open === false },
            localDraft.open === false ? 'Local marcado como abierto.' : 'Local marcado como cerrado por ahora.',
          )}>
            <strong>{localDraft.open === false ? 'Estoy cerrado' : 'Estoy abierto'}</strong>
            <small>{localDraft.open === false ? 'Tocar para abrir.' : 'Tocar para cerrar temporalmente.'}</small>
          </button>
          <button type="button" onClick={() => saveLocalWithOverrides(
            { isPublic: localDraft.isPublic === false },
            localDraft.isPublic === false ? 'Ficha visible nuevamente.' : 'Ficha pausada. No aparece en la guia.',
          )}>
            <strong>{localDraft.isPublic === false ? 'Ficha pausada' : 'Ficha visible'}</strong>
            <small>{localDraft.isPublic === false ? 'Mostrar en guia.' : 'Pausar sin borrar.'}</small>
          </button>
        </section>

        {openPanel === 'basic' && (
        <section className="android-safe-form android-safe-business-form">
          <div className="android-safe-field-title">
            <span>Datos del comercio</span>
            <strong>{localDraft.businessType === 'entrepreneur' ? 'Emprendimiento sin local' : 'Local con direccion'}</strong>
          </div>

          <div className="android-safe-mini-toggle" aria-label="Tipo de comercio">
            <button className={localDraft.businessType !== 'entrepreneur' ? 'active' : ''} type="button" onClick={() => updateBusinessType('local')}>
              Tengo local
            </button>
            <button className={localDraft.businessType === 'entrepreneur' ? 'active' : ''} type="button" onClick={() => updateBusinessType('entrepreneur')}>
              Sin local
            </button>
          </div>

          <label>
            <span>{localDraft.businessType === 'entrepreneur' ? 'Nombre del emprendimiento' : 'Nombre del local'}</span>
            <input value={localDraft.name} onChange={(event) => updateLocalDraft('name', event.target.value)} placeholder="Ej: Nombre del comercio" />
          </label>

          <div className="android-safe-two-cols">
            <label>
              <span>Rubro</span>
              <select value={localDraft.category} onChange={(event) => updateLocalDraft('category', event.target.value)}>
                {commerceCategories.map((category) => (
                  <option key={category.name}>{category.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Seccion</span>
              <select value={localDraft.section} onChange={(event) => updateLocalDraft('section', event.target.value)}>
                {sections.filter((section) => section !== 'Todos').map((section) => (
                  <option key={section}>{section}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <span>WhatsApp</span>
            <input inputMode="numeric" value={localDraft.whatsapp} onChange={(event) => updateLocalDraft('whatsapp', event.target.value.replace(/\D/g, '').slice(0, 13))} placeholder="3510000000" />
          </label>

          <label>
            <span>Instagram opcional</span>
            <input value={localDraft.instagram} onChange={(event) => updateLocalDraft('instagram', event.target.value)} placeholder="@tuemprendimiento" />
          </label>

          <label>
            <span>{localDraft.businessType === 'entrepreneur' ? 'Zona o referencia' : 'Direccion o referencia'}</span>
            <input value={localDraft.address} onChange={(event) => updateLocalDraft('address', event.target.value)} placeholder={localDraft.businessType === 'entrepreneur' ? 'Ej: Entrego por zona Liceo' : 'Ej: Calle, manzana o referencia'} />
          </label>

          {localDraft.businessType !== 'entrepreneur' && (
            <>
              <div className="android-safe-mini-toggle location-safe-toggle" aria-label="Tipo de ubicacion">
                <button className={locationMode === 'address' ? 'active' : ''} type="button" onClick={() => updateLocationMode('address')}>
                  Direccion
                </button>
                <button className={locationMode === 'pin' ? 'active' : ''} type="button" onClick={() => updateLocationMode('pin')}>
                  Pin mapa
                </button>
                <button className={locationMode === 'none' ? 'active' : ''} type="button" onClick={() => updateLocationMode('none')}>
                  Sin local
                </button>
              </div>
              {locationMode === 'pin' && (
                <div className="tap-map-editor real-pin-editor android-safe-map-picker">
                  <RealLocationPicker location={localDraft} mapUrl={localMapUrl} onPick={updateMapCoordinates} />
                  <label className="map-coordinates-field">
                    <span>Opcional: pegar link o coordenadas</span>
                    <input
                      value={localDraft.locationNote || ''}
                      onChange={(event) => updateMapLink(event.target.value)}
                      placeholder="-31.36782, -64.129397 o link de Maps"
                    />
                  </label>
                  <div className="tap-map-help">
                    <strong>{hasPinLocation ? 'Ubicacion real guardada' : 'Todavia falta el punto real'}</strong>
                    <span>{hasPinLocation ? 'Despues guarda la ficha.' : 'Si no lo tenes ahora, podes completarlo despues.'}</span>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="android-safe-days" aria-label="Dias que abre">
            {weekDays.map((day) => (
              <button className={localDraft.openDays.includes(day) ? 'active' : ''} type="button" key={day} onClick={() => toggleOpenDay(day)}>
                {day}
              </button>
            ))}
          </div>

          <div className="android-safe-two-cols">
            <label>
              <span>Desde</span>
              <input type="time" value={localDraft.openTime} onChange={(event) => updateLocalDraft('openTime', event.target.value)} />
            </label>
            <label>
              <span>Hasta</span>
              <input type="time" value={localDraft.closeTime} onChange={(event) => updateLocalDraft('closeTime', event.target.value)} />
            </label>
          </div>

          <label>
            <span>Descripcion corta</span>
            <textarea value={localDraft.description} onChange={(event) => updateLocalDraft('description', event.target.value)} placeholder="Contale al vecino que vendes o como trabajas." />
          </label>

          <label>
            <span>Foto del comercio o producto</span>
            <input type="file" accept="image/*" onChange={handleLocalPhoto} />
          </label>

          <div className="android-safe-photo-preview">
            {safePhotoSrc ? (
              <img src={safePhotoSrc} alt={`Foto de ${localDraft.name || 'comercio'}`} />
            ) : (
              <div>
                <Camera size={24} />
                <strong>Sin foto propia</strong>
                <small>Subi una imagen clara para que te reconozcan.</small>
              </div>
            )}
          </div>

          <button type="button" onClick={saveLocal}>
            Guardar ficha
          </button>
        </section>
        )}

        {openPanel === 'plan' && (
        <>
        <section className="android-safe-card android-safe-plan-card">
          <span>Plan gratis</span>
          <h2>Ficha + 1 promo semanal.</h2>
          <p>La publicacion gratis dura 3 dias y se vence sola. No necesitas el plan fundador para aparecer en la guia.</p>
        </section>

        <section className="android-safe-card android-safe-plan-card">
          <span>Plan fundador</span>
          <h2>Catalogo + pedidos.</h2>
          <p>Extra opcional: catalogo de productos o servicios, 4 publicaciones extra por mes y consulta armada para enviar por WhatsApp. Precio fundador Liceo: $8.000.</p>
          <button type="button" onClick={requestFounderPlan}>
            {founderRequested || founderActive ? 'Consultar por WhatsApp' : 'Quiero plan fundador'}
          </button>
        </section>
        </>
        )}

        {openPanel === 'menu' && founderActive ? (
          <section className="android-safe-form android-safe-menu-form">
            <div className="android-safe-field-title">
              <span>Plan fundador activo</span>
              <strong>Catalogo del comercio</strong>
            </div>
            <div className="android-safe-menu-summary">
              <strong>{filledMenuItems.length}/{MAX_MENU_ITEMS}</strong>
              <span>items cargados</span>
              <button type="button" onClick={saveLocal}>Guardar</button>
            </div>
            <p className="android-safe-help">Agrega un producto o servicio por vez. Si no tiene precio, queda como consulta por WhatsApp.</p>
            <div className="android-safe-menu-list">
              {filledMenuItems.length ? filledMenuItems.map((item) => (
                <button
                  className={item.index === activeMenuIndexSafe ? 'active' : ''}
                  type="button"
                  key={`safe-pill-${item.index}`}
                  onClick={() => setActiveMenuIndex(item.index)}
                >
                  <strong>{item.name}</strong>
                  <span>{item.price || 'Consultar'} · {item.section.shortTitle}</span>
                </button>
              )) : (
                <div className="android-safe-menu-empty">Todavia no cargaste productos.</div>
              )}
            </div>
            <div className="android-safe-add-row">
              {menuCatalogSections.map((section, sectionIndex) => (
                <button type="button" key={`safe-add-${section.title}`} onClick={() => startNewMenuItem(sectionIndex)}>
                  + {section.shortTitle}
                </button>
              ))}
            </div>
            <div className="android-safe-menu-row is-single">
              <label className="android-safe-menu-name">
                <span>{activeMenuSection.shortTitle} {activeMenuLocalIndex + 1}</span>
                <input value={activeMenuItem.name} onChange={(event) => updateMenuItem(activeMenuIndexSafe, 'name', event.target.value)} placeholder={activeMenuIndexSafe === 0 ? 'Ej: Combo del dia' : 'Ej: Producto o servicio'} />
              </label>
              <label className="android-safe-menu-price">
                <span>Precio opcional</span>
                <input value={activeMenuItem.price || ''} onChange={(event) => updateMenuItem(activeMenuIndexSafe, 'price', event.target.value)} placeholder="Ej: $4.500" />
              </label>
              <div className="android-safe-row-actions">
                <button className={activeMenuItem.available !== false ? 'active' : ''} type="button" onClick={() => updateMenuItem(activeMenuIndexSafe, 'available', activeMenuItem.available === false)}>
                  {activeMenuItem.available === false ? 'Oculto' : 'Disponible'}
                </button>
                <button className="android-safe-save-item" type="button" onClick={saveLocal}>Guardar item</button>
                <button type="button" onClick={() => clearMenuItem(activeMenuIndexSafe)}>Limpiar</button>
              </div>
            </div>
          </section>
        ) : openPanel === 'menu' ? (
          <section className="android-safe-card android-safe-plan-card">
            <span>{founderRequested ? 'Solicitud pendiente' : 'Catalogo bloqueado'}</span>
            <h2>{founderRequested ? 'Cristian debe activar el plan.' : 'Primero va la ficha gratis.'}</h2>
            <p>{founderRequested ? 'Cuando el admin active fundador, aca vas a poder cargar catalogo y pedidos.' : 'El catalogo, pedidos y 4 extras del mes se habilitan solo con plan fundador activo.'}</p>
          </section>
        ) : null}

        {openPanel === 'offers' && (
          <section className="android-safe-card android-safe-offers-list">
            <span>Promos del comercio</span>
            <h2>{localOffers.length ? `${localOffers.length} publicaciones` : 'Sin publicaciones todavia'}</h2>
            {!localOffers.length && <p>Cuando publiques una promo, aparece aca para verla, republicarla o pausarla.</p>}
            {localOffers.map((offer) => (
              <article key={offer.id}>
                <strong>{offer.title}</strong>
                <small>{offer.price || 'Sin precio'} - {isOfferPaused(offer) ? 'Pausada' : 'Activa'}</small>
                <div>
                  <button type="button" onClick={() => onRepostOffer(offer)}>Republicar</button>
                  <button type="button" onClick={() => onPauseOffer(offer)}>{isOfferPaused(offer) ? 'Activar' : 'Pausar'}</button>
                  <button type="button" onClick={() => onDeleteOffer(offer)}>Eliminar</button>
                </div>
              </article>
            ))}
          </section>
        )}

        <section className="android-safe-actions android-safe-dashboard-actions android-safe-secondary-actions">
          <button type="button" onClick={() => setOpenPanel(openPanel === 'offers' ? '' : 'offers')}>
            <strong>Ver mis promos</strong>
            <small>{localOffers.length ? `${localOffers.length} publicaciones cargadas.` : 'Historial y acciones rapidas.'}</small>
          </button>
        </section>

        <ContactFooter onPrivacy={onPrivacy} />
      </div>
    )
  }

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
          <p>{localIsPublic ? `Aparece en la guia como ${localDraft.category} en ${localDraft.section}. ${pendingTasks.length ? 'Completa lo basico para que el vecino entienda como contactarte.' : pendingQualityTasks.length ? 'Ya puede recibir consultas. Una foto real lo hace mas confiable.' : 'Ya esta listo para recibir consultas.'}` : 'Completa lo basico y guarda la ficha gratis. Despues podes publicar tu promo semanal.'}</p>
        </div>
        <div className="merchant-score-card">
          <strong>{completion}%</strong>
          <span>{pendingTasks.length ? `${pendingTasks.length} basicos` : 'Listo'}</span>
          <i style={{ '--progress': `${completion}%` }}></i>
        </div>
      </section>

      <section className="dashboard-actions dashboard-actions-large" aria-label="Acciones principales del comercio">
        <button type="button" onClick={() => setOpenPanel(nextPanel)}>
          <Check size={18} />
          <span>{pendingTasks.length ? 'Completar ficha' : 'Panel comercio'}</span>
        </button>
        <button type="button" onClick={handlePublishFromPanel}>
          <Flame size={18} />
          <span>Publicar promo</span>
        </button>
        <button type="button" onClick={() => setOpenPanel(founderActive ? 'menu' : 'plan')}>
          <ShoppingBasket size={18} />
          <span>{founderActive ? 'Catalogo' : 'Plan fundador'}</span>
        </button>
      </section>

      <section className="dashboard-status-card">
        <div>
          <span>Estado actual</span>
          <strong>{planLabel}</strong>
          <p>{localIsPublic ? (pendingTasks.length ? `Falta completar ${pendingTasks.map((task) => task.title.toLowerCase()).join(' y ')}.` : founderActive ? `Ficha gratis activa y fundador habilitado${founderDaysLeft !== null ? ` por ${Math.max(founderDaysLeft, 0)} dias mas` : ''}.` : founderRequested ? 'Ficha gratis activa. El plan fundador queda pendiente hasta que el admin lo active.' : 'Ficha gratis activa: guia del barrio y 1 promo semanal que vence sola.') : 'Todavia no esta publicada. Guarda la ficha cuando completes lo basico.'}</p>
        </div>
        <button type="button" onClick={saveLocal}>{localIsPublic ? 'Actualizar' : 'Guardar'}</button>
      </section>

      {(expiringLocalOffers.length > 0 || isFounderExpiringSoon(localDraft)) && (
        <section className="merchant-alert-strip" aria-label="Avisos importantes">
          {isFounderExpiringSoon(localDraft) && (
            <article>
              <Timer size={17} />
              <span>Fundador vence en {Math.max(founderDaysLeft, 0)} dias. Escribile a Cristian para renovarlo.</span>
            </article>
          )}
          {expiringLocalOffers.length > 0 && (
            <article>
              <Flame size={17} />
              <span>{expiringLocalOffers.length} promo(s) vencen pronto. Podes republicarlas cuando quieras.</span>
            </article>
          )}
        </section>
      )}

      <section className="merchant-quick-controls" aria-label="Controles rapidos del comercio">
        <button
          className={localDraft.open === false ? 'is-off' : 'is-on'}
          type="button"
          onClick={() => saveLocalWithOverrides(
            { open: localDraft.open === false },
            localDraft.open === false ? 'Local marcado como abierto.' : 'Local marcado como cerrado por ahora.',
          )}
        >
          <Clock3 size={17} />
          <span>{localDraft.open === false ? 'Estoy cerrado' : 'Estoy abierto'}</span>
          <small>{localDraft.open === false ? 'Tocar para abrir' : 'Tocar para cerrar'}</small>
        </button>
        <button
          className={localDraft.isPublic === false ? 'is-off' : 'is-on'}
          type="button"
          onClick={() => saveLocalWithOverrides(
            { isPublic: localDraft.isPublic === false },
            localDraft.isPublic === false ? 'Ficha visible nuevamente.' : 'Ficha pausada. No aparece en la guia.',
          )}
        >
          <Eye size={17} />
          <span>{localDraft.isPublic === false ? 'Ficha pausada' : 'Ficha visible'}</span>
          <small>{localDraft.isPublic === false ? 'Mostrar de nuevo' : 'Pausar sin borrar'}</small>
        </button>
      </section>

      <section className="dashboard-metrics" aria-label="Resumen del comercio">
        <article>
          <strong>{activeLocalOffers.length}</strong>
          <span>promos activas</span>
        </article>
        <article>
          <strong>{expiredLocalOffers.length}</strong>
          <span>vencidas</span>
        </article>
        <article>
          <strong>{metrics.offerViews || 0}</strong>
          <span>vistas promos</span>
        </article>
        <article>
          <strong>{metrics.whatsappClicks || 0}</strong>
          <span>clics WhatsApp</span>
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
            <span>Editar ficha</span>
            <h2>{localDraft.name || 'Tu comercio'}</h2>
            <p>Toca una seccion, cambia el dato y guarda.</p>
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

          {panelButton('basic', 'Ficha', 'Datos basicos', localDraft.name ? 'Completo' : 'Pendiente', Store)}
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
                  <input value={localDraft.name} onChange={(event) => updateLocalDraft('name', event.target.value)} placeholder={localDraft.businessType === 'entrepreneur' ? 'Ej: Hecho en Casa' : 'Ej: Almacen del Barrio'} />
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
                    updateLocalDraft('image', imageByCategory[category] || 'generic')
                  }}>
                    {commerceCategories.map((category) => (
                      <option key={category.name}>{category.name}</option>
                    ))}
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

          {panelButton('photo', 'Foto', 'Imagen principal', isUploadedImage(localDraft.image) ? 'Cargada' : 'Agregar', Camera)}
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

          {panelButton('location', 'Ubicacion', localDraft.businessType === 'entrepreneur' ? 'Zona y horarios' : 'Direccion y horarios', dashboardTasks.find((task) => task.id === 'location')?.done ? 'Completo' : 'Pendiente', MapPin)}
          {openPanel === 'location' && (
            <div className="merchant-panel-body">
              <section className={`local-map-editor ${localDraft.businessType === 'entrepreneur' ? 'contact-first' : ''}`}>
                <div className="local-map-preview">
                  {localDraft.businessType === 'entrepreneur' ? <MessageCircle size={24} /> : <MapPin size={24} />}
                  <strong>{localDraft.section}</strong>
                  <span>
                    {publicLocationLabel}
                  </span>
                  <small>{scheduleLabel}</small>
                  <i></i>
                </div>
                <div className="local-map-copy">
                  <span>{localDraft.businessType === 'entrepreneur' ? 'Contacto directo' : 'Ubicacion publica'}</span>
                  <h3>{localDraft.businessType === 'entrepreneur' ? 'Que te consulten sin exponer una direccion.' : 'Direccion, pin o referencia de manzana.'}</h3>
                  <p>{localDraft.businessType === 'entrepreneur' ? 'Ideal para venta por encargo, servicios a domicilio, Instagram o WhatsApp. La direccion queda opcional.' : 'Si no tenes calle o numero, marca el punto en el mapa y deja una referencia simple.'}</p>
                </div>
              </section>
              {localDraft.businessType !== 'entrepreneur' && (
                <section className="location-picker-card">
                  <div className="location-mode-tabs" aria-label="Tipo de ubicacion">
                    <button className={locationMode === 'address' ? 'active' : ''} type="button" onClick={() => updateLocationMode('address')}>
                      <Store size={15} />
                      Direccion
                    </button>
                    <button className={locationMode === 'pin' ? 'active' : ''} type="button" onClick={() => updateLocationMode('pin')}>
                      <MapPin size={15} />
                      Marcar mapa
                    </button>
                    <button className={locationMode === 'none' ? 'active' : ''} type="button" onClick={() => updateLocationMode('none')}>
                      <MessageCircle size={15} />
                      Sin local
                    </button>
                  </div>
                  {locationMode === 'pin' && (
                    <div className="tap-map-editor real-pin-editor">
                      <RealLocationPicker location={localDraft} mapUrl={localMapUrl} onPick={updateMapCoordinates} />
                      <label className="map-coordinates-field">
                        <span>Opcional: pegar link o coordenadas</span>
                        <input
                          value={localDraft.locationNote || ''}
                          onChange={(event) => updateMapLink(event.target.value)}
                          placeholder="-31.36782, -64.129397 o link de Maps"
                        />
                      </label>
                      <div className="tap-map-help">
                        <strong>{hasPinLocation ? 'Ubicacion real guardada' : 'Todavia falta el punto real'}</strong>
                        <span>{hasPinLocation ? 'El vecino podra abrir Maps y llegar al punto marcado.' : 'Si no sabes copiar el link, deja una referencia y lo completas despues.'}</span>
                      </div>
                    </div>
                  )}
                  {locationMode === 'none' && (
                    <div className="no-location-note">
                      <MessageCircle size={18} />
                      <div>
                        <strong>Sin direccion publica</strong>
                        <span>El vecino vera zona, WhatsApp e Instagram. Ideal para delivery, pedidos o servicios a domicilio.</span>
                      </div>
                    </div>
                  )}
                </section>
              )}
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
                {localDraft.businessType !== 'entrepreneur' && locationMode !== 'pin' && locationMode !== 'none' && (
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
                  <span>{localDraft.businessType === 'entrepreneur' || locationMode === 'none' || localDraft.hasPublicAddress === false ? 'Zona o referencia' : locationMode === 'pin' ? 'Texto del pin' : 'Direccion'}</span>
                  <input
                    value={localDraft.address}
                    onChange={(event) => updateLocalDraft('address', event.target.value)}
                    placeholder={localDraft.businessType === 'entrepreneur' || locationMode === 'none' || localDraft.hasPublicAddress === false ? 'Ej: Liceo Procrear, entrego por zona' : locationMode === 'pin' ? 'Ej: Liceo Procrear - pin aproximado' : 'Mza, calle o referencia'}
                  />
                </label>
                <label className="wide">
                  <span>Referencia para llegar</span>
                  <input value={localDraft.reference} onChange={(event) => updateLocalDraft('reference', event.target.value)} placeholder={localDraft.businessType === 'entrepreneur' || locationMode === 'none' ? 'Ej: coordino punto de entrega o envio por zona' : 'Ej: manzana 12, frente a la plaza...'} />
                </label>
                <label className="wide">
                  <span>Como lo vera el vecino</span>
                  <input value={locationMode === 'pin' ? `${localDraft.section} - pin aproximado` : locationMode === 'none' || localDraft.businessType === 'entrepreneur' ? 'Coordinar por WhatsApp o Instagram' : localDraft.address || 'Direccion pendiente'} readOnly />
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
                  <input type="time" value={localDraft.openTime} onChange={(event) => updateLocalDraft('openTime', event.target.value)} />
                </label>
                <label>
                  <span>Cierra</span>
                  <input type="time" value={localDraft.closeTime} onChange={(event) => updateLocalDraft('closeTime', event.target.value)} />
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

          {panelButton('menu', 'Catalogo', 'Productos o servicios', founderActive ? `${filledMenuItems.length}/${MAX_MENU_ITEMS} items` : founderRequested ? 'Pendiente' : 'Fundador', ShoppingBasket)}
          {openPanel === 'menu' && (
            <div className="merchant-panel-body">
              {!founderActive ? (
                <section className="paid-feature-preview locked-feature">
                  <div>
                    <span>{founderRequested ? 'Solicitud pendiente' : 'Plan fundador'}</span>
                    <h3>El catalogo se activa cuando el admin habilita el plan.</h3>
                    <p>
                      Tu ficha gratis puede aparecer igual con foto, WhatsApp, horario y 1 promo semanal.
                      El catalogo, pedidos por WhatsApp y 4 publicaciones extra quedan reservados para el plan fundador.
                    </p>
                  </div>
                  <ul>
                    <li><Check size={14} /> Catalogo de productos o servicios</li>
                    <li><Check size={14} /> Pedido armado por WhatsApp</li>
                    <li><Check size={14} /> 4 publicaciones extra por mes</li>
                  </ul>
                  <button type="button" onClick={() => setOpenPanel('plan')}>
                    {founderRequested ? 'Ver solicitud' : 'Pedir plan fundador'}
                  </button>
                </section>
              ) : (
                <section className="menu-editor menu-editor-standalone" aria-label="Catalogo del comercio">
                <div className="menu-editor-intro">
                  <div>
                    <span>Catalogo editable</span>
                    <h3>Carga rapida del catalogo.</h3>
                    <p>Agrega de a un producto o servicio. Los cargados quedan en una lista corta para editar rapido.</p>
                  </div>
                  <div className="menu-editor-meter">
                    <strong>{filledMenuItems.length}/{MAX_MENU_ITEMS}</strong>
                    <small>items cargados</small>
                  </div>
                </div>
                <div className="menu-quick-actions">
                  {menuCatalogSections.map((section, sectionIndex) => (
                    <button type="button" key={section.title} onClick={() => startNewMenuItem(sectionIndex)}>
                      <span>Agregar</span>
                      <strong>{section.shortTitle}</strong>
                    </button>
                  ))}
                </div>
                <div className="menu-compact-list" aria-label="Productos cargados">
                  {filledMenuItems.length ? filledMenuItems.map((item) => (
                    <button
                      className={item.index === activeMenuIndexSafe ? 'active' : ''}
                      type="button"
                      key={`menu-pill-${item.index}`}
                      onClick={() => setActiveMenuIndex(item.index)}
                    >
                      <strong>{item.name}</strong>
                      <small>{item.price || 'Consultar'} · {item.section.shortTitle}{item.available === false ? ' · Oculto' : ''}</small>
                    </button>
                  )) : (
                    <div className="menu-empty-state">
                      <strong>Tu catalogo todavia esta vacio.</strong>
                      <span>Toca “Agregar destacados” para cargar el primer producto, servicio o promo fija.</span>
                    </div>
                  )}
                </div>
                <div className="menu-editor-group menu-editor-focus">
                  <div className="menu-editor-group-head">
                    <strong>{activeMenuItem.name?.trim() ? 'Editando item' : 'Nuevo item'}</strong>
                    <small>{activeMenuSection.title} · lugar {activeMenuLocalIndex + 1}/5</small>
                  </div>
                  <div className="menu-editor-row">
                    <label className="menu-name-field">
                      <span>Nombre</span>
                      <input value={activeMenuItem.name} onChange={(event) => updateMenuItem(activeMenuIndexSafe, 'name', event.target.value)} placeholder={activeMenuIndexSafe === 0 ? 'Ej: Combo del dia' : 'Ej: Producto, servicio o extra...'} />
                    </label>
                    <label className="menu-price-field">
                      <span>Precio</span>
                      <input value={activeMenuItem.price || ''} onChange={(event) => updateMenuItem(activeMenuIndexSafe, 'price', event.target.value)} placeholder="Opcional" />
                    </label>
                    <div className="menu-row-actions">
                      <label className="menu-available">
                        <input type="checkbox" checked={activeMenuItem.available !== false} onChange={(event) => updateMenuItem(activeMenuIndexSafe, 'available', event.target.checked)} />
                        <span>Disponible</span>
                      </label>
                      <div className="menu-row-tags">
                        {activeMenuIndexSafe === 0 && <span>Destacado</span>}
                        <span>{activeMenuItem.price ? 'Con precio' : 'Consultar'}</span>
                        {activeMenuItem.available === false && <span>Oculto</span>}
                      </div>
                      <button className="menu-save-item" type="button" onClick={saveLocal}>Guardar item</button>
                      <button type="button" onClick={() => clearMenuItem(activeMenuIndexSafe)} aria-label={`Limpiar ${activeMenuSection.shortTitle} ${activeMenuLocalIndex + 1}`}>Limpiar</button>
                    </div>
                  </div>
                </div>
                <div className="menu-save-actions">
                  <span>{filledMenuItems.length ? `${filledMenuItems.length} items listos para la ficha.` : 'Todavia no cargaste productos o servicios.'}</span>
                  <button type="button" onClick={saveLocal}>Guardar catalogo</button>
                </div>
              </section>
              )}
            </div>
          )}

          {panelButton('plan', 'Plan', 'Gratis o fundador', founderActive ? 'Activo' : founderRequested ? 'Pendiente' : 'Gratis', ShoppingBasket)}
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
                  <small>Catalogo, 4 publicaciones extra al mes y pedido armado para mandar por WhatsApp.</small>
                  <b>$8.000 fundador Liceo</b>
                </button>
              </section>

              <section className={`paid-feature-preview ${founderActive ? 'is-active' : ''}`}>
                <div>
                  <span>{founderActive ? 'Activo en plan fundador' : founderRequested ? 'Solicitud pendiente' : 'Disponible al pedir plan'}</span>
                  <h3>Catalogo y pedido por WhatsApp</h3>
                  <p>{founderActive ? 'El vecino elige productos o servicios, suma la consulta y la manda lista al comercio.' : founderRequested ? 'Tu solicitud queda pendiente hasta que Cristian active el plan desde administracion.' : 'En el plan gratis la ficha aparece igual, con 1 publicacion semanal que dura 3 dias.'}</p>
                </div>
                <ul>
                  <li><Check size={14} /> Catalogo de productos o servicios</li>
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
                  <strong>Catalogo + pedidos + extras</strong>
                  <p>Incluye catalogo, 4 publicaciones extra al mes y pedido armado que llega directo por WhatsApp.</p>
                  <b>$8.000 / mes</b>
                </article>
              </section>
            </div>
          )}

          {panelButton('preview', 'Vista previa', 'Asi lo ve el vecino', 'Ver ficha', Eye)}
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
                      <div className="public-menu-list">
                        {publicMenuSections.length ? publicMenuSections.map((section) => (
                          <div className="public-menu-group" key={`preview-${section.title}`}>
                            <strong>{section.shortTitle}</strong>
                            <ul>
                              {section.items.map((item) => (
                                <li key={`${item.name || 'producto'}-${item.slotIndex}`}>
                                  <span>{item.slotIndex === 0 ? `${item.name || 'Producto'} destacado` : item.name || 'Producto'}</span>
                                  <b>{item.price || 'Consultar'}</b>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )) : (
                          <div className="public-menu-empty">Carga productos o servicios para mostrar el catalogo.</div>
                        )}
                      </div>
                    ) : (
                      <div className="public-menu-locked">
                        <ShieldCheck size={14} />
                        <span>Catalogo y pedidos se muestran cuando el admin activa el plan fundador.</span>
                      </div>
                    )}
                  </div>
                </div>
                {founderActive && (
                  <div className="public-order-strip">
                    <span>Mini menu</span>
                    <strong>3 items seleccionados</strong>
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
              open: local.open !== false,
              rating: 'Nuevo',
              followers: 0,
              verified: false,
              delivery: local.delivery || 'A definir',
              hasDelivery: (local.delivery || '').toLowerCase().includes('delivery'),
              orderHours: local.hours ? `Pedidos ${local.hours}` : 'Pedidos a definir',
              distance: 'cerca',
              menu: [
                { name: 'Producto destacado' },
                { name: 'Agregar productos o servicios al catalogo' },
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
          <h2>Historial de promos</h2>
        </div>
        <button type="button" onClick={handlePublishFromPanel}>Nueva promo</button>
      </div>

        {localOffers.length === 0 ? (
          <section className="merchant-empty-posts">
            <Flame size={22} />
            <strong>Todavia no tenes promos publicadas.</strong>
            <p>Cuando tengas una oferta del dia, subila en menos de un minuto. Dura 3 o 4 dias y despues se baja sola.</p>
            <button type="button" onClick={handlePublishFromPanel}>Crear primera promo</button>
          </section>
        ) : (
          <>
            <div className="publication-history-tabs" aria-label="Resumen de publicaciones">
              <span>Activas {activeLocalOffers.length}</span>
              <span>Pausadas {pausedLocalOffers.length}</span>
              <span>Vencidas {expiredLocalOffers.length}</span>
            </div>
            {activeLocalOffers.map((offer) => (
              <ManagedPost
                key={offer.id}
                offer={offer}
                status={getOfferDaysLeft(offer) === 1 ? 'Vence manana' : 'Activa'}
                action="Republicar"
                secondaryAction="Editar promo"
                onAction={() => onRepostOffer(offer)}
                onSecondaryAction={() => onPublish(offer, 'edit')}
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
                secondaryAction="Editar promo"
                onAction={() => onRepostOffer(offer)}
                onSecondaryAction={() => onPublish(offer, 'edit')}
                onPause={() => onPauseOffer(offer)}
                onDelete={() => onDeleteOffer(offer)}
              />
            ))}
            {expiredLocalOffers.map((offer) => (
              <ManagedPost
                key={offer.id}
                offer={offer}
                status="Vencida"
                action="Republicar 4 dias"
                secondaryAction="Editar promo"
                onAction={() => onRepostOffer(offer)}
                onSecondaryAction={() => onPublish(offer, 'edit')}
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
        <button type="button" onClick={handlePublishFromPanel}>Preparar otra promo</button>
      </section>
    </div>
  )
}

function ManagedPost({ offer, status, action, secondaryAction, onAction, onSecondaryAction, onPause, onDelete }) {
  return (
    <article className={`managed-card offer-${offer.tone || 'orange'} ${isOfferPaused(offer) ? 'is-paused' : ''}`}>
      <div {...imageSurfaceProps(offer.image, 'managed-image')}></div>
      <div>
        <span>{status}</span>
        <h2>{offer.title}</h2>
        <p>{offer.section} - {offer.expires} - {offer.price}</p>
        <div className="managed-actions">
          <button type="button" onClick={onAction}>{action}</button>
          <button type="button" onClick={onSecondaryAction}>{secondaryAction}</button>
          <button type="button" onClick={onPause}>{isOfferPaused(offer) ? 'Activar' : 'Pausar'}</button>
          <button className="danger" type="button" onClick={onDelete}>Eliminar</button>
        </div>
      </div>
    </article>
  )
}

function AdminScreen({
  businesses,
  offers,
  adminMetrics,
  analyticsExcluded,
  onToggleAnalyticsExcluded,
  onBack,
  onOpenBusiness,
  onOpenOffer,
  onTogglePublic,
  onToggleVerified,
  onActivateOrders,
  onRenewFounder,
  onRepostOffer,
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
  const activeOffers = offers.filter(isOfferActiveNow)
  const pausedOffers = offers.filter((offer) => isOfferPaused(offer) && !isOfferExpired(offer))
  const expiredOffers = offers.filter(isOfferExpired)
  const expiringOffers = activeOffers.filter((offer) => {
    const days = getOfferDaysLeft(offer)
    return days !== null && days <= 1
  })
  const founderExpiringSoon = businesses.filter(isFounderExpiringSoon)
  const withoutPhoto = businesses.filter((business) => !hasRealBusinessPhoto(business))
  const withoutWhatsapp = businesses.filter((business) => !business.whatsapp)
  const recentBusinesses = businesses.filter(isRecentBusiness)
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
    if (isFounderPlanActive(business) && !business.menu?.filter((item) => item.name).length) issues.push('catalogo')
    if (!business.verified) issues.push('verificar')
    if (business.isPublic === false) issues.push('oculto')
    return issues
  }

  const getStatusLabel = (business) => {
    if (business.isPublic === false) return 'Oculto'
    if (getBusinessQuality(business).length) return 'Revisar'
    if (isFounderPlanActive(business)) return 'Fundador activo'
    if (isFounderPlanExpired(business)) return 'Fundador vencido'
    if (isFounderPlanRequested(business)) return 'Fundador pendiente'
    return 'Publicado'
  }

  const getPlanActionLabel = (business) => {
    if (isFounderPlanActive(business)) return 'Quitar fundador'
    if (isFounderPlanExpired(business)) return 'Renovar fundador'
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

  const businessListByView = (() => {
    if (adminView === 'pendientes') return priorityBusinesses.filter((business) => getBusinessQuality(business).length)
    if (adminView === 'planes') return priorityBusinesses.filter((business) => isFounderPlanRequested(business) || isFounderPlanActive(business) || isFounderPlanExpired(business))
    if (adminView === 'por-vencer') return founderExpiringSoon
    if (adminView === 'sin-foto') return withoutPhoto
    if (adminView === 'sin-whatsapp') return withoutWhatsapp
    if (adminView === 'nuevos') return recentBusinesses
    return priorityBusinesses
  })()
  const offerViews = ['promos', 'pausadas', 'vencidas']
  const visibleAdminBusinesses = offerViews.includes(adminView) ? [] : businessListByView
  const adminOffers = adminView === 'vencidas' ? expiredOffers : adminView === 'pausadas' ? pausedOffers : activeOffers
  const launchChecks = [
    { label: '5 locales reales', ok: visibleBusinesses.length >= 5, value: `${visibleBusinesses.length}/5` },
    { label: '3 promos vigentes', ok: activeOffers.length >= 3, value: `${activeOffers.length}/3` },
    { label: 'Fotos reconocibles', ok: withoutPhoto.length === 0 || visibleBusinesses.length - withoutPhoto.length >= 5, value: `${Math.max(visibleBusinesses.length - withoutPhoto.length, 0)}` },
    { label: 'WhatsApp cargado', ok: withoutWhatsapp.length === 0, value: withoutWhatsapp.length ? `${withoutWhatsapp.length} faltan` : 'ok' },
    { label: 'Fundador controlado', ok: pendingOrders.length === 0, value: pendingOrders.length ? `${pendingOrders.length} pendientes` : 'ok' },
  ]

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
        <article className={expiredOffers.length ? 'needs' : ''}>
          <strong>{expiredOffers.length}</strong>
          <span>promos vencidas</span>
        </article>
        <article className={founderExpiringSoon.length ? 'needs' : ''}>
          <strong>{founderExpiringSoon.length}</strong>
          <span>fundador por vencer</span>
        </article>
        <article>
          <strong>{adminMetrics?.pageViews || 0}</strong>
          <span>visitas reales</span>
        </article>
        <article>
          <strong>{adminMetrics?.uniqueVisitors || 0}</strong>
          <span>vecinos unicos</span>
        </article>
      </section>

      <section className="admin-guidance compact-admin-guidance">
        <div>
          <Eye size={18} />
          <strong>Medicion de visitas</strong>
        </div>
        <p>Cuenta visitas guardadas en la base y excluye eventos marcados como admin. Para no sumar tus pruebas, deja activada la exclusion en este telefono o PC.</p>
        <button type="button" onClick={onToggleAnalyticsExcluded}>
          {analyticsExcluded ? 'Este dispositivo no cuenta' : 'No contar este dispositivo'}
        </button>
      </section>

      <section className="admin-tabs" aria-label="Vistas de administracion">
        {[
          ['pendientes', `Pendientes ${needsReview.length}`],
          ['planes', `Fundador ${pendingOrders.length}`],
          ['por-vencer', `Por vencer ${founderExpiringSoon.length}`],
          ['sin-foto', `Sin foto ${withoutPhoto.length}`],
          ['sin-whatsapp', `Sin WhatsApp ${withoutWhatsapp.length}`],
          ['nuevos', `Nuevos ${recentBusinesses.length}`],
          ['locales', `Locales ${businesses.length}`],
          ['promos', `Activas ${activeOffers.length}`],
          ['pausadas', `Pausadas ${pausedOffers.length}`],
          ['vencidas', `Vencidas ${expiredOffers.length}`],
        ].map(([id, label]) => (
          <button className={adminView === id ? 'active' : ''} type="button" key={id} onClick={() => setAdminView(id)}>
            {label}
          </button>
        ))}
      </section>

      <section className="admin-command-center">
        <article>
          <span>Revision</span>
          <strong>Corregir datos</strong>
          <p>{needsReview.length ? `${needsReview.length} locales necesitan revisar WhatsApp, direccion, horario o verificacion.` : 'No hay locales urgentes para revisar.'}</p>
        </article>
        <article>
          <span>Publicacion</span>
          <strong>Verificar y publicar</strong>
          <p>{readyBusinesses.length} locales tienen datos suficientes para mostrarse con confianza.</p>
        </article>
        <article>
          <span>Planes</span>
          <strong>Planes manuales</strong>
          <p>{pendingOrders.length ? `${pendingOrders.length} comercio(s) pidieron fundador y esperan tu activacion.` : 'No hay solicitudes de fundador pendientes.'}</p>
        </article>
      </section>

      <section className="admin-guidance">
        <div>
          <BadgeCheck size={18} />
          <strong>Regla de calidad</strong>
        </div>
        <p>Antes de compartir fuerte el link, apunta a pocos comercios bien cargados: foto real, WhatsApp, horario claro y promos vigentes. El catalogo solo cuenta si tienen fundador activo.</p>
      </section>

      {!offerViews.includes(adminView) && (
      <section className="admin-list">
        <div className="feed-head compact">
          <div>
            <Store size={17} />
            <strong>{adminView === 'planes' ? 'Solicitudes y planes' : adminView === 'por-vencer' ? 'Fundador por vencer' : adminView === 'sin-foto' ? 'Locales sin foto real' : adminView === 'sin-whatsapp' ? 'Locales sin WhatsApp' : adminView === 'nuevos' ? 'Nuevos esta semana' : adminView === 'locales' ? 'Todos los locales' : 'Locales para revisar'}</strong>
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
          const businessMetrics = adminMetrics?.byBusiness?.[business.id] || {}
          const adminContactUrl = makeWhatsAppUrl(
            business.whatsapp,
            `Hola ${business.name}, soy Cristian de Cerca Liceo. Te escribo por tu ficha del barrio.`
          )
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
              <span>{isFounderPlanActive(business) ? 'Plan fundador activo' : isFounderPlanExpired(business) ? 'Plan fundador vencido' : isFounderPlanRequested(business) ? 'Pidio plan fundador' : 'Ficha gratis'}</span>
              <span>{business.planStatus === 'active' ? (isFounderPlanExpired(business) ? 'Vencido' : 'Activo por admin') : business.planStatus === 'manual_pending' ? 'Pendiente de activar' : 'Gratis'}</span>
              {business.paidUntil && <span>Vence {new Date(`${business.paidUntil}T00:00:00`).toLocaleDateString('es-AR')}</span>}
              <span>{business.open ? 'Abierto segun ficha' : 'Marcado cerrado'}</span>
              <span>{businessOffers.length} promos</span>
              <span>{businessMetrics.businessViews || 0} vistas ficha</span>
              <span>{businessMetrics.whatsappClicks || 0} WhatsApp</span>
            </div>
            <div className="admin-row-actions">
              <button type="button" onClick={() => onOpenBusiness(business)}>Ver</button>
              {business.whatsapp && (
                <a href={adminContactUrl} target="_blank" rel="noreferrer">WhatsApp</a>
              )}
              <button type="button" onClick={() => onToggleVerified(business)}>{business.verified ? 'Quitar check' : 'Verificar'}</button>
              <button type="button" onClick={() => onTogglePublic(business)}>{business.isPublic === false ? 'Mostrar' : 'Ocultar'}</button>
              <button type="button" onClick={() => onActivateOrders(business)}>{getPlanActionLabel(business)}</button>
              {(isFounderPlanActive(business) || isFounderPlanExpired(business)) && (
                <button type="button" onClick={() => onRenewFounder(business)}>Renovar 30 dias</button>
              )}
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
                    {commerceCategories.map((category) => (
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
                    <button type="button" onClick={() => onPauseOffer(offer)}>{isOfferPaused(offer) ? 'Activar' : 'Pausar'}</button>
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

      {offerViews.includes(adminView) && (
      <section className="admin-list">
        <div className="feed-head compact">
          <div>
            <Flame size={17} />
            <strong>{adminView === 'vencidas' ? 'Promos vencidas' : adminView === 'pausadas' ? 'Promos pausadas' : 'Promos activas'}</strong>
          </div>
          <span>{expiringOffers.length} vencen pronto</span>
        </div>
        {adminOffers.length === 0 && (
          <article className="admin-empty-state">
            <strong>No hay publicaciones en esta vista.</strong>
            <p>Cuando una promo se pause o venza, va a quedar en historial para revisar o republicar.</p>
          </article>
        )}
        {adminOffers.slice(0, 40).map((offer) => (
          <article className="admin-row promo" key={offer.id || offer.title}>
            <span className={`admin-dot ${isOfferPaused(offer) ? 'warn' : 'ok'}`}></span>
            <div>
              <strong>{offer.title}</strong>
              <small>{offer.business} - {isOfferExpired(offer) ? 'Vencida' : offer.expires}</small>
            </div>
            <div className="admin-row-actions">
              <em>{offer.price}</em>
              <button type="button" onClick={() => onOpenOffer(offer)}>Ver</button>
              {isOfferExpired(offer) ? (
                <button type="button" onClick={() => onRepostOffer(offer)}>Republicar</button>
              ) : (
                <button type="button" onClick={() => onPauseOffer(offer)}>{isOfferPaused(offer) ? 'Activar' : 'Pausar'}</button>
              )}
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
        <div className="launch-checklist">
          {launchChecks.map((check) => (
            <article className={check.ok ? 'ok' : 'warn'} key={check.label}>
              <Check size={14} />
              <strong>{check.label}</strong>
              <span>{check.value}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function LoginScreen({ authNotice, onBack, onLogin, onForgotPassword, onQuickAccess, allowQuickAccess, onRegister, onToggleTheme }) {
  const [credentials, setCredentials] = useState({ email: '', password: '' })

  if (isAndroidCompatMode()) {
    return (
      <div className="android-safe-screen">
        <header className="android-safe-header">
          <button type="button" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <strong>Iniciar sesion</strong>
          <ThemeToggle onToggleTheme={onToggleTheme} />
        </header>

        {authNotice && (
          <section className="android-safe-notice">
            <Check size={16} />
            <span>{authNotice}</span>
          </section>
        )}

        <section className="android-safe-card android-safe-intro">
          <span>Acceso seguro</span>
          <h1>Entrar a Cerca Liceo.</h1>
          <p>Usa tu email y clave. Tambien podes seguir mirando ofertas sin cuenta.</p>
        </section>

        <section className="android-safe-form">
          <label>
            <span>Email</span>
            <input value={credentials.email} onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))} placeholder="nombre@email.com" type="email" />
          </label>
          <label>
            <span>Clave</span>
            <input value={credentials.password} onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))} placeholder="Tu clave" type="password" />
          </label>
          <button type="button" onClick={() => onLogin(credentials)}>Iniciar sesion</button>
          <button className="android-safe-link" type="button" onClick={onForgotPassword}>Olvide mi clave</button>
        </section>

        {allowQuickAccess && (
          <section className="android-safe-actions" aria-label="Acceso rapido">
            <button type="button" onClick={() => onQuickAccess('neighbor')}>
              <strong>Continuar como vecino</strong>
              <small>Favoritos y avisos.</small>
            </button>
            <button type="button" onClick={() => onQuickAccess('merchant')}>
              <strong>Soy comerciante</strong>
              <small>Panel, local y publicaciones.</small>
            </button>
          </section>
        )}

        <section className="android-safe-actions" aria-label="Crear cuenta">
          <button type="button" onClick={() => onRegister('neighbor')}>
            <strong>Crear cuenta vecino</strong>
            <small>Gratis y opcional.</small>
          </button>
          <button type="button" onClick={() => onRegister('merchant')}>
            <strong>Registrar comercio</strong>
            <small>Ficha gratis para aparecer en la guia.</small>
          </button>
        </section>
      </div>
    )
  }

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

  if (isAndroidCompatMode()) {
    return (
      <div className="android-safe-screen">
        <header className="android-safe-header">
          <button type="button" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <strong>Recuperar clave</strong>
          <ThemeToggle onToggleTheme={onToggleTheme} />
        </header>

        {authNotice && (
          <section className="android-safe-notice">
            <Check size={16} />
            <span>{authNotice}</span>
          </section>
        )}

        <section className="android-safe-card android-safe-intro">
          <span>Acceso seguro</span>
          <h1>Recuperar clave.</h1>
          <p>Escribi tu email y te mandamos un enlace para crear una clave nueva.</p>
        </section>

        <section className="android-safe-form">
          <label>
            <span>Email de la cuenta</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@email.com" type="email" />
          </label>
          <button type="button" onClick={() => onSubmit(email)}>Mandar enlace</button>
          <p>Si no aparece, revisa Spam o Promociones.</p>
        </section>
      </div>
    )
  }

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

  if (isAndroidCompatMode()) {
    return (
      <div className="android-safe-screen">
        <header className="android-safe-header">
          <button type="button" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <strong>Nueva clave</strong>
          <ThemeToggle onToggleTheme={onToggleTheme} />
        </header>

        {authNotice && (
          <section className="android-safe-notice">
            <Check size={16} />
            <span>{authNotice}</span>
          </section>
        )}

        <section className="android-safe-card android-safe-intro">
          <span>Cuenta verificada</span>
          <h1>Nueva clave.</h1>
          <p>Usa una clave de al menos 6 caracteres.</p>
        </section>

        <section className="android-safe-form">
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

function ProfileScreen({ account, local, onBack, onLogin, onRegister, onMerchantPanel, onPublish, onAdmin, onResetSession, onUpgradeToMerchant, onPrivacy, authNotice, onToggleTheme }) {
  const isLogged = Boolean(account)
  const isMerchant = account?.type === 'merchant'
  const isAdmin = account?.role === 'admin' || !cercaApi.isSupabaseEnabled()

  if (isAndroidCompatMode()) {
    return (
      <div className="android-safe-screen">
        <header className="android-safe-header">
          <button type="button" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <strong>Mi usuario</strong>
          <ThemeToggle onToggleTheme={onToggleTheme} />
        </header>

        {authNotice && (
          <section className="android-safe-notice">
            <Check size={16} />
            <span>{authNotice}</span>
          </section>
        )}

        {!isLogged && (
          <>
            <section className="android-safe-card android-safe-intro">
              <span>Acceso</span>
              <h1>Entrar es opcional.</h1>
              <p>Para mirar ofertas y locales no hace falta registrarse. La cuenta sirve para guardar favoritos o administrar un comercio.</p>
            </section>

            <section className="android-safe-actions android-account-options" aria-label="Opciones de cuenta">
              <button type="button" onClick={onLogin}>
                <UserRound size={22} />
                <span>
                  <strong>Iniciar sesion</strong>
                  <small>Vecino o comercio.</small>
                </span>
              </button>
              <button type="button" onClick={() => onRegister('neighbor')}>
                <UserRound size={22} />
                <span>
                  <strong>Crear cuenta vecino</strong>
                  <small>Para favoritos y avisos.</small>
                </span>
              </button>
              <button type="button" onClick={() => onRegister('merchant')}>
                <Store size={22} />
                <span>
                  <strong>Crear cuenta comercio</strong>
                  <small>Ficha gratis para aparecer en la guia.</small>
                </span>
              </button>
            </section>
          </>
        )}

        {isLogged && (
          <>
            <section className="android-safe-card android-safe-intro">
              <span>{isMerchant ? 'Cuenta comercio' : 'Cuenta vecino'}</span>
              <h1>{account.name}</h1>
              <p>{isMerchant ? 'Administra tu ficha, publicaciones y datos del comercio.' : 'Tu cuenta esta lista para guardar favoritos y recibir avisos.'}</p>
            </section>

            <section className="android-safe-actions" aria-label="Acciones de cuenta">
              {isMerchant && (
                <>
                  <button type="button" onClick={onMerchantPanel}>
                    <strong>Panel comercio</strong>
                    <small>Cargar local, horarios, foto y datos.</small>
                  </button>
                  <button type="button" onClick={onPublish}>
                    <strong>Publicar promo</strong>
                    <small>Usa tu publicacion semanal gratis.</small>
                  </button>
                </>
              )}
              {!isMerchant && (
                <>
                  <button type="button">
                    <strong>Favoritos y avisos</strong>
                    <small>Proximamente para vecinos registrados.</small>
                  </button>
                  <button type="button" onClick={onUpgradeToMerchant}>
                    <strong>Usar mi cuenta como comercio</strong>
                    <small>Si tenes local o emprendimiento, activa el panel.</small>
                  </button>
                </>
              )}
              {isAdmin && (
                <button type="button" onClick={onAdmin}>
                  <strong>Administracion</strong>
                  <small>Revisar locales, promos y solicitudes.</small>
                </button>
              )}
              <button type="button" onClick={onResetSession}>
                <strong>Cerrar sesion</strong>
                <small>Volver a navegar como visitante.</small>
              </button>
            </section>
          </>
        )}

        <section className="android-safe-card">
          <span>Comercios</span>
          <h2>Arrancas gratis.</h2>
          <p>La ficha del local o emprendimiento puede aparecer con foto, zona, horario y contacto. Los extras se activan solo si el comercio los pide.</p>
        </section>

        <section className="android-safe-card">
          <span>Contacto</span>
          <h2>Cerca Liceo</h2>
          <p>Soporte: 3517662142. Mail: crisalbavideografo@gmail.com.</p>
        </section>
      </div>
    )
  }

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
        <section className={`profile-actions compact ${isMerchant ? 'merchant-primary-actions' : ''}`}>
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
              <button type="button" onClick={onUpgradeToMerchant}>
                <Store size={19} />
                Pasar a comercio
              </button>
            </>
          )}
          {isMerchant && (
            <>
              <button type="button" onClick={onMerchantPanel}>
                <List size={19} />
                Panel de comercio
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

      {isMerchant && !local && (
        <section className="merchant-entry-card">
          <span>{local ? 'Local publicado' : 'Para comercios'}</span>
          <h2>{local ? local.name : 'Carga tu ficha y apareces en la guia.'}</h2>
          <p>{local ? `${local.category} en ${local.section}. ${hasBusinessPublicAddress(local) ? local.address : 'Contacto directo por WhatsApp o Instagram.'}` : 'Completa foto, zona, horarios, WhatsApp y catalogo para que los vecinos te encuentren.'}</p>
          <div>
            <button type="button" onClick={onMerchantPanel}>{local ? 'Editar local' : 'Cargar local'}</button>
          </div>
        </section>
      )}

      {isLogged && !isMerchant && (
        <section className="merchant-entry-card">
          <span>Tambien vendes?</span>
          <h2>Usa esta misma cuenta como comercio.</h2>
          <p>Si te registraste como vecino por error, no hace falta crear otra cuenta. Activas el panel y despues cargas local fisico o emprendimiento sin direccion.</p>
          <div>
            <button type="button" onClick={onUpgradeToMerchant}>Activar comercio</button>
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
            <strong>Catalogo + pedidos</strong>
            <p>El vecino elige productos o servicios, suma la consulta y la envia armada al WhatsApp del comercio.</p>
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

      <ContactFooter onPrivacy={onPrivacy} />
    </div>
  )
}

function PrivacyScreen({ onBack, onToggleTheme }) {
  return (
    <div className="utility-screen privacy-screen">
      <header className="detail-header">
        <button type="button" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <strong>Privacidad</strong>
        <ThemeToggle onToggleTheme={onToggleTheme} />
      </header>

      <section className="privacy-hero">
        <span>Reglas claras</span>
        <h1>Cerca Liceo cuida datos simples del barrio.</h1>
        <p>La pagina sirve para encontrar comercios, promociones y contactos. El vecino puede usarla gratis sin registrarse.</p>
      </section>

      <section className="privacy-list">
        <article>
          <ShieldCheck size={18} />
          <div>
            <strong>Para vecinos</strong>
            <p>No hace falta crear cuenta para mirar ofertas, locales, horarios o contactos.</p>
          </div>
        </article>
        <article>
          <Store size={18} />
          <div>
            <strong>Para comercios</strong>
            <p>Se guardan los datos que cargues para mostrar tu ficha: nombre, rubro, zona, horario, WhatsApp, Instagram y fotos.</p>
          </div>
        </article>
        <article>
          <MessageCircle size={18} />
          <div>
            <strong>WhatsApp</strong>
            <p>Los pedidos y consultas se envian directo al comercio. Cerca Liceo no cobra comision por venta.</p>
          </div>
        </article>
        <article>
          <Eye size={18} />
          <div>
            <strong>Control</strong>
            <p>El comercio puede pausar su ficha, marcar cerrado, editar datos y pedir ayuda para corregir o borrar informacion.</p>
          </div>
        </article>
      </section>

      <section className="privacy-contact">
        <span>Contacto directo</span>
        <h2>Soporte del proyecto</h2>
        <p>Creador: Cristian Eduardo Alba. Para cambios, bajas o consultas escribi por WhatsApp o email.</p>
        <div>
          <a href={makeWhatsAppUrl('3517662142', 'Hola Cristian, queria consultar por privacidad o datos en Cerca Liceo.')} target="_blank" rel="noreferrer">
            <MessageCircle size={16} /> WhatsApp
          </a>
          <a href="mailto:crisalbavideografo@gmail.com?subject=Privacidad%20Cerca%20Liceo">
            <Share2 size={16} /> Email
          </a>
        </div>
      </section>
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
    instagram: '',
    address: '',
    reference: '',
    locationMode: 'address',
    locationLat: '',
    locationLng: '',
    locationPrecision: 'approximate',
    locationNote: '',
  })
  const isMerchant = accountType === 'merchant'
  const registerLocationMode = form.businessType === 'entrepreneur' ? 'none' : (form.locationMode || 'address')
  const registerHasPinLocation = registerLocationMode === 'pin' && hasBusinessPin(form)
  const registerMapUrl = getBusinessMapUrl({ ...form, section: form.section || 'Liceo Procrear' })
  const updateForm = (field, value) => {
    const cleanValue = field === 'whatsapp'
      ? value.replace(/\D/g, '').slice(0, 15)
      : value
    setForm((current) => ({ ...current, [field]: cleanValue }))
  }
  const updateRegisterBusinessType = (businessType) => {
    setForm((current) => ({
      ...current,
      businessType,
      locationMode: businessType === 'entrepreneur' ? 'none' : current.locationMode === 'none' ? 'address' : current.locationMode,
    }))
  }
  const updateRegisterLocationMode = (locationMode) => {
    setForm((current) => ({
      ...current,
      locationMode,
      address: locationMode === 'none' ? '' : current.address,
      locationLat: locationMode === 'pin' ? current.locationLat : '',
      locationLng: locationMode === 'pin' ? current.locationLng : '',
    }))
  }
  const updateRegisterMapLink = (value) => {
    const coords = parseMapCoordinates(value)
    setForm((current) => ({
      ...current,
      locationMode: 'pin',
      locationLat: coords?.lat ?? current.locationLat,
      locationLng: coords?.lng ?? current.locationLng,
      locationPrecision: coords ? 'exact' : current.locationPrecision,
      locationNote: value,
      address: current.address || `${current.section || 'Liceo Procrear'} - ubicacion marcada`,
    }))
  }
  const updateRegisterMapCoordinates = ({ lat, lng }) => {
    setForm((current) => ({
      ...current,
      locationMode: 'pin',
      locationLat: lat,
      locationLng: lng,
      locationPrecision: 'exact',
      locationNote: `${lat}, ${lng}`,
      address: current.address || `${current.section || 'Liceo Procrear'} - ubicacion marcada`,
    }))
  }
  const validateRegisterForm = () => {
    const fullName = form.name.trim().replace(/\s+/g, ' ')
    const email = form.email.trim()
    if (fullName.split(' ').filter(Boolean).length < 2) {
      return 'Escribi nombre y apellido para que la cuenta quede clara.'
    }
    if (isMerchant && !form.whatsapp.trim()) {
      return 'Para comercio hace falta un WhatsApp argentino. Ejemplo: 3517662142.'
    }
    if (form.whatsapp && !isValidArgentineWhatsapp(form.whatsapp)) {
      return 'El WhatsApp tiene que ser argentino, solo numeros y sin 0 ni 15. Ejemplo: 3517662142.'
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
        whatsapp: normalizeArgentineWhatsapp(form.whatsapp),
        email: form.email.trim(),
        section: form.section || 'Liceo Procrear',
        businessName: form.businessName || '',
        businessType: form.businessType,
        category: form.category || 'Comida',
        salesMode: form.salesMode,
        instagram: form.instagram,
        address: form.businessType === 'entrepreneur' || registerLocationMode === 'none' ? '' : form.address,
        reference: form.reference,
        locationMode: registerLocationMode,
        locationLat: registerLocationMode === 'pin' ? form.locationLat : '',
        locationLng: registerLocationMode === 'pin' ? form.locationLng : '',
        locationPrecision: form.locationPrecision || 'approximate',
        locationNote: form.locationNote || form.reference,
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

  if (isAndroidCompatMode()) {
    if (pendingEmail) {
      return (
        <div className="android-safe-screen">
          <header className="android-safe-header">
            <button type="button" onClick={onBack} aria-label="Volver">
              <ArrowLeft size={22} />
            </button>
            <strong>Confirmar email</strong>
            <ThemeToggle onToggleTheme={onToggleTheme} />
          </header>

          <section className="android-safe-card android-safe-intro">
            <span>{isMerchant ? 'Comercio registrado' : 'Cuenta creada'}</span>
            <h1>Revisa tu email.</h1>
            <p>Te va a llegar un correo de Cerca Liceo. Abrilo y toca confirmar cuenta. Despues volve e inicia sesion.</p>
          </section>

          <section className="android-safe-actions">
            <button type="button" onClick={onLogin || onBack}>
              <strong>Ya confirme</strong>
              <small>Ir a iniciar sesion.</small>
            </button>
          </section>
        </div>
      )
    }

    if (submitted) {
      return (
        <div className="android-safe-screen">
          <header className="android-safe-header">
            <button type="button" onClick={onBack} aria-label="Volver">
              <ArrowLeft size={22} />
            </button>
            <strong>Cuenta creada</strong>
            <ThemeToggle onToggleTheme={onToggleTheme} />
          </header>

          <section className="android-safe-card android-safe-intro">
            <span>{isMerchant ? 'Comercio listo' : 'Vecino listo'}</span>
            <h1>{isMerchant ? 'Ahora carga tu local.' : 'Ya podes usar tu cuenta.'}</h1>
            <p>{isMerchant ? 'Desde el panel comercio completas foto, zona, horarios y publicaciones.' : 'La cuenta sirve para favoritos y avisos.'}</p>
          </section>

          <section className="android-safe-actions">
            <button type="button" onClick={onBack}>
              <strong>Volver a mi cuenta</strong>
              <small>Seguir en Cerca Liceo.</small>
            </button>
          </section>
        </div>
      )
    }

    return (
      <div className="android-safe-screen">
        <header className="android-safe-header">
          <button type="button" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <strong>Crear cuenta</strong>
          <ThemeToggle onToggleTheme={onToggleTheme} />
        </header>

        <section className="android-safe-card android-safe-intro">
          <span>{isMerchant ? 'Comerciante' : 'Vecino'}</span>
          <h1>{isMerchant ? 'Registrar comercio.' : 'Crear cuenta vecino.'}</h1>
          <p>{isMerchant ? 'Primero creas la cuenta. Despues cargas el local, foto, horarios y publicaciones desde el panel.' : 'La cuenta es opcional y sirve para guardar favoritos y recibir avisos.'}</p>
        </section>

        <section className="android-safe-actions android-safe-toggle">
          <button className={accountType === 'neighbor' ? 'active' : ''} type="button" onClick={() => setAccountType('neighbor')}>
            <strong>Vecino</strong>
            <small>Cuenta gratis.</small>
          </button>
          <button className={accountType === 'merchant' ? 'active' : ''} type="button" onClick={() => setAccountType('merchant')}>
            <strong>Comercio</strong>
            <small>Para publicar.</small>
          </button>
        </section>

        <section className="android-safe-form">
          {submitFeedback && <p className="form-warning">{submitFeedback}</p>}
          <label>
            <span>Nombre y apellido</span>
            <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Ej: Nombre y apellido" />
          </label>
          <label>
            <span>WhatsApp</span>
            <input value={form.whatsapp} onChange={(event) => updateForm('whatsapp', event.target.value)} placeholder="3510000000" inputMode="numeric" />
          </label>
          <label>
            <span>Email</span>
            <input value={form.email} onChange={(event) => updateForm('email', event.target.value)} placeholder="nombre@email.com" type="email" />
          </label>
          <label>
            <span>Clave</span>
            <input value={form.password} onChange={(event) => updateForm('password', event.target.value)} placeholder="Minimo 6 caracteres" type="password" />
          </label>
          <label>
            <span>Repetir clave</span>
            <input value={form.confirmPassword} onChange={(event) => updateForm('confirmPassword', event.target.value)} placeholder="Escribila otra vez" type="password" />
          </label>
          <label>
            <span>Seccion</span>
            <select value={form.section} onChange={(event) => updateForm('section', event.target.value)}>
              <option value="">Elegir seccion</option>
              {sections.filter((section) => section !== 'Todos').map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </label>
          {isMerchant && (
            <>
              <section className="android-safe-mini-toggle" aria-label="Tipo de comercio">
                <button
                  className={form.businessType !== 'entrepreneur' ? 'active' : ''}
                  type="button"
                  onClick={() => updateRegisterBusinessType('local')}
                >
                  Tengo local
                </button>
                <button
                  className={form.businessType === 'entrepreneur' ? 'active' : ''}
                  type="button"
                  onClick={() => updateRegisterBusinessType('entrepreneur')}
                >
                  Emprendo sin local
                </button>
              </section>
              <p>{form.businessType === 'entrepreneur' ? 'No hace falta publicar direccion. Despues cargas zona, WhatsApp e Instagram.' : 'Despues podes cargar direccion, horario y boton para llegar.'}</p>
              {form.businessType !== 'entrepreneur' && (
                <>
                  <div className="android-safe-mini-toggle location-safe-toggle" aria-label="Ubicacion inicial">
                    <button className={registerLocationMode === 'address' ? 'active' : ''} type="button" onClick={() => updateRegisterLocationMode('address')}>
                      Direccion
                    </button>
                    <button className={registerLocationMode === 'pin' ? 'active' : ''} type="button" onClick={() => updateRegisterLocationMode('pin')}>
                      Pin mapa
                    </button>
                    <button className={registerLocationMode === 'none' ? 'active' : ''} type="button" onClick={() => updateRegisterLocationMode('none')}>
                      Despues
                    </button>
                  </div>
                  {registerLocationMode === 'pin' && (
                    <div className="tap-map-editor real-pin-editor android-safe-map-picker">
                      <RealLocationPicker location={form} mapUrl={registerMapUrl} onPick={updateRegisterMapCoordinates} />
                      <label className="map-coordinates-field">
                        <span>Opcional: pegar link o coordenadas</span>
                        <input
                          value={form.locationNote || ''}
                          onChange={(event) => updateRegisterMapLink(event.target.value)}
                          placeholder="-31.36782, -64.129397 o link de Maps"
                        />
                      </label>
                      <div className="tap-map-help">
                        <strong>{registerHasPinLocation ? 'Ubicacion real marcada' : 'Todavia falta el punto real'}</strong>
                        <span>{registerHasPinLocation ? 'Se guarda para que el vecino abra Maps.' : 'Si no lo tenes ahora, podes cargarlo despues.'}</span>
                      </div>
                    </div>
                  )}
                  {registerLocationMode !== 'none' && (
                    <label>
                      <span>{registerLocationMode === 'pin' ? 'Referencia para llegar' : 'Direccion o referencia'}</span>
                      <input value={form.address} onChange={(event) => updateForm('address', event.target.value)} placeholder={registerLocationMode === 'pin' ? 'Ej: Frente a la plaza, manzana 12' : 'Ej: Calle, manzana o referencia'} />
                    </label>
                  )}
                </>
              )}
              <label>
                <span>{form.businessType === 'entrepreneur' ? 'Nombre del emprendimiento' : 'Nombre comercial'}</span>
                <input value={form.businessName} onChange={(event) => updateForm('businessName', event.target.value)} placeholder={form.businessType === 'entrepreneur' ? 'Ej: Hecho en Casa' : 'Ej: Almacen del Barrio'} />
              </label>
              <label>
                <span>Rubro principal</span>
                <select value={form.category} onChange={(event) => updateForm('category', event.target.value)}>
                  <option value="">Elegir rubro</option>
                  {commerceCategories.map((category) => (
                    <option key={category.name} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Como vendes hoy</span>
                <select value={form.salesMode} onChange={(event) => updateForm('salesMode', event.target.value)}>
                  <option value="">Seleccionar</option>
                  <option>Local fisico</option>
                  <option>WhatsApp</option>
                  <option>Instagram</option>
                  <option>Delivery propio</option>
                  <option>Por encargo</option>
                  <option>Retiro coordinado</option>
                </select>
              </label>
            </>
          )}
          <p>Te puede llegar un email de Cerca Liceo para confirmar la cuenta.</p>
          <button type="button" disabled={isSubmitting} onClick={submitRegister}>
            {isSubmitting ? 'Creando cuenta...' : isMerchant ? 'Crear cuenta de comercio' : 'Crear cuenta vecino'}
          </button>
        </section>
      </div>
    )
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
              ? 'El registro queda simple. El local, horarios, fotos, publicaciones y catalogo se agregan despues desde el panel comercio.'
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
          <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder={isMerchant ? 'Ej: Nombre y apellido' : 'Ej: Nombre y apellido'} autoComplete="name" />
        </label>
        <label>
          <span>WhatsApp</span>
          <input value={form.whatsapp} onChange={(event) => updateForm('whatsapp', event.target.value)} placeholder="3510000000" inputMode="numeric" pattern="[0-9]*" autoComplete="tel" />
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
              <input value={form.businessName} onChange={(event) => updateForm('businessName', event.target.value)} placeholder={form.businessType === 'entrepreneur' ? 'Ej: Hecho en Casa' : 'Ej: Almacen del Barrio'} />
            </label>
            <div className="merchant-type-register wide">
              <span>Tipo de comercio</span>
              <div>
                <button
                  className={form.businessType !== 'entrepreneur' ? 'active' : ''}
                  type="button"
                  onClick={() => updateRegisterBusinessType('local')}
                >
                  Tengo local
                </button>
                <button
                  className={form.businessType === 'entrepreneur' ? 'active' : ''}
                  type="button"
                  onClick={() => updateRegisterBusinessType('entrepreneur')}
                >
                  Sin local
                </button>
              </div>
              <small>{form.businessType === 'entrepreneur' ? 'Contacto por WhatsApp o Instagram.' : 'Direccion y Maps visibles.'}</small>
            </div>
            {form.businessType !== 'entrepreneur' && (
              <div className="location-picker-card register-location-picker wide">
                <strong>Ubicacion inicial</strong>
                <div className="location-mode-tabs">
                  <button className={registerLocationMode === 'address' ? 'active' : ''} type="button" onClick={() => updateRegisterLocationMode('address')}>
                    Direccion
                  </button>
                  <button className={registerLocationMode === 'pin' ? 'active' : ''} type="button" onClick={() => updateRegisterLocationMode('pin')}>
                    Pin mapa
                  </button>
                  <button className={registerLocationMode === 'none' ? 'active' : ''} type="button" onClick={() => updateRegisterLocationMode('none')}>
                    Despues
                  </button>
                </div>
                {registerLocationMode === 'pin' && (
                  <div className="tap-map-editor real-pin-editor">
                    <RealLocationPicker location={form} mapUrl={registerMapUrl} onPick={updateRegisterMapCoordinates} />
                    <label className="map-coordinates-field">
                      <span>Opcional: pegar link o coordenadas</span>
                      <input
                        value={form.locationNote || ''}
                        onChange={(event) => updateRegisterMapLink(event.target.value)}
                        placeholder="-31.36782, -64.129397 o link de Maps"
                      />
                    </label>
                    <div className="tap-map-help">
                      <strong>{registerHasPinLocation ? 'Ubicacion real marcada' : 'Todavia falta el punto real'}</strong>
                      <span>{registerHasPinLocation ? 'Se guarda para que el vecino abra Maps.' : 'Si no lo tenes ahora, podes cargarlo despues.'}</span>
                    </div>
                  </div>
                )}
                {registerLocationMode !== 'none' && (
                  <label>
                    <span>{registerLocationMode === 'pin' ? 'Referencia para llegar' : 'Direccion o referencia'}</span>
                    <input value={form.address} onChange={(event) => updateForm('address', event.target.value)} placeholder={registerLocationMode === 'pin' ? 'Ej: Frente a la plaza, manzana 12' : 'Ej: Calle, manzana o referencia'} />
                  </label>
                )}
                {registerLocationMode === 'none' && <p className="no-location-note">Podes cargar la ubicacion despues desde el panel comercio.</p>}
              </div>
            )}
            <label>
              <span>Rubro principal</span>
              <select value={form.category} onChange={(event) => updateForm('category', event.target.value)}>
                <option value="" disabled>Elegir rubro</option>
                {commerceCategories.map((category) => (
                  <option key={category.name} value={category.name}>{category.name}</option>
                ))}
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
  const locationText = hasBusinessPin(business)
    ? `${business.section} - pin aproximado`
    : business.address
  const founderActive = isFounderPlanActive(business)
  const availableMenu = getBusinessMenu(business).filter((item) => item.available !== false && item.name?.trim())
  const mapUrl = getBusinessMapUrl(business)
  const whatsappUrl = makeWhatsAppUrl(
    business.whatsapp,
    buildCercaWhatsAppMessage({
      business,
      note: 'Queria consultar por lo que ofrecen, horarios y disponibilidad.',
    }),
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
          {publicAddress ? locationText : 'Coordina por WhatsApp o Instagram'}
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
                <b>{item.price || 'Consultar'}</b>
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

function BusinessDetailScreen({ business, onBack, onToggleTheme, onTrack }) {
  const publicAddress = hasBusinessPublicAddress(business)
  const founderActive = isFounderPlanActive(business)
  const mapQuery = hasBusinessPin(business)
    ? `${business.locationLat},${business.locationLng}`
    : `${business.address || business.section}, Cordoba, Argentina`
  const mapUrl = getBusinessMapUrl(business)
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
  const locationText = hasBusinessPin(business)
    ? `${business.section} - pin aproximado`
    : business.address
  const instagramUrl = makeInstagramUrl(business.instagram)
  const openStatus = getOpenStatus(business)
  const [cart, setCart] = useState({})
  const [orderMode, setOrderMode] = useState('Retiro')
  const [note, setNote] = useState('')
  const orderModes = business.hasDelivery ? ['Retiro', 'Envio', 'Consultar'] : ['Retiro', 'Consultar']
  const priceToNumber = (price) => Number(String(price || '').replace(/[^\d]/g, ''))
  const availableMenu = founderActive
    ? getBusinessMenu(business)
      .slice(0, MAX_MENU_ITEMS)
      .map((item, index) => ({
        ...item,
        menuIndex: index,
      }))
      .filter((item) => item.available !== false && item.name?.trim())
    : []
  const detailMenuSections = menuCatalogSections
    .map((section, sectionIndex) => ({
      ...section,
      items: availableMenu.filter((item) => Math.floor(item.menuIndex / MENU_SECTION_SIZE) === sectionIndex),
    }))
    .filter((section) => section.items.length)
  const cartItems = availableMenu
    .map((item) => ({
      ...item,
      quantity: cart[item.menuIndex] || 0,
      numericPrice: priceToNumber(item.price),
    }))
    .filter((item) => item.quantity > 0)
  const total = cartItems.reduce((sum, item) => sum + item.numericPrice * item.quantity, 0)
  const formattedTotal = total > 0 ? `$${total.toLocaleString('es-AR')}` : 'A confirmar'
  const selectedCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const orderLines = cartItems
    .map((item) => `- ${item.quantity}x ${item.name}${item.price ? ` (${item.price})` : ' (consultar precio)'}`)
    .join('\n')
  const whatsappUrl = makeWhatsAppUrl(business.whatsapp, buildCercaWhatsAppMessage({
    business,
    orderLines,
    total: formattedTotal,
    mode: orderMode,
    note: note || (publicAddress ? `Direccion del local: ${business.address}` : `Zona: ${business.section}. Coordinar entrega o consulta por mensaje.`),
  }))
  const updateQuantity = (itemIndex, change) => {
    setCart((current) => ({
      ...current,
      [itemIndex]: Math.max(0, (current[itemIndex] || 0) + change),
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
          <InfoItem icon={publicAddress ? <MapPin size={18} /> : <MessageCircle size={18} />} label={publicAddress ? 'Ubicacion' : 'Contacto'} value={publicAddress ? locationText : 'Sin direccion publica'} />
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
                <h2>Elegis items y sale el mensaje listo.</h2>
                <p>Sin cuenta, sin comision y sin escribir todo de nuevo. Sirve para comida, despensa, servicios o emprendimientos del barrio.</p>
              </div>
              {!openStatus.open && (
                <div className="closed-note">
                  <Clock3 size={16} />
                  <span>El local figura cerrado. Igual podes dejar consulta para cuando atienda.</span>
                </div>
              )}
              <div className="order-tabs" aria-label="Secciones del local">
                <button className="active" type="button">Catalogo</button>
                <button type="button">Ofertas</button>
                <button type="button">Info</button>
              </div>
              <div className="order-catalog">
                {detailMenuSections.map((section) => (
                  <div className="order-catalog-section" key={`detail-${section.title}`}>
                    <div className="order-catalog-title">
                      <strong>{section.title}</strong>
                      <span>{section.hint}</span>
                    </div>
                    {section.items.map((item) => {
                      const quantity = cart[item.menuIndex] || 0

                      return (
                        <div className={`product-row ${quantity > 0 ? 'is-selected' : ''}`} key={`${item.name}-${item.menuIndex}`}>
                          <div {...imageSurfaceProps(business.image, 'product-thumb', business)}>
                            <span>{item.menuIndex + 1}</span>
                          </div>
                          <div className="product-copy">
                            <strong>{item.name}</strong>
                            <small>{item.menuIndex === 0 ? 'Mas pedido hoy' : section.shortTitle}</small>
                            {item.price ? <b>{item.price}</b> : <em>Consultar precio</em>}
                          </div>
                          <div className="qty-control">
                            <button type="button" onClick={() => updateQuantity(item.menuIndex, -1)} aria-label={`Quitar ${item.name}`}>
                              -
                            </button>
                            <strong>{quantity}</strong>
                            <button type="button" onClick={() => updateQuantity(item.menuIndex, 1)} aria-label={`Agregar ${item.name}`}>
                              +
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
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
              <p>Este comercio todavia no tiene catalogo ni pedidos armados. Podes consultar productos, servicios, disponibilidad y precios por WhatsApp.</p>
            </div>
            <a className="map-link-button" href={makeWhatsAppUrl(business.whatsapp, buildCercaWhatsAppMessage({ business, note: 'Queria consultar productos, servicios, precios u horarios.' }))} target="_blank" rel="noreferrer" onClick={() => onTrack?.({ type: 'whatsapp_click', businessId: business.id })}>
              <MessageCircle size={14} /> Consultar por WhatsApp
            </a>
          </section>
        )}
        {publicAddress ? (
          <section className="real-location-map">
            <div>
              <span>Ubicacion</span>
              <strong>{locationText || business.section}</strong>
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
              <a className="map-link-button" href={makeWhatsAppUrl(business.whatsapp, buildCercaWhatsAppMessage({ business, note: 'Queria consultar disponibilidad, punto de entrega o envio.' }))} target="_blank" rel="noreferrer" onClick={() => onTrack?.({ type: 'whatsapp_click', businessId: business.id })}>
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
        <a className={`detail-whatsapp ${cartItems.length ? '' : 'is-disabled'}`} href={cartItems.length ? whatsappUrl : undefined} target="_blank" rel="noreferrer" aria-disabled={!cartItems.length} onClick={() => cartItems.length && onTrack?.({ type: 'whatsapp_click', businessId: business.id })}>
          <MessageCircle size={19} />
          {cartItems.length ? 'Consultar por WhatsApp' : 'Elegir items primero'}
        </a>
        )}
      </section>
      {founderActive && cartItems.length > 0 && (
        <div className="order-cart-bar">
          <div>
            <span>{selectedCount} items</span>
            <strong>{formattedTotal}</strong>
          </div>
          <a href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => onTrack?.({ type: 'whatsapp_click', businessId: business.id })}>
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

function DetailScreen({ offer, relatedOffers = [], onBack, onToggleTheme, onTrack }) {
  const publicAddress = hasBusinessPublicAddress(offer)
  const mapUrl = getBusinessMapUrl(offer)
  const locationText = hasBusinessPin(offer)
    ? `${offer.section} - pin aproximado`
    : offer.address
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
          <InfoItem icon={publicAddress ? <MapPin size={18} /> : <MessageCircle size={18} />} label={publicAddress ? 'Ubicacion' : 'Contacto'} value={publicAddress ? locationText : 'Coordinar por WhatsApp'} />
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

        <a className="detail-whatsapp sticky-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => onTrack?.({ type: 'whatsapp_click', businessId: offer.businessId, offerId: offer.id })}>
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

function OfferCard({ offer, onOpen, onTrack }) {
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
      <a
        className="whatsapp-button"
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => {
          event.stopPropagation()
          onTrack?.({ type: 'whatsapp_click', businessId: offer.businessId, offerId: offer.id })
        }}
      >
        <MessageCircle size={17} />
        WhatsApp
      </a>
    </article>
  )
}

export default App
