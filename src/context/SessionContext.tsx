import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useApp } from './AppContext'

/**
 * What has been *done* in this session, as opposed to what has been *filled in*.
 *
 * Both kinds of fact live in memory and die with the app:
 *
 *   - `runs` — an automation that finished. Its result is already in the config;
 *     what this adds is that leaving a step and coming back still shows the
 *     block green, with a "Relancer" button, instead of an idle "Lancer".
 *
 *   - `manualChecks` — a box ticked to say a step with no field to fill was
 *     carried out (buckets created, DNS records added…), or ticked for the
 *     reader by a run that did that very work.
 *
 * Neither is persisted. A configuration reopened days later, or restored on
 * another machine, says nothing about the state of a live project — and a
 * stored "done" would be believed long after it stopped being true. The
 * session starts by knowing nothing, which is the only honest starting point.
 *
 * For the same reason it is wiped whenever the project changes underneath it:
 * every fact here is about one Supabase project in one configuration, and
 * carrying "the buckets exist" over to the project opened next would be the
 * stored-"done" problem all over again, one configuration further along.
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
  /** The grants SQL, pasted into the project's SQL editor. */
  | 'site-supabase-sql'
  /** The four dashboard settings the API run applies by itself. */
  | 'site-supabase-actions'
  | 'docker-manual'

interface SessionContextType {
  /** Automations that reported success since the app was launched. */
  runs: Partial<Record<RunKey, boolean>>
  isRunDone: (key: RunKey) => boolean
  markRunDone: (key: RunKey) => void
  clearRun: (key: RunKey) => void
  manualChecks: Partial<Record<ManualKey, boolean>>
  isManualChecked: (key: ManualKey) => boolean
  setManualCheck: (key: ManualKey, checked: boolean) => void
  /** Ticks boxes on the reader's behalf — what a successful run just did. */
  confirmManual: (...keys: ManualKey[]) => void
}

const SessionContext = createContext<SessionContextType | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const { state } = useApp()
  const [runs, setRuns] = useState<Partial<Record<RunKey, boolean>>>({})
  const [manualChecks, setManualChecks] = useState<Partial<Record<ManualKey, boolean>>>({})

  /**
   * What this session's facts are about: the configuration being edited, and
   * the Supabase project it designates. A new configuration bumps the
   * generation; picking or creating another project changes the reference —
   * either way, what was true a moment ago is no longer being talked about.
   */
  const subject = `${state.configGeneration}:${state.config.SUPABASE_PROJECT_REF}`
  const subjectRef = useRef(subject)

  useEffect(() => {
    if (subjectRef.current === subject) return
    subjectRef.current = subject
    setRuns({})
    setManualChecks({})
  }, [subject])

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

  /**
   * A run that creates the buckets, applies the settings or restarts the bot
   * has done exactly what its checkbox states, so it ticks it. The boxes stay
   * editable afterwards — the reader can still take one back.
   */
  const confirmManual = useCallback((...keys: ManualKey[]) => {
    setManualChecks(prev => {
      if (keys.every(key => prev[key])) return prev
      const next = { ...prev }
      for (const key of keys) next[key] = true
      return next
    })
  }, [])

  const isRunDone = useCallback((key: RunKey) => !!runs[key], [runs])
  const isManualChecked = useCallback((key: ManualKey) => !!manualChecks[key], [manualChecks])

  return (
    <SessionContext.Provider
      value={{ runs, isRunDone, markRunDone, clearRun, manualChecks, isManualChecked, setManualCheck, confirmManual }}
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
