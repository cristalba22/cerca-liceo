import { useEffect, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Clock3, Camera, Flame, Eye, List, MapPin, MessageCircle, Navigation, ShieldCheck, ShoppingBasket, Store, Timer, UserRound } from 'lucide-react'
import { sections, weekDays, commerceCategories, MAX_MENU_ITEMS, MENU_SECTION_SIZE, menuCatalogSections } from '../../lib/appConfig.js'
import {
  parseMapCoordinates, hasBusinessPin, getBusinessMapUrl, formatSchedule,
  normalizeArgentineWhatsapp, isValidArgentineWhatsapp, makeWhatsAppUrl,
  hasBusinessPublicAddress, isFounderPlanActive, isFounderPlanRequested,
  getFounderDaysLeft, isFounderExpiringSoon, isOfferExpired, isOfferPaused,
  isOfferActiveNow, getOfferDaysLeft, createMenuSlot, ensureMenuSlots,
  buildFilledMenuSections, buildLocalDraft, isUploadedImage,
} from '../../lib/businessRules'
import { imageSurfaceProps, readCompressedImage } from '../../lib/media'
import { RealLocationPicker } from '../../components/RealLocationPicker'
import { ContactFooter, HomeReturnStrip, ThemeToggle } from '../../components/AppChrome'
import { BusinessCard } from '../PublicScreens'

const isAndroidCompatMode = () => document.documentElement.classList.contains('android-compat')

export function MyPostsScreen({ account, local, offers = [], metrics = {}, onSaveLocal, onBack, onHome, onPublish, onPauseOffer, onDeleteOffer, onRepostOffer, onToggleTheme, onPrivacy }) {
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
      localDraft.splitHours && (!localDraft.splitOpenTime.trim() || !localDraft.splitCloseTime.trim()) && 'horario de tarde',
      localDraft.weekendHours && localDraft.openDays.includes('Sab') && (!localDraft.satOpenTime.trim() || !localDraft.satCloseTime.trim()) && 'horario del sabado',
      localDraft.weekendHours && localDraft.openDays.includes('Dom') && (!localDraft.sunOpenTime.trim() || !localDraft.sunCloseTime.trim()) && 'horario del domingo',
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
      meta: founderActive ? 'Impulso activo' : founderRequested ? 'Solicitud pendiente' : 'Impulso gratis',
      optional: true,
    },
    {
      id: 'plan',
      done: Boolean(localDraft.plan),
      title: 'Impulso opcional',
      meta: founderActive ? 'Impulso activo' : founderRequested ? 'Impulso pendiente' : 'Ficha gratis',
      optional: true,
    },
  ]
  const dashboardTasks = [...requiredTasks, ...qualityTasks, ...optionalTasks]
  const pendingTasks = requiredTasks.filter((task) => !task.done)
  const pendingQualityTasks = qualityTasks.filter((task) => !task.done)
  const nextPanel = pendingTasks[0]?.id || 'preview'
  const localIsPublic = Boolean(local)
  const fichaFirstMode = !localIsPublic || pendingTasks.length > 0
  const showFounderTrial = localIsPublic && !founderActive
  const essentialFichaSteps = [
    {
      id: 'basic',
      title: 'Datos',
      text: 'Nombre y WhatsApp',
      done: requiredTasks[0].done,
      icon: Store,
    },
    {
      id: 'location',
      title: 'Ubicacion',
      text: localDraft.businessType === 'entrepreneur' ? 'Zona y horario' : 'Direccion y horario',
      done: requiredTasks[1].done,
      icon: MapPin,
    },
    {
      id: 'photo',
      title: 'Foto',
      text: isUploadedImage(localDraft.image) ? 'Foto cargada' : 'Ayuda a vender mas',
      done: qualityTasks[0].done,
      icon: Camera,
    },
  ]
  const publicStateLabel = localIsPublic
    ? pendingTasks.length
      ? 'Visible con datos pendientes'
      : pendingQualityTasks.length
        ? 'Ficha gratis activa'
        : 'Ficha completa'
    : 'Alta pendiente'
  const founderPlanUrl = makeWhatsAppUrl(
    '3517662142',
    `Hola Cristian, quiero activar Impulso Liceo gratis por 2 meses para ${localDraft.name || account?.businessName || 'mi comercio'}. Entiendo que se baja solo y no se cobra nada si no decido seguir.`
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
  const quickRepostOffer = expiredLocalOffers[0] || pausedLocalOffers[0] || activeLocalOffers[0] || null
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
      setSaveStatus('Guardando solicitud de Impulso Liceo...')
      const result = await onSaveLocal({
        ...nextDraft,
        name: nextDraft.name || 'Nombre del comercio',
        hours: formatSchedule(nextDraft),
        ready: true,
      })
      setSaveStatus(result?.ok === false
        ? (result.error?.message || 'No se pudo guardar la solicitud.')
        : 'Solicitud enviada. Cristian activa Impulso gratis por 2 meses. No se cobra nada.')
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
            Carga lo basico para aparecer gratis en la guia. Impulso Liceo suma extras gratis por 2 meses y se baja solo.
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
          <h2>{pendingTasks.length ? 'Primero publica tu ficha' : localIsPublic ? 'Lista para publicar promos' : 'Lista para guardar'}</h2>
          <p>{pendingTasks.length ? `Falta ${pendingTasks[0].title.toLowerCase()}. Completalo y guarda.` : pendingQualityTasks.length ? 'Ya podes aparecer. Sumale foto cuando puedas para dar mas confianza.' : 'Tu ficha esta completa.'}</p>
          <i style={{ '--progress': `${completion}%` }}></i>
        </section>

        {localIsPublic && pendingTasks.length === 0 && (
          <section className="android-safe-card android-safe-stats-card">
            <span>Tus resultados</span>
            <div>
              <strong>{metrics.businessViews || 0}<small>vieron ficha</small></strong>
              <strong>{metrics.offerViews || 0}<small>vieron promos</small></strong>
              <strong>{metrics.whatsappClicks || 0}<small>WhatsApp</small></strong>
            </div>
          </section>
        )}

        {quickRepostOffer && (
          <section className="android-safe-card android-safe-repost-card">
            <span>Republicar facil</span>
            <h2>{quickRepostOffer.title}</h2>
            <p>Usa la misma promo y vuelve a aparecer arriba por 3 o 4 dias.</p>
            <button type="button" onClick={() => onRepostOffer(quickRepostOffer)}>Republicar ahora</button>
          </section>
        )}

        <section className="android-safe-actions android-safe-main-actions" aria-label="Acciones principales">
          <button className={`safe-action-edit ${openPanel === 'basic' ? 'active' : ''}`} type="button" onClick={() => setOpenPanel(openPanel === 'basic' ? '' : 'basic')}>
            <Store size={20} />
            <span>
              <strong>{pendingTasks.length || !localIsPublic ? 'Publicar ficha' : 'Editar ficha'}</strong>
              <small>Gratis en la guia</small>
            </span>
          </button>
          <button className="safe-action-promo" type="button" onClick={handlePublishFromPanel}>
            <Flame size={20} />
            <span>
              <strong>Publicar promo</strong>
              <small>{pendingTasks.length || !localIsPublic ? 'Despues de la ficha' : '1 gratis semanal'}</small>
            </span>
          </button>
          <button className={`safe-action-menu ${openPanel === 'menu' ? 'active' : ''}`} type="button" onClick={() => setOpenPanel(founderActive ? (openPanel === 'menu' ? '' : 'menu') : (openPanel === 'plan' ? '' : 'plan'))}>
            <List size={20} />
            <span>
              <strong>{founderActive ? 'Catalogo' : 'Impulso Liceo'}</strong>
              <small>Opcional</small>
            </span>
          </button>
        </section>

        {localIsPublic && pendingTasks.length === 0 && (
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
        )}

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

          <div className="schedule-options">
            <button className={localDraft.splitHours ? 'active' : ''} type="button" onClick={() => updateLocalDraft('splitHours', !localDraft.splitHours)}>
              Horario cortado
            </button>
            <button className={localDraft.weekendHours ? 'active' : ''} type="button" onClick={() => updateLocalDraft('weekendHours', !localDraft.weekendHours)}>
              Sab/Dom distinto
            </button>
          </div>

          {localDraft.splitHours && (
            <div className="android-safe-two-cols">
              <label>
                <span>Tarde desde</span>
                <input type="time" value={localDraft.splitOpenTime} onChange={(event) => updateLocalDraft('splitOpenTime', event.target.value)} />
              </label>
              <label>
                <span>Tarde hasta</span>
                <input type="time" value={localDraft.splitCloseTime} onChange={(event) => updateLocalDraft('splitCloseTime', event.target.value)} />
              </label>
            </div>
          )}

          {localDraft.weekendHours && (
            <div className="weekend-schedule-grid">
              <label>
                <span>Sab desde</span>
                <input type="time" value={localDraft.satOpenTime} onChange={(event) => updateLocalDraft('satOpenTime', event.target.value)} />
              </label>
              <label>
                <span>Sab hasta</span>
                <input type="time" value={localDraft.satCloseTime} onChange={(event) => updateLocalDraft('satCloseTime', event.target.value)} />
              </label>
              <label>
                <span>Dom desde</span>
                <input type="time" value={localDraft.sunOpenTime} onChange={(event) => updateLocalDraft('sunOpenTime', event.target.value)} />
              </label>
              <label>
                <span>Dom hasta</span>
                <input type="time" value={localDraft.sunCloseTime} onChange={(event) => updateLocalDraft('sunCloseTime', event.target.value)} />
              </label>
            </div>
          )}

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
          <p>La publicacion gratis dura 3 dias y se vence sola. No necesitas Impulso para aparecer en la guia.</p>
        </section>

        <section className="android-safe-card android-safe-plan-card">
          <span>Impulso Liceo</span>
          <h2>Catalogo + pedidos.</h2>
          <p>Gratis por 2 meses: catalogo, pedidos por WhatsApp y 4 publicaciones extra. Se baja solo y no se cobra nada si no queres seguir.</p>
          <button type="button" onClick={requestFounderPlan}>
            {founderRequested || founderActive ? 'Consultar por WhatsApp' : 'Probar gratis 2 meses'}
          </button>
        </section>
        </>
        )}

        {openPanel === 'menu' && founderActive ? (
          <section className="android-safe-form android-safe-menu-form">
            <div className="android-safe-field-title">
              <span>Impulso activo</span>
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
                  <span>{item.price || 'Consultar'} Â· {item.section.shortTitle}</span>
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
            <p>{founderRequested ? 'Cuando Cristian active Impulso, aca vas a poder cargar catalogo y pedidos.' : 'El catalogo, pedidos y 4 extras se habilitan con Impulso Liceo.'}</p>
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
        <HomeReturnStrip onHome={onHome} />
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
      <HomeReturnStrip onHome={onHome} />

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

      {fichaFirstMode && (
        <section className="merchant-ficha-priority" aria-label="Completar ficha del comercio">
          <div className="merchant-ficha-priority-copy">
            <span>Para aparecer en la guia</span>
            <h2>Completa tu ficha.</h2>
            <p>Nombre, WhatsApp, ubicacion y horario. Guardas y ya queda claro para el vecino.</p>
          </div>
          <div className="merchant-ficha-priority-steps">
            {essentialFichaSteps.map((step) => {
              const StepIcon = step.icon
              return (
                <button
                  className={step.done ? 'done' : 'pending'}
                  type="button"
                  key={step.id}
                  onClick={() => setOpenPanel(step.id)}
                >
                  <StepIcon size={18} />
                  <strong>{step.title}</strong>
                  <small>{step.done ? 'Listo' : step.text}</small>
                </button>
              )
            })}
          </div>
          <button className="merchant-ficha-save" type="button" onClick={saveLocal}>
            {pendingTasks.length ? 'Guardar ficha' : 'Publicar ficha'}
          </button>
        </section>
      )}

      {!fichaFirstMode && (
      <section className="dashboard-actions dashboard-actions-large" aria-label="Acciones principales del comercio">
        <button className="dashboard-main-action" type="button" onClick={() => setOpenPanel(nextPanel)}>
          <Check size={18} />
          <span>{pendingTasks.length || !localIsPublic ? 'Publicar ficha' : 'Editar ficha'}</span>
        </button>
        <button className="dashboard-promo-action" type="button" onClick={handlePublishFromPanel}>
          <Flame size={18} />
          <span>Publicar promo</span>
        </button>
      </section>
      )}

      {!fichaFirstMode && (
      <section className={`dashboard-status-card ${localIsPublic && !pendingTasks.length ? 'is-published' : 'is-primary'}`}>
        <div>
          <span>{localIsPublic && !pendingTasks.length ? 'Ficha publicada' : 'Primer paso'}</span>
          <strong>{localIsPublic && !pendingTasks.length ? 'Tu ficha ya aparece.' : 'Publica tu ficha gratis.'}</strong>
          <p>{localIsPublic && !pendingTasks.length ? 'Ahora podes publicar una promo semanal gratis o editar tus datos cuando cambien.' : `Falta ${pendingTasks[0]?.title.toLowerCase() || 'guardar la ficha'}. Es lo primero para aparecer en la guia.`}</p>
        </div>
        <button type="button" onClick={saveLocal}>{localIsPublic && !pendingTasks.length ? 'Actualizar' : 'Publicar ficha'}</button>
      </section>
      )}

      {showFounderTrial && (
        <section className={`founder-trial-card ${founderRequested ? 'is-requested' : ''}`} aria-label="Probar Impulso Liceo gratis">
          <div>
            <span>{founderRequested ? 'Solicitud enviada' : 'Gratis 2 meses'}</span>
            <strong>{founderRequested ? 'Impulso pendiente.' : 'Proba Impulso Liceo.'}</strong>
            <p>{founderRequested ? 'Cristian lo activa y despues se baja solo. No se cobra nada.' : 'Catalogo, pedidos por WhatsApp y 4 promos extra. Se baja solo: no se cobra nada si no decidis seguir.'}</p>
          </div>
          {!founderRequested && (
            <div className="founder-trial-chips" aria-label="Incluye">
              <b>Sin tarjeta</b>
              <b>Se baja solo</b>
              <b>Sin cobro automatico</b>
            </div>
          )}
          <button type="button" onClick={() => window.open(founderPlanUrl, '_blank', 'noopener,noreferrer')}>
            {founderRequested ? 'Escribir a Cristian' : 'Activar gratis 2 meses'}
          </button>
          {!founderRequested && <small>Cuando termina, vuelve a ficha gratis. Cristian te consulta si queres seguir.</small>}
        </section>
      )}

      {localIsPublic && pendingTasks.length === 0 && (
        <section className="merchant-simple-results" aria-label="Estadisticas simples del comercio">
          <div>
            <span>Tus resultados</span>
            <strong>Asi se mueve tu comercio.</strong>
          </div>
          <article>
            <b>{metrics.businessViews || 0}</b>
            <small>vieron tu ficha</small>
          </article>
          <article>
            <b>{metrics.offerViews || 0}</b>
            <small>vieron promos</small>
          </article>
          <article>
            <b>{metrics.whatsappClicks || 0}</b>
            <small>tocaron WhatsApp</small>
          </article>
        </section>
      )}

      {quickRepostOffer && (
        <section className="merchant-repost-panel" aria-label="Republicar promocion">
          <div>
            <span>Republicar facil</span>
            <strong>{quickRepostOffer.title}</strong>
            <small>{isOfferExpired(quickRepostOffer) ? 'Vencida' : isOfferPaused(quickRepostOffer) ? 'Pausada' : 'Activa'} Â· {quickRepostOffer.price || 'Sin precio'}</small>
          </div>
          <button type="button" onClick={() => onRepostOffer(quickRepostOffer)}>Republicar</button>
        </section>
      )}

      {(expiringLocalOffers.length > 0 || isFounderExpiringSoon(localDraft)) && (
        <section className="merchant-alert-strip" aria-label="Avisos importantes">
          {isFounderExpiringSoon(localDraft) && (
            <article>
              <Timer size={17} />
              <span>Impulso vence en {Math.max(founderDaysLeft, 0)} dias. Si no queres seguir, vuelve solo a ficha gratis.</span>
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

      {localIsPublic && pendingTasks.length === 0 && (
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
      )}

      <section className={`local-builder ${fichaFirstMode ? 'local-builder-first' : ''}`}>
        <div className="merchant-hub-head">
          <div>
            <span>{fichaFirstMode ? 'Ficha gratis' : 'Editar ficha'}</span>
            <h2>{fichaFirstMode ? 'Datos del comercio' : localDraft.name || 'Tu comercio'}</h2>
            <p>{fichaFirstMode ? 'Toca el bloque que falta, completa y guarda.' : 'Toca una seccion, cambia el dato y guarda.'}</p>
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
                <div className="schedule-options wide">
                  <button className={localDraft.splitHours ? 'active' : ''} type="button" onClick={() => updateLocalDraft('splitHours', !localDraft.splitHours)}>
                    Horario cortado
                  </button>
                  <button className={localDraft.weekendHours ? 'active' : ''} type="button" onClick={() => updateLocalDraft('weekendHours', !localDraft.weekendHours)}>
                    Sab/Dom distinto
                  </button>
                </div>
                {localDraft.splitHours && (
                  <div className="split-schedule-grid wide">
                    <label>
                      <span>Tarde desde</span>
                      <input type="time" value={localDraft.splitOpenTime} onChange={(event) => updateLocalDraft('splitOpenTime', event.target.value)} />
                    </label>
                    <label>
                      <span>Tarde hasta</span>
                      <input type="time" value={localDraft.splitCloseTime} onChange={(event) => updateLocalDraft('splitCloseTime', event.target.value)} />
                    </label>
                  </div>
                )}
                {localDraft.weekendHours && (
                  <div className="weekend-schedule-grid wide">
                    <label>
                      <span>Sab desde</span>
                      <input type="time" value={localDraft.satOpenTime} onChange={(event) => updateLocalDraft('satOpenTime', event.target.value)} />
                    </label>
                    <label>
                      <span>Sab hasta</span>
                      <input type="time" value={localDraft.satCloseTime} onChange={(event) => updateLocalDraft('satCloseTime', event.target.value)} />
                    </label>
                    <label>
                      <span>Dom desde</span>
                      <input type="time" value={localDraft.sunOpenTime} onChange={(event) => updateLocalDraft('sunOpenTime', event.target.value)} />
                    </label>
                    <label>
                      <span>Dom hasta</span>
                      <input type="time" value={localDraft.sunCloseTime} onChange={(event) => updateLocalDraft('sunCloseTime', event.target.value)} />
                    </label>
                  </div>
                )}
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

          {!fichaFirstMode && panelButton('menu', 'Catalogo', 'Productos o servicios', founderActive ? `${filledMenuItems.length}/${MAX_MENU_ITEMS} items` : founderRequested ? 'Pendiente' : 'Impulso', ShoppingBasket)}
          {!fichaFirstMode && openPanel === 'menu' && (
            <div className="merchant-panel-body">
              {!founderActive ? (
                <section className="paid-feature-preview locked-feature">
                  <div>
                    <span>{founderRequested ? 'Solicitud pendiente' : 'Impulso Liceo'}</span>
                    <h3>El catalogo se activa cuando el admin habilita el plan.</h3>
                    <p>
                      Tu ficha gratis puede aparecer igual con foto, WhatsApp, horario y 1 promo semanal.
                      El catalogo, pedidos por WhatsApp y 4 publicaciones extra se prueban gratis 2 meses con Impulso.
                    </p>
                  </div>
                  <ul>
                    <li><Check size={14} /> Catalogo de productos o servicios</li>
                    <li><Check size={14} /> Pedido armado por WhatsApp</li>
                    <li><Check size={14} /> 4 publicaciones extra por mes</li>
                  </ul>
                  <button type="button" onClick={() => setOpenPanel('plan')}>
                    {founderRequested ? 'Ver solicitud' : 'Probar Impulso gratis'}
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
                      <small>{item.price || 'Consultar'} Â· {item.section.shortTitle}{item.available === false ? ' Â· Oculto' : ''}</small>
                    </button>
                  )) : (
                    <div className="menu-empty-state">
                      <strong>Tu catalogo todavia esta vacio.</strong>
                      <span>Toca â€œAgregar destacadosâ€ para cargar el primer producto, servicio o promo fija.</span>
                    </div>
                  )}
                </div>
                <div className="menu-editor-group menu-editor-focus">
                  <div className="menu-editor-group-head">
                    <strong>{activeMenuItem.name?.trim() ? 'Editando item' : 'Nuevo item'}</strong>
                    <small>{activeMenuSection.title} Â· lugar {activeMenuLocalIndex + 1}/5</small>
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

          {!fichaFirstMode && panelButton('plan', 'Impulso', 'Gratis 2 meses', founderActive ? 'Activo' : founderRequested ? 'Pendiente' : 'Disponible', ShoppingBasket)}
          {!fichaFirstMode && openPanel === 'plan' && (
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
                  <span>{founderActive ? 'Activo por admin' : founderRequested ? 'Pendiente de admin' : 'Prueba gratis'}</span>
                  <strong>Impulso Liceo</strong>
                  <small>Catalogo, 4 publicaciones extra al mes y pedido armado por WhatsApp. Gratis 2 meses.</small>
                  <b>Sin cobro automatico</b>
                </button>
              </section>

              <section className={`paid-feature-preview ${founderActive ? 'is-active' : ''}`}>
                <div>
                  <span>{founderActive ? 'Impulso activo' : founderRequested ? 'Solicitud pendiente' : 'Disponible gratis'}</span>
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
                  {founderRequested ? 'Avisar por WhatsApp' : founderActive ? 'Consultar Impulso' : 'Probar gratis 2 meses'}
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
                  <span>Impulso Liceo</span>
                  <strong>Catalogo + pedidos + extras</strong>
                  <p>Gratis por 2 meses. Incluye catalogo, 4 publicaciones extra al mes y pedido armado por WhatsApp.</p>
                  <b>Vuelve solo a ficha gratis</b>
                </article>
              </section>
            </div>
          )}

          {!fichaFirstMode && panelButton('preview', 'Vista previa', 'Asi lo ve el vecino', 'Ver ficha', Eye)}
          {!fichaFirstMode && openPanel === 'preview' && (
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
                        <span>Catalogo y pedidos se muestran cuando el admin activa Impulso Liceo.</span>
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

export function ManagedPost({ offer, status, action, secondaryAction, onAction, onSecondaryAction, onPause, onDelete }) {
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
