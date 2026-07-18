import { useState } from 'react'
import { Database, Mail, Globe, Server, Info, AlertTriangle, Check, Copy, Play, Cpu, MemoryStick, HardDrive, Monitor } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { ServiceConfigBlock } from '../components/ui/ServiceConfigBlock'
import { FormField } from '../components/ui/FormField'
import { CopyRow } from '../components/ui/CopyBlock'
import { useApp } from '../context/AppContext'

type Status = 'idle' | 'running' | 'done' | 'error'

const SQL_COMMANDS = `GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon,
    authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon,
    authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO
    postgres, anon, authenticated, service_role;`

function SqlBlock({ sql }: { sql: string }) {
  const { t } = useApp()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="sql-block" style={{ marginTop: '16px', marginBottom: '16px' }}>
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
    <div className="command-block" style={{ marginTop: '16px' }}>
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

export function ApiConfiguration() {
  const { t, config, setField } = useApp()

  const domain = config.DOMAIN || '<DOMAIN>'
  const ipv4 = config.IPV4_INSTANCE || '<IPV4_INSTANCE>'
  const mailSubdomain = `mail.${domain}`

  const dnsRecords = [
    { type: 'TXT', host: `_dmarc.mail.${domain}`, answer: 'v=DMARC1;p=none;', ttl: 'Auto' },
    { type: 'A', host: domain, answer: ipv4, ttl: 'Auto' },
    { type: 'A', host: `config.${domain}`, answer: ipv4, ttl: 'Auto' },
  ]

  const checklist = [
    { key: 'realtime', title: t('step7.realtime.title'), desc: t('step7.realtime.desc') },
    { key: 'dataApi', title: t('step7.dataApi.title'), desc: t('step7.dataApi.desc') },
    { key: 'auth', title: t('step7.auth.title'), desc: t('step7.auth.desc') },
  ]

  const specs = [
    { key: 'cpu', icon: <Cpu size={15} />, label: 'CPU', value: t('step1.spec.cpu') },
    { key: 'ram', icon: <MemoryStick size={15} />, label: 'RAM', value: t('step1.spec.ram') },
    { key: 'os', icon: <Monitor size={15} />, label: 'OS', value: t('step1.spec.os') },
    { key: 'storage', icon: <HardDrive size={15} />, label: 'Stockage', value: t('step1.spec.storage') },
  ]

  // For now, hardcode statuses to 'idle' since automation isn't implemented
  const [supabaseStatus] = useState<Status>('idle')
  const [spaceshipStatus] = useState<Status>('idle')
  const [scalewayStatus] = useState<Status>('idle')
  const [resendStatus] = useState<Status>('idle')

  const statusLabels = {
    done: t('apiConfig.status.done'),
    running: t('apiConfig.status.running'),
    error: t('apiConfig.status.error'),
  }

  const handleStart = (service: string) => {
    console.log(`Starting ${service} config...`)
  }

  const handleCancel = (service: string) => {
    console.log(`Cancelling ${service} config...`)
  }

  return (
    <WizardLayout
      title={t('apiConfig.title')}
      description={t('apiConfig.desc')}
    >
      <div className="api-config-list">
        
        {/* Supabase */}
        <ServiceConfigBlock
          stepNumber={1}
          serviceName="SUPABASE"
          serviceIcon={<Database size={18} />}
          description={t('apiConfig.supabase.desc')}
          status={supabaseStatus}
          onStart={() => handleStart('Supabase')}
          onCancel={() => handleCancel('Supabase')}
          btnStartLabel={t('apiConfig.btnStart')}
          btnCancelLabel={t('apiConfig.btnCancel')}
          statusLabels={statusLabels}
        >
          <div className="form-section">
            <FormField id="supabase-url" label={t('apiConfig.supabase.url')} envKey="SUPABASE_URL" value={config.SUPABASE_URL} onChange={v => setField('SUPABASE_URL', v)} placeholder="https://xyz.supabase.co" hint={t('apiConfig.supabase.url.hint')} />
            <div className="form-row">
              <FormField id="supabase-anon" label={t('apiConfig.supabase.anonKey')} envKey="SUPABASE_ANON_KEY" value={config.SUPABASE_ANON_KEY} onChange={v => setField('SUPABASE_ANON_KEY', v)} placeholder="eyJhbG..." hint={t('apiConfig.supabase.anonKey.hint')} />
              <FormField id="supabase-service" label={t('apiConfig.supabase.serviceKey')} envKey="SUPABASE_SERVICE_ROLE_KEY" value={config.SUPABASE_SERVICE_ROLE_KEY} onChange={v => setField('SUPABASE_SERVICE_ROLE_KEY', v)} placeholder="eyJhbG..." hint={t('apiConfig.supabase.serviceKey.hint')} type="password" />
            </div>
            <div className="form-row">
              <FormField id="database-url" label={t('apiConfig.supabase.databaseUrl')} envKey="DATABASE_URL" value={config.DATABASE_URL} onChange={v => setField('DATABASE_URL', v)} placeholder="postgresql://..." hint={t('apiConfig.supabase.databaseUrl.hint')} type="password" />
              <FormField id="direct-url" label={t('apiConfig.supabase.directUrl')} envKey="DIRECT_URL" value={config.DIRECT_URL} onChange={v => setField('DIRECT_URL', v)} placeholder="postgresql://..." hint={t('apiConfig.supabase.directUrl.hint')} type="password" />
            </div>

            <div style={{ marginTop: '24px' }}>
              <div style={{ fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={16} color="var(--color-primary)" />
                {t('step7.sql.title')}
              </div>
              <SqlBlock sql={SQL_COMMANDS} />
            </div>

            <div style={{ marginTop: '24px' }}>
              <div style={{ fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} color="var(--color-primary)" />
                Actions Supabase
              </div>
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

            <div style={{ marginTop: '24px' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={16} color="var(--color-primary)" />
                {t('step7.docker.title')}
              </div>
              <p className="text-sm text-muted" style={{ marginBottom: '12px' }}>{t('step7.docker.desc')}</p>
              <DockerBlock command="docker restart discord_bot" />
            </div>
          </div>
        </ServiceConfigBlock>

        {/* Spaceship */}
        <ServiceConfigBlock
          stepNumber={2}
          serviceName="SPACESHIP"
          serviceIcon={<Globe size={18} />}
          description={t('apiConfig.spaceship.desc')}
          status={spaceshipStatus}
          onStart={() => handleStart('Spaceship')}
          onCancel={() => handleCancel('Spaceship')}
          btnStartLabel={t('apiConfig.btnStart')}
          btnCancelLabel={t('apiConfig.btnCancel')}
          statusLabels={statusLabels}
        >
          <div className="form-section">
            <FormField id="ipv4" label={t('apiConfig.spaceship.ipv4')} envKey="IPV4_INSTANCE" value={config.IPV4_INSTANCE} onChange={v => setField('IPV4_INSTANCE', v)} placeholder="198.51.100.1" hint={t('apiConfig.spaceship.ipv4.hint')} />

            <div style={{ marginTop: '24px' }}>
              <div style={{ fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={16} color="var(--color-primary)" />
                {t('step4.dns.title')}
              </div>
              <table className="dns-table">
                <thead>
                  <tr>
                    <th>{t('step4.dns.type')}</th>
                    <th>{t('step4.dns.host')}</th>
                    <th>{t('step4.dns.answer')}</th>
                    <th>{t('step4.dns.ttl')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {dnsRecords.map((rec, i) => (
                    <tr key={i}>
                      <td><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{rec.type}</span></td>
                      <td>{rec.host}</td>
                      <td>{rec.answer}</td>
                      <td>{rec.ttl}</td>
                      <td>
                        <button
                          className="btn btn-copy"
                          onClick={() => navigator.clipboard.writeText(`${rec.type},${rec.host},${rec.answer},${rec.ttl}`)}
                        >
                          Copier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="info-box warning" style={{ marginTop: '16px' }}>
                <AlertTriangle size={15} className="info-box-icon" />
                <div className="info-box-text">{t('step4.warning')}</div>
              </div>
            </div>
          </div>
        </ServiceConfigBlock>

        {/* Scaleway */}
        <ServiceConfigBlock
          stepNumber={3}
          serviceName="SCALEWAY"
          serviceIcon={<Server size={18} />}
          description={t('apiConfig.scaleway.desc')}
          status={scalewayStatus}
          onStart={() => handleStart('Scaleway')}
          onCancel={() => handleCancel('Scaleway')}
          btnStartLabel={t('apiConfig.btnStart')}
          btnCancelLabel={t('apiConfig.btnCancel')}
          statusLabels={statusLabels}
        >
          <div className="form-section">
            <div style={{ fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={16} color="var(--color-primary)" />
              {t('step1.specs.title')}
            </div>
            <div className="spec-list">
              {specs.map(spec => (
                <div className="spec-item" key={spec.key}>
                  <div className="spec-icon">{spec.icon}</div>
                  <div>
                    <div className="spec-label">{spec.label}</div>
                    <div className="spec-value">{spec.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ServiceConfigBlock>

        {/* Resend */}
        <ServiceConfigBlock
          stepNumber={4}
          serviceName="RESEND"
          serviceIcon={<Mail size={18} />}
          description={t('apiConfig.resend.desc')}
          status={resendStatus}
          onStart={() => handleStart('Resend')}
          onCancel={() => handleCancel('Resend')}
          btnStartLabel={t('apiConfig.btnStart')}
          btnCancelLabel={t('apiConfig.btnCancel')}
          statusLabels={statusLabels}
        >
          <div className="form-section">
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} color="var(--color-primary)" />
                {t('step4.subdomain')}
              </div>
              <CopyRow label={t('step4.subdomain')} content={mailSubdomain} />
            </div>

            <div className="form-row">
              <FormField id="from-email" label={t('apiConfig.supabase.fromEmail')} envKey="FROM_EMAIL" value={config.FROM_EMAIL} onChange={v => setField('FROM_EMAIL', v)} placeholder="Hackathon Team <onboarding@mail.domain.com>" hint={t('apiConfig.supabase.fromEmail.hint')} />
              <FormField id="allowed-emails" label={t('apiConfig.supabase.allowedEmails')} envKey="ALLOWED_EMAILS" value={config.ALLOWED_EMAILS} onChange={v => setField('ALLOWED_EMAILS', v)} placeholder="*" hint={t('apiConfig.supabase.allowedEmails.hint')} />
            </div>
          </div>
        </ServiceConfigBlock>

      </div>
    </WizardLayout>
  )
}
