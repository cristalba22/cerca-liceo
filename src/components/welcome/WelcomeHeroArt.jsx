import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react'

const WelcomeHeroScene3D = lazy(() => import('./WelcomeHeroScene3D.jsx'))

class WelcomeSceneBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError?.()
  }

  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

function supportsRichWebGL() {
  const root = document.documentElement
  return root.classList.contains('motion-rich')
    && !root.classList.contains('android-compat')
    && typeof window.WebGLRenderingContext !== 'undefined'
}

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

export function WelcomeHeroArt({ variant = 'welcome' }) {
  const heroRef = useRef(null)
  const [richWebGL, setRichWebGL] = useState(false)
  const [nearViewport, setNearViewport] = useState(false)
  const [visible, setVisible] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const updateCapability = () => {
      const capable = supportsRichWebGL()
      setRichWebGL(capable)
      if (!capable) setSceneReady(false)
    }

    updateCapability()
    const classObserver = new MutationObserver(updateCapability)
    classObserver.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => classObserver.disconnect()
  }, [])

  useEffect(() => {
    const hero = heroRef.current
    if (!hero || !('IntersectionObserver' in window)) {
      setNearViewport(true)
      setVisible(true)
      return undefined
    }

    const preloadObserver = new IntersectionObserver(([entry]) => {
      setNearViewport(entry.isIntersecting)
      if (!entry.isIntersecting) setSceneReady(false)
    }, { rootMargin: '180px 0px', threshold: 0 })
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.08)
    }, { threshold: [0, 0.08, 0.35] })

    preloadObserver.observe(hero)
    visibilityObserver.observe(hero)
    return () => {
      preloadObserver.disconnect()
      visibilityObserver.disconnect()
    }
  }, [])

  const shouldMountScene = richWebGL && nearViewport
  const isHomeRadar = variant === 'home-radar'

  return (
    <div
      ref={heroRef}
      className={`${isHomeRadar ? 'home-radar-art' : 'welcome-art welcome-art-3d'} ${sceneReady ? 'is-3d-ready' : ''}`}
      data-decorative-3d
      aria-hidden="true"
    >
      {isHomeRadar ? (
        <>
          <div className="home-radar-fallback"><i></i><i></i><i></i></div>
          <span className="home-radar-label">Radar 3D</span>
        </>
      ) : <WelcomeHeroFallback />}
      {shouldMountScene && (
        <WelcomeSceneBoundary onError={() => setSceneReady(false)}>
          <Suspense fallback={null}>
            <WelcomeHeroScene3D active={visible} onReady={setSceneReady} />
          </Suspense>
        </WelcomeSceneBoundary>
      )}
      {!isHomeRadar && (
        <>
          <div className="welcome-3d-caption">
            <span>Radar vivo</span>
            <strong>Todo Liceo, en movimiento</strong>
          </div>
          <div className="welcome-orbit orbit-a">Comercios cerca</div>
          <div className="welcome-orbit orbit-b">Info actualizada</div>
          <div className="welcome-orbit orbit-c">Contacto directo</div>
        </>
      )}
    </div>
  )
}
