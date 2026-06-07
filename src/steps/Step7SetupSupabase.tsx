import { useState } from 'react'
import { Database, Check, Copy, Play } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { useApp } from '../context/AppContext'

const SQL_COMMANDS = `GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon,
    authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon,
    authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO
    postgres, anon, authenticated, service_role;`

function HelpContent() {
  const { state } = useApp()
  const isEn = state.language === 'en'
  return <>
    <h3><Database size={15} /> {isEn ? 'Activating Realtime' : 'Activer le Realtime'}</h3>
    <ol>
      <li>{isEn ? 'In Supabase, go to Table Editor' : 'Dans Supabase, allez dans Table Editor'}</li>
      <li>{isEn ? 'Click on the "Announcement" table' : 'Cliquez sur la table "Announcement"'}</li>
      <li>{isEn ? 'Click "Enable Realtime" at the top right' : 'Cliquez "Enable Realtime" en haut à droite'}</li>
      <li>{isEn ? 'Confirm the action' : 'Confirmez l\'action'}</li>
    </ol>
    <h3>{isEn ? 'Injecting SQL' : 'Injecter le SQL'}</h3>
    <ol>
      <li>{isEn ? 'Go to SQL Editor in Supabase' : 'Allez dans SQL Editor dans Supabase'}</li>
      <li>{isEn ? 'Paste the SQL commands from this step into the central console' : 'Collez les commandes SQL de cette étape dans la console centrale'}</li>
      <li>{isEn ? 'Click the green "Run" button at the bottom right' : 'Cliquez le bouton vert "Run" en bas à droite'}</li>
    </ol>
    <h3>{isEn ? 'Enabling Data API' : 'Activer la Data API'}</h3>
    <ol>
      <li>{isEn ? 'Project Settings > Data API' : 'Project Settings > Data API'}</li>
      <li>{isEn ? 'Enable the Data API' : 'Activez la Data API'}</li>
      <li>{isEn ? 'In Exposed Schemas, add "public"' : 'Dans Exposed Schemas, ajoutez "public"'}</li>
      <li>{isEn ? 'Save' : 'Sauvegardez'}</li>
    </ol>
    <h3>{isEn ? 'Disable email confirmation' : 'Désactiver la confirmation email'}</h3>
    <ol>
      <li>{isEn ? 'Authentication > Sign In / Providers' : 'Authentication > Sign In / Providers'}</li>
      <li>{isEn ? 'Disable "Confirm email"' : 'Désactivez "Confirm email"'}</li>
    </ol>
  </>
}

function SqlBlock({ sql }: { sql: string }) {
  const { t } = useApp()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="sql-block">
      <div className="sql-block-header">
        <span className="sql-lang-badge">SQL</span>
        <button className={`btn btn-copy ${copied ? 'copied' : ''}`} onClick={handleCopy}>
          {copied
            ? <><Check size={11} />{t('btn.copied')}</>
            : <><Copy size={11} />{t('btn.copy')}</>
          }
        </button>
      </div>
      <div className="sql-block-content">{sql}</div>
    </div>
  )
}

function DockerBlock({ command }: { command: string }) {
  const { t } = useApp()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="command-block">
      <Play size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
      <span className="command-text">{command}</span>
      <button className={`btn btn-copy ${copied ? 'copied' : ''}`} onClick={handleCopy} style={{ flexShrink: 0 }}>
        {copied
          ? <><Check size={11} />{t('btn.copied')}</>
          : <><Copy size={11} />{t('btn.copy')}</>
        }
      </button>
    </div>
  )
}

export function Step7SetupSupabase() {
  const { t } = useApp()

  const checklist = [
    { key: 'realtime', title: t('step7.realtime.title'), desc: t('step7.realtime.desc') },
    { key: 'dataApi', title: t('step7.dataApi.title'), desc: t('step7.dataApi.desc') },
    { key: 'auth', title: t('step7.auth.title'), desc: t('step7.auth.desc') },
  ]

  return (
    <WizardLayout
      title={t('step7.title')}
      stepBadge={`${t('nav.step')} 7 — ${t('step7.label')}`}
      description={t('step7.desc')}
      helpContent={<HelpContent />}
    >
      {/* SQL Block */}
      <div className="card">
        <div className="card-title"><Database size={16} color="var(--color-primary)" />{t('step7.sql.title')}</div>
        <SqlBlock sql={SQL_COMMANDS} />
      </div>

      {/* Checklist */}
      <div className="card">
        <div className="card-title"><Check size={16} color="var(--color-primary)" />Actions Supabase</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {checklist.map(item => (
            <div key={item.key} className="info-box info">
              <div className="info-box-icon" style={{ marginTop: '0' }}>
                <Database size={15} />
              </div>
              <div className="info-box-text">
                <div className="info-box-title">{item.title}</div>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Docker restart */}
      <div className="card">
        <div className="card-title"><Play size={16} color="var(--color-primary)" />{t('step7.docker.title')}</div>
        <p className="text-sm text-muted" style={{ marginBottom: '12px' }}>{t('step7.docker.desc')}</p>
        <DockerBlock command="docker restart discord_bot" />
      </div>
    </WizardLayout>
  )
}
