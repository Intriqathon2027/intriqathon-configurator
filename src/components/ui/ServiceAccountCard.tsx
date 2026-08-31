import { type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { ExternalLinkBtn } from './ExternalLinkBtn'

interface ServiceAccountCardProps {
  serviceName: string
  serviceIcon: ReactNode
  externalUrl: string
  externalLabel: string
  isComplete: boolean
  children: ReactNode
}

export function ServiceAccountCard({
  serviceName,
  serviceIcon,
  externalUrl,
  externalLabel,
  isComplete,
  children,
}: ServiceAccountCardProps) {
  return (
    <div
      className={`service-account-card${isComplete ? ' service-account-card--complete' : ''}`}
    >
      <div className="service-account-card__header">
        {isComplete && (
          <span className="service-account-card__status-icon">
            <Check size={16} className="service-account-card__check" />
          </span>
        )}
        <span className="service-account-card__service-icon">{serviceIcon}</span>
        <span className="service-account-card__name">{serviceName}</span>
      </div>

      <div className="service-account-card__body">{children}</div>

      <div className="service-account-card__footer">
        <ExternalLinkBtn url={externalUrl} label={externalLabel} />
      </div>
    </div>
  )
}
