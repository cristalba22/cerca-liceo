import { defaultBusinesses } from './fallbackData'
import {
  liceoMapBounds,
  weekDays,
  MAX_MENU_ITEMS,
  MENU_SECTION_SIZE,
  menuCatalogSections,
} from './appConfig.js'

const normalizeSearchText = (value = '') => String(value)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .trim()

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

const formatOpenDays = (days = []) => {
  if (days.length === 7) return 'Todos los dias'
  if (days.join(',') === 'Lun,Mar,Mie,Jue,Vie') return 'Lun a Vie'
  if (days.join(',') === 'Lun,Mar,Mie,Jue,Vie,Sab') return 'Lun a Sab'
  if (days.join(',') === 'Sab,Dom') return 'Sab y Dom'
  return days.length ? days.join(', ') : 'Dias a definir'
}

const parseOpenDayLabel = (label = '') => {
  const clean = label.trim()
  if (clean === 'Todos los dias') return weekDays
  if (clean === 'Lun a Vie') return weekDays.slice(0, 5)
  if (clean === 'Lun a Sab') return weekDays.slice(0, 6)
  if (clean === 'Sab y Dom') return ['Sab', 'Dom']
  return clean.split(',').map((item) => item.trim()).filter((item) => weekDays.includes(item))
}

const parseTimeToMinutes = (time = '') => {
  const match = String(time).match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

const buildScheduleSlots = (schedule = {}) => {
  const days = schedule.openDays || schedule.open_days || []
  const mainSlot = schedule.openTime && schedule.closeTime
    ? [{ open: schedule.openTime, close: schedule.closeTime }]
    : []
  const splitSlot = schedule.splitHours && schedule.splitOpenTime && schedule.splitCloseTime
    ? [{ open: schedule.splitOpenTime, close: schedule.splitCloseTime }]
    : []

  return weekDays.reduce((result, day) => {
    if (!days.includes(day)) return result
    const isSaturday = day === 'Sab'
    const isSunday = day === 'Dom'
    const weekendSlot = schedule.weekendHours && (
      isSaturday && schedule.satOpenTime && schedule.satCloseTime
        ? [{ open: schedule.satOpenTime, close: schedule.satCloseTime }]
        : isSunday && schedule.sunOpenTime && schedule.sunCloseTime
          ? [{ open: schedule.sunOpenTime, close: schedule.sunCloseTime }]
          : null
    )
    result[day] = weekendSlot || [...mainSlot, ...splitSlot]
    return result
  }, {})
}

const parseScheduleLabel = (hours = '') => {
  if (!hours || !hours.includes(' - ')) return {}
  return String(hours).split('|').reduce((result, part) => {
    const [dayLabel, slotLabel] = part.split(' - ').map((item) => item.trim())
    if (!dayLabel || !slotLabel) return result
    const slots = slotLabel.split(' y ').map((slot) => {
      const [open, close] = slot.split(' a ').map((item) => item.trim())
      return open && close ? { open, close } : null
    }).filter(Boolean)
    parseOpenDayLabel(dayLabel).forEach((day) => {
      result[day] = slots
    })
    return result
  }, {})
}

const formatSlotGroup = (slots = []) => slots
  .filter((slot) => slot.open && slot.close)
  .map((slot) => `${slot.open} a ${slot.close}`)
  .join(' y ')

const formatSchedule = (schedule = {}) => {
  const { openDays = [], openTime = '', closeTime = '', hours = '' } = schedule || {}
  const slotsByDay = buildScheduleSlots(schedule)
  const groups = Object.entries(slotsByDay).reduce((result, [day, slots]) => {
    const label = formatSlotGroup(slots)
    if (!label) return result
    result[label] = [...(result[label] || []), day]
    return result
  }, {})
  const formattedGroups = Object.entries(groups).map(([slotLabel, days]) => `${formatOpenDays(days)} - ${slotLabel}`)
  if (formattedGroups.length) return formattedGroups.join(' | ')
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

const IMPULSO_TRIAL_DAYS = 60

const getFounderPaidUntil = (days = IMPULSO_TRIAL_DAYS) => {
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

const getCordobaClock = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Cordoba',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {})
  const dayByEnglishLabel = {
    Mon: 'Lun',
    Tue: 'Mar',
    Wed: 'Mie',
    Thu: 'Jue',
    Fri: 'Vie',
    Sat: 'Sab',
    Sun: 'Dom',
  }
  return {
    day: dayByEnglishLabel[parts.weekday],
    hours: Number(parts.hour),
    minutes: Number(parts.minute),
  }
}

const getOpenStatus = (business = {}) => {
  const safeBusiness = business || {}
  const days = safeBusiness.openDays || safeBusiness.open_days || []
  const openTime = safeBusiness.openTime || safeBusiness.open_time
  const closeTime = safeBusiness.closeTime || safeBusiness.close_time
  const clock = getCordobaClock()
  const day = clock.day
  const scheduleSlots = {
    ...buildScheduleSlots({
      ...safeBusiness,
      openDays: days,
      openTime,
      closeTime,
    }),
    ...parseScheduleLabel(safeBusiness.hours || safeBusiness.orderHours || ''),
  }

  if (safeBusiness.open === false) {
    return {
      open: false,
      label: 'Cerrado ahora',
      detail: safeBusiness.hours || safeBusiness.orderHours || formatSchedule({ openDays: days, openTime, closeTime }),
    }
  }

  const todaySlots = scheduleSlots[day] || []
  if (!todaySlots.length) {
    const hasAnySchedule = Object.values(scheduleSlots).some((slots) => slots?.length)
    return {
      open: hasAnySchedule ? false : safeBusiness.open !== false,
      label: hasAnySchedule ? 'Cerrado ahora' : 'Consultar horario',
      detail: safeBusiness.hours || safeBusiness.orderHours || 'Horario a confirmar',
    }
  }

  const minutesNow = clock.hours * 60 + clock.minutes
  let closesLabel = ''
  const isOpen = todaySlots.some((slot) => {
    const opensAt = parseTimeToMinutes(slot.open)
    let closesAt = parseTimeToMinutes(slot.close)
    if (opensAt === null || closesAt === null) return false
    let currentMinutes = minutesNow
    if (closesAt <= opensAt) {
      closesAt += 24 * 60
      if (currentMinutes < opensAt) currentMinutes += 24 * 60
    }
    const inSlot = currentMinutes >= opensAt && currentMinutes <= closesAt
    if (inSlot) closesLabel = slot.close
    return inSlot
  })

  return {
    open: isOpen,
    label: isOpen ? 'Abierto ahora' : 'Cerrado ahora',
    detail: isOpen ? `Hasta ${closesLabel}` : formatSchedule(safeBusiness),
  }
}

const getOfferOpenStatus = (offer = {}) => getOpenStatus({
  open: offer.open,
  hours: offer.hours,
  openDays: offer.openDays || offer.open_days || [],
  openTime: offer.openTime || offer.open_time || '',
  closeTime: offer.closeTime || offer.close_time || '',
})

const getOfferBusiness = (offer) => defaultBusinesses.find((business) => business.name === offer.business)

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

const inferScheduleDraft = (local = {}) => {
  const parsed = parseScheduleLabel(local.hours || '')
  const mondaySlots = parsed.Lun || []
  const saturdaySlots = parsed.Sab || []
  const sundaySlots = parsed.Dom || []
  const primary = mondaySlots[0] || saturdaySlots[0] || sundaySlots[0] || {}
  const split = mondaySlots[1] || {}
  const hasWeekendHours = Boolean(
    (saturdaySlots[0] && (saturdaySlots[0].open !== primary.open || saturdaySlots[0].close !== primary.close)) ||
    (sundaySlots[0] && (sundaySlots[0].open !== primary.open || sundaySlots[0].close !== primary.close))
  )

  return {
    openTime: local?.openTime || primary.open || '',
    closeTime: local?.closeTime || primary.close || '',
    splitHours: Boolean(split.open && split.close),
    splitOpenTime: split.open || '',
    splitCloseTime: split.close || '',
    weekendHours: hasWeekendHours,
    satOpenTime: saturdaySlots[0]?.open || '',
    satCloseTime: saturdaySlots[0]?.close || '',
    sunOpenTime: sundaySlots[0]?.open || '',
    sunCloseTime: sundaySlots[0]?.close || '',
  }
}

const buildLocalDraft = (local, account) => {
  const scheduleDraft = inferScheduleDraft(local || {})
  return ({
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
  openTime: scheduleDraft.openTime,
  closeTime: scheduleDraft.closeTime,
  splitHours: local?.splitHours || scheduleDraft.splitHours,
  splitOpenTime: local?.splitOpenTime || scheduleDraft.splitOpenTime,
  splitCloseTime: local?.splitCloseTime || scheduleDraft.splitCloseTime,
  weekendHours: local?.weekendHours || scheduleDraft.weekendHours,
  satOpenTime: local?.satOpenTime || scheduleDraft.satOpenTime,
  satCloseTime: local?.satCloseTime || scheduleDraft.satCloseTime,
  sunOpenTime: local?.sunOpenTime || scheduleDraft.sunOpenTime,
  sunCloseTime: local?.sunCloseTime || scheduleDraft.sunCloseTime,
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
}

const buildInitialBusinessDraftFromAccount = (account = {}) => {
  const businessType = account.businessType || 'local'
  const isEntrepreneur = businessType === 'entrepreneur'
  const hasPin = !isEntrepreneur && hasBusinessPin(account)
  const address = isEntrepreneur ? '' : (account.address || '')
  const locationMode = isEntrepreneur
    ? 'none'
    : account.locationMode === 'pin' && hasPin
      ? 'pin'
      : address.trim()
        ? 'address'
        : 'none'
  const openDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
  const openTime = '09:00'
  const closeTime = '21:00'
  const name = (account.businessName || account.name || 'Comercio del barrio').trim().replace(/\s+/g, ' ')

  return {
    name,
    businessType,
    hasPublicAddress: locationMode !== 'none',
    category: account.category || 'Comida',
    section: account.section || 'Liceo Procrear',
    address,
    reference: account.reference || '',
    locationMode,
    locationLat: locationMode === 'pin' ? account.locationLat || '' : '',
    locationLng: locationMode === 'pin' ? account.locationLng || '' : '',
    locationPrecision: locationMode === 'pin' ? account.locationPrecision || 'exact' : 'approximate',
    locationNote: locationMode === 'pin' ? account.locationNote || account.reference || '' : account.reference || '',
    hours: formatSchedule({ openDays, openTime, closeTime }),
    openDays,
    openTime,
    closeTime,
    splitHours: false,
    splitOpenTime: '',
    splitCloseTime: '',
    weekendHours: false,
    satOpenTime: '',
    satCloseTime: '',
    sunOpenTime: '',
    sunCloseTime: '',
    whatsapp: account.whatsapp || '',
    instagram: account.instagram || '',
    description: isEntrepreneur
      ? 'Emprendimiento del barrio. Contacto directo por WhatsApp o Instagram.'
      : 'Comercio del barrio. Contacto directo por WhatsApp.',
    paymentMethods: '',
    delivery: account.salesMode || (isEntrepreneur ? 'Coordinar por WhatsApp' : 'Retiro y delivery'),
    plan: 'gratis',
    planStatus: 'free',
    paidUntil: '',
    adminNotes: '',
    isPublic: true,
    open: true,
    image: '',
    imageZoom: 120,
    imagePosition: 'center center',
    menu: ensureMenuSlots([
      { name: '', price: '' },
      { name: '', price: '' },
      { name: '', price: '' },
      { name: '', price: '' },
      { name: '', price: '' },
    ]),
  }
}


const isUploadedImage = (image) => typeof image === 'string' && (
  image.startsWith('data:') ||
  image.startsWith('blob:') ||
  image.startsWith('http')
)

export {
  normalizeSearchText,
  getMapPointFromCoordinates,
  parseMapCoordinates,
  hasBusinessPin,
  getBusinessMapUrl,
  formatOpenDays,
  parseOpenDayLabel,
  parseTimeToMinutes,
  buildScheduleSlots,
  parseScheduleLabel,
  formatSlotGroup,
  formatSchedule,
  cleanPhoneDigits,
  normalizeArgentineWhatsapp,
  isValidArgentineWhatsapp,
  normalizePhone,
  makeWhatsAppUrl,
  toNoticeText,
  normalizeInstagramHandle,
  makeInstagramUrl,
  getBusinessMenu,
  hasBusinessPublicAddress,
  isFounderPlanActive,
  isFounderPlanRequested,
  isFounderPlanExpired,
  IMPULSO_TRIAL_DAYS,
  getFounderPaidUntil,
  MS_DAY,
  getDaysLeft,
  getFounderDaysLeft,
  isFounderExpiringSoon,
  isOfferExpired,
  isOfferPaused,
  isOfferActiveNow,
  getOfferDaysLeft,
  hasRealBusinessPhoto,
  isRecentBusiness,
  getPublicUrl,
  buildCercaWhatsAppMessage,
  getCordobaClock,
  getOpenStatus,
  getOfferOpenStatus,
  getOfferBusiness,
  getOfferWhatsappUrl,
  createMenuSlot,
  ensureMenuSlots,
  buildMenuSections,
  buildFilledMenuSections,
  mergeUniqueById,
  inferScheduleDraft,
  buildLocalDraft,
  buildInitialBusinessDraftFromAccount,
  isUploadedImage,
}
