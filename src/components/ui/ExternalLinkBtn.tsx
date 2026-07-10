import { ExternalLink } from 'lucide-react'
import { useApp } from '../../context/AppContext'

interface ExternalLinkBtnProps {
  url: string
  label: string
  variant?: 'external' | 'primary' | 'secondary'
}

export function ExternalLinkBtn({ url, label, variant = 'external' }: ExternalLinkBtnProps) {
  const { openUrl } = useApp()

  return (
    <button
      className={`btn btn-${variant}`}
      onClick={() => openUrl(url)}
    >
      <ExternalLink size={14} />
      {label}
    </button>
  )
}
