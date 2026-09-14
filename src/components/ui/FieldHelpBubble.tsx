import { Fragment, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getFieldHelp } from '../../i18n/fieldHelp'

/** Kept clear of the window edges, and of the button the bubble points at. */
const VIEWPORT_MARGIN = 12
const ANCHOR_GAP = 8
/** Half the arrow's width — how far its tip stays from a rounded corner. */
const ARROW_INSET = 16

interface Placement {
  top: number
  left: number
  /** Arrow offset from the bubble's left edge, so the tip meets the button. */
  arrowLeft: number
  /** True when the bubble had to go above the button for lack of room below. */
  above: boolean
}

/** Renders a `>`-separated navigation path as a chain of chips. */
function PathSchema({ path }: { path: string }) {
  const parts = path.split('>').map(p => p.trim()).filter(Boolean)

  return (
    <p className="field-bubble__path">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <span aria-hidden="true">➔</span>}
          <code>{part}</code>
        </Fragment>
      ))}
    </p>
  )
}

interface FieldHelpBubbleProps {
  /** Field id, as registered in `fieldHelpByStep`. */
  fieldId: string
  /** The "?" button the bubble hangs off — read on mount, never during render. */
  anchorRef: RefObject<HTMLElement | null>
  onClose: () => void
}

/**
 * What a field is and where its value comes from, shown next to the field
 * itself rather than in the help panel.
 *
 * The panel is for the walkthroughs a "Learn more" button opens — how to
 * create the account, the project, the app. A single field's description had
 * no business sending the reader across the window and back, so it is answered
 * in place, over whatever the input row sits in: the bubble is portalled and
 * positioned in viewport coordinates, which keeps it out of the scroll
 * containers and cards that would otherwise clip it.
 */
export function FieldHelpBubble({ fieldId, anchorRef, onClose }: FieldHelpBubbleProps) {
  const { t } = useApp()
  const bubbleRef = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)

  const entry = getFieldHelp(fieldId)

  // Position against the button, and follow it while the page scrolls
  useLayoutEffect(() => {
    const place = () => {
      const bubble = bubbleRef.current
      const anchor = anchorRef.current
      if (!bubble || !anchor) return

      const rect = anchor.getBoundingClientRect()
      const vw = document.documentElement.clientWidth
      const vh = document.documentElement.clientHeight
      const { offsetWidth: width, offsetHeight: height } = bubble

      // Right-aligned on the button: the "?" sits at the end of the input row,
      // so a bubble growing leftwards stays over the field it describes.
      const left = Math.max(
        VIEWPORT_MARGIN,
        Math.min(rect.right - width, vw - width - VIEWPORT_MARGIN),
      )

      const below = rect.bottom + ANCHOR_GAP
      const fitsBelow = below + height <= vh - VIEWPORT_MARGIN
      const top = fitsBelow
        ? below
        : Math.max(VIEWPORT_MARGIN, rect.top - ANCHOR_GAP - height)

      const arrowLeft = Math.max(
        ARROW_INSET,
        Math.min(rect.left + rect.width / 2 - left, width - ARROW_INSET),
      )

      setPlacement({ top, left, arrowLeft, above: !fitsBelow })
    }

    place()
    // Capture phase: the scroll happens on the step's own container, not window
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [anchorRef, fieldId])

  // Dismissal. The anchor is left out on purpose: its own click toggles the
  // bubble, and closing here first would reopen it on the same press.
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (bubbleRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [anchorRef, onClose])

  if (!entry) return null

  return createPortal(
    <div
      ref={bubbleRef}
      className={`field-bubble${placement?.above ? ' field-bubble--above' : ''}`}
      role="dialog"
      style={{
        top: placement?.top ?? 0,
        left: placement?.left ?? 0,
        // Measured before it is shown: a bubble painted at 0,0 first would
        // flash in the corner on every open.
        visibility: placement ? 'visible' : 'hidden',
      }}
    >
      <span
        className="field-bubble__arrow"
        style={{ left: placement?.arrowLeft ?? 0 }}
        aria-hidden="true"
      />

      <div className="field-bubble__head">
        <span className="field-bubble__title">{t(entry.labelKey)}</span>
        {entry.envKey && <code className="field-bubble__env">{entry.envKey}</code>}
        <button
          type="button"
          className="field-bubble__close"
          onClick={onClose}
          aria-label={t('btn.close')}
        >
          <X size={13} />
        </button>
      </div>

      {entry.pathKey && <PathSchema path={t(entry.pathKey)} />}
      {entry.hintKey && <p className="field-bubble__hint">{t(entry.hintKey)}</p>}
    </div>,
    document.body
  )
}
