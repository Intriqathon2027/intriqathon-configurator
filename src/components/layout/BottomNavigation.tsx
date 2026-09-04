import { ChevronLeft, ChevronRight, Check, Save } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import toast from 'react-hot-toast'

interface BottomNavigationProps {
  currentStep: number
  totalSteps: number
  isFirst: boolean
  isLast: boolean
}

export function BottomNavigation({ currentStep, totalSteps, isFirst, isLast }: BottomNavigationProps) {
  const { t, goToStep, saveAndNext } = useApp()

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
    <footer className="bottom-nav">
      <div className="bottom-nav-left">
        <button
          className="btn btn-secondary"
          onClick={() => goToStep(currentStep - 1)}
          disabled={isFirst}
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
