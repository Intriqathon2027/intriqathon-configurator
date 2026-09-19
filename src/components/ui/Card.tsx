import { type CSSProperties, type ReactNode } from 'react'

interface CardProps {
  icon?: ReactNode
  title?: ReactNode
  children: ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * The plain white panel every step's supporting content sits in. `icon` and
 * `title` are optional so a card can hold content with no header of its own.
 */
export function Card({ icon, title, children, className = '', style }: CardProps) {
  return (
    <div className={`card ${className}`.trim()} style={style}>
      {(icon || title) && (
        <div className="card-title">
          {icon}
          {title}
        </div>
      )}
      {children}
    </div>
  )
}
