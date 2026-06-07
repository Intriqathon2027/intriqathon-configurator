import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  saveEnvFile: (content: string) => ipcRenderer.invoke('save-env-file', content),
  saveLocalConfig: (config: Record<string, string>) => ipcRenderer.invoke('save-local-config', config),
  loadLocalConfig: () => ipcRenderer.invoke('load-local-config'),
  exportConfig: (config: Record<string, string>) => ipcRenderer.invoke('export-config', config),
  importConfig: () => ipcRenderer.invoke('import-config'),
})
