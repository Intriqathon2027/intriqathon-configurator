import { useState } from 'react'
import { Database, Mail, Globe, Server, Info, AlertTriangle, Check, Copy, Play, Cpu, MemoryStick, HardDrive, Monitor } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { ServiceConfigBlock } from '../components/ui/ServiceConfigBlock'
import { FormField } from '../components/ui/FormField'
import { CopyRow } from '../components/ui/CopyBlock'
import { useApp } from '../context/AppContext'

type Status = 'idle' | 'running' | 'done' | 'error'

function HelpContent() {
  const { state } = useApp()
  const isEn = state.language === 'en'

  if (isEn) return (
    <>
      <h3><Database size={15} /> Supabase</h3>
      <div className="help-block">
        <p><strong>1. URL & Core Keys:</strong></p>
        <p className="step-schema"><code>Settings (gear icon, bottom left)</code> ➔ <code>API</code></p>
        <p className="help-note">Copy the Project URL, the `anon` public key, and the `service_role` secret key.</p>
        
        <p><strong>2. Database Connection:</strong></p>
        <p className="step-schema"><code>Connect button (top)</code> ➔ <code>ORMs tab</code></p>
        <p className="help-note">Use <strong>Transaction mode (port 6543)</strong> for DATABASE_URL and <strong>Session mode (port 5432)</strong> for DIRECT_URL.</p>
        
        <p><strong>3. Storage Buckets (S3):</strong></p>
        <p className="step-schema"><code>Storage (left sidebar)</code> ➔ <code>Buckets</code> ➔ <code>New Bucket</code></p>
        <p className="help-note">Name it <strong>public_files</strong>, check <strong>Public bucket</strong>. Then create 4 folders inside: <code>evaluations</code>, <code>submissions</code>, <code>users</code>, and <code>annonces</code>.</p>
      </div>

      <h3><Server size={15} /> Scaleway</h3>
      <div className="help-block">
        <p><strong>1. Instance Creation:</strong></p>
        <p className="step-schema"><code>Console</code> ➔ <code>Compute</code> ➔ <code>Instances</code> ➔ <code>Create an Instance</code></p>
        
        <p><strong>2. Mandatory Settings:</strong></p>
        <ul className="help-note">
          <li><strong>Image:</strong> Ubuntu 24.04 LTS</li>
          <li><strong>Specs:</strong> Minimum 4 vCPU & 16 GB RAM (e.g., PRO2-M)</li>
          <li><strong>Storage:</strong> Block storage 10GB+</li>
          <li><strong>Network:</strong> Enable Public IPv4</li>
          <li><strong>Security:</strong> Add your SSH Public Key (<code>cat ~/.ssh/id_ed25519.pub</code>)</li>
        </ul>
      </div>

      <h3><Globe size={15} /> Spaceship</h3>
      <div className="help-block">
        <p><strong>1. DNS Management:</strong></p>
        <p className="step-schema"><code>Launchpad</code> ➔ <code>Domain Portfolio</code> ➔ <code>click your domain</code> ➔ <code>Advanced DNS</code></p>
        <p className="help-note">Create A records pointing to your Scaleway IPv4, and add MX + TXT records provided by Resend for email.</p>
      </div>

      <h3><Mail size={15} /> Resend</h3>
      <div className="help-block">
        <p><strong>1. Add Sending Domain:</strong></p>
        <p className="step-schema"><code>Domains (left menu)</code> ➔ <code>Add Domain</code></p>
        <p className="help-note">Use a subdomain like <code>mail.yourdomain.com</code>.</p>
        
        <p><strong>2. Verify with Spaceship:</strong></p>
        <p className="step-schema"><code>Resend DNS values</code> ➔ <code>Spaceship Advanced DNS</code></p>
        <p className="help-note">Copy exactly the MX and TXT records Resend gives you into Spaceship to verify ownership.</p>
      </div>
    </>
  )

  return (
    <>
      <h3><Database size={15} /> Supabase</h3>
      <div className="help-block">
        <p><strong>1. URL & Clés Principales :</strong></p>
        <p className="step-schema"><code>Settings (roue crantée, bas gauche)</code> ➔ <code>API</code></p>
        <p className="help-note">Copiez l'URL du projet, la clé publique `anon` et la clé secrète `service_role`.</p>
        
        <p><strong>2. Connexion Base de Données :</strong></p>
        <p className="step-schema"><code>Bouton Connect (en haut)</code> ➔ <code>Onglet ORMs</code></p>
        <p className="help-note">Utilisez le mode <strong>Transaction (port 6543)</strong> pour DATABASE_URL et le mode <strong>Session (port 5432)</strong> pour DIRECT_URL.</p>
        
        <p><strong>3. Storage Buckets (S3) :</strong></p>
        <p className="step-schema"><code>Storage (barre de navigation gauche)</code> ➔ <code>Buckets</code> ➔ <code>New Bucket</code></p>
        <p className="help-note">Nommez-le <strong>public_files</strong>, cochez <strong>Public bucket</strong>. À l'intérieur, créez les 4 dossiers : <code>evaluations</code>, <code>submissions</code>, <code>users</code>, et <code>annonces</code>.</p>
      </div>

      <h3><Server size={15} /> Scaleway</h3>
      <div className="help-block">
        <p><strong>1. Création de l'Instance :</strong></p>
        <p className="step-schema"><code>Console</code> ➔ <code>Compute</code> ➔ <code>Instances</code> ➔ <code>Create an Instance</code></p>
        
        <p><strong>2. Paramètres Obligatoires :</strong></p>
        <ul className="help-note">
          <li><strong>Image :</strong> Ubuntu 24.04 LTS</li>
          <li><strong>Ressources :</strong> Minimum 4 vCPU & 16 Go RAM</li>
          <li><strong>Stockage :</strong> Block storage de 10 Go ou plus</li>
          <li><strong>Réseau :</strong> Activer une IPv4 publique</li>
          <li><strong>Sécurité :</strong> Ajouter votre clé publique SSH (ex: <code>cat ~/.ssh/id_ed25519.pub</code>)</li>
        </ul>
      </div>

      <h3><Globe size={15} /> Spaceship</h3>
      <div className="help-block">
        <p><strong>1. Gestion DNS :</strong></p>
        <p className="step-schema"><code>Launchpad</code> ➔ <code>Domain Portfolio</code> ➔ <code>cliquez votre domaine</code> ➔ <code>Advanced DNS</code></p>
        <p className="help-note">Créez les enregistrements A vers l'IPv4 de Scaleway, et ajoutez les enregistrements MX + TXT fournis par Resend pour l'email.</p>
      </div>

      <h3><Mail size={15} /> Resend</h3>
      <div className="help-block">
        <p><strong>1. Ajouter le domaine d'envoi :</strong></p>
        <p className="step-schema"><code>Domains (menu gauche)</code> ➔ <code>Add Domain</code></p>
        <p className="help-note">Utilisez un sous-domaine dédié comme <code>mail.votredomaine.com</code>.</p>
        
        <p><strong>2. Vérification DNS :</strong></p>
        <p className="step-schema"><code>Valeurs fournies par Resend</code> ➔ <code>Spaceship Advanced DNS</code></p>
        <p className="help-note">Copiez scrupuleusement les champs MX et TXT affichés par Resend dans l'interface de Spaceship, puis validez.</p>
      </div>
    </>
  )
}

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
      helpContent={<HelpContent />}
    >
      <div className="api-config-list">
        
        {/* Supabase */}
        <ServiceConfigBlock
          stepNumber={1}
          serviceName="SUPABASE"
          serviceIcon={<Database size={18} color="var(--color-primary)" />}
          description={t('apiConfig.supabase.desc')}
          status={supabaseStatus}
          onStart={() => handleStart('Supabase')}
          onCancel={() => handleCancel('Supabase')}
          btnStartLabel={t('apiConfig.btnStart')}
          btnCancelLabel={t('apiConfig.btnCancel')}
          statusLabels={statusLabels}
        >
          <details className="manual-config-details">
            <summary>{t('apiConfig.manualConfig')}</summary>
            <div className="form-section">
              <FormField id="supabase-url" label={t('apiConfig.supabase.url')} envKey="SUPABASE_URL" value={config.SUPABASE_URL} onChange={v => setField('SUPABASE_URL', v)} placeholder="https://xyz.supabase.co" hint={t('apiConfig.supabase.url.hint')} />
              <FormField id="supabase-anon" label={t('apiConfig.supabase.anonKey')} envKey="SUPABASE_ANON_KEY" value={config.SUPABASE_ANON_KEY} onChange={v => setField('SUPABASE_ANON_KEY', v)} placeholder="eyJhbG..." hint={t('apiConfig.supabase.anonKey.hint')} multiline />
              <FormField id="supabase-service" label={t('apiConfig.supabase.serviceKey')} envKey="SUPABASE_SERVICE_ROLE_KEY" value={config.SUPABASE_SERVICE_ROLE_KEY} onChange={v => setField('SUPABASE_SERVICE_ROLE_KEY', v)} placeholder="eyJhbG..." hint={t('apiConfig.supabase.serviceKey.hint')} type="password" multiline />
              <FormField id="database-url" label={t('apiConfig.supabase.databaseUrl')} envKey="DATABASE_URL" value={config.DATABASE_URL} onChange={v => setField('DATABASE_URL', v)} placeholder="postgresql://..." hint={t('apiConfig.supabase.databaseUrl.hint')} type="password" multiline />
              <FormField id="direct-url" label={t('apiConfig.supabase.directUrl')} envKey="DIRECT_URL" value={config.DIRECT_URL} onChange={v => setField('DIRECT_URL', v)} placeholder="postgresql://..." hint={t('apiConfig.supabase.directUrl.hint')} type="password" multiline />

            <div>
              <div style={{ fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={16} color="var(--color-primary)" />
                {t('step7.sql.title')}
              </div>
              <SqlBlock sql={SQL_COMMANDS} />
            </div>

            <div>
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

            <div>
              <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={16} color="var(--color-primary)" />
                {t('step7.docker.title')}
              </div>
              <p className="text-sm text-muted" style={{ marginBottom: '12px' }}>{t('step7.docker.desc')}</p>
              <DockerBlock command="docker restart discord_bot" />
            </div>
            </div>
          </details>
        </ServiceConfigBlock>

        {/* Scaleway */}
        <ServiceConfigBlock
          stepNumber={2}
          serviceName="SCALEWAY"
          serviceIcon={<Server size={18} color="var(--color-primary)" />}
          description={t('apiConfig.scaleway.desc')}
          status={scalewayStatus}
          onStart={() => handleStart('Scaleway')}
          onCancel={() => handleCancel('Scaleway')}
          btnStartLabel={t('apiConfig.btnStart')}
          btnCancelLabel={t('apiConfig.btnCancel')}
          statusLabels={statusLabels}
        >
          <details className="manual-config-details">
            <summary>{t('apiConfig.manualConfig')}</summary>
            <div className="form-section">
              <FormField id="ipv4" label={t('apiConfig.spaceship.ipv4')} envKey="IPV4_INSTANCE" value={config.IPV4_INSTANCE} onChange={v => setField('IPV4_INSTANCE', v)} placeholder="198.51.100.1" hint={t('apiConfig.spaceship.ipv4.hint')} />

              <div style={{ fontWeight: 600, marginBottom: '12px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          </details>
        </ServiceConfigBlock>

        {/* Spaceship */}
        <ServiceConfigBlock
          stepNumber={3}
          serviceName="SPACESHIP"
          serviceIcon={<Globe size={18} color="var(--color-primary)" />}
          description={t('apiConfig.spaceship.desc')}
          status={spaceshipStatus}
          onStart={() => handleStart('Spaceship')}
          onCancel={() => handleCancel('Spaceship')}
          btnStartLabel={t('apiConfig.btnStart')}
          btnCancelLabel={t('apiConfig.btnCancel')}
          statusLabels={statusLabels}
        >
          <details className="manual-config-details">
            <summary>{t('apiConfig.manualConfig')}</summary>
            <div className="form-section">
              <div>
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
          </details>
        </ServiceConfigBlock>

        {/* Resend */}
        <ServiceConfigBlock
          stepNumber={4}
          serviceName="RESEND"
          serviceIcon={<Mail size={18} color="var(--color-primary)" />}
          description={t('apiConfig.resend.desc')}
          status={resendStatus}
          onStart={() => handleStart('Resend')}
          onCancel={() => handleCancel('Resend')}
          btnStartLabel={t('apiConfig.btnStart')}
          btnCancelLabel={t('apiConfig.btnCancel')}
          statusLabels={statusLabels}
        >
          <details className="manual-config-details">
            <summary>{t('apiConfig.manualConfig')}</summary>
            <div className="form-section">
              <div>
              <div style={{ fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} color="var(--color-primary)" />
                {t('step4.subdomain')}
              </div>
              <CopyRow label={t('step4.subdomain')} content={mailSubdomain} />
            </div>

              <FormField id="from-email" label={t('apiConfig.supabase.fromEmail')} envKey="FROM_EMAIL" value={config.FROM_EMAIL} onChange={v => setField('FROM_EMAIL', v)} placeholder="Hackathon Team <onboarding@mail.domain.com>" hint={t('apiConfig.supabase.fromEmail.hint')} />
              <FormField id="allowed-emails" label={t('apiConfig.supabase.allowedEmails')} envKey="ALLOWED_EMAILS" value={config.ALLOWED_EMAILS} onChange={v => setField('ALLOWED_EMAILS', v)} placeholder="*" hint={t('apiConfig.supabase.allowedEmails.hint')} />
            </div>
          </details>
        </ServiceConfigBlock>

      </div>
    </WizardLayout>
  )
}
