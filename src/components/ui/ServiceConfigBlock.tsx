import { useRef, useEffect, type ReactNode } from 'react'
import { Play, XCircle, Loader, AlertTriangle, RotateCcw, Lock } from 'lucide-react'
import { HelpAnchorBtn } from './HelpAnchorBtn'

type ServiceConfigStatus = 'idle' | 'running' | 'done' | 'error' | 'none'

interface ServiceConfigBlockProps {
  stepNumber: number
  serviceName: string
  serviceIcon: ReactNode
  /** Omit on a block whose content already says what it is for. */
  description?: string
  status: ServiceConfigStatus
  /**
   * Marks the block as validated — same green treatment as a completed
   * ServiceAccountCard. Defaults to `status === 'done'`.
   */
  isComplete?: boolean
  /**
   * The reader ticked the boxes saying they did this step by hand. Unlike
   * `isComplete`, this survives `locked`: the lock says the automation cannot
   * run, which is precisely the case where the manual route is the answer —
   * greying out a step someone just declared finished would contradict them.
   */
  manuallyConfirmed?: boolean
  logs?: string[]
  progress?: number
  onStart?: () => void
  onCancel?: () => void
  btnStartLabel: string
  /** Shown in place of `btnStartLabel` once a run has failed. */
  btnRetryLabel?: string
  /** Shown once a run has succeeded — starting it again is a re-run, not a first go. */
  btnRerunLabel?: string
  btnCancelLabel: string
  statusLabels: { done: string; running: string; error: string }
  /** Provider wording for a failure — shown under the generic error banner. */
  errorMessage?: string | null
  /**
   * `HelpService` block documenting this service. Rendered at the top of the
   * manual-configuration dropdown as a one-line summary plus a button that
   * opens the help panel on that walkthrough.
   */
  helpAnchor?: string
  /** The one line shown next to that button. */
  helpHint?: string
  /**
   * Automation prerequisites are not met — the "Lancer" button is replaced by
   * the reason. Deliberately does NOT disable `children`: when the chain is
   * stuck, filling the fields by hand is the way out, not something to lock
   * away.
   */
  locked?: boolean
  lockedReason?: string
  /**
   * Sits between the action button and the manual dropdown — for the inputs the
   * automation itself consumes (the SSH key Scaleway installs on the instance,
   * say), which belong to the run rather than to the manual fallback.
   */
  extra?: ReactNode
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
  manuallyConfirmed = false,
  logs = [],
  progress = 0,
  onStart,
  onCancel,
  btnStartLabel,
  btnRetryLabel,
  btnRerunLabel,
  btnCancelLabel,
  statusLabels,
  errorMessage,
  helpAnchor,
  helpHint,
  locked = false,
  lockedReason,
  extra,
  manualLabel,
  children,
}: ServiceConfigBlockProps) {
  /**
   * Three ways to be finished, and a run that succeeded is the plainest of
   * them: whatever `isComplete` is derived from, the service was just
   * configured, so the block says so. One style for all three — a block that
   * is fully filled in is green, locked or not.
   */
  const complete = status === 'done'
    || manuallyConfirmed
    || (isComplete ?? false)
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  // Extract the most descriptive error line from logs if available
  const lastError = [...logs].reverse().find(l =>
    l.includes('[ERREUR') || l.toLowerCase().includes('erreur') || l.toLowerCase().includes('error') || l.includes('Échec')
  )
  const cleanErrorMessage = lastError ? lastError.replace(/^\[ERREUR\]\s*/, '') : undefined

  return (
    <div
      className={`service-config-block service-config-block--${status}${complete ? ' service-config-block--complete' : ''}${locked ? ' service-config-block--locked' : ''}`}
    >
      <div className="service-config-block__step-number">{stepNumber}</div>

      <div className="service-config-block__content">
        {/* Header */}
        <div className="service-config-block__header">
          <span className="service-config-block__icon">{serviceIcon}</span>
          <span className="service-config-block__name">{serviceName}</span>
        </div>

        {description && <p className="service-config-block__description">{description}</p>}

        {/* Success has no banner: the block turning green says it, and a box
            repeating it only pushed the next step further down. */}

        {/* Status: Error — the provider's wording is what makes it actionable */}
        {status === 'error' && (
          <div className="service-config-block__info-box service-config-block__info-box--error">
            <AlertTriangle size={16} />
            <div className="service-config-block__info-box-body">
              <span>{statusLabels.error}</span>
              {(errorMessage ?? cleanErrorMessage) && (
                <span className="service-config-block__error-detail">
                  {errorMessage ?? cleanErrorMessage}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Status: Running banner */}
        {status === 'running' && (
          <div className="service-config-block__info-box service-config-block__info-box--running">
            <Loader size={16} className="service-config-block__spinner" />
            <span>{statusLabels.running}</span>
          </div>
        )}

        {/* Terminal logs — while the run is speaking, and after a failure, where
            the last lines are the only account of what went wrong. A success
            has nothing left to read: the banner says it, and the values it
            brought back are in the fields. */}
        {logs.length > 0 && (status === 'running' || status === 'error') && (
          <div className="service-config-block__terminal" ref={terminalRef}>
            {logs.map((line, i) => {
              const isErr = line.includes('[ERREUR') || line.toLowerCase().includes('erreur') || line.toLowerCase().includes('error') || line.includes('Échec')
              return (
                <div
                  key={i}
                  className={`service-config-block__log-line${isErr ? ' service-config-block__log-line--error' : ''}`}
                >
                  {line}
                </div>
              )
            })}
          </div>
        )}

        {/* Progress bar */}
        {status === 'running' && progress > 0 && (
          <div className="service-config-block__progress-track">
            <div
              className="service-config-block__progress-bar"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}

        {/* Cancel button during execution */}
        {status === 'running' && onCancel && (
          <button
            className="btn btn-danger service-config-block__btn-cancel"
            onClick={onCancel}
            type="button"
          >
            <XCircle size={14} />
            {btnCancelLabel}
          </button>
        )}

        {/* Startable, waiting on an upstream step, or retryable after a failure.
            A step confirmed by hand has no waiting left to report: the
            automation it is waiting for is one it no longer needs. */}
        {(status === 'idle' || status === 'error') && (locked ? (
          !manuallyConfirmed && (
            <div className="service-config-block__info-box service-config-block__info-box--locked">
              <Lock size={16} />
              <span>{lockedReason}</span>
            </div>
          )
        ) : (
          <button
            className="btn btn-primary service-config-block__btn-start"
            onClick={onStart}
            type="button"
          >
            {status === 'error' ? <RotateCcw size={14} /> : <Play size={14} />}
            {status === 'error'
              ? btnRetryLabel ?? (btnStartLabel === 'Launch' ? 'Retry' : 'Réessayer')
              : btnStartLabel}
          </button>
        ))}

        {/* A finished run can always be started again — the automations are
            written to be re-runnable, and a second pass is how a configuration
            changed elsewhere is brought back in line. */}
        {status === 'done' && onStart && !locked && (
          <button
            className="btn btn-secondary service-config-block__btn-rerun"
            onClick={onStart}
            type="button"
          >
            <RotateCcw size={14} />
            {btnRerunLabel ?? (btnStartLabel === 'Launch' ? 'Run again' : 'Relancer')}
          </button>
        )}

        {/* Inputs the run itself consumes — above the manual fallback, below the
            button they belong to. */}
        {extra && <div className="service-config-block__extra">{extra}</div>}

        {/* Manual fallback: the dropdown leads with a pointer to the panel */}
        {children && (manualLabel ? (
          <details className="manual-config-details">
            <summary>{manualLabel}</summary>
            {/* One wrapper, one stack. Spacing the panel through `details`
                itself does not work: the browser puts everything after the
                summary in a box of its own, so a gap set on `details` lands
                between the summary and that box and never between the things
                inside it. */}
            <div className="manual-config-details__panel">
              {helpAnchor && (
                <div className="service-config-block__help">
                  <HelpAnchorBtn anchor={helpAnchor} />
                  {helpHint && <span className="service-help-hint">{helpHint}</span>}
                </div>
              )}
              {children}
            </div>
          </details>
        ) : (
          <div className="service-config-block__children">{children}</div>
        ))}
      </div>
    </div>
  )
}
