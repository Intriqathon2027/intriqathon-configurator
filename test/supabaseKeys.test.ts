import { describe, it, expect } from 'vitest'
import {
  resolveKeyPair,
  needsKeyProvisioning,
  findLegacyServiceKey,
  MANAGED_KEY_NAME,
} from '../src/electron/services/supabase/keys'
import type { SupabaseApiKey } from '../src/electron/services/supabase/types'

const legacyAnon: SupabaseApiKey = { name: 'anon', type: 'legacy', api_key: 'eyJanon' }
const legacyService: SupabaseApiKey = { name: 'service_role', type: 'legacy', api_key: 'eyJservice' }
const publishable: SupabaseApiKey = { name: 'default', type: 'publishable', api_key: 'sb_publishable_abc' }
const secret: SupabaseApiKey = { name: 'default', type: 'secret', api_key: 'sb_secret_abc' }

describe('resolveKeyPair', () => {
  it('falls back to the legacy JWT pair when it is all the project has', () => {
    const pair = resolveKeyPair([legacyAnon, legacyService])
    expect(pair.anon).toEqual({ value: 'eyJanon', format: 'legacy', name: 'anon' })
    expect(pair.service).toEqual({ value: 'eyJservice', format: 'legacy', name: 'service_role' })
    expect(needsKeyProvisioning(pair)).toBe(false)
  })

  it('prefers the new generation when both are enabled', () => {
    const pair = resolveKeyPair([legacyAnon, legacyService, publishable, secret])
    expect(pair.anon?.format).toBe('publishable')
    expect(pair.service?.format).toBe('secret')
  })

  it('decides each half independently', () => {
    // A secret key that was never revealed is unusable — legacy fills that half.
    const hashedSecret: SupabaseApiKey = { name: 'ci', type: 'secret', api_key: null, hash: 'deadbeef' }
    const pair = resolveKeyPair([publishable, hashedSecret, legacyService])
    expect(pair.anon?.format).toBe('publishable')
    expect(pair.service?.format).toBe('legacy')
  })

  it('reports what is missing instead of returning a half-empty pair silently', () => {
    expect(needsKeyProvisioning(resolveKeyPair([legacyAnon]))).toBe(true)
    expect(needsKeyProvisioning(resolveKeyPair([]))).toBe(true)
  })

  it('reuses the key it created earlier, so a re-run does not pile up keys', () => {
    const mine: SupabaseApiKey = { name: MANAGED_KEY_NAME, type: 'secret', api_key: 'sb_secret_mine' }
    const other: SupabaseApiKey = { name: 'someone_else', type: 'secret', api_key: 'sb_secret_other' }
    const pair = resolveKeyPair([other, mine])
    expect(pair.service?.value).toBe('sb_secret_mine')
  })

  it('ignores masked keys — a reveal-less response must not land in the .env', () => {
    const masked: SupabaseApiKey = { name: 'anon', type: 'legacy', api_key: null }
    expect(resolveKeyPair([masked]).anon).toBeNull()
  })
})

describe('findLegacyServiceKey', () => {
  it('picks the JWT service_role key, the only one a browser may use', () => {
    expect(findLegacyServiceKey([secret, publishable, legacyService, legacyAnon])).toBe('eyJservice')
  })

  it('returns null when the project only offers new-generation keys', () => {
    expect(findLegacyServiceKey([secret, publishable])).toBeNull()
  })

  it('ignores a masked value — a key without its secret is no key at all', () => {
    expect(findLegacyServiceKey([{ name: 'service_role', type: 'legacy', api_key: null }])).toBeNull()
  })
})
