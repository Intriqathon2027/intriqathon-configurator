import { describe, it, expect, vi } from 'vitest'
import { SpaceshipApiClient, SpaceshipApiError, toSpaceshipItem } from '../src/electron/services/spaceship/SpaceshipApiClient'
import { buildInfraDnsRecords } from '../src/shared/dnsRecords'

/**
 * These lock the shape of what goes over the wire.
 *
 * There is no sandbox for this API and no test domain to point at, so nothing
 * here proves the records land — only that the request matches what the API
 * documents and what a working client against it sends. The value per type is
 * the part worth pinning: the same record's value lives under `address`,
 * `value` or `exchange` depending on its type, and a wrong key is accepted as
 * a well-formed request that configures nothing.
 */

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
    const next = responses[calls.length - 1] ?? { status: 200, body: { items: [], total: 0 } }
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      headers: new Headers(),
      text: async () => (next.body === undefined ? '' : JSON.stringify(next.body)),
    } as Response
  })
  return { impl: impl as unknown as typeof fetch, calls }
}

function client(fetchImpl: typeof fetch) {
  return new SpaceshipApiClient({ apiKey: 'key', apiSecret: 'secret', fetchImpl })
}

describe('toSpaceshipItem', () => {
  it('puts an A record’s address under `address`', () => {
    expect(toSpaceshipItem({ type: 'A', host: '@', answer: '198.51.100.1', ttl: 3600 })).toEqual({
      type: 'A',
      name: '@',
      ttl: 3600,
      address: '198.51.100.1',
    })
  })

  it('puts a TXT record’s text under `value`, not `data`', () => {
    const item = toSpaceshipItem({ type: 'TXT', host: '_dmarc.mail', answer: 'v=DMARC1;p=none;', ttl: 3600 })
    expect(item.value).toBe('v=DMARC1;p=none;')
    expect(item).not.toHaveProperty('data')
  })

  it('splits an MX record into `exchange` and `preference`', () => {
    const item = toSpaceshipItem({
      type: 'MX',
      host: 'send.mail',
      answer: 'feedback-smtp.eu-west-1.amazonses.com',
      ttl: 3600,
      priority: 10,
    })
    expect(item).toMatchObject({ exchange: 'feedback-smtp.eu-west-1.amazonses.com', preference: 10 })
    expect(item).not.toHaveProperty('priority')
  })

  it('defaults an MX with no stated preference rather than sending undefined', () => {
    const item = toSpaceshipItem({ type: 'MX', host: '@', answer: 'mx.example.com', ttl: 3600 })
    expect(item.preference).toBe(10)
  })
})

describe('SpaceshipApiClient.saveRecords', () => {
  it('authenticates with the key/secret header pair', async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { items: [], total: 0 } }, { status: 204 }])
    await client(impl).saveRecords('domain.fr', buildInfraDnsRecords('domain.fr', '198.51.100.1', 'mail.domain.fr'))

    expect(calls[0].headers['X-API-Key']).toBe('key')
    expect(calls[0].headers['X-API-Secret']).toBe('secret')
  })

  /**
   * The reason this client reads before it writes. A PUT alone leaves the
   * record already on that name in place, so a re-run after the instance is
   * rebuilt would have the apex answering with both addresses — the dead one
   * included.
   */
  it('deletes the records occupying the same name and type before writing', async () => {
    const existing = {
      items: [
        { type: 'A', name: '@', address: '203.0.113.9', ttl: 3600 },
        { type: 'TXT', name: 'unrelated', value: 'keep me', ttl: 3600 },
      ],
      total: 2,
    }
    const { impl, calls } = fakeFetch([{ status: 200, body: existing }, { status: 204 }, { status: 204 }])

    await client(impl).saveRecords('domain.fr', [
      { type: 'A', host: '@', answer: '198.51.100.1', ttl: 3600 },
    ])

    const del = calls.find(c => c.method === 'DELETE')
    expect(del?.body).toEqual([{ type: 'A', name: '@', address: '203.0.113.9', ttl: 3600 }])
  })

  it('leaves records it is not writing alone', async () => {
    const existing = { items: [{ type: 'TXT', name: 'unrelated', value: 'keep me', ttl: 3600 }], total: 1 }
    const { impl, calls } = fakeFetch([{ status: 200, body: existing }, { status: 204 }])

    await client(impl).saveRecords('domain.fr', [
      { type: 'A', host: '@', answer: '198.51.100.1', ttl: 3600 },
    ])

    expect(calls.some(c => c.method === 'DELETE')).toBe(false)
  })

  it('sends the records to the domain’s own path', async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { items: [], total: 0 } }, { status: 204 }])
    await client(impl).saveRecords('domain.fr', [
      { type: 'A', host: 'config', answer: '198.51.100.1', ttl: 3600 },
    ])

    const put = calls.find(c => c.method === 'PUT')
    expect(put?.url).toBe('https://spaceship.dev/api/v1/dns/records/domain.fr')
    expect(put?.body).toEqual({
      force: true,
      items: [{ type: 'A', name: 'config', ttl: 3600, address: '198.51.100.1' }],
    })
  })
})

describe('SpaceshipApiClient errors', () => {
  it('turns a 401 into something the reader can act on', async () => {
    const { impl } = fakeFetch([{ status: 401, body: { detail: 'Unauthorized' } }])
    const error = await client(impl).listRecords('domain.fr').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(SpaceshipApiError)
    expect((error as SpaceshipApiError).message).toMatch(/Clé API Spaceship refusée/)
  })

  it('explains a 403 as the missing DNS permission it usually is', async () => {
    const { impl } = fakeFetch([{ status: 403, body: {} }])
    await expect(client(impl).listRecords('domain.fr')).rejects.toThrow(/dnsrecords:write/)
  })

  it('does not retry a refusal', async () => {
    const { impl, calls } = fakeFetch([{ status: 401, body: {} }])
    await expect(client(impl).listRecords('domain.fr')).rejects.toThrow()
    expect(calls).toHaveLength(1)
  })
})

describe('SpaceshipApiClient.listRecords', () => {
  it('follows the pagination until the zone is exhausted', async () => {
    const page = (n: number) => ({
      items: Array.from({ length: n }, (_, i) => ({ type: 'A', name: `h${i}`, address: '198.51.100.1' })),
      total: 501,
    })
    const { impl, calls } = fakeFetch([
      { status: 200, body: page(500) },
      { status: 200, body: { items: [{ type: 'A', name: 'last', address: '198.51.100.1' }], total: 501 } },
    ])

    const records = await client(impl).listRecords('domain.fr')

    expect(records).toHaveLength(501)
    expect(calls[1].url).toContain('skip=500')
  })
})
