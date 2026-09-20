import { useCallback, useEffect, useRef, useState } from 'react'
import { createProvisionBridge, type ProvisionBridge } from '../services/provisionBridge'
import type {
  ProvisionService,
  ManualCheckProbeRequest,
  ResendDomainReadRequest,
  ResendProvisionRequest,
  ResendVerifyRequest,
  SpaceshipProvisionRequest,
  SupabaseProvisionRequest,
  SupabaseSiteSetupRequest,
} from '../types/provision'

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

  /**
   * Every run starts the same way: a clean pane, and `running` until an event
   * says otherwise. The catch only covers the dispatch itself — once the call
   * is through, failures arrive over `provision:error`.
   */
  const run = useCallback(async (dispatch: () => Promise<void>) => {
    setLogs([])
    setProgress(0)
    setError(null)
    setStatus('running')
    try {
      await dispatch()
    } catch (err) {
      setError(String(err))
      setStatus('error')
    }
  }, [])

  const startSupabase = useCallback(
    (req: SupabaseProvisionRequest) => run(() => bridge.startSupabase(req)),
    [bridge, run],
  )

  /** Same lifecycle as `startSupabase`, for the post-deployment settings run. */
  const startSiteSetup = useCallback(
    (req: SupabaseSiteSetupRequest) => run(() => bridge.startSupabaseSiteSetup(req)),
    [bridge, run],
  )

  const startSpaceship = useCallback(
    (req: SpaceshipProvisionRequest) => run(() => bridge.startSpaceship(req)),
    [bridge, run],
  )

  const startResend = useCallback(
    (req: ResendProvisionRequest) => run(() => bridge.startResend(req)),
    [bridge, run],
  )

  /**
   * Outside the run lifecycle on purpose: it starts nothing, so it leaves
   * `status` and the log pane exactly as the last run left them.
   */
  const verifyResend = useCallback(
    (req: ResendVerifyRequest) => bridge.verifyResendDomain(req),
    [bridge],
  )

  /**
   * Read-only, and outside the run lifecycle for the same reason: opening the
   * step must not look like starting something.
   */
  const readResendDomain = useCallback(
    (req: ResendDomainReadRequest) => bridge.readResendDomain(req),
    [bridge],
  )

  /** Read-only too: what the manual checkboxes claim, put to the providers. */
  const readManualChecks = useCallback(
    (req: ManualCheckProbeRequest) => bridge.readManualChecks(req),
    [bridge],
  )

  const cancel = useCallback(() => {
    void bridge.cancel(service)
    setStatus('idle')
    setProgress(0)
  }, [bridge, service])

  return { status, logs, progress, error, startSupabase, startSiteSetup, startSpaceship, startResend, verifyResend, readResendDomain, readManualChecks, cancel }
}
