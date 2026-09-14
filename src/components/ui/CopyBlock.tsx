import { Fragment, useState, type ReactNode } from 'react'
import { Check, Copy, Terminal } from 'lucide-react'
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
  /** Omit where the row already sits under a heading saying the same thing. */
  label?: string
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
    <div className="copy-row">
      {label && <div className="form-hint copy-row__label">{label}</div>}
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

/**
 * A shell line, split into the parts the reader scans for: the program being
 * run, its flags, and any quoted argument. Everything else stays plain.
 */
export function highlightShell(command: string): ReactNode[] {
  const parts = command.split(/(\s+)/)
  let seenProgram = false

  return parts.map((part, i) => {
    if (!part.trim()) return <Fragment key={i}>{part}</Fragment>

    if (!seenProgram) {
      seenProgram = true
      return <span key={i} className="tok-name">{part}</span>
    }
    if (part.startsWith('-')) {
      return <span key={i} className="tok-punct">{part}</span>
    }
    if (part.startsWith('"') || part.startsWith("'")) {
      return <span key={i} className="tok-value">{part}</span>
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

interface CommandBlockProps {
  /** Small eyebrow above the block — what the command is for. */
  label?: ReactNode
  command: string
}

/**
 * The single shell-command block. `DockerBlock` is this component under
 * another name; they used to be two near-identical copies differing only in
 * whether they drew a `$` or a terminal glyph.
 */
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
        <Terminal size={14} className="command-block__marker" />
        <span className="command-text">{highlightShell(command)}</span>
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

interface CopyChipProps {
  /** The exact value to copy — also what the chip displays. */
  value: string
  /** Optional smaller title attribute when the value is truncated. */
  title?: string
}

/**
 * An inline, copyable literal — a bucket name, a callback URL, a subdomain.
 * Used inside the help panel wherever a value has to be reproduced exactly.
 */
export function CopyChip({ value, title }: CopyChipProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      className={`copy-chip${copied ? ' copy-chip--copied' : ''}`}
      onClick={handleCopy}
      title={title ?? value}
    >
      <span className="copy-chip__value">{value}</span>
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  )
}
