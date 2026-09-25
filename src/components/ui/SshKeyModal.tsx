import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Key, Plus, Check, AlertCircle, Loader2, RefreshCw, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { SshKeyInfo } from '../../types/electron'
import toast from 'react-hot-toast'

interface SshKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (key: SshKeyInfo) => void
  title?: string
  description?: string
}

/**
 * Picks the key the deployment will authenticate with.
 *
 * The list says only what bears on the choice: the key's name, its algorithm,
 * and where it lives. It used to also print a truncated public key and a green
 * "private key found" badge on every row — a fingerprint nobody verifies, and
 * a reassurance repeated as many times as there were keys. A missing private
 * key is the only fact worth a marker, because it is the only one that stops
 * the key from working.
 */
export function SshKeyModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
}: SshKeyModalProps) {
  const { selectedSshKey, setSelectedSshKey, state, t } = useApp()
  const isEn = state.language === 'en'

  const [keys, setKeys] = useState<SshKeyInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<SshKeyInfo | null>(selectedSshKey)
  const [isCreating, setIsCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('id_ed25519_intriqathon')
  const [generating, setGenerating] = useState(false)

  const loadKeys = async () => {
    if (!window.electronAPI?.listSshKeys) return
    setLoading(true)
    try {
      const list = await window.electronAPI.listSshKeys()
      setKeys(list)
      if (list.length > 0) {
        // Keep the current selection if it survived the rescan; otherwise
        // prefer a key that actually has its private half.
        const match = selected ? list.find(k => k.publicKeyPath === selected.publicKeyPath) : null
        setSelected(match ?? list.find(k => k.hasPrivateKey) ?? list[0])
      }
    } catch {
      toast.error(isEn ? 'Failed to read SSH keys' : 'Erreur de lecture des clés SSH')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    setSelected(selectedSshKey)
    void loadKeys()
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleGenerate = async () => {
    if (!window.electronAPI?.generateSshKey) return
    setGenerating(true)
    try {
      const res = await window.electronAPI.generateSshKey(newKeyName.trim() || undefined)
      if (res.success && res.key) {
        toast.success(isEn ? 'SSH key generated' : 'Clé SSH générée')
        setKeys(prev => [res.key!, ...prev])
        setSelected(res.key!)
        setIsCreating(false)
      } else {
        toast.error(res.error || (isEn ? 'Failed to generate SSH key' : 'Échec de la génération'))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setGenerating(false)
    }
  }

  const handleConfirm = () => {
    if (!selected) return
    setSelectedSshKey(selected)
    onConfirm(selected)
    onClose()
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal ssh-modal">
        <div className="modal-header">
          <div className="modal-title">
            <Key size={18} color="var(--color-primary-text)" />
            {title || (isEn ? 'Select an SSH key' : 'Sélectionner une clé SSH')}
          </div>
          <button className="modal-close" onClick={onClose} aria-label={t('btn.close')}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body ssh-modal__body">
          <p className="ssh-modal__desc">
            {description || (isEn
              ? 'This key is installed on the Scaleway instance and used for every SSH step.'
              : "Cette clé est installée sur l'instance Scaleway et sert à toutes les étapes SSH.")}
          </p>

          <div className="ssh-modal__list-head">
            <span className="ssh-modal__count">
              {isEn ? `Keys in ~/.ssh (${keys.length})` : `Clés dans ~/.ssh (${keys.length})`}
            </span>
            <button
              type="button"
              className="btn btn-ghost ssh-modal__refresh"
              onClick={loadKeys}
              disabled={loading}
            >
              <RefreshCw size={12} className={loading ? 'deploy-log-spinner' : undefined} />
              {isEn ? 'Refresh' : 'Actualiser'}
            </button>
          </div>

          {loading ? (
            <div className="ssh-modal__loading">
              <Loader2 size={18} className="deploy-log-spinner" />
              {isEn ? 'Scanning ~/.ssh…' : 'Recherche dans ~/.ssh…'}
            </div>
          ) : keys.length === 0 ? (
            <div className="ssh-modal__empty">
              <AlertCircle size={20} className="ssh-modal__empty-icon" />
              <div>
                <div className="ssh-modal__empty-title">
                  {isEn ? 'No SSH key found' : 'Aucune clé SSH trouvée'}
                </div>
                {isEn
                  ? 'Generate an Ed25519 key below to continue.'
                  : 'Générez une clé Ed25519 ci-dessous pour continuer.'}
              </div>
            </div>
          ) : (
            <div className="ssh-modal__list">
              {keys.map(k => {
                const isSelected = selected?.publicKeyPath === k.publicKeyPath
                return (
                  <label
                    key={k.publicKeyPath}
                    className={`ssh-key-row${isSelected ? ' ssh-key-row--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="ssh-key-selection"
                      checked={isSelected}
                      onChange={() => setSelected(k)}
                    />
                    <div className="ssh-key-row__body">
                      <div className="ssh-key-row__head">
                        <span className="ssh-key-row__name">{k.name}</span>
                        <span className="ssh-key-row__type">{k.keyType.replace(/^ssh-/, '')}</span>
                        {!k.hasPrivateKey && (
                          <span className="ssh-key-row__warn">
                            <AlertCircle size={12} />
                            {isEn ? 'Public key only' : 'Clé publique seule'}
                          </span>
                        )}
                      </div>
                      <div className="ssh-key-row__path">{k.publicKeyPath}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          {isCreating ? (
            <div className="ssh-modal__create">
              <label className="form-label" htmlFor="ssh-new-key-name">
                {isEn ? 'New Ed25519 key — file name' : 'Nouvelle clé Ed25519 — nom du fichier'}
              </label>
              <div className="ssh-modal__create-row">
                <input
                  id="ssh-new-key-name"
                  type="text"
                  className="form-input"
                  placeholder="id_ed25519_intriqathon"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  disabled={generating}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleGenerate}
                  disabled={generating || !newKeyName.trim()}
                >
                  {generating
                    ? <><Loader2 size={14} className="deploy-log-spinner" />{isEn ? 'Generating…' : 'Génération…'}</>
                    : (isEn ? 'Generate' : 'Générer')}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreating(false)}
                  disabled={generating}
                >
                  {isEn ? 'Cancel' : 'Annuler'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-secondary ssh-modal__create-btn"
              onClick={() => setIsCreating(true)}
            >
              <Plus size={14} />
              {isEn ? 'Generate a new key' : 'Générer une nouvelle clé'}
            </button>
          )}
        </div>

        <div className="deploy-dialog-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {isEn ? 'Cancel' : 'Annuler'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!selected}
          >
            <Check size={14} />
            {isEn ? 'Use this key' : 'Utiliser cette clé'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
