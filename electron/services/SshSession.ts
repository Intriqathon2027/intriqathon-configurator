// ============================================================================
// Client SSH/SFTP en pur JavaScript (ssh2).
//
// Remplace l'appel à des binaires externes (bash/cmd + ssh + rsync + scp +
// sshpass) : identique sur macOS, Linux et Windows, sans dépendance système,
// sans compilation native, et — surtout — l'authentification par mot de passe
// fonctionne, là où un `spawn` sur des pipes ne peut pas répondre au prompt
// que `ssh` lit sur /dev/tty.
//
// Corollaire : plus aucun process enfant, donc plus aucun orphelin à tuer.
// Annuler revient à fermer la connexion.
// ============================================================================

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import ssh2 from 'ssh2'
import type { ConnectConfig, SFTPWrapper } from 'ssh2'
import { KnownHostsStore } from './KnownHostsStore'

const { Client } = ssh2

export class SshAuthError extends Error {}
export class SshHostKeyError extends Error {}
export class SshUnreachableError extends Error {}

export interface SshConnectOptions {
  host: string
  port?: number
  username: string
  password?: string
  onLog?: (line: string) => void
}

/** Dossiers et fichiers jamais transférés vers le serveur. */
const UPLOAD_IGNORE = new Set(['.git', 'node_modules', '.DS_Store', '.idea', '.vscode', 'Thumbs.db'])

export class SshSession {
  private client: ssh2.Client | null = null
  private disposed = false
  private readonly knownHosts: KnownHostsStore

  constructor(knownHosts: KnownHostsStore) {
    this.knownHosts = knownHosts
  }

  // ── Connexion ────────────────────────────────────────────────────────────

  async connect(opts: SshConnectOptions): Promise<void> {
    const log = opts.onLog ?? (() => {})
    const client = new Client()
    this.client = client

    const config: ConnectConfig = {
      host: opts.host,
      port: opts.port ?? 22,
      username: opts.username,
      readyTimeout: 20_000,
      // Garde la connexion vivante pendant un `docker compose build` long.
      keepaliveInterval: 10_000,
      keepaliveCountMax: 30,
      hostVerifier: (key: Buffer) => {
        const verdict = this.knownHosts.verify(opts.host, key)
        if (verdict === 'new') {
          log(`Empreinte du serveur mémorisée : ${KnownHostsStore.fingerprint(key)}`)
          return true
        }
        if (verdict === 'mismatch') return false
        return true
      },
    }

    if (opts.password) {
      config.password = opts.password
      // Beaucoup de serveurs présentent le mot de passe via keyboard-interactive.
      config.tryKeyboard = true
      log(`Authentification par mot de passe pour ${opts.username}@${opts.host}`)
    } else {
      const agent = resolveAgent()
      const key = findDefaultPrivateKey()
      if (agent) {
        config.agent = agent
        log('Authentification via l\'agent SSH')
      }
      if (key) {
        config.privateKey = key.content
        log(`Authentification par clé : ${key.path}`)
      }
      if (!agent && !key) {
        throw new SshAuthError('Aucune clé SSH ni agent disponible')
      }
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false
      const settle = (fn: () => void) => {
        if (settled) return
        settled = true
        fn()
      }

      client.on('ready', () => settle(resolve))

      if (config.tryKeyboard) {
        client.on('keyboard-interactive', (_name, _instr, _lang, _prompts, finish) => {
          finish([opts.password ?? ''])
        })
      }

      client.on('error', (err: Error & { level?: string }) => {
        settle(() => {
          if (err.level === 'client-authentication') {
            reject(new SshAuthError(
              opts.password
                ? 'Mot de passe refusé par le serveur'
                : 'Aucune clé SSH acceptée par le serveur',
            ))
          } else if (/host.?key/i.test(err.message) || /verification/i.test(err.message)) {
            reject(new SshHostKeyError(
              `L'empreinte de ${opts.host} ne correspond plus à celle mémorisée. `
              + 'Si le serveur a été réinstallé, supprimez-le de known-hosts.json ; sinon, ne vous connectez pas.',
            ))
          } else {
            reject(new SshUnreachableError(`Connexion à ${opts.host} impossible : ${err.message}`))
          }
        })
      })

      client.connect(config)
    })
  }

  // ── Transfert de fichiers ────────────────────────────────────────────────

  /** Envoie récursivement `localDir` vers `remoteDir` (créé au besoin). */
  async uploadDirectory(
    localDir: string,
    remoteDir: string,
    onFile?: (relativePath: string, index: number, total: number) => void,
  ): Promise<number> {
    const sftp = await this.openSftp()
    const files = collectFiles(localDir)

    await this.mkdirp(sftp, remoteDir)

    const createdDirs = new Set<string>([remoteDir])
    let index = 0

    for (const relative of files) {
      this.assertAlive()
      index += 1

      const remotePath = posixJoin(remoteDir, relative)
      const remoteParent = remotePath.slice(0, remotePath.lastIndexOf('/'))
      if (!createdDirs.has(remoteParent)) {
        await this.mkdirp(sftp, remoteParent)
        createdDirs.add(remoteParent)
      }

      await new Promise<void>((resolve, reject) => {
        sftp.fastPut(path.join(localDir, relative), remotePath, (err) => (err ? reject(err) : resolve()))
      })

      onFile?.(relative, index, files.length)
    }

    return files.length
  }

  // ── Exécution distante ───────────────────────────────────────────────────

  /**
   * Exécute une commande sur le serveur.
   * stdin est fermé immédiatement : si le script distant attend une saisie,
   * il reçoit EOF et poursuit sur son cas par défaut au lieu de figer le job.
   */
  async exec(
    command: string,
    handlers: { onStdout?: (line: string) => void; onStderr?: (line: string) => void },
  ): Promise<number> {
    const client = this.requireClient()

    return new Promise<number>((resolve, reject) => {
      client.exec(command, { pty: false }, (err, stream) => {
        if (err) return reject(err)

        const out = lineSplitter(handlers.onStdout)
        const errOut = lineSplitter(handlers.onStderr)

        stream.on('data', (chunk: Buffer) => out.push(chunk))
        stream.stderr.on('data', (chunk: Buffer) => errOut.push(chunk))
        stream.on('close', (code: number | null) => {
          out.flush()
          errOut.flush()
          resolve(code ?? -1)
        })
        stream.on('error', reject)

        stream.end()
      })
    })
  }

  // ── Cycle de vie ─────────────────────────────────────────────────────────

  /** Ferme la connexion. Le serveur envoie SIGHUP au process distant : rien
   *  ne survit côté client, contrairement à un `kill` sur un wrapper bash. */
  dispose(): void {
    this.disposed = true
    if (this.client) {
      this.client.end()
      this.client.destroy()
      this.client = null
    }
  }

  get isDisposed(): boolean {
    return this.disposed
  }

  // ── Interne ──────────────────────────────────────────────────────────────

  private requireClient(): ssh2.Client {
    this.assertAlive()
    if (!this.client) throw new Error('Session SSH non connectée')
    return this.client
  }

  private assertAlive(): void {
    if (this.disposed) throw new SessionDisposedError()
  }

  private openSftp(): Promise<SFTPWrapper> {
    const client = this.requireClient()
    return new Promise((resolve, reject) => {
      client.sftp((err, sftp) => (err ? reject(err) : resolve(sftp)))
    })
  }

  private async mkdirp(sftp: SFTPWrapper, remoteDir: string): Promise<void> {
    const segments = remoteDir.split('/').filter(Boolean)
    const absolute = remoteDir.startsWith('/')
    let current = absolute ? '' : '.'

    for (const segment of segments) {
      current = current === '' ? `/${segment}` : `${current}/${segment}`
      await new Promise<void>((resolve, reject) => {
        sftp.mkdir(current, (err) => {
          // Un dossier déjà présent remonte selon les serveurs en FAILURE (4)
          // ou FILE_ALREADY_EXISTS (11) : les deux sont bénins ici.
          const code = (err as { code?: number } | undefined)?.code
          if (!err || code === 4 || code === 11) return resolve()
          reject(err)
        })
      })
    }
  }
}

export class SessionDisposedError extends Error {
  constructor() {
    super('Session annulée')
    this.name = 'SessionDisposedError'
  }
}

// ============================================================================
// Helpers
// ============================================================================

function resolveAgent(): string | undefined {
  if (process.env.SSH_AUTH_SOCK) return process.env.SSH_AUTH_SOCK
  if (process.platform === 'win32') return '\\\\.\\pipe\\openssh-ssh-agent'
  return undefined
}

function findDefaultPrivateKey(): { path: string; content: Buffer } | null {
  const sshDir = path.join(os.homedir(), '.ssh')
  for (const name of ['id_ed25519', 'id_ecdsa', 'id_rsa']) {
    const candidate = path.join(sshDir, name)
    try {
      const content = fs.readFileSync(candidate)
      // Une clé protégée par passphrase ne peut pas être déverrouillée ici :
      // on la laisse à l'agent SSH.
      if (content.includes('ENCRYPTED')) continue
      return { path: candidate, content }
    } catch {
      continue
    }
  }
  return null
}

/** Liste les chemins relatifs de tous les fichiers, en ignorant UPLOAD_IGNORE. */
function collectFiles(root: string, prefix = ''): string[] {
  const entries = fs.readdirSync(path.join(root, prefix), { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    if (UPLOAD_IGNORE.has(entry.name)) continue
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      files.push(...collectFiles(root, relative))
    } else if (entry.isFile()) {
      files.push(relative)
    }
  }
  return files
}

function posixJoin(base: string, relative: string): string {
  return `${base.replace(/\/+$/, '')}/${relative}`
}

/** Accumule les octets et n'émet que des lignes complètes. */
function lineSplitter(onLine?: (line: string) => void) {
  let buffer = ''
  return {
    push(chunk: Buffer) {
      if (!onLine) return
      buffer += chunk.toString('utf-8')
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trimEnd()
        if (trimmed) onLine(trimmed)
      }
    },
    flush() {
      if (onLine && buffer.trim()) onLine(buffer.trimEnd())
      buffer = ''
    },
  }
}
