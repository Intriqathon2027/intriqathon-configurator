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
  
  const addLog = useCallback((message: string, logStatus: DeployLogEntry['status']) => {
    setLogs(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message,
      status: logStatus,
      timestamp: Date.now()
    }])
  }, [])

  const updateOrAddLog = useCallback((message: string, logStatus: DeployLogEntry['status']) => {
    setLogs(prev => {
      const baseMsg = message.split(' :')[0].split('…')[0]
      const lastLog = prev[prev.length - 1]
      if (lastLog && lastLog.status === 'running' && lastLog.message.startsWith(baseMsg)) {
        return [...prev.slice(0, -1), {
          ...lastLog,
          message,
          status: logStatus
        }]
      }
      return [...prev, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        message,
        status: logStatus,
        timestamp: Date.now()
      }]
    })
  }, [])
  
  const estimateProgress = (line: string) => {
    if (line.includes('[1/2]') || line.includes('[1/4]')) setProgress(20)
    if (line.includes('[2/2]') || line.includes('[2/4]')) setProgress(50)
    if (line.includes('[3/4]')) setProgress(70)
    if (line.includes('[4/4]')) setProgress(85)
    if (line.includes('succès') || line.includes('succes') || line.includes('terminé')) setProgress(100)
  }
  
  const detectPrompt = (line: string): boolean => {
    const lowerLine = line.toLowerCase()
    if (lowerLine.includes('password:') || lowerLine.includes('mot de passe')) {
      setStatus('paused_for_dialog')
      setPendingDialog({
        type: 'auth',
        title: 'Authentification SSH',
        message: line,
      })
      return true
    }
    if (lowerLine.includes('are you sure you want to continue connecting') || lowerLine.includes('yes/no')) {
      setStatus('paused_for_dialog')
      setPendingDialog({
        type: 'confirm',
        title: 'Vérification de l\'hôte SSH',
        message: line,
      })
      return true
    }
    return false
  }

  const start = useCallback((config: DeploymentConfig) => {
    cleanupRef.current.forEach(fn => fn())
    cleanupRef.current = []
    
    setLogs([])
    setProgress(0)
    setPendingDialog(null)
    setStatus('running')
    
    const bridge = createDeployBridge()
    bridgeRef.current = bridge
    
    addLog('Écriture du fichier .env...', 'running')
    
    bridge.writeEnvToDir(config.deployPath, config.envContent).then(result => {
      if (!result.success) {
        addLog(`Erreur écriture .env : ${result.error}`, 'error')
        setStatus('error')
        return
      }
      updateOrAddLog('Écriture du fichier .env : Done', 'done')
      setProgress(10)
      
      const cleanups: (() => void)[] = []
      
      cleanups.push(bridge.onStdout((line) => {
        addLog(line, 'info')
        estimateProgress(line)
      }))
      
      cleanups.push(bridge.onStderr((line) => {
        if (!detectPrompt(line)) {
          if (line.toLowerCase().includes('erreur') || line.toLowerCase().includes('error')) {
            addLog(line, 'error')
          } else {
            addLog(line, 'info')
          }
        }
      }))
      
      cleanups.push(bridge.onExit((code) => {
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
        addLog(`Erreur: ${error}`, 'error')
        setStatus('error')
      }))
      
      cleanupRef.current = cleanups
      
      bridge.startDeploy(config.ipv4, config.deployPath)
    })
  }, [addLog, updateOrAddLog])
  
  const cancel = useCallback(() => {
    bridgeRef.current?.cancelDeploy()
    cleanupRef.current.forEach(fn => fn())
    cleanupRef.current = []
    setPendingDialog(null)
    setStatus('cancelled')
    addLog('Déploiement annulé', 'info')
  }, [addLog])
  
  const respondToDialog = useCallback((response: DialogResponse) => {
    setPendingDialog(null)
    setStatus('running')
    
    if (response.type === 'auth') {
      bridgeRef.current?.sendInput(response.password + '\n')
      addLog('Authentification envoyée', 'done')
    } else if (response.type === 'confirm') {
      if (response.confirmed) {
        bridgeRef.current?.sendInput('yes\n')
        addLog('Connexion confirmée', 'done')
      } else {
        bridgeRef.current?.cancelDeploy()
        setStatus('cancelled')
        addLog('Connexion refusée par l\'utilisateur', 'info')
      }
    }
  }, [addLog])
  
  useEffect(() => {
    return () => {
      cleanupRef.current.forEach(fn => fn())
    }
  }, [])
  
  return { status, logs, progress, pendingDialog, start, cancel, respondToDialog }
}
