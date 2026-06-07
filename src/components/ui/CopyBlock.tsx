import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useApp } from '../../context/AppContext'

interface CopyBlockProps {
  label?: string
  content: string
  multiLine?: boolean
}

export function CopyBlock({ label, content, multiLine = false }: CopyBlockProps) {
  const { t } = useApp()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`copy-block ${multiLine ? 'copy-block-multi' : ''}`}>
      <div className="copy-block-header">
        {label && <span className="copy-block-label">{label}</span>}
        <button
          className={`btn btn-copy ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
        >
          {copied
            ? <><Check size={12} />{t('btn.copied')}</>
            : <><Copy size={12} />{t('btn.copy')}</>
          }
        </button>
      </div>
      <div className="copy-block-content">{content}</div>
    </div>
  )
}

interface CopyRowProps {
  label: string
  content: string
}

export function CopyRow({ label, content }: CopyRowProps) {
  const { t } = useApp()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ marginBottom: '8px' }}>
      <div className="form-hint" style={{ marginBottom: '4px' }}>{label}</div>
      <div className="copy-block-row">
        <span className="copy-block-row-text">{content}</span>
        <button
          className={`btn btn-copy ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          style={{ flexShrink: 0 }}
        >
          {copied
            ? <><Check size={11} />{t('btn.copied')}</>
            : <><Copy size={11} />{t('btn.copy')}</>
          }
        </button>
      </div>
    </div>
  )
}

interface CommandBlockProps {
  label?: string
  command: string
}

export function CommandBlock({ label, command }: CommandBlockProps) {
  const { t } = useApp()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="command-group">
      {label && <div className="command-label">{label}</div>}
      <div className="command-block">
        <span className="command-prompt">$</span>
        <span className="command-text">{command}</span>
        <button
          className={`btn btn-copy ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          style={{ flexShrink: 0 }}
        >
          {copied
            ? <><Check size={11} />{t('btn.copied')}</>
            : <><Copy size={11} />{t('btn.copy')}</>
          }
        </button>
      </div>
    </div>
  )
}
