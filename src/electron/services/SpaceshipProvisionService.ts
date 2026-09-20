import type { BrowserWindow } from 'electron'
import { buildInfraDnsRecords, type DnsRecord } from '../../shared/dnsRecords'
import { SpaceshipApiClient, SpaceshipApiError } from './spaceship/SpaceshipApiClient'
import { Redactor } from './supabase/redact'
import type { SpaceshipProvisionRequest } from '../../types/provision'

const SERVICE = 'spaceship'

/**
 * Publishes the deployment's own DNS records on the domain: the site, the
 * admin panel and the DMARC policy. What Resend needs is not here — those
 * records only exist once its API has been asked for them, and the Resend run
 * publishes them itself.
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
      if (!req.domain) throw new Error('Nom de domaine non renseigné.')
      if (!req.ipv4) {
        throw new Error(
          "IPv4 de l'instance inconnue — lancez l'étape Scaleway avant de publier les enregistrements DNS.",
        )
      }

      const records = buildInfraDnsRecords(req.domain, req.ipv4, req.mailSubdomain)

      this.progress(win, 10)
      this.log(win, `Enregistrements à publier sur ${req.domain} :`)
      for (const record of records) {
        this.log(win, `  ${record.type}  ${record.host}  ➔  ${record.answer}`)
      }

      this.progress(win, 35)
      this.log(win, 'Écriture chez Spaceship (les enregistrements de même nom sont remplacés)…')
      await client.saveRecords(req.domain, records)
      this.progress(win, 75)

      await this.verifyWritten(win, client, req.domain, records)

      this.progress(win, 100)
      this.log(win, 'Enregistrements DNS publiés.', 'done')
      win.webContents.send('provision:done', { service: SERVICE, patch: {} })
    } catch (err) {
      if (this.wasCancelled()) {
        this.log(win, 'Configuration annulée.', 'info')
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
    this.log(win, 'Relecture de la zone…')
    const existing = await client.listRecords(domain)
    const present = new Set(
      existing.map(item => `${item.name.toLowerCase().replace(/\.$/, '')}|${item.type.toUpperCase()}`),
    )

    const missing = records.filter(
      record => !present.has(`${record.host.toLowerCase()}|${record.type}`),
    )
    if (missing.length > 0) {
      throw new Error(
        `Enregistrements absents de la zone après écriture : ${missing
          .map(r => `${r.type} ${r.host}`)
          .join(', ')}. Ajoutez-les à la main depuis « Configuration manuelle ».`,
      )
    }

    this.progress(win, 90)
    this.log(win, `Zone relue — ${records.length} enregistrement(s) en place.`, 'done')
  }
}
