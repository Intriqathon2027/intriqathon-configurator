import { useState, useCallback, useEffect, type ReactNode } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'

interface HelpPanelProps {
  helpOpen: boolean
  setHelpOpen: (open: boolean) => void
  title: string
  helpContent?: ReactNode
}

export function HelpPanel({ helpOpen, setHelpOpen, title, helpContent }: HelpPanelProps) {
  const { t } = useApp()

  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('helpPanelWidth')
    return saved ? parseInt(saved, 10) : 340
  })
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    localStorage.setItem('helpPanelWidth', width.toString())
  }, [width])

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = Math.max(250, Math.min(document.documentElement.clientWidth - e.clientX, 600))
      setWidth(newWidth)
    }
  }, [isResizing])

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize'
      window.addEventListener('mousemove', resize)
      window.addEventListener('mouseup', stopResizing)
    } else {
      document.body.style.cursor = 'default'
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
    return () => {
      document.body.style.cursor = 'default'
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
  }, [isResizing, resize, stopResizing])

  if (!helpContent) return null

  return (
    <aside 
      className={`help-panel ${helpOpen ? 'help-panel--open' : ''}`}
      style={{ 
        width: helpOpen ? width : 0, 
        opacity: helpOpen ? 1 : 0,
        borderLeftWidth: helpOpen ? 1 : 0,
        transition: isResizing ? 'none' : 'width 0.3s ease, opacity 0.3s ease, border-width 0.3s ease'
      }}
    >
      <div className="help-panel-resizer" onMouseDown={startResizing} />
      <div className="help-panel-content-wrapper" style={{ width: width, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="help-panel-header">
          <div className="help-panel-title">
            <HelpCircle size={16} color="var(--color-primary)" />
            {t('help.title')} — {title}
          </div>
          <button className="btn btn-icon btn-ghost" onClick={() => setHelpOpen(false)} title="Fermer">
            <X size={16} />
          </button>
        </div>
        <div className="help-panel-body">
          {helpContent}
        </div>
      </div>
    </aside>
  )
}
