import { useEffect, useState } from 'react'
import { ArrowLeft, BadgeCheck, Check, Flame, Eye, Store } from 'lucide-react'

export function createAdminScreen(dependencies) {
  const { sections, commerceCategories, makeWhatsAppUrl, hasBusinessPublicAddress, isFounderPlanActive, isFounderPlanRequested, isFounderPlanExpired, isFounderExpiringSoon, isOfferExpired, isOfferPaused, isOfferActiveNow, getOfferDaysLeft, hasRealBusinessPhoto, isRecentBusiness, ThemeToggle } = dependencies

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
      if (isFounderPlanActive(business)) return 'Impulso activo'
      if (isFounderPlanExpired(business)) return 'Impulso vencido'
      if (isFounderPlanRequested(business)) return 'Impulso pendiente'
      return 'Publicado'
    }

    const getPlanActionLabel = (business) => {
      if (isFounderPlanActive(business)) return 'Quitar Impulso'
      if (isFounderPlanExpired(business)) return 'Renovar Impulso'
      if (isFounderPlanRequested(business)) return 'Activar Impulso'
      return 'Activar Impulso'
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
      { label: 'Impulso controlado', ok: pendingOrders.length === 0, value: pendingOrders.length ? `${pendingOrders.length} pendientes` : 'ok' },
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
          <p>Revisa altas, activa Impulso gratis por 2 meses, controla promos y limpia datos raros sin entrar a la base.</p>
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
            <span>Impulso pendiente</span>
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
            <span>Impulso por vencer</span>
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
            ['planes', `Impulso ${pendingOrders.length}`],
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
            <strong>Impulso manual</strong>
            <p>{pendingOrders.length ? `${pendingOrders.length} comercio(s) pidieron Impulso y esperan tu activacion.` : 'No hay solicitudes de Impulso pendientes.'}</p>
          </article>
        </section>

        <section className="admin-guidance">
          <div>
            <BadgeCheck size={18} />
            <strong>Regla de calidad</strong>
          </div>
          <p>Antes de compartir fuerte el link, apunta a pocos comercios bien cargados: foto real, WhatsApp, horario claro y promos vigentes. El catalogo solo cuenta si tienen Impulso activo.</p>
        </section>

        {!offerViews.includes(adminView) && (
        <section className="admin-list">
          <div className="feed-head compact">
            <div>
              <Store size={17} />
              <strong>{adminView === 'planes' ? 'Solicitudes Impulso' : adminView === 'por-vencer' ? 'Impulso por vencer' : adminView === 'sin-foto' ? 'Locales sin foto real' : adminView === 'sin-whatsapp' ? 'Locales sin WhatsApp' : adminView === 'nuevos' ? 'Nuevos esta semana' : adminView === 'locales' ? 'Todos los locales' : 'Locales para revisar'}</strong>
            </div>
            <span>{visibleAdminBusinesses.length ? `${visibleAdminBusinesses.length} items` : 'Todo bien'}</span>
          </div>
          {visibleAdminBusinesses.length === 0 && (
            <article className="admin-empty-state">
              <strong>No hay nada urgente aca.</strong>
              <p>Cuando un comercio quede incompleto, pida Impulso o se cargue algo nuevo, va a aparecer en esta vista.</p>
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
                <span>{isFounderPlanActive(business) ? 'Impulso activo' : isFounderPlanExpired(business) ? 'Impulso vencido' : isFounderPlanRequested(business) ? 'Pidio Impulso' : 'Ficha gratis'}</span>
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
                  <button type="button" onClick={() => onRenewFounder(business)}>Renovar 2 meses</button>
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

  return { AdminScreen }
}
