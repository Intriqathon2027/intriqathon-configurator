import type { BrowserWindow } from 'electron'
import { registerConfigHandlers } from './configHandlers'
import { registerDeployHandlers } from './deployHandlers'

/** Point d'entrée unique : main.ts n'enregistre plus de handler lui-même. */
export function registerIpcHandlers(getWin: () => BrowserWindow | null): void {
  registerConfigHandlers(getWin)
  registerDeployHandlers(getWin)
}
