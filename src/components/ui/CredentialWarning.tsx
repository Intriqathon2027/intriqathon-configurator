import { AlertTriangle } from 'lucide-react'
import { useCredentialCheck } from '../../hooks/useCredentialCheck'
import type { CredentialCheckRequest } from '../../types/credentials'

interface CredentialWarningProps {
  /** `null` while the fields are too incomplete to ask the provider anything. */
  request: CredentialCheckRequest | null
  message: string
}

/**
 * Says nothing when the key works, and nothing while the answer is still
 * coming — a key is only reported when its own provider has refused it.
 *
 * The silence is the point: four cards that each confirm a key is fine would
 * crowd out the one that matters, and the account cards already turn green on
 * their own once they are filled in.
 */
export function CredentialWarning({ request, message }: CredentialWarningProps) {
  const state = useCredentialCheck(request)
  if (state !== 'invalid') return null

  return (
    <div className="info-box warning">
      <AlertTriangle size={15} className="info-box-icon" />
      <div className="info-box-text">{message}</div>
    </div>
  )
}
