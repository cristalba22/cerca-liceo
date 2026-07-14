import { hasSupabaseConfig, siteUrl, supabase } from './supabaseClient'
import { defaultBusinesses, defaultOffers } from './fallbackData'

const LOCAL_ACCOUNT_KEY = 'cerca-liceo-account'
const LOCAL_BUSINESS_KEY = 'cerca-liceo-business'
const LOCAL_BUSINESSES_KEY = 'cerca-liceo-businesses'
const LOCAL_OFFERS_KEY = 'cerca-liceo-offers'
const LOCAL_EVENTS_KEY = 'cerca-liceo-events'
const PHOTO_BUCKET = 'business-photos'

const isDataImage = (value) => typeof value === 'string' && value.startsWith('data:image/')

const createClientId = () => {
  const randomUuid = globalThis.crypto?.randomUUID
  if (typeof randomUuid === 'function') return randomUuid.call(globalThis.crypto)
  const randomPart = Math.random().toString(36).slice(2, 11)
  return `${Date.now().toString(36)}-${randomPart}`
}

const dataUrlToBlob = async (dataUrl) => {
  const response = await fetch(dataUrl)
  return response.blob()
}

const uploadPublicImage = async (dataUrl, folder = 'general') => {
  if (!hasSupabaseConfig || !isDataImage(dataUrl)) return { url: dataUrl, error: null }

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { url: dataUrl, error: new Error('Necesitas iniciar sesion para subir fotos.') }

  const blob = await dataUrlToBlob(dataUrl)
  const path = `${auth.user.id}/${folder}/${createClientId()}.jpg`
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: false,
    })

  if (error) return { url: dataUrl, error }

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

const parseArgentinePrice = (value) => {
  const cleaned = String(value || '').replace(/[^\d,.-]/g, '')
  if (!/\d/.test(cleaned)) return null
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(/\./g, '')
  const price = Number(normalized)
  return Number.isFinite(price) ? price : null
}

const readStorage = (key) => {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

const writeStorage = (key, value) => {
  if (!value) {
    window.localStorage.removeItem(key)
    return
  }
  window.localStorage.setItem(key, JSON.stringify(value))
}

const normalizeBusiness = (business = {}) => {
  const safeBusiness = business || {}
  const safeMenu = Array.isArray(safeBusiness.menu) ? safeBusiness.menu : []
  const normalizedPlan = safeBusiness.plan === 'orders' ? 'pedidos' : safeBusiness.plan

  return {
    id: safeBusiness.id,
    name: safeBusiness.name || 'Mi local',
    businessType: safeBusiness.businessType || safeBusiness.business_type || 'local',
    hasPublicAddress: safeBusiness.hasPublicAddress ?? safeBusiness.has_public_address ?? Boolean(safeBusiness.address),
    category: safeBusiness.category || 'Comida',
    section: safeBusiness.section || 'Liceo Procrear',
    address: safeBusiness.address || '',
    reference: safeBusiness.reference || 'Referencia a completar',
    hours: safeBusiness.hours || 'Horario a completar',
    openDays: safeBusiness.openDays || safeBusiness.open_days || ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'],
    openTime: safeBusiness.openTime || safeBusiness.open_time || '',
    closeTime: safeBusiness.closeTime || safeBusiness.close_time || '',
    whatsapp: safeBusiness.whatsapp || '',
    instagram: safeBusiness.instagram || '',
    description: safeBusiness.description || 'Atencion por WhatsApp.',
    paymentMethods: safeBusiness.paymentMethods || safeBusiness.payment_methods || 'Efectivo y transferencia',
    tone: safeBusiness.tone || 'orange',
    image: safeBusiness.image || 'generic',
    imageZoom: safeBusiness.imageZoom || safeBusiness.image_zoom || 120,
    imagePosition: safeBusiness.imagePosition || safeBusiness.image_position || 'center center',
    open: safeBusiness.open ?? safeBusiness.is_open ?? true,
    rating: safeBusiness.rating || 'Nuevo',
    followers: safeBusiness.followers || 0,
    verified: safeBusiness.verified || false,
    delivery: safeBusiness.delivery || 'Consultar',
    hasDelivery: safeBusiness.hasDelivery ?? String(safeBusiness.delivery || '').toLowerCase().includes('delivery'),
    orderHours: safeBusiness.orderHours || safeBusiness.hours || 'Horario a completar',
    deliveryZone: safeBusiness.deliveryZone || safeBusiness.section || 'Consultar zona',
    distance: safeBusiness.distance || 'cerca',
    plan: normalizedPlan || 'gratis',
    planStatus: safeBusiness.planStatus || safeBusiness.plan_status || 'free',
    paidUntil: safeBusiness.paidUntil || safeBusiness.paid_until || '',
    adminNotes: safeBusiness.adminNotes || safeBusiness.admin_notes || '',
    isPublic: safeBusiness.isPublic ?? safeBusiness.is_public ?? true,
    menu: safeMenu.length
      ? safeMenu
      : [
          { name: '' },
          { name: '' },
        ],
    ready: safeBusiness.ready ?? true,
  }
}

const mergeById = (items) => {
  const seen = new Set()
  return items.filter((item) => {
    const id = item.id || item.name
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

const isOrdersPlanActive = (business = {}) => {
  const plan = business.plan === 'orders' ? 'pedidos' : business.plan
  return plan === 'pedidos' && business.planStatus === 'active'
}

const readLocalEvents = () => readStorage(LOCAL_EVENTS_KEY) || []

const writeLocalEvents = (events) => {
  writeStorage(LOCAL_EVENTS_KEY, events.slice(0, 300))
}

const summarizeEvents = (events, businessId) => {
  const relevant = events.filter((event) => !businessId || event.business_id === businessId || event.businessId === businessId)
  return relevant.reduce((acc, event) => {
    const type = event.event_type || event.type
    if (type === 'business_view') acc.businessViews += 1
    if (type === 'offer_view') acc.offerViews += 1
    if (type === 'whatsapp_click') acc.whatsappClicks += 1
    if (type === 'favorite_click') acc.favoriteClicks += 1
    return acc
  }, {
    businessViews: 0,
    offerViews: 0,
    whatsappClicks: 0,
    favoriteClicks: 0,
  })
}

const summarizeAdminEvents = (events = []) => {
  const relevant = events.filter((event) => {
    const metadata = event.metadata || {}
    return metadata.exclude !== true && metadata.exclude !== 'true' && metadata.excludeAdmin !== true && metadata.exclude_admin !== true
  })
  const visitors = new Set()

  const summary = relevant.reduce((acc, event) => {
    const type = event.event_type || event.type
    const visitorId = event.metadata?.visitorId || event.metadata?.visitor_id
    if (visitorId) visitors.add(visitorId)
    if (type === 'page_view') acc.pageViews += 1
    if (type === 'business_view') acc.businessViews += 1
    if (type === 'offer_view') acc.offerViews += 1
    if (type === 'whatsapp_click') acc.whatsappClicks += 1
    if (type === 'favorite_click') acc.favoriteClicks += 1
    return acc
  }, {
    pageViews: 0,
    uniqueVisitors: 0,
    businessViews: 0,
    offerViews: 0,
    whatsappClicks: 0,
    favoriteClicks: 0,
  })

  summary.uniqueVisitors = visitors.size
  return summary
}

const readLocalOffers = () => readStorage(LOCAL_OFFERS_KEY) || []

const writeLocalOffers = (offers) => {
  writeStorage(LOCAL_OFFERS_KEY, offers.slice(0, 80))
}

const cleanText = (value) => String(value || '')
  .replace(/\s+\?\s+/g, ' - ')
  .replace(/\s+\uFFFD\s+/g, ' - ')
  .replace(/\s·\s/g, ' - ')

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()

const isValidEmail = (value) => /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(normalizeEmail(value))

const authErrorMessage = (error, fallback = 'No se pudo completar la accion.') => {
  if (!error) return ''
  const raw = typeof error === 'string'
    ? error
    : error.message || error.error_description || error.error || ''
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

const mapBusinessRow = (row) => ({
  id: row.id,
  ownerId: row.owner_id,
  name: row.name,
  businessType: row.business_type || 'local',
  hasPublicAddress: row.has_public_address ?? Boolean(row.address),
  category: row.category,
  section: row.section,
  address: cleanText(row.address),
  reference: cleanText(row.reference),
  hours: cleanText(row.hours),
  openDays: row.open_days || [],
  openTime: row.open_time || '',
  closeTime: row.close_time || '',
  whatsapp: row.whatsapp,
  instagram: row.instagram,
  tone: row.tone || 'orange',
  image: row.image_key || 'generic',
  imageZoom: row.image_zoom || 120,
  imagePosition: row.image_position || 'center center',
  open: row.is_open,
  rating: row.rating ? String(row.rating) : 'Nuevo',
  followers: row.followers_count || 0,
  verified: row.verified,
  delivery: row.delivery_label || 'Consultar',
  hasDelivery: row.has_delivery,
  orderHours: cleanText(row.order_hours || row.hours),
  deliveryZone: cleanText(row.delivery_zone || 'Consultar zona'),
  distance: row.distance_label || 'cerca',
  plan: row.plan === 'orders' ? 'pedidos' : 'gratis',
  planStatus: row.plan_status || (row.plan === 'orders' ? 'active' : 'free'),
  paidUntil: row.paid_until || '',
  adminNotes: row.admin_notes || '',
  isPublic: row.is_public,
  menu: (row.products || [])
    .slice()
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price ? `$${Number(product.price).toLocaleString('es-AR')}` : undefined,
      available: product.is_available,
    })),
})

const mapOfferRow = (row) => ({
  id: row.id,
  title: row.title,
  business: row.businesses?.name || row.business_name || 'Comercio',
  businessId: row.business_id,
  businessType: row.businesses?.business_type || 'local',
  hasPublicAddress: row.businesses?.has_public_address ?? Boolean(row.businesses?.address || row.address),
  category: row.category || row.businesses?.category,
  section: row.section || row.businesses?.section,
  price: row.price_label || (row.price ? `$${Number(row.price).toLocaleString('es-AR')}` : 'Consultar'),
  expires: row.expires_label || getExpiresLabel(row.expires_at),
  address: cleanText(row.businesses?.address || row.address),
  reference: cleanText(row.businesses?.reference || row.reference),
  hours: cleanText(row.businesses?.hours || row.hours),
  openDays: row.businesses?.open_days || [],
  openTime: row.businesses?.open_time || '',
  closeTime: row.businesses?.close_time || '',
  description: cleanText(row.description),
  tone: row.tone || row.businesses?.tone || 'orange',
  image: row.image_key || row.businesses?.image_key || 'generic',
  whatsapp: row.businesses?.whatsapp || row.whatsapp || '',
  instagram: row.businesses?.instagram || '',
  open: row.businesses?.is_open ?? true,
  distance: row.distance_label || row.businesses?.distance_label || 'cerca',
  saves: row.saves_count || 0,
  highlight: row.highlight || 'Promo activa',
})

const getExpiresLabel = (expiresAt) => {
  if (!expiresAt) return '3 dias'
  const days = Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))
  return days === 1 ? 'vence hoy' : `${Math.min(days, 4)} dias`
}

const isOfferAlive = (offer) => {
  if (/eliminada/i.test(offer.highlight || '')) return false
  if (offer.paused || offer.open === false) return false
  if (!offer.expiresAt) return true
  return new Date(offer.expiresAt).getTime() > Date.now()
}

const accountFromProfile = (profile, user) => ({
  id: user.id,
  type: profile?.account_type || user.user_metadata?.account_type || 'neighbor',
  name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Vecino Liceo',
  whatsapp: profile?.whatsapp || user.user_metadata?.whatsapp || '',
  email: user.email,
  section: profile?.section || user.user_metadata?.section || 'Liceo Procrear',
  role: profile?.role || 'user',
  businessType: user.user_metadata?.business_type || 'local',
  interests: profile?.interests || user.user_metadata?.interests || '',
})

const getOrCreateProfile = async (user) => {
  if (!user) return { profile: null, error: null }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return { profile: null, error }
  if (profile) return { profile, error: null }

  const fallbackProfile = {
    id: user.id,
    account_type: user.user_metadata?.account_type || 'neighbor',
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Vecino Liceo',
    whatsapp: user.user_metadata?.whatsapp || '',
    section: user.user_metadata?.section || 'Liceo Procrear',
    interests: user.user_metadata?.interests || '',
  }

  const { data: createdProfile, error: createError } = await supabase
    .from('profiles')
    .upsert(fallbackProfile, { onConflict: 'id' })
    .select('*')
    .single()

  return { profile: createdProfile || fallbackProfile, error: createError }
}

export const cercaApi = {
  isSupabaseEnabled() {
    return hasSupabaseConfig
  },

  async getSession() {
    if (!hasSupabaseConfig) {
      return { account: readStorage(LOCAL_ACCOUNT_KEY), error: null }
    }

    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session?.user) {
      return { account: null, error }
    }

    const { profile, error: profileError } = await getOrCreateProfile(data.session.user)

    return {
      account: accountFromProfile(profile, data.session.user),
      error: profileError,
    }
  },

  async signInQuick(type) {
    const isMerchant = type === 'merchant'
    const account = {
      type,
      name: isMerchant ? 'Comerciante Liceo' : 'Vecino Liceo',
      whatsapp: '351 555 1111',
      email: isMerchant ? 'comercio@cercaliceo.com' : 'vecino@cercaliceo.com',
      section: 'Liceo Procrear',
      role: 'user',
      businessName: isMerchant ? 'Lo de Liceo' : '',
      category: isMerchant ? 'Comida' : '',
      salesMode: isMerchant ? 'Delivery propio' : '',
      interests: isMerchant ? '' : 'Comida, despensa y servicios',
    }
    writeStorage(LOCAL_ACCOUNT_KEY, account)
    if (!isMerchant) {
      writeStorage(LOCAL_BUSINESS_KEY, null)
    }
    return { account, error: null }
  },

  async signInWithPassword({ email, password }) {
    if (!hasSupabaseConfig) {
      const account = readStorage(LOCAL_ACCOUNT_KEY)
      if (!account) {
        return { account: null, error: new Error('Primero crea una cuenta.') }
      }
      return { account, error: null }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { account: null, error }

    const { profile, error: profileError } = await getOrCreateProfile(data.user)

    return {
      account: accountFromProfile(profile, data.user),
      error: profileError,
    }
  },

  async requestPasswordReset(email) {
    if (!email) {
      return { error: new Error('Escribi tu email para mandarte el enlace de recuperacion.') }
    }

    if (!hasSupabaseConfig) {
      return { error: new Error('La recuperacion de clave funciona cuando la app esta conectada a Supabase.') }
    }

    const redirectTo = `${siteUrl}/?reset=password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    return { error }
  },

  async updatePassword(password) {
    if (!password || password.length < 6) {
      return { error: new Error('La nueva clave tiene que tener al menos 6 caracteres.') }
    }

    if (!hasSupabaseConfig) {
      return { error: new Error('La recuperacion de clave funciona cuando la app esta conectada a Supabase.') }
    }

    const { error } = await supabase.auth.updateUser({ password })
    return { error }
  },

  async signOut() {
    if (hasSupabaseConfig) {
      await supabase.auth.signOut()
    }
    writeStorage(LOCAL_ACCOUNT_KEY, null)
    writeStorage(LOCAL_BUSINESS_KEY, null)
  },

  async registerAccount(form) {
    if (!hasSupabaseConfig) {
      const publicAccount = { ...form }
      delete publicAccount.password
      delete publicAccount.confirmPassword
      writeStorage(LOCAL_ACCOUNT_KEY, publicAccount)
      return { account: publicAccount, error: null }
    }

    const email = normalizeEmail(form.email)

    if (!email || !form.password) {
      return { account: null, error: new Error('Email y clave son obligatorios.') }
    }

    if (!isValidEmail(email)) {
      return { account: null, error: new Error('Revisa el email. Tiene que ser algo como nombre@gmail.com, con punto antes de com.') }
    }

    if (form.password.length < 6) {
      return { account: null, error: new Error('La clave tiene que tener al menos 6 caracteres.') }
    }

    const password = form.password
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: siteUrl,
        data: {
          full_name: form.name,
          account_type: form.type,
          business_type: form.businessType,
          whatsapp: form.whatsapp,
          section: form.section || 'Liceo Procrear',
          interests: form.interests,
        },
      },
    })

    if (error) return { account: null, error }

    if (!data.session) {
      const merchantMessage = 'Cuenta de comercio creada. Te mandamos un email de Cerca Liceo para verificar el acceso antes de cargar tu local.'
      const neighborMessage = 'Cuenta creada. Te mandamos un email de Cerca Liceo para verificar el acceso antes de iniciar sesion.'
      return {
        account: null,
        error: null,
        pendingConfirmation: true,
        message: form.type === 'merchant' ? merchantMessage : neighborMessage,
      }
    }

    const profile = {
      id: data.user.id,
      account_type: form.type,
      full_name: form.name,
      whatsapp: form.whatsapp,
      section: form.section,
      interests: form.interests,
    }

    const { error: profileError } = await supabase.from('profiles').upsert(profile)
    const account = {
      id: data.user.id,
      type: form.type,
      name: form.name,
      whatsapp: form.whatsapp,
      email: data.user.email,
      section: form.section,
      role: 'user',
      businessName: form.businessName,
      businessType: form.businessType,
      category: form.category,
      salesMode: form.salesMode,
      interests: form.interests,
    }

    if (profileError) {
      return {
        account,
        error: null,
        warning: `Cuenta creada. Si algun dato no aparece, inicia sesion de nuevo. (${authErrorMessage(profileError, 'perfil pendiente')})`,
      }
    }

    return {
      account,
      message: form.type === 'merchant'
        ? 'Cuenta comercio creada. Ya podes cargar tu ficha.'
        : 'Cuenta creada. Ya podes usar favoritos y avisos.',
      error: null,
    }
  },

  async upgradeAccountToMerchant(defaults = {}) {
    if (!hasSupabaseConfig) {
      const current = readStorage(LOCAL_ACCOUNT_KEY)
      if (!current) return { account: null, error: new Error('Primero inicia sesion.') }
      const account = {
        ...current,
        type: 'merchant',
        businessType: defaults.businessType || current.businessType || 'local',
        category: defaults.category || current.category || 'Comida',
        businessName: defaults.businessName || current.businessName || '',
        salesMode: defaults.salesMode || current.salesMode || 'WhatsApp',
      }
      writeStorage(LOCAL_ACCOUNT_KEY, account)
      return { account, error: null }
    }

    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError || !auth.user) {
      return { account: null, error: authError || new Error('Primero inicia sesion.') }
    }

    const { profile } = await getOrCreateProfile(auth.user)
    const nextProfile = {
      id: auth.user.id,
      account_type: 'merchant',
      full_name: profile?.full_name || auth.user.user_metadata?.full_name || auth.user.email?.split('@')[0] || 'Comerciante Liceo',
      whatsapp: profile?.whatsapp || auth.user.user_metadata?.whatsapp || '',
      section: profile?.section || auth.user.user_metadata?.section || 'Liceo Procrear',
      interests: profile?.interests || auth.user.user_metadata?.interests || '',
    }

    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .upsert(nextProfile, { onConflict: 'id' })
      .select('*')
      .single()

    if (profileError) return { account: null, error: profileError }

    await supabase.auth.updateUser({
      data: {
        account_type: 'merchant',
        business_type: defaults.businessType || auth.user.user_metadata?.business_type || 'local',
      },
    })

    return {
      account: {
        ...accountFromProfile(updatedProfile, auth.user),
        type: 'merchant',
        businessType: defaults.businessType || auth.user.user_metadata?.business_type || 'local',
        category: defaults.category || 'Comida',
        businessName: defaults.businessName || '',
        salesMode: defaults.salesMode || 'WhatsApp',
      },
      error: null,
    }
  },

  async listOffers({ section = 'Todos', category = 'Todas', query = '' } = {}) {
    if (!hasSupabaseConfig) {
      const normalized = query.trim().toLowerCase()
      const savedOffers = readStorage(LOCAL_OFFERS_KEY) || []
      const mergedOffers = mergeById([...savedOffers, ...defaultOffers])
      return {
        offers: mergedOffers.filter((offer) => {
          if (!isOfferAlive(offer)) return false
          const byCategory = category === 'Todas' || offer.category === category
          const bySection = section === 'Todos' || offer.section === section
          const byQuery = !normalized || `${offer.title} ${offer.business} ${offer.category}`.toLowerCase().includes(normalized)
          return byCategory && bySection && byQuery
        }),
        error: null,
      }
    }

    let request = supabase
      .from('offers')
      .select('*, businesses(*)')
      .eq('is_active', true)
      .lte('starts_at', new Date().toISOString())
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    if (section !== 'Todos') request = request.eq('section', section)
    if (category !== 'Todas') request = request.eq('category', category)
    if (query.trim()) request = request.ilike('search_text', `%${query.trim()}%`)

    const { data, error } = await request
    return { offers: data?.map(mapOfferRow) || [], error }
  },

  async listMyOffers() {
    if (!hasSupabaseConfig) {
      return { offers: readLocalOffers(), error: null }
    }

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return { offers: [], error: null }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', auth.user.id)
      .maybeSingle()

    if (!business?.id) return { offers: [], error: null }

    const { data, error } = await supabase
      .from('offers')
      .select('*, businesses(*)')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(50)

    return {
      offers: data?.map(mapOfferRow).filter((offer) => !/eliminada/i.test(offer.highlight || '')) || [],
      error,
    }
  },

  async listBusinesses({ section = 'Todos', category = 'Todas', query = '', openOnly = false } = {}) {
    if (!hasSupabaseConfig) {
      const normalized = query.trim().toLowerCase()
      const savedBusinesses = (readStorage(LOCAL_BUSINESSES_KEY) || []).map(normalizeBusiness)
      const currentBusiness = readStorage(LOCAL_BUSINESS_KEY)
      const mergedBusinesses = mergeById([
        ...(currentBusiness ? [normalizeBusiness(currentBusiness)] : []),
        ...savedBusinesses,
        ...defaultBusinesses,
      ])
      return {
        businesses: mergedBusinesses.filter((business) => {
          const byCategory = category === 'Todas' || business.category === category
          const bySection = section === 'Todos' || business.section === section
          const byOpen = !openOnly || business.open
          const menu = Array.isArray(business.menu) ? business.menu : []
          const byQuery = !normalized || `${business.name} ${business.category} ${menu.map((item) => item.name).join(' ')}`.toLowerCase().includes(normalized)
          return byCategory && bySection && byOpen && byQuery
        }),
        error: null,
      }
    }

    const publicBusinessColumns = `
      id,
      name,
      business_type,
      has_public_address,
      category,
      section,
      address,
      reference,
      hours,
      open_days,
      open_time,
      close_time,
      whatsapp,
      instagram,
      tone,
      image_key,
      image_zoom,
      image_position,
      is_open,
      rating,
      followers_count,
      verified,
      delivery_label,
      has_delivery,
      order_hours,
      delivery_zone,
      distance_label,
      plan,
      plan_status,
      paid_until,
      is_public,
      search_text,
      updated_at,
      products(id,business_id,name,price,is_available,position)
    `

    let request = supabase
      .from('businesses')
      .select(publicBusinessColumns)
      .eq('is_public', true)
      .order('verified', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(80)

    if (section !== 'Todos') request = request.eq('section', section)
    if (category !== 'Todas') request = request.eq('category', category)
    if (openOnly) request = request.eq('is_open', true)
    if (query.trim()) request = request.ilike('search_text', `%${query.trim()}%`)

    const { data, error } = await request
    return { businesses: data?.map(mapBusinessRow) || [], error }
  },

  async listAdminBusinesses() {
    if (!hasSupabaseConfig) {
      const savedBusinesses = (readStorage(LOCAL_BUSINESSES_KEY) || []).map(normalizeBusiness)
      const currentBusiness = readStorage(LOCAL_BUSINESS_KEY)
      return {
        businesses: mergeById([
          ...(currentBusiness ? [normalizeBusiness(currentBusiness)] : []),
          ...savedBusinesses,
          ...defaultBusinesses,
        ]),
        error: null,
      }
    }

    const { data, error } = await supabase
      .from('businesses')
      .select('*, products(*)')
      .order('updated_at', { ascending: false })
      .limit(150)

    return { businesses: data?.map(mapBusinessRow) || [], error }
  },

  async updateBusinessAdmin({ businessId, changes }) {
    if (!businessId) {
      return { business: null, error: new Error('No se encontro el local.') }
    }

    if (!hasSupabaseConfig) {
      const current = readStorage(LOCAL_BUSINESS_KEY)
      const savedBusinesses = (readStorage(LOCAL_BUSINESSES_KEY) || []).map(normalizeBusiness)
      const allBusinesses = mergeById([...(current ? [normalizeBusiness(current)] : []), ...savedBusinesses, ...defaultBusinesses])
      const updatedBusinesses = allBusinesses.map((business) => (
        business.id === businessId ? normalizeBusiness({ ...business, ...changes }) : business
      ))
      const business = updatedBusinesses.find((item) => item.id === businessId) || null
      writeStorage(LOCAL_BUSINESSES_KEY, updatedBusinesses)
      if (current?.id === businessId) writeStorage(LOCAL_BUSINESS_KEY, business)
      return { business, error: null }
    }

    const payload = {}
    if ('isPublic' in changes) payload.is_public = changes.isPublic
    if ('verified' in changes) payload.verified = changes.verified
    if ('isOpen' in changes) payload.is_open = changes.isOpen
    if ('plan' in changes) payload.plan = changes.plan === 'pedidos' ? 'orders' : 'free'
    if ('planStatus' in changes) payload.plan_status = changes.planStatus
    if ('adminNotes' in changes) payload.admin_notes = changes.adminNotes || null
    if ('name' in changes) payload.name = changes.name
    if ('category' in changes) payload.category = changes.category
    if ('section' in changes) payload.section = changes.section
    if ('address' in changes) payload.address = changes.address || null
    if ('reference' in changes) payload.reference = changes.reference || null
    if ('hours' in changes) payload.hours = changes.hours
    if ('whatsapp' in changes) payload.whatsapp = changes.whatsapp
    if ('instagram' in changes) payload.instagram = changes.instagram || null
    payload.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('businesses')
      .update(payload)
      .eq('id', businessId)
      .select('*, products(*)')
      .single()

    return { business: data ? mapBusinessRow(data) : null, error }
  },

  async deleteBusinessAdmin({ businessId }) {
    if (!businessId) {
      return { error: new Error('No se encontro el comercio.') }
    }

    if (!hasSupabaseConfig) {
      const current = readStorage(LOCAL_BUSINESS_KEY)
      const savedBusinesses = (readStorage(LOCAL_BUSINESSES_KEY) || []).map(normalizeBusiness)
      writeStorage(LOCAL_BUSINESSES_KEY, savedBusinesses.filter((business) => business.id !== businessId))
      writeLocalOffers(readLocalOffers().filter((offer) => offer.businessId !== businessId))
      if (current?.id === businessId) writeStorage(LOCAL_BUSINESS_KEY, null)
      return { error: null }
    }

    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', businessId)

    return { error }
  },

  async getMyBusiness() {
    if (!hasSupabaseConfig) {
      return { business: readStorage(LOCAL_BUSINESS_KEY), error: null }
    }

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return { business: null, error: null }

    const { data, error } = await supabase
      .from('businesses')
      .select('*, products(*)')
      .eq('owner_id', auth.user.id)
      .maybeSingle()

    return { business: data ? mapBusinessRow(data) : null, error }
  },

  async saveBusiness(draft) {
    if (!hasSupabaseConfig) {
      const current = readStorage(LOCAL_BUSINESS_KEY)
      const business = normalizeBusiness({ ...draft, id: current?.id || createClientId(), ready: true })
      const savedBusinesses = readStorage(LOCAL_BUSINESSES_KEY) || []
      writeStorage(LOCAL_BUSINESSES_KEY, mergeById([business, ...savedBusinesses]))
      writeStorage(LOCAL_BUSINESS_KEY, business)
      return { business, error: null }
    }

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      return { business: null, error: new Error('Necesitas iniciar sesion para guardar el local.') }
    }

    const { data: existingBusiness } = await supabase
      .from('businesses')
      .select('id, image_key')
      .eq('owner_id', auth.user.id)
      .maybeSingle()

    const { url: imageUrl, error: imageError } = await uploadPublicImage(draft.image, 'locals')
    const safeImageKey = imageError
      ? (isDataImage(draft.image) ? draft.image : existingBusiness?.image_key || draft.image || 'generic')
      : imageUrl || draft.image || existingBusiness?.image_key || 'generic'

    const payload = {
      owner_id: auth.user.id,
      name: draft.name,
      business_type: draft.businessType || 'local',
      has_public_address: draft.hasPublicAddress ?? Boolean(draft.address),
      category: draft.category,
      section: draft.section,
      address: draft.address,
      reference: draft.reference,
      hours: draft.hours,
      open_days: draft.openDays,
      open_time: draft.openTime,
      close_time: draft.closeTime,
      whatsapp: draft.whatsapp,
      instagram: draft.instagram,
      description: draft.description,
      payment_methods: draft.paymentMethods,
      delivery_label: draft.delivery,
      has_delivery: String(draft.delivery || '').toLowerCase().includes('delivery'),
      order_hours: draft.hours,
      image_key: safeImageKey,
      image_zoom: draft.imageZoom,
      image_position: draft.imagePosition,
      plan: draft.plan === 'pedidos' ? 'orders' : 'free',
      plan_status: draft.plan === 'pedidos'
        ? (draft.planStatus === 'active' ? 'active' : 'manual_pending')
        : 'free',
      paid_until: draft.paidUntil || null,
      admin_notes: draft.adminNotes || null,
      is_public: draft.isPublic ?? true,
      is_open: draft.open !== false,
      updated_at: new Date().toISOString(),
    }

    let { data, error } = await supabase
      .from('businesses')
      .upsert(payload, { onConflict: 'owner_id' })
      .select('*, products(*)')
      .single()

    if (error && /business_type|has_public_address/i.test(error.message || '')) {
      const { business_type: _businessType, has_public_address: _hasPublicAddress, ...compatiblePayload } = payload
      const retry = await supabase
        .from('businesses')
        .upsert(compatiblePayload, { onConflict: 'owner_id' })
        .select('*, products(*)')
        .single()
      data = retry.data
      error = retry.error
    }

    if (error || !data) return { business: null, error }

    const planIsActive = isOrdersPlanActive(draft)
    const menu = (planIsActive ? (draft.menu || []) : [])
      .slice(0, 15)
      .filter((item) => item.name?.trim())
      .map((item, index) => ({
        business_id: data.id,
        name: item.name.trim(),
        price: parseArgentinePrice(item.price),
        is_available: item.available !== false,
        position: index,
      }))

    const { error: deleteProductsError } = await supabase
      .from('products')
      .delete()
      .eq('business_id', data.id)

    if (deleteProductsError) return { business: null, error: deleteProductsError }

    if (menu.length) {
      const { error: productsError } = await supabase.from('products').insert(menu)
      if (productsError) return { business: null, error: productsError }
    }

    const { data: refreshed, error: refreshError } = await supabase
      .from('businesses')
      .select('*, products(*)')
      .eq('id', data.id)
      .single()

    return {
      business: refreshed ? mapBusinessRow(refreshed) : mapBusinessRow(data),
      error: refreshError,
      warning: imageError ? 'El local se guardo. La foto quedo en modo temporal porque faltan politicas de Storage.' : '',
    }
  },

  async createOffer({ business, title, description, priceLabel, imageKey, expiresInDays = 4 }) {
    if (!business) {
      return { offer: null, error: new Error('Primero carga la ficha del local.') }
    }

    if (!business.id) {
      return { offer: null, error: new Error('Guarda la ficha del local antes de publicar una promo.') }
    }

    const founderActive = business.plan === 'pedidos' && business.planStatus === 'active'

    if (!hasSupabaseConfig) {
      if (!founderActive) {
        const weekStart = Date.now() - 7 * 86400000
        const weeklyOffers = readLocalOffers().filter((offer) => (
          (offer.businessId === business.id || offer.business === business.name) &&
          new Date(offer.createdAt || Date.now()).getTime() >= weekStart
        ))
        if (weeklyOffers.length >= 1) {
          return { offer: null, error: new Error('Ya usaste la publicacion gratis de esta semana. Para extras, pedi el plan fundador.') }
        }
      }
      const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString()
      const offer = {
        id: createClientId(),
        title,
        business: business.name,
        businessId: business.id,
        businessType: business.businessType || 'local',
        hasPublicAddress: business.hasPublicAddress ?? Boolean(business.address),
        category: business.category,
        section: business.section,
        price: priceLabel || 'Consultar',
        expires: `${expiresInDays} dias`,
        address: business.address,
        reference: business.reference,
        hours: business.hours,
        openDays: business.openDays || [],
        openTime: business.openTime || '',
        closeTime: business.closeTime || '',
        description,
        tone: business.tone || 'orange',
        image: imageKey || business.image || 'generic',
        whatsapp: business.whatsapp || '',
        instagram: business.instagram || '',
        open: true,
        distance: business.distance || 'cerca',
        saves: 0,
        highlight: 'Nueva promo',
        createdAt: new Date().toISOString(),
        expiresAt,
      }
      const savedOffers = readStorage(LOCAL_OFFERS_KEY) || []
      writeStorage(LOCAL_OFFERS_KEY, [offer, ...savedOffers].slice(0, 80))
      return { offer, error: null }
    }

    if (!founderActive) {
      const rpcCheck = await supabase.rpc('can_create_weekly_free_offer', { target_business_id: business.id })
      if (!rpcCheck.error && rpcCheck.data === false) {
        return { offer: null, error: new Error('Ya usaste la publicacion gratis de esta semana. Para extras, pedi el plan fundador.') }
      }
      if (rpcCheck.error) {
        const weekStart = new Date(Date.now() - 7 * 86400000).toISOString()
        const { count, error: countError } = await supabase
          .from('offers')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business.id)
          .gte('created_at', weekStart)
        if (!countError && count >= 1) {
          return { offer: null, error: new Error('Ya usaste la publicacion gratis de esta semana. Para extras, pedi el plan fundador.') }
        }
      }
    }

    const { url: offerImageUrl, error: imageError } = await uploadPublicImage(imageKey, 'offers')

    const payload = {
      business_id: business.id,
      title,
      description,
      category: business.category,
      section: business.section,
      price_label: priceLabel,
      image_key: imageError
        ? (isDataImage(imageKey) ? imageKey : business.image || imageKey || 'generic')
        : offerImageUrl || imageKey || business.image || 'generic',
      tone: business.tone || 'orange',
      highlight: 'Nueva promo',
      expires_at: new Date(Date.now() + expiresInDays * 86400000).toISOString(),
      is_active: true,
    }

    const { data, error } = await supabase
      .from('offers')
      .insert(payload)
      .select('*, businesses(*)')
      .single()

    return {
      offer: data ? mapOfferRow(data) : null,
      error,
      warning: imageError ? 'La promo se publico. La foto quedo en modo temporal porque faltan politicas de Storage.' : '',
    }
  },

  async updateOffer({ offerId, business, title, description, priceLabel, imageKey, expiresInDays = 4 }) {
    if (!offerId) {
      return { offer: null, error: new Error('No se encontro la publicacion para editar.') }
    }

    if (!hasSupabaseConfig) {
      const nextOffers = readLocalOffers().map((offer) => (
        offer.id === offerId
          ? {
              ...offer,
              title,
              description,
              price: priceLabel || 'Consultar',
              image: imageKey || offer.image || business?.image || 'generic',
              expires: `${expiresInDays} dias`,
              expiresAt: new Date(Date.now() + expiresInDays * 86400000).toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : offer
      ))
      writeLocalOffers(nextOffers)
      return { offer: nextOffers.find((offer) => offer.id === offerId) || null, error: null }
    }

    const { url: offerImageUrl, error: imageError } = await uploadPublicImage(imageKey, 'offers')
    const payload = {
      title,
      description,
      price_label: priceLabel || 'Consultar',
      image_key: imageError
        ? (isDataImage(imageKey) ? imageKey : imageKey || business?.image || 'generic')
        : offerImageUrl || imageKey || business?.image || 'generic',
      expires_at: new Date(Date.now() + expiresInDays * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('offers')
      .update(payload)
      .eq('id', offerId)
      .select('*, businesses(*)')
      .single()

    return {
      offer: data ? mapOfferRow(data) : null,
      error,
      warning: imageError ? 'La promo se actualizo. La foto quedo en modo temporal porque faltan politicas de Storage.' : '',
    }
  },

  async updateOfferStatus({ offerId, isActive }) {
    if (!offerId) {
      return { offer: null, error: new Error('No se encontro la publicacion.') }
    }

    if (!hasSupabaseConfig) {
      const savedOffers = readLocalOffers()
      const nextOffers = savedOffers.map((offer) => (
        offer.id === offerId ? { ...offer, open: isActive, paused: !isActive } : offer
      ))
      writeLocalOffers(nextOffers)
      return { offer: nextOffers.find((offer) => offer.id === offerId) || null, error: null }
    }

    const { data, error } = await supabase
      .from('offers')
      .update({ is_active: isActive })
      .eq('id', offerId)
      .select('*, businesses(*)')
      .single()

    return { offer: data ? mapOfferRow(data) : null, error }
  },

  async deleteOffer({ offerId }) {
    if (!offerId) {
      return { error: new Error('No se encontro la publicacion.') }
    }

    if (!hasSupabaseConfig) {
      writeLocalOffers(readLocalOffers().filter((offer) => offer.id !== offerId))
      return { error: null }
    }

    const { error } = await supabase
      .from('offers')
      .update({
        is_active: false,
        expires_at: new Date().toISOString(),
        highlight: 'Eliminada por admin',
      })
      .eq('id', offerId)
      .select('id')
      .single()

    return { error }
  },

  async repostOffer({ offer, expiresInDays = 4 }) {
    if (!offer) {
      return { offer: null, error: new Error('No se encontro la publicacion.') }
    }

    if (!hasSupabaseConfig) {
      const reposted = {
        ...offer,
        id: createClientId(),
        open: true,
        paused: false,
        expires: `${expiresInDays} dias`,
        expiresAt: new Date(Date.now() + expiresInDays * 86400000).toISOString(),
        highlight: 'Republicada',
        createdAt: new Date().toISOString(),
      }
      writeLocalOffers([reposted, ...readLocalOffers()])
      return { offer: reposted, error: null }
    }

    const payload = {
      business_id: offer.businessId,
      title: offer.title,
      description: offer.description,
      category: offer.category,
      section: offer.section,
      price_label: offer.price,
      image_key: offer.image || 'generic',
      tone: offer.tone || 'orange',
      highlight: 'Republicada',
      expires_at: new Date(Date.now() + expiresInDays * 86400000).toISOString(),
      is_active: true,
    }

    const { data, error } = await supabase
      .from('offers')
      .insert(payload)
      .select('*, businesses(*)')
      .single()

    return { offer: data ? mapOfferRow(data) : null, error }
  },

  async trackEvent({ type, businessId, offerId, metadata = {} }) {
    const event = {
      id: createClientId(),
      event_type: type,
      type,
      business_id: businessId || null,
      businessId: businessId || null,
      offer_id: offerId || null,
      offerId: offerId || null,
      metadata,
      created_at: new Date().toISOString(),
    }

    if (!hasSupabaseConfig) {
      writeLocalEvents([event, ...readLocalEvents()])
      return { error: null }
    }

    const { error } = await supabase
      .from('app_events')
      .insert({
        event_type: type,
        business_id: businessId || null,
        offer_id: offerId || null,
        metadata,
      })

    if (error) {
      writeLocalEvents([event, ...readLocalEvents()])
    }
    return { error }
  },

  async getBusinessMetrics({ businessId }) {
    if (!businessId) {
      return { metrics: summarizeEvents(readLocalEvents()), error: null }
    }

    const localMetrics = summarizeEvents(readLocalEvents(), businessId)

    if (!hasSupabaseConfig) {
      return { metrics: localMetrics, error: null }
    }

    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data, error } = await supabase
      .from('app_events')
      .select('event_type, business_id')
      .eq('business_id', businessId)
      .gte('created_at', since)
      .limit(1000)

    if (error) return { metrics: localMetrics, error }
    return { metrics: summarizeEvents(data || [], businessId), error: null }
  },

  async getAdminMetrics() {
    const localMetrics = summarizeAdminEvents(readLocalEvents())

    if (!hasSupabaseConfig) {
      return { metrics: localMetrics, error: null }
    }

    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data, error } = await supabase
      .from('app_events')
      .select('event_type, metadata')
      .gte('created_at', since)
      .limit(5000)

    if (error) return { metrics: localMetrics, error }
    return { metrics: summarizeAdminEvents(data || []), error: null }
  },
}
