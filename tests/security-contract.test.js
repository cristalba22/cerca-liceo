import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSql = (name) => readFileSync(new URL(`../supabase/${name}`, import.meta.url), 'utf8')

describe('contrato de seguridad de Supabase', () => {
  it('revoca la lectura completa de businesses para anon y authenticated', () => {
    const sql = readSql('qa-audit-hardening.sql')
    expect(sql).toMatch(/revoke select on table public\.businesses from anon, authenticated/i)
    expect(sql).not.toMatch(/grant select\s+on table public\.businesses\s+to anon, authenticated/i)
  })

  it('mantiene las notas administrativas fuera de los grants publicos por columna', () => {
    const sql = readSql('public-read-grants.sql')
    const publicGrant = sql.match(/grant select\s*\(([\s\S]*?)\)\s*on public\.businesses to anon/i)?.[1] || ''
    expect(publicGrant).not.toContain('admin_notes')
  })

  it('protege el limite semanal con una funcion del servidor', () => {
    const sql = readSql('merchant-product-hardening.sql')
    expect(sql).toMatch(/function public\.can_create_weekly_free_offer/i)
    expect(sql).toMatch(/grant execute on function public\.can_create_weekly_free_offer\(uuid\) to authenticated/i)
  })
})
