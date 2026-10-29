import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Check, Save } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import toast from 'react-hot-toast'
import { useAutomationLocked } from '../../context/AutomationLockContext'

/** Pixels of travel in one direction before the bar reacts — a trackpad's
 *  jitter alone should not make it flicker. */
const SCROLL_THRESHOLD = 6

/** A step whose content fits has no scroll to bring the bar back with. */
function canScroll(el: Element): boolean {
  return el.scrollHeight > el.clientHeight
}

/**
 * Shown when the step is scrolled down, hidden when it is scrolled up — and
 * hidden when a step opens, so its top is read without the bar over it.
 *
 * The exception is a step with nothing to scroll: there, hidden would mean
 * gone for good, so the bar stays in view. Watched for as long as the step
 * is open, since a panel opened or closed can make it scroll or stop.
 *
 * Scroll is listened for on the document, in the capture phase: `scroll` does
 * not bubble, and the step's scroll container is remounted with every step,
 * so a listener bound to the element itself would be left on a node that is
 * gone.
 */
function useVisibleOnScrollDown(resetKey: number) {
  const [visible, setVisible] = useState(false)
  const [seenKey, setSeenKey] = useState(resetKey)

  // A new step opens at its top, with the bar out of the way.
  if (seenKey !== resetKey) {
    setSeenKey(resetKey)
    setVisible(false)
  }

  useEffect(() => {
    // Rendered just before the bar, so already the new step's by now.
    const step = document.querySelector('.step-content')
    if (!step) return

    // Fires once on observing, before the first paint: a short step never
    // shows the bar hiding and coming back.
    const check = () => {
      if (!canScroll(step)) setVisible(true)
    }
    const observer = new ResizeObserver(check)
    observer.observe(step)
    for (const child of step.children) observer.observe(child)
    return () => observer.disconnect()
  }, [resetKey])

  useEffect(() => {
    const lastTop = new WeakMap<Element, number>()

    const onScroll = (e: Event) => {
      const el = e.target
      if (!(el instanceof Element) || !el.classList.contains('step-content')) return
      const top = el.scrollTop
      const previous = lastTop.get(el) ?? 0
      const delta = top - previous
      if (Math.abs(delta) < SCROLL_THRESHOLD) return
      lastTop.set(el, top)
      setVisible(delta > 0)
    }

    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => document.removeEventListener('scroll', onScroll, { capture: true })
  }, [])

  return visible
}

interface BottomNavigationProps {
  currentStep: number
  totalSteps: number
  isFirst: boolean
  isLast: boolean
}

export function BottomNavigation({ currentStep, totalSteps, isFirst, isLast }: BottomNavigationProps) {
  const { t, goToStep, saveAndNext } = useApp()
  // Leaving the step would unmount the run in flight.
  const automationLocked = useAutomationLocked()
  const visible = useVisibleOnScrollDown(currentStep)

  const handleSaveAndNext = () => {
    saveAndNext()
    toast.success(t('toast.saved'), {
      position: 'top-center',
      style: {
        color: 'var(--text-primary)',
        border: '1px solid var(--border-light)',
      },
    })
  }

  return (
    <footer className={`bottom-nav${visible ? '' : ' bottom-nav--hidden'}`} aria-hidden={!visible}>
      <div className="bottom-nav-left">
        <button
          className="btn btn-secondary"
          onClick={() => goToStep(currentStep - 1)}
          disabled={isFirst || automationLocked}
          id="btn-previous"
        >
          <ChevronLeft size={16} />
          {t('nav.previous')}
        </button>
        <span className="progress-indicator">
          {t('nav.step')} {currentStep + 1} {t('nav.of')} {totalSteps}
        </span>
      </div>
      <div className="bottom-nav-right">
        {!isLast && (
          <button
            className="btn btn-primary"
            onClick={handleSaveAndNext}
            disabled={automationLocked}
            id="btn-save-next"
          >
            <Save size={16} />
            {t('nav.saveAndNext')}
            <ChevronRight size={16} />
          </button>
        )}
        {isLast && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary-text)', fontSize: 'var(--font-size-md)', fontWeight: 600 }}>
            <Check size={18} />
            Configuration complète !
          </div>
        )}
      </div>
    </footer>
  )
}
