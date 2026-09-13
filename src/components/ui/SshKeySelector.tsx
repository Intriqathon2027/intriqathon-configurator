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

/**
 * Picking the key, laid out like the field next to it: a label, a box carrying
 * the current value, and a button standing apart from it — the same shape as
 * "Chemin de déploiement" and its "Parcourir". The key is chosen in a modal
 * rather than typed, but that is no reason for the row to read differently.
 */
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
    <div className={`ssh-key-selector ${className}`} style={style}>
      {label && <label className="form-label">{label}</label>}

      <div className="form-input-row">
        <div
          className={`ssh-key-selector__value${selectedSshKey ? '' : ' ssh-key-selector__value--empty'}`}
        >
          <Key size={14} color={selectedSshKey ? 'var(--color-primary)' : 'currentColor'} />
          {selectedSshKey ? (
            <span className="ssh-key-selector__name">
              <span className="ssh-key-selector__caption">
                {isEn ? 'Selected SSH key:' : 'Clé SSH sélectionnée :'}
              </span>{' '}
              <strong>{selectedSshKey.name}</strong>
              {selectedSshKey.keyType && (
                <span className="ssh-key-selector__type">{selectedSshKey.keyType.toUpperCase()}</span>
              )}
            </span>
          ) : (
            <span className="ssh-key-selector__name">
              {isEn ? 'No SSH key selected' : 'Aucune clé SSH sélectionnée'}
            </span>
          )}
        </div>

        <div className="form-input-action">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setModalOpen(true)}
          >
            <Key size={14} />
            {selectedSshKey
              ? (isEn ? 'Change' : 'Changer')
              : (isEn ? 'Select key' : 'Sélectionner')}
          </button>
        </div>
      </div>

      <SshKeyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  )
})
