import React, { useState } from 'react'
import { KeyRound, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import toast from 'react-hot-toast'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { changePassword, t } = useApp()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!oldPassword) {
      setError(t('vault.error.wrongPassword'))
      return
    }

    if (newPassword.length < 6) {
      setError(t('vault.error.tooShort'))
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t('vault.error.mismatch'))
      return
    }

    if (newPassword === oldPassword) {
      setError(t('vault.error.samePassword'))
      return
    }

    setIsLoading(true)
    try {
      const res = await changePassword(oldPassword, newPassword)
      if (res.success) {
        toast.success(t('vault.toast.passwordChanged'), {
          position: 'top-center',
          style: {
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
          },
        })
        handleClose()
      } else {
        setError(res.error || t('vault.error.wrongPassword'))
      }
    } catch (err: any) {
      setError(err.message || t('vault.error.wrongPassword'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="modal" style={{ width: '420px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <KeyRound size={18} color="var(--color-primary-text)" />
            {t('vault.changePassword.title')}
          </div>
          <button className="modal-close" onClick={handleClose} type="button">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', margin: '0 0 4px 0' }}>
              {t('vault.changePassword.desc')}
            </p>

            {/* Old Password */}
            <div className="vault-field">
              <label className="vault-label" htmlFor="old-pwd">
                {t('vault.changePassword.old')}
              </label>
              <div className="vault-input-group">
                <input
                  id="old-pwd"
                  type={showOld ? 'text' : 'password'}
                  className="vault-input"
                  value={oldPassword}
                  onChange={e => {
                    setOldPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="vault-eye-btn"
                  onClick={() => setShowOld(!showOld)}
                  tabIndex={-1}
                >
                  {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="vault-field">
              <label className="vault-label" htmlFor="new-pwd">
                {t('vault.changePassword.new')}
              </label>
              <div className="vault-input-group">
                <input
                  id="new-pwd"
                  type={showNew ? 'text' : 'password'}
                  className="vault-input"
                  value={newPassword}
                  onChange={e => {
                    setNewPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  required
                />
                <button
                  type="button"
                  className="vault-eye-btn"
                  onClick={() => setShowNew(!showNew)}
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="vault-field">
              <label className="vault-label" htmlFor="confirm-new-pwd">
                {t('vault.changePassword.confirm')}
              </label>
              <div className="vault-input-group">
                <input
                  id="confirm-new-pwd"
                  type={showNew ? 'text' : 'password'}
                  className="vault-input"
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="vault-error" style={{ marginTop: '2px' }}>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              {t('vault.changePassword.btnCancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || !oldPassword || !newPassword || !confirmPassword}
              id="btn-submit-change-password"
            >
              {t('vault.changePassword.btnSubmit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
