import { useState, useEffect, useCallback } from 'react'
import { Zap, Play, RotateCcw, Upload, Download, Trash2, X, ExternalLink } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { LanguageToggle } from '../components/layout/LanguageToggle'
import type { RecentConfig } from '../types/electron'

export function LandingPage() {
  const { state, t, startConfig, hasSavedConfig, dispatch } = useApp()
  const [showPrompt, setShowPrompt] = useState(false)
  const [errorDialog, setErrorDialog] = useState<string | null>(null)
  const [recentConfigs, setRecentConfigs] = useState<RecentConfig[]>([])

  // Load recent configs on mount
  const loadRecentConfigs = useCallback(async () => {
    if (window.electronAPI) {
      const configs = await window.electronAPI.loadRecentConfigs()
      setRecentConfigs(configs || [])
    } else {
      // Fallback to localStorage for development
      const saved = localStorage.getItem('intriqathon-recent-configs')
      if (saved) {
        try {
          setRecentConfigs(JSON.parse(saved))
        } catch {}
      }
    }
  }, [])

  useEffect(() => {
    loadRecentConfigs()
  }, [loadRecentConfigs])

  // Save recent configs helper
  const saveRecentConfigs = async (configs: RecentConfig[]) => {
    setRecentConfigs(configs)
    if (window.electronAPI) {
      await window.electronAPI.saveRecentConfigs(configs)
    } else {
      localStorage.setItem('intriqathon-recent-configs', JSON.stringify(configs))
    }
  }

  // Add a config to recent list
  const addToRecent = async (filePath: string) => {
    const name = filePath.split('/').pop()?.replace('.json', '') || 'Configuration'
    const newEntry: RecentConfig = {
      name,
      path: filePath,
      savedAt: new Date().toISOString(),
    }
    // Remove duplicate if exists, then prepend
    const filtered = recentConfigs.filter(c => c.path !== filePath)
    const updated = [newEntry, ...filtered].slice(0, 20) // Keep max 20
    await saveRecentConfigs(updated)
  }

  // Remove a config from recent list
  const removeFromRecent = async (filePath: string) => {
    const updated = recentConfigs.filter(c => c.path !== filePath)
    await saveRecentConfigs(updated)
  }

  // Launch a recent config
  const handleLaunchRecent = async (config: RecentConfig) => {
    if (window.electronAPI) {
      const data = await window.electronAPI.readConfigFile(config.path)
      if (data) {
        dispatch({ type: 'LOAD_SAVED', config: data as unknown as Partial<typeof state.config> })
        await window.electronAPI.saveLocalConfig(data)
        // Move to top of recent configs list
        const updated = [config, ...recentConfigs.filter(c => c.path !== config.path)]
        await saveRecentConfigs(updated)
        startConfig()
      } else {
        // File no longer exists, show error dialog and remove from recent
        setErrorDialog(t('landing.recent.notFound'))
        await removeFromRecent(config.path)
      }
    }
  }

  const handleStartFresh = () => {
    if (hasSavedConfig) {
      setShowPrompt(true)
    } else {
      startConfig()
    }
  }

  const handleExportAndContinue = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.exportConfig(state.config as unknown as Record<string, string>)
      if (result.success && result.path) {
        await addToRecent(result.path)
      }
    }
    dispatch({ type: 'RESET_CONFIG' })
    if (window.electronAPI) {
      await window.electronAPI.saveLocalConfig({})
    }
    setShowPrompt(false)
    startConfig()
  }

  const handleDiscardAndContinue = async () => {
    dispatch({ type: 'RESET_CONFIG' })
    if (window.electronAPI) {
      await window.electronAPI.saveLocalConfig({})
    }
    setShowPrompt(false)
    startConfig()
  }

  const handleImport = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.importConfig()
      if (result && result.data) {
        dispatch({ type: 'LOAD_SAVED', config: result.data as unknown as Partial<typeof state.config> })
        await window.electronAPI.saveLocalConfig(result.data)
        await addToRecent(result.path)
        startConfig()
      }
    } else {
      alert('Non supporté sur le web')
    }
  }

  return (
    <div className="landing-container">
      {/* Language Toggle in Top Right */}
      <div className="landing-top-right">
        <LanguageToggle />
      </div>

      <div className="landing-content">
        <div className="landing-logo-container">
          <div className="landing-logo-icon">
            <Zap size={48} color="white" />
          </div>
        </div>

        <h1 className="landing-title">{t('landing.title')}</h1>
        <p className="landing-subtitle">{t('landing.subtitle')}</p>
        <div className="landing-team-badge">{t('landing.team')}</div>

        {/* Recent Configurations */}
        {recentConfigs.length > 0 && (
          <div className="recent-configs-section">
            <h2 className="recent-configs-title">{t('landing.recent.title')}</h2>
            <div className="recent-configs-card">
              <div className="recent-configs-list">
                {recentConfigs.map((config) => (
                  <div key={config.path} className="recent-config-item">
                    <div className="recent-config-info">
                      <span className="recent-config-name">{config.name}</span>
                      <span className="recent-config-path">{config.path}</span>
                    </div>
                    <div className="recent-config-actions">
                      <button
                        className="recent-config-remove"
                        onClick={() => removeFromRecent(config.path)}
                        title={t('landing.recent.remove')}
                      >
                        <X size={14} />
                      </button>
                      <button
                        className="recent-config-launch"
                        onClick={() => handleLaunchRecent(config)}
                      >
                        <ExternalLink size={14} />
                        {t('landing.recent.launch')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="landing-actions">
          {hasSavedConfig && (
            <div className="tooltip-wrapper">
              <button className="btn btn-primary landing-btn" onClick={startConfig}>
                <Play size={18} />
                {t('landing.btn.resume')}
              </button>
              <div className="tooltip-bottom">
                {recentConfigs[0]?.name || 'Configuration en cours'}
              </div>
            </div>
          )}

          <button 
            className={`btn ${hasSavedConfig ? 'btn-secondary' : 'btn-primary'} landing-btn`} 
            onClick={handleStartFresh}
          >
            <RotateCcw size={18} />
            {t('landing.btn.new')}
          </button>

          <button className="btn btn-secondary landing-btn" onClick={handleImport}>
            <Upload size={18} />
            {t('landing.btn.import')}
          </button>
        </div>
      </div>

      {/* Export Prompt Modal */}
      {showPrompt && (
        <div className="modal-overlay" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="modal" style={{ width: '480px', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <div className="modal-header" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
              <div className="modal-title">
                <Trash2 size={18} color="var(--color-danger)" />
                {t('landing.prompt.title')}
              </div>
              <button 
                className="modal-close" 
                onClick={() => setShowPrompt(false)}
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ lineHeight: '1.5', color: 'var(--color-text)' }}>
                {t('landing.prompt.desc')}
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ justifyContent: 'center' }}
                  onClick={handleExportAndContinue}
                >
                  <Download size={16} />
                  {t('landing.prompt.export')}
                </button>
                
                <button 
                  className="btn btn-secondary" 
                  style={{ justifyContent: 'center', color: 'var(--color-danger)', borderColor: 'var(--color-danger-light)', background: 'var(--color-danger-light)' }}
                  onClick={handleDiscardAndContinue}
                >
                  <Trash2 size={16} />
                  {t('landing.prompt.discard')}
                </button>

                <button 
                  className="btn btn-ghost" 
                  style={{ justifyContent: 'center' }}
                  onClick={() => setShowPrompt(false)}
                >
                  {t('landing.prompt.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Prompt Modal */}
      {errorDialog && (
        <div className="modal-overlay" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="modal" style={{ width: '400px', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <div className="modal-header" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
              <div className="modal-title">
                <Zap size={18} color="var(--color-danger)" />
                Erreur
              </div>
              <button 
                className="modal-close" 
                onClick={() => setErrorDialog(null)}
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ lineHeight: '1.5', color: 'var(--color-text)' }}>
                {errorDialog}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setErrorDialog(null)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
