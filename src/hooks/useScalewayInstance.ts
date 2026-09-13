import { useState, useCallback, useRef, useEffect } from 'react'
import type { ScalewayLogEvent } from '../types/electron'

export function useScalewayInstance() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [logs, setLogs] = useState<string[]>([])
  const [progress, setProgress] = useState<number>(0)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [])

  const cancel = useCallback(async () => {
    if (window.electronAPI?.cancelScalewayInstance) {
      await window.electronAPI.cancelScalewayInstance()
    }
    setStatus('idle')
    setLogs(prev => [...prev, 'Opération annulée par l\'utilisateur.'])
  }, [])

  const start = useCallback(async (options: {
    secretKey: string
    projectId: string
    sshPublicKey: string
    sshKeyName?: string
  }): Promise<{ success: boolean; ipv4?: string; error?: string }> => {
    if (!window.electronAPI?.createScalewayInstance) {
      return { success: false, error: 'Fonctionnalité disponible uniquement sur l\'application desktop Electron.' }
    }

    console.log('[useScalewayInstance] Démarrage de l\'automatisation Scaleway...')
    setStatus('running')
    setLogs([])
    setProgress(5)

    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }

    if (window.electronAPI.onScalewayLog) {
      cleanupRef.current = window.electronAPI.onScalewayLog((event: ScalewayLogEvent) => {
        console.log(`[Scaleway] [${event.status.toUpperCase()}] ${event.message}`)
        setLogs(prev => [...prev, event.message])
        if (event.progress !== undefined) {
          setProgress(event.progress)
        }
        if (event.status === 'error') {
          setStatus('error')
        }
      })
    }

    try {
      const res = await window.electronAPI.createScalewayInstance(options)
      if (res.success && res.ipv4) {
        setStatus('done')
        setProgress(100)
        console.log('[useScalewayInstance] Succès, IPv4:', res.ipv4)
        return { success: true, ipv4: res.ipv4 }
      } else {
        setStatus('error')
        const errMsg = res.error || 'Erreur inconnue lors de la création de l\'instance Scaleway'
        console.error('[useScalewayInstance ERREUR]', errMsg)
        setLogs(prev => {
          if (prev.some(l => l.includes(errMsg))) return prev
          return [...prev, errMsg.startsWith('[ERREUR') ? errMsg : `[ERREUR] ${errMsg}`]
        })
        return { success: false, error: errMsg }
      }
    } catch (err: any) {
      setStatus('error')
      const errMsg = err.message || String(err)
      console.error('[useScalewayInstance EXCEPTION]', errMsg)
      setLogs(prev => {
        if (prev.some(l => l.includes(errMsg))) return prev
        return [...prev, errMsg.startsWith('[ERREUR') ? errMsg : `[ERREUR] ${errMsg}`]
      })
      return { success: false, error: errMsg }
    }
  }, [])

  return {
    status,
    logs,
    progress,
    start,
    cancel,
  }
}
