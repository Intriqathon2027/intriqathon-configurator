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
  saveRecentConfigs: (configs: Array<{ name: string; path: string; savedAt: string }>) => ipcRenderer.invoke('save-recent-configs', configs),
  loadRecentConfigs: () => ipcRenderer.invoke('load-recent-configs'),
  readConfigFile: (filePath: string) => ipcRenderer.invoke('read-config-file', filePath),

  // Deploy
  getPlatform: () => ipcRenderer.invoke('deploy:get-platform'),
  writeEnvToDir: (dir: string, content: string) => ipcRenderer.invoke('deploy:write-env', dir, content),
  startDeploy: (ipv4: string, sourceDir: string, sshPassword?: string) => ipcRenderer.invoke('deploy:start', ipv4, sourceDir, sshPassword),
  restartDocker: (ipv4: string, sshPassword?: string) => ipcRenderer.invoke('deploy:restart', ipv4, sshPassword),
  cancelDeploy: () => ipcRenderer.invoke('deploy:cancel'),
  sendDeployInput: (text: string) => ipcRenderer.invoke('deploy:send-input', text),
  onDeployStdout: (cb: (line: string) => void) => {
    const handler = (_event: any, line: string) => cb(line)
    ipcRenderer.on('deploy:stdout', handler)
    return () => { ipcRenderer.removeListener('deploy:stdout', handler) }
  },
  onDeployStderr: (cb: (line: string) => void) => {
    const handler = (_event: any, line: string) => cb(line)
    ipcRenderer.on('deploy:stderr', handler)
    return () => { ipcRenderer.removeListener('deploy:stderr', handler) }
  },
  onDeployExit: (cb: (code: number | null) => void) => {
    const handler = (_event: any, code: number | null) => cb(code)
    ipcRenderer.on('deploy:exit', handler)
    return () => { ipcRenderer.removeListener('deploy:exit', handler) }
  },
  onDeployError: (cb: (error: string) => void) => {
    const handler = (_event: any, error: string) => cb(error)
    ipcRenderer.on('deploy:error', handler)
    return () => { ipcRenderer.removeListener('deploy:error', handler) }
  },
})
