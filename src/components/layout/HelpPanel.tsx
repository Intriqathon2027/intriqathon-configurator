import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { HelpFocus } from '../../context/HelpNavContext'

interface HelpPanelProps {
  helpOpen: boolean
  setHelpOpen: (open: boolean) => void
  title: string
  helpContent?: ReactNode
  /** Set by a field's "?" button: section to scroll to and flash. */
  focus?: HelpFocus | null
}

const FLASH_MS = 2600
const SCROLL_MS = 420

/**
 * Action names are chips that never break across lines, so the panel cannot go
 * narrower than the longest of them without clipping one.
 */
const MIN_WIDTH = 320

/** The panel stretches to at most half the window. */
function maxWidth(): number {
  return Math.max(MIN_WIDTH, Math.floor(document.documentElement.clientWidth / 2))
}

/**
 * Animates a container's scroll position.
 * Native `behavior: 'smooth'` is unreliable inside this nested, transitioned
 * panel (it silently no-ops), so the tween is driven manually.
 */
function smoothScrollTo(container: HTMLElement, to: number): () => void {
  const from = container.scrollTop
  const distance = to - from
  if (Math.abs(distance) < 1) {
    container.scrollTop = to
    return () => {}
  }

  // rAF is suspended while the window is hidden — jump straight there instead
  if (typeof document !== 'undefined' && document.hidden) {
    container.scrollTop = to
    return () => {}
  }

  let frame = 0
  const start = performance.now()

  const step = (now: number) => {
    const progress = Math.min((now - start) / SCROLL_MS, 1)
    const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
    container.scrollTop = from + distance * eased
    if (progress < 1) frame = requestAnimationFrame(step)
  }

  frame = requestAnimationFrame(step)
  return () => cancelAnimationFrame(frame)
}

export function HelpPanel({ helpOpen, setHelpOpen, title, helpContent, focus }: HelpPanelProps) {
  const { t } = useApp()
  const flashedRef = useRef<HTMLElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const cancelScrollRef = useRef<() => void>(() => {})

  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('helpPanelWidth')
    // A stored width can fall outside the bounds — the minimum has changed, or
    // the window is now smaller than it was
    return Math.min(Math.max(parseInt(saved ?? '', 10) || 340, MIN_WIDTH), maxWidth())
  })
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    localStorage.setItem('helpPanelWidth', width.toString())
  }, [width])

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = Math.max(MIN_WIDTH, Math.min(document.documentElement.clientWidth - e.clientX, maxWidth()))
      setWidth(newWidth)
    }
  }, [isResizing])

  // Half the window moves with the window: pull the panel back in when it shrinks
  useEffect(() => {
    const onResize = () => setWidth(w => Math.min(w, maxWidth()))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize'
      window.addEventListener('mousemove', resize)
      window.addEventListener('mouseup', stopResizing)
    } else {
      document.body.style.cursor = 'default'
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
    return () => {
      document.body.style.cursor = 'default'
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
  }, [isResizing, resize, stopResizing])

  // Reveal the section a "?" button pointed at, once the panel has expanded
  useEffect(() => {
    if (!focus) return

    const scrollTimer = window.setTimeout(() => {
      const target = document.getElementById(`help-${focus.id}`)
      const container = bodyRef.current
      if (!target || !container) return

      const containerRect = container.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const centered = container.scrollTop
        + (targetRect.top - containerRect.top)
        - (container.clientHeight - targetRect.height) / 2
      const maxScroll = container.scrollHeight - container.clientHeight
      cancelScrollRef.current = smoothScrollTo(
        container,
        Math.max(0, Math.min(centered, maxScroll)),
      )

      // Restart the animation even when the same section is requested twice
      flashedRef.current?.classList.remove('help-section--flash')
      target.classList.remove('help-section--flash')
      void target.offsetWidth
      target.classList.add('help-section--flash')
      flashedRef.current = target
    }, 320) // let the panel finish its width transition

    const clearTimer = window.setTimeout(() => {
      flashedRef.current?.classList.remove('help-section--flash')
      flashedRef.current = null
    }, 320 + FLASH_MS)

    return () => {
      window.clearTimeout(scrollTimer)
      window.clearTimeout(clearTimer)
      cancelScrollRef.current()
    }
  }, [focus])

  if (!helpContent) return null

  return (
    <aside 
      className={`help-panel ${helpOpen ? 'help-panel--open' : ''}`}
      style={{ 
        width: helpOpen ? width : 0, 
        opacity: helpOpen ? 1 : 0,
        borderLeftWidth: helpOpen ? 1 : 0,
        transition: isResizing ? 'none' : 'width 0.3s ease, opacity 0.3s ease, border-width 0.3s ease'
      }}
    >
      <div className="help-panel-resizer" onMouseDown={startResizing} />
      <div className="help-panel-content-wrapper" style={{ width: width, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="help-panel-header">
          <div className="help-panel-title">
            <HelpCircle size={16} color="var(--color-primary-text)" />
            {t('help.title')} — {title}
          </div>
          <button className="btn btn-icon btn-ghost" onClick={() => setHelpOpen(false)} title="Fermer">
            <X size={16} />
          </button>
        </div>
        <div className="help-panel-body" ref={bodyRef}>
          {helpContent}
        </div>
      </div>
    </aside>
  )
}
