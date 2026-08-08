function WelcomeHeroFallback() {
  return (
    <div className="welcome-art-static" aria-hidden="true">
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
    </div>
  )
}

export function WelcomeHeroArt() {
  return (
    <div className="welcome-art" aria-hidden="true">
      <WelcomeHeroFallback />
      <div className="welcome-orbit orbit-a">Comercios cerca</div>
      <div className="welcome-orbit orbit-b">Info actualizada</div>
      <div className="welcome-orbit orbit-c">Contacto directo</div>
    </div>
  )
}
