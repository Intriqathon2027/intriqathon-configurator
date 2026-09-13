// Electron API types exposed by preload
export interface RecentConfig {
  name: string
  path: string
  savedAt: string
}

export interface ImportConfigResult {
  data?: Record<string, string>
  path: string
  requiresPassword?: boolean
  encryptedData?: any
}

export interface SshKeyInfo {
  name: string
  filename: string
  publicKey: string
  publicKeyPath: string
  privateKeyPath: string
  hasPrivateKey: boolean
  keyType: string
}

export interface ScalewayCreateResult {
  success: boolean
  ipv4?: string
  serverId?: string
  error?: string
}

export interface ScalewayLogEvent {
  message: string
  status: 'info' | 'running' | 'done' | 'error'
  progress?: number
}

export interface ElectronAPI {
  openExternalUrl: (url: string) => Promise<void>
  openFolderDialog: () => Promise<string | null>
  saveEnvFile: (content: string) => Promise<{ success: boolean; path?: string }>
  saveLocalConfig: (config: Record<string, string>) => Promise<{ success: boolean }>
  loadLocalConfig: () => Promise<Record<string, string>>
  exportConfig: (config: Record<string, string>) => Promise<{ success: boolean; path?: string; error?: string }>
  importConfig: () => Promise<ImportConfigResult | null>
  saveRecentConfigs: (configs: RecentConfig[]) => Promise<{ success: boolean }>
  loadRecentConfigs: () => Promise<RecentConfig[]>
  readConfigFile: (filePath: string) => Promise<Record<string, string> | ImportConfigResult | null>

  // Vault
  vaultExists: () => Promise<boolean>
  vaultIsUnlocked: () => Promise<boolean>
  vaultCreate: (password: string, initialData?: Record<string, string>) => Promise<{ success: boolean; error?: string }>
  vaultUnlock: (password: string) => Promise<{ success: boolean; data?: Record<string, string>; error?: string }>
  vaultSave: (config: Record<string, string>) => Promise<{ success: boolean; error?: string }>
  vaultLock: () => Promise<{ success: boolean }>
  vaultReset: () => Promise<{ success: boolean }>
  vaultChangePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  vaultDecryptFile: (payload: any, password: string) => Promise<{ success: boolean; data?: Record<string, string>; error?: string }>

  // SSH
  listSshKeys: () => Promise<SshKeyInfo[]>
  generateSshKey: (customName?: string) => Promise<{ success: boolean; key?: SshKeyInfo; error?: string }>

  // Scaleway Automation
  createScalewayInstance: (options: {
    secretKey: string
    projectId: string
    sshPublicKey: string
    sshKeyName?: string
    zone?: string
    commercialType?: string
  }) => Promise<ScalewayCreateResult>
  cancelScalewayInstance: () => Promise<{ success: boolean }>
  onScalewayLog: (cb: (log: ScalewayLogEvent) => void) => () => void

  // Deploy
  getPlatform: () => Promise<string>
  writeEnvToDir: (dir: string, content: string) => Promise<{ success: boolean; error?: string }>
  startDeploy: (ipv4: string, sourceDir: string, sshPassword?: string, sshKeyPath?: string) => Promise<void>
  restartDocker: (ipv4: string, sshPassword?: string, sshKeyPath?: string) => Promise<void>
  cancelDeploy: () => Promise<void>
  sendDeployInput: (text: string) => Promise<void>
  onDeployStdout: (cb: (line: string) => void) => () => void
  onDeployStderr: (cb: (line: string) => void) => () => void
  onDeployExit: (cb: (code: number | null) => void) => () => void
  onDeployError: (cb: (error: string) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
