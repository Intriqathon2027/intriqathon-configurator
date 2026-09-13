import { useState, useRef, useEffect } from 'react'
import { Upload, X, Rocket, CheckCircle2, AlertCircle, Ban, Terminal, Info, Globe, Database, FolderOpen } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useSession } from '../../context/SessionContext'
import { generateEnvContent } from '../../utils/deploy'
import { collectPreDeployGaps, type PreDeployGap } from '../../utils/preDeployChecks'
import { useDeployment } from '../../hooks/useDeployment'
import { DeployDialog } from './DeployDialog'
import { PreDeployWarning } from './PreDeployWarning'
import { IconRowList } from '../ui/IconRowList'
import { SshKeySelector, type SshKeySelectorHandle } from '../ui/SshKeySelector'
import type { SshKeyInfo } from '../../types/electron'
import type { DeployLogEntry, DeploymentStatus } from '../../hooks/useDeployment'

function getStatusIcon(status: DeployLogEntry['status']) {
  switch (status) {
    case 'done':
      return <CheckCircle2 size={13} className="deploy-log-icon done" />
    case 'error':
      return <AlertCircle size={13} className="deploy-log-icon error" />
    case 'running':
      return <span className="deploy-log-spinner" />
    case 'info':
      return <span className="deploy-log-icon info">›</span>
  }
}

function getGlobalStatusIcon(status: DeploymentStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={16} />
    case 'error':
      return <AlertCircle size={16} />
    case 'cancelled':
      return <Ban size={16} />
    default:
      return null
  }
}

export function DeployAutoTab() {
  const { t, config, setField, selectedSshKey, state } = useApp()
  const { isRunDone, markRunDone, isManualChecked, confirmManual } = useSession()
  const isEn = state.language === 'en'
  const sshSelectorRef = useRef<SshKeySelectorHandle>(null)
  /**
   * The gaps the reader was warned about, held while the dialog is up. The key
   * they chose comes back with the answer: a warning shown for a run started
   * without a selected key must not start the deployment with none.
   */
  const [pendingStart, setPendingStart] = useState<{ key: SshKeyInfo; gaps: PreDeployGap[] } | null>(null)
  const {
    status,
    logs,
    progress,
    pendingDialog,
    start,
    cancel,
    respondToDialog,
  } = useDeployment()

  const consoleRef = useRef<HTMLDivElement>(null)

  // Record the success for the session: it is what keeps the step ticked and
  // the console hidden after leaving this step and coming back.
  useEffect(() => {
    if (status !== 'completed') return
    markRunDone('deploy')
    confirmManual('deploy-manual')
  }, [status])

  // Auto-scroll console to bottom
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [logs])

  const [localDeployPath, setLocalDeployPath] = useState(config.DEPLOY_PATH || '')
  
  const handleBrowse = async () => {
    if (window.electronAPI) {
      const selected = await window.electronAPI.openFolderDialog()
      if (selected) {
        setLocalDeployPath(selected)
        setField('DEPLOY_PATH', selected)
      }
    }
  }

  const deployPath = localDeployPath || '/path/to/hackathon-deploy'
  const ipv4 = config.IPV4_INSTANCE || '<IPV4>'
  const domain = config.DOMAIN || 'example.com'

  const launch = (keyToUse: SshKeyInfo) => {
    const envContent = generateEnvContent(config as unknown as Record<string, string>)
    start({ deployPath, ipv4, domain, envContent, sshKeyPath: keyToUse.privateKeyPath })
  }

  const handleStart = (keyToUse: SshKeyInfo | null = selectedSshKey) => {
    if (!keyToUse) {
      sshSelectorRef.current?.openModal()
      return
    }

    // What steps 2 and 3 have not provided yet. Said once, before the transfer:
    // afterwards the stack is up and the blanks only show as runtime failures.
    const gaps = collectPreDeployGaps({ config, isManualChecked, isRunDone, isEn })
    if (gaps.length > 0) {
      setPendingStart({ key: keyToUse, gaps })
      return
    }

    launch(keyToUse)
  }

  const isRunning = status === 'running' || status === 'paused_for_dialog'
  const isFinished = status === 'completed' || status === 'error' || status === 'cancelled'
  /**
   * A deployment that succeeded earlier in this session, on a tab that has
   * since been remounted: the hook is back to `idle`, the session is not.
   */
  const deployedThisSession = status === 'idle' && isRunDone('deploy')
  const succeeded = status === 'completed' || deployedThisSession
  // Nothing to read in a console that reported success — the badge says it.
  const showConsole = status !== 'completed'

  const statusKey = `step6.auto.status.${status}` as string
  const statusText = t(statusKey)

  return (
    <>
      <div className="card">
        <div className="card-title">
          <Terminal size={16} color="var(--color-primary-text)" />
          {t('step6.auto.title')}
        </div>

        {/* Deploy path selector */}
        <div className="deploy-path-selector" style={{ marginBottom: 'var(--space-3)' }}>
          <label className="form-label" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
            {t('step6.auto.deployPath')}
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              className="form-input"
              type="text"
              value={localDeployPath}
              onChange={(e) => {
                setLocalDeployPath(e.target.value)
                setField('DEPLOY_PATH', e.target.value)
              }}
              placeholder="/path/to/hackathon-deploy"
              style={{ flex: 1 }}
              id="input-deploy-path"
            />
            <button
              className="btn btn-secondary"
              onClick={handleBrowse}
              id="btn-deploy-browse"
              title={t('step6.auto.browse')}
            >
              <FolderOpen size={16} />
            </button>
          </div>
        </div>

        {/* SSH key selector */}
        <SshKeySelector
          ref={sshSelectorRef}
          label={isEn ? 'Authentication SSH key' : 'Clé SSH d\'authentification'}
          style={{ marginBottom: 'var(--space-4)' }}
        />

        {/* Console output — hidden once the deployment has succeeded */}
        {showConsole && (
          <div className="deploy-console" ref={consoleRef}>
            {logs.length === 0 && status === 'idle' && (
              <span className="deploy-console-placeholder">
                {t('step6.auto.status.idle')}
              </span>
            )}
            {logs.map((log) => (
              <div key={log.id} className={`deploy-log-line ${log.status}`}>
                {getStatusIcon(log.status)}
                <span className="deploy-log-text">{log.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div className="deploy-progress-bar">
          <div
            className={`deploy-progress-fill ${isFinished ? status : ''}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status + Path info */}
        <div className="deploy-status-row">
          {isFinished && (
            <span className={`deploy-status-badge ${status}`}>
              {getGlobalStatusIcon(status)}
              {statusText}
            </span>
          )}
          {deployedThisSession && (
            <span className="deploy-status-badge completed">
              <CheckCircle2 size={16} />
              {t('step6.auto.status.completed')}
            </span>
          )}
          {!isFinished && !deployedThisSession && (
            <span className="deploy-path-label">{t('step6.auto.pathLabel')} : {deployPath}</span>
          )}
        </div>

        {/* Action button */}
        <div className="deploy-action-bar">
          {isRunning ? (
            <button
              className="btn deploy-btn-cancel"
              onClick={cancel}
              id="btn-deploy-cancel"
            >
              <X size={16} />
              {t('step6.auto.btnCancel')}
            </button>
          ) : (
            <button
              className="btn deploy-btn-start"
              onClick={() => handleStart()}
              id="btn-deploy-start"
            >
              {isFinished || deployedThisSession ? <Rocket size={16} /> : <Upload size={16} />}
              {succeeded ? t('step6.auto.btnRestart') : t('step6.auto.btnStart')}
            </button>
          )}
        </div>
      </div>

      {/* Explanatory card */}
      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <div className="card-title">
          <Info size={16} color="var(--color-primary-text)" />
          {t('step6.auto.info.title')}
        </div>
        <p className="step-description" style={{ fontSize: 'var(--font-size-sm)' }}>
          {t('step6.auto.info.desc')}
        </p>
        <IconRowList
          className="icon-row-list--spaced"
          items={[
            { key: 'transfer', icon: <Upload size={16} />, text: `1. ${t('step6.auto.info.step1')}` },
            { key: 'nginx', icon: <Globe size={16} />, text: `2. ${t('step6.auto.info.step2')}` },
            { key: 'database', icon: <Database size={16} />, text: `3. ${t('step6.auto.info.step3')}` },
            { key: 'docker', icon: <Rocket size={16} />, text: `4. ${t('step6.auto.info.step4')}` },
          ]}
        />
      </div>

      {/* Unfinished steps, raised before the transfer starts */}
      {pendingStart && (
        <PreDeployWarning
          gaps={pendingStart.gaps}
          isEn={isEn}
          onCancel={() => setPendingStart(null)}
          onProceed={() => {
            const { key } = pendingStart
            setPendingStart(null)
            launch(key)
          }}
        />
      )}

      {/* Dialog overlay */}
      {pendingDialog && (
        <DeployDialog
          dialog={pendingDialog}
          onRespond={respondToDialog}
        />
      )}
    </>
  )
}
