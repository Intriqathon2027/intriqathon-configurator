import { useRef, useEffect } from 'react'
import { Upload, X, Rocket, CheckCircle2, AlertCircle, Ban, Terminal, Info, Globe, Database } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useDeployment } from '../../hooks/useDeployment'
import { DeployDialog } from './DeployDialog'
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

export function Step6AutoTab() {
  const { t, config } = useApp()
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

  // Auto-scroll console to bottom
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [logs])

  const deployPath = config.DEPLOY_PATH || '/path/to/hackathon-deploy'
  const ipv4 = config.IPV4_INSTANCE || '<IPV4>'
  const domain = config.DOMAIN || 'example.com'

  const handleStart = () => {
    start({ deployPath, ipv4, domain })
  }

  const isRunning = status === 'running' || status === 'paused_for_dialog'
  const isFinished = status === 'completed' || status === 'error' || status === 'cancelled'

  const statusKey = `step6.auto.status.${status}` as string
  const statusText = t(statusKey)

  return (
    <>
      <div className="card">
        <div className="card-title">
          <Terminal size={16} color="var(--color-primary)" />
          {t('step6.auto.title')}
        </div>

        {/* Console output */}
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
          {!isFinished && (
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
              onClick={handleStart}
              id="btn-deploy-start"
            >
              {isFinished ? <Rocket size={16} /> : <Upload size={16} />}
              {t('step6.auto.btnStart')}
            </button>
          )}
        </div>
      </div>

      {/* Explanatory card */}
      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <div className="card-title">
          <Info size={16} color="var(--color-primary)" />
          {t('step6.auto.info.title')}
        </div>
        <p className="step-description" style={{ fontSize: 'var(--font-size-sm)' }}>
          {t('step6.auto.info.desc')}
        </p>
        <ul className="spec-list" style={{ marginTop: 'var(--space-4)' }}>
          <li className="spec-item">
            <div className="spec-icon"><Upload size={16} /></div>
            <div className="spec-label" style={{ color: 'var(--color-text)' }}>1. {t('step6.auto.info.step1')}</div>
          </li>
          <li className="spec-item">
            <div className="spec-icon"><Globe size={16} /></div>
            <div className="spec-label" style={{ color: 'var(--color-text)' }}>2. {t('step6.auto.info.step2')}</div>
          </li>
          <li className="spec-item">
            <div className="spec-icon"><Database size={16} /></div>
            <div className="spec-label" style={{ color: 'var(--color-text)' }}>3. {t('step6.auto.info.step3')}</div>
          </li>
          <li className="spec-item">
            <div className="spec-icon"><Rocket size={16} /></div>
            <div className="spec-label" style={{ color: 'var(--color-text)' }}>4. {t('step6.auto.info.step4')}</div>
          </li>
        </ul>
      </div>

      {/* Dialog overlay */}
      {pendingDialog && (
        <DeployDialog dialog={pendingDialog} onRespond={respondToDialog} />
      )}
    </>
  )
}
