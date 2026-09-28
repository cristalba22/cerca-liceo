import { describe, expect, it } from 'vitest'
import { validateImageFile } from '../src/lib/media'

describe('validacion de fotos', () => {
  it('acepta los formatos publicables y un peso razonable', () => {
    expect(validateImageFile({ type: 'image/jpeg', size: 1_024 })).toBe('')
    expect(validateImageFile({ type: 'image/png', size: 1_024 })).toBe('')
    expect(validateImageFile({ type: 'image/webp', size: 1_024 })).toBe('')
  })

  it('acepta HEIC de iPhone por tipo MIME o extension', () => {
    expect(validateImageFile({ type: 'image/heic', name: 'foto.heic', size: 1_024 })).toBe('')
    expect(validateImageFile({ type: '', name: 'FOTO.HEIF', size: 1_024 })).toBe('')
  })

  it('rechaza archivos demasiado pesados antes de leerlos en memoria', () => {
    expect(validateImageFile({ type: 'image/jpeg', size: 30 * 1024 * 1024 + 1 })).toMatch(/30 MB/)
  })
})
