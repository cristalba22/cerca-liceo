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
  }
}

