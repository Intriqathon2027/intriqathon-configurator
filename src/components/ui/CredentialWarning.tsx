import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useCredentialCheck } from '../../hooks/useCredentialCheck'
import { useSession } from '../../context/SessionContext'
import type { CredentialCheckRequest, CredentialState } from '../../types/credentials'

interface CredentialWarningProps {
  /** `null` while the fields are too incomplete to ask the provider anything. */
  request: CredentialCheckRequest | null
  message: string
  /**
   * Lets a sibling that runs its own checks against the same key — the
   * Supabase project picker, say — stay quiet while this box is already
   * saying the key is the problem, instead of both repeating the provider's
   * refusal in their own words.
   */
  onStateChange?: (state: CredentialState) => void
}

/**
 * Says nothing when the key works, and nothing while the answer is still
 * coming — a key is only reported when its own provider has refused it.
 *
 * The silence is the point: four cards that each confirm a key is fine would
 * crowd out the one that matters, and the account cards already turn green on
 * their own once they are filled in.
 */
export function CredentialWarning({ request, message, onStateChange }: CredentialWarningProps) {
  const state = useCredentialCheck(request)
  const { isCredentialRefused } = useSession()

  useEffect(() => {
    onStateChange?.(state)
  }, [state, onStateChange])

  /**
   * A refusal learned before this render counts too: the check takes a
   * debounce and a round trip, and a box that appeared only after them would
   * leave the reader a second of a card that looks fine — the very second in
   * which they move on to the next step.
   */
  const refused = state === 'invalid' || (!!request && isCredentialRefused(request.service))
  if (!refused) return null

  return (
    <div className="info-box warning">
      <AlertTriangle size={15} className="info-box-icon" />
      <div className="info-box-text">{message}</div>
    </div>
  )
}
