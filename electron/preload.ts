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

  // Vault API
  vaultExists: () => ipcRenderer.invoke('vault:exists'),
  vaultIsUnlocked: () => ipcRenderer.invoke('vault:is-unlocked'),
  vaultCreate: (password: string, initialData?: Record<string, string>) => ipcRenderer.invoke('vault:create', password, initialData),
  vaultUnlock: (password: string) => ipcRenderer.invoke('vault:unlock', password),
  vaultSave: (config: Record<string, string>) => ipcRenderer.invoke('vault:save', config),
  vaultLock: () => ipcRenderer.invoke('vault:lock'),
  vaultReset: () => ipcRenderer.invoke('vault:reset'),
  vaultChangePassword: (oldPassword: string, newPassword: string) => ipcRenderer.invoke('vault:change-password', oldPassword, newPassword),
  vaultDecryptFile: (payload: any, password: string) => ipcRenderer.invoke('vault:decrypt-file', payload, password),

  // SSH Keys
  listSshKeys: () => ipcRenderer.invoke('ssh:list-keys'),
  generateSshKey: (customName?: string) => ipcRenderer.invoke('ssh:generate-key', customName),

  // Scaleway Automation
  createScalewayInstance: (options: {
    secretKey: string
    projectId: string
    sshPublicKey: string
    sshKeyName?: string
    zone?: string
    commercialType?: string
  }) => ipcRenderer.invoke('scaleway:create-instance', options),
  cancelScalewayInstance: () => ipcRenderer.invoke('scaleway:cancel'),
  onScalewayLog: (cb: (log: { message: string; status: 'info' | 'running' | 'done' | 'error'; progress?: number }) => void) => {
    const handler = (_event: any, log: any) => cb(log)
    ipcRenderer.on('scaleway:log', handler)
    return () => { ipcRenderer.removeListener('scaleway:log', handler) }
  },

  // Deploy
  getPlatform: () => ipcRenderer.invoke('deploy:get-platform'),
  writeEnvToDir: (dir: string, content: string) => ipcRenderer.invoke('deploy:write-env', dir, content),
  startDeploy: (ipv4: string, sourceDir: string, sshPassword?: string, sshKeyPath?: string) => ipcRenderer.invoke('deploy:start', ipv4, sourceDir, sshPassword, sshKeyPath),
  restartDocker: (ipv4: string, sshPassword?: string, sshKeyPath?: string) => ipcRenderer.invoke('deploy:restart', ipv4, sshPassword, sshKeyPath),
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

  // Provisioning (Configuration par API)
  startSupabaseProvision: (req: any) => ipcRenderer.invoke('provision:supabase:start', req),
  startSupabaseSiteSetup: (req: any) => ipcRenderer.invoke('provision:supabase:site-setup', req),
  listSupabaseOrganizations: (accessToken: string) => ipcRenderer.invoke('provision:supabase:organizations', accessToken),
  listSupabaseProjects: (accessToken: string) => ipcRenderer.invoke('provision:supabase:projects', accessToken),
  verifySupabaseProject: (accessToken: string, ref: string) => ipcRenderer.invoke('provision:supabase:verify-project', accessToken, ref),
  cancelProvision: (service: string) => ipcRenderer.invoke('provision:cancel', service),
  onProvisionLog: (cb: (payload: any) => void) => {
    const handler = (_event: any, payload: any) => cb(payload)
    ipcRenderer.on('provision:log', handler)
    return () => { ipcRenderer.removeListener('provision:log', handler) }
  },
  onProvisionProgress: (cb: (payload: any) => void) => {
    const handler = (_event: any, payload: any) => cb(payload)
    ipcRenderer.on('provision:progress', handler)
    return () => { ipcRenderer.removeListener('provision:progress', handler) }
  },
  onProvisionDone: (cb: (payload: any) => void) => {
    const handler = (_event: any, payload: any) => cb(payload)
    ipcRenderer.on('provision:done', handler)
    return () => { ipcRenderer.removeListener('provision:done', handler) }
  },
  onProvisionError: (cb: (payload: any) => void) => {
    const handler = (_event: any, payload: any) => cb(payload)
    ipcRenderer.on('provision:error', handler)
    return () => { ipcRenderer.removeListener('provision:error', handler) }
  },
  onProvisionCancelled: (cb: (payload: any) => void) => {
    const handler = (_event: any, payload: any) => cb(payload)
    ipcRenderer.on('provision:cancelled', handler)
    return () => { ipcRenderer.removeListener('provision:cancelled', handler) }
  },
})
