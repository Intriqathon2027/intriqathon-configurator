import { BookOpen } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useHelpNav } from '../../context/HelpNavContext'

interface HelpAnchorBtnProps {
  /** Id of the `HelpService` block to reveal — without the `help-` prefix. */
  anchor: string
  /** Overrides the default "Learn more" label. */
  label?: string
  className?: string
}

/**
 * Sends the reader to the matching walkthrough in the help panel instead of
 * straight out to the provider: the panel opens, scrolls to that service and
 * flashes it. Every provider link lives in there, next to its instructions.
 */
export function HelpAnchorBtn({ anchor, label, className }: HelpAnchorBtnProps) {
  const { t } = useApp()
  const { openHelp } = useHelpNav()

  return (
    <button
      type="button"
      className={`btn btn-secondary${className ? ` ${className}` : ''}`}
      onClick={() => openHelp(anchor)}
    >
      <BookOpen size={14} />
      {label ?? t('btn.learnMore')}
    </button>
  )
}
