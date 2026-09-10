import { ipcMain, dialog } from 'electron'
import type { BrowserWindow } from 'electron'
import fs from 'node:fs'
import { CryptoService, type EncryptedPayload } from '../crypto/cryptoService'

export function registerVaultHandlers(getWin: () => BrowserWindow | null): void {
  ipcMain.handle('vault:exists', () => {
    return CryptoService.vaultExists()
  })

  ipcMain.handle('vault:is-unlocked', () => {
    return CryptoService.isUnlocked()
  })

  ipcMain.handle('vault:create', (_event, password: string, initialData?: Record<string, string>) => {
    try {
      const ok = CryptoService.createVault(password, initialData || {})
      return { success: ok }
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur lors de la création du coffre' }
    }
  })

  ipcMain.handle('vault:unlock', (_event, password: string) => {
    return CryptoService.unlockVault(password)
  })

  ipcMain.handle('vault:save', (_event, config: Record<string, string>) => {
    try {
      const ok = CryptoService.saveVault(config)
      return { success: ok }
    } catch (err: any) {
      return { success: false, error: err.message || 'Impossible de sauvegarder dans le coffre' }
    }
  })

  ipcMain.handle('vault:lock', () => {
    CryptoService.lock()
    return { success: true }
  })

  ipcMain.handle('vault:reset', () => {
    const ok = CryptoService.resetVault()
    return { success: ok }
  })

  ipcMain.handle('vault:change-password', (_event, oldPassword: string, newPassword: string) => {
    try {
      const ok = CryptoService.changePassword(oldPassword, newPassword)
      return { success: ok }
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur lors du changement de mot de passe' }
    }
  })

  ipcMain.handle('vault:decrypt-file', (_event, payload: EncryptedPayload, password: string) => {
    try {
      const data = CryptoService.decrypt<Record<string, string>>(payload, password)
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: 'Mot de passe incorrect pour déchiffrer ce fichier' }
    }
  })

  // Export encrypted config
  ipcMain.handle('export-config', async (_event, config: Record<string, string>) => {
    const win = getWin()
    const result = await dialog.showSaveDialog(win!, {
      title: 'Exporter la configuration chiffrée',
      defaultPath: 'intriqathon-config.enc.json',
      filters: [{ name: 'Fichiers JSON chiffrés', extensions: ['json'] }],
    })

    if (!result.canceled && result.filePath) {
      const pwd = CryptoService.getSessionPassword()
      if (!pwd) {
        return { success: false, error: 'Coffre non déverrouillé pour chiffrer l\'export' }
      }
      const encrypted = CryptoService.encrypt(config, pwd)
      fs.writeFileSync(result.filePath, JSON.stringify(encrypted, null, 2), 'utf-8')
      return { success: true, path: result.filePath }
    }
    return { success: false }
  })

  // Import encrypted config
  ipcMain.handle('import-config', async () => {
    const win = getWin()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Importer la configuration',
      properties: ['openFile'],
      filters: [{ name: 'Fichiers JSON', extensions: ['json'] }],
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0]
      try {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const parsed = JSON.parse(raw)

        // Check if file is encrypted payload
        if (parsed && parsed.algorithm === 'aes-256-gcm' && parsed.ciphertext) {
          const pwd = CryptoService.getSessionPassword()
          if (pwd) {
            try {
              const decrypted = CryptoService.decrypt<Record<string, string>>(parsed, pwd)
              return { data: decrypted, path: filePath }
            } catch {
              // Password was different than current session password
              return { requiresPassword: true, path: filePath, encryptedData: parsed }
            }
          }
          return { requiresPassword: true, path: filePath, encryptedData: parsed }
        }

        // Legacy unencrypted JSON fallback
        return { data: parsed, path: filePath }
      } catch {
        return null
      }
    }
    return null
  })

  // Read config file (supporting encrypted configs)
  ipcMain.handle('read-config-file', async (_event, filePath: string) => {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const parsed = JSON.parse(raw)
        if (parsed && parsed.algorithm === 'aes-256-gcm' && parsed.ciphertext) {
          const pwd = CryptoService.getSessionPassword()
          if (pwd) {
            return CryptoService.decrypt<Record<string, string>>(parsed, pwd)
          }
          return null
        }
        return parsed
      } catch {
        return null
      }
    }
    return null
  })

  // Save local config fallback: forwards to vault if unlocked
  ipcMain.handle('save-local-config', async (_event, config: Record<string, string>) => {
    if (CryptoService.isUnlocked()) {
      CryptoService.saveVault(config)
      return { success: true }
    }
    return { success: false, error: 'Vault non déverrouillé' }
  })

  // Load local config fallback: returns vault data if unlocked
  ipcMain.handle('load-local-config', async () => {
    if (CryptoService.isUnlocked()) {
      return CryptoService.getVaultData() ?? {}
    }
    return {}
  })
}
