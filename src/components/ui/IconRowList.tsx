import { type ReactNode } from 'react'

export interface IconRowItem {
  /** Stable list key. */
  key: string
  icon: ReactNode
  /** Small muted eyebrow above the text. Omit for a single-line row. */
  label?: string
  text: ReactNode
}

interface IconRowListProps {
  items: IconRowItem[]
  className?: string
}

/**
 * The bordered rows used for enumerations — instance specs, deployment steps.
 * A recessed row with a green icon chip, identical everywhere it appears.
 */
export function IconRowList({ items, className }: IconRowListProps) {
  return (
    <ul className={`icon-row-list${className ? ` ${className}` : ''}`}>
      {items.map(item => (
        <li className="icon-row" key={item.key}>
          <span className="icon-row__icon">{item.icon}</span>
          <div className="icon-row__body">
            {item.label && <div className="icon-row__label">{item.label}</div>}
            <div className="icon-row__text">{item.text}</div>
          </div>
        </li>
      ))}
    </ul>
  )
}
