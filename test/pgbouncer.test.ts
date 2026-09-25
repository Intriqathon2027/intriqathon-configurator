import { describe, it, expect } from 'vitest'
import { ensurePgBouncerFlag } from '../src/shared/pgbouncer'
import { generateEnvContent } from '../src/utils/deploy'

const POOLER = 'postgresql://postgres.ref:pw@aws-1-eu-west-3.pooler.supabase.com:6543/postgres'

describe('ensurePgBouncerFlag', () => {
  it('adds the flag to a transaction-pooler URL', () => {
    expect(ensurePgBouncerFlag(POOLER)).toBe(`${POOLER}?pgbouncer=true`)
  })

  it('is idempotent', () => {
    const once = ensurePgBouncerFlag(POOLER)
    expect(ensurePgBouncerFlag(once)).toBe(once)
  })

  it('appends with & when a query string already exists', () => {
    expect(ensurePgBouncerFlag(`${POOLER}?sslmode=require`)).toBe(`${POOLER}?sslmode=require&pgbouncer=true`)
  })

  it('respects an explicit pgbouncer value', () => {
    expect(ensurePgBouncerFlag(`${POOLER}?pgbouncer=false`)).toBe(`${POOLER}?pgbouncer=false`)
  })

  it('leaves session-mode and direct URLs alone', () => {
    const session = POOLER.replace(':6543/', ':5432/')
    const direct = 'postgresql://postgres:pw@db.ref.supabase.co:5432/postgres'
    expect(ensurePgBouncerFlag(session)).toBe(session)
    expect(ensurePgBouncerFlag(direct)).toBe(direct)
  })

  it('does not break on a pasted trailing newline', () => {
    expect(ensurePgBouncerFlag(`${POOLER}\n`)).toBe(`${POOLER}?pgbouncer=true`)
  })

  it('leaves an empty value empty', () => {
    expect(ensurePgBouncerFlag('')).toBe('')
  })
})

describe('generateEnvContent — manual DATABASE_URL', () => {
  it('adds the flag to a URL pasted without it', () => {
    expect(generateEnvContent({ DATABASE_URL: POOLER })).toContain(`DATABASE_URL=${POOLER}?pgbouncer=true\n`)
  })

  it('does not duplicate a flag already present', () => {
    const env = generateEnvContent({ DATABASE_URL: `${POOLER}?pgbouncer=true` })
    expect(env.match(/pgbouncer=true/g)).toHaveLength(1)
  })
})
