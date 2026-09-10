import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Create a temp folder for tests
let tempDir: string

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData') return tempDir
      return tempDir
    },
  },
}))

// Import CryptoService after electron mock
import { CryptoService, type EncryptedPayload } from '../src/electron/crypto/cryptoService'

describe('CryptoService', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'intriqathon-test-'))
    CryptoService.lock()
  })

  afterEach(() => {
    CryptoService.lock()
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  })

  describe('Core Encryption & Decryption (AES-256-GCM)', () => {
    const testPassword = 'SuperSecretMasterPassword123!'
    const testData = {
      DOMAIN: 'hackathon.example.com',
      SPACESHIP_API_KEY: 'api_key_abc_123',
      SPACESHIP_API_SECRET: 'secret_key_xyz_789',
      BOT_TOKEN: 'discord_token_test_123',
    }

    it('should encrypt and decrypt data accurately', () => {
      const encrypted = CryptoService.encrypt(testData, testPassword)

      expect(encrypted.version).toBe(1)
      expect(encrypted.algorithm).toBe('aes-256-gcm')
      expect(encrypted.kdf).toBe('pbkdf2')
      expect(encrypted.kdfIterations).toBe(100_000)
      expect(encrypted.salt).toBeDefined()
      expect(encrypted.iv).toBeDefined()
      expect(encrypted.tag).toBeDefined()
      expect(encrypted.ciphertext).toBeDefined()

      // The ciphertext must not contain any plain values
      expect(encrypted.ciphertext).not.toContain('hackathon.example.com')
      expect(encrypted.ciphertext).not.toContain('api_key_abc_123')

      // Decrypt
      const decrypted = CryptoService.decrypt<typeof testData>(encrypted, testPassword)
      expect(decrypted).toEqual(testData)
    })

    it('should generate unique salt and IV for every encryption call', () => {
      const enc1 = CryptoService.encrypt(testData, testPassword)
      const enc2 = CryptoService.encrypt(testData, testPassword)

      expect(enc1.salt).not.toBe(enc2.salt)
      expect(enc1.iv).not.toBe(enc2.iv)
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext)
    })

    it('should fail decryption if wrong password is provided', () => {
      const encrypted = CryptoService.encrypt(testData, testPassword)

      expect(() => {
        CryptoService.decrypt(encrypted, 'WrongPassword!')
      }).toThrow()
    })

    it('should fail decryption if ciphertext is tampered with', () => {
      const encrypted = CryptoService.encrypt(testData, testPassword)

      // Tamper with the last character of ciphertext
      const tamperedCiphertext =
        encrypted.ciphertext.slice(0, -1) + (encrypted.ciphertext.endsWith('0') ? '1' : '0')
      const tamperedPayload: EncryptedPayload = {
        ...encrypted,
        ciphertext: tamperedCiphertext,
      }

      expect(() => {
        CryptoService.decrypt(tamperedPayload, testPassword)
      }).toThrow()
    })

    it('should fail decryption if auth tag is tampered with', () => {
      const encrypted = CryptoService.encrypt(testData, testPassword)

      // Tamper with the auth tag
      const tamperedTag =
        encrypted.tag.slice(0, -1) + (encrypted.tag.endsWith('0') ? '1' : '0')
      const tamperedPayload: EncryptedPayload = {
        ...encrypted,
        tag: tamperedTag,
      }

      expect(() => {
        CryptoService.decrypt(tamperedPayload, testPassword)
      }).toThrow()
    })

    it('should throw error for unsupported algorithm', () => {
      const invalidPayload = {
        version: 1,
        algorithm: 'des' as any,
        kdf: 'pbkdf2' as const,
        kdfIterations: 100000,
        salt: '00',
        iv: '00',
        tag: '00',
        ciphertext: '00',
      }

      expect(() => {
        CryptoService.decrypt(invalidPayload, testPassword)
      }).toThrow(/non supporté/)
    })
  })

  describe('Vault Storage & Lifecycle', () => {
    const password = 'MyVaultPassword2026!'
    const initialConfig = {
      DOMAIN: 'domain.fr',
      RESEND_API_KEY: 're_secret_key',
    }

    it('should detect when vault does not exist initially', () => {
      expect(CryptoService.vaultExists()).toBe(false)
      expect(CryptoService.isUnlocked()).toBe(false)
    })

    it('should create a vault, persist encrypted file and unlock session', () => {
      const created = CryptoService.createVault(password, initialConfig)
      expect(created).toBe(true)
      expect(CryptoService.vaultExists()).toBe(true)
      expect(CryptoService.isUnlocked()).toBe(true)
      expect(CryptoService.getSessionPassword()).toBe(password)

      // Inspect file content on disk: must NOT be plaintext
      const vaultPath = path.join(tempDir, 'vault.enc')
      const rawContent = fs.readFileSync(vaultPath, 'utf8')
      expect(rawContent).not.toContain('domain.fr')
      expect(rawContent).not.toContain('re_secret_key')

      const parsed: EncryptedPayload = JSON.parse(rawContent)
      expect(parsed.algorithm).toBe('aes-256-gcm')
    })

    it('should lock and unlock vault with password', () => {
      CryptoService.createVault(password, initialConfig)
      expect(CryptoService.isUnlocked()).toBe(true)

      CryptoService.lock()
      expect(CryptoService.isUnlocked()).toBe(false)
      expect(CryptoService.getSessionPassword()).toBeNull()

      // Unlock with wrong password
      const badResult = CryptoService.unlockVault('BadPassword')
      expect(badResult.success).toBe(false)
      expect(CryptoService.isUnlocked()).toBe(false)

      // Unlock with correct password
      const goodResult = CryptoService.unlockVault(password)
      expect(goodResult.success).toBe(true)
      expect(goodResult.data).toEqual(initialConfig)
      expect(CryptoService.isUnlocked()).toBe(true)
    })

    it('should allow updating config in vault when unlocked', () => {
      CryptoService.createVault(password, initialConfig)

      const updated = {
        ...initialConfig,
        BOT_TOKEN: 'new_token_456',
      }
      CryptoService.saveVault(updated)

      // Lock and re-unlock to verify persistence
      CryptoService.lock()
      const unlockRes = CryptoService.unlockVault(password)
      expect(unlockRes.success).toBe(true)
      expect(unlockRes.data).toEqual(updated)
    })

    it('should reject saveVault when locked without password parameter', () => {
      CryptoService.createVault(password, initialConfig)
      CryptoService.lock()

      expect(() => {
        CryptoService.saveVault({ DOMAIN: 'test.com' })
      }).toThrow(/verrouillé/)
    })

    it('should change password properly and invalidate old password', () => {
      CryptoService.createVault(password, initialConfig)
      const newPassword = 'NewSecretPassword987!'

      const changed = CryptoService.changePassword(password, newPassword)
      expect(changed).toBe(true)
      expect(CryptoService.getSessionPassword()).toBe(newPassword)

      // Lock
      CryptoService.lock()

      // Old password should fail
      const oldRes = CryptoService.unlockVault(password)
      expect(oldRes.success).toBe(false)

      // New password should succeed
      const newRes = CryptoService.unlockVault(newPassword)
      expect(newRes.success).toBe(true)
      expect(newRes.data).toEqual(initialConfig)
    })

    it('should reject changePassword if the current password is incorrect', () => {
      CryptoService.createVault(password, initialConfig)
      expect(() => {
        CryptoService.changePassword('WrongOldPassword!', 'NewSecretPassword987!')
      }).toThrow(/incorrect/)
    })

    it('should reset vault completely and remove vault.enc', () => {
      CryptoService.createVault(password, initialConfig)
      expect(CryptoService.vaultExists()).toBe(true)

      const reset = CryptoService.resetVault()
      expect(reset).toBe(true)
      expect(CryptoService.vaultExists()).toBe(false)
      expect(CryptoService.isUnlocked()).toBe(false)
      expect(CryptoService.getSessionPassword()).toBeNull()

      const vaultPath = path.join(tempDir, 'vault.enc')
      expect(fs.existsSync(vaultPath)).toBe(false)
    })

    it('should migrate legacy plain local-config.json upon vault creation', () => {
      const legacyPath = path.join(tempDir, 'local-config.json')
      const legacyData = {
        DOMAIN: 'legacy.domain.org',
        SUPABASE_ANON_KEY: 'anon_key_123',
      }
      fs.writeFileSync(legacyPath, JSON.stringify(legacyData), 'utf8')

      // Create vault
      CryptoService.createVault(password, { EXTRA_KEY: 'extra_val' })

      // Legacy file must have been deleted for privacy
      expect(fs.existsSync(legacyPath)).toBe(false)

      // Vault contains both legacy and new data
      const result = CryptoService.unlockVault(password)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        DOMAIN: 'legacy.domain.org',
        SUPABASE_ANON_KEY: 'anon_key_123',
        EXTRA_KEY: 'extra_val',
      })
    })

    it('should return decrypted data from getVaultData when unlocked, and null when locked', () => {
      expect(CryptoService.getVaultData()).toBeNull()

      CryptoService.createVault(password, initialConfig)
      expect(CryptoService.getVaultData()).toEqual(initialConfig)

      CryptoService.lock()
      expect(CryptoService.getVaultData()).toBeNull()

      CryptoService.unlockVault(password)
      expect(CryptoService.getVaultData()).toEqual(initialConfig)
    })
  })
})
