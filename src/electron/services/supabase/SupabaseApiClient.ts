import type {
  SupabaseApiKey,
  SupabaseAuthConfig,
  SupabaseBucket,
  SupabaseOrganization,
  SupabasePoolerConfig,
  SupabasePostgrestConfig,
  SupabaseProject,
  SupabaseServiceHealth,
} from './types'

const MANAGEMENT_BASE = 'https://api.supabase.com'
const MAX_ATTEMPTS = 4
const BASE_BACKOFF_MS = 1000

/** Rate limiting is per user (~60 req/min); `Retry-After` says how long to wait. */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])

/**
 * Supabase's own wording for an auth failure is not actionable on its own:
 * a well-formed but unknown token and a missing header both come back as the
 * single word "Unauthorized". These map a status onto what the reader can
 * actually do about it, keeping the provider's text only when it adds
 * something (a plan limit, a name conflict).
 */
const GENERIC_DETAILS = new Set(['unauthorized', 'forbidden', 'not found', 'bad request'])

function explainStatus(status: number): string | null {
  switch (status) {
    case 401:
      return "Jeton d'accès Supabase refusé. Il est bien formé mais Supabase ne le reconnaît pas : vérifiez qu'il n'a pas été révoqué ou régénéré, et qu'il a été copié en entier depuis Account ➔ Access Tokens."
    case 403:
      return "Accès refusé par Supabase — le jeton n'a pas les droits nécessaires sur cette organisation, ou une limite de plan est atteinte."
    case 404:
      return 'Ressource introuvable chez Supabase.'
    case 429:
      return "Trop de requêtes envoyées à Supabase. Patientez une minute avant de relancer."
    default:
      return null
  }
}

export class SupabaseApiError extends Error {
  readonly status: number
  readonly url: string
  readonly detail: string

  constructor(status: number, url: string, detail: string) {
    const explanation = explainStatus(status)
    const informative = detail && !GENERIC_DETAILS.has(detail.trim().toLowerCase())

    super(
      explanation
        ? (informative ? `${explanation} (${detail})` : explanation)
        : (detail ? `HTTP ${status} — ${detail}` : `HTTP ${status} sur ${url}`),
    )
    this.name = 'SupabaseApiError'
    this.status = status
    this.url = url
    this.detail = detail
  }
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  headers?: Record<string, string>
  /** Overrides the Management API origin — used for a project's Storage API. */
  baseUrl?: string
  /** Statuses to resolve as `null` instead of throwing (404 on a probe, 409 on a create). */
  tolerate?: number[]
}

export interface SupabaseApiClientOptions {
  accessToken: string
  signal?: AbortSignal
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch
  /** Injectable for tests, so retry paths do not actually sleep. */
  sleepImpl?: (ms: number, signal?: AbortSignal) => Promise<void>
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

/**
 * Supabase reports failures as `{ message }` — sometimes `{ error }`, sometimes
 * plain text. Pull out whatever is readable so the card shows the provider's
 * own wording ("project limit reached") rather than a bare status code.
 */
function extractMessage(raw: string): string {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string') return parsed
    const msg = parsed?.message ?? parsed?.error ?? parsed?.msg
    if (typeof msg === 'string') return msg
    if (Array.isArray(msg)) return msg.join(', ')
  } catch {
    // not JSON — fall through
  }
  return raw.slice(0, 300)
}

export class SupabaseApiClient {
  private readonly accessToken: string
  private readonly signal?: AbortSignal
  private readonly fetchImpl: typeof fetch
  private readonly sleepImpl: (ms: number, signal?: AbortSignal) => Promise<void>

  constructor(opts: SupabaseApiClientOptions) {
    // A token pasted from the dashboard often carries a trailing newline or
    // space; the header would still be sent, just with a value nobody can match.
    this.accessToken = opts.accessToken.trim()
    this.signal = opts.signal
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch
    this.sleepImpl = opts.sleepImpl ?? sleep
  }

  // ── Transport ────────────────────────────────────────────────────────────

  private buildUrl(path: string, opts: RequestOptions): string {
    const url = new URL(path, opts.baseUrl ?? MANAGEMENT_BASE)
    for (const [key, value] of Object.entries(opts.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
    return url.toString()
  }

  async request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T | null> {
    const url = this.buildUrl(path, opts)
    const headers: Record<string, string> = {
      Accept: 'application/json',
      // A Storage API call passes its own Authorization; the Management API uses the PAT.
      Authorization: `Bearer ${this.accessToken}`,
      ...opts.headers,
    }
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json'

    let lastError: SupabaseApiError | null = null

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const response = await this.fetchImpl(url, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: this.signal,
      })

      if (response.ok) {
        if (response.status === 204) return null
        const text = await response.text()
        return text ? (JSON.parse(text) as T) : null
      }

      if (opts.tolerate?.includes(response.status)) return null

      const detail = extractMessage(await response.text().catch(() => ''))
      lastError = new SupabaseApiError(response.status, url, detail)

      if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_ATTEMPTS) throw lastError

      const retryAfter = Number(response.headers.get('retry-after'))
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : BASE_BACKOFF_MS * 2 ** (attempt - 1)
      await this.sleepImpl(waitMs, this.signal)
    }

    throw lastError ?? new SupabaseApiError(0, url, 'Échec inconnu')
  }

  private async requireJson<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const result = await this.request<T>(method, path, opts)
    if (result === null) throw new SupabaseApiError(0, path, 'Réponse vide')
    return result
  }

  // ── Management API ───────────────────────────────────────────────────────

  listOrganizations(): Promise<SupabaseOrganization[]> {
    return this.requireJson<SupabaseOrganization[]>('GET', '/v1/organizations')
  }

  listProjects(): Promise<SupabaseProject[]> {
    return this.requireJson<SupabaseProject[]>('GET', '/v1/projects')
  }

  getProject(ref: string): Promise<SupabaseProject> {
    return this.requireJson<SupabaseProject>('GET', `/v1/projects/${ref}`)
  }

  /** `region_selection` is optional — omitted, Supabase picks a default region. */
  createProject(body: {
    name: string
    organization_slug: string
    db_pass: string
    region_selection?: { type: 'specific' | 'smartGroup'; code: string }
  }): Promise<SupabaseProject> {
    return this.requireJson<SupabaseProject>('POST', '/v1/projects', { body })
  }

  getHealth(ref: string, services: string[]): Promise<SupabaseServiceHealth[]> {
    return this.requireJson<SupabaseServiceHealth[]>('GET', `/v1/projects/${ref}/health`, {
      query: { services: services.join(','), timeout_ms: 5000 },
    })
  }

  /** Without `reveal`, every `api_key` comes back masked. */
  listApiKeys(ref: string): Promise<SupabaseApiKey[]> {
    return this.requireJson<SupabaseApiKey[]>('GET', `/v1/projects/${ref}/api-keys`, {
      query: { reveal: 'true' },
    })
  }

  createApiKey(ref: string, type: 'publishable' | 'secret', name: string): Promise<SupabaseApiKey> {
    return this.requireJson<SupabaseApiKey>('POST', `/v1/projects/${ref}/api-keys`, {
      query: { reveal: 'true' },
      body: { type, name },
    })
  }

  /**
   * Whether the JWT legacy keys are still enabled. The endpoint is itself
   * scheduled for removal, so a 404 means "legacy is gone", not "failure".
   */
  getLegacyKeysEnabled(ref: string): Promise<{ enabled: boolean } | null> {
    return this.request<{ enabled: boolean }>('GET', `/v1/projects/${ref}/api-keys/legacy`, {
      tolerate: [404],
    })
  }

  /** `enabled` is a query parameter here, not a body. */
  setLegacyKeysEnabled(ref: string, enabled: boolean): Promise<{ enabled: boolean } | null> {
    return this.request<{ enabled: boolean }>('PUT', `/v1/projects/${ref}/api-keys/legacy`, {
      query: { enabled: String(enabled) },
      tolerate: [404],
    })
  }

  getPoolerConfig(ref: string): Promise<SupabasePoolerConfig[]> {
    return this.requireJson<SupabasePoolerConfig[]>('GET', `/v1/projects/${ref}/config/database/pooler`)
  }

  listBuckets(ref: string): Promise<SupabaseBucket[]> {
    return this.requireJson<SupabaseBucket[]>('GET', `/v1/projects/${ref}/storage/buckets`)
  }

  /**
   * Runs SQL against the project's database, as the `postgres` role. The
   * response is the result set — an empty array for a statement that returns no
   * rows (a GRANT, an ALTER), which is why the return type is a row list rather
   * than a status.
   */
  runQuery<Row = Record<string, unknown>>(ref: string, query: string): Promise<Row[]> {
    return this.requireJson<Row[]>('POST', `/v1/projects/${ref}/database/query`, {
      body: { query },
    })
  }

  getPostgrestConfig(ref: string): Promise<SupabasePostgrestConfig> {
    return this.requireJson<SupabasePostgrestConfig>('GET', `/v1/projects/${ref}/postgrest`)
  }

  /** Only the fields passed are changed; the rest of the config is left alone. */
  updatePostgrestConfig(ref: string, body: SupabasePostgrestConfig): Promise<SupabasePostgrestConfig> {
    return this.requireJson<SupabasePostgrestConfig>('PATCH', `/v1/projects/${ref}/postgrest`, { body })
  }

  getAuthConfig(ref: string): Promise<SupabaseAuthConfig> {
    return this.requireJson<SupabaseAuthConfig>('GET', `/v1/projects/${ref}/config/auth`)
  }

  updateAuthConfig(ref: string, body: SupabaseAuthConfig): Promise<SupabaseAuthConfig> {
    return this.requireJson<SupabaseAuthConfig>('PATCH', `/v1/projects/${ref}/config/auth`, { body })
  }

  // ── Storage API (the project's own origin, authenticated with its service key) ──

  /**
   * There is no bucket-creation endpoint on the Management API — only a
   * listing. Creation goes through the project's Storage API instead, which
   * authenticates with the service_role/secret key rather than the PAT.
   *
   * Resolves `false` when the bucket already exists (409), so a re-run is a
   * no-op rather than a failure.
   */
  async createBucket(
    projectOrigin: string,
    serviceKey: string,
    bucket: { name: string; isPublic: boolean },
  ): Promise<boolean> {
    const created = await this.request<{ name: string }>('POST', '/storage/v1/bucket', {
      baseUrl: projectOrigin,
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      body: { id: bucket.name, name: bucket.name, public: bucket.isPublic },
      tolerate: [409],
    })
    return created !== null
  }
}
