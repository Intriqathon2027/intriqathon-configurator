import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

export interface EncryptedPayload {
  version: number
  algorithm: 'aes-256-gcm'
  kdf: 'pbkdf2'
  kdfIterations: number
  salt: string
  iv: string
  tag: string
  ciphertext: string
}

const KDF_ITERATIONS = 100_000
const KEY_LENGTH = 32 // 256 bits

export class CryptoService {
  private static sessionPassword: string | null = null

  private static getVaultPath(): string {
    return path.join(app.getPath('userData'), 'vault.enc')
  }

  private static getLegacyConfigPath(): string {
    return path.join(app.getPath('userData'), 'local-config.json')
  }

  /**
   * Derive a 256-bit AES key from password and salt using PBKDF2-SHA512
   */
  private static deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, KDF_ITERATIONS, KEY_LENGTH, 'sha512')
  }

  /**
   * Encrypt a JavaScript object / string using AES-256-GCM
   */
  public static encrypt(data: unknown, password: string): EncryptedPayload {
    const salt = crypto.randomBytes(16)
    const iv = crypto.randomBytes(12) // 96-bit recommended for GCM
    const key = this.deriveKey(password, salt)

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data)

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex')
    ciphertext += cipher.final('hex')
    const tag = cipher.getAuthTag().toString('hex')

    return {
      version: 1,
      algorithm: 'aes-256-gcm',
      kdf: 'pbkdf2',
      kdfIterations: KDF_ITERATIONS,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag,
      ciphertext,
    }
  }

  /**
   * Decrypt an encrypted payload using the provided password
   */
  public static decrypt<T = unknown>(payload: EncryptedPayload, password: string): T {
    if (payload.algorithm !== 'aes-256-gcm') {
      throw new Error(`Algorithme non supporté: ${payload.algorithm}`)
    }

    const salt = Buffer.from(payload.salt, 'hex')
    const iv = Buffer.from(payload.iv, 'hex')
    const tag = Buffer.from(payload.tag, 'hex')
    const key = this.deriveKey(password, salt)

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    try {
      return JSON.parse(decrypted) as T
    } catch {
      return decrypted as unknown as T
    }
  }

  /**
   * Check if vault file exists
   */
  public static vaultExists(): boolean {
    return fs.existsSync(this.getVaultPath())
  }

  /**
   * Check if there is an active session (password held in memory)
   */
  public static isUnlocked(): boolean {
    return this.sessionPassword !== null
  }

  /**
   * Lock the session by forgetting the master password
   */
  public static lock(): void {
    this.sessionPassword = null
  }

  /**
   * Create a new vault with a password and initial data
   */
  public static createVault(password: string, initialData: Record<string, string> = {}): boolean {
    // If there is legacy config, merge it
    const legacyPath = this.getLegacyConfigPath()
    let dataToSave = initialData
    if (fs.existsSync(legacyPath)) {
      try {
        const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'))
        dataToSave = { ...legacy, ...initialData }
      } catch {
        // ignore legacy parse errors
      }
    }

    const encrypted = this.encrypt(dataToSave, password)
    fs.writeFileSync(this.getVaultPath(), JSON.stringify(encrypted, null, 2), 'utf8')

    // Clean up legacy plain file if it existed
    if (fs.existsSync(legacyPath)) {
      try {
        fs.unlinkSync(legacyPath)
      } catch {
        // ignore
      }
    }

    this.sessionPassword = password
    return true
  }

  /**
   * Unlock the vault with the password and return decrypted config
   */
  public static unlockVault(password: string): { success: boolean; data?: Record<string, string>; error?: string } {
    const vaultPath = this.getVaultPath()
    if (!fs.existsSync(vaultPath)) {
      return { success: false, error: 'Vault introuvable' }
    }

    try {
      const raw = fs.readFileSync(vaultPath, 'utf8')
      const payload: EncryptedPayload = JSON.parse(raw)
      const data = this.decrypt<Record<string, string>>(payload, password)
      this.sessionPassword = password
      return { success: true, data }
    } catch (err) {
      return { success: false, error: 'Mot de passe incorrect ou données corrompues' }
    }
  }

  /**
   * Save configuration to the vault using the active session password
   */
  public static saveVault(config: Record<string, string>, password?: string): boolean {
    const pwd = password || this.sessionPassword
    if (!pwd) {
      throw new Error('Vault verrouillé : impossible de sauvegarder sans mot de passe')
    }

    const encrypted = this.encrypt(config, pwd)
    fs.writeFileSync(this.getVaultPath(), JSON.stringify(encrypted, null, 2), 'utf8')
    return true
  }

  /**
   * Reset / delete the vault and any legacy configuration completely
   */
  public static resetVault(): boolean {
    this.sessionPassword = null
    const vaultPath = this.getVaultPath()
    if (fs.existsSync(vaultPath)) {
      try {
        fs.unlinkSync(vaultPath)
      } catch {
        // ignore
      }
    }

    const legacyPath = this.getLegacyConfigPath()
    if (fs.existsSync(legacyPath)) {
      try {
        fs.unlinkSync(legacyPath)
      } catch {
        // ignore
      }
    }

    return true
  }

  /**
   * Change master password of the vault
   */
  public static changePassword(oldPassword: string, newPassword: string): boolean {
    const unlockResult = this.unlockVault(oldPassword)
    if (!unlockResult.success || !unlockResult.data) {
      throw new Error('Ancien mot de passe incorrect')
    }

    this.sessionPassword = newPassword
    return this.saveVault(unlockResult.data, newPassword)
  }

  /**
   * Get active session password (for export encryption)
   */
  public static getSessionPassword(): string | null {
    return this.sessionPassword
  }

  /**
   * Retrieve decrypted data if currently unlocked in memory
   */
  public static getVaultData(): Record<string, string> | null {
    if (!this.sessionPassword) return null
    const result = this.unlockVault(this.sessionPassword)
    return result.success && result.data ? result.data : null
  }
}
