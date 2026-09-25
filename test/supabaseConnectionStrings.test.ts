import { describe, it, expect } from 'vitest'
import { buildPostgresUrls, projectUrl } from '../src/electron/services/supabase/connectionStrings'
import type { SupabasePoolerConfig } from '../src/electron/services/supabase/types'

const REF = 'abcdefghijklmnopqrst'

const transaction: SupabasePoolerConfig = {
  database_type: 'PRIMARY',
  pool_mode: 'transaction',
  db_user: `postgres.${REF}`,
  db_host: 'aws-0-eu-west-3.pooler.supabase.com',
  db_port: 6543,
  db_name: 'postgres',
  connection_string: 'postgresql://postgres.x:[YOUR-PASSWORD]@host:6543/postgres',
}

const session: SupabasePoolerConfig = { ...transaction, pool_mode: 'session', db_port: 5432 }

describe('buildPostgresUrls', () => {
  it('maps transaction mode to DATABASE_URL and session mode to DIRECT_URL', () => {
    const { databaseUrl, directUrl } = buildPostgresUrls({
      ref: REF, password: 'hunter2', pooler: [transaction, session],
    })
    expect(databaseUrl).toBe(`postgresql://postgres.${REF}:hunter2@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true`)
    expect(directUrl).toBe(`postgresql://postgres.${REF}:hunter2@aws-0-eu-west-3.pooler.supabase.com:5432/postgres`)
  })

  it('flags DATABASE_URL for pgbouncer once, and never DIRECT_URL', () => {
    const { databaseUrl, directUrl } = buildPostgresUrls({ ref: REF, password: 'hunter2', pooler: [transaction, session] })
    expect(databaseUrl.match(/pgbouncer=true/g)).toHaveLength(1)
    expect(directUrl).not.toContain('pgbouncer')
  })

  it('never leaves the [YOUR-PASSWORD] placeholder behind', () => {
    const urls = buildPostgresUrls({ ref: REF, password: 'hunter2', pooler: [transaction] })
    expect(urls.databaseUrl).not.toContain('[YOUR-PASSWORD]')
    expect(urls.directUrl).not.toContain('[YOUR-PASSWORD]')
  })

  it('derives session mode when the API lists only the transaction pooler', () => {
    const { directUrl } = buildPostgresUrls({ ref: REF, password: 'pw123456', pooler: [transaction] })
    expect(directUrl).toContain(':5432/postgres')
  })

  it('URL-encodes the password — the characters that silently break a pasted URL', () => {
    const { databaseUrl } = buildPostgresUrls({
      ref: REF, password: 'p@ss:w/rd?#x', pooler: [transaction],
    })
    expect(databaseUrl).toContain('p%40ss%3Aw%2Frd%3F%23x')
    // Exactly one "@" — the userinfo separator, not one from the password.
    expect(databaseUrl.split('@')).toHaveLength(2)
  })

  it('ignores read replicas', () => {
    const replica: SupabasePoolerConfig = { ...transaction, database_type: 'READ_REPLICA', db_host: 'replica.host' }
    const { databaseUrl } = buildPostgresUrls({ ref: REF, password: 'hunter2', pooler: [replica, transaction] })
    expect(databaseUrl).toContain('aws-0-eu-west-3.pooler.supabase.com')
  })

  it('falls back to the direct host when the project exposes no pooler', () => {
    const { databaseUrl, directUrl } = buildPostgresUrls({
      ref: REF, password: 'hunter2', pooler: [], databaseHost: `db.${REF}.supabase.co`,
    })
    expect(databaseUrl).toBe(`postgresql://postgres:hunter2@db.${REF}.supabase.co:5432/postgres`)
    expect(directUrl).toBe(databaseUrl)
  })
})

describe('projectUrl', () => {
  it('derives the project origin from the ref', () => {
    expect(projectUrl(REF)).toBe(`https://${REF}.supabase.co`)
  })
})
