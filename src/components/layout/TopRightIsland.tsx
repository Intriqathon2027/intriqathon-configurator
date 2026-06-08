import { type ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { LanguageToggle } from './LanguageToggle'

interface TopRightIslandProps {
  helpContent?: ReactNode
  setHelpOpen: (open: boolean) => void
}

export function TopRightIsland({ helpContent, setHelpOpen }: TopRightIslandProps) {
  const { t } = useApp()

  return (
    <div className="top-right-island">
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
      <LanguageToggle />
    </div>
  )
}
