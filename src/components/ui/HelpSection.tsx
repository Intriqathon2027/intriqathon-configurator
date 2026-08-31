import { type ReactNode } from 'react'
import { useApp } from '../../context/AppContext'
import { fieldHelpByStep } from '../../i18n/fieldHelp'

interface HelpSectionProps {
  /** Field id — the anchor becomes `help-<id>`. */
  id: string
  title: string
  envKey?: string
  children?: ReactNode
}

export function HelpSection({ id, title, envKey, children }: HelpSectionProps) {
  return (
    <section id={`help-${id}`} className="help-section">
      <div className="help-section-title">
        <span>{title}</span>
        {envKey && <code className="help-env-key">{envKey}</code>}
      </div>
      {children}
    </section>
  )
}

/**
 * Renders a step's registered fields as anchored help sections, sitting right
 * under the walkthrough of the service they belong to.
 *
 * Pass `group` to render a single service's fields (the usual case, so the
 * service instructions and its field descriptions read as one block); omit it
 * to render every group with its own heading.
 */
export function FieldHelpSections({ step, group }: { step: number; group?: string }) {
  const { t } = useApp()
  const allGroups = fieldHelpByStep[step] ?? []
  const groups = group ? allGroups.filter(g => g.title === group) : allGroups
  if (groups.length === 0) return null

  return (
    <div className="help-fields">
      {groups.map(g => (
        <div className="help-fields-group" key={g.title}>
          {!group && <div className="help-fields-group-title">{g.title}</div>}
          {g.fields.map(field => (
            <HelpSection
              key={field.id}
              id={field.id}
              title={t(field.labelKey)}
              envKey={field.envKey}
            >
              {field.hintKey && <p>{t(field.hintKey)}</p>}
            </HelpSection>
          ))}
        </div>
      ))}
    </div>
  )
}
