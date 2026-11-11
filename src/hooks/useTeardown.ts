import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  BlockVolumeDeleteResult,
  ScalewayBlockVolume,
  TeardownRequest,
  TeardownService,
  TeardownServiceState,
} from '../types/teardown'

export type TeardownStatus =
  | 'checking'
  | 'present'
  | 'absent'
  | 'unknown'
  | 'deleting'
  /** Deletion accepted, still being carried out by the provider. */
  | 'pending'
  /** The deletion itself failed — `error` carries the provider's wording. */
  | 'error'

export interface TeardownCardState {
  status: TeardownStatus
  detail?: string
  error?: string
  /** What a deletion deliberately left in place. */
  warnings?: string[]
  /**
   * Scaleway only: Block Storage volumes the deleted instance left detached
   * and that are still there. Only known right after the deletion — the
   * instance that listed them is gone — so a reload forgets them.
   */
  detachedVolumes?: ScalewayBlockVolume[]
}

const SERVICES: TeardownService[] = ['supabase', 'scaleway', 'resend', 'spaceship']

function fromState(state: TeardownServiceState | undefined): TeardownCardState {
  if (!state) return { status: 'unknown' }
  return { status: state.presence, detail: state.detail, error: state.error }
}

/**
 * Drives the four cards of "Arrêt du site".
 *
 * Asks every provider on mount — and again whenever what the page points at
 * changes — whether the resource is still there. A card is only ever green on
 * the provider's word: a deletion is followed by that same read, never taken
 * as proof on its own.
 *
 * Services absent from the request have nothing to delete and get no state.
 */
export function useTeardown(request: TeardownRequest) {
  const [states, setStates] = useState<Partial<Record<TeardownService, TeardownCardState>>>({})

  // Read through a ref so `remove` and `probe` never act on a stale request.
  // Updated in an effect declared ahead of the one that probes, so the probe
  // always sees the request it was triggered by.
  const requestKey = JSON.stringify(request)
  const requestRef = useRef(request)
  const keyRef = useRef(requestKey)
  useEffect(() => {
    requestRef.current = request
    keyRef.current = requestKey
  }, [request, requestKey])

  /**
   * Services whose deletion this session has sent. While a provider is still
   * carrying one out, reading it back can fail outright — Supabase does — and
   * a re-check in that window would otherwise call a deletion in progress
   * "cannot check". For these, a failed read means "under way".
   */
  const deletionSentRef = useRef(new Set<TeardownService>())

  const probe = useCallback(async () => {
    const req = requestRef.current
    const key = keyRef.current
    const asked = SERVICES.filter(service => req[service])

    setStates(prev => {
      const next: typeof prev = {}
      // A deletion under way stays shown as such while it is re-checked —
      // flicking to "checking" every few seconds would say nothing new.
      for (const service of asked) {
        next[service] = prev[service]?.status === 'pending'
          ? prev[service]
          : { ...prev[service], status: 'checking', error: undefined }
      }
      return next
    })
    if (asked.length === 0) return

    if (!window.electronAPI?.probeTeardown) {
      setStates(Object.fromEntries(asked.map(s => [s, { status: 'unknown', error: 'Desktop app only.' }])))
      return
    }

    const res = await window.electronAPI.probeTeardown(req)
    // The request moved on while this was in flight: its answer is about
    // something the page no longer shows.
    if (keyRef.current !== key) return

    setStates(prev => {
      const next = { ...prev }
      for (const service of asked) {
        // What the last deletion left behind outlives a re-check: the probe
        // looks for the instance, not for what it had attached.
        const read: TeardownCardState = res.success
          ? {
              ...fromState(res.data?.[service]),
              warnings: prev[service]?.warnings,
              detachedVolumes: prev[service]?.detachedVolumes,
            }
          : { status: 'unknown', error: res.error }
        next[service] = read.status === 'unknown' && deletionSentRef.current.has(service)
          ? { ...read, status: 'pending', error: undefined }
          : read
      }
      return next
    })
  }, [])

  useEffect(() => {
    void probe()
  }, [probe, requestKey])

  /** Resolves the state the card ends in, so the caller can say how it went. */
  const remove = useCallback(async (service: TeardownService): Promise<TeardownCardState | null> => {
    const req = requestRef.current
    if (!req[service] || !window.electronAPI?.runTeardown) return null

    setStates(prev => ({ ...prev, [service]: { ...prev[service], status: 'deleting', error: undefined } }))

    const res = await window.electronAPI.runTeardown(service, req)
    // Accepted by the provider, whatever the read-back says next.
    if (res.success) deletionSentRef.current.add(service)
    const outcome: TeardownCardState = res.success && res.data
      ? {
          ...fromState(res.data.state),
          warnings: res.data.warnings,
          detachedVolumes: res.data.detachedVolumes,
        }
      : { status: 'error', error: res.error }

    setStates(prev => ({
      ...prev,
      [service]: outcome.status === 'error' ? { ...prev[service], ...outcome } : outcome,
    }))
    return outcome
  }, [])

  /**
   * Deletes the Block Storage volumes the Scaleway deletion left detached. The
   * card keeps whichever ones failed, so the button stays there to retry.
   */
  const removeVolumes = useCallback(async (volumes: ScalewayBlockVolume[]): Promise<BlockVolumeDeleteResult | null> => {
    const secretKey = requestRef.current.scaleway?.secretKey
    if (!secretKey || volumes.length === 0 || !window.electronAPI?.deleteBlockVolumes) return null

    const res = await window.electronAPI.deleteBlockVolumes({ secretKey, volumes })
    const result: BlockVolumeDeleteResult = res.success && res.data
      ? res.data
      : { deleted: [], failed: volumes.map(v => ({ ...v, error: res.error ?? 'Unknown error' })) }

    const remaining = new Set(result.failed.map(v => v.id))
    setStates(prev => ({
      ...prev,
      scaleway: prev.scaleway && {
        ...prev.scaleway,
        detachedVolumes: (prev.scaleway.detachedVolumes ?? []).filter(v => remaining.has(v.id)),
      },
    }))
    return result
  }, [])

  return { states, probe, remove, removeVolumes }
}
