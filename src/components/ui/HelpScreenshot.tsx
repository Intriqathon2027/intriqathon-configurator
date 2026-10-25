import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export interface HelpShot {
  src: string
  alt: string
  /** What to look at in the capture — usually refers to its numbered markers. */
  caption?: ReactNode
}

/**
 * A capture of the provider's interface, shown inside a help card so a reader
 * who has never seen that page knows what they are looking for.
 *
 * The panel is narrow, so the image is a thumbnail: clicking it opens the full
 * capture over the whole window (Escape or a click outside closes it).
 */
export function HelpScreenshot({ src, alt, caption }: HelpShot) {
  const { t } = useApp()
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    if (!zoomed) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoomed(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed])

  return (
    <figure className="help-shot">
      <button
        type="button"
        className="help-shot__thumb"
        onClick={() => setZoomed(true)}
        title={t('help.shot.enlarge')}
      >
        <img src={src} alt={alt} loading="lazy" />
        <span className="help-shot__zoom" aria-hidden="true">
          <Maximize2 size={12} />
        </span>
      </button>
      {caption && <figcaption className="help-shot__caption">{caption}</figcaption>}

      {zoomed && createPortal(
        <div
          className="modal-overlay help-shot__overlay"
          onClick={e => e.target === e.currentTarget && setZoomed(false)}
        >
          <figure className="help-shot__full">
            <button
              type="button"
              className="help-shot__close"
              onClick={() => setZoomed(false)}
              title={t('help.shot.close')}
            >
              <X size={16} />
            </button>
            <img src={src} alt={alt} />
            {caption && <figcaption className="help-shot__caption">{caption}</figcaption>}
          </figure>
        </div>,
        document.body,
      )}
    </figure>
  )
}

/** Several captures in a row of the walkthrough, stacked. */
export function HelpScreenshots({ shots }: { shots: HelpShot[] }) {
  return (
    <div className="help-shots">
      {shots.map(shot => <HelpScreenshot key={shot.src} {...shot} />)}
    </div>
  )
}

/**
 * The numbered marker drawn on the captures, repeated inline in the text so
 * "click ③" points at the same badge the reader sees in the image.
 */
export function ShotMarker({ n }: { n: number }) {
  return <span className="help-shot-marker" aria-label={`(${n})`}>{n}</span>
}
