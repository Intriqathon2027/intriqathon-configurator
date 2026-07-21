import { useState, type ReactNode } from 'react'
import {
  Server, Database, Shield,
  FileDown, Globe
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { TopRightIsland } from './TopRightIsland'
import { StepContent } from './StepContent'
import { BottomNavigation } from './BottomNavigation'
import { HelpPanel } from './HelpPanel'
import { SettingsModal } from './SettingsModal'

export interface Step {
  labelKey: string
  icon: ReactNode
}

export const steps: Step[] = [
  { labelKey: 'step1.label', icon: <Server size={13} /> },
  { labelKey: 'step2.label', icon: <Database size={13} /> },
  { labelKey: 'step3.label', icon: <Shield size={13} /> },
  { labelKey: 'step4.label', icon: <FileDown size={13} /> },
  { labelKey: 'step5.label', icon: <Globe size={13} /> },
]

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
  const { currentStep } = state

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
          {children}
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
      />

      <SettingsModal 
        settingsOpen={settingsOpen} 
        setSettingsOpen={setSettingsOpen} 
      />
    </div>
  )
}
