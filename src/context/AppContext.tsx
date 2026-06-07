import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import type { Language } from '../types/i18n'
import { translations } from '../i18n/translations'

// ============================================================
// CONFIG STATE
// ============================================================
export interface Config {
  // Step 1
  DOMAIN: string
  DEPLOY_PATH: string
  IPV4_INSTANCE: string

  // Step 2 — Supabase
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  DATABASE_URL: string
  DIRECT_URL: string
  S3_ACCESS_KEY_ID: string
  S3_SECRET_ACCESS_KEY: string

  // Step 3 — OAuth2
  DISCORD_CLIENT_ID: string
  OAUTH2_DISCORD_CLIENT_SECRET: string
  GITHUB_CLIENT_ID: string
  OAUTH2_GITHUB_CLIENT_SECRET: string

  // Step 4 — Email
  RESEND_API_KEY: string
  FROM_EMAIL: string
  ALLOWED_EMAILS: string

  // Step 5 — Discord Bot
  CLIENT_ID: string
  BOT_TOKEN: string
  DEV_SERVER_ID: string
  GUILD_ID: string
}

const defaultConfig: Config = {
  DOMAIN: '',
  DEPLOY_PATH: '',
  IPV4_INSTANCE: '',
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  SUPABASE_SERVICE_ROLE_KEY: '',
  DATABASE_URL: '',
  DIRECT_URL: '',
  S3_ACCESS_KEY_ID: '',
  S3_SECRET_ACCESS_KEY: '',
  DISCORD_CLIENT_ID: '',
  OAUTH2_DISCORD_CLIENT_SECRET: '',
  GITHUB_CLIENT_ID: '',
  OAUTH2_GITHUB_CLIENT_SECRET: '',
  RESEND_API_KEY: '',
  FROM_EMAIL: '',
  ALLOWED_EMAILS: '*',
  CLIENT_ID: '',
  BOT_TOKEN: '',
  DEV_SERVER_ID: '',
  GUILD_ID: '',
}

// ============================================================
// ACTIONS
// ============================================================
type Action =
  | { type: 'SET_FIELD'; key: keyof Config; value: string }
  | { type: 'SET_LANGUAGE'; lang: Language }
  | { type: 'SET_STEP'; step: number }
  | { type: 'LOAD_SAVED'; config: Partial<Config> }
  | { type: 'RESET_CONFIG' }

// ============================================================
// STATE
// ============================================================
interface AppState {
  config: Config
  language: Language
  currentStep: number
}

const initialState: AppState = {
  config: defaultConfig,
  language: 'fr',
  currentStep: 0,
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
      return { ...state, config: defaultConfig }
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
    const nextStep = Math.min(state.currentStep + 1, 7)
    dispatch({ type: 'SET_STEP', step: nextStep })
  }

  const openUrl = (url: string) => {
    if (window.electronAPI) {
      window.electronAPI.openExternalUrl(url)
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

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
