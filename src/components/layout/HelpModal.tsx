import { type ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'

interface HelpModalProps {
  helpOpen: boolean
  setHelpOpen: (open: boolean) => void
  title: string
  helpContent?: ReactNode
}

export function HelpModal({ helpOpen, setHelpOpen, title, helpContent }: HelpModalProps) {
  const { t } = useApp()

  if (!helpOpen || !helpContent) return null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setHelpOpen(false)}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            <HelpCircle size={18} color="var(--color-primary-text)" />
            {t('help.title')} — {title}
          </div>
          <button className="modal-close" onClick={() => setHelpOpen(false)}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {helpContent}
        </div>
      </div>
    </div>
  )
}
