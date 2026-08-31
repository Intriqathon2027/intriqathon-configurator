import { useState, useCallback, useEffect, useRef } from 'react'
import { Check, Settings, Zap, PanelLeftClose, PanelLeft } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { steps } from './steps'

interface SidebarProps {
  setSettingsOpen: (v: boolean) => void
  helpOpen?: boolean
}

export function Sidebar({ setSettingsOpen, helpOpen }: SidebarProps) {
  const { state, t, goToStep, goHome, isStepComplete } = useApp()
  const { currentStep } = state

  const isMac = typeof navigator !== 'undefined'
    && navigator.platform.toUpperCase().indexOf('MAC') >= 0
    && typeof window !== 'undefined' && !!window.electronAPI

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
        {isMac && <div className="sidebar-drag-strip" />}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', paddingTop: isMac ? '4px' : '14px' }}>
          <div className="sidebar-logo-icon" onClick={goHome} style={{ cursor: 'pointer' }}>
            <Zap size={18} />
          </div>
          <button className="btn btn-icon btn-ghost" onClick={() => setIsCollapsed(false)} title="Ouvrir le menu">
            <PanelLeft size={18} />
          </button>
        </div>

        <nav className="sidebar-steps" style={{ marginTop: '20px' }}>
          {steps.map((step, index) => {
            const isActive = index === currentStep
            const isDone = isStepComplete(index)
            const indicator = isActive ? 'active' : isDone ? 'completed' : 'pending'
            const StepIcon = step.Icon

            return (
              <button
                key={index}
                className={`sidebar-step sidebar-step--collapsed ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}`}
                onClick={() => goToStep(index)}
                title={t(step.labelKey)}
                style={{ justifyContent: 'center', padding: '8px 0' }}
              >
                <div className={`step-indicator ${indicator}`} style={{ margin: 0 }}>
                  <StepIcon size={17} />
                </div>
                {isDone && (
                  <span className="sidebar-step__check" aria-label="Configuration terminée">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom" style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center', paddingBottom: '16px' }}>
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

  return (
    <aside className="sidebar" style={{ width, transition: isResizing ? 'none' : 'width 0.3s ease', position: 'relative', willChange: 'width' }}>
      {isMac && <div className="sidebar-drag-strip" />}
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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
          const isActive = index === currentStep
          const isDone = isStepComplete(index)
          const indicator = isActive ? 'active' : isDone ? 'completed' : 'pending'
          const StepIcon = step.Icon

          return (
            <button
              key={index}
              className={`sidebar-step ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}`}
              onClick={() => goToStep(index)}
            >
              <div className={`step-indicator ${indicator}`}>
                <StepIcon size={17} />
              </div>
              <div className="step-label">
                <div className="step-label-title">{t(step.labelKey)}</div>
              </div>
              {isDone && (
                <span className="sidebar-step__check" aria-label="Configuration terminée">
                  <Check size={13} strokeWidth={3} />
                </span>
              )}
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
            <Settings size={17} />
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
