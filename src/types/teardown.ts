/**
 * Contract between the shutdown service (main) and the "Arrêt du site" page
 * (renderer). Lives outside `src/electron` so both sides import the same
 * definitions.
 */

import type { DnsRecord } from '../shared/dnsRecords'

export type TeardownService = 'supabase' | 'scaleway' | 'resend' | 'spaceship'

/**
 * What the page knows about each resource the deployment left behind. Every
 * part is optional: a service with nothing to point at — no project reference,
 * no IPv4 — has nothing to delete, and is left out.
 */
export interface TeardownRequest {
  supabase?: { accessToken: string; ref: string }
  scaleway?: {
    secretKey: string
    /** Saved when the configurator created the instance. */
    serverId?: string
    zone?: string
    /** What the server is looked up by when no id was saved. */
    ipv4?: string
  }
  resend?: { apiKey: string; mailSubdomain: string; domainId?: string }
  spaceship?: { apiKey: string; apiSecret: string; domain: string; records: DnsRecord[] }
}

/**
 * `present` — the provider still holds it. `absent` — the provider says it is
 * gone. `unknown` — the question could not be put (network, refused key), and
 * nothing may be concluded from it either way. `pending` — a deletion was
 * accepted and the provider is still carrying it out: neither done nor failed.
 */
export type TeardownPresence = 'present' | 'absent' | 'unknown' | 'pending'

export interface TeardownServiceState {
  presence: TeardownPresence
  /** What was found, in a few words — a project name, a server name, a count. */
  detail?: string
  /** Why the answer is `unknown`. */
  error?: string
}

export type TeardownProbe = Partial<Record<TeardownService, TeardownServiceState>>

/**
 * A Block Storage volume the instance had attached. Deleting an instance only
 * detaches these — they keep their data and their billing — so the page asks
 * before deleting them in a second step.
 */
export interface ScalewayBlockVolume {
  id: string
  name?: string
  zone: string
  /** In bytes, as the Instances API reports it. */
  size?: number
}

export interface TeardownRunResult {
  /** The state read back once the deletion was sent. */
  state: TeardownServiceState
  /** What the deletion deliberately left in place, for the reader to decide on. */
  warnings: string[]
  /** Scaleway only: Block Storage volumes the deleted instance left detached. */
  detachedVolumes?: ScalewayBlockVolume[]
}

export interface BlockVolumeDeleteRequest {
  secretKey: string
  volumes: ScalewayBlockVolume[]
}

export interface BlockVolumeDeleteResult {
  /** Ids the API confirmed gone. */
  deleted: string[]
  /** Volumes still there, with the reason — kept on the card to retry. */
  failed: (ScalewayBlockVolume & { error: string })[]
}
