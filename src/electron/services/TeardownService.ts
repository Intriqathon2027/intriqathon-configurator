import { SupabaseApiClient } from './supabase/SupabaseApiClient'
import { ResendApiClient } from './resend/ResendApiClient'
import { SpaceshipApiClient } from './spaceship/SpaceshipApiClient'
import {
  ScalewayInstanceClient,
  serverAddresses,
  type ScalewayServer,
} from './scaleway/ScalewayInstanceClient'
import type {
  BlockVolumeDeleteRequest,
  BlockVolumeDeleteResult,
  ScalewayBlockVolume,
  TeardownProbe,
  TeardownRequest,
  TeardownRunResult,
  TeardownService as TeardownServiceName,
  TeardownServiceState,
} from '../../types/teardown'

/** Statuses Supabase reports for a project that is gone, or on its way out. */
const SUPABASE_GONE = new Set(['REMOVED', 'GOING_DOWN'])

/**
 * How long a Supabase deletion is followed before the card hands over to
 * "under way": 36 reads, 5 s apart — three minutes.
 */
const SUPABASE_DELETE_POLLS = 36
const SUPABASE_DELETE_POLL_MS = 5_000

/** Volumes `terminate` deletes along with the server; anything else is only detached. */
const LOCAL_VOLUME_TYPES = new Set(['l_ssd', 'scratch'])

/**
 * Deletes what a deployment left at each provider, and says whether it is
 * still there.
 *
 * The page colours a card from `probe` alone, never from a click: "the delete
 * call returned" and "the resource is gone" are different claims — a Scaleway
 * termination takes a minute, a Supabase project goes through GOING_DOWN —
 * and only the second is worth a green card. So every deletion ends by reading
 * the state back.
 */
export class TeardownService {
  private readonly fetchImpl?: typeof fetch
  private readonly sleepImpl?: (ms: number) => Promise<void>

  /** Both injectable for tests; the defaults are the real fetch and timers. */
  constructor(fetchImpl?: typeof fetch, sleepImpl?: (ms: number) => Promise<void>) {
    this.fetchImpl = fetchImpl
    this.sleepImpl = sleepImpl
  }

  async probe(req: TeardownRequest): Promise<TeardownProbe> {
    const services = (['supabase', 'scaleway', 'resend', 'spaceship'] as const)
      .filter(service => req[service])

    const states = await Promise.all(services.map(service => this.settle(() => this.read(service, req))))
    return Object.fromEntries(services.map((service, i) => [service, states[i]]))
  }

  async run(service: TeardownServiceName, req: TeardownRequest): Promise<TeardownRunResult> {
    switch (service) {
      case 'supabase': return this.deleteSupabase(req)
      case 'scaleway': return this.deleteScaleway(req)
      case 'resend': return this.deleteResend(req)
      case 'spaceship': return this.deleteSpaceship(req)
    }
  }

  /** A read that throws has learned nothing — which is not the same as "gone". */
  private async settle(read: () => Promise<TeardownServiceState>): Promise<TeardownServiceState> {
    try {
      return await read()
    } catch (err) {
      return { presence: 'unknown', error: err instanceof Error ? err.message : String(err) }
    }
  }

  private read(service: TeardownServiceName, req: TeardownRequest): Promise<TeardownServiceState> {
    switch (service) {
      case 'supabase': return this.readSupabase(req)
      case 'scaleway': return this.readScaleway(req).then(({ state }) => state)
      case 'resend': return this.readResend(req).then(({ state }) => state)
      case 'spaceship': return this.readSpaceship(req)
    }
  }

  // ── Supabase ──────────────────────────────────────────────────────────────

  private supabase(req: TeardownRequest): { client: SupabaseApiClient; ref: string } {
    const s = req.supabase
    if (!s?.accessToken || !s.ref) throw new Error('Supabase access token or project reference missing (Step 1).')
    return {
      client: new SupabaseApiClient({ accessToken: s.accessToken, fetchImpl: this.fetchImpl, sleepImpl: this.sleepImpl }),
      ref: s.ref,
    }
  }

  private async readSupabase(req: TeardownRequest): Promise<TeardownServiceState> {
    const { client, ref } = this.supabase(req)
    const project = await client.findProject(ref)
    if (!project || SUPABASE_GONE.has(project.status)) return { presence: 'absent' }
    return { presence: 'present', detail: `${project.name} (${project.ref})` }
  }

  /**
   * Deleting a project takes Supabase a while, and in the meantime reading it
   * back does not answer "still here" or "gone" but fails outright. Taken at
   * face value, that failure put a "cannot check" on a card whose deletion was
   * going perfectly well. So once the call is accepted, every answer short of
   * "gone" — the project still listed, or an error — means "not finished yet",
   * and the read is repeated until it is gone or the wait runs out, in which
   * case the card says the deletion is under way rather than that it failed.
   */
  private async deleteSupabase(req: TeardownRequest): Promise<TeardownRunResult> {
    const { client, ref } = this.supabase(req)
    await client.deleteProject(ref)

    const sleep = this.sleepImpl ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)))
    let state = await this.settle(() => this.readSupabase(req))
    for (let attempt = 1; state.presence !== 'absent' && attempt < SUPABASE_DELETE_POLLS; attempt++) {
      await sleep(SUPABASE_DELETE_POLL_MS)
      state = await this.settle(() => this.readSupabase(req))
    }

    return {
      state: state.presence === 'absent' ? state : { presence: 'pending', detail: state.detail },
      warnings: [],
    }
  }

  // ── Scaleway ──────────────────────────────────────────────────────────────

  private scaleway(req: TeardownRequest): ScalewayInstanceClient {
    if (!req.scaleway?.secretKey) throw new Error('Scaleway secret key missing (Step 1).')
    return new ScalewayInstanceClient({
      secretKey: req.scaleway.secretKey,
      fetchImpl: this.fetchImpl,
      sleepImpl: this.sleepImpl,
    })
  }

  /**
   * The saved id first: it names the server the configurator created, whatever
   * address it has since. Only without one — an instance from before ids were
   * saved, or an IPv4 typed by hand — is the server looked up by address.
   */
  private async readScaleway(
    req: TeardownRequest,
  ): Promise<{ state: TeardownServiceState; server: ScalewayServer | null }> {
    const client = this.scaleway(req)
    const { serverId, zone, ipv4 } = req.scaleway!

    let server: ScalewayServer | null | undefined = null
    if (serverId && zone) server = await client.getServer(zone, serverId)
    if (!server && ipv4) server = await client.findServerByIp(ipv4)

    if (server === undefined) {
      return { state: { presence: 'unknown', error: 'No Scaleway zone could be queried.' }, server: null }
    }
    if (!server) return { state: { presence: 'absent' }, server: null }

    const address = serverAddresses(server)[0]
    return {
      state: { presence: 'present', detail: `${server.name} — ${server.zone}${address ? ` — ${address}` : ''}` },
      server,
    }
  }

  private async deleteScaleway(req: TeardownRequest): Promise<TeardownRunResult> {
    const client = this.scaleway(req)
    const { server: found } = await this.readScaleway(req)
    if (!found) return { state: { presence: 'absent' }, warnings: [] }

    const { zone, id } = found
    const warnings: string[] = []

    // A server between two states accepts neither action: let it settle first.
    let server = await client.waitFor(zone, id, s => !s || !['starting', 'stopping'].includes(s.state))
    if (!server) return { state: { presence: 'absent' }, warnings }
    if (server.state === 'locked') {
      throw new Error('Scaleway has locked this instance — it cannot be deleted from here. Contact Scaleway support or use the console.')
    }

    const volumes = Object.values(server.volumes ?? {})
    const kept = volumes.filter(v => !LOCAL_VOLUME_TYPES.has(v.volume_type ?? ''))
    const flexibleIps = [server.public_ip, ...(server.public_ips ?? [])]
      .filter(ip => ip?.address && ip.dynamic === false)

    if (server.state === 'running') {
      // Deletes the server and its local volumes in one go.
      await client.action(zone, id, 'terminate')
    } else {
      // A stopped server cannot be terminated: delete it, then the local
      // volumes `terminate` would have taken with it.
      await client.deleteServer(zone, id)
      for (const volume of volumes.filter(v => LOCAL_VOLUME_TYPES.has(v.volume_type ?? ''))) {
        try {
          await client.deleteVolume(zone, volume.id)
        } catch {
          warnings.push(`Local volume ${volume.name ?? volume.id} could not be deleted — remove it from the Scaleway console.`)
        }
      }
    }

    server = await client.waitFor(zone, id, s => s === null)

    // Block Storage volumes are handed back to the page, which asks before
    // deleting them; any other kind can only be named.
    const detachedVolumes: ScalewayBlockVolume[] = kept
      .filter(v => v.volume_type === 'sbs_volume')
      .map(v => ({ id: v.id, name: v.name, zone, size: v.size }))
    for (const volume of kept.filter(v => v.volume_type !== 'sbs_volume')) {
      warnings.push(`Volume ${volume.name ?? volume.id} was only detached and is still billed — delete it from the Scaleway console if you no longer need it.`)
    }
    for (const ip of new Set(flexibleIps.map(ip => ip!.address!))) {
      warnings.push(`Flexible IP ${ip} is kept on your account and still billed — release it from the Scaleway console if you no longer need it.`)
    }

    return {
      state: server ? (await this.readScaleway(req)).state : { presence: 'absent' },
      warnings,
      detachedVolumes,
    }
  }

  /**
   * Deletes the Block Storage volumes a deleted instance left behind — a
   * separate step, only on the reader's say-so: they may hold data worth
   * keeping. One failure does not stop the others.
   */
  async deleteBlockVolumes(req: BlockVolumeDeleteRequest): Promise<BlockVolumeDeleteResult> {
    if (!req.secretKey) throw new Error('Scaleway secret key missing (Step 1).')
    const client = new ScalewayInstanceClient({
      secretKey: req.secretKey,
      fetchImpl: this.fetchImpl,
      sleepImpl: this.sleepImpl,
    })

    const result: BlockVolumeDeleteResult = { deleted: [], failed: [] }
    for (const volume of req.volumes) {
      try {
        await client.deleteBlockVolume(volume.zone, volume.id)
        result.deleted.push(volume.id)
      } catch (err) {
        result.failed.push({ ...volume, error: err instanceof Error ? err.message : String(err) })
      }
    }
    return result
  }

  // ── Resend ────────────────────────────────────────────────────────────────

  /**
   * The saved id is tried first, then the name: an id from an earlier run can
   * name a domain since deleted and recreated from the dashboard.
   */
  private async readResend(req: TeardownRequest): Promise<{ state: TeardownServiceState; id?: string }> {
    const r = req.resend
    if (!r?.apiKey || !r.mailSubdomain) throw new Error('Resend API key or sending subdomain missing (Step 1).')

    const client = new ResendApiClient({ apiKey: r.apiKey, fetchImpl: this.fetchImpl })
    const domains = await client.listDomains()
    const found = domains.find(d => d.id === r.domainId) ?? domains.find(d => d.name === r.mailSubdomain)

    return found
      ? { state: { presence: 'present', detail: `${found.name} (${found.status})` }, id: found.id }
      : { state: { presence: 'absent' } }
  }

  private async deleteResend(req: TeardownRequest): Promise<TeardownRunResult> {
    const { id } = await this.readResend(req)
    if (id) {
      await new ResendApiClient({ apiKey: req.resend!.apiKey, fetchImpl: this.fetchImpl }).deleteDomain(id)
    }
    return { state: await this.settle(async () => (await this.readResend(req)).state), warnings: [] }
  }

  // ── Spaceship ─────────────────────────────────────────────────────────────

  private spaceship(req: TeardownRequest): SpaceshipApiClient {
    const s = req.spaceship
    if (!s?.apiKey || !s.apiSecret || !s.domain) throw new Error('Spaceship API key, secret or domain missing (Step 1).')
    return new SpaceshipApiClient({ apiKey: s.apiKey, apiSecret: s.apiSecret, fetchImpl: this.fetchImpl })
  }

  private async readSpaceship(req: TeardownRequest): Promise<TeardownServiceState> {
    const client = this.spaceship(req)
    const present = await client.findRecords(req.spaceship!.domain, req.spaceship!.records)
    return present.length === 0
      ? { presence: 'absent' }
      : { presence: 'present', detail: present.map(item => `${item.type} ${item.name}`).join(', ') }
  }

  private async deleteSpaceship(req: TeardownRequest): Promise<TeardownRunResult> {
    await this.spaceship(req).deleteRecords(req.spaceship!.domain, req.spaceship!.records)
    return { state: await this.settle(() => this.readSpaceship(req)), warnings: [] }
  }
}
