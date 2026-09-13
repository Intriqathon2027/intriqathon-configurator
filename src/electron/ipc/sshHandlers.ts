import { ipcMain } from 'electron'
import { SshKeyService } from '../services/SshKeyService'

export function registerSshHandlers(): void {
  ipcMain.handle('ssh:list-keys', async () => {
    return SshKeyService.listKeys()
  })

  ipcMain.handle('ssh:generate-key', async (_event, customName?: string) => {
    try {
      const keyInfo = await SshKeyService.generateKey(customName)
      return { success: true, key: keyInfo }
    } catch (err: any) {
      return { success: false, error: err.message || String(err) }
    }
  })
}
