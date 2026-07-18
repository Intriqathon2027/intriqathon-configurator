import { type ReactNode } from 'react'
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
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
        {envKey && <span className="form-label-badge">{envKey}</span>}
      </label>
      {rightElement ? (
        <div className="folder-input-row">
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
            />
          ) : (
            <input
              id={id}
              type={type}
              className="form-input"
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              spellCheck={false}
            />
          )}
          {rightElement}
        </div>
      ) : multiline ? (
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
        />
      ) : (
        <input
          id={id}
          type={type}
          className="form-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
        />
      )}
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  )
}
