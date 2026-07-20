import { type ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { LanguageToggle } from './LanguageToggle'

interface TopRightIslandProps {
  helpContent?: ReactNode
  helpOpen?: boolean
  setHelpOpen: (open: boolean) => void
}

export function TopRightIsland({ helpContent, helpOpen, setHelpOpen }: TopRightIslandProps) {
  const { t, state, hasSavedConfig } = useApp()
  const shouldBlink = !hasSavedConfig && state.currentStep === 0

  return (
    <div className="top-right-island">
      {helpContent && (
        <button
          className={`btn btn-icon ${helpOpen ? 'btn-icon--active' : ''} ${shouldBlink && !helpOpen ? 'animate-pulse-help' : ''}`}
          onClick={() => setHelpOpen(!helpOpen)}
          title={t('help.title')}
          id="btn-help"
        >
          <HelpCircle size={16} />
        </button>
      )}
      <LanguageToggle />
    </div>
  )
}
