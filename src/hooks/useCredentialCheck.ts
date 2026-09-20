import { useEffect, useState } from 'react'
import type { CredentialCheckRequest, CredentialState } from '../types/credentials'

/**
 * Long enough that a key being typed or pasted is only checked once it has
 * settled, short enough that the answer lands while the reader is still
 * looking at the field.
 */
const DEBOUNCE_MS = 800

function check(req: CredentialCheckRequest): Promise<{ state: CredentialState }> {
  if (typeof window !== 'undefined' && window.electronAPI?.checkCredentials) {
    return window.electronAPI.checkCredentials(req)
  }
  // `npm run dev` in a plain browser: no main process to probe from, and a
  // warning nobody can act on would be worse than none.
  return Promise.resolve({ state: 'unknown' })
}

/**
 * Asks the provider whether it accepts the key, on mount and on every edit.
 *
 * `null` means there is nothing to ask about yet — an empty field, or a
 * service the current configuration does not use. The answer is `unknown`
 * until a check comes back, so a field in the middle of being typed never
 * shows as wrong.
 */
export function useCredentialCheck(req: CredentialCheckRequest | null): CredentialState {
  /**
   * The answer, kept with the request it answers. Storing the two together is
   * what makes a stale verdict unreachable: an edit changes the key, and a
   * result that no longer matches is simply not the answer to what is on
   * screen — whether it arrived late or belongs to the value typed before.
   */
  const [result, setResult] = useState<{ key: string; state: CredentialState } | null>(null)

  // The request as a value `useEffect` can compare — the object is rebuilt on
  // every render and would otherwise re-run the check on every render.
  const key = req ? JSON.stringify(req) : ''

  useEffect(() => {
    if (!key) return

    const timer = setTimeout(() => {
      void check(JSON.parse(key) as CredentialCheckRequest).then(answer =>
        setResult({ key, state: answer.state }),
      )
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [key])

  return result?.key === key ? result.state : 'unknown'
}
