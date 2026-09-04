import { Fragment, type ReactNode } from 'react'
import { ArrowDown, ExternalLink } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { CopyChip } from './CopyBlock'

export interface HelpFlowStep {
  /** Stable list key. */
  key: string
  /** The action to perform — the card's headline. */
  title: string
  /** How to reach that action in the provider's UI. */
  desc: ReactNode
  /** Deep link straight to the action, when the provider exposes one. */
  url?: string
  /** Overrides the default "Open" link label. */
  linkLabel?: string
  /**
   * Literals the reader has to reproduce exactly — bucket names, callback URLs,
   * subdomains. Rendered as copy-to-clipboard chips.
   */
  copyValues?: { value: string; note?: ReactNode }[]
  /** Anything that belongs under the description (lists, warnings, blocks). */
  extra?: ReactNode
}

/**
 * A walkthrough rendered as a chain of action cards: the action's name on top,
 * how to reach it underneath, and — where the provider has a stable deep link —
 * a button that opens it directly.
 *
 * The help panel is narrow and user-resizable (250–600px), so the chain runs
 * top-to-bottom with a connector arrow between cards rather than left-to-right.
 */
export function HelpFlow({ steps }: { steps: HelpFlowStep[] }) {
  const { t, openUrl } = useApp()

  return (
    <ol className="help-flow">
      {steps.map((step, i) => (
        <Fragment key={step.key}>
          {i > 0 && (
            <li className="help-flow__connector" aria-hidden="true">
              <ArrowDown size={14} />
            </li>
          )}
          <li className="help-flow__card">
            <div className="help-flow__head">
              <span className="help-flow__index">{i + 1}</span>
              <span className="help-flow__title">{step.title}</span>
            </div>
            <p className="help-flow__desc">{step.desc}</p>
            {step.copyValues && (
              <ul className="help-flow__copy-list">
                {step.copyValues.map(item => (
                  <li key={item.value}>
                    <CopyChip value={item.value} />
                    {item.note && <span className="help-flow__copy-note">{item.note}</span>}
                  </li>
                ))}
              </ul>
            )}
            {step.extra}
            {step.url && (
              <button
                type="button"
                className="help-flow__link"
                onClick={() => openUrl(step.url!)}
              >
                <ExternalLink size={13} />
                {step.linkLabel ?? t('help.flow.open')}
              </button>
            )}
          </li>
        </Fragment>
      ))}
    </ol>
  )
}
