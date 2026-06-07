import { useState, type ReactNode } from 'react'
import {
  Server, Database, Shield, Mail, Bot,
  FileDown, Settings, Globe, Check,
  ChevronLeft, ChevronRight, HelpCircle, Zap
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

interface Step {
  labelKey: string
  icon: ReactNode
}

const steps: Step[] = [
  { labelKey: 'step1.label', icon: <Server size={13} /> },
  { labelKey: 'step2.label', icon: <Database size={13} /> },
  { labelKey: 'step3.label', icon: <Shield size={13} /> },
  { labelKey: 'step4.label', icon: <Mail size={13} /> },
  { labelKey: 'step5.label', icon: <Bot size={13} /> },
  { labelKey: 'step6.label', icon: <FileDown size={13} /> },
  { labelKey: 'step7.label', icon: <Settings size={13} /> },
  { labelKey: 'step8.label', icon: <Globe size={13} /> },
]

interface WizardLayoutProps {
  title: string
  stepBadge: string
  description: string
  helpContent?: ReactNode
  children: ReactNode
}

export function WizardLayout({
  title,
  stepBadge,
  description,
  helpContent,
  children,
}: WizardLayoutProps) {
  const { state, dispatch, t, saveAndNext, goToStep } = useApp()
  const [helpOpen, setHelpOpen] = useState(false)
  const { currentStep, language } = state

  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={18} />
          </div>
          <div>
            <div className="sidebar-logo-text">{t('app.title')}</div>
            <div className="sidebar-logo-sub">{t('app.subtitle')}</div>
          </div>
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
                  <div className="step-label-number">{t('nav.step')} {index + 1}</div>
                  <div className="step-label-title">{t(step.labelKey)}</div>
                </div>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            {helpContent && (
              <button
                className="btn btn-icon"
                onClick={() => setHelpOpen(true)}
                title={t('help.title')}
                id="btn-help"
              >
                <HelpCircle size={16} />
              </button>
            )}
            <span className="top-bar-title">{title}</span>
          </div>
          <div className="top-bar-right">
            {/* Language Toggle */}
            <div className="lang-toggle">
              <button
                className={`lang-btn ${language === 'fr' ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'SET_LANGUAGE', lang: 'fr' })}
                id="btn-lang-fr"
              >
                {t('lang.fr')}
              </button>
              <button
                className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'SET_LANGUAGE', lang: 'en' })}
                id="btn-lang-en"
              >
                {t('lang.en')}
              </button>
            </div>
          </div>
        </header>

        {/* Step Content */}
        <main className="step-content" key={currentStep}>
          <div className="step-header">
            <div className="step-badge">{stepBadge}</div>
            <h1 className="step-title">{title}</h1>
            <p className="step-description">{description}</p>
          </div>
          {children}
        </main>

        {/* Bottom Navigation */}
        <footer className="bottom-nav">
          <div className="bottom-nav-left">
            <button
              className="btn btn-secondary"
              onClick={() => goToStep(currentStep - 1)}
              disabled={isFirst}
              id="btn-previous"
            >
              <ChevronLeft size={16} />
              {t('nav.previous')}
            </button>
            <span className="progress-indicator">
              {t('nav.step')} {currentStep + 1} {t('nav.of')} {steps.length}
            </span>
          </div>
          <div className="bottom-nav-right">
            {!isLast && (
              <button
                className="btn btn-primary"
                onClick={saveAndNext}
                id="btn-save-next"
              >
                {t('nav.saveAndNext')}
                <ChevronRight size={16} />
              </button>
            )}
            {isLast && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontSize: '14px', fontWeight: 600 }}>
                <Check size={18} />
                Configuration complète !
              </div>
            )}
          </div>
        </footer>
      </div>

      {/* Help Modal */}
      {helpOpen && helpContent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setHelpOpen(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">
                <HelpCircle size={18} color="var(--color-primary)" />
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
      )}
    </div>
  )
}
