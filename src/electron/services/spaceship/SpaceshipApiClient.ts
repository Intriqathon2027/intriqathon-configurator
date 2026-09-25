import type { DnsRecord } from '../../../shared/dnsRecords'

const SPACESHIP_BASE = 'https://spaceship.dev/api'
const MAX_ATTEMPTS = 4
const BASE_BACKOFF_MS = 1000
const PAGE_SIZE = 500

/** Same reasoning as the Supabase client: only these are worth retrying. */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])

function explainStatus(status: number): string | null {
  switch (status) {
    case 401:
      return "Clé API Spaceship refusée. Vérifiez la clé et le secret copiés depuis l'API Manager de Spaceship (étape 1) — un secret n'est affiché qu'à sa création."
    case 403:
      return "Accès refusé par Spaceship — la clé API n'a pas les permissions nécessaires. Activez `dnsrecords:read` et `dnsrecords:write` sur la clé, et vérifiez que le domaine appartient bien à ce compte."
    case 404:
      return "Domaine introuvable chez Spaceship. Vérifiez le nom de domaine de l'étape 1 : il doit être enregistré sur ce compte."
    case 429:
      return 'Trop de requêtes envoyées à Spaceship. Patientez quelques minutes avant de relancer.'
    default:
      return null
  }
}

export class SpaceshipApiError extends Error {
  readonly status: number

  constructor(status: number, url: string, detail: string) {
    const explanation = explainStatus(status)
    super(
      explanation
        ? (detail ? `${explanation} (${detail})` : explanation)
        : (detail ? `HTTP ${status} — ${detail}` : `HTTP ${status} sur ${url}`),
    )
    this.name = 'SpaceshipApiError'
    this.status = status
  }
}

/**
 * A record as the API returns and accepts it. The value lives under a
 * different key per type — `address` for an A, `value` for a TXT, `exchange`
 * plus `preference` for an MX — which is why nothing here is a plain
 * `{ name, value }`.
 */
export interface SpaceshipDnsItem {
  type: string
  name: string
  ttl?: number
  address?: string
  value?: string
  cname?: string
  exchange?: string
  preference?: number
}

interface ListResponse {
  items: SpaceshipDnsItem[]
  total: number
}

function extractMessage(raw: string): string {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string') return parsed
    const msg = parsed?.detail ?? parsed?.message ?? parsed?.error
    if (typeof msg === 'string') return msg
    // Spaceship reports field-level problems as `{ data: [{ field, details }] }`.
    if (Array.isArray(parsed?.data)) {
      const details = parsed.data
        .map((d: { field?: string; details?: string }) => [d.field, d.details].filter(Boolean).join(': '))
        .filter(Boolean)
      if (details.length > 0) return details.join(' ; ')
    }
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

/** Our shape onto the one the API takes, with the value under the right key. */
export function toSpaceshipItem(record: DnsRecord): SpaceshipDnsItem {
  const item: SpaceshipDnsItem = { type: record.type, name: record.host, ttl: record.ttl }
  switch (record.type) {
    case 'A':
    case 'AAAA':
      item.address = record.answer
      break
    case 'CNAME':
      item.cname = record.answer
      break
    case 'MX':
      item.exchange = record.answer
      item.preference = record.priority ?? 10
      break
    default:
      item.value = record.answer
  }
  return item
}

export interface SpaceshipApiClientOptions {
  apiKey: string
  apiSecret: string
  signal?: AbortSignal
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch
  /** Injectable for tests, so retry paths do not actually sleep. */
  sleepImpl?: (ms: number, signal?: AbortSignal) => Promise<void>
}

export class SpaceshipApiClient {
  private readonly apiKey: string
  private readonly apiSecret: string
  private readonly signal?: AbortSignal
  private readonly fetchImpl: typeof fetch
  private readonly sleepImpl: (ms: number, signal?: AbortSignal) => Promise<void>

  constructor(opts: SpaceshipApiClientOptions) {
    // Pasted credentials often carry a trailing newline; the header would still
    // be sent, just with a value nobody can match.
    this.apiKey = opts.apiKey.trim()
    this.apiSecret = opts.apiSecret.trim()
    this.signal = opts.signal
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch
    this.sleepImpl = opts.sleepImpl ?? sleep
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T | null> {
    const url = `${SPACESHIP_BASE}${path}`
    let lastError: SpaceshipApiError | null = null

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const response = await this.fetchImpl(url, {
        method,
        headers: {
          'X-API-Key': this.apiKey,
          'X-API-Secret': this.apiSecret,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: this.signal,
      })

      if (response.ok || response.status === 204) {
        if (response.status === 204) return null
        const text = await response.text()
        return text ? (JSON.parse(text) as T) : null
      }

      const detail = extractMessage(await response.text().catch(() => ''))
      lastError = new SpaceshipApiError(response.status, url, detail)

      if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_ATTEMPTS) throw lastError

      const retryAfter = Number(response.headers.get('retry-after'))
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : BASE_BACKOFF_MS * 2 ** (attempt - 1)
      await this.sleepImpl(waitMs, this.signal)
    }

    throw lastError ?? new SpaceshipApiError(0, url, 'Échec inconnu')
  }

  /** Cheap authenticated read — used to tell a bad key from a bad domain. */
  async listDomains(): Promise<{ name: string }[]> {
    const page = await this.request<{ items: { name: string }[] }>('GET', '/v1/domains?take=1&skip=0')
    return page?.items ?? []
  }

  async listRecords(domain: string): Promise<SpaceshipDnsItem[]> {
    const all: SpaceshipDnsItem[] = []
    let skip = 0
    let total = Number.POSITIVE_INFINITY

    while (skip < total) {
      const page = await this.request<ListResponse>(
        'GET',
        `/v1/dns/records/${encodeURIComponent(domain)}?take=${PAGE_SIZE}&skip=${skip}`,
      )
      const items = page?.items ?? []
      all.push(...items)
      total = page?.total ?? all.length
      skip += items.length
      if (items.length === 0) break
    }

    return all
  }

  /**
   * Writes the records, replacing whatever occupies the same name and type.
   *
   * The PUT alone does not do that: sending an A record for a name that
   * already has one leaves both in the zone, and a second run would have the
   * apex pointing at two addresses — the old instance and the new one. So the
   * conflicting records are deleted first, which is also what makes a re-run
   * after the IPv4 changes land on the right answer.
   *
   * Only the names this run is writing are touched; anything else the reader
   * keeps on the domain is left alone.
   */
  async saveRecords(domain: string, records: DnsRecord[]): Promise<void> {
    const items = records.map(toSpaceshipItem)
    const wanted = new Set(items.map(item => `${item.name.toLowerCase()}|${item.type.toUpperCase()}`))

    const existing = await this.listRecords(domain)
    const conflicting = existing.filter(item =>
      wanted.has(`${item.name.toLowerCase()}|${item.type.toUpperCase()}`),
    )

    if (conflicting.length > 0) {
      await this.request('DELETE', `/v1/dns/records/${encodeURIComponent(domain)}`, conflicting)
    }

    await this.request('PUT', `/v1/dns/records/${encodeURIComponent(domain)}`, {
      force: true,
      items,
    })
  }
}
