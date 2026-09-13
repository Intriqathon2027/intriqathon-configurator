import { useState, useEffect } from 'react'
import { Key, Plus, Check, Shield, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
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

export function SshKeyModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
}: SshKeyModalProps) {
  const { selectedSshKey, setSelectedSshKey, state } = useApp()
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
        // If current selection is still in list, keep it; otherwise select first key with private key
        const match = selected ? list.find(k => k.publicKeyPath === selected.publicKeyPath) : null
        if (match) {
          setSelected(match)
        } else {
          const firstValid = list.find(k => k.hasPrivateKey) || list[0]
          setSelected(firstValid)
        }
      }
    } catch (err: any) {
      toast.error(isEn ? 'Failed to read SSH keys' : 'Erreur de lecture des clés SSH')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setSelected(selectedSshKey)
      loadKeys()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleGenerate = async () => {
    if (!window.electronAPI?.generateSshKey) return
    setGenerating(true)
    try {
      const res = await window.electronAPI.generateSshKey(newKeyName.trim() || undefined)
      if (res.success && res.key) {
        toast.success(isEn ? 'SSH key generated successfully!' : 'Clé SSH générée avec succès !')
        setKeys(prev => [res.key!, ...prev])
        setSelected(res.key!)
        setIsCreating(false)
      } else {
        toast.error(res.error || (isEn ? 'Failed to generate SSH key' : 'Échec de la génération'))
      }
    } catch (err: any) {
      toast.error(err.message || String(err))
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

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: '560px', maxWidth: '95vw' }}>
        <div className="modal-header">
          <div className="modal-title">
            <Key size={18} color="var(--color-primary-text)" />
            {title || (isEn ? 'Select an SSH Key' : 'Sélectionner une clé SSH')}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            {description || (
              isEn
                ? 'Choose the SSH key that will be uploaded to Scaleway and used for SSH deployment.'
                : 'Choisissez la clé SSH qui sera injectée dans votre instance Scaleway et utilisée pour le déploiement.'
            )}
          </p>

          {/* List of keys */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isEn ? `Detected keys (${keys.length})` : `Clés détectées (~/.ssh) : ${keys.length}`}
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '2px 8px', fontSize: 'var(--font-size-xs)', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={loadKeys}
              disabled={loading}
              title={isEn ? 'Refresh' : 'Actualiser'}
            >
              <RefreshCw size={12} className={loading ? 'deploy-log-spinner' : ''} />
              {isEn ? 'Refresh' : 'Actualiser'}
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '32px 0', gap: '8px' }}>
              <Loader2 size={20} className="deploy-log-spinner" />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {isEn ? 'Scanning ~/.ssh...' : 'Recherche des clés dans ~/.ssh...'}
              </span>
            </div>
          ) : keys.length === 0 ? (
            <div style={{
              padding: '20px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-surface-sunken)',
              border: '1px dashed var(--color-border)',
              textAlign: 'center',
            }}>
              <AlertCircle size={24} style={{ color: 'var(--color-warning)', margin: '0 auto 8px' }} />
              <p style={{ margin: '0 0 8px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                {isEn ? 'No SSH key found in ~/.ssh' : 'Aucune clé SSH trouvée dans ~/.ssh'}
              </p>
              <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                {isEn
                  ? 'Generate a new Ed25519 key below to continue.'
                  : 'Générez une nouvelle clé Ed25519 ci-dessous en un clic.'}
              </p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '260px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}>
              {keys.map(k => {
                const isSelected = selected?.publicKeyPath === k.publicKeyPath
                return (
                  <div
                    key={k.publicKeyPath}
                    onClick={() => setSelected(k)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      backgroundColor: isSelected ? 'var(--color-primary-subtle, rgba(34, 197, 94, 0.08))' : 'var(--color-surface)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <input
                      type="radio"
                      name="ssh-key-selection"
                      checked={isSelected}
                      onChange={() => setSelected(k)}
                      style={{ marginTop: '3px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 'var(--font-size-sm)' }}>{k.name}</strong>
                        <span style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--color-surface-sunken)',
                          border: '1px solid var(--color-border)',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}>
                          {k.keyType.replace(/^ssh-/, '')}
                        </span>
                        {k.hasPrivateKey ? (
                          <span style={{ fontSize: '11px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Shield size={12} /> {isEn ? 'Private key found' : 'Clé privée OK'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <AlertCircle size={12} /> {isEn ? 'Pub only' : 'Publique uniquement'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', wordBreak: 'break-all' }}>
                        {k.publicKeyPath}
                      </div>
                      <div style={{
                        marginTop: '4px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        color: 'var(--color-text-secondary)',
                        backgroundColor: 'var(--color-surface-sunken)',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {k.publicKey.slice(0, 48)}...{k.publicKey.slice(-16)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Creation form */}
          {isCreating ? (
            <div style={{
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-surface-sunken)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={15} color="var(--color-primary)" />
                {isEn ? 'Generate a new Ed25519 key' : 'Générer une nouvelle clé SSH (Ed25519)'}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="Nom de fichier (ex: id_ed25519_intriqathon)"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  disabled={generating}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleGenerate}
                  disabled={generating || !newKeyName.trim()}
                >
                  {generating ? (
                    <>
                      <Loader2 size={14} className="deploy-log-spinner" />
                      {isEn ? 'Generating...' : 'Génération...'}
                    </>
                  ) : (
                    isEn ? 'Generate' : 'Générer'
                  )}
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
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={() => setIsCreating(true)}
            >
              <Plus size={14} />
              {isEn ? 'Generate a new SSH key' : 'Créer une nouvelle clé SSH (Ed25519)'}
            </button>
          )}
        </div>

        <div className="modal-footer" style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          padding: '12px 20px',
          borderTop: '1px solid var(--color-border)',
        }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {isEn ? 'Cancel' : 'Annuler'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!selected}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Check size={14} />
            {isEn ? 'Use this key' : 'Valider la clé'}
          </button>
        </div>
      </div>
    </div>
  )
}
