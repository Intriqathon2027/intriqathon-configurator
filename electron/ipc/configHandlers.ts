// ============================================================================
// Canaux « configuration » : dialogues de fichiers et persistance locale.
// Extrait de main.ts, qui ne fait plus que du bootstrap.
// ============================================================================

import fs from 'node:fs'
import path from 'node:path'
import { dialog, ipcMain, shell, type BrowserWindow } from 'electron'
import {
  IpcChannel,
  type RecentConfig,
  type SavePathResult,
  type WriteResult,
} from '../../shared/ipc'
import { ConfigStore } from '../services/ConfigStore'
import { PlatformService } from '../services/PlatformService'
import { assertSafeAbsolutePath, isSafeExternalUrl } from '../security/validate'

const LOCAL_CONFIG = 'local-config.json'
const RECENT_CONFIGS = 'recent-configs.json'

export function registerConfigHandlers(getWin: () => BrowserWindow | null): void {
  const store = new ConfigStore()

  /** Une fenêtre détruite ne peut pas parenter un dialogue : on retombe sur
   *  un dialogue non modal plutôt que de laisser Electron planter. */
  const parent = (): BrowserWindow | undefined => {
    const win = getWin()
    return win && !win.isDestroyed() ? win : undefined
  }

  ipcMain.handle(IpcChannel.GetPlatform, () => PlatformService.getPlatform())

  ipcMain.handle(IpcChannel.OpenExternalUrl, async (_event, url: unknown) => {
    if (!isSafeExternalUrl(url)) {
      throw new Error(`URL refusée (http/https uniquement) : ${String(url)}`)
    }
    await shell.openExternal(url)
  })

  ipcMain.handle(IpcChannel.OpenFolderDialog, async (): Promise<string | null> => {
    const win = parent()
    const options = { properties: ['openDirectory'] as const, title: 'Sélectionner le dossier de déploiement' }
    const result = win
      ? await dialog.showOpenDialog(win, { ...options, properties: [...options.properties] })
      : await dialog.showOpenDialog({ ...options, properties: [...options.properties] })
    return !result.canceled && result.filePaths.length > 0 ? result.filePaths[0] : null
  })

  ipcMain.handle(IpcChannel.SaveEnvFile, async (_event, content: string): Promise<SavePathResult> => {
    const win = parent()
    const options = {
      title: 'Sauvegarder le fichier .env',
      defaultPath: '.env',
      filters: [{ name: 'Env Files', extensions: ['env'] }],
    }
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return { success: false }
    ConfigStore.writeTextAt(result.filePath, content)
    return { success: true, path: result.filePath }
  })

  /** Écrit le .env dans le dossier de déploiement choisi par l'utilisateur.
   *  Le chemin est validé : le renderer ne peut pas faire écrire n'importe où. */
  ipcMain.handle(IpcChannel.WriteEnvToDir, (_event, dirPath: unknown, content: unknown): WriteResult => {
    try {
      const dir = assertSafeAbsolutePath(dirPath, 'Dossier de déploiement')
      if (!fs.statSync(dir).isDirectory()) {
        return { success: false, error: `${dir} n'est pas un dossier` }
      }
      if (typeof content !== 'string') {
        return { success: false, error: 'Contenu .env invalide' }
      }
      ConfigStore.writeTextAt(path.join(dir, '.env'), content)
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IpcChannel.SaveLocalConfig, (_event, config: Record<string, string>) => {
    store.writeJson(LOCAL_CONFIG, config)
    return { success: true }
  })

  ipcMain.handle(IpcChannel.LoadLocalConfig, () => store.readJson<Record<string, string>>(LOCAL_CONFIG, {}))

  ipcMain.handle(IpcChannel.ExportConfig, async (_event, config: Record<string, string>): Promise<SavePathResult> => {
    const win = parent()
    const options = {
      title: 'Exporter la configuration',
      defaultPath: 'intriqathon-config.json',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    }
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return { success: false }
    ConfigStore.writeTextAt(result.filePath, JSON.stringify(config, null, 2))
    return { success: true, path: result.filePath }
  })

  ipcMain.handle(IpcChannel.ImportConfig, async () => {
    const win = parent()
    const options = {
      title: 'Importer la configuration',
      properties: ['openFile' as const],
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    }
    const result = win
      ? await dialog.showOpenDialog(win, { ...options, properties: [...options.properties] })
      : await dialog.showOpenDialog({ ...options, properties: [...options.properties] })
    if (result.canceled || result.filePaths.length === 0) return null

    const data = ConfigStore.readJsonAt<Record<string, string> | null>(result.filePaths[0], null)
    return data ? { data, path: result.filePaths[0] } : null
  })

  ipcMain.handle(IpcChannel.SaveRecentConfigs, (_event, configs: RecentConfig[]) => {
    store.writeJson(RECENT_CONFIGS, configs)
    return { success: true }
  })

  ipcMain.handle(IpcChannel.LoadRecentConfigs, () => store.readJson<RecentConfig[]>(RECENT_CONFIGS, []))

  ipcMain.handle(IpcChannel.ReadConfigFile, (_event, filePath: unknown) => {
    if (typeof filePath !== 'string') return null
    return ConfigStore.readJsonAt<Record<string, string> | null>(filePath, null)
  })
}
