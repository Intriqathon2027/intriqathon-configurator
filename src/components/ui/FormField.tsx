import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Eye, EyeOff, HelpCircle, KeyRound, Wand2 } from 'lucide-react'
import { hasFieldHelp } from '../../i18n/fieldHelp'
import { FieldHelpBubble } from './FieldHelpBubble'

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
  /** Visible lines of a multiline field. Two is enough for a key or a URL. */
  rows?: number
  /** Entry the "?" bubble reads. Defaults to `id`; the button only shows if an entry exists. */
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
  rows = 2,
  helpId,
  tokenFill,
}: FormFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [fillValue, setFillValue] = useState('')
  const [helpShown, setHelpShown] = useState(false)
  const helpBtnRef = useRef<HTMLButtonElement>(null)

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
              rows={rows}
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
            ref={helpBtnRef}
            type="button"
            className={`form-help-btn${helpShown ? ' form-help-btn--active' : ''}`}
            onClick={() => setHelpShown(open => !open)}
            title="Aide"
            aria-label="Aide"
            aria-expanded={helpShown}
          >
            <HelpCircle size={15} />
          </button>
        )}

        {showHelp && helpShown && (
          <FieldHelpBubble
            fieldId={helpTarget}
            anchorRef={helpBtnRef}
            onClose={() => setHelpShown(false)}
          />
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
