import { type ReactNode } from 'react'
import { useAutomationLocked } from '../../context/AutomationLockContext'

interface StepContentProps {
  currentStep: number
  title: string
  description: string
  children: ReactNode
}

export function StepContent({ currentStep, title, description, children }: StepContentProps) {
  const automationLocked = useAutomationLocked()

  return (
    <main className="step-content" key={currentStep}>
      {/* Dims the whole window while an automation runs — the card running it
          is raised above this layer, everything else sits under it. Kept
          mounted so it can fade out as well as in; inside the scroll
          container so the wheel still scrolls the step underneath. */}
      <div
        className={`automation-overlay${automationLocked ? ' automation-overlay--active' : ''}`}
        aria-hidden="true"
      />
      <div className="step-header">
        <h1 className="step-title">{title}</h1>
        <p className="step-description">{description}</p>
      </div>
      {children}
    </main>
  )
}
