const SCALEWAY_BASE = 'https://api.scaleway.com'

/**
 * Every zone the Instances API serves. An instance created here lands in
 * `fr-par-1`, but one whose IPv4 was typed in by hand can live anywhere, and
 * looking it up in one zone only would call it gone when it is merely
 * elsewhere.
 */
export const INSTANCE_ZONES = [
  'fr-par-1', 'fr-par-2', 'fr-par-3',
  'nl-ams-1', 'nl-ams-2', 'nl-ams-3',
  'pl-waw-1', 'pl-waw-2', 'pl-waw-3',
] as const

export type ScalewayServerState =
  | 'running'
  | 'stopped'
  | 'stopped in place'
  | 'starting'
  | 'stopping'
  | 'locked'
  | string

export interface ScalewayIp {
  id?: string
  address?: string
  /** A dynamic IP goes with the server; a flexible one outlives it. */
  dynamic?: boolean
}

export interface ScalewayVolume {
  id: string
  name?: string
  volume_type?: string
  /** Bytes. */
  size?: number
}

/**
 * Block Storage volume statuses that refuse a deletion for now but will settle
 * on their own — `in_use` included: right after the instance goes, the volume
 * takes a moment to be released.
 */
const BLOCK_VOLUME_BUSY = new Set(['in_use', 'creating', 'updating', 'resizing', 'snapshotting'])

export interface ScalewayBlockVolumeInfo {
  id: string
  name?: string
  status: string
}

export interface ScalewayServer {
  id: string
  name: string
  state: ScalewayServerState
  /** Not sent by the API itself — filled in by this client from the URL. */
  zone: string
  public_ip?: ScalewayIp | null
  public_ips?: ScalewayIp[]
  volumes?: Record<string, ScalewayVolume>
}

export class ScalewayApiError extends Error {
  readonly status: number

  constructor(status: number, detail: string) {
    const explanation =
      status === 401 || status === 403
        ? 'Access denied by Scaleway — check that SCW_SECRET_KEY (Step 1) is valid and allowed to manage Instances.'
        : null
    super(explanation ? (detail ? `${explanation} (${detail})` : explanation) : `HTTP ${status} — ${detail}`)
    this.name = 'ScalewayApiError'
    this.status = status
  }
}

function extractMessage(raw: string): string {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed?.message === 'string') return parsed.message
  } catch {
    // not JSON — fall through
  }
  return raw.slice(0, 300)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export interface ScalewayInstanceClientOptions {
  secretKey: string
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch
  /** Injectable for tests, so polling does not actually wait. */
  sleepImpl?: (ms: number) => Promise<void>
}

/** Every address a server answers at, whichever field the API put it under. */
export function serverAddresses(server: ScalewayServer): string[] {
  return [server.public_ip?.address, ...(server.public_ips ?? []).map(ip => ip.address)]
    .filter((address): address is string => !!address)
}

/**
 * The slice of the Instances API the shutdown page needs: find the server the
 * deployment runs on, and delete it with the disks that only exist for it.
 */
export class ScalewayInstanceClient {
  private readonly secretKey: string
  private readonly fetchImpl: typeof fetch
  private readonly sleepImpl: (ms: number) => Promise<void>

  constructor(opts: ScalewayInstanceClientOptions) {
    this.secretKey = opts.secretKey.trim()
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch
    this.sleepImpl = opts.sleepImpl ?? sleep
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T | null }> {
    const response = await this.fetchImpl(`${SCALEWAY_BASE}${path}`, {
      method,
      headers: {
        'X-Auth-Token': this.secretKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    if (response.status === 404) return { status: 404, data: null }

    const text = await response.text().catch(() => '')
    if (!response.ok) throw new ScalewayApiError(response.status, extractMessage(text))
    return { status: response.status, data: text ? (JSON.parse(text) as T) : null }
  }

  /** The server, or `null` once it no longer exists. */
  async getServer(zone: string, id: string): Promise<ScalewayServer | null> {
    const { data } = await this.request<{ server: Omit<ScalewayServer, 'zone'> }>(
      'GET',
      `/instance/v1/zones/${zone}/servers/${id}`,
    )
    return data?.server ? { ...data.server, zone } : null
  }

  async listServers(zone: string): Promise<ScalewayServer[]> {
    const servers: ScalewayServer[] = []
    for (let page = 1; page <= 20; page++) {
      const { data } = await this.request<{ servers?: Omit<ScalewayServer, 'zone'>[] }>(
        'GET',
        `/instance/v1/zones/${zone}/servers?per_page=100&page=${page}`,
      )
      const batch = data?.servers ?? []
      servers.push(...batch.map(server => ({ ...server, zone })))
      if (batch.length < 100) break
    }
    return servers
  }

  /**
   * The server answering at `ipv4`, searched zone by zone.
   *
   * `undefined` means no zone could be asked at all — a refused key, say — and
   * is kept apart from `null`, which is every zone answering that it holds no
   * such server. Only the latter lets the page call the instance gone.
   */
  async findServerByIp(ipv4: string): Promise<ScalewayServer | null | undefined> {
    const wanted = ipv4.trim()
    let answered = 0
    let lastError: unknown = null

    for (const zone of INSTANCE_ZONES) {
      try {
        const servers = await this.listServers(zone)
        answered++
        const match = servers.find(server => serverAddresses(server).includes(wanted))
        if (match) return match
      } catch (err) {
        lastError = err
      }
    }

    if (answered === 0) {
      if (lastError) throw lastError
      return undefined
    }
    return null
  }

  async action(zone: string, id: string, action: 'terminate' | 'poweroff'): Promise<void> {
    await this.request('POST', `/instance/v1/zones/${zone}/servers/${id}/action`, { action })
  }

  async deleteServer(zone: string, id: string): Promise<void> {
    await this.request('DELETE', `/instance/v1/zones/${zone}/servers/${id}`)
  }

  async deleteVolume(zone: string, id: string): Promise<void> {
    await this.request('DELETE', `/instance/v1/zones/${zone}/volumes/${id}`)
  }

  // ── Block Storage (SBS) ─────────────────────────────────────────────────

  /** The volume, or `null` once it no longer exists. */
  async getBlockVolume(zone: string, id: string): Promise<ScalewayBlockVolumeInfo | null> {
    const { data } = await this.request<ScalewayBlockVolumeInfo>('GET', `/block/v1/zones/${zone}/volumes/${id}`)
    return data && data.status !== 'deleted' ? data : null
  }

  /**
   * Deletes a Block Storage volume and waits until the API no longer lists it.
   *
   * The API refuses a volume still `in_use`, which is what one is for a few
   * seconds after its instance is terminated — so this waits for it to be
   * released first rather than failing on a race nobody can see.
   */
  async deleteBlockVolume(zone: string, id: string, timeoutMs = 120_000, intervalMs = 3_000): Promise<void> {
    const deadline = Date.now() + timeoutMs

    let volume = await this.getBlockVolume(zone, id)
    while (volume && BLOCK_VOLUME_BUSY.has(volume.status)) {
      if (Date.now() > deadline) {
        throw new Error(`The volume is still "${volume.status}" — it can only be deleted once released.`)
      }
      await this.sleepImpl(intervalMs)
      volume = await this.getBlockVolume(zone, id)
    }
    if (!volume) return

    if (volume.status !== 'deleting') {
      await this.request('DELETE', `/block/v1/zones/${zone}/volumes/${id}`)
    }

    while (await this.getBlockVolume(zone, id)) {
      if (Date.now() > deadline) throw new Error('Scaleway accepted the deletion but still lists the volume.')
      await this.sleepImpl(intervalMs)
    }
  }

  /**
   * Polls until `done` holds or the time runs out. Resolves the last server
   * read, or `null` once it is gone.
   */
  async waitFor(
    zone: string,
    id: string,
    done: (server: ScalewayServer | null) => boolean,
    timeoutMs = 180_000,
    intervalMs = 3_000,
  ): Promise<ScalewayServer | null> {
    const deadline = Date.now() + timeoutMs
    let server = await this.getServer(zone, id)
    while (!done(server)) {
      if (Date.now() > deadline) {
        throw new Error(`Scaleway did not finish in time — the instance is still "${server?.state ?? 'unknown'}". Check the console, then re-check this page.`)
      }
      await this.sleepImpl(intervalMs)
      server = await this.getServer(zone, id)
    }
    return server
  }
}
