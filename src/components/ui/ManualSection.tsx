import { type ReactNode } from 'react'

interface ManualSectionProps {
  title: string
  /** One line saying what this part of the fallback is for. */
  desc?: ReactNode
  children: ReactNode
}

/**
 * One part of a manual configuration: a heading, an optional line of context,
 * and whatever the reader has to act on.
 *
 * It exists to hold the rhythm. These panels used to set their own margins
 * inline — `marginTop: 20`, `margin: '0 0 12px'`, a `marginBottom` on a heading
 * already inside a flex gap — so every card spaced itself differently and some
 * gaps were applied twice. Spacing now comes from one place, and a section
 * added later inherits it instead of inventing its own.
 */
export function ManualSection({ title, desc, children }: ManualSectionProps) {
  return (
    <section className="manual-section">
      <h4 className="manual-section__title">{title}</h4>
      {desc && <p className="manual-section__desc">{desc}</p>}
      <div className="manual-section__body">{children}</div>
    </section>
  )
}
