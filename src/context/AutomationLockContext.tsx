import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * One automation at a time, and nothing else while it runs.
 *
 * A run reaches out to a provider and writes what it brings back into the
 * config: leaving the step mid-run unmounts the hook that holds it, and
 * starting a second one races the first for the same fields. So whichever
 * component starts a run takes this lock, the navigation and every other
 * launch button read it, and the rest of the screen is dimmed behind the one
 * card that is still allowed to speak — and to be cancelled.
 */
interface AutomationLockValue {
  /** Id of the component holding the lock, or null when nothing runs. */
  owner: string | null
  acquire: (id: string) => void
  release: (id: string) => void
}

const AutomationLockContext = createContext<AutomationLockValue | null>(null)

export function AutomationLockProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<string | null>(null)

  const acquire = useCallback((id: string) => setOwner(id), [])
  // Only the holder can let go: a component that never had the lock unmounting
  // must not free one held elsewhere.
  const release = useCallback(
    (id: string) => setOwner(current => (current === id ? null : current)),
    [],
  )

  const value = useMemo(() => ({ owner, acquire, release }), [owner, acquire, release])

  return <AutomationLockContext.Provider value={value}>{children}</AutomationLockContext.Provider>
}

function useLockContext(): AutomationLockValue {
  const ctx = useContext(AutomationLockContext)
  if (!ctx) throw new Error('useAutomationLock must be used inside AutomationLockProvider')
  return ctx
}

/** Whether any automation is running — for the navigation, which starts none. */
export function useAutomationLocked(): boolean {
  return useLockContext().owner !== null
}

/**
 * For a component that starts an automation. Holds the lock for as long as
 * `running` is true — success, failure and cancellation all end it the same
 * way, by the status leaving `running` — and on unmount.
 *
 * `isOwner` marks the component to keep above the dimmed screen;
 * `lockedByOther` is what disables its own launch button meanwhile.
 */
export function useAutomationLock(running: boolean) {
  const id = useId()
  const { owner, acquire, release } = useLockContext()

  useEffect(() => {
    if (!running) return
    acquire(id)
    return () => release(id)
  }, [running, id, acquire, release])

  return {
    isOwner: owner === id,
    lockedByOther: owner !== null && owner !== id,
  }
}
