import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'

export interface WarningDialogItem {
  key: string
  /** Short prefix shown before the label — usually the step it belongs to. */
  chip?: string
  label: ReactNode
}

interface WarningDialogProps {
  title: string
  /** What is about to happen, and why the list below matters. */
  intro: ReactNode
  items?: WarningDialogItem[]
  /** The way out, said after the list: what deploying anyway costs. */
  note?: ReactNode
  cancelLabel: string
  proceedLabel: string
  proceedIcon?: ReactNode
  /** Button ids become `btn-<idPrefix>-cancel` / `-proceed`. */
  idPrefix: string
  onCancel: () => void
  onProceed: () => void
}

/**
 * The dialog raised when an action is started while something it depends on is
 * still unfinished.
 *
 * Deliberately a warning and not a gate: the order these steps are carried out
 * in is legitimately flexible — a hackathon deployed before its Discord app
 * exists is a real sequence — and a reader who knows that should not have to
 * fake a ticked box to get past this screen. What the dialog owes them is an
 * accurate list and a way through it.
 */
export function WarningDialog({
  title,
  intro,
  items,
  note,
  cancelLabel,
  proceedLabel,
  proceedIcon,
  idPrefix,
  onCancel,
  onProceed,
}: WarningDialogProps) {
  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal deploy-dialog">
        <div className="modal-header">
          <div className="modal-title">
            <AlertTriangle size={18} color="var(--color-warning)" />
            {title}
          </div>
        </div>

        <div className="modal-body">
          <p className="warning-dialog__intro">{intro}</p>

          {items && items.length > 0 && (
            <ul className="warning-dialog__list">
              {items.map(item => (
                <li key={item.key} className="warning-dialog__item">
                  {item.chip && <span className="warning-dialog__chip">{item.chip}</span>}
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          )}

          {note && <p className="warning-dialog__note">{note}</p>}
        </div>

        <div className="deploy-dialog-footer">
          <button className="btn btn-secondary" onClick={onCancel} id={`btn-${idPrefix}-cancel`}>
            <X size={14} />
            {cancelLabel}
          </button>
          <button className="btn btn-primary" onClick={onProceed} id={`btn-${idPrefix}-proceed`}>
            {proceedIcon}
            {proceedLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
