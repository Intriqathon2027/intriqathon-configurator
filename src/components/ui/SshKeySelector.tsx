import { useState, useImperativeHandle, forwardRef } from 'react'
import { Key } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { SshKeyModal } from './SshKeyModal'
import type { SshKeyInfo } from '../../types/electron'
import toast from 'react-hot-toast'

export interface SshKeySelectorHandle {
  openModal: () => void
}

export interface SshKeySelectorProps {
  label?: string
  className?: string
  style?: React.CSSProperties
  onSelectKey?: (key: SshKeyInfo) => void
}

export const SshKeySelector = forwardRef<SshKeySelectorHandle, SshKeySelectorProps>(function SshKeySelector(
  { label, className = '', style, onSelectKey },
  ref
) {
  const { selectedSshKey, state } = useApp()
  const isEn = state.language === 'en'
  const [modalOpen, setModalOpen] = useState(false)

  useImperativeHandle(ref, () => ({
    openModal: () => setModalOpen(true),
  }))

  const handleConfirm = (key: SshKeyInfo) => {
    toast.success(
      isEn ? `SSH key "${key.name}" selected` : `Clé SSH "${key.name}" sélectionnée`
    )
    onSelectKey?.(key)
  }

  return (
    <div className={`ssh-key-selector ${className}`} style={{ marginBottom: '12px', ...style }}>
      {label && (
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: '6px' }}>
          {label}
        </div>
      )}

      {selectedSshKey ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--color-surface-sunken)',
            border: '1px solid var(--color-border)',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
            <Key size={14} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {isEn ? 'Selected SSH key:' : 'Clé SSH sélectionnée :'}
              </span>{' '}
              <strong style={{ color: 'var(--color-text-primary)' }}>{selectedSshKey.name}</strong>
              {selectedSshKey.type && (
                <span
                  style={{
                    marginLeft: '8px',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {selectedSshKey.type.toUpperCase()}
                </span>
              )}
            </span>
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '2px 8px', fontSize: '11px', flexShrink: 0 }}
            onClick={() => setModalOpen(true)}
          >
            {isEn ? 'Change' : 'Changer'}
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--color-surface-sunken)',
            border: '1px dashed var(--color-border)',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)' }}>
            <Key size={14} />
            <span>{isEn ? 'No SSH key selected' : 'Aucune clé SSH sélectionnée'}</span>
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '2px 10px', fontSize: '11px' }}
            onClick={() => setModalOpen(true)}
          >
            {isEn ? 'Select key' : 'Sélectionner une clé'}
          </button>
        </div>
      )}

      <SshKeyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  )
})
