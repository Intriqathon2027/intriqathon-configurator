// ============================================================================
// Hook unique pour tout job SSH (déploiement ou redémarrage Docker).
//
// Ce qu'il garantit :
//  • un jobId par exécution, généré avant l'appel IPC, qui filtre les
//    événements : la console d'un écran ne reçoit plus la sortie de l'autre ;
//  • la progression vient d'événements `step` typés, plus d'un `includes()`
//    sur le texte des logs ;
//  • un échec d'authentification ouvre la boîte de dialogue existante, puis
//    relance le même job avec le mot de passe saisi.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { createDeployBridge, newJobId, type DeployBridge } from '../services/deployBridge'
import type { DeployFailureReason, SshCredentials } from '../../shared/ipc'

// ── Types exposés à l'UI ────────────────────────────────────────────────────

export type JobStatus = 'idle' | 'running' | 'paused_for_dialog' | 'completed' | 'error' | 'cancelled'

export interface JobLogEntry {
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

export type DialogResponse =
  | { type: 'auth'; username: string; password: string }
  | { type: 'confirm'; confirmed: boolean }
  | { type: 'choice'; selectedValue: string }

export interface SshJobInput {
  ipv4: string
  /** Dossier local à envoyer (job `deploy` uniquement). */
  sourceDir?: string
  /** Contenu .env à écrire dans `sourceDir` avant l'envoi. */
  envContent?: string
}

// ── Messages d'échec lisibles ───────────────────────────────────────────────

const FAILURE_LABEL: Record<DeployFailureReason, string> = {
  'auth-required': 'Authentification requise',
  'host-changed': 'Empreinte du serveur modifiée',
  unreachable: 'Serveur injoignable',
  busy: 'Une autre opération est déjà en cours',
  'invalid-input': 'Paramètres invalides',
  'remote-failure': 'Échec côté serveur',
  cancelled: 'Opération annulée',
  internal: 'Erreur interne',
}

// ============================================================================

export function useSshJob(kind: 'deploy' | 'restart') {
  const [status, setStatus] = useState<JobStatus>('idle')
  const [logs, setLogs] = useState<JobLogEntry[]>([])
  const [progress, setProgress] = useState(0)
  const [pendingDialog, setPendingDialog] = useState<DialogData | null>(null)

  const bridgeRef = useRef<DeployBridge | null>(null)
  const jobIdRef = useRef<string | null>(null)
  /** Entrée du job en attente du mot de passe, pour pouvoir le relancer. */
  const pendingInputRef = useRef<SshJobInput | null>(null)
  /** Identifiants saisis, conservés en mémoire uniquement (jamais persistés). */
  const credentialsRef = useRef<SshCredentials>({ username: 'root' })

  const addLog = useCallback((message: string, logStatus: JobLogEntry['status']) => {
    setLogs((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, message, status: logStatus, timestamp: Date.now() },
    ])
  }, [])

  // ── Lancement effectif ────────────────────────────────────────────────────

  const launch = useCallback(async (input: SshJobInput) => {
    const bridge = bridgeRef.current ?? createDeployBridge()
    bridgeRef.current = bridge

    const jobId = newJobId()
    jobIdRef.current = jobId
    setStatus('running')

    /** Un événement ne doit agir que s'il concerne le job courant : un job
     *  annulé puis remplacé ne peut plus écraser l'état du nouveau. */
    const isCurrent = () => jobIdRef.current === jobId

    // Écriture du .env avant l'envoi, pour le job de déploiement.
    if (kind === 'deploy' && input.sourceDir && input.envContent !== undefined) {
      addLog('Écriture du fichier .env…', 'running')
      const written = await bridge.writeEnv(input.sourceDir, input.envContent)
      if (!isCurrent()) return
      if (!written.success) {
        addLog(`Erreur écriture .env : ${written.error ?? 'inconnue'}`, 'error')
        setStatus('error')
        return
      }
      addLog('Fichier .env écrit', 'done')
    }

    const result = await bridge.start(
      kind,
      {
        jobId,
        ipv4: input.ipv4,
        sourceDir: input.sourceDir,
        credentials: credentialsRef.current,
      },
      {
        onStdout: (line) => { if (isCurrent()) addLog(line, 'info') },
        onStderr: (line) => {
          if (!isCurrent()) return
          const isError = /erreur|error|failed/i.test(line)
          addLog(line, isError ? 'error' : 'info')
        },
        onStep: (label, index, total) => {
          if (!isCurrent()) return
          addLog(`[${index}/${total}] ${label}`, 'running')
          setProgress(Math.round((index / total) * 90))
        },
        onDone: () => {
          if (!isCurrent()) return
          addLog('Terminé avec succès !', 'done')
          setProgress(100)
          setStatus('completed')
          credentialsRef.current = { username: credentialsRef.current.username }
        },
        onFailed: (reason, message) => {
          if (!isCurrent()) return

          if (reason === 'auth-required') {
            // Le job s'arrête avant tout transfert : on peut redemander le
            // mot de passe puis relancer proprement.
            pendingInputRef.current = input
            setPendingDialog({
              type: 'auth',
              title: 'Authentification SSH',
              message: `${message}. Saisissez le mot de passe du serveur.`,
            })
            setStatus('paused_for_dialog')
            return
          }

          if (reason === 'cancelled') {
            setStatus('cancelled')
            return
          }

          addLog(`${FAILURE_LABEL[reason]} : ${message}`, 'error')
          setStatus('error')
        },
      },
    )

    if (!result.accepted && isCurrent()) {
      addLog(`${FAILURE_LABEL[result.reason ?? 'internal']} : ${result.message ?? ''}`, 'error')
      setStatus('error')
    }
  }, [addLog, kind])

  // ── API publique ──────────────────────────────────────────────────────────

  const start = useCallback((input: SshJobInput) => {
    jobIdRef.current = null
    pendingInputRef.current = null
    setLogs([])
    setProgress(0)
    setPendingDialog(null)
    void launch(input)
  }, [launch])

  const cancel = useCallback(() => {
    const jobId = jobIdRef.current
    jobIdRef.current = null
    pendingInputRef.current = null
    setPendingDialog(null)
    setStatus('cancelled')
    addLog('Opération annulée', 'info')
    if (jobId) void bridgeRef.current?.cancel(jobId)
  }, [addLog])

  const respondToDialog = useCallback((response: DialogResponse) => {
    setPendingDialog(null)

    if (response.type !== 'auth') {
      cancel()
      return
    }

    const input = pendingInputRef.current
    if (!input) {
      setStatus('error')
      addLog('Aucune opération à reprendre', 'error')
      return
    }

    credentialsRef.current = { username: response.username || 'root', password: response.password }
    pendingInputRef.current = null
    void launch(input)
  }, [addLog, cancel, launch])

  // Un démontage abandonne le job courant : ses événements résiduels ne
  // trouveront plus de jobId correspondant.
  useEffect(() => () => { jobIdRef.current = null }, [])

  return { status, logs, progress, pendingDialog, start, cancel, respondToDialog }
}
