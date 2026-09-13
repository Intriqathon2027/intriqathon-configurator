import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * What has been *done* rather than what has been *filled in*.
 *
 * Two kinds of facts live here, and they are deliberately stored differently:
 *
 *   - `runs` — an automation that finished during this session. Kept in memory
 *     only: a run's result is already in the config, and asserting "Supabase
 *     was configured" across restarts would outlive the project it refers to.
 *     What it buys is that leaving a step and coming back still shows the block
 *     green, with a "Relancer" button, instead of an idle "Lancer".
 *
 *   - `manualChecks` — a box the reader ticked to say they performed a step by
 *     hand (buckets created, DNS records added…). That is a fact about the
 *     outside world, not about this session, so it is persisted — in
 *     localStorage, next to the other UI state, never in the config file: it is
 *     not a value the deployment consumes.
 */

export type RunKey =
  | 'api-supabase'
  | 'api-scaleway'
  | 'deploy'
  | 'site-supabase'
  | 'site-docker'

export type ManualKey =
  | 'supabase-buckets'
  | 'spaceship-dns'
  | 'resend-subdomain'
  | 'deploy-manual'
  | 'docker-manual'

const MANUAL_CHECKS_KEY = 'intriqathon-manual-checks'

function loadManualChecks(): Partial<Record<ManualKey, boolean>> {
  try {
    const raw = localStorage.getItem(MANUAL_CHECKS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

interface SessionContextType {
  /** Automations that reported success since the app was launched. */
  runs: Partial<Record<RunKey, boolean>>
  isRunDone: (key: RunKey) => boolean
  markRunDone: (key: RunKey) => void
  clearRun: (key: RunKey) => void
  manualChecks: Partial<Record<ManualKey, boolean>>
  isManualChecked: (key: ManualKey) => boolean
  setManualCheck: (key: ManualKey, checked: boolean) => void
}

const SessionContext = createContext<SessionContextType | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [runs, setRuns] = useState<Partial<Record<RunKey, boolean>>>({})
  const [manualChecks, setManualChecks] = useState<Partial<Record<ManualKey, boolean>>>(loadManualChecks)

  useEffect(() => {
    localStorage.setItem(MANUAL_CHECKS_KEY, JSON.stringify(manualChecks))
  }, [manualChecks])

  const markRunDone = useCallback((key: RunKey) => {
    setRuns(prev => (prev[key] ? prev : { ...prev, [key]: true }))
  }, [])

  const clearRun = useCallback((key: RunKey) => {
    setRuns(prev => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const setManualCheck = useCallback((key: ManualKey, checked: boolean) => {
    setManualChecks(prev => ({ ...prev, [key]: checked }))
  }, [])

  const isRunDone = useCallback((key: RunKey) => !!runs[key], [runs])
  const isManualChecked = useCallback((key: ManualKey) => !!manualChecks[key], [manualChecks])

  return (
    <SessionContext.Provider
      value={{ runs, isRunDone, markRunDone, clearRun, manualChecks, isManualChecked, setManualCheck }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionContextType {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
