import type { BrowserWindow } from 'electron'
import { buildInfraDnsRecords, type DnsRecord } from '../../shared/dnsRecords'
import { SpaceshipApiClient, SpaceshipApiError } from './spaceship/SpaceshipApiClient'
import { Redactor } from './supabase/redact'
import type { SpaceshipProvisionRequest } from '../../types/provision'

const SERVICE = 'spaceship'

/**
 * Publishes the deployment's own DNS records on the domain: the site, the
 * admin panel and the DMARC policy. What Resend needs is not built here —
 * those records only exist once its API has been asked for them, and the
 * Resend run publishes them itself — but they are checked over on the way
 * past, and put back if the zone has lost them.
 */
export class SpaceshipProvisionService {
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

  async start(win: BrowserWindow, req: SpaceshipProvisionRequest): Promise<void> {
    this.cancel()
    this.controller = new AbortController()
    this.redactor = new Redactor().add(req.apiKey, req.apiSecret)

    const client = new SpaceshipApiClient({
      apiKey: req.apiKey,
      apiSecret: req.apiSecret,
      signal: this.controller.signal,
    })

    try {
      if (!req.domain) throw new Error('Domain name not specified.')
      if (!req.ipv4) {
        throw new Error(
          'Instance IPv4 unknown — run the Scaleway step before publishing DNS records.',
        )
      }

      const records = buildInfraDnsRecords(req.domain, req.ipv4, req.mailSubdomain)

      this.progress(win, 10)
      this.log(win, `Records to publish on ${req.domain}:`)
      for (const record of records) {
        this.log(win, `  ${record.type}  ${record.host}  ➔  ${record.answer}`)
      }

      this.progress(win, 35)
      this.log(win, 'Writing to Spaceship (records with the same name are replaced)…')
      await client.saveRecords(req.domain, records)
      this.progress(win, 75)

      await this.verifyWritten(win, client, req.domain, records)
      await this.restoreResendRecords(win, client, req.domain, req.resendRecords ?? [])

      this.progress(win, 100)
      this.log(win, 'DNS records published.', 'done')
      win.webContents.send('provision:done', { service: SERVICE, patch: {} })
    } catch (err) {
      if (this.wasCancelled()) {
        this.log(win, 'Configuration cancelled.', 'info')
        win.webContents.send('provision:cancelled', { service: SERVICE })
      } else {
        const message = err instanceof SpaceshipApiError || err instanceof Error ? err.message : String(err)
        this.log(win, message, 'error')
        win.webContents.send('provision:error', { service: SERVICE, message: this.redactor.redact(message) })
      }
    } finally {
      this.controller = null
    }
  }

  /**
   * A second look at what Resend asked for, while the zone is already open.
   *
   * Those records are published by the Resend run, not this one, so they are
   * normally here already and this does nothing but say so. It exists for the
   * cases where they are not: a run that failed midway, a record deleted by
   * hand at the registrar, a zone restored from an older state. The symptom is
   * always the same and always distant — mail that silently stops being
   * delivered — so the cheapest moment to catch it is the one where the zone is
   * being read anyway.
   *
   * Never the source of truth for their *content*: what is republished is what
   * Resend last handed back, which the step above keeps current.
   */
  private async restoreResendRecords(
    win: BrowserWindow,
    client: SpaceshipApiClient,
    domain: string,
    resendRecords: DnsRecord[],
  ): Promise<void> {
    if (resendRecords.length === 0) return

    this.log(win, 'Checking records requested by Resend…')
    const existing = await client.listRecords(domain)
    const present = new Set(
      existing.map(item => `${item.name.toLowerCase().replace(/\.$/, '')}|${item.type.toUpperCase()}`),
    )

    const missing = resendRecords.filter(
      record => !present.has(`${record.host.toLowerCase()}|${record.type}`),
    )

    if (missing.length === 0) {
      this.log(win, `Resend records in place (${resendRecords.length}).`, 'done')
      return
    }

    this.log(win, `Resend records missing from zone (${missing.length}) — republishing:`)
    for (const record of missing) {
      this.log(win, `  ${record.type}  ${record.host}`)
    }

    await client.saveRecords(domain, missing)
    await this.verifyWritten(win, client, domain, missing)
  }

  /**
   * Reads the zone back. A write that returns 2xx and leaves nothing behind is
   * the failure worth catching here — half-configured DNS that reads as done
   * would send the reader on to Resend, which then cannot verify anything.
   *
   * The check is on name and type, not on the value: what a zone hands back is
   * normalised (a TXT comes back quoted, a name may be fully qualified), and a
   * comparison that trips over punctuation would fail runs that worked. The
   * values are logged instead, so they can be read at a glance.
   */
  private async verifyWritten(
    win: BrowserWindow,
    client: SpaceshipApiClient,
    domain: string,
    records: DnsRecord[],
  ): Promise<void> {
    this.log(win, 'Reading back DNS zone…')
    const existing = await client.listRecords(domain)
    const present = new Set(
      existing.map(item => `${item.name.toLowerCase().replace(/\.$/, '')}|${item.type.toUpperCase()}`),
    )

    const missing = records.filter(
      record => !present.has(`${record.host.toLowerCase()}|${record.type}`),
    )
    if (missing.length > 0) {
      throw new Error(
        `Records missing from zone after writing: ${missing
          .map(r => `${r.type} ${r.host}`)
          .join(', ')}. Add them manually via "Manual Configuration".`,
      )
    }

    this.progress(win, 90)
    this.log(win, `Zone read back — ${records.length} record(s) in place.`, 'done')
  }
}
