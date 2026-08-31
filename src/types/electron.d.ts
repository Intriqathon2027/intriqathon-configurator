// Surface exposée par le preload. Le contrat lui-même vit dans shared/ipc.ts.
import type {
  DeployEvent,
  DeployRequest,
  DeployStartResult,
  RecentConfig,
  SavePathResult,
  WriteResult,
} from '../../shared/ipc'

export type { RecentConfig }

export interface ElectronAPI {
  getPlatform: () => Promise<NodeJS.Platform>
  openExternalUrl: (url: string) => Promise<void>

  openFolderDialog: () => Promise<string | null>
  saveEnvFile: (content: string) => Promise<SavePathResult>
  writeEnvToDir: (dir: string, content: string) => Promise<WriteResult>
  saveLocalConfig: (config: Record<string, string>) => Promise<{ success: boolean }>
  loadLocalConfig: () => Promise<Record<string, string>>
  exportConfig: (config: Record<string, string>) => Promise<SavePathResult>
  importConfig: () => Promise<{ data: Record<string, string>; path: string } | null>
  saveRecentConfigs: (configs: RecentConfig[]) => Promise<{ success: boolean }>
  loadRecentConfigs: () => Promise<RecentConfig[]>
  readConfigFile: (filePath: string) => Promise<Record<string, string> | null>

  startDeploy: (request: DeployRequest) => Promise<DeployStartResult>
  restartDocker: (request: DeployRequest) => Promise<DeployStartResult>
  cancelDeploy: (jobId?: string) => Promise<boolean>
  onDeployEvent: (callback: (event: DeployEvent) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
