import React, { useState } from 'react'
import { FileKey, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { useApp } from '../../context/AppContext'

interface ImportPasswordModalProps {
  isOpen: boolean
  filePath: string
  encryptedData: any
  onSuccess: (data: Record<string, string>, filePath: string) => void
  onClose: () => void
}

export function ImportPasswordModal({
  isOpen,
  filePath,
  encryptedData,
  onSuccess,
  onClose,
}: ImportPasswordModalProps) {
  const { t } = useApp()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const fileName = filePath ? filePath.split('/').pop() || filePath : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return

    setIsLoading(true)
    setError(null)

    try {
      if (window.electronAPI && window.electronAPI.vaultDecryptFile) {
        const res = await window.electronAPI.vaultDecryptFile(encryptedData, password)
        if (res.success && res.data) {
          onSuccess(res.data, filePath)
          handleClose()
        } else {
          setError(res.error || t('vault.import.pwdError'))
        }
      }
    } catch (err: any) {
      setError(err.message || t('vault.import.pwdError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setError(null)
    setShowPassword(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="modal" style={{ width: '440px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <FileKey size={18} color="var(--color-primary-text)" />
            {t('vault.import.pwdTitle')}
          </div>
          <button className="modal-close" onClick={handleClose} type="button">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
              {t('vault.import.pwdDesc')}
            </p>

            {fileName && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                wordBreak: 'break-all'
              }}>
                <strong>{t('vault.import.fileLabel')}</strong> {fileName}
              </div>
            )}

            <div className="vault-field">
              <label className="vault-label" htmlFor="import-pwd">
                {t('vault.password.label')}
              </label>
              <div className="vault-input-group">
                <input
                  id="import-pwd"
                  type={showPassword ? 'text' : 'password'}
                  className="vault-input"
                  placeholder={t('vault.import.passwordPlaceholder')}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  autoComplete="new-password"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="vault-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="vault-error">
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
              disabled={isLoading || !password}
              id="btn-submit-import-password"
            >
              {t('vault.import.btnSubmit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
