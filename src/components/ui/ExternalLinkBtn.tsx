import { ExternalLink } from 'lucide-react'
import { useApp } from '../../context/AppContext'

interface ExternalLinkBtnProps {
  url: string
  label: string
  variant?: 'external' | 'primary' | 'secondary'
  /** Replaces the direct open — for links that must go through a confirmation first. */
  onClick?: () => void
}

export function ExternalLinkBtn({ url, label, variant = 'external', onClick }: ExternalLinkBtnProps) {
  const { openUrl } = useApp()

  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick ?? (() => openUrl(url))}
    >
      <ExternalLink size={14} />
      {label}
    </button>
  )
}
