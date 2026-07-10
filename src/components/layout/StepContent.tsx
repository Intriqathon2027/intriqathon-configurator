import { type ReactNode } from 'react'

interface StepContentProps {
  currentStep: number
  title: string
  description: string
  children: ReactNode
}

export function StepContent({ currentStep, title, description, children }: StepContentProps) {
  return (
    <main className="step-content" key={currentStep}>
      <div className="step-header">
        <h1 className="step-title">{title}</h1>
        <p className="step-description">{description}</p>
      </div>
      {children}
    </main>
  )
}
