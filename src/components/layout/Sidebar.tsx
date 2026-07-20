import { useState, useCallback, useEffect, useRef } from 'react'
import { Check, Settings, Zap, PanelLeftClose, PanelLeft } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { steps } from './WizardLayout'

interface SidebarProps {
  setSettingsOpen: (v: boolean) => void
  helpOpen?: boolean
}

export function Sidebar({ setSettingsOpen, helpOpen }: SidebarProps) {
  const { state, t, goToStep, goHome } = useApp()
  const { currentStep } = state

  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth')
    return saved ? parseInt(saved, 10) : 260
  })
  const [isResizing, setIsResizing] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebarWidth', width.toString())
  }, [width])

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString())
  }, [isCollapsed])

  const wasOpenRef = useRef(!isCollapsed)

  useEffect(() => {
    if (helpOpen) {
      wasOpenRef.current = !isCollapsed
      setIsCollapsed(true)
    } else if (helpOpen === false) {
      if (wasOpenRef.current) {
        setIsCollapsed(false)
      }
    }
  }, [helpOpen])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1100px)')
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setIsCollapsed(true)
      } else {
        setIsCollapsed(false)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    if (mediaQuery.matches) {
      setIsCollapsed(true)
    }

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = Math.max(200, Math.min(e.clientX, 600))
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

  if (isCollapsed) {
    return (
      <aside className="sidebar sidebar--collapsed" style={{ transition: 'width 0.3s ease' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', paddingTop: '24px' }}>
          <div className="sidebar-logo-icon" onClick={goHome} style={{ cursor: 'pointer' }}>
            <Zap size={18} />
          </div>
          <button className="btn btn-icon btn-ghost" onClick={() => setIsCollapsed(false)} title="Ouvrir le menu">
            <PanelLeft size={18} />
          </button>
        </div>

        <nav className="sidebar-steps" style={{ marginTop: '32px' }}>
          {steps.map((step, index) => {
            const status =
              index < currentStep ? 'completed' :
              index === currentStep ? 'active' : 'pending'

            return (
              <button
                key={index}
                className={`sidebar-step ${status}`}
                onClick={() => goToStep(index)}
                title={t(step.labelKey)}
                style={{ justifyContent: 'center', padding: '12px 0' }}
              >
                <div className={`step-indicator ${status}`} style={{ margin: 0 }}>
                  {status === 'completed'
                    ? <Check size={13} />
                    : <span>{index + 1}</span>
                  }
                </div>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom" style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center', paddingBottom: '24px' }}>
          <button
            className="btn btn-icon btn-ghost"
            onClick={() => setSettingsOpen(true)}
            title={t('settings.title')}
          >
            <Settings size={18} />
          </button>
        </div>
      </aside>
    )
  }

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0 && typeof window !== 'undefined' && !!window.electronAPI

  return (
    <aside className="sidebar" style={{ width, transition: isResizing ? 'none' : 'width 0.3s ease', position: 'relative', willChange: 'width' }}>
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: isMac ? '16px' : '0' }}>
        <div
          className="sidebar-logo"
          style={{ cursor: 'pointer' }}
          onClick={goHome}
        >
          <div className="sidebar-logo-icon">
            <Zap size={18} />
          </div>
          <div>
            <div className="sidebar-logo-text">{t('app.title')}</div>
            <div className="sidebar-logo-sub">{t('app.subtitle')}</div>
          </div>
        </div>
        <button className="btn btn-icon btn-ghost" onClick={() => setIsCollapsed(true)} title="Masquer le menu">
          <PanelLeftClose size={18} />
        </button>
      </div>

      <nav className="sidebar-steps">
        {steps.map((step, index) => {
          const status =
            index < currentStep ? 'completed' :
            index === currentStep ? 'active' : 'pending'

          return (
            <button
              key={index}
              className={`sidebar-step ${status}`}
              onClick={() => goToStep(index)}
            >
              <div className={`step-indicator ${status}`}>
                {status === 'completed'
                  ? <Check size={13} />
                  : <span>{index + 1}</span>
                }
              </div>
              <div className="step-label">
                <div className="step-label-title">{t(step.labelKey)}</div>
              </div>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-bottom" style={{ marginTop: 'auto' }}>
        <button
          className="sidebar-step"
          onClick={() => setSettingsOpen(true)}
          style={{ width: '100%' }}
          id="btn-settings"
        >
          <div className="step-indicator pending">
            <Settings size={13} />
          </div>
          <div className="step-label">
            <div className="step-label-title">{t('settings.title')}</div>
          </div>
        </button>
      </div>

      <div className="sidebar-resizer" onMouseDown={startResizing} />
    </aside>
  )
}
