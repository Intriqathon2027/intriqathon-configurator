import { useState, type CSSProperties, type ReactNode } from 'react'
import { Eye, EyeOff, HelpCircle, KeyRound, Wand2 } from 'lucide-react'
import { useHelpNav } from '../../context/HelpNavContext'
import { hasFieldHelp } from '../../i18n/fieldHelp'

interface FormFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
  rightElement?: ReactNode
  multiline?: boolean
  /** Help section to jump to. Defaults to `id`; the button only shows if a section exists. */
  helpId?: string
  /**
   * Inline prompt shown as long as the value still contains a literal
   * placeholder. Supabase hands out its Postgres URLs with `[YOUR-PASSWORD]`
   * left inside, and pasting one as-is is the single most common way to end up
   * with a deployment that cannot reach the database.
   */
  tokenFill?: {
    /** The literal to look for, e.g. `[YOUR-PASSWORD]`. */
    token: string
    /** What the reader is being asked for. */
    label: string
    inputPlaceholder?: string
    btnLabel: string
  }
}

// `-webkit-text-security` masks a textarea the way type="password" masks an input
const maskedTextareaStyle = { WebkitTextSecurity: 'disc', fontFamily: 'monospace' } as CSSProperties

export function FormField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  rightElement,
  multiline = false,
  helpId,
  tokenFill,
}: FormFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [fillValue, setFillValue] = useState('')
  const { openHelp } = useHelpNav()

  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type
  const helpTarget = helpId ?? id
  const showHelp = hasFieldHelp(helpTarget)

  const needsFill = !!tokenFill && value.includes(tokenFill.token)

  const applyFill = () => {
    if (!tokenFill || !fillValue) return
    // Substituted verbatim — the password has to land in the field exactly as
    // it was typed, character for character.
    onChange(value.split(tokenFill.token).join(fillValue))
    setFillValue('')
  }

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>

      <div className="form-input-row">
        <div className="form-input-wrap">
          {multiline ? (
            <textarea
              id={id}
              className="form-input form-textarea"
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              spellCheck={false}
              rows={3}
              style={isPassword && !showPassword ? maskedTextareaStyle : undefined}
            />
          ) : (
            <input
              id={id}
              type={inputType}
              className="form-input"
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              spellCheck={false}
              style={isPassword ? { paddingRight: '32px' } : {}}
            />
          )}

          {isPassword && (
            <button
              type="button"
              className="form-input-eye"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Cacher le secret' : 'Afficher le secret'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}
        </div>

        {rightElement && <div className="form-input-action">{rightElement}</div>}

        {showHelp && (
          <button
            type="button"
            className="form-help-btn"
            onClick={() => openHelp(helpTarget)}
            title="Aide"
            aria-label="Aide"
          >
            <HelpCircle size={15} />
          </button>
        )}
      </div>

      {needsFill && tokenFill && (
        <div className="token-fill">
          <div className="token-fill__label">
            <KeyRound size={13} />
            <span>{tokenFill.label}</span>
          </div>
          <div className="token-fill__row">
            <input
              type="password"
              className="form-input"
              value={fillValue}
              onChange={e => setFillValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyFill() } }}
              placeholder={tokenFill.inputPlaceholder}
              autoComplete="off"
              spellCheck={false}
              disabled={disabled}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={applyFill}
              disabled={disabled || !fillValue}
            >
              <Wand2 size={14} />
              {tokenFill.btnLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
