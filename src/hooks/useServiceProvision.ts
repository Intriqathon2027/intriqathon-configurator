import { useCallback, useEffect, useRef, useState } from 'react'
import { createProvisionBridge, type ProvisionBridge } from '../services/provisionBridge'
import type { ProvisionService, SupabaseProvisionRequest, SupabaseSiteSetupRequest } from '../types/provision'

export type ProvisionStatus = 'idle' | 'running' | 'done' | 'error'

/**
 * Drives one service card in "Configuration par API".
 *
 * Listens only to the events carrying its own `service`, so the four cards can
 * share a single bridge without cross-talk. The retrieved values are handed to
 * `onPatch` rather than written anywhere: the page applies them through the
 * normal config setters, which keeps the vault the single writer and leaves the
 * manual fields editable afterwards.
 */
export function useServiceProvision(
  service: ProvisionService,
  onPatch: (patch: Record<string, string>) => void,
) {
  const [status, setStatus] = useState<ProvisionStatus>('idle')
  const [logs, setLogs] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // One bridge per hook instance, created lazily and never recreated.
  const [bridge] = useState<ProvisionBridge>(createProvisionBridge)

  // Kept in a ref so the listeners registered once never call a stale callback.
  const onPatchRef = useRef(onPatch)
  useEffect(() => {
    onPatchRef.current = onPatch
  }, [onPatch])

  useEffect(() => {
    const cleanups = [
      bridge.onLog(payload => {
        if (payload.service !== service) return
        setLogs(prev => [...prev, payload.message])
      }),
      bridge.onProgress(payload => {
        if (payload.service !== service) return
        setProgress(payload.value)
      }),
      bridge.onDone(payload => {
        if (payload.service !== service) return
        onPatchRef.current(payload.patch)
        setProgress(100)
        setStatus('done')
      }),
      bridge.onError(payload => {
        if (payload.service !== service) return
        setError(payload.message)
        setLogs(prev => [...prev, payload.message])
        setStatus('error')
      }),
      bridge.onCancelled(payload => {
        if (payload.service !== service) return
        setStatus('idle')
        setProgress(0)
      }),
    ]

    return () => cleanups.forEach(fn => fn())
  }, [bridge, service])

  const startSupabase = useCallback(async (req: SupabaseProvisionRequest) => {
    setLogs([])
    setProgress(0)
    setError(null)
    setStatus('running')
    try {
      await bridge.startSupabase(req)
    } catch (err) {
      setError(String(err))
      setStatus('error')
    }
  }, [bridge])

  /** Same lifecycle as `startSupabase`, for the post-deployment settings run. */
  const startSiteSetup = useCallback(async (req: SupabaseSiteSetupRequest) => {
    setLogs([])
    setProgress(0)
    setError(null)
    setStatus('running')
    try {
      await bridge.startSupabaseSiteSetup(req)
    } catch (err) {
      setError(String(err))
      setStatus('error')
    }
  }, [bridge])

  const cancel = useCallback(() => {
    void bridge.cancel(service)
    setStatus('idle')
    setProgress(0)
  }, [bridge, service])

  return { status, logs, progress, error, startSupabase, startSiteSetup, cancel }
}
