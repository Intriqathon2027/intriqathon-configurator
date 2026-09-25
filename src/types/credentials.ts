/**
 * Live checking of the keys entered on "Création de comptes".
 *
 * A key that is merely *present* is what colours the account cards; this says
 * whether the provider actually accepts it. The distinction matters at the
 * step where it can still be fixed cheaply — the alternative is finding out
 * three steps later, in the middle of a run that was supposed to be automatic.
 */

export type CredentialService = 'supabase' | 'scaleway' | 'spaceship' | 'resend'

/**
 * `unknown` is its own answer, and not a synonym for invalid: a provider that
 * is down, rate-limiting, or simply unreachable from a laptop on a train says
 * nothing about the key. Only a refusal by the provider is reported to the
 * reader, so the warning never cries wolf.
 */
export type CredentialState = 'valid' | 'invalid' | 'unknown'

export interface CredentialCheckResult {
  state: CredentialState
}

export type CredentialCheckRequest =
  | { service: 'supabase'; accessToken: string }
  | { service: 'scaleway'; secretKey: string }
  | { service: 'spaceship'; apiKey: string; apiSecret: string }
  | { service: 'resend'; apiKey: string }
