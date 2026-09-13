import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface SshKeyInfo {
  name: string
  filename: string
  publicKey: string
  publicKeyPath: string
  privateKeyPath: string
  hasPrivateKey: boolean
  keyType: string
}

export class SshKeyService {
  public static getSshDir(): string {
    return path.join(os.homedir(), '.ssh')
  }

  /**
   * Scan ~/.ssh/ directory for public and private SSH keys
   */
  public static async listKeys(): Promise<SshKeyInfo[]> {
    const sshDir = this.getSshDir()
    if (!fs.existsSync(sshDir)) {
      return []
    }

    try {
      const files = fs.readdirSync(sshDir)
      const pubFiles = files.filter(f => f.endsWith('.pub'))
      const keys: SshKeyInfo[] = []

      for (const pubFile of pubFiles) {
        try {
          const pubPath = path.join(sshDir, pubFile)
          const content = fs.readFileSync(pubPath, 'utf-8').trim()
          if (!content) continue

          const privateFile = pubFile.replace(/\.pub$/, '')
          const privatePath = path.join(sshDir, privateFile)
          const hasPrivate = fs.existsSync(privatePath)

          const parts = content.split(/\s+/)
          const keyType = parts[0] || 'ssh-unknown'
          const comment = parts.length > 2 ? parts.slice(2).join(' ') : privateFile

          keys.push({
            name: comment || privateFile,
            filename: pubFile,
            publicKey: content,
            publicKeyPath: pubPath,
            privateKeyPath: privatePath,
            hasPrivateKey: hasPrivate,
            keyType,
          })
        } catch {
          // ignore unreadable key file
        }
      }

      return keys
    } catch {
      return []
    }
  }

  /**
   * Generate a new Ed25519 SSH key pair in ~/.ssh/
   */
  public static async generateKey(customName?: string): Promise<SshKeyInfo> {
    const sshDir = this.getSshDir()
    if (!fs.existsSync(sshDir)) {
      fs.mkdirSync(sshDir, { recursive: true, mode: 0o700 })
    }

    const baseName = (customName || 'id_ed25519_intriqathon').replace(/[^a-zA-Z0-9_-]/g, '_')
    let finalName = baseName
    let privatePath = path.join(sshDir, finalName)

    if (fs.existsSync(privatePath)) {
      const suffix = Math.floor(Date.now() / 1000)
      finalName = `${baseName}_${suffix}`
      privatePath = path.join(sshDir, finalName)
    }

    const pubPath = `${privatePath}.pub`

    // Try ssh-keygen
    try {
      await execFileAsync('ssh-keygen', [
        '-t', 'ed25519',
        '-C', 'intriqathon',
        '-N', '',
        '-f', privatePath,
      ])
    } catch (err: any) {
      throw new Error(`Échec de la génération de clé SSH avec ssh-keygen : ${err.message || String(err)}`)
    }

    if (!fs.existsSync(pubPath)) {
      throw new Error('La clé publique générée est introuvable après ssh-keygen')
    }

    const content = fs.readFileSync(pubPath, 'utf-8').trim()
    const parts = content.split(/\s+/)
    const keyType = parts[0] || 'ssh-ed25519'
    const comment = parts.length > 2 ? parts.slice(2).join(' ') : finalName

    return {
      name: comment || finalName,
      filename: `${finalName}.pub`,
      publicKey: content,
      publicKeyPath: pubPath,
      privateKeyPath: privatePath,
      hasPrivateKey: true,
      keyType,
    }
  }
}
