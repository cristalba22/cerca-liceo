import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { hasCatalogAccess } from '../src/lib/businessRules.js'
import { PublishScreen } from '../src/screens/merchant/PublishScreen.jsx'
import { MyPostsScreen, SplitHoursFields, WeekendHoursFields } from '../src/screens/merchant/MyPostsScreen.jsx'
import { ProfileScreen } from '../src/screens/AuthScreens.jsx'
import { BusinessDetailScreen } from '../src/screens/PublicScreens.jsx'

const local = {
  id: 'free-commerce', name: 'Comercio de prueba', plan: 'gratis', planStatus: 'free',
  category: 'Comida', section: 'Liceo Procrear', whatsapp: '3511234567',
  businessType: 'entrepreneur', locationMode: 'none', hours: 'Lun a Vie 09:00 a 18:00',
  openDays: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie'], openTime: '09:00', closeTime: '18:00',
  menu: [{ name: 'Producto visible gratis', price: '1500', available: true }],
}
const account = { type: 'merchant', businessName: local.name }
const forbidden = /Impulso|Fundador|2 meses|semanal|cupo extra|Probar gratis|cobro automatico/i

afterEach(() => vi.unstubAllGlobals())

describe('gratis hoy y siempre', () => {
  it.each([
    { plan: 'gratis', planStatus: 'free' },
    { plan: 'pedidos', planStatus: 'manual_pending' },
    { plan: 'orders', planStatus: 'past_due', paidUntil: '2020-01-01' },
  ])('no bloquea el catalogo por datos de planes antiguos: %j', (legacy) => {
    expect(hasCatalogAccess({ ...local, ...legacy })).toBe(true)
  })

  it('no inventa un comercio cuando todavia no existe', () => {
    expect(hasCatalogAccess(null)).toBe(false)
    expect(hasCatalogAccess({})).toBe(false)
  })

  it('permite preparar otra promo sin cupo semanal ni mensual', () => {
    const offers = Array.from({ length: 20 }, (_, id) => ({ id, businessId: local.id, createdAt: new Date().toISOString() }))
    const html = renderToStaticMarkup(<PublishScreen account={account} local={local} offers={offers} />)
    expect(html).toContain('Publicar promo gratis')
    expect(html).toContain('gratis hoy y siempre')
    expect(html).not.toMatch(forbidden)
  })

  it.each([false, true])('perfil y panel sin ventas de planes (Android: %s)', (android) => {
    vi.stubGlobal('document', { documentElement: { classList: { contains: () => android } } })
    for (const Screen of [ProfileScreen, MyPostsScreen]) {
      const html = renderToStaticMarkup(<Screen account={account} local={local} />)
      expect(html).not.toMatch(forbidden)
      expect(html).toMatch(/gratis/i)
    }
  })

  it('muestra el catalogo publico de un comercio con el antiguo plan gratis', () => {
    const html = renderToStaticMarkup(<BusinessDetailScreen business={local} />)
    expect(html).toContain('Producto visible gratis')
    expect(html).not.toMatch(forbidden)
  })

  it('no inventa productos en la vista previa de un catalogo vacio', () => {
    vi.stubGlobal('document', { documentElement: { classList: { contains: () => false } } })
    const html = renderToStaticMarkup(<MyPostsScreen account={account} local={{ ...local, menu: [] }} />)
    expect(html).not.toContain('Producto destacado')
  })

  it('explica y muestra los dos turnos del horario cortado', () => {
    const html = renderToStaticMarkup(<SplitHoursFields
      draft={{
        splitHours: true,
        splitOpenTime: '16:00',
        splitCloseTime: '20:00',
        weekendHours: false,
      }}
      onUpdate={() => {}}
    />)

    expect(html).toContain('¿Cierra al mediodia?')
    expect(html).toContain('Tarde abre')
    expect(html).toContain('Tarde cierra')
  })

  it('si abre solo el sabado no pide horarios del domingo', () => {
    const html = renderToStaticMarkup(<WeekendHoursFields
      draft={{
        openDays: ['Sab'],
        weekendHours: true,
        satOpenTime: '20:00',
        satCloseTime: '23:00',
        sunOpenTime: '',
        sunCloseTime: '',
      }}
      onUpdate={() => {}}
    />)

    expect(html).toContain('Abre sabado')
    expect(html).toContain('Abre domingo')
    expect(html).toContain('¿El sabado tiene otro horario?')
    expect(html).toContain('Sabado abre')
    expect(html).toContain('Sabado cierra')
    expect(html).not.toContain('Domingo abre')
    expect(html).not.toContain('Domingo cierra')
  })

  it('la migracion mantiene propietario y visibilidad, sin condiciones comerciales', () => {
    const sql = readFileSync(new URL('../supabase/free-forever.sql', import.meta.url), 'utf8')
    expect(sql).toContain('b.owner_id = auth.uid()')
    expect(sql).toContain('b.is_public = true')
    expect(sql).not.toMatch(/b\.plan|b\.paid_until|interval '7 days'/i)
    expect(sql).not.toMatch(/update public\.businesses|delete from|disable row level security/i)
  })
})
