import { type ReactNode } from 'react'
import { Check, Play, XCircle, Loader, AlertTriangle } from 'lucide-react'
import { HelpAnchorBtn } from './HelpAnchorBtn'

type ServiceConfigStatus = 'idle' | 'running' | 'done' | 'error' | 'none'

interface ServiceConfigBlockProps {
  stepNumber: number
  serviceName: string
  serviceIcon: ReactNode
  description: string
  status: ServiceConfigStatus
  /**
   * Marks the block as validated — same green treatment as a completed
   * ServiceAccountCard. Defaults to `status === 'done'`.
   */
  isComplete?: boolean
  logs?: string[]
  progress?: number
  onStart?: () => void
  onCancel?: () => void
  btnStartLabel: string
  btnCancelLabel: string
  statusLabels: { done: string; running: string; error: string }
  /**
   * `HelpService` block documenting this service. Rendered at the top of the
   * manual-configuration dropdown as a one-line summary plus a button that
   * opens the help panel on that walkthrough.
   */
  helpAnchor?: string
  /** The one line shown next to that button. */
  helpHint?: string
  /**
   * Label of the collapsible that wraps `children`. Omit to render the
   * children plainly, without a dropdown.
   */
  manualLabel?: string
  children?: ReactNode
}

export function ServiceConfigBlock({
  stepNumber,
  serviceName,
  serviceIcon,
  description,
  status,
  isComplete,
  logs = [],
  progress = 0,
  onStart,
  onCancel,
  btnStartLabel,
  btnCancelLabel,
  statusLabels,
  helpAnchor,
  helpHint,
  manualLabel,
  children,
}: ServiceConfigBlockProps) {
  const complete = isComplete ?? status === 'done'

  return (
    <div
      className={`service-config-block service-config-block--${status}${complete ? ' service-config-block--complete' : ''}`}
    >
      <div className="service-config-block__step-number">{stepNumber}</div>

      <div className="service-config-block__content">
        {/* Header */}
        <div className="service-config-block__header">
          <span className="service-config-block__icon">{serviceIcon}</span>
          <span className="service-config-block__name">{serviceName}</span>
        </div>

        <p className="service-config-block__description">{description}</p>

        {/* Status: Done */}
        {status === 'done' && (
          <div className="service-config-block__info-box service-config-block__info-box--success">
            <Check size={16} />
            <span>
              {statusLabels.done} — {serviceName} — Success
            </span>
          </div>
        )}

        {/* Status: Error */}
        {status === 'error' && (
          <div className="service-config-block__info-box service-config-block__info-box--error">
            <AlertTriangle size={16} />
            <span>{statusLabels.error}</span>
          </div>
        )}

        {/* Status: Running */}
        {status === 'running' && (
          <>
            <div className="service-config-block__info-box service-config-block__info-box--running">
              <Loader size={16} className="service-config-block__spinner" />
              <span>{statusLabels.running}</span>
            </div>

            {logs.length > 0 && (
              <div className="service-config-block__terminal">
                {logs.map((line, i) => (
                  <div key={i} className="service-config-block__log-line">
                    {line}
                  </div>
                ))}
              </div>
            )}

            {progress > 0 && (
              <div className="service-config-block__progress-track">
                <div
                  className="service-config-block__progress-bar"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            )}

            <button
              className="btn btn-danger service-config-block__btn-cancel"
              onClick={onCancel}
              type="button"
            >
              <XCircle size={14} />
              {btnCancelLabel}
            </button>
          </>
        )}

        {/* Status: Idle */}
        {status === 'idle' && (
          <button
            className="btn btn-primary service-config-block__btn-start"
            onClick={onStart}
            type="button"
          >
            <Play size={14} />
            {btnStartLabel}
          </button>
        )}

        {/* Manual fallback: the dropdown leads with a pointer to the panel */}
        {children && (manualLabel ? (
          <details className="manual-config-details">
            <summary>{manualLabel}</summary>
            {helpAnchor && (
              <div className="service-config-block__help">
                <HelpAnchorBtn anchor={helpAnchor} />
                {helpHint && <span className="service-help-hint">{helpHint}</span>}
              </div>
            )}
            {children}
          </details>
        ) : (
          <div className="service-config-block__children">{children}</div>
        ))}
      </div>
    </div>
  )
}
