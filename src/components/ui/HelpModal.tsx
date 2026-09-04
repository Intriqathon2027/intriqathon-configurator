import { type ReactNode } from 'react'
import { X, BookOpen } from 'lucide-react'
import { useApp } from '../../context/AppContext'

interface HelpModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export function HelpModal({ title, onClose, children }: HelpModalProps) {
  const { t } = useApp()

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            <BookOpen size={18} color="var(--color-primary-text)" />
            {t('help.title')} — {title}
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}
