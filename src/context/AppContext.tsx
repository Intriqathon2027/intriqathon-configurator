import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import type { Language } from '../types/i18n'
import { translations } from '../i18n/translations'
import { steps } from '../components/layout/steps'

// ============================================================
// CONFIG STATE
// ============================================================
export interface Config {
  // Account Creation — Spaceship
  DOMAIN: string
  SPACESHIP_API_KEY: string
  SPACESHIP_API_SECRET: string

  // Account Creation — Supabase
  SUPABASE_ACCESS_TOKEN: string
  S3_ACCESS_KEY_ID: string
  S3_SECRET_ACCESS_KEY: string

  // Account Creation — Resend
  RESEND_API_KEY: string

  // Account Creation — Scaleway
  SCW_SECRET_KEY: string
  SCW_DEFAULT_PROJECT_ID: string
  DEPLOY_PATH: string

  // API Configuration — Supabase (auto-retrievable, kept for manual fallback)
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  DATABASE_URL: string
  DIRECT_URL: string

  // API Configuration — Spaceship (auto-retrievable)
  IPV4_INSTANCE: string

  // API Configuration — Email settings
  FROM_EMAIL: string
  ALLOWED_EMAILS: string

  // Step 3 — OAuth2
  DISCORD_CLIENT_ID: string
  OAUTH2_DISCORD_CLIENT_SECRET: string
  GITHUB_CLIENT_ID: string
  OAUTH2_GITHUB_CLIENT_SECRET: string

  // Step 3 — Discord Bot
  CLIENT_ID: string
  BOT_TOKEN: string
  DEV_SERVER_ID: string
  GUILD_ID: string
}

const defaultConfig: Config = {
  DOMAIN: '',
  SPACESHIP_API_KEY: '',
  SPACESHIP_API_SECRET: '',
  SUPABASE_ACCESS_TOKEN: '',
  S3_ACCESS_KEY_ID: '',
  S3_SECRET_ACCESS_KEY: '',
  RESEND_API_KEY: '',
  SCW_SECRET_KEY: '',
  SCW_DEFAULT_PROJECT_ID: '',
  DEPLOY_PATH: '',
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  SUPABASE_SERVICE_ROLE_KEY: '',
  DATABASE_URL: '',
  DIRECT_URL: '',
  IPV4_INSTANCE: '',
  FROM_EMAIL: '',
  ALLOWED_EMAILS: '*',
  DISCORD_CLIENT_ID: '',
  OAUTH2_DISCORD_CLIENT_SECRET: '',
  GITHUB_CLIENT_ID: '',
  OAUTH2_GITHUB_CLIENT_SECRET: '',
  CLIENT_ID: '',
  BOT_TOKEN: '',
  DEV_SERVER_ID: '',
  GUILD_ID: '',
}

// ============================================================
// TOTAL STEPS
// ============================================================
const TOTAL_STEPS = 5

// ============================================================
// ACTIONS
// ============================================================
type Action =
  | { type: 'SET_FIELD'; key: keyof Config; value: string }
  | { type: 'SET_LANGUAGE'; lang: Language }
  | { type: 'SET_STEP'; step: number }
  | { type: 'LOAD_SAVED'; config: Partial<Config> }
  | { type: 'RESET_CONFIG' }
  | { type: 'START_CONFIG' }
  | { type: 'STOP_CONFIG' }
  | { type: 'SET_THEME'; theme: 'light' | 'dark' }
  | { type: 'MARK_STEP_DONE'; step: number }

// ============================================================
// STATE
// ============================================================
interface AppState {
  config: Config
  language: Language
  currentStep: number
  hasStarted: boolean
  theme: 'light' | 'dark'
  /** Steps validated by an action (deployment, docker restart) rather than by form fields. */
  actionSteps: number[]
}

const ACTION_STEPS_KEY = 'intriqathon-action-steps'

function loadActionSteps(): number[] {
  try {
    const raw = localStorage.getItem(ACTION_STEPS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : []
  } catch {
    return []
  }
}

const initialState: AppState = {
  config: defaultConfig,
  language: 'fr',
  currentStep: 0,
  hasStarted: false,
  theme: (localStorage.getItem('intriqathon-theme') as 'light' | 'dark') || 'light',
  actionSteps: loadActionSteps(),
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        config: { ...state.config, [action.key]: action.value },
      }
    case 'SET_LANGUAGE':
      return { ...state, language: action.lang }
    case 'SET_STEP':
      return { ...state, currentStep: action.step }
    case 'LOAD_SAVED':
      return {
        ...state,
        config: { ...state.config, ...action.config },
      }
    case 'RESET_CONFIG':
      return { ...state, config: defaultConfig, actionSteps: [] }
    case 'START_CONFIG':
      return { ...state, hasStarted: true }
    case 'STOP_CONFIG':
      return { ...state, hasStarted: false }
    case 'SET_THEME':
      return { ...state, theme: action.theme }
    case 'MARK_STEP_DONE':
      if (state.actionSteps.includes(action.step)) return state
      return { ...state, actionSteps: [...state.actionSteps, action.step] }
    default:
      return state
  }
}

// ============================================================
// CONTEXT
// ============================================================
interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<Action>
  t: (key: string) => string
  config: Config
  setField: (key: keyof Config, value: string) => void
  goToStep: (step: number) => void
  saveAndNext: () => Promise<void>
  openUrl: (url: string) => void
  startConfig: () => void
  goHome: () => void
  hasSavedConfig: boolean
  totalSteps: number
  setTheme: (theme: 'light' | 'dark') => void
  /** True when every requirement of the given step is satisfied. */
  isStepComplete: (step: number) => boolean
  markStepDone: (step: number) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Load saved config on mount
  useEffect(() => {
    const loadSaved = async () => {
      if (window.electronAPI) {
        const saved = await window.electronAPI.loadLocalConfig()
        if (saved && Object.keys(saved).length > 0) {
          dispatch({ type: 'LOAD_SAVED', config: saved })
        }
      } else {
        // Fallback to localStorage for development
        const saved = localStorage.getItem('intriqathon-config')
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            dispatch({ type: 'LOAD_SAVED', config: parsed })
          } catch {}
        }
      }
    }
    loadSaved()
  }, [])

  // Auto-fill FROM_EMAIL when DOMAIN changes
  useEffect(() => {
    if (state.config.DOMAIN && !state.config.FROM_EMAIL.includes('@')) {
      dispatch({
        type: 'SET_FIELD',
        key: 'FROM_EMAIL',
        value: `Hackathon Team <onboarding@mail.${state.config.DOMAIN}>`,
      })
    }
  }, [state.config.DOMAIN])

  // Persist action-validated steps
  useEffect(() => {
    localStorage.setItem(ACTION_STEPS_KEY, JSON.stringify(state.actionSteps))
  }, [state.actionSteps])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
    localStorage.setItem('intriqathon-theme', state.theme)
  }, [state.theme])

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
  }, [])

  const t = (key: string): string => {
    const dict = translations[state.language] as Record<string, string>
    return dict[key] ?? key
  }

  const setField = (key: keyof Config, value: string) => {
    dispatch({ type: 'SET_FIELD', key, value })
  }

  const goToStep = (step: number) => {
    dispatch({ type: 'SET_STEP', step })
  }

  const saveAndNext = async () => {
    // Save everything
    if (window.electronAPI) {
      await window.electronAPI.saveLocalConfig(state.config as unknown as Record<string, string>)
    } else {
      localStorage.setItem('intriqathon-config', JSON.stringify(state.config))
    }

    // Move to next step
    const nextStep = Math.min(state.currentStep + 1, TOTAL_STEPS - 1)
    dispatch({ type: 'SET_STEP', step: nextStep })
  }

  const openUrl = (url: string) => {
    if (window.electronAPI) {
      window.electronAPI.openExternalUrl(url)
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const startConfig = () => {
    dispatch({ type: 'START_CONFIG' })
  }

  const goHome = () => {
    dispatch({ type: 'STOP_CONFIG' })
  }

  const setTheme = (theme: 'light' | 'dark') => {
    dispatch({ type: 'SET_THEME', theme })
  }

  const markStepDone = (step: number) => {
    dispatch({ type: 'MARK_STEP_DONE', step })
  }

  const isStepComplete = (step: number): boolean => {
    const fields = steps[step]?.requiredFields ?? []
    if (fields.length === 0) return state.actionSteps.includes(step)
    return fields.every(key => (state.config[key] ?? '').trim() !== '')
  }

  const hasSavedConfig = Object.entries(state.config).some(([k, v]) => k !== 'ALLOWED_EMAILS' && v !== '')

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      t,
      config: state.config,
      setField,
      goToStep,
      saveAndNext,
      openUrl,
      startConfig,
      goHome,
      hasSavedConfig,
      totalSteps: TOTAL_STEPS,
      setTheme,
      isStepComplete,
      markStepDone,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
