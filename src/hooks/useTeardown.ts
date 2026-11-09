import { useCallback, useEffect, useRef, useState } from 'react'
import type {
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
  /** The deletion itself failed — `error` carries the provider's wording. */
  | 'error'

export interface TeardownCardState {
  status: TeardownStatus
  detail?: string
  error?: string
  /** What a deletion deliberately left in place. */
  warnings?: string[]
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

  const probe = useCallback(async () => {
    const req = requestRef.current
    const key = keyRef.current
    const asked = SERVICES.filter(service => req[service])

    setStates(prev => {
      const next: typeof prev = {}
      for (const service of asked) next[service] = { ...prev[service], status: 'checking', error: undefined }
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
        next[service] = res.success
          ? { ...fromState(res.data?.[service]), warnings: prev[service]?.warnings }
          : { status: 'unknown', error: res.error }
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
    const outcome: TeardownCardState = res.success && res.data
      ? { ...fromState(res.data.state), warnings: res.data.warnings }
      : { status: 'error', error: res.error }

    setStates(prev => ({
      ...prev,
      [service]: outcome.status === 'error' ? { ...prev[service], ...outcome } : outcome,
    }))
    return outcome
  }, [])

  return { states, probe, remove }
}
