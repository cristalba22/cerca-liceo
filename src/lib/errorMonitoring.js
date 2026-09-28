import { hasSupabaseConfig, siteUrl, supabase } from './supabaseClient'

const ERROR_SENT_KEY = 'cerca-liceo-error-reported'
const ignoredMessages = /ResizeObserver loop|Loading chunk .* failed|NetworkError when attempting to fetch/i

const cleanText = (value, max = 500) => String(value || '')
  .replace(/https?:\/\/[^\s]+/g, '[url]')
  .slice(0, max)

const deviceSummary = () => ({
  viewport: `${window.innerWidth}x${window.innerHeight}`,
  online: navigator.onLine,
  language: navigator.language,
  memory: navigator.deviceMemory || null,
  cores: navigator.hardwareConcurrency || null,
  motion: [...document.documentElement.classList].filter((name) => name.startsWith('motion-') || name === 'android-compat'),
})

const reportClientError = async (error, context = {}) => {
  if (!hasSupabaseConfig || !error) return
  const message = cleanText(error.message || error.reason || error)
  if (!message || ignoredMessages.test(message)) return

  const payload = {
    message,
    stack: cleanText(error.stack, 1200),
    page: `${window.location.pathname}${window.location.search}`,
    source: cleanText(context.source),
    line: context.line || null,
    column: context.column || null,
    release: import.meta.env.VITE_RELEASE || 'web',
    ...deviceSummary(),
  }

  try {
    await supabase.from('app_events').insert({ event_type: 'client_error', metadata: payload })
  } catch {
    // Monitoring must never interrupt the product flow.
  }

  if (window.sessionStorage.getItem(ERROR_SENT_KEY)) return
  window.sessionStorage.setItem(ERROR_SENT_KEY, '1')
  try {
    await supabase.functions.invoke('admin-alert', {
      body: {
        eventType: 'frontend_error',
        payload: { ...payload, siteUrl },
      },
    })
  } catch {
    // The database event remains available even if email delivery fails.
  }
}

const installErrorMonitoring = () => {
  window.addEventListener('error', (event) => {
    reportClientError(event.error || event.message, {
      source: event.filename,
      line: event.lineno,
      column: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    reportClientError(event.reason, { source: 'unhandledrejection' })
  })
}

export { installErrorMonitoring, reportClientError }
