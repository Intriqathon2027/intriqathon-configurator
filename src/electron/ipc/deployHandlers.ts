import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import { DeployService } from '../services/DeployService'
import { PlatformService } from '../services/PlatformService'

export function registerDeployHandlers(getWin: () => BrowserWindow | null): void {
  const deployService = new DeployService()

  ipcMain.handle('deploy:get-platform', () => PlatformService.getPlatform())
  ipcMain.handle('deploy:write-env', (_event, dirPath: string, content: string) => PlatformService.writeEnvFile(dirPath, content))
  ipcMain.handle('deploy:start', (_event, ipv4: string, sourceDir: string, sshPassword?: string) => {
    const win = getWin()
    if (!win) throw new Error('No active window')
    deployService.start(ipv4, sourceDir, win, sshPassword)
  })
  ipcMain.handle('deploy:restart', (_event, ipv4: string, sshPassword?: string) => {
    const win = getWin()
    if (!win) throw new Error('No active window')
    deployService.startRestart(ipv4, win, sshPassword)
  })
  ipcMain.handle('deploy:cancel', () => deployService.cancel())
  ipcMain.handle('deploy:send-input', (_event, text: string) => deployService.sendInput(text))
}
