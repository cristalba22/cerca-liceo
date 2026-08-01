import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getOpenStatus,
  isOfferActiveNow,
  isOfferExpired,
  isOfferPaused,
  isValidArgentineWhatsapp,
  normalizeArgentineWhatsapp,
} from '../src/App.jsx'

describe('WhatsApp argentino', () => {
  it('acepta un numero local de Cordoba', () => {
    expect(normalizeArgentineWhatsapp('351 766-2142')).toBe('3517662142')
    expect(isValidArgentineWhatsapp('351 766-2142')).toBe(true)
  })

  it('normaliza prefijos internacionales 54 y 549', () => {
    expect(normalizeArgentineWhatsapp('+54 9 351 766 2142')).toBe('3517662142')
    expect(normalizeArgentineWhatsapp('+54 351 766 2142')).toBe('3517662142')
  })

  it('rechaza numeros incompletos', () => {
    expect(isValidArgentineWhatsapp('351 123')).toBe(false)
  })
})

describe('vigencia de promociones', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-01T15:00:00-03:00'))
  })

  afterEach(() => vi.useRealTimers())

  it('mantiene visible una promo vigente', () => {
    const offer = { expiresAt: '2026-08-04T23:59:59-03:00' }
    expect(isOfferExpired(offer)).toBe(false)
    expect(isOfferActiveNow(offer)).toBe(true)
  })

  it('da de baja una promo vencida', () => {
    const offer = { expiresAt: '2026-07-31T23:59:59-03:00' }
    expect(isOfferExpired(offer)).toBe(true)
    expect(isOfferActiveNow(offer)).toBe(false)
  })

  it('respeta una pausa manual aunque la promo no haya vencido', () => {
    const offer = { expiresAt: '2026-08-04T23:59:59-03:00', paused: true }
    expect(isOfferPaused(offer)).toBe(true)
    expect(isOfferActiveNow(offer)).toBe(false)
  })
})

describe('horarios del comercio', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const splitSchedule = {
    openDays: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'],
    openTime: '09:00',
    closeTime: '13:00',
    splitHours: true,
    splitOpenTime: '17:00',
    splitCloseTime: '21:00',
    weekendHours: true,
    satOpenTime: '10:00',
    satCloseTime: '14:00',
  }

  it('abre durante el primer turno', () => {
    vi.setSystemTime(new Date('2026-08-03T10:30:00-03:00'))
    expect(getOpenStatus(splitSchedule).open).toBe(true)
  })

  it('cierra entre turnos y vuelve a abrir por la tarde', () => {
    vi.setSystemTime(new Date('2026-08-03T15:00:00-03:00'))
    expect(getOpenStatus(splitSchedule).open).toBe(false)
    vi.setSystemTime(new Date('2026-08-03T18:00:00-03:00'))
    expect(getOpenStatus(splitSchedule).open).toBe(true)
  })

  it('usa el horario especial del sabado', () => {
    vi.setSystemTime(new Date('2026-08-08T13:00:00-03:00'))
    expect(getOpenStatus(splitSchedule).open).toBe(true)
    vi.setSystemTime(new Date('2026-08-08T18:00:00-03:00'))
    expect(getOpenStatus(splitSchedule).open).toBe(false)
  })
})
