import { useState, type ReactNode } from 'react'
import {
  Server, Database, Shield, Mail, Bot,
  FileDown, Settings, Globe, Check, Zap
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { TopRightIsland } from './TopRightIsland'
import { StepContent } from './StepContent'
import { BottomNavigation } from './BottomNavigation'
import { HelpModal } from './HelpModal'
import { SettingsModal } from './SettingsModal'

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
  stepBadge?: string
  description: string
  helpContent?: ReactNode
  children: ReactNode
}

export function WizardLayout({
  title,
  description,
  helpContent,
  children,
}: WizardLayoutProps) {
  const { state, t, goToStep, goHome } = useApp()
  const [helpOpen, setHelpOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { currentStep } = state

  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div
          className="sidebar-logo"
          style={{ 
            marginTop: typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0 && typeof window !== 'undefined' && !!window.electronAPI ? '16px' : '0',
            cursor: 'pointer'
          }}
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
      </aside>

      {/* Main */}
      <div className="main-content">
        <div className="main-drag-area" />

        <TopRightIsland helpContent={helpContent} setHelpOpen={setHelpOpen} />

        <StepContent currentStep={currentStep} title={title} description={description}>
          {children}
        </StepContent>

        <BottomNavigation 
          currentStep={currentStep} 
          totalSteps={steps.length} 
          isFirst={isFirst} 
          isLast={isLast} 
        />
      </div>

      <HelpModal 
        helpOpen={helpOpen} 
        setHelpOpen={setHelpOpen} 
        title={title} 
        helpContent={helpContent} 
      />

      <SettingsModal 
        settingsOpen={settingsOpen} 
        setSettingsOpen={setSettingsOpen} 
      />
    </div>
  )
}
