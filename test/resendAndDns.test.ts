import { describe, it, expect, vi } from 'vitest'
import { ResendApiClient, ResendApiError } from '../src/electron/services/resend/ResendApiClient'
import { buildInfraDnsRecords, hostPart } from '../src/shared/dnsRecords'
import { checkCredentials } from '../src/electron/services/CredentialCheckService'

interface FakeCall {
  url: string
  method: string
  headers: Record<string, string>
  body: unknown
}

function fakeFetch(responses: { status: number; body?: unknown }[]) {
  const calls: FakeCall[] = []
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      method: init?.method ?? 'GET',
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(init.body as string) : undefined,
    })
    const next = responses[calls.length - 1] ?? { status: 200, body: {} }
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      headers: new Headers(),
      text: async () => (next.body === undefined ? '' : JSON.stringify(next.body)),
    } as Response
  })
  return { impl: impl as unknown as typeof fetch, calls }
}

/**
 * The `Host` field every registrar shows takes the name without the domain.
 * Getting this wrong is quiet: `config.domain.fr.domain.fr` is a perfectly
 * valid record that resolves for nobody, and it reads as correct in a table.
 */
describe('hostPart', () => {
  it('reduces the apex to @', () => {
    expect(hostPart('domain.fr', 'domain.fr')).toBe('@')
  })

  it('strips the domain from a subdomain', () => {
    expect(hostPart('mail.domain.fr', 'domain.fr')).toBe('mail')
    expect(hostPart('resend._domainkey.mail.domain.fr', 'domain.fr')).toBe('resend._domainkey.mail')
  })

  it('leaves a name that is already relative alone — which is how Resend sends them', () => {
    expect(hostPart('send.mail', 'domain.fr')).toBe('send.mail')
  })

  it('ignores a trailing dot on a fully qualified name', () => {
    expect(hostPart('mail.domain.fr.', 'domain.fr')).toBe('mail')
  })
})

describe('buildInfraDnsRecords', () => {
  const records = buildInfraDnsRecords('domain.fr', '198.51.100.1', 'mail.domain.fr')

  /** The whole point of the Scaleway step: that address has to reach the zone. */
  it('points both A records at the instance address', () => {
    const a = records.filter(r => r.type === 'A')
    expect(a.map(r => r.host).sort()).toEqual(['@', 'config'])
    expect(a.every(r => r.answer === '198.51.100.1')).toBe(true)
  })

  it('attaches DMARC to the sending subdomain, not the apex', () => {
    const dmarc = records.find(r => r.type === 'TXT')
    expect(dmarc?.host).toBe('_dmarc.mail')
  })

  it('follows a sending subdomain that is not mail.<domain>', () => {
    const custom = buildInfraDnsRecords('domain.fr', '198.51.100.1', 'envois.domain.fr')
    expect(custom.find(r => r.type === 'TXT')?.host).toBe('_dmarc.envois')
  })
})

/**
 * The step-1 warning, and with it the card's colour, hangs on a refusal being
 * recognised as one. Resend is the odd one out: it answers a key it does not
 * accept with 400, where the other three providers send 401 — and a 400 read
 * as "nothing learned" left the reader with a silent card on a dead key.
 */
describe('checkCredentials', () => {
  const answering = (status: number) =>
    vi.fn(async () => ({ status }) as Response)

  it('reads Resend’s 400 as a refusal', async () => {
    vi.stubGlobal('fetch', answering(400))
    expect(await checkCredentials({ service: 'resend', apiKey: 'nope' })).toEqual({ state: 'invalid' })
    vi.unstubAllGlobals()
  })

  it('still reads the usual 401 as a refusal', async () => {
    vi.stubGlobal('fetch', answering(401))
    expect(await checkCredentials({ service: 'resend', apiKey: 'nope' })).toEqual({ state: 'invalid' })
    vi.unstubAllGlobals()
  })

  it('leaves a key unjudged when the provider is merely unhappy', async () => {
    vi.stubGlobal('fetch', answering(500))
    expect(await checkCredentials({ service: 'resend', apiKey: 're_test' })).toEqual({ state: 'unknown' })
    vi.unstubAllGlobals()
  })

  it('accepts a key the provider answers', async () => {
    vi.stubGlobal('fetch', answering(200))
    expect(await checkCredentials({ service: 'resend', apiKey: 're_test' })).toEqual({ state: 'valid' })
    vi.unstubAllGlobals()
  })

  /**
   * 400 is Resend's alone — elsewhere it is a malformed request, which says
   * nothing about the key that came with it.
   */
  it('does not treat 400 as a refusal for the other providers', async () => {
    vi.stubGlobal('fetch', answering(400))
    expect(await checkCredentials({ service: 'scaleway', secretKey: 'nope' })).toEqual({ state: 'unknown' })
    vi.unstubAllGlobals()
  })
})

describe('ResendApiClient', () => {
  it('authenticates with a bearer token', async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { data: [] } }])
    await new ResendApiClient({ apiKey: 're_test', fetchImpl: impl }).listDomains()

    expect(calls[0].headers.Authorization).toBe('Bearer re_test')
  })

  it('creates the domain under the sending subdomain', async () => {
    const { impl, calls } = fakeFetch([
      { status: 200, body: { id: 'abc', name: 'mail.domain.fr', status: 'not_started', records: [] } },
    ])
    const domain = await new ResendApiClient({ apiKey: 're_test', fetchImpl: impl }).createDomain('mail.domain.fr')

    expect(calls[0].method).toBe('POST')
    expect(calls[0].url).toBe('https://api.resend.com/domains')
    expect(calls[0].body).toEqual({ name: 'mail.domain.fr' })
    expect(domain.id).toBe('abc')
  })

  it('asks for verification on the domain’s own path', async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { id: 'abc' } }])
    await new ResendApiClient({ apiKey: 're_test', fetchImpl: impl }).verifyDomain('abc')

    expect(calls[0].method).toBe('POST')
    expect(calls[0].url).toBe('https://api.resend.com/domains/abc/verify')
  })

  it('explains a refused key rather than reporting a status code', async () => {
    const { impl } = fakeFetch([{ status: 401, body: { message: 'API key is invalid' } }])
    const error = await new ResendApiClient({ apiKey: 'nope', fetchImpl: impl })
      .listDomains()
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ResendApiError)
    expect((error as ResendApiError).message).toMatch(/Clé API Resend refusée/)
  })

  it('does not retry a refusal', async () => {
    const { impl, calls } = fakeFetch([{ status: 401, body: {} }])
    await new ResendApiClient({ apiKey: 'nope', fetchImpl: impl }).listDomains().catch(() => null)

    expect(calls).toHaveLength(1)
  })
})
