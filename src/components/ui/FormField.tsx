import { useState, type CSSProperties, type ReactNode } from 'react'
import { Eye, EyeOff, HelpCircle } from 'lucide-react'
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
}: FormFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const { openHelp } = useHelpNav()

  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type
  const helpTarget = helpId ?? id
  const showHelp = hasFieldHelp(helpTarget)

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
    </div>
  )
}
