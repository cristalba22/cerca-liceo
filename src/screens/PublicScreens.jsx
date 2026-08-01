import { useMemo, useState } from 'react'
import { ArrowLeft, BadgeCheck, Bell, ChevronRight, Clock3, Heart, MapPin, MessageCircle, Navigation, Search, Share2, ShieldCheck, Sparkles, Store } from 'lucide-react'

export function createPublicScreens(dependencies) {
  const { sections, categories, liceoMapEmbedUrl, liceoMapUrl, hasBusinessPin, getBusinessMapUrl, makeWhatsAppUrl, makeInstagramUrl, getBusinessMenu, hasBusinessPublicAddress, isFounderPlanActive, buildCercaWhatsAppMessage, getOpenStatus, getOfferOpenStatus, getOfferWhatsappUrl, MAX_MENU_ITEMS, MENU_SECTION_SIZE, menuCatalogSections, imageSurfaceProps, ThemeToggle } = dependencies

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

  return { DirectoryScreen, BusinessCard, BusinessDetailScreen, WelcomeScreen, DetailScreen, InfoItem, OfferCard }
}
