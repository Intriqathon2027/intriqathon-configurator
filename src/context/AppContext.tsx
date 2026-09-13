import React, { createContext, useContext, useReducer, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Language } from '../types/i18n'
import { translations } from '../i18n/translations'
import { FONT_SCALE_KEY, clampFontScale, loadFontScale } from '../utils/fontScale'
import type { SshKeyInfo } from '../types/electron'
import { deriveProjectRef, withEffectiveProjectRef } from '../shared/supabaseProject'

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
  /**
   * Database password. Not part of the .env, but the one value the Management
   * API never hands back — it is what turns DATABASE_URL and DIRECT_URL from a
   * copy-paste into something the automation can build on its own.
   */
  SUPABASE_DB_PASSWORD: string
  /**
   * The project the rest of the wizard works against — always the one the
   * chosen mode designates. Derived from the two below, never set on its own.
   */
  SUPABASE_PROJECT_REF: string
  /** The project picked from the account, in "use an existing project" mode. */
  SUPABASE_SELECTED_PROJECT_REF: string
  /**
   * Only ever written when the configurator itself created a project. Kept
   * apart from SUPABASE_PROJECT_REF because picking an existing project must
   * not look like a creation: the two modes ask different questions of the same
   * account, and sharing one field made the answer to one show up in the other.
   */
  SUPABASE_CREATED_PROJECT_REF: string
  /** 'existing' adopts a project made in the dashboard, 'create' provisions one from here. */
  SUPABASE_PROJECT_MODE: string
  /** Only used in 'create' mode — the org the project is billed to, and its name and region. */
  SUPABASE_ORG_SLUG: string
  SUPABASE_PROJECT_NAME: string
  SUPABASE_REGION: string

  // Account Creation — Resend
  RESEND_API_KEY: string
  /**
   * The subdomain Resend sends from. Pre-filled with `mail.<domain>` — the
   * convention the rest of the wizard assumes — but editable: a domain whose
   * `mail.` subdomain is already taken by a mailbox provider needs another one,
   * and every DNS record and sender address derives from this value.
   */
  MAIL_SUBDOMAIN: string

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

  /**
   * When the post-deployment Supabase settings were last applied from
   * "Configuration du site" (ISO date). Not part of the .env — it is what lets
   * the card still read as done after the app is reopened.
   */
  SUPABASE_SITE_SETUP_AT: string

  /**
   * The JWT legacy `service_role` key, read back by that same run. Not part of
   * the .env either: it exists only because `config.<domain>` is a browser app,
   * and Supabase refuses a `sb_secret_…` key on any request carrying an Origin.
   * SUPABASE_SERVICE_ROLE_KEY keeps serving the deployed stack, server-side.
   */
  SUPABASE_PANEL_SERVICE_KEY: string

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
  SUPABASE_DB_PASSWORD: '',
  SUPABASE_PROJECT_REF: '',
  SUPABASE_SELECTED_PROJECT_REF: '',
  SUPABASE_CREATED_PROJECT_REF: '',
  SUPABASE_PROJECT_MODE: 'existing',
  SUPABASE_ORG_SLUG: '',
  SUPABASE_PROJECT_NAME: 'intriqathon',
  SUPABASE_REGION: 'eu-west-3',
  RESEND_API_KEY: '',
  MAIL_SUBDOMAIN: '',
  SCW_SECRET_KEY: '',
  SCW_DEFAULT_PROJECT_ID: '',
  DEPLOY_PATH: '',
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  SUPABASE_SERVICE_ROLE_KEY: '',
  DATABASE_URL: '',
  DIRECT_URL: '',
  SUPABASE_SITE_SETUP_AT: '',
  SUPABASE_PANEL_SERVICE_KEY: '',
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

/** The sending subdomain a domain implies, before anyone edits it. */
function mailSubdomainFor(domain: string): string {
  return domain ? `mail.${domain}` : ''
}

/** The sender address a sending subdomain implies. */
function senderFor(subdomain: string): string {
  return subdomain ? `Hackathon Team <onboarding@${subdomain}>` : ''
}

// ============================================================
// THEME
// ============================================================
/** What the user picked. 'system' mirrors the OS appearance. */
export type ThemePreference = 'light' | 'dark' | 'system'
/** What actually gets written to `data-theme`. */
export type ResolvedTheme = 'light' | 'dark'

const THEME_KEY = 'intriqathon-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function loadThemePreference(): ThemePreference {
  const saved = localStorage.getItem(THEME_KEY)
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
}

function resolveTheme(pref: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (pref === 'system') return prefersDark ? 'dark' : 'light'
  return pref
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
  | { type: 'SET_FIELDS'; patch: Partial<Config> }
  | { type: 'SET_LANGUAGE'; lang: Language }
  | { type: 'SET_STEP'; step: number }
  | { type: 'LOAD_SAVED'; config: Partial<Config> }
  | { type: 'RESET_CONFIG' }
  | { type: 'START_CONFIG' }
  | { type: 'STOP_CONFIG' }
  | { type: 'SET_THEME'; theme: ThemePreference }
  | { type: 'SET_FONT_SCALE'; scale: number }
  | { type: 'SET_VAULT_STATUS'; exists: boolean; unlocked: boolean }
  | { type: 'VAULT_UNLOCKED'; config?: Partial<Config> }
  | { type: 'VAULT_LOCKED' }

// ============================================================
// STATE
// ============================================================
interface AppState {
  config: Config
  language: Language
  currentStep: number
  hasStarted: boolean
  /** What the user picked — 'system' follows the OS appearance. */
  theme: ThemePreference
  /** Multiplier applied to every typography token. 1 is the design default. */
  fontScale: number
  /**
   * Bumped every time a whole configuration is loaded, replaced or reset —
   * opening a saved file, importing one, starting a new one, unlocking the
   * vault. What is being configured has changed, and anything remembered about
   * the previous one (a run that succeeded, a box ticked) describes a project
   * nobody is looking at any more.
   */
  configGeneration: number
  /** Vault encryption state */
  isVaultUnlocked: boolean
  vaultExists: boolean | null
}

const initialState: AppState = {
  config: defaultConfig,
  language: 'fr',
  currentStep: 0,
  hasStarted: false,
  theme: loadThemePreference(),
  fontScale: loadFontScale(),
  configGeneration: 0,
  isVaultUnlocked: false,
  vaultExists: null,
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    // `SUPABASE_PROJECT_REF` is derived here rather than assigned by callers.
    // Three of them used to assign it — the project dropdown, the mode switch
    // and the provisioning patch — and an event arriving after the mode had
    // changed left the field designating a project the current mode does not.
    // Deriving it on every write makes that state unreachable.
    case 'SET_FIELD':
      return {
        ...state,
        config: deriveProjectRef({ ...state.config, [action.key]: action.value }),
      }
    case 'SET_FIELDS':
      return {
        ...state,
        config: deriveProjectRef({ ...state.config, ...action.patch }),
      }
    case 'SET_LANGUAGE':
      return { ...state, language: action.lang }
    case 'SET_STEP':
      return { ...state, currentStep: action.step }
    case 'LOAD_SAVED':
      return {
        ...state,
        config: withEffectiveProjectRef({ ...state.config, ...action.config }),
        configGeneration: state.configGeneration + 1,
      }
    case 'RESET_CONFIG':
      return { ...state, config: defaultConfig, configGeneration: state.configGeneration + 1 }
    case 'START_CONFIG':
      return { ...state, hasStarted: true }
    case 'STOP_CONFIG':
      return { ...state, hasStarted: false }
    case 'SET_THEME':
      return { ...state, theme: action.theme }
    case 'SET_FONT_SCALE':
      return { ...state, fontScale: clampFontScale(action.scale) }
    case 'SET_VAULT_STATUS':
      return { ...state, vaultExists: action.exists, isVaultUnlocked: action.unlocked }
    case 'VAULT_UNLOCKED':
      return {
        ...state,
        isVaultUnlocked: true,
        vaultExists: true,
        config: action.config
          ? withEffectiveProjectRef({ ...state.config, ...action.config })
          : state.config,
        configGeneration: state.configGeneration + 1,
      }
    case 'VAULT_LOCKED':
      return { ...state, isVaultUnlocked: false }
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
  /**
   * Applies several fields at once. Used by the API automations, which fill in
   * five or six values together — one dispatch instead of one per field.
   */
  setFields: (patch: Partial<Config>) => void
  /**
   * Writes the config to the vault without moving to the next step. `override`
   * is merged in first: a caller that has just dispatched SET_FIELDS still sees
   * the pre-dispatch `state.config` in this closure, so the new values have to
   * be handed over explicitly or they would not be persisted.
   */
  saveConfig: (override?: Partial<Config>) => Promise<void>
  goToStep: (step: number) => void
  saveAndNext: () => Promise<void>
  openUrl: (url: string) => void
  startConfig: () => void
  goHome: () => void
  hasSavedConfig: boolean
  totalSteps: number
  setTheme: (theme: ThemePreference) => void
  setFontScale: (scale: number) => void
  /** The theme actually applied — 'system' resolved against the OS setting. */
  resolvedTheme: ResolvedTheme
  /** Vault encryption methods */
  isVaultUnlocked: boolean
  vaultExists: boolean | null
  unlockVault: (password: string) => Promise<{ success: boolean; error?: string }>
  createVault: (password: string) => Promise<{ success: boolean; error?: string }>
  lockVault: () => Promise<void>
  resetVault: () => Promise<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  /** SSH key selected for Scaleway / deployment */
  selectedSshKey: SshKeyInfo | null
  setSelectedSshKey: (key: SshKeyInfo | null) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(initialState.theme, window.matchMedia(DARK_QUERY).matches)
  )
  const [selectedSshKey, setSelectedSshKey] = useState<SshKeyInfo | null>(() => {
    try {
      const raw = localStorage.getItem('intriqathon-ssh-key')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (selectedSshKey) {
      localStorage.setItem('intriqathon-ssh-key', JSON.stringify(selectedSshKey))
    } else {
      localStorage.removeItem('intriqathon-ssh-key')
    }
  }, [selectedSshKey])

  // Check vault status on mount
  useEffect(() => {
    const checkVault = async () => {
      if (window.electronAPI && window.electronAPI.vaultExists) {
        try {
          const exists = await window.electronAPI.vaultExists()
          const unlocked = await window.electronAPI.vaultIsUnlocked()
          if (unlocked) {
            const saved = await window.electronAPI.loadLocalConfig()
            if (saved && Object.keys(saved).length > 0) {
              dispatch({ type: 'LOAD_SAVED', config: saved })
            }
          }
          dispatch({ type: 'SET_VAULT_STATUS', exists, unlocked })
        } catch {
          dispatch({ type: 'SET_VAULT_STATUS', exists: false, unlocked: false })
        }
      } else {
        // Fallback to localStorage for development in browser
        const saved = localStorage.getItem('intriqathon-config')
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            dispatch({ type: 'LOAD_SAVED', config: parsed })
          } catch {}
        }
        dispatch({ type: 'SET_VAULT_STATUS', exists: false, unlocked: true })
      }
    }
    checkVault()
  }, [])

  /**
   * The sending subdomain and the sender address follow the domain — until one
   * of them is edited, after which it is left alone.
   *
   * "Edited" is decided by comparison, not by a flag: a value that still equals
   * what would have been derived from the *previous* domain is one nobody
   * touched, so it is re-derived; anything else is the reader's own and stays.
   * A flag could not have answered this after a reload, where the config comes
   * back from the vault with no record of who wrote which field.
   */
  const derivedRef = useRef({
    domain: initialState.config.DOMAIN,
    subdomain: initialState.config.MAIL_SUBDOMAIN,
  })

  useEffect(() => {
    const domain = state.config.DOMAIN
    const previous = derivedRef.current
    const patch: Partial<Config> = {}

    const subdomainUntouched = !state.config.MAIL_SUBDOMAIN
      || state.config.MAIL_SUBDOMAIN === mailSubdomainFor(previous.domain)
    const nextSubdomain = subdomainUntouched && domain
      ? mailSubdomainFor(domain)
      : state.config.MAIL_SUBDOMAIN

    if (nextSubdomain !== state.config.MAIL_SUBDOMAIN) patch.MAIL_SUBDOMAIN = nextSubdomain

    // The sender address follows whichever subdomain is now in force.
    const fromUntouched = !state.config.FROM_EMAIL.includes('@')
      || state.config.FROM_EMAIL === senderFor(previous.subdomain)
      || (!!previous.domain && state.config.FROM_EMAIL === senderFor(mailSubdomainFor(previous.domain)))
    if (fromUntouched && nextSubdomain) {
      const nextSender = senderFor(nextSubdomain)
      if (nextSender !== state.config.FROM_EMAIL) patch.FROM_EMAIL = nextSender
    }

    derivedRef.current = { domain, subdomain: nextSubdomain }
    if (Object.keys(patch).length > 0) dispatch({ type: 'SET_FIELDS', patch })
  }, [state.config.DOMAIN, state.config.MAIL_SUBDOMAIN, state.config.FROM_EMAIL])

  // Apply the theme, following the OS appearance while the preference is 'system'
  useEffect(() => {
    localStorage.setItem('intriqathon-theme', state.theme)

    const media = window.matchMedia(DARK_QUERY)
    const apply = () => {
      const resolved = resolveTheme(state.theme, media.matches)
      document.documentElement.setAttribute('data-theme', resolved)
      setResolvedTheme(resolved)
    }

    apply()
    if (state.theme !== 'system') return

    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [state.theme])

  // Drive the typography tokens from the user's text-size preference
  useEffect(() => {
    localStorage.setItem(FONT_SCALE_KEY, String(state.fontScale))
    document.documentElement.style.setProperty('--font-scale', String(state.fontScale))
  }, [state.fontScale])

  const t = (key: string): string => {
    const dict = translations[state.language] as Record<string, string>
    return dict[key] ?? key
  }

  const setField = (key: keyof Config, value: string) => {
    dispatch({ type: 'SET_FIELD', key, value })
  }

  const setFields = (patch: Partial<Config>) => {
    dispatch({ type: 'SET_FIELDS', patch })
  }

  const persist = async (config: Config) => {
    if (window.electronAPI && window.electronAPI.vaultSave) {
      await window.electronAPI.vaultSave(config as unknown as Record<string, string>)
    } else if (window.electronAPI) {
      await window.electronAPI.saveLocalConfig(config as unknown as Record<string, string>)
    } else {
      localStorage.setItem('intriqathon-config', JSON.stringify(config))
    }
  }

  const saveConfig = async (override?: Partial<Config>) => {
    // Derived here as well as in the reducer: `override` is merged onto the
    // pre-dispatch `state.config`, whose reference was computed before it
    // arrived. Reading it back would put it right, but there is no reason to
    // write a stale one into the vault in the first place.
    await persist(deriveProjectRef(override ? { ...state.config, ...override } : state.config))
  }

  const goToStep = (step: number) => {
    dispatch({ type: 'SET_STEP', step })
  }

  const saveAndNext = async () => {
    await persist(state.config)

    // Move to next step
    const nextStep = Math.min(state.currentStep + 1, TOTAL_STEPS - 1)
    dispatch({ type: 'SET_STEP', step: nextStep })
  }

  const unlockVault = async (password: string) => {
    if (window.electronAPI && window.electronAPI.vaultUnlock) {
      const res = await window.electronAPI.vaultUnlock(password)
      if (res.success && res.data) {
        dispatch({ type: 'VAULT_UNLOCKED', config: res.data as Partial<Config> })
        return { success: true }
      }
      return { success: false, error: res.error || t('vault.error.wrongPassword') }
    } else {
      dispatch({ type: 'VAULT_UNLOCKED' })
      return { success: true }
    }
  }

  const createVault = async (password: string) => {
    if (window.electronAPI && window.electronAPI.vaultCreate) {
      const res = await window.electronAPI.vaultCreate(password, state.config as unknown as Record<string, string>)
      if (res.success) {
        dispatch({ type: 'VAULT_UNLOCKED' })
        return { success: true }
      }
      return { success: false, error: res.error || 'Erreur' }
    } else {
      dispatch({ type: 'VAULT_UNLOCKED' })
      return { success: true }
    }
  }

  const lockVault = async () => {
    if (window.electronAPI && window.electronAPI.vaultLock) {
      await window.electronAPI.vaultLock()
    }
    dispatch({ type: 'VAULT_LOCKED' })
  }

  const resetVault = async () => {
    if (window.electronAPI && window.electronAPI.vaultReset) {
      await window.electronAPI.vaultReset()
    } else {
      localStorage.removeItem('intriqathon-config')
    }
    dispatch({ type: 'RESET_CONFIG' })
    dispatch({ type: 'SET_VAULT_STATUS', exists: false, unlocked: false })
    setSelectedSshKey(null)
  }

  const changePassword = async (oldPassword: string, newPassword: string) => {
    if (window.electronAPI && window.electronAPI.vaultChangePassword) {
      const res = await window.electronAPI.vaultChangePassword(oldPassword, newPassword)
      if (res.success) {
        return { success: true }
      }
      return { success: false, error: res.error || t('vault.error.wrongPassword') }
    } else {
      return { success: true }
    }
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

  const setFontScale = (scale: number) => {
    dispatch({ type: 'SET_FONT_SCALE', scale })
  }

  const setTheme = (theme: ThemePreference) => {
    dispatch({ type: 'SET_THEME', theme })
  }

  const hasSavedConfig = Object.entries(state.config).some(([k, v]) => k !== 'ALLOWED_EMAILS' && v !== '')

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      t,
      config: state.config,
      setField,
      setFields,
      saveConfig,
      goToStep,
      saveAndNext,
      openUrl,
      startConfig,
      goHome,
      hasSavedConfig,
      totalSteps: TOTAL_STEPS,
      setTheme,
      setFontScale,
      resolvedTheme,
      isVaultUnlocked: state.isVaultUnlocked,
      vaultExists: state.vaultExists,
      unlockVault,
      createVault,
      lockVault,
      resetVault,
      changePassword,
      selectedSshKey,
      setSelectedSshKey,
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
