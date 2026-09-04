import { type ReactNode } from 'react'

interface HelpServiceProps {
  /**
   * Anchor id — the section becomes `help-<id>`, which is what a "Learn more"
   * button passes to `openHelp()` to scroll here and flash the block.
   */
  id: string
  icon: ReactNode
  title: string
  children: ReactNode
}

/**
 * One service's walkthrough in the help panel: heading, action cards and field
 * sections, wrapped in an anchored block so a page button can jump straight to
 * it. Consecutive services are separated by a rule (see `.help-service` CSS).
 */
export function HelpService({ id, icon, title, children }: HelpServiceProps) {
  return (
    <section id={`help-${id}`} className="help-section help-service">
      <h3>{icon} {title}</h3>
      {children}
    </section>
  )
}
