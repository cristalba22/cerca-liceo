import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')

describe('contrato visual del buscador principal', () => {
  it('conserva visible el panel cuando React agrega el estado de busqueda', () => {
    expect(appSource).toContain('search-panel is-motion-visible')
  })

  it('retira el radar decorativo y compacta la introduccion durante la busqueda', () => {
    expect(styles).toMatch(/\.search-panel\.is-searching \.home-radar-art\s*{[^}]*display:\s*none/s)
    expect(styles).toMatch(/\.search-panel\.is-searching > \.search-intro\s*{[^}]*width:\s*100%[^}]*min-height:\s*0/s)
  })
})
