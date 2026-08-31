import { type ReactNode } from 'react'
import { steps } from './steps'

interface StepContentProps {
  currentStep: number
  title: string
  description: string
  children: ReactNode
}

export function StepContent({ currentStep, title, description, children }: StepContentProps) {
  const StepIcon = steps[currentStep]?.Icon

  return (
    <main className="step-content" key={currentStep}>
      <div className="step-header">
        <div className="step-title-row">
          {StepIcon && (
            <span className="step-title-icon" aria-hidden="true">
              <StepIcon size={24} />
            </span>
          )}
          <h1 className="step-title">{title}</h1>
        </div>
        <p className="step-description">{description}</p>
      </div>
      {children}
    </main>
  )
}
