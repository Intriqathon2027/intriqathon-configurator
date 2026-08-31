// ============================================================================
// Mémorisation des empreintes de serveurs (TOFU — trust on first use).
//
// Remplace `StrictHostKeyChecking=no` + `UserKnownHostsFile=/dev/null` :
// la première connexion enregistre l'empreinte, les suivantes la vérifient.
// Un changement d'empreinte fait échouer le job au lieu de l'ignorer.
// ============================================================================

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { app } from 'electron'

type KnownHosts = Record<string, string>

export class KnownHostsStore {
  private readonly file: string

  constructor(file?: string) {
    this.file = file ?? path.join(app.getPath('userData'), 'known-hosts.json')
  }

  static fingerprint(hostKey: Buffer): string {
    return `SHA256:${crypto.createHash('sha256').update(hostKey).digest('base64').replace(/=+$/, '')}`
  }

  private read(): KnownHosts {
    try {
      return JSON.parse(fs.readFileSync(this.file, 'utf-8')) as KnownHosts
    } catch {
      return {}
    }
  }

  private write(hosts: KnownHosts): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true })
    fs.writeFileSync(this.file, JSON.stringify(hosts, null, 2), 'utf-8')
  }

  /** @returns `trusted` si connu et identique, `new` si mémorisé à l'instant,
   *  `mismatch` si le serveur a changé de clé. */
  verify(host: string, hostKey: Buffer): 'trusted' | 'new' | 'mismatch' {
    const fp = KnownHostsStore.fingerprint(hostKey)
    const hosts = this.read()
    const known = hosts[host]

    if (!known) {
      hosts[host] = fp
      this.write(hosts)
      return 'new'
    }
    return known === fp ? 'trusted' : 'mismatch'
  }

  forget(host: string): void {
    const hosts = this.read()
    delete hosts[host]
    this.write(hosts)
  }
}
