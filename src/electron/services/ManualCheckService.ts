import { SupabaseApiClient } from './supabase/SupabaseApiClient'
import { SpaceshipApiClient } from './spaceship/SpaceshipApiClient'
import { STORAGE_BUCKETS } from '../../shared/supabaseBuckets'
import {
  GRANTS_CHECK_SQL,
  REALTIME_CHECK_SQL,
  REQUIRED_EXPOSED_SCHEMA,
  RLS_PENDING_SQL,
  type GrantsCheckRow,
  type PendingRlsRow,
  type RealtimeCheckRow,
} from '../../shared/supabaseSiteSetup'
import type { ManualCheckProbe, ManualCheckProbeRequest } from '../../types/provision'

const SCALEWAY_ZONE = 'fr-par-1'

/**
 * Answers, for each box the wizard asks the reader to tick, whether the thing
 * it claims is true right now.
 *
 * The boxes exist because these steps leave nothing in the config — a bucket, a
 * DNS record, a Realtime publication all live at the provider — so the tick was
 * the only state there was, and it stayed ticked long after someone deleted the
 * bucket. Every provider here can be asked directly, so it is.
 *
 * Each answer is `undefined` until it is known. That distinction is the whole
 * safety of this: a provider that could not be reached, a credential that is
 * missing, a call that failed — none of them are grounds for unticking a box
 * the reader ticked, and only a clear "no" from the provider is.
 */
export class ManualCheckService {
  async read(req: ManualCheckProbeRequest): Promise<ManualCheckProbe> {
    const [buckets, instance, dnsRecords, site] = await Promise.all([
      this.settle(() => this.readBuckets(req)),
      this.settle(() => this.readInstance(req)),
      this.settle(() => this.readDnsRecords(req)),
      this.settle(() => this.readSiteSetup(req)),
    ])

    return {
      buckets,
      instance,
      dnsRecords,
      siteGrants: site?.grants,
      siteSettings: site?.settings,
    }
  }

  /** A probe that throws has learned nothing, which is not the same as "no". */
  private async settle<T>(probe: () => Promise<T | undefined>): Promise<T | undefined> {
    try {
      return await probe()
    } catch {
      return undefined
    }
  }

  private async readBuckets(req: ManualCheckProbeRequest): Promise<boolean | undefined> {
    if (!req.supabase?.accessToken || !req.supabase.ref) return undefined

    const client = new SupabaseApiClient({ accessToken: req.supabase.accessToken })
    const existing = new Set((await client.listBuckets(req.supabase.ref)).map(b => b.name))
    return STORAGE_BUCKETS.every(bucket => existing.has(bucket.name))
  }

  /**
   * An instance answering at that address. The box says the IPv4 belongs to a
   * server that was really launched, which is exactly what the listing settles
   * — and what a value typed by hand never did.
   *
   * Only ever answers "yes". The listing covers one zone, the one this app
   * creates instances in, so finding the address proves the claim while not
   * finding it may only mean the reader's server lives somewhere else. Unticking
   * on that would be taking a guess away from someone who knew better.
   */
  private async readInstance(req: ManualCheckProbeRequest): Promise<true | undefined> {
    if (!req.scaleway?.secretKey || !req.scaleway.ipv4) return undefined

    const zone = req.scaleway.zone || SCALEWAY_ZONE
    const response = await fetch(
      `https://api.scaleway.com/instance/v1/zones/${zone}/servers?per_page=100`,
      { headers: { 'X-Auth-Token': req.scaleway.secretKey.trim(), Accept: 'application/json' } },
    )
    if (!response.ok) return undefined

    const { servers } = (await response.json()) as {
      servers?: { public_ip?: { address?: string } | null; public_ips?: { address?: string }[] }[]
    }
    if (!servers) return undefined

    const wanted = req.scaleway.ipv4.trim()
    const found = servers.some(
      server =>
        server.public_ip?.address === wanted ||
        (server.public_ips ?? []).some(ip => ip.address === wanted),
    )
    return found ? true : undefined
  }

  /**
   * Every record the table shows, present in the zone. Matched on name and
   * type rather than value, for the same reason the Spaceship run's read-back
   * is: a zone normalises what it stores, and a comparison that tripped over
   * quoting would untick a box that is perfectly true.
   */
  private async readDnsRecords(req: ManualCheckProbeRequest): Promise<boolean | undefined> {
    const spaceship = req.spaceship
    if (!spaceship?.apiKey || !spaceship.apiSecret || !spaceship.domain) return undefined
    if (spaceship.records.length === 0) return undefined

    const client = new SpaceshipApiClient({
      apiKey: spaceship.apiKey,
      apiSecret: spaceship.apiSecret,
    })
    const existing = await client.listRecords(spaceship.domain)
    const present = new Set(
      existing.map(item => `${item.name.toLowerCase().replace(/\.$/, '')}|${item.type.toUpperCase()}`),
    )

    return spaceship.records.every(record =>
      present.has(`${record.host.toLowerCase()}|${record.type}`),
    )
  }

  /**
   * The two halves of "Configuration du site", read rather than applied: the
   * grants the SQL block hands out, and the four settings the run flips.
   *
   * Both are answered from one client so the project is fetched once. An empty
   * schema leaves them unanswered rather than false — a database the
   * deployment has not migrated says nothing about work the reader did or did
   * not do.
   */
  private async readSiteSetup(
    req: ManualCheckProbeRequest,
  ): Promise<{ grants?: boolean; settings?: boolean } | undefined> {
    if (!req.supabase?.accessToken || !req.supabase.ref) return undefined
    const { accessToken, ref } = req.supabase

    const client = new SupabaseApiClient({ accessToken })

    const [grantRow] = await client.runQuery<GrantsCheckRow>(ref, GRANTS_CHECK_SQL)
    if (!grantRow || grantRow.public_tables === 0) return undefined

    const [realtime] = await client.runQuery<RealtimeCheckRow>(ref, REALTIME_CHECK_SQL)
    const pendingRls = await client.runQuery<PendingRlsRow>(ref, RLS_PENDING_SQL)
    const postgrest = await client.getPostgrestConfig(ref)
    const auth = await client.getAuthConfig(ref)

    const exposed = (postgrest.db_schema ?? '')
      .split(',')
      .map(s => s.trim())
      .includes(REQUIRED_EXPOSED_SCHEMA)

    return {
      grants: grantRow.schema_granted && grantRow.tables_granted,
      settings:
        exposed &&
        !!realtime?.already_published &&
        !!auth.mailer_autoconfirm &&
        pendingRls.length === 0,
    }
  }
}
