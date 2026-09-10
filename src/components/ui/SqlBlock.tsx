import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export function SqlBlock({ sql }: { sql: string }) {
  const { t } = useApp()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="sql-block">
      <div className="sql-block-header">
        <span className="sql-lang-badge">SQL</span>
        <button className={`btn btn-copy ${copied ? 'copied' : ''}`} onClick={handleCopy}>
          {copied
            ? <><Check size={11} />{t('btn.copied')}</>
            : <><Copy size={11} />{t('btn.copy')}</>
          }
        </button>
      </div>
      <div className="sql-block-content">{sql}</div>
    </div>
  )
}
