import { AppProvider, useApp } from './context/AppContext'
import { Toaster } from 'react-hot-toast'
import { AccountCreation } from './pages/AccountCreation'
import { ApiConfiguration } from './pages/ApiConfiguration'
import { Step3OAuth2 } from './pages/Step3OAuth2'
import { Step6Generation } from './pages/Step6Generation'
import { Step8ConfigSite } from './pages/Step8ConfigSite'

function StepRouter() {
  const { state } = useApp()

  switch (state.currentStep) {
    case 0: return <AccountCreation />
    case 1: return <ApiConfiguration />
    case 2: return <Step3OAuth2 />
    case 3: return <Step6Generation />
    case 4: return <Step8ConfigSite />
    default: return <AccountCreation />
  }
}

import { LandingPage } from './pages/LandingPage'

function AppContent() {
  const { state } = useApp()
  return state.hasStarted ? <StepRouter /> : <LandingPage />
}

function App() {
  return (
    <AppProvider>
      <AppContent />
      <Toaster />
    </AppProvider>
  )
}

export default App
