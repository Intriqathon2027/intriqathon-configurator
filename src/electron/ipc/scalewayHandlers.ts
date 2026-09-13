import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import { ScalewayService, type ScalewayCreateOptions } from '../services/ScalewayService'

export function registerScalewayHandlers(getWin: () => BrowserWindow | null): void {
  let activeService: ScalewayService | null = null

  ipcMain.handle('scaleway:create-instance', async (_event, options: ScalewayCreateOptions) => {
    const win = getWin()
    activeService = new ScalewayService()
    try {
      const result = await activeService.createInstance(options, win)
      return { success: true, ...result }
    } catch (err: any) {
      return { success: false, error: err.message || String(err) }
    } finally {
      activeService = null
    }
  })

  ipcMain.handle('scaleway:cancel', () => {
    if (activeService) {
      activeService.cancel()
    }
    return { success: true }
  })
}
