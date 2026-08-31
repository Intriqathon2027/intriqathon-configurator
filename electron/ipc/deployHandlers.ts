// ============================================================================
// Canaux « déploiement ». Le service est instancié une seule fois : il porte
// l'unicité du job. Les handlers ne font que valider et déléguer.
// ============================================================================

import { ipcMain, type BrowserWindow } from 'electron'
import {
  IpcChannel,
  type DeployRequest,
  type DeployStartResult,
} from '../../shared/ipc'
import { DeployService } from '../services/DeployService'
import { ValidationError, assertHost, assertSafeAbsolutePath, assertUsername } from '../security/validate'

export function registerDeployHandlers(getWin: () => BrowserWindow | null): void {
  const service = new DeployService()

  const requireWindow = (): BrowserWindow => {
    const win = getWin()
    if (!win || win.isDestroyed()) throw new Error('Aucune fenêtre active')
    return win
  }

  const validate = (raw: unknown, needsSource: boolean): DeployRequest => {
    const req = raw as Partial<DeployRequest>
    if (!req || typeof req.jobId !== 'string' || req.jobId.length === 0) {
      throw new ValidationError('jobId manquant')
    }
    return {
      jobId: req.jobId,
      ipv4: assertHost(req.ipv4),
      sourceDir: needsSource ? assertSafeAbsolutePath(req.sourceDir, 'Dossier source') : undefined,
      credentials: {
        username: assertUsername(req.credentials?.username ?? 'root'),
        password: typeof req.credentials?.password === 'string' ? req.credentials.password : undefined,
      },
    }
  }

  const guard = (raw: unknown, needsSource: boolean, kind: 'deploy' | 'restart'): DeployStartResult => {
    try {
      return service.start(kind, validate(raw, needsSource), requireWindow())
    } catch (err) {
      return {
        accepted: false,
        reason: err instanceof ValidationError ? 'invalid-input' : 'internal',
        message: err instanceof Error ? err.message : String(err),
      }
    }
  }

  ipcMain.handle(IpcChannel.DeployStart, (_event, raw: unknown) => guard(raw, true, 'deploy'))
  ipcMain.handle(IpcChannel.DeployRestart, (_event, raw: unknown) => guard(raw, false, 'restart'))
  ipcMain.handle(IpcChannel.DeployCancel, (_event, jobId?: string) => service.cancel(jobId))
}
