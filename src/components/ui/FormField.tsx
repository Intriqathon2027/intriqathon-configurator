import { useState, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { Config } from '../../context/AppContext'

interface FormFieldProps {
  id: string
  label: string
  envKey?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  type?: string
  disabled?: boolean
  configKey?: keyof Config
  rightElement?: ReactNode
  multiline?: boolean
}

export function FormField({
  id,
  label,
  envKey,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
  disabled = false,
  rightElement,
  multiline = false,
}: FormFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  const renderPasswordToggle = () => {
    if (!isPassword) return null
    return (
      <button
        type="button"
        className="btn btn-icon btn-ghost"
        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', padding: '4px', height: 'auto' }}
        onClick={() => setShowPassword(!showPassword)}
        title={showPassword ? "Cacher le secret" : "Afficher le secret"}
      >
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    )
  }

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
        {envKey && <span className="form-label-badge">{envKey}</span>}
      </label>
      {rightElement ? (
        <div className="folder-input-row">
          {multiline ? (
            <div style={{ position: 'relative', flex: 1 }}>
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
                style={isPassword && !showPassword ? { WebkitTextSecurity: 'disc', fontFamily: 'monospace' } : {}}
              />
              {renderPasswordToggle()}
            </div>
          ) : (
            <div style={{ position: 'relative', flex: 1 }}>
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
                style={isPassword ? { paddingRight: '36px' } : {}}
              />
              {renderPasswordToggle()}
            </div>
          )}
          {rightElement}
        </div>
      ) : multiline ? (
        <div style={{ position: 'relative' }}>
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
            style={isPassword && !showPassword ? { WebkitTextSecurity: 'disc', fontFamily: 'monospace' } : {}}
          />
          {renderPasswordToggle()}
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
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
            style={isPassword ? { paddingRight: '36px' } : {}}
          />
          {renderPasswordToggle()}
        </div>
      )}
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  )
}
