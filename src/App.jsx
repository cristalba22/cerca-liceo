import { useEffect, useMemo, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import {
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Heart,
  Home,
  MapPin,
  Moon,
  Navigation,
  Search,
  Sparkles,
  Store,
  UserRound,
} from 'lucide-react'
import './App.css'
import {
  sections, commerceCategories, getOfferTone, liceoMapUrl, liceoMapBounds,
} from './lib/appConfig.js'
import {
  normalizeSearchText, getMapPointFromCoordinates, hasBusinessPin, getBusinessMapUrl,
  isFounderPlanActive, getFounderPaidUntil, isOfferPaused, isOfferActiveNow,
  getOpenStatus, mergeUniqueById, buildInitialBusinessDraftFromAccount, toNoticeText,
  isUploadedImage,
} from './lib/businessRules'
import { imageSurfaceProps } from './lib/media'
import { ContactFooter } from './components/AppChrome'

import { cercaApi } from './lib/cercaApi'
import { defaultBusinesses, defaultOffers } from './lib/fallbackData'
import { AdminScreen } from './screens/AdminScreen'
import { LoginScreen, ForgotPasswordScreen, ResetPasswordScreen, ProfileScreen, PrivacyScreen, RegisterScreen } from './screens/AuthScreens'
import { PublishScreen } from './screens/merchant/PublishScreen'
import { MerchantFirstLocalScreen } from './screens/merchant/MerchantFirstLocalScreen'
import { MyPostsScreen } from './screens/merchant/MyPostsScreen'
import { DirectoryScreen, BusinessCard, BusinessDetailScreen, WelcomeScreen, DetailScreen, OfferCard } from './screens/PublicScreens'
import { WelcomeHeroArt } from './components/welcome/WelcomeHeroArt'

const isAndroidCompatMode = () => document.documentElement.classList.contains('android-compat')

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
function App() {
  const [screen, setScreen] = useState('home')
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todas')
  const [selectedSection, setSelectedSection] = useState('Todos')
  const [showOpenNowOnly, setShowOpenNowOnly] = useState(false)
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

  const createInitialMerchantBusiness = async (merchantAccount, { showNotice = true } = {}) => {
    if (merchantAccount?.type !== 'merchant') return null
    const draft = buildInitialBusinessDraftFromAccount(merchantAccount)
    if (!draft.name || !draft.whatsapp) return null

    const { business, error, warning } = await cercaApi.saveBusiness(draft)
    if (error || !business) {
      if (showNotice) {
        setAuthNotice(error?.message || 'No pudimos crear la ficha inicial. Podes completarla desde Panel comercio.')
      }
      return null
    }

    setMerchantLocal(business)
    setFeedBusinesses((current) => {
      const without = current.filter((item) => item.id !== business.id)
      return business.isPublic === false ? without : [business, ...without]
    })
    await loadMerchantOffers()
    await loadMerchantMetrics(business.id)
    if (showNotice) {
      setAuthNotice(warning || 'Ficha basica creada. Ya apareces en la guia; podes sumar foto, horarios y promos.')
    }
    return business
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
          } else if (!ignore) {
            const createdBusiness = await createInitialMerchantBusiness(account, { showNotice: false })
            if (createdBusiness) {
              setAuthNotice('Listo. Con los datos del registro dejamos tu ficha basica creada. Ahora podes sumar foto u horarios.')
              setScreen((current) => (
                current === 'home' || current === 'profile' || current === 'login'
                  ? 'my-posts'
                  : current
              ))
            } else {
              setMerchantLocal(null)
              setScreen((current) => (
                current === 'home' || current === 'profile' || current === 'login'
                  ? 'merchant-start'
                  : current
              ))
            }
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
        const createdBusiness = await createInitialMerchantBusiness(account, { showNotice: false })
        if (createdBusiness) {
          setAuthNotice('Sesion iniciada. Tu ficha basica ya quedo creada con los datos del registro.')
          setScreen('my-posts')
          return
        }
        setMerchantLocal(null)
      }
      setAuthNotice(businessError
        ? 'Sesion iniciada. No pudimos cargar tu local, pero podes completarlo desde Panel comercio.'
        : business
          ? 'Sesion iniciada. Tu local ya esta cargado.'
          : 'Sesion iniciada. Ahora podes cargar tu local gratis.')
      setScreen(business ? 'profile' : 'merchant-start')
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
    if (account.type === 'merchant') {
      const createdBusiness = await createInitialMerchantBusiness(savedAccount, { showNotice: false })
      setAuthNotice(
        warning ||
        message ||
        (createdBusiness
          ? 'Cuenta comercio creada. Ya dejamos tu ficha basica cargada. Ahora podes sumar foto, horarios o publicar una promo.'
          : 'Cuenta comercio creada. Entra al panel para completar la ficha gratis.')
      )
      setScreen(createdBusiness ? 'my-posts' : 'merchant-start')
      return true
    }
    setAuthNotice(warning || message || 'Cuenta vecino creada.')
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
    const createdBusiness = await createInitialMerchantBusiness(merchantAccount, { showNotice: false })
    setAuthNotice(createdBusiness
      ? 'Listo. Tu cuenta ahora es comercio y ya tiene una ficha basica creada.'
      : 'Listo. Tu cuenta ahora puede publicar como comercio. Completa tu ficha desde Panel comercio.')
    setScreen(createdBusiness ? 'my-posts' : 'merchant-start')
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
    if (account?.type === 'merchant' && !merchantLocal) {
      setAuthNotice('Primero carga tu ficha gratis. Despues podes publicar promos.')
      setScreen('merchant-start')
      return
    }
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
    return feedOffers.map((offer, index) => {
      const matchedBusiness = feedBusinesses.find((business) => (
        business.id === offer.businessId ||
        business.name === offer.business
      ))

      return matchedBusiness
        ? {
            ...offer,
            business: offer.business || matchedBusiness.name,
            address: offer.address || matchedBusiness.address,
            reference: offer.reference || matchedBusiness.reference,
            hours: offer.hours || matchedBusiness.hours,
            openDays: offer.openDays?.length ? offer.openDays : matchedBusiness.openDays,
            openTime: offer.openTime || matchedBusiness.openTime,
            closeTime: offer.closeTime || matchedBusiness.closeTime,
            open: matchedBusiness.open,
            whatsapp: offer.whatsapp || matchedBusiness.whatsapp,
            tone: offer.tone || getOfferTone(offer.category || matchedBusiness.category, index),
          }
        : { ...offer, tone: offer.tone || getOfferTone(offer.category, index) }
    }).filter((offer) => {
      if (!isOfferActiveNow(offer)) return false
      const key = `${offer.businessId || offer.business}-${offer.title}-${offer.price}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [feedBusinesses, feedOffers])

  const openNowOffers = useMemo(() => (
    publicFeedOffers.filter((offer) => getOfferOpenStatus(offer).open)
  ), [publicFeedOffers])
  const openNowBusinesses = useMemo(() => (
    feedBusinesses.filter((business) => business.isPublic !== false && getOpenStatus(business).open)
  ), [feedBusinesses])
  const visibleFeedOffers = showOpenNowOnly ? openNowOffers : publicFeedOffers
  const todayHighlights = visibleFeedOffers.slice(0, 3)
  const todayLeadOffer = todayHighlights[0]
  const todayPromoLabel = `${visibleFeedOffers.length} ${visibleFeedOffers.length === 1 ? 'promo vigente' : 'promos vigentes'}`

  const filteredOffers = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query)
    return visibleFeedOffers.filter((offer) => {
      const byCategory = selectedCategory === 'Todas' || offer.category === selectedCategory
      const bySection = selectedSection === 'Todos' || offer.section === selectedSection
      const matchedBusiness = feedBusinesses.find((business) => business.id === offer.businessId || business.name === offer.business)
      const searchable = normalizeSearchText([
        offer.title,
        offer.business,
        offer.category,
        offer.highlight,
        offer.description,
        offer.section,
        offer.price,
        matchedBusiness?.name,
        matchedBusiness?.category,
        matchedBusiness?.address,
        matchedBusiness?.reference,
        ...(matchedBusiness?.menu || []).map((item) => `${item.name || ''} ${item.price || ''}`),
      ].filter(Boolean).join(' '))
      const byQuery =
        normalizedQuery.length === 0 ||
        searchable.includes(normalizedQuery)

      return byCategory && bySection && byQuery
    })
  }, [feedBusinesses, query, selectedCategory, selectedSection, visibleFeedOffers])
  const homeListOffers = useMemo(() => {
    if (query.trim()) return filteredOffers
    if (!todayLeadOffer) return []
    const leadKey = todayLeadOffer.id || `${todayLeadOffer.business}-${todayLeadOffer.title}-${todayLeadOffer.price}`
    return visibleFeedOffers.filter((offer) => {
      if (selectedSection !== 'Todos' && offer.section !== selectedSection) return false
      const key = offer.id || `${offer.business}-${offer.title}-${offer.price}`
      return key !== leadKey
    })
  }, [filteredOffers, query, selectedSection, todayLeadOffer, visibleFeedOffers])

  const instantHomeResults = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query)
    if (normalizedQuery.length < 2) return { offers: [], businesses: [], categories: [] }
    const offerResults = publicFeedOffers.filter((offer) => normalizeSearchText([
      offer.title,
      offer.business,
      offer.category,
      offer.highlight,
      offer.description,
      offer.section,
      offer.price,
    ].filter(Boolean).join(' ')).includes(normalizedQuery)).slice(0, 3)
    const businessResults = feedBusinesses.filter((business) => normalizeSearchText([
      business.name,
      business.category,
      business.section,
      business.address,
      business.reference,
      business.description,
      ...(business.menu || []).map((item) => `${item.name || ''} ${item.price || ''}`),
    ].filter(Boolean).join(' ')).includes(normalizedQuery)).slice(0, 3)
    const categoryResults = commerceCategories
      .filter((category) => normalizeSearchText(category.name).includes(normalizedQuery))
      .slice(0, 4)
    return { offers: offerResults, businesses: businessResults, categories: categoryResults }
  }, [feedBusinesses, publicFeedOffers, query])

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
            onHome={() => setScreen('home')}
            onMerchantPanel={() => setScreen('my-posts')}
            onPublishOffer={publishOffer}
            onToggleTheme={() => setDarkMode((value) => !value)}
          />
        )}

        {screen === 'merchant-start' && (
          <MerchantFirstLocalScreen
            account={account}
            onSaveLocal={saveMerchantLocal}
            onBack={() => setScreen('profile')}
            onHome={() => setScreen('home')}
            onDone={() => setScreen('my-posts')}
            onPublish={() => openPublish()}
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
            onHome={() => setScreen('home')}
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
                : { plan: 'pedidos', planStatus: 'active', paidUntil: getFounderPaidUntil() },
              isFounderPlanActive(business) ? 'Impulso Liceo desactivado.' : 'Impulso Liceo activado gratis por 2 meses.',
            )}
            onRenewFounder={(business) => updateAdminBusiness(
              business,
              { plan: 'pedidos', planStatus: 'active', paidUntil: getFounderPaidUntil() },
              'Impulso Liceo renovado gratis por 2 meses.',
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
            onMerchantPanel={() => setScreen(merchantLocal ? 'my-posts' : 'merchant-start')}
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
            <header className="app-header" data-motion-reveal style={{ '--motion-order': 0 }}>
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
                <button className="notify-button" type="button" onClick={() => setScreen('profile')} aria-label="Mi cuenta">
                  <UserRound size={20} />
                </button>
              </div>
            </header>

            <div className={`search-panel is-motion-visible ${query.trim().length >= 2 ? 'is-searching' : ''}`} data-motion-reveal style={{ '--motion-order': 1 }}>
              <WelcomeHeroArt variant="home-radar" />
              <div className="search-intro">
                <strong>Busca ofertas, locales o rubros.</strong>
                <span>Ej: milanesa, despensa, peluqueria, Mr Food.</span>
              </div>
              <div className="search-row">
                <Search size={20} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar oferta, local o rubro"
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
              {query.trim().length < 2 && (
                <div className="home-search-chips" aria-label="Busquedas rapidas">
                  <button type="button" onClick={() => {
                    setSelectedCategory('Todas')
                    setQuery('comida')
                  }}>
                    Comida
                  </button>
                  <button type="button" onClick={() => {
                    setSelectedCategory('Todas')
                    setQuery('despensa')
                  }}>
                    Despensa
                  </button>
                  <button type="button" onClick={() => {
                    setSelectedCategory('Todas')
                    setQuery('servicios')
                  }}>
                    Servicios
                  </button>
                  <button type="button" onClick={() => setScreen('directory')}>
                    Ver mapa
                  </button>
                </div>
              )}
              {query.trim().length >= 2 && (
                <section className="home-live-search" aria-label="Resultados rapidos">
                  <div>
                    <span>Resultados cerca</span>
                    <button type="button" onClick={() => setQuery('')}>Limpiar</button>
                  </div>
                  {[...instantHomeResults.offers.map((offer) => ({
                    id: offer.id || `${offer.business}-${offer.title}`,
                    type: 'Oferta',
                    title: offer.title,
                    meta: `${offer.business} · ${offer.category}`,
                    action: () => {
                      setSelectedOffer(offer)
                      setScreen('detail')
                    },
                  })), ...instantHomeResults.businesses.map((business) => ({
                    id: business.id || business.name,
                    type: 'Local',
                    title: business.name,
                    meta: `${business.category} · ${business.section}`,
                    action: () => {
                      setSelectedBusiness(business)
                      setScreen('business-detail')
                    },
                  })), ...instantHomeResults.categories.map((category) => ({
                    id: category.name,
                    type: 'Rubro',
                    title: category.name,
                    meta: 'Ver ofertas y locales',
                    action: () => {
                      setSelectedCategory('Todas')
                      setQuery(category.name)
                    },
                  }))].slice(0, 5).map((result, index) => (
                    <button type="button" key={`${result.type}-${result.id}`} onClick={result.action} style={{ '--result-order': index }}>
                      <small>{result.type}</small>
                      <strong>{result.title}</strong>
                      <span>{result.meta}</span>
                    </button>
                  ))}
                  {!instantHomeResults.offers.length && !instantHomeResults.businesses.length && !instantHomeResults.categories.length && (
                    <button type="button" onClick={() => setScreen('directory')}>
                      <small>Sin promo</small>
                      <strong>Buscar en la guia</strong>
                      <span>Puede estar como local fijo</span>
                    </button>
                  )}
                </section>
              )}
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
              onMerchantPanel={() => setScreen(merchantLocal ? 'my-posts' : 'merchant-start')}
              onPublish={() => openPublish()}
            />

            <section className="today-panel today-panel-featured" aria-label="Que hay hoy en Liceo" data-motion-reveal style={{ '--motion-order': 3 }}>
              <div className="today-panel-head">
                <div>
                  <span>Que hay ahora</span>
                  <strong>{showOpenNowOnly ? 'Locales abiertos' : 'Promos cerca tuyo'}</strong>
                  <small>{openNowBusinesses.length} abiertos ahora · {todayPromoLabel}</small>
                </div>
                <button
                  className={showOpenNowOnly ? 'active' : ''}
                  type="button"
                  onClick={() => setShowOpenNowOnly((value) => !value)}
                >
                  <Clock3 size={16} />
                  {showOpenNowOnly ? 'Ver todos' : 'Abierto ahora'}
                </button>
              </div>

              {todayHighlights.length > 0 ? (
                <>
                  <button
                    className={`today-lead-offer offer-${todayLeadOffer.tone || getOfferTone(todayLeadOffer.category, 0)}`}
                    type="button"
                    onClick={() => {
                      trackInteraction({ type: 'offer_view', businessId: todayLeadOffer.businessId, offerId: todayLeadOffer.id })
                      setSelectedOffer(todayLeadOffer)
                      setScreen('detail')
                    }}
                  >
                    <div className="today-lead-copy">
                      <div className="today-lead-badge">
                        <Flame size={16} />
                        <span>{getOfferOpenStatus(todayLeadOffer).label}</span>
                      </div>
                      <strong>{todayLeadOffer.title}</strong>
                      <small>{todayLeadOffer.business} · {todayLeadOffer.section}</small>
                      <div>
                        <b>{todayLeadOffer.price || 'Consultar'}</b>
                        <span>Ver detalle <ChevronRight size={15} /></span>
                      </div>
                    </div>
                    <i {...imageSurfaceProps(todayLeadOffer.image, 'today-lead-image')}></i>
                  </button>

                  <div className="today-fast-actions" aria-label="Accesos rapidos">
                    <button type="button" onClick={() => setScreen('directory')}>
                      <Store size={16} />
                      Ver locales
                    </button>
                    <button type="button" onClick={() => setScreen('directory')}>
                      <MapPin size={16} />
                      Mapa
                    </button>
                  </div>

                  {todayHighlights.length > 1 && (
                    <div className="today-offer-strip">
                      {todayHighlights.slice(1).map((offer, index) => (
                    <button
                      className={`today-offer-card offer-${offer.tone || getOfferTone(offer.category, index)}`}
                      type="button"
                      key={offer.id || `${offer.business}-${offer.title}-${index}`}
                      onClick={() => {
                        trackInteraction({ type: 'offer_view', businessId: offer.businessId, offerId: offer.id })
                        setSelectedOffer(offer)
                        setScreen('detail')
                      }}
                    >
                      <small>{getOfferOpenStatus(offer).label}</small>
                      <strong>{offer.title}</strong>
                      <span>{offer.business} · {offer.section}</span>
                      <b>{offer.price || 'Consultar'}</b>
                    </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="today-empty">
                  <Sparkles size={20} />
                  <strong>{offersLoading ? 'Cargando promos del barrio' : showOpenNowOnly ? 'No vemos abiertos ahora' : 'Todavia no hay promos vigentes'}</strong>
                  <span>{offersLoading ? 'En unos segundos aparecen las ofertas publicadas.' : showOpenNowOnly ? 'Toca "Ver todos" para mirar comercios aunque esten cerrados.' : 'Cuando carguen una promo, aparece aca arriba.'}</span>
                </div>
              )}
            </section>

            <div data-motion-reveal style={{ '--motion-order': 4 }}>
              <NeighborhoodLiveMap
                businesses={liveMapBusinesses}
                loading={businessesLoading}
                onOpen={(business) => {
                  setSelectedBusiness(business)
                  setScreen('business-detail')
                }}
                onDirectory={() => setScreen('directory')}
              />
            </div>

            <section className="business-strip top compact-home" data-motion-reveal style={{ '--motion-order': 5 }}>
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

            {(homeListOffers.length > 0 || query.trim()) && (
              <>
                <div className="feed-head">
                  <div>
                    <MapPin size={17} />
                    <strong>{query.trim() ? `Resultados para "${query.trim()}"` : 'Mas ofertas'}</strong>
                  </div>
                  <button type="button" onClick={() => setScreen('directory')}>{homeListOffers.length} ahora</button>
                </div>

                <section className="offer-list" data-motion-reveal style={{ '--motion-order': 6 }}>
                  {homeListOffers.length > 0 ? (
                homeListOffers.map((offer, index) => (
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

            <div data-motion-reveal style={{ '--motion-order': 7 }}>
              <ContactFooter onPrivacy={() => setScreen('privacy')} />
            </div>

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
      <section className="home-access-card merchant" data-motion-reveal style={{ '--motion-order': 2 }}>
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
    <section className="home-access-card" data-motion-reveal style={{ '--motion-order': 2 }}>
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

export default App
