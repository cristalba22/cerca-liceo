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

const formatOpenDays = (days = []) => {
  if (days.length === 7) return 'Todos los dias'
  if (days.join(',') === 'Lun,Mar,Mie,Jue,Vie') return 'Lun a Vie'
  if (days.join(',') === 'Lun,Mar,Mie,Jue,Vie,Sab') return 'Lun a Sab'
  if (days.join(',') === 'Sab,Dom') return 'Sab y Dom'
  return days.length ? days.join(', ') : 'Dias a definir'
}

const formatSchedule = ({ openDays = [], openTime = '', closeTime = '', hours = '' }) => {
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

const getOpenStatus = (business = {}) => {
  const days = business.openDays || business.open_days || []
  const openTime = business.openTime || business.open_time
  const closeTime = business.closeTime || business.close_time

  if (!days.length || !openTime || !closeTime) {
    return {
      open: business.open !== false,
      label: business.open === false ? 'Cerrado' : 'Consultar horario',
      detail: business.hours || business.orderHours || 'Horario a confirmar',
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
    detail: isOpen ? `Hasta ${closeTime}` : formatSchedule(business),
  }
}

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
  const [screen, setScreen] = useState('welcome')
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
    const timer = window.setInterval(() => {
      setFeaturedBusinessIndex((index) => (index + 1) % Math.max(feedBusinesses.length, 1))
    }, 3600)

    return () => window.clearInterval(timer)
  }, [feedBusinesses.length])

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
    const { account: savedAccount, error, pendingConfirmation, message } = await cercaApi.registerAccount(account)
    if (error) {
      setAuthNotice(error.message || 'No se pudo crear la cuenta.')
      return false
    }
    if (pendingConfirmation) {
      setAuthNotice(message || 'Cuenta creada. Revisa tu email para confirmar el acceso.')
      setScreen('login')
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
    setAuthNotice(account.type === 'merchant' ? 'Cuenta comercio creada.' : 'Cuenta vecino creada.')
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

  const publicFeedOffers = useMemo(() => {
    const seen = new Set()
    return feedOffers.filter((offer) => {
      const key = `${offer.businessId || offer.business}-${offer.title}-${offer.price}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [feedOffers])

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
  const openOffers = visibleFeedOffers.filter((offer) => offer.open)
  const safeOpenOffers = openOffers.length ? openOffers : visibleFeedOffers
  const heroOffer = safeOpenOffers[featuredBusinessIndex % Math.max(safeOpenOffers.length, 1)]
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
      open: offer.open !== false,
      isPublic: true,
      menu: [{ name: offer.title, price: offer.price }],
      distance: offer.distance || 'cerca',
    })),
  ]), [feedBusinesses, visibleFeedOffers])

  return (
    <main className={`app-shell ${darkMode ? 'night-mode' : ''}`}>
      <section className="app-screen" aria-label="Cerca Liceo">
        {screen === 'welcome' && <WelcomeScreen onEnter={() => setScreen('home')} />}

        {screen === 'detail' && selectedOffer && (
          <DetailScreen
            offer={selectedOffer}
            relatedOffers={feedOffers}
            onToggleTheme={() => setDarkMode((value) => !value)}
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
            offers={feedOffers}
            onSaveLocal={saveMerchantLocal}
            onBack={() => setScreen('profile')}
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
              { plan: business.plan === 'pedidos' ? 'gratis' : 'pedidos', planStatus: business.plan === 'pedidos' ? 'free' : 'active' },
              business.plan === 'pedidos' ? 'Plan pedidos desactivado.' : 'Plan pedidos activado.',
            )}
            onSaveNote={(business, adminNotes) => updateAdminBusiness(
              business,
              { adminNotes },
              'Nota interna guardada.',
            )}
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
            onBack={() => setScreen('home')}
            onLogin={() => setScreen('login')}
            onMerchantPanel={() => setScreen('my-posts')}
            onPublish={() => openPublish()}
            onAdmin={() => setScreen('admin')}
            onResetSession={resetSession}
            authNotice={authNotice}
            account={account}
            local={merchantLocal}
            onRegister={(type) => {
              setRegisterType(type)
              setScreen('register')
            }}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'login' && (
          <LoginScreen
            authNotice={authNotice}
            onBack={() => setScreen('profile')}
            onLogin={loginAccount}
            onQuickAccess={loginQuick}
            allowQuickAccess={!cercaApi.isSupabaseEnabled()}
            onRegister={(type) => {
              setRegisterType(type)
              setScreen('register')
            }}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'register' && (
          <RegisterScreen
            initialType={registerType}
            onComplete={registerAccount}
            onBack={() => setScreen('profile')}
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
  const isError = /no se pudo|falta|error|revisa/i.test(notice)

  return (
    <aside className={`action-toast ${isError ? 'is-error' : 'is-success'}`} role="status" aria-live="polite">
      <div>
        <Check size={17} />
      </div>
      <p>{notice}</p>
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
    address: local?.address || 'Direccion a completar',
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
    ordersEnabled: local?.plan === 'pedidos',
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
  const [publishStatus, setPublishStatus] = useState('')
  const publishMissing = [
    !String(offerDraft.title || '').trim() && 'titulo',
    offerDraft.hasPrice && !String(offerDraft.price || '').trim() && 'precio o desactivar precio',
    !String(offerDraft.description || '').trim() && 'descripcion corta',
    !local?.whatsapp && 'WhatsApp del local',
  ].filter(Boolean)
  const canSendOffer = canPublish && publishMissing.length === 0
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
        <p>{canPublish ? (freePostUsed ? 'Ya usaste la promo gratis de esta semana. Podes dejarla preparada y coordinar el extra manualmente.' : 'Tenes 1 publicacion semanal gratis. Si queres publicar mas en la misma semana, ahi recien se cobra un extra.') : 'No se pide tarjeta ni pago para empezar. La ficha del local queda gratis y visible para vecinos.'}</p>
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
          <p>{freePostUsed ? 'Podes prepararla y coordinar el extra manualmente.' : 'La promo queda visible 3 o 4 dias y despues se baja sola.'}</p>
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

      {local?.plan === 'pedidos' && (
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
        disabled={canPublish && !canSendOffer}
        onClick={canPublish
          ? publishPreparedOffer
          : onMerchantPanel}
      >
        {canPublish ? (canSendOffer ? (freePostUsed ? 'Preparar promo extra' : 'Publicar gratis') : `Completar ${publishMissing[0]}`) : 'Completar local primero'}
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
    const missing = [
      !localDraft.name.trim() && 'nombre del local',
      !localDraft.whatsapp.trim() && 'WhatsApp',
      !localDraft.address.trim() && 'direccion o referencia',
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
    localDraft.category,
    localDraft.section,
    localDraft.address,
    localDraft.openDays.length,
    localDraft.openTime,
    localDraft.closeTime,
    localDraft.whatsapp,
    isUploadedImage(localDraft.image),
    ensureMenuSlots(localDraft.menu).some((item) => item.name && item.name !== 'Producto principal'),
  ].filter(Boolean).length
  const completion = Math.round((completedFields / 10) * 100)
  const scheduleLabel = formatSchedule(localDraft)
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
      done: Boolean(localDraft.address && localDraft.openDays.length && localDraft.openTime && localDraft.closeTime),
      title: 'Direccion y horario',
      meta: localDraft.address ? scheduleLabel : 'Direccion, dias y horas',
    },
    {
      id: 'menu',
      done: localDraft.plan === 'pedidos' || ensureMenuSlots(localDraft.menu).some((item) => item.name && item.name !== 'Producto principal'),
      title: 'Mini carta',
      meta: localDraft.plan === 'pedidos' ? 'Pedidos activados' : 'Opcional para vender mas',
    },
    {
      id: 'plan',
      done: Boolean(localDraft.plan),
      title: 'Plan',
      meta: localDraft.plan === 'pedidos' ? 'Plan pedidos elegido' : 'Ficha gratis',
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
  const planLabel = localDraft.plan === 'pedidos' ? 'Mini menu + pedidos' : 'Ficha gratis'
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
        <button type="button" onClick={() => setOpenPanel('menu')}>
          <ShoppingBasket size={18} />
          <span>Mini carta</span>
        </button>
      </section>

      <section className="dashboard-status-card">
        <div>
          <span>Estado actual</span>
          <strong>{planLabel}</strong>
          <p>{localIsPublic ? 'Tu ficha queda gratis. Pagas solo si queres mas publicaciones o pedidos armados por WhatsApp.' : 'Todavia no esta publicada. Guardala cuando completes los datos basicos.'}</p>
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
              <div className="local-builder-fields">
                <label>
                  <span>Nombre del local</span>
                  <input value={localDraft.name} onChange={(event) => updateLocalDraft('name', event.target.value)} placeholder="Ej: Lo de Meli" />
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

          {panelButton('location', 'Paso 3', 'Direccion, dias y horario', localDraft.address && localDraft.openDays.length ? 'Completo' : 'Pendiente', MapPin)}
          {openPanel === 'location' && (
            <div className="merchant-panel-body">
              <section className="local-map-editor">
                <div className="local-map-preview">
                  <MapPin size={24} />
                  <strong>{localDraft.section}</strong>
                  <span>{localDraft.address || 'Direccion pendiente'}</span>
                  <small>{scheduleLabel}</small>
                  <i></i>
                </div>
                <div className="local-map-copy">
                  <span>Ubicacion publica</span>
                  <h3>Que el vecino sepa donde queda antes de escribir.</h3>
                  <p>Carga direccion exacta o referencia. Despues se puede abrir directo en Google Maps.</p>
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
                <label>
                  <span>Direccion</span>
                  <input value={localDraft.address} onChange={(event) => updateLocalDraft('address', event.target.value)} placeholder="Mza, calle o referencia" />
                </label>
                <label className="wide">
                  <span>Referencia para llegar</span>
                  <input value={localDraft.reference} onChange={(event) => updateLocalDraft('reference', event.target.value)} placeholder="Ej: frente a la plaza, porton negro..." />
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

          {panelButton('menu', 'Paso 4', 'Mini carta', `${filledMenuItems.length}/5 productos`, ShoppingBasket)}
          {openPanel === 'menu' && (
            <div className="merchant-panel-body">
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
            </div>
          )}

          {panelButton('plan', 'Paso 5', 'Gratis o con pedidos', localDraft.plan === 'pedidos' ? 'Pedidos' : 'Gratis', ShoppingBasket)}
          {openPanel === 'plan' && (
            <div className="merchant-panel-body">
              <section className="local-plan-selector" aria-label="Plan del comercio">
                <button
                  className={localDraft.plan === 'gratis' ? 'active' : ''}
                  type="button"
                  onClick={() => updateLocalDraft('plan', 'gratis')}
                >
                  <span>Gratis</span>
                  <strong>Ficha + 1 promo semanal</strong>
                  <small>Nombre, foto, direccion, WhatsApp, horario y rubro visible.</small>
                  <b>$0</b>
                </button>
                <button
                  className={localDraft.plan === 'pedidos' ? 'active paid' : 'paid'}
                  type="button"
                  onClick={() => updateLocalDraft('plan', 'pedidos')}
                >
                  <span>Pago opcional</span>
                  <strong>Mini menu + pedidos</strong>
                  <small>Productos, precios opcionales, retiro/delivery y pedido armado.</small>
                  <b>$8.000 fundador</b>
                </button>
              </section>

              <section className={`paid-feature-preview ${localDraft.plan === 'pedidos' ? 'is-active' : ''}`}>
                <div>
                  <span>{localDraft.plan === 'pedidos' ? 'Activo en plan pago' : 'Disponible si activa plan'}</span>
                  <h3>Productos y pedido por WhatsApp</h3>
                  <p>{localDraft.plan === 'pedidos' ? 'El vecino puede elegir productos y mandar el pedido armado.' : 'En el plan gratis la ficha aparece igual, pero sin mini menu de pedidos.'}</p>
                </div>
                <ul>
                  <li><Check size={14} /> 5 productos iniciales</li>
                  <li><Check size={14} /> Precio opcional</li>
                  <li><Check size={14} /> Delivery u opcion retiro</li>
                </ul>
              </section>

              <section className="local-visibility-comparison" aria-label="Diferencia entre ficha gratis y plan pago">
                <article className={localDraft.plan === 'gratis' ? 'active' : ''}>
                  <span>Cuenta gratis</span>
                  <strong>Ficha publica del local</strong>
                  <p>Aparece en la guia con foto, direccion, WhatsApp, horarios, rubro y una promo semanal que vence sola.</p>
                  <b>Siempre $0</b>
                </article>
                <article className={localDraft.plan === 'pedidos' ? 'active paid' : 'paid'}>
                  <span>Cuenta paga</span>
                  <strong>Mini menu con pedido armado</strong>
                  <p>El vecino suma productos, elige retiro o delivery y manda el pedido listo por WhatsApp.</p>
                  <b>$8.000 fundador</b>
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
                  <strong>{localDraft.plan === 'pedidos' ? 'Pedidos activos' : 'Ficha gratis'}</strong>
                </div>
                <div className="public-local-card">
                  <div {...imageSurfaceProps(localDraft.image, 'public-local-image', localDraft)}></div>
                  <div>
                    <small>{localDraft.category} - {localDraft.section}</small>
                    <h3>{localDraft.name || 'Nombre del local'}</h3>
                    <p>{localDraft.description || 'Descripcion breve del local.'}</p>
                    <div className="public-local-tags">
                      <span><MapPin size={12} /> {localDraft.address || 'Direccion pendiente'}</span>
                      <span><Navigation size={12} /> {localDraft.reference || 'Referencia pendiente'}</span>
                      <span><Clock3 size={12} /> {scheduleLabel}</span>
                      <span><MessageCircle size={12} /> {localDraft.whatsapp || 'WhatsApp pendiente'}</span>
                    </div>
                    <div className="public-local-pay">
                      <b>{localDraft.paymentMethods || 'Medios de pago a definir'}</b>
                      {localDraft.instagram && <b>{localDraft.instagram}</b>}
                    </div>
                    <ul className="public-menu-list">
                      {ensureMenuSlots(localDraft.menu).slice(0, 5).filter((item) => item.available !== false).map((item, index) => (
                        <li key={`${item.name || 'producto'}-${index}`}>
                          <span>{item.name || 'Producto'}</span>
                          {item.price && <b>{item.price}</b>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {localDraft.plan === 'pedidos' && (
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
              address: local.address || 'Direccion a completar',
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
  onBack,
  onOpenBusiness,
  onOpenOffer,
  onTogglePublic,
  onToggleVerified,
  onActivateOrders,
  onSaveNote,
  onPauseOffer,
  onDeleteOffer,
  onToggleTheme,
}) {
  const [notesDraft, setNotesDraft] = useState({})
  const needsReview = businesses.filter((business) => (
    !business.whatsapp ||
    !business.address ||
    business.address.includes('completar') ||
    !business.verified ||
    business.isPublic === false
  ))
  const paidPlanBusinesses = businesses.filter((business) => business.plan === 'pedidos')
  const hiddenBusinesses = businesses.filter((business) => business.isPublic === false)
  const pendingOrders = businesses.filter((business) => business.plan === 'pedidos' && business.planStatus !== 'active')
  const visibleBusinesses = businesses.filter((business) => business.isPublic !== false)
  const readyBusinesses = businesses.filter((business) => (
    business.whatsapp &&
    business.address &&
    !business.address.includes('completar') &&
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

  const getBusinessQuality = (business) => {
    const issues = []
    if (!business.whatsapp) issues.push('WhatsApp')
    if (!business.address || business.address.includes('completar')) issues.push('direccion')
    if (!business.openDays?.length) issues.push('dias')
    if (!business.hours || business.hours.includes('completar')) issues.push('horario')
    if (!business.menu?.filter((item) => item.name).length) issues.push('mini carta')
    if (!business.verified) issues.push('verificar')
    if (business.isPublic === false) issues.push('oculto')
    return issues
  }

  const getStatusLabel = (business) => {
    if (business.isPublic === false) return 'Oculto'
    if (getBusinessQuality(business).length) return 'Revisar'
    if (business.plan === 'pedidos') return 'Pedidos'
    return 'Publicado'
  }

  const saveNote = (business) => {
    const id = business.id || business.name
    onSaveNote(business, notesDraft[id] || '')
  }

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
        <h1>Panel simple para operar el barrio.</h1>
        <p>Primero revisa locales incompletos. Despues verifica, publica u oculta. Los pedidos se activan solo cuando ya hablaste con el comercio.</p>
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
          <strong>{paidPlanBusinesses.length}</strong>
          <span>pedidos</span>
        </article>
        <article className={hiddenBusinesses.length ? 'needs' : ''}>
          <strong>{hiddenBusinesses.length}</strong>
          <span>ocultos</span>
        </article>
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
          <p>Activa pedidos solo despues de coordinar transferencia o efectivo. Sin pasarela por ahora.</p>
        </article>
      </section>

      <section className="admin-guidance">
        <div>
          <BadgeCheck size={18} />
          <strong>Regla de calidad</strong>
        </div>
        <p>Antes de compartir fuerte el link, apunta a pocos comercios bien cargados: foto real, WhatsApp, direccion, horario y mini carta clara.</p>
      </section>

      <section className="admin-list">
        <div className="feed-head compact">
          <div>
            <Store size={17} />
            <strong>Locales para operar</strong>
          </div>
          <span>{needsReview.length ? `${needsReview.length} incompletos` : 'Todo bien'}</span>
        </div>
        {priorityBusinesses.slice(0, 16).map((business) => {
          const issues = getBusinessQuality(business)
          const id = business.id || business.name
          return (
          <article className={`admin-row ${business.isPublic === false ? 'is-hidden' : ''}`} key={id}>
            <div className="admin-row-main">
              <span className={`admin-dot ${issues.length ? 'warn' : 'ok'}`}></span>
              <div>
                <strong>{business.name}</strong>
                <small>{business.category} - {business.section}</small>
                <small>{business.address || 'Sin direccion'} - {business.whatsapp || 'Sin WhatsApp'}</small>
              </div>
              <em>{getStatusLabel(business)}</em>
            </div>
            {issues.length > 0 && (
              <div className="admin-issues">
                {issues.map((issue) => <span key={issue}>Falta {issue}</span>)}
              </div>
            )}
            <div className="admin-plan-line">
              <span>{business.plan === 'pedidos' ? 'Mini menu con pedidos' : 'Ficha gratis'}</span>
              <span>{business.planStatus === 'active' ? 'Activo' : business.planStatus === 'manual_pending' ? 'Pendiente de cobro' : 'Sin cobro'}</span>
              <span>{business.open ? 'Abierto segun ficha' : 'Marcado cerrado'}</span>
            </div>
            <div className="admin-row-actions">
              <button type="button" onClick={() => onOpenBusiness(business)}>Ver</button>
              <button type="button" onClick={() => onToggleVerified(business)}>{business.verified ? 'Quitar check' : 'Verificar'}</button>
              <button type="button" onClick={() => onTogglePublic(business)}>{business.isPublic === false ? 'Mostrar' : 'Ocultar'}</button>
              <button type="button" onClick={() => onActivateOrders(business)}>{business.plan === 'pedidos' ? 'Quitar pedidos' : 'Pedidos'}</button>
            </div>
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

      <section className="admin-list">
        <div className="feed-head compact">
          <div>
            <Flame size={17} />
            <strong>Promos activas</strong>
          </div>
          <span>vencen solas</span>
        </div>
        {offers.slice(0, 12).map((offer) => (
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

      <section className="admin-next">
        <span>Checklist antes de compartir</span>
        <h2>Que el primer vecino no se pierda.</h2>
        <p>Necesitas al menos 5 locales reales, 3 promos actuales, fotos reconocibles, horarios claros y WhatsApp funcionando. Si eso esta, ya se puede ofrecer.</p>
      </section>
    </div>
  )
}

function LoginScreen({ authNotice, onBack, onLogin, onQuickAccess, allowQuickAccess, onRegister, onToggleTheme }) {
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
        <button type="button" onClick={() => onLogin(credentials)}>Iniciar sesion</button>
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

      <section className="merchant-entry-card">
        <span>{local ? 'Local publicado' : 'Para comercios'}</span>
        <h2>{local ? local.name : 'Carga tu local y apareces en la guia.'}</h2>
        <p>{local ? `${local.category} en ${local.section}. ${local.address || 'Direccion pendiente.'}` : 'Ficha basica gratis: foto, direccion, horarios, WhatsApp y una promo semanal. Los extras son opcionales.'}</p>
        <div>
          {!isLogged && <button type="button" onClick={() => onRegister('merchant')}>Crear cuenta comercio</button>}
          {isMerchant && <button type="button" onClick={onMerchantPanel}>{local ? 'Editar local' : 'Cargar local'}</button>}
          {!isLogged && <button type="button" onClick={onLogin}>Ya tengo cuenta</button>}
        </div>
      </section>

      <section className="simple-rules-card" id="planes-comercio">
        <span>Regla simple</span>
        <h2>Vecinos gratis. Comercios aparecen gratis.</h2>
        <p>Solo se cobra si el comercio quiere publicar promos extra o activar pedidos con mini carta. Sin comision por venta.</p>
      </section>

      <ContactFooter />
    </div>
  )
}

function RegisterScreen({ initialType = 'neighbor', onComplete, onBack, onToggleTheme }) {
  const [accountType, setAccountType] = useState(initialType)
  const [submitted, setSubmitted] = useState(false)
  const [pendingEmail, setPendingEmail] = useState(false)
  const [form, setForm] = useState({
    name: '',
    whatsapp: '',
    email: '',
    password: '',
    section: '',
    businessName: '',
    category: '',
    salesMode: '',
    interests: '',
  })
  const isMerchant = accountType === 'merchant'
  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }
  const submitRegister = async () => {
    const created = await onComplete({
      ...form,
      type: accountType,
      name: form.name || (isMerchant ? 'Comerciante' : 'Vecino'),
      section: form.section || 'Liceo Procrear',
      businessName: form.businessName || '',
      category: form.category || 'Comida',
    })
    if (created === 'pending-confirmation') {
      setPendingEmail(true)
      return
    }
    if (created !== false) {
      setSubmitted(true)
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
          <span>Cuenta creada</span>
          <h1>Te mandamos un mail para verificar la cuenta.</h1>
          <p>
            Entra a <strong>{form.email || 'tu email'}</strong>, abri el correo de confirmacion y toca el enlace.
            Despues volve a Cerca Liceo e inicia sesion con tu email y clave.
          </p>
          <p className="mail-trust-note">
            Buscalo como <strong>Cerca Liceo</strong>. Si estamos en modo prueba puede figurar como Supabase Auth, pero el enlace es el correcto.
          </p>
          <div className="email-confirm-steps">
            <article>
              <b>1</b>
              <span>Abrir mail</span>
            </article>
            <article>
              <b>2</b>
              <span>Tocar confirmar</span>
            </article>
            <article>
              <b>3</b>
              <span>Iniciar sesion</span>
            </article>
          </div>
          <button type="button" onClick={onBack}>Ya confirme, iniciar sesion</button>
          <small>Si no aparece, revisa spam o correo no deseado.</small>
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
            ? 'Primero registras datos basicos. Despues completas la ficha del local y ya podes aparecer gratis en la guia.'
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
          <span>Nombre</span>
          <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder={isMerchant ? 'Nombre del responsable' : 'Tu nombre'} />
        </label>
        <label>
          <span>WhatsApp</span>
          <input value={form.whatsapp} onChange={(event) => updateForm('whatsapp', event.target.value)} placeholder="351 000 0000" />
        </label>
        <label>
          <span>Email</span>
          <input value={form.email} onChange={(event) => updateForm('email', event.target.value)} placeholder="nombre@email.com" />
        </label>
        <label>
          <span>Clave</span>
          <input value={form.password} onChange={(event) => updateForm('password', event.target.value)} placeholder="Minimo 6 caracteres" type="password" />
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
              <input value={form.businessName} onChange={(event) => updateForm('businessName', event.target.value)} placeholder="Ej: Lo de Meli" />
            </label>
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

      <section className="register-next">
        <span>{isMerchant ? 'Que pasa despues' : 'Privacidad clara'}</span>
        <h2>{isMerchant ? 'Primero entrar, despues vender.' : 'Podes entrar sin cuenta.'}</h2>
        <p>
          {isMerchant
            ? 'Desde el panel cargas la ficha gratis del local. Solo pagas si queres mas publicaciones o activar mini menu con pedidos por WhatsApp.'
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

      <button className="primary-action" type="button" onClick={submitRegister}>
        {isMerchant ? 'Crear cuenta de comercio' : 'Crear cuenta gratis'}
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
        `${business.name} ${business.category} ${business.address} ${business.menu.map((item) => item.name).join(' ')}`.toLowerCase().includes(normalizedQuery)

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
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${business.address || business.section}, Cordoba, Argentina`)}`
  const whatsappUrl = makeWhatsAppUrl(
    business.whatsapp,
    `Hola ${business.name}, te encontre en Cerca Liceo. Queria consultar por productos y horarios.`,
  )

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
          <MapPin size={13} />
          {business.address}
        </p>
        {large && (
          <div className="business-extra-line">
            <span>{business.delivery}</span>
            <span>{business.orderHours}</span>
            <span>{business.followers} seguidores</span>
          </div>
        )}
        <ul>
          {business.menu.filter((item) => item.available !== false).slice(0, large ? 5 : 2).map((item, index) => (
            <li key={`${item.name}-${index}`}>
              <span>{item.name}</span>
              {item.price && <b>{item.price}</b>}
            </li>
          ))}
        </ul>
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
            <a href={mapUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
              Como llegar
            </a>
          </div>
        )}
      </div>
    </article>
  )
}

function BusinessDetailScreen({ business, onBack, onToggleTheme }) {
  const mapQuery = `${business.address || business.section}, Cordoba, Argentina`
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
  const openStatus = getOpenStatus(business)
  const [cart, setCart] = useState({})
  const [orderMode, setOrderMode] = useState('Retiro')
  const [note, setNote] = useState('')
  const orderModes = business.hasDelivery ? ['Retiro', 'Envio', 'Consultar'] : ['Retiro', 'Consultar']
  const priceToNumber = (price) => Number(String(price || '').replace(/[^\d]/g, ''))
  const availableMenu = business.menu.filter((item) => item.available !== false)
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
      .join('\n')}\n\nTotal: ${formattedTotal}\nEntrega: ${orderMode}\nNota: ${note || 'Sin nota'}\nDireccion del local: ${business.address}`,
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
            <strong>Pedido armado por WhatsApp</strong>
          </article>
          <article className={business.hasDelivery ? 'good' : 'muted'}>
            <Navigation size={15} />
            <span>{business.hasDelivery ? 'Delivery' : 'Retiro'}</span>
            <strong>{business.deliveryZone}</strong>
          </article>
        </section>
        <div className="detail-grid">
          <InfoItem icon={<MapPin size={18} />} label="Direccion" value={business.address} />
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
        <a className={`detail-whatsapp ${cartItems.length ? '' : 'is-disabled'}`} href={cartItems.length ? whatsappUrl : undefined} target="_blank" rel="noreferrer" aria-disabled={!cartItems.length}>
          <MessageCircle size={19} />
          {cartItems.length ? 'Consultar por WhatsApp' : 'Elegir productos primero'}
        </a>
      </section>
      {cartItems.length > 0 && (
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
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${offer.address}, Cordoba, Argentina`)}`
  const whatsappUrl = getOfferWhatsappUrl(offer)

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
            <div className={`open-badge ${offer.open ? 'is-open' : 'is-closed'}`}>
              <i></i>
              {offer.open ? 'Abierto ahora' : 'Cerrado ahora'}
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
          <InfoItem icon={<MapPin size={18} />} label="Ubicacion" value={offer.address} />
          <InfoItem icon={<Store size={18} />} label="Referencia" value={offer.reference} />
          <InfoItem icon={<Clock3 size={18} />} label="Horario" value={offer.hours} />
          <InfoItem icon={<Bell size={18} />} label="Vigencia" value={`Vence en ${offer.expires}`} />
        </div>

        <a className="map-preview map-link" href={mapUrl} target="_blank" rel="noreferrer">
          <span></span>
          <b><Navigation size={14} /> Como llegar</b>
        </a>

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
          <div className={`open-badge mini ${offer.open ? 'is-open' : 'is-closed'}`}>
            <i></i>
            {offer.open ? 'Abierto' : 'Cerrado'}
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
