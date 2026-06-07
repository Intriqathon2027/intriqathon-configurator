import { FileDown, Download, Terminal } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { CommandBlock } from '../components/ui/CopyBlock'
import { useApp } from '../context/AppContext'

function generateEnvContent(config: Record<string, string>): string {
  return `DOMAIN=${config.DOMAIN}

# Supabase
SUPABASE_URL=${config.SUPABASE_URL}
SUPABASE_ANON_KEY=${config.SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${config.SUPABASE_SERVICE_ROLE_KEY}

# Database
DATABASE_URL=${config.DATABASE_URL}
DIRECT_URL=${config.DIRECT_URL}

# Supabase S3
S3_ACCESS_KEY_ID=${config.S3_ACCESS_KEY_ID}
S3_SECRET_ACCESS_KEY=${config.S3_SECRET_ACCESS_KEY}

# Discord Keys
DISCORD_CLIENT_ID=${config.DISCORD_CLIENT_ID}
OAUTH2_DISCORD_CLIENT_SECRET=${config.OAUTH2_DISCORD_CLIENT_SECRET}

# Github Keys
GITHUB_CLIENT_ID=${config.GITHUB_CLIENT_ID}
OAUTH2_GITHUB_CLIENT_SECRET=${config.OAUTH2_GITHUB_CLIENT_SECRET}

# Email Resend
RESEND_API_KEY=${config.RESEND_API_KEY}
FROM_EMAIL=${config.FROM_EMAIL}
ALLOWED_EMAILS=${config.ALLOWED_EMAILS}

# Discord Bot
CLIENT_ID=${config.CLIENT_ID}
BOT_TOKEN=${config.BOT_TOKEN}
DEV_SERVER_ID=${config.DEV_SERVER_ID}
GUILD_ID=${config.GUILD_ID}
`
}

export function Step6Generation() {
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
          <span style={{ color: '#718096' }}>=</span>
          <span className="env-value">{value}</span>{'\n'}
        </span>
      )
    }
    return <span key={i}>{line}{'\n'}</span>
  })

  return (
    <WizardLayout
      title={t('step6.title')}
      stepBadge={`${t('nav.step')} 6 — ${t('step6.label')}`}
      description={t('step6.desc')}
    >
      {/* .env preview + download */}
      <div className="card">
        <div className="card-title"><FileDown size={16} color="var(--color-primary)" />{t('step6.preview')}</div>
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
      </div>

      {/* Deployment commands */}
      <div className="card">
        <div className="card-title"><Terminal size={16} color="var(--color-primary)" />{t('step6.commands.title')}</div>

        <CommandBlock label={t('step6.cmd.cd')} command={`cd ${deployPath}`} />

        <div style={{ marginBottom: '8px', marginTop: '16px' }}>
          <div className="command-label" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '1px 8px', borderRadius: '4px', fontSize: '11px' }}>{t('step6.label.mac')}</span>
          </div>
          <CommandBlock
            command={`rsync -avz --progress ./ root@${ipv4}:~/hackathon-deploy`}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div className="command-label" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '1px 8px', borderRadius: '4px', fontSize: '11px' }}>{t('step6.label.windows')}</span>
          </div>
          <CommandBlock
            command={`scp -r ./ root@${ipv4}:~/hackathon-deploy`}
          />
        </div>

        <CommandBlock label={t('step6.cmd.ssh')} command={`ssh root@${ipv4}`} />
        <div style={{ marginTop: '8px' }}>
          <CommandBlock label={t('step6.cmd.cdRemote')} command="cd hackathon-deploy" />
        </div>
        <div style={{ marginTop: '8px' }}>
          <CommandBlock label={t('step6.cmd.chmod')} command="chmod +x install_hackathon.sh" />
        </div>
        <div style={{ marginTop: '8px' }}>
          <CommandBlock label={t('step6.cmd.install')} command="./install_hackathon.sh" />
        </div>
      </div>
    </WizardLayout>
  )
}
