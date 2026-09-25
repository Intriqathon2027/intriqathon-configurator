import type { Config } from '../context/AppContext'
import type { CredentialService } from '../types/credentials'

/**
 * Remembering which keys a provider has refused, across a reload.
 *
 * A verdict takes a debounce plus a round trip to arrive, and until it does
 * the cards have nothing to go on: on a reload they would read as complete,
 * then correct themselves a second later. A refusal that is already known
 * spares the reader that flash, and spares the sidebar from ticking a step
 * whose keys cannot work.
 *
 * Only refusals are kept. A provider that accepts a key today may refuse it
 * tomorrow — a stored "valid" would outlive the fact it reports — whereas a
 * refusal only ever ends by the key being changed, which is precisely what
 * the fingerprint detects.
 */

const STORE_KEY = 'intriqathon-credential-refusals'

/** What each service's verdict is a verdict *about*. */
export function credentialMaterial(config: Config, service: CredentialService): string {
  switch (service) {
    case 'supabase':
      return config.SUPABASE_ACCESS_TOKEN
    case 'scaleway':
      return config.SCW_SECRET_KEY
    case 'spaceship':
      return `${config.SPACESHIP_API_KEY}:${config.SPACESHIP_API_SECRET}`
    case 'resend':
      return config.RESEND_API_KEY
  }
}

/**
 * FNV-1a, so what lands in localStorage is never the key itself — the question
 * asked of it is only ever "is this still the same string that was refused?",
 * and a collision costs at most one wrong verdict, corrected by the check that
 * runs on mount anyway.
 */
function fingerprint(value: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16)
}

type Refusals = Partial<Record<CredentialService, string>>

function read(): Refusals {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? (JSON.parse(raw) as Refusals) : {}
  } catch {
    return {}
  }
}

function write(refusals: Refusals): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(refusals))
  } catch {
    // Private browsing, a full quota — the verdict simply is not remembered.
  }
}

export function rememberRefusal(config: Config, service: CredentialService): void {
  write({ ...read(), [service]: fingerprint(credentialMaterial(config, service)) })
}

export function forgetRefusal(service: CredentialService): void {
  const refusals = read()
  if (!(service in refusals)) return
  delete refusals[service]
  write(refusals)
}

/** Whether the key currently on file is the very one that was refused. */
export function wasRefused(config: Config, service: CredentialService): boolean {
  const known = read()[service]
  return !!known && known === fingerprint(credentialMaterial(config, service))
}
