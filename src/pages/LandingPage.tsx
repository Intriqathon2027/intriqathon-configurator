import { useState } from 'react'
import { Zap, Play, RotateCcw, Upload, Download, Trash2, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { LanguageToggle } from '../components/layout/LanguageToggle'

export function LandingPage() {
  const { state, t, startConfig, hasSavedConfig, dispatch } = useApp()
  const [showPrompt, setShowPrompt] = useState(false)

  const handleStartFresh = () => {
    if (hasSavedConfig) {
      setShowPrompt(true)
    } else {
      startConfig()
    }
  }

  const handleExportAndContinue = async () => {
    if (window.electronAPI) {
      await window.electronAPI.exportConfig(state.config as unknown as Record<string, string>)
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
      const data = await window.electronAPI.importConfig()
      if (data) {
        dispatch({ type: 'LOAD_SAVED', config: data as unknown as Partial<typeof state.config> })
        await window.electronAPI.saveLocalConfig(data)
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

        <div className="landing-actions">
          {hasSavedConfig && (
            <button className="btn btn-primary landing-btn" onClick={startConfig}>
              <Play size={18} />
              {t('landing.btn.resume')}
            </button>
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
        <div className="modal-overlay">
          <div className="modal" style={{ width: '480px' }}>
            <div className="modal-header">
              <div className="modal-title">
                <Trash2 size={18} color="var(--color-danger)" />
                {t('landing.prompt.title')}
              </div>
              <button className="modal-close" onClick={() => setShowPrompt(false)}>
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
    </div>
  )
}
