import { useState } from 'react'
import { Check, Copy, Play } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export function DockerBlock({ command }: { command: string }) {
  const { t } = useApp()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="command-block">
      <Play size={14} style={{ color: 'var(--color-primary-text)', flexShrink: 0 }} />
      <span className="command-text">{command}</span>
      <button className={`btn btn-copy ${copied ? 'copied' : ''}`} onClick={handleCopy} style={{ flexShrink: 0 }}>
        {copied
          ? <><Check size={11} />{t('btn.copied')}</>
          : <><Copy size={11} />{t('btn.copy')}</>
        }
      </button>
    </div>
  )
}
