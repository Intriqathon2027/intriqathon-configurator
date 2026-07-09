import { Settings, Upload, Download, Trash2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import toast from 'react-hot-toast'

interface SettingsModalProps {
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
}

export function SettingsModal({ settingsOpen, setSettingsOpen }: SettingsModalProps) {
  const { state, dispatch, t } = useApp()

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
            <Settings size={18} color="var(--color-primary)" />
            {t('settings.title')}
          </div>
          <button className="modal-close" onClick={() => setSettingsOpen(false)}>
            ✕
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
