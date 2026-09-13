import { describe, it, expect } from 'vitest'
import { ACCOUNT_REQUIRED_FIELDS, isAccountComplete, type AccountService } from '../src/utils/serviceCompletion'
import type { Config } from '../src/context/AppContext'

/** Every field filled — each case then empties exactly what it is about. */
function fullConfig(): Config {
  const config = {} as Config
  for (const fields of Object.values(ACCOUNT_REQUIRED_FIELDS)) {
    for (const field of fields) (config as Record<string, string>)[field] = 'x'
  }
  return config
}

const services = Object.keys(ACCOUNT_REQUIRED_FIELDS) as AccountService[]

describe('isAccountComplete', () => {
  it.each(services)('reports %s complete once its own fields are filled', service => {
    expect(isAccountComplete(fullConfig(), service)).toBe(true)
  })

  it.each(services)('reports %s incomplete while any one of its fields is missing', service => {
    for (const field of ACCOUNT_REQUIRED_FIELDS[service]) {
      const config = fullConfig()
      config[field] = ''
      expect(isAccountComplete(config, service)).toBe(false)
    }
  })

  it('keeps the services independent — an empty Resend key does not lock Supabase', () => {
    const config = fullConfig()
    config.RESEND_API_KEY = ''
    expect(isAccountComplete(config, 'supabase')).toBe(true)
    expect(isAccountComplete(config, 'resend')).toBe(false)
  })

  it('requires a settled project reference for Supabase, not just the credentials', () => {
    const config = fullConfig()
    config.SUPABASE_PROJECT_REF = ''
    expect(isAccountComplete(config, 'supabase')).toBe(false)
  })
})
