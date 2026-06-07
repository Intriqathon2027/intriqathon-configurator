// Electron API types exposed by preload
export interface ElectronAPI {
  openExternalUrl: (url: string) => Promise<void>
  openFolderDialog: () => Promise<string | null>
  saveEnvFile: (content: string) => Promise<{ success: boolean; path?: string }>
  saveLocalConfig: (config: Record<string, string>) => Promise<{ success: boolean }>
  loadLocalConfig: () => Promise<Record<string, string>>
  exportConfig: (config: Record<string, string>) => Promise<{ success: boolean }>
  importConfig: () => Promise<Record<string, string> | null>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
