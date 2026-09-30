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

  it('mantiene el RPC anterior para clientes viejos y exige propietario', () => {
    const sql = readSql('free-forever.sql')
    expect(sql).toMatch(/function public\.can_create_weekly_free_offer/i)
    expect(sql).toMatch(/grant execute on function public\.can_create_weekly_free_offer\(uuid\) to authenticated/i)
    expect(sql).toContain('b.owner_id = auth.uid()')
  })

  it('protege la edicion administrativa de comercios', () => {
    const sql = readSql('admin-update-business.sql')
    expect(sql).toMatch(/function public\.admin_update_business/i)
    expect(sql).toContain('if not public.is_admin()')
    expect(sql).toMatch(/revoke all on function public\.admin_update_business\(uuid, jsonb\) from public, anon/i)
    expect(sql).toMatch(/grant execute on function public\.admin_update_business\(uuid, jsonb\) to authenticated/i)
  })
})
