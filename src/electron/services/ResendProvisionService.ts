import type { BrowserWindow } from 'electron'
import { DNS_TTL, hostPart, type DnsRecord, type DnsRecordType } from '../../shared/dnsRecords'
import { ResendApiClient, ResendApiError, type ResendDnsRecord, type ResendDomain } from './resend/ResendApiClient'
import { SpaceshipApiClient, SpaceshipApiError } from './spaceship/SpaceshipApiClient'
import { Redactor } from './supabase/redact'
import type {
  ResendDomainReadRequest,
  ResendDomainSnapshot,
  ResendProvisionRequest,
  ResendVerificationResult,
  ResendVerifyRequest,
} from '../../types/provision'

const SERVICE = 'resend'

/**
 * The standalone check answers a button pressed by someone watching, so it is
 * held to seconds. The run itself no longer waits at all: Resend puts DNS
 * propagation at up to fifteen minutes, which is nothing a card held open can
 * shorten.
 */
const CHECK_POLL_INTERVAL_MS = 5_000
const CHECK_TIMEOUT_MS = 25_000

/**
 * Creates the sending subdomain on Resend, publishes the records it asks for,
 * and asks it to verify them.
 *
 * The records are the reason this run exists: they are not knowable in
 * advance — the DKIM key is minted with the domain — so nothing can publish
 * them until Resend has been asked. When the domain lives at Spaceship this
 * run publishes them itself; at any other registrar it stops once they are
 * known and leaves them on screen to be copied.
 */
export class ResendProvisionService {
  private controller: AbortController | null = null
  private redactor = new Redactor()

  isRunning(): boolean {
    return this.controller !== null
  }

  cancel(): void {
    this.controller?.abort()
    this.controller = null
  }

  private log(win: BrowserWindow, message: string, level: 'info' | 'done' | 'error' = 'info'): void {
    win.webContents.send('provision:log', {
      service: SERVICE,
      message: this.redactor.redact(message),
      level,
    })
  }

  private progress(win: BrowserWindow, value: number): void {
    win.webContents.send('provision:progress', { service: SERVICE, value })
  }

  private wasCancelled(): boolean {
    return this.controller?.signal.aborted ?? false
  }

  async start(win: BrowserWindow, req: ResendProvisionRequest): Promise<void> {
    this.cancel()
    this.controller = new AbortController()
    this.redactor = new Redactor().add(req.apiKey, req.spaceshipApiKey, req.spaceshipApiSecret)

    const client = new ResendApiClient({
      apiKey: req.apiKey,
      signal: this.controller.signal,
    })

    try {
      if (!req.mailSubdomain) throw new Error('Sending subdomain not specified (Step 1).')

      const domain = await this.resolveDomain(win, client, req)
      const records = this.normaliseRecords(domain.records ?? [], req.domain)

      if (records.length === 0) {
        throw new Error(
          'Resend returned no DNS records for this domain. Open resend.com/domains to check them manually.',
        )
      }

      this.progress(win, 40)
      this.log(win, `Records requested by Resend (${records.length}):`)
      for (const record of records) {
        this.log(win, `  ${record.type}  ${record.host}  ➔  ${this.shorten(record.answer)}`)
      }

      const patch: Record<string, string> = {
        RESEND_DOMAIN_ID: domain.id,
        RESEND_DNS_RECORDS: JSON.stringify(records),
      }

      // No Spaceship credentials means another registrar holds the zone: the
      // records are now known and on screen, which is as far as an API can go.
      if (!req.spaceshipApiKey || !req.spaceshipApiSecret) {
        this.progress(win, 100)
        this.log(
          win,
          'Domain created in Resend. Publish the records above with your registrar, then rerun to start verification.',
          'done',
        )
        win.webContents.send('provision:done', { service: SERVICE, patch })
        return
      }

      await this.publishRecords(win, req, records)

      /**
       * The run ends here, at the moment the waiting would start.
       *
       * Everything an automation can do is done: the domain exists, the
       * records are published, and Resend has been asked to look. What
       * remains is DNS propagation, which its own documentation puts at up to
       * fifteen minutes and which no amount of holding the card open makes
       * faster. Reported as pending instead, so the reader moves on to the
       * next step and comes back to a card that confirms itself.
       */
      if (domain.status === 'verified') {
        this.log(win, 'Domain already verified by Resend — sending is enabled.', 'done')
        patch.RESEND_DOMAIN_VERIFIED_AT = new Date().toISOString()
        patch.RESEND_VERIFICATION_PENDING_SINCE = ''
      } else {
        this.log(win, 'Requesting verification from Resend…')
        await client.verifyDomain(domain.id)
        patch.RESEND_VERIFICATION_PENDING_SINCE = new Date().toISOString()
        this.log(
          win,
          'Verification requested. DNS propagation can take up to 15 minutes: this step is complete, Resend will verify automatically. No need to wait here — "Rerun Resend verification" can check again anytime.',
          'done',
        )
      }

      this.progress(win, 100)
      win.webContents.send('provision:done', { service: SERVICE, patch })
    } catch (err) {
      if (this.wasCancelled()) {
        this.log(win, 'Configuration cancelled.', 'info')
        win.webContents.send('provision:cancelled', { service: SERVICE })
      } else {
        const message =
          err instanceof ResendApiError || err instanceof SpaceshipApiError || err instanceof Error
            ? err.message
            : String(err)
        this.log(win, message, 'error')
        win.webContents.send('provision:error', { service: SERVICE, message: this.redactor.redact(message) })
      }
    } finally {
      this.controller = null
    }
  }

  /**
   * The sending domain as Resend holds it now — read-only, and deliberately
   * not a verification: this runs when the step is merely opened, and asking
   * for a check on every visit would be a request the reader never made.
   *
   * Resolved by name rather than by the saved id, because the id is the very
   * thing that goes stale: a domain deleted from the dashboard and added again
   * has a new one, and a domain simply deleted has none. The account's own
   * listing is the only thing that can settle either.
   */
  async readDomain(req: ResendDomainReadRequest): Promise<ResendDomainSnapshot> {
    const client = new ResendApiClient({ apiKey: req.apiKey })

    const listed = (await client.listDomains()).find(d => d.name === req.mailSubdomain)
    if (!listed) return { exists: false }

    // Only fetching the domain carries the records; the listing does not.
    const domain = await client.getDomain(listed.id)
    return {
      exists: true,
      domainId: domain.id,
      status: domain.status,
      records: this.normaliseRecords(domain.records ?? [], req.domain),
    }
  }

  /**
   * Asks Resend to look at the DNS now, and reports what it sees.
   *
   * Nothing is created and nothing is published: this is the button pressed
   * once the records are in place at the registrar, which the dashboard itself
   * offers no equivalent of — Resend's own check runs on its schedule, and a
   * domain can sit at `pending` for hours waiting for it. Separate from
   * `start` so re-checking never risks a second domain or a re-publish.
   */
  async verifyOnly(req: ResendVerifyRequest): Promise<ResendVerificationResult> {
    const client = new ResendApiClient({ apiKey: req.apiKey })
    const id = await this.findDomainId(client, req)

    await client.verifyDomain(id)

    // The check runs asynchronously on Resend's side, so an immediate read
    // would report the state from before it was asked for.
    const deadline = Date.now() + CHECK_TIMEOUT_MS
    let status = (await client.getDomain(id)).status
    while (status !== 'verified' && status !== 'failed' && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, CHECK_POLL_INTERVAL_MS))
      status = (await client.getDomain(id)).status
    }

    return {
      domainId: id,
      status,
      ...(status === 'verified' ? { verifiedAt: new Date().toISOString() } : {}),
    }
  }

  /**
   * The domain to check. An id saved by an earlier run is the direct route,
   * but it names a domain that may have been deleted from the dashboard since
   * — and a domain added there by hand has no id here at all — so both fall
   * back to resolving it by name.
   */
  private async findDomainId(client: ResendApiClient, req: ResendVerifyRequest): Promise<string> {
    if (req.domainId) {
      try {
        return (await client.getDomain(req.domainId)).id
      } catch {
        // Gone, or belonging to another account — resolve by name instead.
      }
    }

    const known = (await client.listDomains()).find(d => d.name === req.mailSubdomain)
    if (!known) {
      throw new Error(
        `${req.mailSubdomain} is not (or no longer) registered on this Resend account. Run the step to create it, or add it from resend.com/domains.`,
      )
    }
    return known.id
  }

  // ── Step 1 — the domain, adopted or created ──────────────────────────────

  private async resolveDomain(
    win: BrowserWindow,
    client: ResendApiClient,
    req: ResendProvisionRequest,
  ): Promise<ResendDomain> {
    this.progress(win, 10)

    // A reference from an earlier run is the cheapest way back to the same
    // domain, and what stops a second click from creating a second one.
    if (req.domainId) {
      try {
        const known = await client.getDomain(req.domainId)
        this.log(win, `Domain ${known.name} already created — reusing.`)
        return known
      } catch (err) {
        if (this.wasCancelled()) throw err
        // Deleted from the dashboard since, or belonging to another account:
        // fall through and resolve it by name like a first run would.
        this.log(win, 'Previously saved domain not found — searching again.')
      }
    }

    this.log(win, `Searching for ${req.mailSubdomain} on Resend account…`)
    const existing = (await client.listDomains()).find(d => d.name === req.mailSubdomain)
    if (existing) {
      this.log(win, `Domain found (${existing.status}) — retrieving records.`)
      // The listing carries no records; only fetching the domain does.
      return client.getDomain(existing.id)
    }

    this.log(win, `Creating domain ${req.mailSubdomain}…`)
    const created = await client.createDomain(req.mailSubdomain)
    this.log(win, 'Domain created.', 'done')
    return created
  }

  /**
   * Resend's records onto the shape the rest of the wizard uses. Its `name` is
   * relative to the registered domain already, but is run through `hostPart`
   * anyway so a fully qualified one would not produce `x.domain.fr.domain.fr`.
   * Its `ttl` is the string "Auto", so ours is used instead.
   */
  private normaliseRecords(records: ResendDnsRecord[], domain: string): DnsRecord[] {
    return records.map(record => ({
      type: record.type.toUpperCase() as DnsRecordType,
      host: hostPart(record.name, domain),
      answer: record.value,
      ttl: DNS_TTL,
      ...(record.priority !== undefined ? { priority: record.priority } : {}),
    }))
  }

  /** A DKIM value runs to a few hundred characters — unreadable in a log pane. */
  private shorten(value: string): string {
    return value.length > 60 ? `${value.slice(0, 57)}…` : value
  }

  // ── Step 2 — publish what Resend asked for ───────────────────────────────

  private async publishRecords(
    win: BrowserWindow,
    req: ResendProvisionRequest,
    records: DnsRecord[],
  ): Promise<void> {
    this.log(win, `Publishing records with Spaceship for ${req.domain}…`)

    const spaceship = new SpaceshipApiClient({
      apiKey: req.spaceshipApiKey!,
      apiSecret: req.spaceshipApiSecret!,
      signal: this.controller?.signal,
    })

    await spaceship.saveRecords(req.domain, records)
    this.progress(win, 60)
    this.log(win, 'Records published.', 'done')
  }
}
