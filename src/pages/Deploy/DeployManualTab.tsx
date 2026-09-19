import { FileDown, Download, Terminal } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { CommandBlock } from '../../components/ui/CopyBlock'
import { ManualCheck } from '../../components/ui/ManualCheck'
import { useApp } from '../../context/AppContext'

import { generateEnvContent } from '../../utils/deploy'

export function DeployManualTab() {
  const { t, config, state } = useApp()
  const deployPath = config.DEPLOY_PATH || '/path/to/hackathon-deploy'
  const ipv4 = config.IPV4_INSTANCE || '<IPV4>'
  const isEn = state.language === 'en'

  const envContent = generateEnvContent(config as unknown as Record<string, string>)

  const downloadEnv = async () => {
    if (window.electronAPI) {
      await window.electronAPI.saveEnvFile(envContent)
    } else {
      const blob = new Blob([envContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '.env'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  // Colorize the env preview
  const colorizedEnv = envContent.split('\n').map((line, i) => {
    if (line.startsWith('#')) return <span key={i} className="env-comment">{line}{'\n'}</span>
    if (line.includes('=')) {
      const [key, ...rest] = line.split('=')
      const value = rest.join('=')
      return (
        <span key={i}>
          <span className="env-key">{key}</span>
          <span className="env-sep">=</span>
          <span className="env-value">{value}</span>{'\n'}
        </span>
      )
    }
    return <span key={i}>{line}{'\n'}</span>
  })

  return (
    <>
      {/* .env preview + download */}
      <Card icon={<FileDown size={16} color="var(--color-primary-text)" />} title={t('step6.preview')}>
        <div className="env-preview">{colorizedEnv}</div>
        <div className="download-section">
          <div className="download-icon">
            <Download size={22} />
          </div>
          <div className="download-text">
            <div className="download-title">{t('btn.downloadEnv')}</div>
            <div className="download-subtitle">{isEn ? 'Places the .env file in your hackathon-deploy folder' : 'Placez le fichier .env dans le dossier hackathon-deploy'}</div>
          </div>
          <button className="btn btn-primary" onClick={downloadEnv} id="btn-download-env">
            <Download size={16} />
            {t('btn.downloadEnv')}
          </button>
        </div>
      </Card>

      {/* Deployment commands — one stack, spaced by the list, so the blocks
          no longer each carry a margin of their own. */}
      <Card
        icon={<Terminal size={16} color="var(--color-primary-text)" />}
        title={t('step6.commands.title')}
        style={{ marginTop: 'var(--space-5)' }}
      >
        <div className="command-stack">
          <CommandBlock label={t('step6.cmd.cd')} command={`cd ${deployPath}`} />

          <CommandBlock
            label={<span className="os-chip">{t('step6.label.mac')}</span>}
            command={`rsync -avz --progress ./ root@${ipv4}:~/hackathon-deploy`}
          />

          <CommandBlock
            label={<span className="os-chip">{t('step6.label.windows')}</span>}
            command={`scp -r ./ root@${ipv4}:~/hackathon-deploy`}
          />

          <CommandBlock label={t('step6.cmd.ssh')} command={`ssh root@${ipv4}`} />
          <CommandBlock label={t('step6.cmd.cdRemote')} command="cd hackathon-deploy" />
          <CommandBlock label={t('step6.cmd.chmod')} command="chmod +x install_hackathon.sh" />
          <CommandBlock label={t('step6.cmd.install')} command="./install_hackathon.sh" />

          {/* Nothing else records a deployment run from a terminal: the
              automatic tab validates the step when it succeeds, and this is
              the manual route's equivalent. */}
          <ManualCheck
            checkKey="deploy-manual"
            label={isEn ? 'The deployment has been carried out' : 'Le déploiement a été effectué'}
          />
        </div>
      </Card>
    </>
  )
}
