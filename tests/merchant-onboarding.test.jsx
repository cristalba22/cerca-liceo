import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildInitialBusinessDraftFromAccount } from '../src/lib/businessRules.js'
import { RegisterScreen } from '../src/screens/AuthScreens.jsx'
import { MerchantFirstLocalScreen } from '../src/screens/merchant/MerchantFirstLocalScreen.jsx'

afterEach(() => vi.unstubAllGlobals())

describe('alta simple de comercios', () => {
  it('deja mapa, direccion y modalidad de venta para despues del registro', () => {
    vi.stubGlobal('document', { documentElement: { classList: { contains: () => false } } })
    const html = renderToStaticMarkup(<RegisterScreen initialType="merchant" />)

    expect(html).toContain('Nombre del comercio')
    expect(html).toContain('Rubro principal')
    expect(html).toContain('Foto, direccion, horarios y promociones se agregan cuando quieras')
    expect(html).not.toContain('Ubicacion inicial')
    expect(html).not.toContain('Como vendes hoy')
    expect(html).not.toContain('Pin mapa')
  })

  it('publica la ficha inicial sin exigir horarios ni direccion', () => {
    const html = renderToStaticMarkup(
      <MerchantFirstLocalScreen
        account={{
          type: 'merchant',
          businessName: 'Almacen del Barrio',
          whatsapp: '3517662142',
          category: 'Despensa',
          section: 'Liceo Procrear',
        }}
      />,
    )

    expect(html).toContain('Completa cuatro datos y publica')
    expect(html).toContain('Publicar mi comercio gratis')
    expect(html).not.toContain('type="time"')
    expect(html).not.toContain('Dias que abre')
  })

  it('no inventa que un comercio nuevo esta abierto', () => {
    const draft = buildInitialBusinessDraftFromAccount({
      businessName: 'Almacen del Barrio',
      whatsapp: '3517662142',
      category: 'Despensa',
      section: 'Liceo Procrear',
    })

    expect(draft.open).toBe(false)
    expect(draft.openDays).toEqual([])
    expect(draft.openTime).toBe('')
    expect(draft.hours).toBe('Horario a definir')
    expect(draft.isPublic).toBe(true)
  })
})
