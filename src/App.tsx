import { AppProvider, useApp } from './context/AppContext'
import { Toaster } from 'react-hot-toast'
import { Step1Prerequis } from './steps/Step1Prerequis'
import { Step2Supabase } from './steps/Step2Supabase'
import { Step3OAuth2 } from './steps/Step3OAuth2'
import { Step4Email } from './steps/Step4Email'
import { Step5DiscordBot } from './steps/Step5DiscordBot'
import { Step6Generation } from './steps/Step6Generation'
import { Step7SetupSupabase } from './steps/Step7SetupSupabase'
import { Step8ConfigSite } from './steps/Step8ConfigSite'

function StepRouter() {
  const { state } = useApp()

  switch (state.currentStep) {
    case 0: return <Step1Prerequis />
    case 1: return <Step2Supabase />
    case 2: return <Step3OAuth2 />
    case 3: return <Step4Email />
    case 4: return <Step5DiscordBot />
    case 5: return <Step6Generation />
    case 6: return <Step7SetupSupabase />
    case 7: return <Step8ConfigSite />
    default: return <Step1Prerequis />
  }
}

function App() {
  return (
    <AppProvider>
      <StepRouter />
      <Toaster />
    </AppProvider>
  )
}

export default App
