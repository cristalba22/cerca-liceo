const MOTION_CLASSES = ['motion-rich', 'motion-lite', 'motion-reduced']

export function getMotionTier({
  reducedMotion = false,
  androidCompat = false,
  saveData = false,
  deviceMemory,
  hardwareConcurrency,
} = {}) {
  if (reducedMotion) return 'reduced'
  if (androidCompat || saveData) return 'lite'
  if (Number.isFinite(deviceMemory) && deviceMemory <= 4) return 'lite'
  if (Number.isFinite(hardwareConcurrency) && hardwareConcurrency <= 4) return 'lite'
  return 'rich'
}

export function installMotionMode() {
  const root = document.documentElement
  const reducedQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  let revealObserver = null
  let revealMutationObserver = null

  const revealImmediately = () => {
    document.querySelectorAll('[data-motion-reveal]').forEach((element) => {
      element.classList.add('is-motion-visible')
    })
  }

  const installRevealObserver = () => {
    if (revealObserver || !('IntersectionObserver' in window)) return

    const observeReveal = (element) => {
      if (!(element instanceof Element) || element.classList.contains('is-motion-visible')) return
      revealObserver.observe(element)
    }

    const observeTree = (node) => {
      if (!(node instanceof Element)) return
      if (node.matches('[data-motion-reveal]')) observeReveal(node)
      node.querySelectorAll('[data-motion-reveal]').forEach(observeReveal)
    }

    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-motion-visible')
        revealObserver.unobserve(entry.target)
      })
    }, {
      rootMargin: '0px 0px -9% 0px',
      threshold: 0.08,
    })

    revealMutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach(observeTree)
      })
    })
    revealMutationObserver.observe(document.body, { childList: true, subtree: true })
    document.querySelectorAll('[data-motion-reveal]').forEach(observeReveal)
    root.classList.add('motion-observer-ready')
  }

  const applyTier = () => {
    const tier = getMotionTier({
      reducedMotion: reducedQuery?.matches,
      androidCompat: root.classList.contains('android-compat'),
      saveData: navigator.connection?.saveData,
      deviceMemory: navigator.deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
    })

    root.classList.remove(...MOTION_CLASSES)
    root.classList.add(`motion-${tier}`)
    if (tier === 'rich') {
      installRevealObserver()
    } else {
      revealImmediately()
    }
    return tier
  }

  let tier = applyTier()
  const onPreferenceChange = () => {
    tier = applyTier()
  }
  reducedQuery?.addEventListener?.('change', onPreferenceChange)

  let longTaskCount = 0
  let performanceObserver = null
  if (tier === 'rich' && 'PerformanceObserver' in window) {
    try {
      performanceObserver = new PerformanceObserver((list) => {
        longTaskCount += list.getEntries().filter((entry) => entry.duration >= 90).length
        if (longTaskCount >= 3 && root.classList.contains('motion-rich')) {
          root.classList.remove('motion-rich')
          root.classList.add('motion-lite')
          performanceObserver?.disconnect()
        }
      })
      performanceObserver.observe({ type: 'longtask', buffered: true })
    } catch {
      performanceObserver = null
    }
  }

  const observerTimer = window.setTimeout(() => performanceObserver?.disconnect(), 8000)

  return () => {
    reducedQuery?.removeEventListener?.('change', onPreferenceChange)
    window.clearTimeout(observerTimer)
    performanceObserver?.disconnect()
    revealObserver?.disconnect()
    revealMutationObserver?.disconnect()
  }
}
