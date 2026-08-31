// ============================================================================
// Pont renderer → main pour les jobs SSH.
//
// Un unique canal d'événements arrive du main ; ce module le démultiplexe par
// jobId, de sorte qu'un abonné ne voit jamais la sortie d'un autre job.
// L'implémentation Mock permet de travailler l'UI dans un navigateur.
// ============================================================================

import type {
  DeployFailureReason,
  DeployRequest,
  DeployStartResult,
  WriteResult,
} from '../../shared/ipc'

export interface JobFailure {
  reason: DeployFailureReason
  message: string
  details?: string
  hint?: string
}

export interface JobHandlers {
  onStdout(line: string): void
  onStderr(line: string): void
  onStep(label: string, index: number, total: number): void
  /** Avancement global 0–100, déjà pondéré côté main. */
  onProgress(percent: number): void
  onDone(exitCode: number): void
  onFailed(failure: JobFailure): void
}

export interface DeployBridge {
  writeEnv(dir: string, content: string): Promise<WriteResult>
  start(kind: 'deploy' | 'restart', request: DeployRequest, handlers: JobHandlers): Promise<DeployStartResult>
  cancel(jobId: string): Promise<void>
}

// ============================================================================
// Implémentation Electron
// ============================================================================

class ElectronDeployBridge implements DeployBridge {
  writeEnv(dir: string, content: string) {
    return window.electronAPI.writeEnvToDir(dir, content)
  }

  async start(kind: 'deploy' | 'restart', request: DeployRequest, handlers: JobHandlers) {
    // On s'abonne AVANT l'invoke : aucun événement ne peut être manqué.
    const unsubscribe = window.electronAPI.onDeployEvent((event) => {
      if (event.jobId !== request.jobId) return // job voisin : ignoré

      switch (event.type) {
        case 'stdout': return handlers.onStdout(event.line)
        case 'stderr': return handlers.onStderr(event.line)
        case 'step': return handlers.onStep(event.label, event.index, event.total)
        case 'progress': return handlers.onProgress(event.percent)
        case 'done':
          unsubscribe()
          return handlers.onDone(event.exitCode)
        case 'failed':
          unsubscribe()
          return handlers.onFailed({
            reason: event.reason,
            message: event.message,
            details: event.details,
            hint: event.hint,
          })
      }
    })

    const invoke = kind === 'deploy' ? window.electronAPI.startDeploy : window.electronAPI.restartDocker
    const result = await invoke(request)
    if (!result.accepted) unsubscribe()
    return result
  }

  async cancel(jobId: string) {
    await window.electronAPI.cancelDeploy(jobId)
  }
}

// ============================================================================
// Implémentation Mock (développement navigateur)
// ============================================================================

class MockDeployBridge implements DeployBridge {
  private cancelled = new Set<string>()

  async writeEnv() {
    await delay(400)
    return { success: true }
  }

  async start(kind: 'deploy' | 'restart', request: DeployRequest, handlers: JobHandlers) {
    this.cancelled.delete(request.jobId)

    // Sans mot de passe, on simule le refus d'authentification pour exercer
    // le parcours de saisie du mot de passe dans le navigateur.
    if (!request.credentials.password) {
      void delay(600).then(() => handlers.onFailed({
        reason: 'auth-required',
        message: 'Aucune clé SSH acceptée par le serveur',
      }))
      return { accepted: true }
    }

    const steps = kind === 'deploy'
      ? [
          `Connexion à ${request.credentials.username}@${request.ipv4}`,
          'Envoi des fichiers vers le serveur',
          'Préparation du script d\'installation',
          'Exécution de l\'installation sur le serveur',
        ]
      : [`Connexion à ${request.credentials.username}@${request.ipv4}`, 'Redémarrage du conteneur discord_bot']

    void (async () => {
      for (let i = 0; i < steps.length; i += 1) {
        if (this.cancelled.has(request.jobId)) return
        handlers.onStep(steps[i], i + 1, steps.length)
        for (let tick = 1; tick <= 5; tick += 1) {
          await delay(180)
          if (this.cancelled.has(request.jobId)) return
          handlers.onProgress(Math.round(((i + tick / 5) / steps.length) * 100))
        }
        handlers.onStdout(`${steps[i]} : terminé`)
      }
      handlers.onDone(0)
    })()

    return { accepted: true }
  }

  async cancel(jobId: string) {
    this.cancelled.add(jobId)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================================================

export function createDeployBridge(): DeployBridge {
  const hasElectron = typeof window !== 'undefined' && !!window.electronAPI?.startDeploy
  return hasElectron ? new ElectronDeployBridge() : new MockDeployBridge()
}

/** Identifiant de job. `randomUUID` n'existe pas dans tous les contextes. */
export function newJobId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
