import { Fragment, useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { useApp } from '../../context/AppContext'

/**
 * The statements these blocks carry are DDL and GRANTs, so the vocabulary is
 * small and fixed. A full parser would buy nothing here — what the reader needs
 * is to tell the verbs from the identifiers at a glance.
 */
const SQL_KEYWORDS = new Set([
  'ALTER', 'AND', 'AS', 'BY', 'CREATE', 'DEFAULT', 'DELETE', 'DROP', 'ENABLE',
  'EXISTS', 'FOR', 'FROM', 'FUNCTIONS', 'GRANT', 'IF', 'IN', 'INSERT', 'LEVEL',
  'NOT', 'ON', 'OR', 'POLICY', 'PRIVILEGES', 'PUBLICATION', 'REFERENCES',
  'REPLACE', 'REVOKE', 'ROW', 'SCHEMA', 'SECURITY', 'SELECT', 'SEQUENCES',
  'SET', 'TABLE', 'TABLES', 'TO', 'TRIGGER', 'TRUNCATE', 'UPDATE', 'USAGE',
  'USING', 'VALUES', 'WHERE', 'WITH',
])

/**
 * Splits on the three things worth telling apart — comments, quoted strings
 * and keywords — and leaves everything else as plain code text.
 */
function highlight(sql: string): ReactNode[] {
  // One regex, one pass: a `--` comment to end of line, a single-quoted
  // string (doubled quotes escape), or a bare word.
  const pattern = /(--[^\n]*)|('(?:[^']|'')*')|([A-Za-z_][A-Za-z0-9_]*)/g
  const out: ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  let i = 0

  while ((match = pattern.exec(sql)) !== null) {
    if (match.index > last) out.push(sql.slice(last, match.index))
    const [text, comment, str, word] = match

    if (comment) {
      out.push(<span key={i++} className="tok-comment">{text}</span>)
    } else if (str) {
      out.push(<span key={i++} className="tok-value">{text}</span>)
    } else if (word && SQL_KEYWORDS.has(word.toUpperCase())) {
      out.push(<span key={i++} className="tok-name">{text}</span>)
    } else {
      out.push(text)
    }
    last = match.index + text.length
  }
  if (last < sql.length) out.push(sql.slice(last))

  return out.map((node, k) => <Fragment key={k}>{node}</Fragment>)
}

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
      <div className="sql-block-content">{highlight(sql)}</div>
    </div>
  )
}
