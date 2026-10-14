import { type ReactNode } from 'react'
import { HelpAnchorBtn } from './HelpAnchorBtn'
import { useAutomationLock } from '../../context/AutomationLockContext'

interface ServiceAccountCardProps {
  serviceName: string
  serviceIcon: ReactNode
  /**
   * `HelpService` block this card documents. The footer button opens the help
   * panel there rather than jumping straight to the provider — the walkthrough
   * carries the provider links, in the order they are needed.
   */
  helpAnchor: string
  isComplete: boolean
  /**
   * An automation started from inside the card is running — the Supabase
   * project creation, say. The card then holds the app-wide lock and stays
   * above the dimmed screen.
   */
  automationRunning?: boolean
  children: ReactNode
}

export function ServiceAccountCard({
  serviceName,
  serviceIcon,
  helpAnchor,
  isComplete,
  automationRunning = false,
  children,
}: ServiceAccountCardProps) {
  const { isOwner: automationFocused } = useAutomationLock(automationRunning)

  return (
    <div
      className={`service-account-card${isComplete ? ' service-account-card--complete' : ''}${automationFocused ? ' automation-focus' : ''}`}
    >
      <div className="service-account-card__header">
        <span className="service-account-card__service-icon">{serviceIcon}</span>
        <span className="service-account-card__name">{serviceName}</span>
      </div>

      <div className="service-account-card__body">{children}</div>

      <div className="service-account-card__footer">
        <HelpAnchorBtn anchor={helpAnchor} />
      </div>
    </div>
  )
}
