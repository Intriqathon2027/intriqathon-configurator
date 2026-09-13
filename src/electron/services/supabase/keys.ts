import type { SupabaseApiKey } from './types'

/**
 * Picking the anon/service_role pair out of a project's API keys.
 *
 * Supabase runs two key generations side by side on the same project:
 *
 *   - legacy JWT keys, named `anon` and `service_role` (format `eyJ…`)
 *   - the new keys, `publishable` (`sb_publishable_…`) and `secret`
 *     (`sb_secret_…`)
 *
 * Both are accepted by `createClient(url, key)`, and nothing in the deployed
 * stack decodes the token — so either generation can fill SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY. We prefer the new format when a usable value is
 * available, because the legacy endpoints are documented as going away, and
 * fall back to legacy otherwise. The two halves are decided independently: a
 * publishable anon key alongside a legacy service_role key is a valid outcome.
 *
 * A `secret` key may be stored hashed and only ever revealed at creation, in
 * which case `api_key` comes back null and the entry is unusable — hence the
 * `hasUsableValue` filter rather than a plain `find` on `type`.
 */

/** Name given to keys this app creates, so a re-run reuses them instead of piling up. */
export const MANAGED_KEY_NAME = 'intriqathon_configurator'

export type KeyFormat = 'legacy' | 'publishable' | 'secret'

export interface ResolvedKey {
  value: string
  format: KeyFormat
  name: string
}

export interface ResolvedKeyPair {
  anon: ResolvedKey | null
  service: ResolvedKey | null
}

function hasUsableValue(key: SupabaseApiKey): boolean {
  return typeof key.api_key === 'string' && key.api_key.length > 0
}

function isLegacyService(key: SupabaseApiKey): boolean {
  return key.type === 'legacy' && key.name === 'service_role'
}

/**
 * The JWT-format `service_role` key, or null when the project offers none.
 *
 * Singled out because the config panel served at `config.<domain>` queries the
 * Data API straight from the browser with whatever service key it is handed,
 * and Supabase answers 401 "Forbidden use of secret API key in browser" to any
 * request that carries an Origin together with a `sb_secret_…` key. The legacy
 * format is therefore the only one that works there — while the deployed stack
 * keeps the secret key in its server-side .env, where it is the better choice.
 */
export function findLegacyServiceKey(keys: SupabaseApiKey[]): string | null {
  const found = keys.filter(hasUsableValue).find(isLegacyService)
  return found?.api_key ?? null
}

/**
 * Among several candidates, prefer the one this app created (stable across
 * re-runs), then any other. Keeps repeated provisioning deterministic.
 */
function pickPreferred(candidates: SupabaseApiKey[]): SupabaseApiKey | undefined {
  return candidates.find(k => k.name === MANAGED_KEY_NAME) ?? candidates[0]
}

export function resolveKeyPair(keys: SupabaseApiKey[]): ResolvedKeyPair {
  const usable = keys.filter(hasUsableValue)

  const publishable = pickPreferred(usable.filter(k => k.type === 'publishable'))
  const secret = pickPreferred(usable.filter(k => k.type === 'secret'))
  const legacyAnon = usable.find(k => k.type === 'legacy' && k.name === 'anon')
  const legacyService = usable.find(isLegacyService)

  const anonPick = publishable ?? legacyAnon
  const servicePick = secret ?? legacyService

  return {
    anon: anonPick
      ? { value: anonPick.api_key as string, format: anonPick.type === 'publishable' ? 'publishable' : 'legacy', name: anonPick.name }
      : null,
    service: servicePick
      ? { value: servicePick.api_key as string, format: servicePick.type === 'secret' ? 'secret' : 'legacy', name: servicePick.name }
      : null,
  }
}

/**
 * True when the project exposes no usable key for one of the two roles, and the
 * service therefore has to act — re-enable the legacy keys, or create new ones.
 */
export function needsKeyProvisioning(pair: ResolvedKeyPair): boolean {
  return pair.anon === null || pair.service === null
}

/** Human label for the log line, so the reader knows which generation landed in the .env. */
export function describeKeyFormat(format: KeyFormat): string {
  switch (format) {
    case 'legacy':
      return 'JWT legacy'
    case 'publishable':
      return 'publishable'
    case 'secret':
      return 'secret'
  }
}
