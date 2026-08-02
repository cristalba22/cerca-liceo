import { describe, expect, it } from 'vitest'
import { getMotionTier } from '../src/lib/motion.js'

describe('motion progresivo', () => {
  it('respeta la preferencia de movimiento reducido', () => {
    expect(getMotionTier({ reducedMotion: true })).toBe('reduced')
  })

  it('protege Android compatible y conexiones con ahorro de datos', () => {
    expect(getMotionTier({ androidCompat: true })).toBe('lite')
    expect(getMotionTier({ saveData: true })).toBe('lite')
  })

  it('limita equipos con pocos recursos y habilita equipos capaces', () => {
    expect(getMotionTier({ deviceMemory: 2, hardwareConcurrency: 8 })).toBe('lite')
    expect(getMotionTier({ deviceMemory: 8, hardwareConcurrency: 2 })).toBe('lite')
    expect(getMotionTier({ deviceMemory: 8, hardwareConcurrency: 8 })).toBe('rich')
  })
})
