import React, { useState, useEffect, type ReactNode } from 'react'
import { Lock, KeyRound, Eye, EyeOff, AlertTriangle, ShieldCheck, Sun, Moon, Monitor } from 'lucide-react'
import { useApp, type ThemePreference } from '../../context/AppContext'
import { LanguageToggle } from '../layout/LanguageToggle'
import toast from 'react-hot-toast'
import './VaultGate.css'

interface VaultGateProps {
  children: ReactNode
}

export function VaultGate({ children }: VaultGateProps) {
  const {
    state,
    t,
    isVaultUnlocked,
    vaultExists,
    unlockVault,
    createVault,
    resetVault,
    setTheme,
  } = useApp()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)

  // Always wipe input values and errors when vault is locked / logged out
  useEffect(() => {
    if (!isVaultUnlocked) {
      setPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      setError(null)
    }
  }, [isVaultUnlocked])

  const isCreating = vaultExists === false

  // Next theme cycle
  const nextTheme = (current: ThemePreference): ThemePreference => {
    if (current === 'light') return 'dark'
    if (current === 'dark') return 'system'
    return 'light'
  }

  const ThemeIcon = state.theme === 'dark' ? Moon : state.theme === 'light' ? Sun : Monitor

  // Still checking status
  if (vaultExists === null) {
    return (
      <div className="vault-container">
        <div className="vault-loading-spinner" />
      </div>
    )
  }

  // Already unlocked
  if (isVaultUnlocked) {
    return <>{children}</>
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await unlockVault(password)
      if (!res.success) {
        setError(res.error || t('vault.error.wrongPassword'))
      } else {
        setPassword('')
        setConfirmPassword('')
        setShowPassword(false)
        setError(null)
        toast.success(t('vault.toast.unlocked'), {
          position: 'top-center',
          style: {
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
          },
        })
      }
    } catch (err: any) {
      setError(err.message || t('vault.error.wrongPassword'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return

    if (password.length < 6) {
      setError(t('vault.error.tooShort'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('vault.error.mismatch'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await createVault(password)
      if (!res.success) {
        setError(res.error || 'Erreur lors de la création')
      } else {
        setPassword('')
        setConfirmPassword('')
        setShowPassword(false)
        setError(null)
        toast.success(t('vault.toast.created'), {
          position: 'top-center',
          style: {
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
          },
        })
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmReset = async () => {
    setIsLoading(true)
    try {
      await resetVault()
      setShowResetModal(false)
      setPassword('')
      setConfirmPassword('')
      setError(null)
      toast.success(t('vault.toast.resetSuccess'), {
        position: 'top-center',
        style: {
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        },
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="vault-container">
      {/* Top right language & theme controls */}
      <div className="vault-top-right">
        <LanguageToggle />
        <button
          className="btn btn-icon"
          onClick={() => setTheme(nextTheme(state.theme))}
          title={t(`settings.theme.${state.theme}`)}
          id="btn-theme-vault"
          type="button"
        >
          <ThemeIcon size={16} />
        </button>
      </div>

      <div className="vault-card">
        <div className="vault-icon-wrapper">
          {isCreating ? (
            <ShieldCheck size={32} color="white" />
          ) : (
            <Lock size={32} color="white" />
          )}
        </div>

        <h1 className="vault-title">
          {isCreating ? t('vault.title.create') : t('vault.title.unlock')}
        </h1>
        <p className="vault-subtitle">
          {isCreating ? t('vault.subtitle.create') : t('vault.subtitle.unlock')}
        </p>

        <form onSubmit={isCreating ? handleCreate : handleUnlock} className="vault-form" autoComplete="off">
          <div className="vault-field">
            <label className="vault-label" htmlFor="vault-pwd">
              {t('vault.password.label')}
            </label>
            <div className="vault-input-group">
              <input
                id="vault-pwd"
                type={showPassword ? 'text' : 'password'}
                className="vault-input"
                placeholder={t('vault.password.placeholder')}
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
                aria-label="Afficher/masquer mot de passe"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {isCreating && (
            <div className="vault-field">
              <label className="vault-label" htmlFor="vault-confirm-pwd">
                {t('vault.confirmPassword.label')}
              </label>
              <div className="vault-input-group">
                <input
                  id="vault-confirm-pwd"
                  type={showPassword ? 'text' : 'password'}
                  className="vault-input"
                  placeholder={t('vault.confirmPassword.placeholder')}
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
          )}

          {error && (
            <div className="vault-error">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="vault-submit-btn"
            disabled={isLoading || !password || (isCreating && !confirmPassword)}
            id="btn-vault-submit"
          >
            <KeyRound size={18} />
            {isCreating ? t('vault.btn.create') : t('vault.btn.unlock')}
          </button>
        </form>

        {!isCreating && (
          <div className="vault-actions">
            <button
              type="button"
              className="vault-reset-link"
              onClick={() => setShowResetModal(true)}
              id="btn-vault-reset"
            >
              {t('vault.btn.reset')}
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Reset Vault */}
      {showResetModal && (
        <div className="vault-modal-overlay" onClick={e => e.target === e.currentTarget && setShowResetModal(false)}>
          <div className="vault-modal-box">
            <div className="vault-modal-header">
              <AlertTriangle size={20} />
              <span>{t('vault.reset.title')}</span>
            </div>
            <p className="vault-modal-desc">{t('vault.reset.desc')}</p>
            <div className="vault-modal-footer">
              <button
                type="button"
                className="vault-btn-cancel"
                onClick={() => setShowResetModal(false)}
                disabled={isLoading}
              >
                {t('vault.reset.btnCancel')}
              </button>
              <button
                type="button"
                className="vault-btn-danger"
                onClick={handleConfirmReset}
                disabled={isLoading}
                id="btn-confirm-reset-vault"
              >
                {t('vault.reset.btnConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
