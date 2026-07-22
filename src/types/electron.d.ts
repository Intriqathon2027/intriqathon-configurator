// Electron API types exposed by preload
export interface RecentConfig {
  name: string
  path: string
  savedAt: string
}

export interface ElectronAPI {
  openExternalUrl: (url: string) => Promise<void>
  openFolderDialog: () => Promise<string | null>
  saveEnvFile: (content: string) => Promise<{ success: boolean; path?: string }>
  saveLocalConfig: (config: Record<string, string>) => Promise<{ success: boolean }>
  loadLocalConfig: () => Promise<Record<string, string>>
  exportConfig: (config: Record<string, string>) => Promise<{ success: boolean; path?: string }>
  importConfig: () => Promise<{ data: Record<string, string>; path: string } | null>
  saveRecentConfigs: (configs: RecentConfig[]) => Promise<{ success: boolean }>
  loadRecentConfigs: () => Promise<RecentConfig[]>
  readConfigFile: (filePath: string) => Promise<Record<string, string> | null>

  // Deploy
  getPlatform: () => Promise<string>
  writeEnvToDir: (dir: string, content: string) => Promise<{ success: boolean; error?: string }>
  startDeploy: (ipv4: string, sourceDir: string, sshPassword?: string) => Promise<void>
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
