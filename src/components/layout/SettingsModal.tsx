import { Settings, Upload, Download, Trash2, Moon, Sun, Monitor, RotateCcw, Type } from 'lucide-react'
import { useApp, type ThemePreference } from '../../context/AppContext'
import {
  FONT_SCALE_MIN,
  FONT_SCALE_MAX,
  FONT_SCALE_STEP,
  FONT_SCALE_DEFAULT,
} from '../../utils/fontScale'
import toast from 'react-hot-toast'

const THEME_OPTIONS: { value: ThemePreference; Icon: typeof Sun; labelKey: string }[] = [
  { value: 'light', Icon: Sun, labelKey: 'settings.theme.light' },
  { value: 'system', Icon: Monitor, labelKey: 'settings.theme.system' },
  { value: 'dark', Icon: Moon, labelKey: 'settings.theme.dark' },
]

interface SettingsModalProps {
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
}

export function SettingsModal({ settingsOpen, setSettingsOpen }: SettingsModalProps) {
  const { state, dispatch, t, setTheme, resolvedTheme, setFontScale } = useApp()

  if (!settingsOpen) return null

  const handleImport = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.importConfig()
      if (result && result.data) {
        dispatch({ type: 'LOAD_SAVED', config: result.data as unknown as Partial<typeof state.config> })
        await window.electronAPI.saveLocalConfig(result.data)
        
        // Add to recent configs
        const recentConfigs = await window.electronAPI.loadRecentConfigs()
        const name = result.path.split('/').pop()?.replace('.json', '') || 'Configuration'
        const newEntry = { name, path: result.path, savedAt: new Date().toISOString() }
        const filtered = (recentConfigs || []).filter((c: { path: string }) => c.path !== result.path)
        const updated = [newEntry, ...filtered].slice(0, 20)
        await window.electronAPI.saveRecentConfigs(updated)

        setSettingsOpen(false)
        toast.success(t('toast.imported'), {
          position: 'top-center',
          style: {
            color: 'var(--text-primary)',
            border: '1px solid var(--border-light)',
          },
        })
      }
    } else {
      alert('Non supporté sur le web')
    }
  }

  const handleExport = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.exportConfig(state.config as unknown as Record<string, string>)
      if (result.success && result.path) {
        // Add to recent configs
        const recentConfigs = await window.electronAPI.loadRecentConfigs()
        const name = result.path.split('/').pop()?.replace('.json', '') || 'Configuration'
        const newEntry = { name, path: result.path, savedAt: new Date().toISOString() }
        const filtered = (recentConfigs || []).filter((c: { path: string }) => c.path !== result.path)
        const updated = [newEntry, ...filtered].slice(0, 20)
        await window.electronAPI.saveRecentConfigs(updated)
      }
      setSettingsOpen(false)
    } else {
      alert('Non supporté sur le web')
    }
  }

  const handleReset = async () => {
    if (confirm(t('settings.reset.confirm'))) {
      dispatch({ type: 'RESET_CONFIG' })
      if (window.electronAPI) {
        // Save an empty object to reset local config
        await window.electronAPI.saveLocalConfig({})
      } else {
        localStorage.removeItem('intriqathon-config')
      }
      setSettingsOpen(false)
      toast.success(t('toast.reset'), {
        position: 'top-center',
        style: {
          color: 'var(--text-primary)',
          border: '1px solid var(--border-light)',
        },
      })
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSettingsOpen(false)}>
      <div className="modal" style={{ width: '400px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <Settings size={18} color="var(--color-primary-text)" />
            {t('settings.title')}
          </div>
          <button className="modal-close" onClick={() => setSettingsOpen(false)}>
            ✕
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Appearance: light / system / dark */}
          <div className="settings-theme">
            <div className="settings-theme__label">
              {resolvedTheme === 'dark'
                ? <Moon size={16} color="var(--color-primary-text)" />
                : <Sun size={16} color="var(--color-primary-text)" />}
              {t('settings.theme')}
            </div>
            <div className="theme-toggle" role="group" aria-label={t('settings.theme')}>
              {THEME_OPTIONS.map(({ value, Icon, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  className={`theme-toggle__btn ${state.theme === value ? 'active' : ''}`}
                  onClick={() => setTheme(value)}
                  aria-pressed={state.theme === value}
                  id={`btn-theme-${value}`}
                >
                  <Icon size={14} />
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Text size: scales every typography token */}
          <div className="settings-font">
            <div className="settings-font__header">
              <div className="settings-theme__label">
                <Type size={16} color="var(--color-primary-text)" />
                {t('settings.textSize')}
              </div>
              <div className="settings-font__value">
                <span>{Math.round(state.fontScale * 100)}%</span>
                {state.fontScale !== FONT_SCALE_DEFAULT && (
                  <button
                    type="button"
                    className="btn btn-icon btn-ghost"
                    onClick={() => setFontScale(FONT_SCALE_DEFAULT)}
                    title={t('settings.textSize.reset')}
                    aria-label={t('settings.textSize.reset')}
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="settings-font__slider">
              <span className="settings-font__tick settings-font__tick--sm">A</span>
              <input
                type="range"
                id="font-scale"
                min={FONT_SCALE_MIN}
                max={FONT_SCALE_MAX}
                step={FONT_SCALE_STEP}
                value={state.fontScale}
                onChange={e => setFontScale(parseFloat(e.target.value))}
                aria-label={t('settings.textSize')}
              />
              <span className="settings-font__tick settings-font__tick--lg">A</span>
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--color-border)', margin: '4px 0' }} />
          <button
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
            onClick={handleImport}
          >
            <Upload size={16} />
            {t('settings.import')}
          </button>
          <button
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
            onClick={handleExport}
          >
            <Download size={16} />
            {t('settings.export')}
          </button>
          <div style={{ height: '1px', background: 'var(--color-border)', margin: '8px 0' }} />
          <button
            className="btn"
            style={{ justifyContent: 'flex-start', padding: '12px 16px', color: '#ef4444', border: '1px solid #ef4444', background: 'transparent' }}
            onClick={handleReset}
          >
            <Trash2 size={16} />
            {t('settings.reset')}
          </button>
        </div>
      </div>
    </div>
  )
}
