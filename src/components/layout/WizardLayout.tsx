import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useApp } from '../../context/AppContext'
import { HelpNavContext, type HelpFocus } from '../../context/HelpNavContext'
import { TopRightIsland } from './TopRightIsland'
import { StepContent } from './StepContent'
import { BottomNavigation } from './BottomNavigation'
import { HelpPanel } from './HelpPanel'
import { SettingsModal } from './SettingsModal'
import { steps } from './steps'

interface WizardLayoutProps {
  title: string
  stepBadge?: string
  description: string
  helpContent?: ReactNode
  children: ReactNode
}

import { Sidebar } from './Sidebar'

export function WizardLayout({
  title,
  description,
  helpContent,
  children,
}: WizardLayoutProps) {
  const { state } = useApp()
  const [helpOpen, setHelpOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpFocus, setHelpFocus] = useState<HelpFocus | null>(null)
  const { currentStep } = state

  // A field's "?" button opens the panel and asks it to reveal that section
  const openHelp = useCallback((fieldId?: string) => {
    setHelpOpen(true)
    if (fieldId) setHelpFocus(prev => ({ id: fieldId, nonce: (prev?.nonce ?? 0) + 1 }))
  }, [])

  const helpNav = useMemo(() => ({ openHelp }), [openHelp])

  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar setSettingsOpen={setSettingsOpen} helpOpen={helpOpen} />

      {/* Main */}
      <div className="main-content">
        <div className="main-drag-area" />

        <TopRightIsland helpContent={helpContent} helpOpen={helpOpen} setHelpOpen={setHelpOpen} />

        <StepContent currentStep={currentStep} title={title} description={description}>
          <HelpNavContext.Provider value={helpNav}>
            {children}
          </HelpNavContext.Provider>
        </StepContent>

        <BottomNavigation 
          currentStep={currentStep} 
          totalSteps={steps.length} 
          isFirst={isFirst} 
          isLast={isLast} 
        />
      </div>

      <HelpPanel
        helpOpen={helpOpen}
        setHelpOpen={setHelpOpen}
        title={title}
        helpContent={helpContent}
        focus={helpFocus}
      />

      <SettingsModal 
        settingsOpen={settingsOpen} 
        setSettingsOpen={setSettingsOpen} 
      />
    </div>
  )
}
