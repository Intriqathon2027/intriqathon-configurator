import { useState, useCallback, useRef } from 'react'

// ============================================================
// TYPES
// ============================================================

export type DeploymentStatus = 'idle' | 'running' | 'paused_for_dialog' | 'completed' | 'error' | 'cancelled'

export type DialogType = 'auth' | 'confirm' | 'choice'

export interface DeployLogEntry {
  id: string
  message: string
  status: 'running' | 'done' | 'error' | 'info'
  timestamp: number
}

export interface AuthDialogData {
  type: 'auth'
  title: string
  message?: string
}

export interface ConfirmDialogData {
  type: 'confirm'
  title: string
  message: string
}

export interface ChoiceDialogData {
  type: 'choice'
  title: string
  message: string
  options: { label: string; value: string }[]
}

export type DialogData = AuthDialogData | ConfirmDialogData | ChoiceDialogData

export interface AuthDialogResponse {
  type: 'auth'
  username: string
  password: string
}

export interface ConfirmDialogResponse {
  type: 'confirm'
  confirmed: boolean
}

export interface ChoiceDialogResponse {
  type: 'choice'
  selectedValue: string
}

export type DialogResponse = AuthDialogResponse | ConfirmDialogResponse | ChoiceDialogResponse

// ============================================================
// DEPLOYMENT ENGINE INTERFACE (future-proof)
// ============================================================

/**
 * Interface for a deployment engine.
 * Implement this to plug in a real bash/python script via Electron IPC.
 */
export interface DeploymentEngine {
  start(config: DeploymentConfig): void
  cancel(): void
  respondToDialog(response: DialogResponse): void
  onLog(callback: (entry: DeployLogEntry) => void): void
  onProgress(callback: (progress: number) => void): void
  onStatusChange(callback: (status: DeploymentStatus) => void): void
  onDialogRequest(callback: (dialog: DialogData) => void): void
  onDialogDismiss(callback: () => void): void
}

export interface DeploymentConfig {
  deployPath: string
  ipv4: string
  domain: string
}

// ============================================================
// MOCK DEPLOYMENT ENGINE
// ============================================================

class MockDeploymentEngine implements DeploymentEngine {
  private logCallback?: (entry: DeployLogEntry) => void
  private progressCallback?: (progress: number) => void
  private statusCallback?: (status: DeploymentStatus) => void
  private dialogCallback?: (dialog: DialogData) => void
  private dialogDismissCallback?: () => void
  private timeouts: ReturnType<typeof setTimeout>[] = []
  private cancelled = false
  private dialogResolver?: (response: DialogResponse) => void

  start(config: DeploymentConfig): void {
    this.cancelled = false
    this.runScenario(config)
  }

  cancel(): void {
    this.cancelled = true
    this.timeouts.forEach(clearTimeout)
    this.timeouts = []
    this.statusCallback?.('cancelled')
  }

  respondToDialog(response: DialogResponse): void {
    this.dialogDismissCallback?.()
    if (this.dialogResolver) {
      this.dialogResolver(response)
      this.dialogResolver = undefined
    }
  }

  onLog(callback: (entry: DeployLogEntry) => void): void {
    this.logCallback = callback
  }

  onProgress(callback: (progress: number) => void): void {
    this.progressCallback = callback
  }

  onStatusChange(callback: (status: DeploymentStatus) => void): void {
    this.statusCallback = callback
  }

  onDialogRequest(callback: (dialog: DialogData) => void): void {
    this.dialogCallback = callback
  }

  onDialogDismiss(callback: () => void): void {
    this.dialogDismissCallback = callback
  }

  private log(message: string, status: DeployLogEntry['status']) {
    this.logCallback?.({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message,
      status,
      timestamp: Date.now(),
    })
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, ms)
      this.timeouts.push(timeout)
    })
  }

  private requestDialog(dialog: DialogData): Promise<DialogResponse> {
    return new Promise((resolve) => {
      this.dialogResolver = resolve
      this.statusCallback?.('paused_for_dialog')
      this.dialogCallback?.(dialog)
    })
  }

  private async runScenario(config: DeploymentConfig): Promise<void> {
    try {
      this.statusCallback?.('running')

      // Step 1: SSH Authentication dialog
      this.log(`Connexion SSH à root@${config.ipv4}…`, 'running')
      this.progressCallback?.(5)
      await this.wait(800)

      if (this.cancelled) return

      const authResponse = await this.requestDialog({
        type: 'auth',
        title: 'Authentification SSH',
        message: `Entrez vos identifiants pour root@${config.ipv4}`,
      })

      if (this.cancelled) return
      this.statusCallback?.('running')

      if (authResponse.type === 'auth') {
        this.log(`Connexion SSH à root@${config.ipv4}… Authentifié en tant que ${authResponse.username}`, 'done')
      }

      this.progressCallback?.(15)
      await this.wait(600)
      if (this.cancelled) return

      // Step 2: Uploading .env
      this.log('Upload du fichier .env…', 'running')
      this.progressCallback?.(20)
      await this.wait(1200)
      if (this.cancelled) return
      this.log('Upload du fichier .env : Done', 'done')
      this.progressCallback?.(30)

      // Step 3: Syncing files
      this.log(`Synchronisation des fichiers depuis ${config.deployPath}…`, 'running')
      this.progressCallback?.(35)
      await this.wait(1500)
      if (this.cancelled) return
      this.log(`Synchronisation des fichiers : Done`, 'done')
      this.progressCallback?.(50)

      // Step 4: Confirmation dialog
      await this.wait(500)
      if (this.cancelled) return

      const confirmResponse = await this.requestDialog({
        type: 'confirm',
        title: 'Confirmer l\'installation',
        message: `Voulez-vous exécuter le script d'installation sur ${config.ipv4} ? Cette opération va configurer Docker, la base de données et les services.`,
      })

      if (this.cancelled) return
      this.statusCallback?.('running')

      if (confirmResponse.type === 'confirm' && !confirmResponse.confirmed) {
        this.log('Installation annulée par l\'utilisateur', 'info')
        this.statusCallback?.('cancelled')
        return
      }

      // Step 5: Configuring Database
      this.log('Configuration de la base de données…', 'running')
      this.progressCallback?.(55)
      await this.wait(1800)
      if (this.cancelled) return
      this.log('Configuration de la base de données : Done', 'done')
      this.progressCallback?.(65)

      // Step 6: Configuring API
      this.log('Configuration de l\'API…', 'running')
      this.progressCallback?.(70)
      await this.wait(1400)
      if (this.cancelled) return
      this.log('Configuration de l\'API : Done', 'done')
      this.progressCallback?.(78)

      // Step 7: Choice dialog — SSL strategy
      await this.wait(400)
      if (this.cancelled) return

      const choiceResponse = await this.requestDialog({
        type: 'choice',
        title: 'Stratégie SSL',
        message: 'Choisissez la méthode de génération du certificat SSL :',
        options: [
          { label: 'Let\'s Encrypt (recommandé)', value: 'letsencrypt' },
          { label: 'Certificat auto-signé', value: 'self-signed' },
          { label: 'Certificat personnalisé', value: 'custom' },
        ],
      })

      if (this.cancelled) return
      this.statusCallback?.('running')

      if (choiceResponse.type === 'choice') {
        this.log(`Certificat SSL : ${choiceResponse.selectedValue}`, 'info')
      }

      // Step 8: SSL Setup
      this.log('Configuration SSL / Nginx…', 'running')
      this.progressCallback?.(82)
      await this.wait(2000)
      if (this.cancelled) return
      this.log('Configuration SSL / Nginx : Done', 'done')
      this.progressCallback?.(90)

      // Step 9: Starting services
      this.log('Démarrage des services Docker…', 'running')
      this.progressCallback?.(92)
      await this.wait(1600)
      if (this.cancelled) return
      this.log('Démarrage des services Docker : Done', 'done')
      this.progressCallback?.(98)

      // Step 10: Final
      await this.wait(500)
      if (this.cancelled) return
      this.log(`Déploiement terminé sur ${config.domain} ✓`, 'done')
      this.progressCallback?.(100)
      this.statusCallback?.('completed')
    } catch {
      if (!this.cancelled) {
        this.log('Erreur inattendue lors du déploiement', 'error')
        this.statusCallback?.('error')
      }
    }
  }
}

// ============================================================
// HOOK
// ============================================================

export function useDeployment() {
  const [status, setStatus] = useState<DeploymentStatus>('idle')
  const [logs, setLogs] = useState<DeployLogEntry[]>([])
  const [progress, setProgress] = useState(0)
  const [pendingDialog, setPendingDialog] = useState<DialogData | null>(null)

  const engineRef = useRef<DeploymentEngine | null>(null)

  const getEngine = useCallback((): DeploymentEngine => {
    if (!engineRef.current) {
      // In the future, check for window.electronAPI to use a real engine
      const engine = new MockDeploymentEngine()

      engine.onLog((entry) => {
        setLogs((prev) => {
          // If the last log has the same base message prefix (before " :"), update it
          const baseMsg = entry.message.split(' :')[0].split('…')[0]
          const lastLog = prev[prev.length - 1]
          if (lastLog && lastLog.status === 'running' && lastLog.message.startsWith(baseMsg)) {
            return [...prev.slice(0, -1), entry]
          }
          return [...prev, entry]
        })
      })

      engine.onProgress((p) => setProgress(p))
      engine.onStatusChange((s) => setStatus(s))
      engine.onDialogRequest((d) => setPendingDialog(d))
      engine.onDialogDismiss(() => setPendingDialog(null))

      engineRef.current = engine
    }
    return engineRef.current
  }, [])

  const start = useCallback((config: DeploymentConfig) => {
    setLogs([])
    setProgress(0)
    setPendingDialog(null)
    const engine = getEngine()
    engine.start(config)
  }, [getEngine])

  const cancel = useCallback(() => {
    engineRef.current?.cancel()
    setPendingDialog(null)
  }, [])

  const respondToDialog = useCallback((response: DialogResponse) => {
    engineRef.current?.respondToDialog(response)
  }, [])

  return {
    status,
    logs,
    progress,
    pendingDialog,
    start,
    cancel,
    respondToDialog,
  }
}
