// ============================================================================
// Pont renderer ↔ main. Surface minimale, adossée au contrat shared/ipc.ts :
// le renderer n'écrit jamais un nom de canal en dur.
// ============================================================================

import { contextBridge, ipcRenderer } from 'electron'
import {
  IpcChannel,
  type DeployEvent,
  type DeployRequest,
  type DeployStartResult,
  type RecentConfig,
} from '../shared/ipc'

const api = {
  // ── Système ──────────────────────────────────────────────────────────────
  getPlatform: () => ipcRenderer.invoke(IpcChannel.GetPlatform),
  openExternalUrl: (url: string) => ipcRenderer.invoke(IpcChannel.OpenExternalUrl, url),

  // ── Fichiers & configuration ─────────────────────────────────────────────
  openFolderDialog: () => ipcRenderer.invoke(IpcChannel.OpenFolderDialog),
  saveEnvFile: (content: string) => ipcRenderer.invoke(IpcChannel.SaveEnvFile, content),
  writeEnvToDir: (dir: string, content: string) => ipcRenderer.invoke(IpcChannel.WriteEnvToDir, dir, content),
  saveLocalConfig: (config: Record<string, string>) => ipcRenderer.invoke(IpcChannel.SaveLocalConfig, config),
  loadLocalConfig: () => ipcRenderer.invoke(IpcChannel.LoadLocalConfig),
  exportConfig: (config: Record<string, string>) => ipcRenderer.invoke(IpcChannel.ExportConfig, config),
  importConfig: () => ipcRenderer.invoke(IpcChannel.ImportConfig),
  saveRecentConfigs: (configs: RecentConfig[]) => ipcRenderer.invoke(IpcChannel.SaveRecentConfigs, configs),
  loadRecentConfigs: () => ipcRenderer.invoke(IpcChannel.LoadRecentConfigs),
  readConfigFile: (filePath: string) => ipcRenderer.invoke(IpcChannel.ReadConfigFile, filePath),

  // ── Déploiement ──────────────────────────────────────────────────────────
  startDeploy: (request: DeployRequest): Promise<DeployStartResult> =>
    ipcRenderer.invoke(IpcChannel.DeployStart, request),
  restartDocker: (request: DeployRequest): Promise<DeployStartResult> =>
    ipcRenderer.invoke(IpcChannel.DeployRestart, request),
  cancelDeploy: (jobId?: string): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannel.DeployCancel, jobId),

  /** Un seul canal d'événements, filtré par jobId côté renderer.
   *  Renvoie la fonction de désabonnement. */
  onDeployEvent: (callback: (event: DeployEvent) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, payload: DeployEvent) => callback(payload)
    ipcRenderer.on(IpcChannel.DeployEvent, handler)
    return () => { ipcRenderer.removeListener(IpcChannel.DeployEvent, handler) }
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronApi = typeof api
