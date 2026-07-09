import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, LogIn, AlertTriangle, List } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { DialogData, DialogResponse } from '../../hooks/useDeployment'

interface DeployDialogProps {
  dialog: DialogData
  onRespond: (response: DialogResponse) => void
}

export function DeployDialog({ dialog, onRespond }: DeployDialogProps) {
  const { t } = useApp()

  switch (dialog.type) {
    case 'auth':
      return <AuthDialog dialog={dialog} onRespond={onRespond} t={t} />
    case 'confirm':
      return <ConfirmDialog dialog={dialog} onRespond={onRespond} t={t} />
    case 'choice':
      return <ChoiceDialog dialog={dialog} onRespond={onRespond} t={t} />
  }
}

// ============================================================
// AUTH DIALOG
// ============================================================

function AuthDialog({
  dialog,
  onRespond,
  t,
}: {
  dialog: DialogData & { type: 'auth' }
  onRespond: (r: DialogResponse) => void
  t: (key: string) => string
}) {
  const [username, setUsername] = useState('root')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onRespond({ type: 'auth', username, password })
  }

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && undefined}>
      <div className="modal deploy-dialog">
        <div className="modal-header">
          <div className="modal-title">
            <LogIn size={18} color="var(--color-primary)" />
            {dialog.title || t('step6.dialog.auth.title')}
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {dialog.message && (
              <p className="deploy-dialog-message">{dialog.message}</p>
            )}
            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-label">{t('step6.dialog.auth.username')}</label>
              <input
                className="form-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('step6.dialog.auth.password')}</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="deploy-dialog-footer">
            <button type="submit" className="btn btn-primary" id="btn-dialog-auth-submit">
              <LogIn size={14} />
              {t('step6.dialog.auth.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ============================================================
// CONFIRM DIALOG
// ============================================================

function ConfirmDialog({
  dialog,
  onRespond,
  t,
}: {
  dialog: DialogData & { type: 'confirm' }
  onRespond: (r: DialogResponse) => void
  t: (key: string) => string
}) {
  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && undefined}>
      <div className="modal deploy-dialog">
        <div className="modal-header">
          <div className="modal-title">
            <AlertTriangle size={18} color="var(--color-warning)" />
            {dialog.title || t('step6.dialog.confirm.title')}
          </div>
        </div>
        <div className="modal-body">
          <p className="deploy-dialog-message">{dialog.message}</p>
        </div>
        <div className="deploy-dialog-footer">
          <button
            className="btn btn-secondary"
            onClick={() => onRespond({ type: 'confirm', confirmed: false })}
            id="btn-dialog-confirm-no"
          >
            <X size={14} />
            {t('step6.dialog.confirm.no')}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onRespond({ type: 'confirm', confirmed: true })}
            id="btn-dialog-confirm-yes"
          >
            {t('step6.dialog.confirm.yes')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ============================================================
// CHOICE DIALOG
// ============================================================

function ChoiceDialog({
  dialog,
  onRespond,
  t,
}: {
  dialog: DialogData & { type: 'choice' }
  onRespond: (r: DialogResponse) => void
  t: (key: string) => string
}) {
  const [selected, setSelected] = useState(dialog.options[0]?.value ?? '')

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && undefined}>
      <div className="modal deploy-dialog">
        <div className="modal-header">
          <div className="modal-title">
            <List size={18} color="var(--color-secondary)" />
            {dialog.title || t('step6.dialog.choice.title')}
          </div>
        </div>
        <div className="modal-body">
          <p className="deploy-dialog-message">{dialog.message}</p>
          <div className="deploy-choice-options">
            {dialog.options.map((option) => (
              <label
                key={option.value}
                className={`deploy-choice-option ${selected === option.value ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="deploy-choice"
                  value={option.value}
                  checked={selected === option.value}
                  onChange={() => setSelected(option.value)}
                />
                <span className="deploy-choice-radio" />
                <span className="deploy-choice-label">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="deploy-dialog-footer">
          <button
            className="btn btn-primary"
            onClick={() => onRespond({ type: 'choice', selectedValue: selected })}
            id="btn-dialog-choice-submit"
          >
            {t('step6.dialog.choice.submit')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
