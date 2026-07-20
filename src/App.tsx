import { AppProvider, useApp } from './context/AppContext'
import { Toaster } from 'react-hot-toast'
import { AccountCreation } from './pages/AccountCreation'
import { ApiConfiguration } from './pages/ApiConfiguration'
import { OAuth2 } from './pages/OAuth2.tsx'
import { Generation } from './pages/Generation.tsx'
import { ConfigSite } from './pages/ConfigSite.tsx'

function StepRouter() {
  const { state } = useApp()

  switch (state.currentStep) {
    case 0: return <AccountCreation />
    case 1: return <ApiConfiguration />
    case 2: return <OAuth2 />
    case 3: return <Generation />
    case 4: return <ConfigSite />
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
