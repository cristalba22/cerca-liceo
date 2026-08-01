import { useState } from 'react'
import { ArrowLeft, Camera, Check, ChevronRight, MapPin, MessageCircle, Sparkles } from 'lucide-react'
import { isFounderPlanActive, isUploadedImage, makeWhatsAppUrl } from '../../lib/businessRules'
import { imageSurfaceProps, readCompressedImage } from '../../lib/media'
import { HomeReturnStrip, ThemeToggle } from '../../components/AppChrome'

export function PublishScreen({ account, local, template, offers = [], onBack, onHome, onMerchantPanel, onPublishOffer, onToggleTheme }) {
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
    `Hola Cristian, quiero activar Impulso Liceo gratis por 2 meses para ${local?.name || account?.businessName || 'mi comercio'}. Entiendo que se baja solo y no se cobra nada si no decido seguir.`,
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
      <HomeReturnStrip onHome={onHome} />

      <section className={`publish-hero publish-hero-simple ${founderActive ? 'founder' : ''}`}>
        <span>{isEditingOffer ? 'Editar promo' : founderActive ? 'Impulso activo' : canPublish ? 'Promo gratis' : 'Falta local'}</span>
        <h1>{isEditingOffer ? 'Edita la promo.' : 'Nueva promo.'}</h1>
        <p>{canPublish ? 'Subi una foto, escribi que ofreces y publicala. Corta, clara y por WhatsApp.' : 'Primero completa tu ficha gratis para aparecer en la guia.'}</p>
      </section>

      <section className="merchant-status-card publish-status-simple">
        <div>
          <span>{canPublish ? 'Tu comercio' : 'Pendiente'}</span>
          <h2>{canPublish ? local.name : hasMerchantAccount ? 'Completa tu local' : 'Crea cuenta comercio'}</h2>
          <p>{canPublish ? 'La promo aparece en el inicio y el vecino escribe directo por WhatsApp.' : 'La ficha del local es gratis.'}</p>
        </div>
        <button type="button" onClick={onMerchantPanel}>
          {canPublish ? 'Panel' : 'Completar'}
        </button>
      </section>

      {founderActive && (
        <section className="publish-quota publish-quota-simple founder-publish-quota" aria-label="Cupo de publicaciones Impulso Liceo">
          <article className={freePostUsed ? '' : 'is-free'}>
            <span>Gratis semanal</span>
            <strong>{freePostUsed ? 'Usada' : 'Disponible'}</strong>
            <small>{freePostUsed ? 'Esta promo sale extra.' : 'Usala primero.'}</small>
          </article>
          <article className={isFounderExtraPost ? 'is-free' : ''}>
            <span>Extras Impulso</span>
            <strong>{founderExtraLeft}/{founderExtraLimit}</strong>
            <small>Mes actual.</small>
          </article>
        </section>
      )}

      <section className="upload-stage upload-stage-simple">
        <div>
          <Camera size={24} />
          <strong>{isUploadedImage(offerDraft.image) ? 'Foto lista' : 'Foto de la promo'}</strong>
          <span>{isUploadedImage(offerDraft.image) ? 'Se va a ver en el inicio.' : 'Opcional, pero ayuda mucho.'}</span>
        </div>
        <label className="file-pill">
          <input type="file" accept="image/*" onChange={handleOfferPhoto} />
          {isUploadedImage(offerDraft.image) ? 'Cambiar foto' : 'Agregar foto'}
        </label>
      </section>

      <section className="publish-grid publish-grid-simple">
        <div className={`publish-fast-card wide ${publishMissing.length === 0 ? 'ready' : ''}`}>
          <span>{publishMissing.length === 0 ? 'Lista para publicar' : 'Falta poco'}</span>
          <strong>{publishMissing.length === 0 ? 'Toca publicar.' : `Falta ${publishMissing[0]}.`}</strong>
          <p>{publishMissing.length === 0 ? 'La promo aparece en inicio y vence sola.' : 'Completa solo lo necesario. La foto es opcional.'}</p>
          {!offerDraft.title && !offerDraft.description && (
            <button type="button" onClick={applySuggestion}>Completar ejemplo</button>
          )}
        </div>
        <label className="publish-field wide">
          <span>Titulo de la promo</span>
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
      <section className="delivery-setup delivery-setup-simple">
        <div className="delivery-setup-copy">
          <span>WhatsApp</span>
          <h2>Pedido o consulta</h2>
          <p>Elegis si el vecino arma pedido, consulta o pide envio.</p>
        </div>
        <div className="delivery-toggle-grid">
          <button className={offerDraft.ordersEnabled ? 'active' : ''} type="button" onClick={() => updateOfferDraft('ordersEnabled', !offerDraft.ordersEnabled)}>
            <strong>{offerDraft.ordersEnabled ? 'Pedido activo' : 'Solo consulta'}</strong>
            <small>WhatsApp armado</small>
          </button>
          <button className={offerDraft.hasDelivery ? 'active' : ''} type="button" onClick={() => updateOfferDraft('hasDelivery', !offerDraft.hasDelivery)}>
            <strong>{offerDraft.hasDelivery ? 'Delivery si' : 'Sin delivery'}</strong>
            <small>Envio opcional</small>
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

      <button
        className="primary-action publish-main-submit"
        type="button"
        onClick={canPublish
          ? (freePostUsed && !founderActive ? () => window.open(founderPlanUrl, '_blank', 'noopener,noreferrer') : publishPreparedOffer)
          : onMerchantPanel}
      >
        {canPublish ? (canSendOffer ? (isEditingOffer ? 'Guardar promo' : freePostUsed ? 'Publicar extra' : 'Publicar promo gratis') : freePostUsed && !founderActive && !isEditingOffer ? 'Probar Impulso gratis' : `Falta ${publishMissing[0]}`) : 'Completar local primero'}
      </button>

      <section className="publish-rules-card">
        <span>Como funciona</span>
        <strong>Tenes 1 publicacion gratis por semana.</strong>
        <p>Dura 3 o 4 dias y se baja sola. Si queres probar mas herramientas, Impulso Liceo suma 4 promos extra, catalogo y pedidos por WhatsApp gratis por 2 meses.</p>
        {!founderActive && (
          <button type="button" onClick={() => window.open(founderPlanUrl, '_blank', 'noopener,noreferrer')}>
            Probar Impulso gratis
          </button>
        )}
      </section>

      <div className="publish-checks">
        <span><Check size={15} /> 1 semanal gratis</span>
        <span><Check size={15} /> Precio opcional</span>
        <span><Check size={15} /> Baja automatica</span>
        <span><Check size={15} /> Sin comision</span>
      </div>
    </div>
  )
}

export function PublishPreviewCard({ offer, local, draft }) {
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
