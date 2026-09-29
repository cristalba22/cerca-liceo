import { useState } from 'react'
import { ArrowLeft, Camera, Check, Clock, Home, Store, UserRound } from 'lucide-react'
import { sections, commerceCategories } from '../../lib/appConfig.js'
import {
  buildLocalDraft, ensureMenuSlots, normalizeArgentineWhatsapp, isValidArgentineWhatsapp,
} from '../../lib/businessRules'
import { ThemeToggle } from '../../components/AppChrome'

export function MerchantFirstLocalScreen({ account, onSaveLocal, onBack, onHome, onDone, onPublish, onToggleTheme }) {
  const [draft, setDraft] = useState(() => ({
    ...buildLocalDraft(null, account),
    name: account?.businessName || '',
    whatsapp: normalizeArgentineWhatsapp(account?.whatsapp || ''),
    section: account?.section || 'Liceo Procrear',
    category: account?.category || 'Comida',
    businessType: account?.businessType || 'local',
    locationMode: 'none',
    openDays: [],
    openTime: '',
    closeTime: '',
    delivery: account?.salesMode || 'WhatsApp',
  }))
  const [status, setStatus] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const updateDraft = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: field === 'whatsapp' ? value.replace(/\D/g, '').slice(0, 13) : value,
    }))
    setStatus('')
  }

  const updateBusinessType = (businessType) => {
    setDraft((current) => ({
      ...current,
      businessType,
      hasPublicAddress: businessType !== 'entrepreneur' && Boolean(current.address?.trim()),
      locationMode: businessType === 'entrepreneur' ? 'none' : current.address?.trim() ? 'address' : 'none',
      delivery: businessType === 'entrepreneur' ? 'Por encargo' : current.delivery || 'WhatsApp',
    }))
    setStatus('')
  }

  const submitFirstLocal = async () => {
    if (saving) return
    const missing = [
      !draft.name.trim() && 'nombre',
      !draft.whatsapp.trim() && 'WhatsApp',
      !draft.category && 'rubro',
      !draft.section && 'zona',
    ].filter(Boolean)

    if (missing.length) {
      setStatus(`Falta completar: ${missing.join(', ')}.`)
      return
    }

    if (!isValidArgentineWhatsapp(draft.whatsapp)) {
      setStatus('El WhatsApp debe ser argentino y solo numeros. Ejemplo: 3517662142.')
      return
    }

    setSaving(true)
    setStatus('Guardando ficha...')
    const hasAddress = draft.businessType !== 'entrepreneur' && Boolean(draft.address.trim())
    const result = await onSaveLocal({
      ...draft,
      name: draft.name.trim(),
      whatsapp: normalizeArgentineWhatsapp(draft.whatsapp),
      address: hasAddress ? draft.address.trim() : '',
      hasPublicAddress: hasAddress,
      locationMode: hasAddress ? 'address' : 'none',
      hours: draft.hours || '',
      menu: ensureMenuSlots(draft.menu),
      ready: true,
      isPublic: true,
    })
    setSaving(false)

    if (result?.ok === false) {
      setStatus(result.error?.message || 'No se pudo guardar la ficha. Proba de nuevo.')
      return
    }

    setSaved(true)
    setStatus('Listo. Tu comercio ya queda cargado en Cerca Liceo.')
  }

  if (account && account.type !== 'merchant') {
    return (
      <div className="utility-screen merchant-first-screen">
        <header className="detail-header">
          <button type="button" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <strong>Cargar comercio</strong>
          <ThemeToggle onToggleTheme={onToggleTheme} />
        </header>
        <section className="merchant-first-hero">
          <span>Cuenta vecino</span>
          <h1>Esta parte es para comercios.</h1>
          <p>Desde Mi usuario podes activar tu cuenta como comercio sin crear otra cuenta.</p>
          <button type="button" onClick={onBack}>Volver a mi cuenta</button>
        </section>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="utility-screen merchant-first-screen">
        <header className="detail-header">
          <button type="button" onClick={onHome} aria-label="Inicio">
            <Home size={22} />
          </button>
          <strong>Comercio cargado</strong>
          <ThemeToggle onToggleTheme={onToggleTheme} />
        </header>

        <section className="merchant-first-hero success">
          <span>Listo</span>
          <h1>Tu comercio ya esta en la guia.</h1>
          <p>Ahora podes revisar como quedo o publicar una promo gratis para que te vean mas rapido.</p>
          <div className="merchant-first-next-actions">
            <button type="button" onClick={onDone}>Ver panel</button>
            <button type="button" onClick={onPublish}>Publicar promo gratis</button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="utility-screen merchant-first-screen">
      <header className="detail-header">
        <button type="button" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <strong>Cargar comercio</strong>
        <ThemeToggle onToggleTheme={onToggleTheme} />
      </header>

      <section className="merchant-first-hero">
        <span>Un solo paso</span>
        <h1>Hace visible tu comercio.</h1>
        <p>Completa cuatro datos y publica. No hace falta tener foto, direccion ni horarios ahora.</p>
      </section>

      <section className="merchant-first-form">
        {status && (
          <div className={`merchant-first-status ${status.startsWith('Falta') || status.startsWith('El WhatsApp') ? 'error' : ''}`}>
            <Check size={17} />
            <span>{status}</span>
          </div>
        )}

        <div className="merchant-first-type">
          <button className={draft.businessType !== 'entrepreneur' ? 'active' : ''} type="button" onClick={() => updateBusinessType('local')}>
            <Store size={21} />
            <strong>Tengo local</strong>
            <small>Puedo poner direccion.</small>
          </button>
          <button className={draft.businessType === 'entrepreneur' ? 'active' : ''} type="button" onClick={() => updateBusinessType('entrepreneur')}>
            <UserRound size={21} />
            <strong>Sin local</strong>
            <small>Me escriben por WhatsApp.</small>
          </button>
        </div>

        <label>
          <span>{draft.businessType === 'entrepreneur' ? 'Nombre del emprendimiento' : 'Nombre del local'}</span>
          <input value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} placeholder="Ej: Almacen del Barrio" />
        </label>

        <div className="merchant-first-grid">
          <label>
            <span>Rubro</span>
            <select value={draft.category} onChange={(event) => updateDraft('category', event.target.value)}>
              {commerceCategories.map((category) => (
                <option key={category.name} value={category.name}>{category.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Zona</span>
            <select value={draft.section} onChange={(event) => updateDraft('section', event.target.value)}>
              {sections.filter((section) => section !== 'Todos').map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span>WhatsApp</span>
          <input inputMode="numeric" value={draft.whatsapp} onChange={(event) => updateDraft('whatsapp', event.target.value)} placeholder="3510000000" />
        </label>

        <div className="merchant-first-later" aria-label="Datos que podes agregar despues">
          <span><Camera size={17} /> Foto</span>
          <span><Clock size={17} /> Horarios</span>
          <span><Store size={17} /> Direccion</span>
        </div>

        <button className="merchant-first-submit" type="button" disabled={saving} onClick={submitFirstLocal}>
          {saving ? 'Guardando...' : 'Publicar mi comercio gratis'}
        </button>
        <small className="merchant-first-help">Listo: apareces en la guia. La foto, los horarios y la direccion se agregan despues desde tu panel.</small>
      </section>
    </div>
  )
}
