import { describe, it, expect, vi } from 'vitest'
import { TeardownService } from '../src/electron/services/TeardownService'
import { SpaceshipApiClient } from '../src/electron/services/spaceship/SpaceshipApiClient'
import { ResendApiClient } from '../src/electron/services/resend/ResendApiClient'
import { SupabaseApiClient } from '../src/electron/services/supabase/SupabaseApiClient'
import { buildInfraDnsRecords } from '../src/shared/dnsRecords'

/**
 * These lock what "Arrêt du site" sends, and — just as much — what it reads
 * back as "gone". A card turns green on that read alone, so a 404 taken for
 * an error, or an error taken for a 404, is a card lying about a deletion.
 */

interface FakeCall {
  url: string
  method: string
  body: unknown
}

type Route = (call: FakeCall) => { status: number; body?: unknown } | undefined

function fakeFetch(route: Route) {
  const calls: FakeCall[] = []
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const call = {
      url: String(url),
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(init.body as string) : undefined,
    }
    calls.push(call)
    const res = route(call) ?? { status: 500, body: { message: `unrouted ${call.method} ${call.url}` } }
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      headers: new Headers(),
      text: async () => (res.body === undefined ? '' : JSON.stringify(res.body)),
    } as Response
  })
  return { impl: impl as unknown as typeof fetch, calls }
}

const noSleep = async () => {}

describe('SupabaseApiClient — shutdown', () => {
  it('reads a 404 project as gone', async () => {
    const { impl } = fakeFetch(() => ({ status: 404, body: { message: 'Not found' } }))
    const client = new SupabaseApiClient({ accessToken: 't', fetchImpl: impl })
    expect(await client.findProject('abc')).toBeNull()
  })

  it('sends DELETE /v1/projects/{ref} and tolerates a project already gone', async () => {
    const { impl, calls } = fakeFetch(() => ({ status: 404 }))
    await new SupabaseApiClient({ accessToken: 't', fetchImpl: impl }).deleteProject('abc')
    expect(calls[0]).toMatchObject({ method: 'DELETE', url: 'https://api.supabase.com/v1/projects/abc' })
  })
})

describe('ResendApiClient.deleteDomain', () => {
  it('sends DELETE /domains/{id}', async () => {
    const { impl, calls } = fakeFetch(() => ({ status: 200, body: { object: 'domain', id: 'd1', deleted: true } }))
    await new ResendApiClient({ apiKey: 're_x', fetchImpl: impl }).deleteDomain('d1')
    expect(calls[0]).toMatchObject({ method: 'DELETE', url: 'https://api.resend.com/domains/d1' })
  })

  it('treats a domain already gone as done', async () => {
    const { impl } = fakeFetch(() => ({ status: 404, body: { message: 'Domain not found' } }))
    await expect(new ResendApiClient({ apiKey: 're_x', fetchImpl: impl }).deleteDomain('d1')).resolves.toBeUndefined()
  })
})

describe('SpaceshipApiClient.deleteRecords', () => {
  const records = buildInfraDnsRecords('example.fr', '198.51.100.1', 'mail.example.fr')

  it('deletes only the deployment\'s records, exactly as the zone lists them', async () => {
    const zone = [
      { type: 'A', name: '@', address: '203.0.113.9', ttl: 3600 }, // older IPv4 — still the deployment's
      { type: 'A', name: 'config', address: '198.51.100.1', ttl: 3600 },
      { type: 'TXT', name: '_dmarc.mail', value: 'v=DMARC1;p=none;', ttl: 3600 },
      { type: 'MX', name: '@', exchange: 'mx.mailbox.example', preference: 10, ttl: 3600 }, // the reader's own
      { type: 'A', name: 'blog', address: '192.0.2.4', ttl: 3600 }, // the reader's own
    ]
    const { impl, calls } = fakeFetch(call =>
      call.method === 'GET' ? { status: 200, body: { items: zone, total: zone.length } } : { status: 204 },
    )

    const removed = await new SpaceshipApiClient({ apiKey: 'k', apiSecret: 's', fetchImpl: impl })
      .deleteRecords('example.fr', records)

    expect(removed).toBe(3)
    const del = calls.find(c => c.method === 'DELETE')!
    expect(del.url).toBe('https://spaceship.dev/api/v1/dns/records/example.fr')
    expect(del.body).toEqual(zone.slice(0, 3))
  })

  it('sends nothing when none of them are left', async () => {
    const { impl, calls } = fakeFetch(() => ({ status: 200, body: { items: [], total: 0 } }))
    const removed = await new SpaceshipApiClient({ apiKey: 'k', apiSecret: 's', fetchImpl: impl })
      .deleteRecords('example.fr', records)
    expect(removed).toBe(0)
    expect(calls.some(c => c.method === 'DELETE')).toBe(false)
  })
})

describe('TeardownService.probe', () => {
  it('only answers for the services it was asked about', async () => {
    const { impl } = fakeFetch(() => ({ status: 404 }))
    const probe = await new TeardownService(impl, noSleep).probe({ supabase: { accessToken: 't', ref: 'abc' } })
    expect(Object.keys(probe)).toEqual(['supabase'])
    expect(probe.supabase?.presence).toBe('absent')
  })

  it('treats a project going down as gone', async () => {
    const { impl } = fakeFetch(() => ({ status: 200, body: { id: '1', ref: 'abc', name: 'hk', status: 'GOING_DOWN' } }))
    const probe = await new TeardownService(impl, noSleep).probe({ supabase: { accessToken: 't', ref: 'abc' } })
    expect(probe.supabase?.presence).toBe('absent')
  })

  it('reports a refused key as unknown, never as gone', async () => {
    const { impl } = fakeFetch(() => ({ status: 401, body: { message: 'Unauthorized' } }))
    const probe = await new TeardownService(impl, noSleep).probe({ supabase: { accessToken: 't', ref: 'abc' } })
    expect(probe.supabase?.presence).toBe('unknown')
    expect(probe.supabase?.error).toBeTruthy()
  })

  it('reports a missing credential as unknown, with the reason', async () => {
    const { impl } = fakeFetch(() => undefined)
    const probe = await new TeardownService(impl, noSleep).probe({
      resend: { apiKey: '', mailSubdomain: 'mail.example.fr' },
    })
    expect(probe.resend).toMatchObject({ presence: 'unknown' })
    expect(probe.resend?.error).toMatch(/Resend/)
  })

  it('finds the Resend domain by name when the saved id is stale', async () => {
    const { impl } = fakeFetch(() => ({
      status: 200,
      body: { data: [{ id: 'new', name: 'mail.example.fr', status: 'verified' }] },
    }))
    const probe = await new TeardownService(impl, noSleep).probe({
      resend: { apiKey: 're_x', mailSubdomain: 'mail.example.fr', domainId: 'old' },
    })
    expect(probe.resend?.presence).toBe('present')
  })

  it('calls a Scaleway server gone only when every zone answered', async () => {
    const { impl } = fakeFetch(call =>
      call.url.includes('/servers?') ? { status: 200, body: { servers: [] } } : undefined,
    )
    const probe = await new TeardownService(impl, noSleep).probe({
      scaleway: { secretKey: 'k', ipv4: '198.51.100.1' },
    })
    expect(probe.scaleway?.presence).toBe('absent')
  })

  it('keeps a Scaleway server unknown when no zone could be asked', async () => {
    const { impl } = fakeFetch(() => ({ status: 403, body: { message: 'denied' } }))
    const probe = await new TeardownService(impl, noSleep).probe({
      scaleway: { secretKey: 'k', ipv4: '198.51.100.1' },
    })
    expect(probe.scaleway?.presence).toBe('unknown')
  })
})

describe('TeardownService.run — Supabase', () => {
  const project = { id: '1', ref: 'abc', name: 'hk', status: 'ACTIVE_HEALTHY' }

  it('reads errors after the deletion as "not finished yet", and ends green once gone', async () => {
    let reads = 0
    const { impl } = fakeFetch(call => {
      if (call.method === 'DELETE') return { status: 200, body: project }
      reads++
      // Still listed, then failing reads while Supabase tears it down, then gone.
      if (reads === 1) return { status: 200, body: project }
      if (reads <= 3) return { status: 400, body: { message: 'Project is being removed' } }
      return { status: 404 }
    })

    const result = await new TeardownService(impl, noSleep).run('supabase', {
      supabase: { accessToken: 't', ref: 'abc' },
    })

    expect(result.state.presence).toBe('absent')
    expect(reads).toBe(4)
  })

  it('hands over to "pending", never "unknown", when the deletion outlasts the wait', async () => {
    const { impl } = fakeFetch(call =>
      call.method === 'DELETE' ? { status: 200, body: project } : { status: 400, body: { message: 'busy' } },
    )

    const result = await new TeardownService(impl, noSleep).run('supabase', {
      supabase: { accessToken: 't', ref: 'abc' },
    })

    expect(result.state.presence).toBe('pending')
    expect(result.state.error).toBeUndefined()
  })
})

describe('TeardownService.run — Scaleway', () => {
  const server = {
    id: 'srv',
    name: 'intriqathon-1234',
    state: 'running',
    public_ip: { id: 'ip1', address: '198.51.100.1', dynamic: true },
    volumes: { '0': { id: 'v0', name: 'root', volume_type: 'l_ssd' } },
  }

  it('terminates a running server and waits until it is gone', async () => {
    let terminated = false
    let reads = 0
    const { impl, calls } = fakeFetch(call => {
      if (call.method === 'POST' && call.url.endsWith('/servers/srv/action')) {
        terminated = true
        return { status: 202, body: { task: {} } }
      }
      if (call.method === 'GET' && call.url.endsWith('/zones/fr-par-1/servers/srv')) {
        if (!terminated) return { status: 200, body: { server } }
        reads++
        return reads < 2 ? { status: 200, body: { server: { ...server, state: 'stopping' } } } : { status: 404 }
      }
      return undefined
    })

    const result = await new TeardownService(impl, noSleep).run('scaleway', {
      scaleway: { secretKey: 'k', serverId: 'srv', zone: 'fr-par-1' },
    })

    const action = calls.find(c => c.method === 'POST')!
    expect(action.body).toEqual({ action: 'terminate' })
    expect(result.state.presence).toBe('absent')
    expect(result.warnings).toEqual([])
  })

  it('deletes a stopped server, then its local volume', async () => {
    let deleted = false
    const stopped = { ...server, state: 'stopped' }
    const { impl, calls } = fakeFetch(call => {
      if (call.method === 'DELETE' && call.url.endsWith('/servers/srv')) {
        deleted = true
        return { status: 204 }
      }
      if (call.method === 'DELETE' && call.url.endsWith('/volumes/v0')) return { status: 204 }
      if (call.method === 'GET' && call.url.endsWith('/servers/srv')) {
        return deleted ? { status: 404 } : { status: 200, body: { server: stopped } }
      }
      return undefined
    })

    const result = await new TeardownService(impl, noSleep).run('scaleway', {
      scaleway: { secretKey: 'k', serverId: 'srv', zone: 'fr-par-1' },
    })

    expect(calls.filter(c => c.method === 'DELETE').map(c => c.url.split('/').slice(-2).join('/')))
      .toEqual(['servers/srv', 'volumes/v0'])
    expect(result.state.presence).toBe('absent')
  })

  it('hands back the Block Storage volumes, and names the flexible IP it keeps', async () => {
    let terminated = false
    const withExtras = {
      ...server,
      public_ip: { id: 'ip1', address: '198.51.100.1', dynamic: false },
      volumes: { ...server.volumes, '1': { id: 'v1', name: 'data', volume_type: 'sbs_volume', size: 20e9 } },
    }
    const { impl } = fakeFetch(call => {
      if (call.method === 'POST') {
        terminated = true
        return { status: 202 }
      }
      if (call.method === 'GET') return terminated ? { status: 404 } : { status: 200, body: { server: withExtras } }
      return undefined
    })

    const result = await new TeardownService(impl, noSleep).run('scaleway', {
      scaleway: { secretKey: 'k', serverId: 'srv', zone: 'fr-par-1' },
    })

    expect(result.detachedVolumes).toEqual([{ id: 'v1', name: 'data', zone: 'fr-par-1', size: 20e9 }])
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toMatch(/198\.51\.100\.1/)
  })
})

describe('TeardownService.deleteBlockVolumes', () => {
  const volume = { id: 'v1', name: 'data', zone: 'fr-par-1' }
  const volumeUrl = 'https://api.scaleway.com/block/v1/zones/fr-par-1/volumes/v1'

  it('waits for a volume still in use to be released, then deletes it', async () => {
    let reads = 0
    let readsAtDelete = 0
    let deleted = false
    const { impl, calls } = fakeFetch(call => {
      if (call.url !== volumeUrl) return undefined
      if (call.method === 'DELETE') {
        deleted = true
        readsAtDelete = reads
        return { status: 204 }
      }
      if (deleted) return { status: 404 }
      reads++
      return { status: 200, body: { id: 'v1', status: reads < 2 ? 'in_use' : 'available' } }
    })

    const result = await new TeardownService(impl, noSleep).deleteBlockVolumes({ secretKey: 'k', volumes: [volume] })

    expect(result).toEqual({ deleted: ['v1'], failed: [] })
    // Sent only once the volume read back as released, and only once.
    expect(readsAtDelete).toBe(2)
    expect(calls.filter(c => c.method === 'DELETE')).toHaveLength(1)
  })

  it('counts a volume already gone as deleted, without sending a DELETE', async () => {
    const { impl, calls } = fakeFetch(() => ({ status: 404 }))
    const result = await new TeardownService(impl, noSleep).deleteBlockVolumes({ secretKey: 'k', volumes: [volume] })
    expect(result.deleted).toEqual(['v1'])
    expect(calls.some(c => c.method === 'DELETE')).toBe(false)
  })

  it('keeps going after one failure, and reports it', async () => {
    const other = { id: 'v2', name: 'logs', zone: 'fr-par-1' }
    const { impl } = fakeFetch(call => {
      if (call.url.endsWith('/volumes/v1')) return { status: 403, body: { message: 'denied' } }
      return { status: 404 }
    })

    const result = await new TeardownService(impl, noSleep).deleteBlockVolumes({
      secretKey: 'k',
      volumes: [volume, other],
    })

    expect(result.deleted).toEqual(['v2'])
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0]).toMatchObject({ id: 'v1', name: 'data' })
    expect(result.failed[0].error).toMatch(/Access denied/)
  })
})
