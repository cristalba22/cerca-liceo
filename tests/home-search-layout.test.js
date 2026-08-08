import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')

describe('contrato visual del buscador principal', () => {
  it('conserva visible el panel cuando React agrega el estado de busqueda', () => {
    expect(appSource).toContain('search-panel is-motion-visible')
  })

  it('mantiene el buscador sin radar decorativo y con la introduccion compacta', () => {
    expect(appSource).not.toContain('home-radar')
    expect(styles).not.toContain('.home-radar-art')
    expect(styles).toMatch(/\.search-panel > \.search-intro\s*{[^}]*width:\s*100%[^}]*min-height:\s*0/s)
  })
})
