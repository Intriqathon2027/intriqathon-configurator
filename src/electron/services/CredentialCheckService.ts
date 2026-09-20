import type { CredentialCheckRequest, CredentialCheckResult } from '../../types/credentials'

/**
 * A key is checked on every edit, so the probe has to be the cheapest
 * authenticated read each provider offers, and it must not retry: a key being
 * typed is wrong most of the way through, and hammering four APIs with
 * backoff for every keystroke would earn the reader a rate limit for their
 * trouble. The debounce lives in the renderer; this just answers once.
 */
const TIMEOUT_MS = 8_000

/** Only a refusal is conclusive. Anything else leaves the key unjudged. */
function classify(status: number): CredentialCheckResult {
  if (status >= 200 && status < 300) return { state: 'valid' }
  if (status === 401 || status === 403) return { state: 'invalid' }
  return { state: 'unknown' }
}

async function probe(url: string, headers: Record<string, string>): Promise<CredentialCheckResult> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', ...headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return classify(response.status)
  } catch {
    // Offline, DNS failure, timeout — nothing was learned about the key.
    return { state: 'unknown' }
  }
}

export function checkCredentials(req: CredentialCheckRequest): Promise<CredentialCheckResult> {
  switch (req.service) {
    case 'supabase':
      return probe('https://api.supabase.com/v1/organizations', {
        Authorization: `Bearer ${req.accessToken.trim()}`,
      })

    /**
     * The IAM listing rather than a project lookup: this answers for the
     * secret key alone, which is what the reader is being warned about. A
     * wrong project ID is a different mistake, and the Scaleway run reports it
     * with the context that makes it fixable.
     */
    case 'scaleway':
      return probe('https://api.scaleway.com/iam/v1alpha1/ssh-keys?page_size=1', {
        'X-Auth-Token': req.secretKey.trim(),
      })

    case 'spaceship':
      return probe('https://spaceship.dev/api/v1/domains?take=1&skip=0', {
        'X-API-Key': req.apiKey.trim(),
        'X-API-Secret': req.apiSecret.trim(),
      })

    case 'resend':
      return probe('https://api.resend.com/domains', {
        Authorization: `Bearer ${req.apiKey.trim()}`,
      })
  }
}
