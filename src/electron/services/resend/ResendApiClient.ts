import type { ResendDomainStatus } from '../../../types/provision'

const RESEND_BASE = 'https://api.resend.com'
const MAX_ATTEMPTS = 4
const BASE_BACKOFF_MS = 1000

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])

function explainStatus(status: number): string | null {
  switch (status) {
    case 401:
      return "Clé API Resend refusée. Vérifiez la clé copiée depuis resend.com/api-keys (étape 1) — elle n'est affichée qu'à sa création."
    case 403:
      return "Accès refusé par Resend — la clé API est en lecture seule ou restreinte. Il en faut une avec les droits « Full access » pour créer et vérifier un domaine."
    case 404:
      return 'Domaine introuvable chez Resend.'
    case 422:
      return "Resend a refusé le domaine. Un sous-domaine déjà enregistré sur un autre compte Resend, ou un nom mal formé, sont les deux causes habituelles."
    case 429:
      return 'Trop de requêtes envoyées à Resend. Patientez une minute avant de relancer.'
    default:
      return null
  }
}

export class ResendApiError extends Error {
  readonly status: number

  constructor(status: number, url: string, detail: string) {
    const explanation = explainStatus(status)
    super(
      explanation
        ? (detail ? `${explanation} (${detail})` : explanation)
        : (detail ? `HTTP ${status} — ${detail}` : `HTTP ${status} sur ${url}`),
    )
    this.name = 'ResendApiError'
    this.status = status
  }
}

/**
 * One line of what Resend asks to be published. `record` says what it is for
 * (SPF, DKIM…), `type` is the DNS type, and `name` is relative to the
 * registered domain. `ttl` comes back as the string "Auto" rather than a
 * number, which is why nothing downstream reads it.
 */
export interface ResendDnsRecord {
  record: string
  name: string
  type: string
  value: string
  ttl?: string
  status?: string
  priority?: number
}

export interface ResendDomain {
  id: string
  name: string
  status: ResendDomainStatus
  region?: string
  records?: ResendDnsRecord[]
}

function extractMessage(raw: string): string {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string') return parsed
    const msg = parsed?.message ?? parsed?.error?.message ?? parsed?.name
    if (typeof msg === 'string') return msg
  } catch {
    // not JSON — fall through
  }
  return raw.slice(0, 300)
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export interface ResendApiClientOptions {
  apiKey: string
  signal?: AbortSignal
  fetchImpl?: typeof fetch
  sleepImpl?: (ms: number, signal?: AbortSignal) => Promise<void>
}

export class ResendApiClient {
  private readonly apiKey: string
  private readonly signal?: AbortSignal
  private readonly fetchImpl: typeof fetch
  private readonly sleepImpl: (ms: number, signal?: AbortSignal) => Promise<void>

  constructor(opts: ResendApiClientOptions) {
    this.apiKey = opts.apiKey.trim()
    this.signal = opts.signal
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch
    this.sleepImpl = opts.sleepImpl ?? sleep
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T | null> {
    const url = `${RESEND_BASE}${path}`
    let lastError: ResendApiError | null = null

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const response = await this.fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: this.signal,
      })

      if (response.ok) {
        if (response.status === 204) return null
        const text = await response.text()
        return text ? (JSON.parse(text) as T) : null
      }

      const detail = extractMessage(await response.text().catch(() => ''))
      lastError = new ResendApiError(response.status, url, detail)

      if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_ATTEMPTS) throw lastError

      const retryAfter = Number(response.headers.get('retry-after'))
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : BASE_BACKOFF_MS * 2 ** (attempt - 1)
      await this.sleepImpl(waitMs, this.signal)
    }

    throw lastError ?? new ResendApiError(0, url, 'Échec inconnu')
  }

  async listDomains(): Promise<ResendDomain[]> {
    const res = await this.request<{ data: ResendDomain[] }>('GET', '/domains')
    return res?.data ?? []
  }

  /** The creation response is the only one that carries the records straight away. */
  async createDomain(name: string, region?: string): Promise<ResendDomain> {
    const created = await this.request<ResendDomain>('POST', '/domains', {
      name,
      ...(region ? { region } : {}),
    })
    if (!created) throw new ResendApiError(0, '/domains', 'Réponse vide')
    return created
  }

  async getDomain(id: string): Promise<ResendDomain> {
    const domain = await this.request<ResendDomain>('GET', `/domains/${id}`)
    if (!domain) throw new ResendApiError(0, `/domains/${id}`, 'Réponse vide')
    return domain
  }

  /** Asks Resend to look at the DNS now; the check itself runs asynchronously. */
  async verifyDomain(id: string): Promise<void> {
    await this.request('POST', `/domains/${id}/verify`)
  }
}
