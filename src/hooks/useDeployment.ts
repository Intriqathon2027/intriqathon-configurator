import { useState, useCallback, useRef, useEffect } from 'react'
import { createDeployBridge, type DeployBridge } from '../services/deployBridge'

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

export interface DeploymentConfig {
  deployPath: string
  ipv4: string
  domain: string
  envContent: string
  sshPassword?: string
}

// ============================================================
// HELPERS
// ============================================================

function makeLogEntry(message: string, status: DeployLogEntry['status']): DeployLogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message,
    status,
    timestamp: Date.now(),
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

  const bridgeRef = useRef<DeployBridge | null>(null)
  const cleanupRef = useRef<(() => void)[]>([])
  // Stores config waiting for SSH password before launch
  const pendingConfigRef = useRef<DeploymentConfig | null>(null)

  // ── Stable log helpers ────────────────────────────────────────────────────
  const addLog = useCallback((message: string, logStatus: DeployLogEntry['status']) => {
    setLogs(prev => [...prev, makeLogEntry(message, logStatus)])
  }, [])

  const updateOrAddLog = useCallback((message: string, logStatus: DeployLogEntry['status']) => {
    setLogs(prev => {
      const baseMsg = message.split(' :')[0].split('…')[0]
      const lastLog = prev[prev.length - 1]
      if (lastLog && lastLog.status === 'running' && lastLog.message.startsWith(baseMsg)) {
        return [...prev.slice(0, -1), { ...lastLog, message, status: logStatus }]
      }
      return [...prev, makeLogEntry(message, logStatus)]
    })
  }, [])

  // ── Progress estimator ────────────────────────────────────────────────────
  const estimateProgress = useCallback((line: string) => {
    if (line.includes('[1/2]') || line.includes('[1/4]')) setProgress(20)
    if (line.includes('[2/2]') || line.includes('[2/4]')) setProgress(50)
    if (line.includes('[3/4]')) setProgress(70)
    if (line.includes('[4/4]')) setProgress(85)
    if (line.includes('succès') || line.includes('succes') || line.includes('terminé')) setProgress(100)
  }, [])

  // ── Launch: register listeners then start the script ─────────────────────
  const launchDeploy = useCallback((
    bridge: DeployBridge,
    config: DeploymentConfig,
  ) => {
    console.log('[useDeployment] launchDeploy called with config:', { ...config, sshPassword: '***' })
    const cleanups: (() => void)[] = []

    cleanups.push(bridge.onStdout((line) => {
      console.log('[useDeployment] STDOUT:', line)
      addLog(line, line.startsWith('[DEBUG]') ? 'info' : 'info')
      estimateProgress(line)
    }))

    cleanups.push(bridge.onStderr((line) => {
      console.log('[useDeployment] STDERR:', line)
      const lower = line.toLowerCase()
      const isError = lower.includes('erreur') || lower.includes('error')
      addLog(line, isError ? 'error' : 'info')
    }))

    cleanups.push(bridge.onExit((code) => {
      console.log('[useDeployment] EXIT:', code)
      cleanupRef.current.forEach(fn => fn())
      cleanupRef.current = []
      if (code === 0) {
        addLog('Déploiement terminé avec succès !', 'done')
        setProgress(100)
        setStatus('completed')
      } else if (code !== null) {
        addLog(`Le script a échoué avec le code ${code}`, 'error')
        setStatus('error')
      }
    }))

    cleanups.push(bridge.onError((error) => {
      console.log('[useDeployment] ERROR:', error)
      cleanupRef.current.forEach(fn => fn())
      cleanupRef.current = []
      addLog(`Erreur de lancement : ${error}`, 'error')
      setStatus('error')
    }))

    cleanupRef.current = cleanups

    console.log('[useDeployment] Calling bridge.startDeploy...')
    addLog('Lancement du script de déploiement...', 'info')
    
    // Pass sshPassword to the bridge/service so it can use sshpass
    bridge.startDeploy(config.ipv4, config.deployPath, config.sshPassword)
      .then(() => console.log('[useDeployment] bridge.startDeploy resolved'))
      .catch(err => {
        console.error('[useDeployment] bridge.startDeploy failed:', err)
        addLog(`Échec du lancement (IPC) : ${err}`, 'error')
        setStatus('error')
      })
  }, [addLog, estimateProgress])

  // ── Internal: write .env then launch ─────────────────────────────────────
  const runWithConfig = useCallback((config: DeploymentConfig) => {
    const bridge = createDeployBridge()
    bridgeRef.current = bridge

    setStatus('running')
    addLog('Écriture du fichier .env...', 'running')

    bridge.writeEnvToDir(config.deployPath, config.envContent).then(result => {
      if (!result.success) {
        addLog(`Erreur écriture .env : ${result.error ?? 'inconnue'}`, 'error')
        setStatus('error')
        return
      }
      updateOrAddLog('Écriture du fichier .env : Done', 'done')
      setProgress(10)
      launchDeploy(bridge, config)
    }).catch(err => {
      addLog(`Erreur écriture .env : ${String(err)}`, 'error')
      setStatus('error')
    })
  }, [addLog, updateOrAddLog, launchDeploy])

  // ── Public: start ─────────────────────────────────────────────────────────
  const start = useCallback((config: DeploymentConfig) => {
    cleanupRef.current.forEach(fn => fn())
    cleanupRef.current = []
    pendingConfigRef.current = null

    setLogs([])
    setProgress(0)
    setPendingDialog(null)

    runWithConfig(config)
  }, [runWithConfig])

  // ── Public: cancel ────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    bridgeRef.current?.cancelDeploy()
    cleanupRef.current.forEach(fn => fn())
    cleanupRef.current = []
    pendingConfigRef.current = null
    setPendingDialog(null)
    setStatus('cancelled')
    addLog('Déploiement annulé', 'info')
  }, [addLog])

  // ── Public: respondToDialog ───────────────────────────────────────────────
  const respondToDialog = useCallback((response: DialogResponse) => {
    setPendingDialog(null)

    if (response.type === 'auth') {
      // In case we ever add back auth dialogs, we can just log for now
      addLog('Authentification non gérée', 'error')
      setStatus('error')
    } else if (response.type === 'confirm') {
      setStatus('running')
      if (response.confirmed) {
        bridgeRef.current?.sendInput('yes\n')
        addLog('Connexion confirmée', 'done')
      } else {
        bridgeRef.current?.sendInput('no\n')
        bridgeRef.current?.cancelDeploy()
        setStatus('cancelled')
        addLog("Connexion refusée par l'utilisateur", 'info')
      }
    }
  }, [addLog, runWithConfig])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => { cleanupRef.current.forEach(fn => fn()) }
  }, [])

  return { status, logs, progress, pendingDialog, start, cancel, respondToDialog }
}
