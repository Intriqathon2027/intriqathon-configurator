import type { BrowserWindow } from 'electron'
import { DNS_TTL, hostPart, type DnsRecord, type DnsRecordType } from '../../shared/dnsRecords'
import { ResendApiClient, ResendApiError, type ResendDnsRecord, type ResendDomain } from './resend/ResendApiClient'
import { SpaceshipApiClient, SpaceshipApiError } from './spaceship/SpaceshipApiClient'
import { Redactor } from './supabase/redact'
import type { ResendProvisionRequest } from '../../types/provision'

const SERVICE = 'resend'

/**
 * How long to wait for Resend to see the records. Its own documentation says a
 * domain usually verifies within 15 minutes, which is far too long to hold a
 * card open — so the run waits for the common fast case and hands the rest
 * back to the reader as a re-run rather than pretending to fail.
 */
const VERIFY_POLL_INTERVAL_MS = 10_000
const VERIFY_TIMEOUT_MS = 3 * 60_000

/**
 * Creates the sending subdomain on Resend, publishes the records it asks for,
 * and waits for it to verify them.
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
      if (!req.mailSubdomain) throw new Error("Sous-domaine d'envoi non renseigné (étape 1).")

      const domain = await this.resolveDomain(win, client, req)
      const records = this.normaliseRecords(domain.records ?? [], req.domain)

      if (records.length === 0) {
        throw new Error(
          "Resend n'a renvoyé aucun enregistrement DNS pour ce domaine. Ouvrez resend.com/domains pour les relever à la main.",
        )
      }

      this.progress(win, 40)
      this.log(win, `Enregistrements demandés par Resend (${records.length}) :`)
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
          'Domaine créé chez Resend. Publiez les enregistrements ci-dessus chez votre registrar, puis relancez pour lancer la vérification.',
          'done',
        )
        win.webContents.send('provision:done', { service: SERVICE, patch })
        return
      }

      await this.publishRecords(win, req, records)
      const verifiedAt = await this.waitUntilVerified(win, client, domain.id)

      this.progress(win, 100)
      if (verifiedAt) patch.RESEND_DOMAIN_VERIFIED_AT = verifiedAt
      win.webContents.send('provision:done', { service: SERVICE, patch })
    } catch (err) {
      if (this.wasCancelled()) {
        this.log(win, 'Configuration annulée.', 'info')
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
        this.log(win, `Domaine ${known.name} déjà créé — réutilisation.`)
        return known
      } catch (err) {
        if (this.wasCancelled()) throw err
        // Deleted from the dashboard since, or belonging to another account:
        // fall through and resolve it by name like a first run would.
        this.log(win, 'Le domaine enregistré précédemment est introuvable — nouvelle recherche.')
      }
    }

    this.log(win, `Recherche de ${req.mailSubdomain} sur le compte Resend…`)
    const existing = (await client.listDomains()).find(d => d.name === req.mailSubdomain)
    if (existing) {
      this.log(win, `Domaine trouvé (${existing.status}) — récupération des enregistrements.`)
      // The listing carries no records; only fetching the domain does.
      return client.getDomain(existing.id)
    }

    this.log(win, `Création du domaine ${req.mailSubdomain}…`)
    const created = await client.createDomain(req.mailSubdomain)
    this.log(win, 'Domaine créé.', 'done')
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
    this.log(win, `Publication des enregistrements chez Spaceship sur ${req.domain}…`)

    const spaceship = new SpaceshipApiClient({
      apiKey: req.spaceshipApiKey!,
      apiSecret: req.spaceshipApiSecret!,
      signal: this.controller?.signal,
    })

    await spaceship.saveRecords(req.domain, records)
    this.progress(win, 60)
    this.log(win, 'Enregistrements publiés.', 'done')
  }

  // ── Step 3 — wait for Resend to see them ─────────────────────────────────

  /**
   * Returns when Resend reports the domain verified, or null when the wait ran
   * out. Running out is not a failure: the records are published and the check
   * is Resend's to make, so the run ends green with what it did and the reader
   * relaunches it later rather than seeing red for a propagation delay.
   */
  private async waitUntilVerified(
    win: BrowserWindow,
    client: ResendApiClient,
    id: string,
  ): Promise<string | null> {
    this.log(win, 'Demande de vérification à Resend…')
    await client.verifyDomain(id)

    const deadline = Date.now() + VERIFY_TIMEOUT_MS
    this.log(win, 'Attente de la propagation DNS (jusqu\'à 3 minutes)…')

    while (true) {
      if (this.wasCancelled()) throw new DOMException('Aborted', 'AbortError')

      await new Promise(resolve => setTimeout(resolve, VERIFY_POLL_INTERVAL_MS))
      const domain = await client.getDomain(id)

      if (domain.status === 'verified') {
        this.log(win, 'Domaine vérifié par Resend — les envois sont possibles.', 'done')
        return new Date().toISOString()
      }

      if (domain.status === 'failed') {
        throw new Error(
          "Resend a rejeté la vérification du domaine. Les enregistrements sont publiés mais ne lui parviennent pas : vérifiez-les dans « Configuration manuelle », puis relancez.",
        )
      }

      if (Date.now() > deadline) {
        this.log(
          win,
          "Resend n'a pas encore vu les enregistrements (statut : " +
            domain.status +
            '). C\'est normal, la propagation DNS peut prendre jusqu\'à 15 minutes — relancez cette étape dans quelques minutes pour terminer la vérification.',
          'done',
        )
        return null
      }

      this.progress(win, 80)
    }
  }
}
