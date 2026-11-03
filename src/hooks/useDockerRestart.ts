import { useState, useCallback, useRef, useEffect } from 'react'
import { createDeployBridge, type DeployBridge } from '../services/deployBridge'
import type { DeployLogEntry, DeploymentStatus } from './useDeployment'

export interface DockerRestartConfig {
  ipv4: string
  sshPassword?: string
  sshKeyPath?: string
}

export function useDockerRestart() {
  const [status, setStatus] = useState<DeploymentStatus>('idle')
  const [logs, setLogs] = useState<DeployLogEntry[]>([])
  const [progress, setProgress] = useState(0)

  const bridgeRef = useRef<DeployBridge | null>(null)
  const cleanupRef = useRef<(() => void)[]>([])

  const makeLogEntry = (message: string, logStatus: DeployLogEntry['status']): DeployLogEntry => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message,
    status: logStatus,
    timestamp: Date.now(),
  })

  const addLog = useCallback((message: string, logStatus: DeployLogEntry['status']) => {
    setLogs(prev => [...prev, makeLogEntry(message, logStatus)])
  }, [])

  const estimateProgress = useCallback((line: string) => {
    if (line.includes('[1/1]')) setProgress(50)
    const lower = line.toLowerCase()
    if (line.includes('succès') || line.includes('succes') || line.includes('terminé') || lower.includes('success') || lower.includes('completed')) setProgress(100)
  }, [])

  const launchRestart = useCallback((bridge: DeployBridge, config: DockerRestartConfig) => {
    const cleanups: (() => void)[] = []

    cleanups.push(bridge.onStdout((line) => {
      addLog(line, line.startsWith('[DEBUG]') ? 'info' : 'info')
      estimateProgress(line)
    }))

    cleanups.push(bridge.onStderr((line) => {
      const lower = line.toLowerCase()
      const isError = lower.includes('erreur') || lower.includes('error')
      addLog(line, isError ? 'error' : 'info')
    }))

    cleanups.push(bridge.onExit((code) => {
      cleanupRef.current.forEach(fn => fn())
      cleanupRef.current = []
      if (code === 0) {
        addLog('Restart completed successfully!', 'done')
        setProgress(100)
        setStatus('completed')
      } else if (code !== null) {
        addLog(`Script failed with code ${code}`, 'error')
        setStatus('error')
      }
    }))

    cleanups.push(bridge.onError((error) => {
      cleanupRef.current.forEach(fn => fn())
      cleanupRef.current = []
      addLog(`Launch error: ${error}`, 'error')
      setStatus('error')
    }))

    cleanupRef.current = cleanups

    addLog('Starting Docker restart...', 'info')
    
    bridge.restartDocker(config.ipv4, config.sshPassword, config.sshKeyPath)
      .catch(err => {
        addLog(`Launch failed (IPC): ${err}`, 'error')
        setStatus('error')
      })
  }, [addLog, estimateProgress])

  const start = useCallback((config: DockerRestartConfig) => {
    cleanupRef.current.forEach(fn => fn())
    cleanupRef.current = []

    setLogs([])
    setProgress(0)
    setStatus('running')

    const bridge = createDeployBridge()
    bridgeRef.current = bridge

    launchRestart(bridge, config)
  }, [launchRestart])

  const cancel = useCallback(() => {
    bridgeRef.current?.cancelDeploy()
    cleanupRef.current.forEach(fn => fn())
    cleanupRef.current = []
    setStatus('cancelled')
    addLog('Restart cancelled', 'info')
  }, [addLog])

  useEffect(() => {
    return () => { cleanupRef.current.forEach(fn => fn()) }
  }, [])

  return { status, logs, progress, start, cancel }
}
