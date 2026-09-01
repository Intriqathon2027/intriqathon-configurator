import { useState } from 'react'
import { Database, Mail, Globe, Server, Info, AlertTriangle, Cpu, MemoryStick, HardDrive, Monitor } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { ServiceConfigBlock } from '../components/ui/ServiceConfigBlock'
import { FormField } from '../components/ui/FormField'
import { CopyRow } from '../components/ui/CopyBlock'
import { useApp } from '../context/AppContext'
import { FieldHelpSections } from '../components/ui/HelpSection'
import { IconRowList, type IconRowItem } from '../components/ui/IconRowList'

type Status = 'idle' | 'running' | 'done' | 'error'

function HelpContent() {
  const { state } = useApp()
  const isEn = state.language === 'en'

  if (isEn) return (
    <>
      <h3><Database size={15} /> Supabase</h3>
      <div className="help-block">
        <p><strong>Storage buckets (S3):</strong></p>
        <p className="step-schema"><code>Storage (left sidebar)</code> ➔ <code>Buckets</code> ➔ <code>New Bucket</code></p>
        <p className="help-note">Name it <strong>public_files</strong>, check <strong>Public bucket</strong>. Then create 4 folders inside: <code>evaluations</code>, <code>submissions</code>, <code>users</code>, and <code>annonces</code>. The five values below all come from this same project.</p>
      </div>
      <FieldHelpSections step={1} group="SUPABASE" />

      <h3><Server size={15} /> Scaleway</h3>
      <div className="help-block">
        <p><strong>Instance creation:</strong></p>
        <p className="step-schema"><code>Console</code> ➔ <code>Compute</code> ➔ <code>Instances</code> ➔ <code>Create an Instance</code></p>
        
        <p><strong>Mandatory settings:</strong></p>
        <ul className="help-note">
          <li><strong>Image:</strong> Ubuntu 24.04 LTS</li>
          <li><strong>Specs:</strong> Minimum 4 vCPU & 16 GB RAM (e.g., PRO2-M)</li>
          <li><strong>Storage:</strong> Block storage 10GB+</li>
          <li><strong>Network:</strong> Enable Public IPv4</li>
          <li><strong>Security:</strong> Add your SSH Public Key (<code>cat ~/.ssh/id_ed25519.pub</code>)</li>
        </ul>
      </div>
      <FieldHelpSections step={1} group="SCALEWAY" />

      <h3><Globe size={15} /> Spaceship</h3>
      <div className="help-block">
        <p><strong>DNS management:</strong></p>
        <p className="step-schema"><code>Launchpad</code> ➔ <code>Domain Portfolio</code> ➔ <code>click your domain</code> ➔ <code>Advanced DNS</code></p>
        <p className="help-note">Create A records pointing to your Scaleway IPv4, and add MX + TXT records provided by Resend for email.</p>
      </div>

      <h3><Mail size={15} /> Resend</h3>
      <div className="help-block">
        <p><strong>Add the sending domain:</strong></p>
        <p className="step-schema"><code>Domains (left menu)</code> ➔ <code>Add Domain</code></p>
        <p className="help-note">Use a subdomain like <code>mail.yourdomain.com</code>.</p>
        
        <p><strong>Verify it with Spaceship:</strong></p>
        <p className="step-schema"><code>Resend DNS values</code> ➔ <code>Spaceship Advanced DNS</code></p>
        <p className="help-note">Copy exactly the MX and TXT records Resend gives you into Spaceship to verify ownership.</p>
      </div>
      <FieldHelpSections step={1} group="RESEND" />
    </>
  )

  return (
    <>
      <h3><Database size={15} /> Supabase</h3>
      <div className="help-block">
        <p><strong>Buckets de stockage (S3) :</strong></p>
        <p className="step-schema"><code>Storage (barre de navigation gauche)</code> ➔ <code>Buckets</code> ➔ <code>New Bucket</code></p>
        <p className="help-note">Nommez-le <strong>public_files</strong>, cochez <strong>Public bucket</strong>. À l'intérieur, créez les 4 dossiers : <code>evaluations</code>, <code>submissions</code>, <code>users</code> et <code>annonces</code>. Les cinq valeurs ci-dessous se récupèrent toutes dans ce même projet.</p>
      </div>
      <FieldHelpSections step={1} group="SUPABASE" />

      <h3><Server size={15} /> Scaleway</h3>
      <div className="help-block">
        <p><strong>Création de l'instance :</strong></p>
        <p className="step-schema"><code>Console</code> ➔ <code>Compute</code> ➔ <code>Instances</code> ➔ <code>Create an Instance</code></p>
        
        <p><strong>Paramètres obligatoires :</strong></p>
        <ul className="help-note">
          <li><strong>Image :</strong> Ubuntu 24.04 LTS</li>
          <li><strong>Ressources :</strong> Minimum 4 vCPU & 16 Go RAM</li>
          <li><strong>Stockage :</strong> Block storage de 10 Go ou plus</li>
          <li><strong>Réseau :</strong> Activer une IPv4 publique</li>
          <li><strong>Sécurité :</strong> Ajouter votre clé publique SSH (ex: <code>cat ~/.ssh/id_ed25519.pub</code>)</li>
        </ul>
      </div>
      <FieldHelpSections step={1} group="SCALEWAY" />

      <h3><Globe size={15} /> Spaceship</h3>
      <div className="help-block">
        <p><strong>Gestion DNS :</strong></p>
        <p className="step-schema"><code>Launchpad</code> ➔ <code>Domain Portfolio</code> ➔ <code>cliquez votre domaine</code> ➔ <code>Advanced DNS</code></p>
        <p className="help-note">Créez les enregistrements A vers l'IPv4 de Scaleway, et ajoutez les enregistrements MX + TXT fournis par Resend pour l'email.</p>
      </div>

      <h3><Mail size={15} /> Resend</h3>
      <div className="help-block">
        <p><strong>Ajouter le domaine d'envoi :</strong></p>
        <p className="step-schema"><code>Domains (menu gauche)</code> ➔ <code>Add Domain</code></p>
        <p className="help-note">Utilisez un sous-domaine dédié comme <code>mail.votredomaine.com</code>.</p>
        
        <p><strong>Vérification DNS :</strong></p>
        <p className="step-schema"><code>Valeurs fournies par Resend</code> ➔ <code>Spaceship Advanced DNS</code></p>
        <p className="help-note">Copiez scrupuleusement les champs MX et TXT affichés par Resend dans l'interface de Spaceship, puis validez.</p>
      </div>
      <FieldHelpSections step={1} group="RESEND" />
    </>
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


  const specs: IconRowItem[] = [
    { key: 'cpu', icon: <Cpu size={15} />, label: 'CPU', text: t('step1.spec.cpu') },
    { key: 'ram', icon: <MemoryStick size={15} />, label: 'RAM', text: t('step1.spec.ram') },
    { key: 'os', icon: <Monitor size={15} />, label: 'OS', text: t('step1.spec.os') },
    { key: 'storage', icon: <HardDrive size={15} />, label: 'Stockage', text: t('step1.spec.storage') },
  ]

  // Completion checks — a block turns green once its values are all filled in,
  // whether they came from the automation or from the manual fallback fields.
  const isSupabaseComplete = !!(
    config.SUPABASE_URL &&
    config.SUPABASE_ANON_KEY &&
    config.SUPABASE_SERVICE_ROLE_KEY &&
    config.DATABASE_URL &&
    config.DIRECT_URL
  )
  const isScalewayComplete = !!config.IPV4_INSTANCE
  const isResendComplete = !!(config.FROM_EMAIL && config.ALLOWED_EMAILS)

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
          serviceIcon={<Database size={18} color="var(--color-primary-text)" />}
          description={t('apiConfig.supabase.desc')}
          status={supabaseStatus}
          isComplete={isSupabaseComplete}
          onStart={() => handleStart('Supabase')}
          onCancel={() => handleCancel('Supabase')}
          btnStartLabel={t('apiConfig.btnStart')}
          btnCancelLabel={t('apiConfig.btnCancel')}
          statusLabels={statusLabels}
        >
          <details className="manual-config-details">
            <summary>{t('apiConfig.manualConfig')}</summary>
            <div className="form-section">
              <FormField id="supabase-url" label={t('apiConfig.supabase.url')} value={config.SUPABASE_URL} onChange={v => setField('SUPABASE_URL', v)} placeholder="https://xyz.supabase.co" />
              <FormField id="supabase-anon" label={t('apiConfig.supabase.anonKey')} value={config.SUPABASE_ANON_KEY} onChange={v => setField('SUPABASE_ANON_KEY', v)} placeholder="eyJhbG..." multiline />
              <FormField id="supabase-service" label={t('apiConfig.supabase.serviceKey')} value={config.SUPABASE_SERVICE_ROLE_KEY} onChange={v => setField('SUPABASE_SERVICE_ROLE_KEY', v)} placeholder="eyJhbG..." type="password" multiline />
              <FormField id="database-url" label={t('apiConfig.supabase.databaseUrl')} value={config.DATABASE_URL} onChange={v => setField('DATABASE_URL', v)} placeholder="postgresql://..." type="password" multiline />
              <FormField id="direct-url" label={t('apiConfig.supabase.directUrl')} value={config.DIRECT_URL} onChange={v => setField('DIRECT_URL', v)} placeholder="postgresql://..." type="password" multiline />


            </div>
          </details>
        </ServiceConfigBlock>

        {/* Scaleway */}
        <ServiceConfigBlock
          stepNumber={2}
          serviceName="SCALEWAY"
          serviceIcon={<Server size={18} color="var(--color-primary-text)" />}
          description={t('apiConfig.scaleway.desc')}
          status={scalewayStatus}
          isComplete={isScalewayComplete}
          onStart={() => handleStart('Scaleway')}
          onCancel={() => handleCancel('Scaleway')}
          btnStartLabel={t('apiConfig.btnStart')}
          btnCancelLabel={t('apiConfig.btnCancel')}
          statusLabels={statusLabels}
        >
          <details className="manual-config-details">
            <summary>{t('apiConfig.manualConfig')}</summary>
            <div className="form-section">
              <FormField id="ipv4" label={t('apiConfig.spaceship.ipv4')} value={config.IPV4_INSTANCE} onChange={v => setField('IPV4_INSTANCE', v)} placeholder="198.51.100.1" />

              <div style={{ fontWeight: 600, marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={16} color="var(--color-primary-text)" />
                {t('step1.specs.title')}
              </div>
              <IconRowList className="icon-row-list--spaced" items={specs} />
            </div>
          </details>
        </ServiceConfigBlock>

        {/* Spaceship */}
        <ServiceConfigBlock
          stepNumber={3}
          serviceName="SPACESHIP"
          serviceIcon={<Globe size={18} color="var(--color-primary-text)" />}
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
                  <Info size={16} color="var(--color-primary-text)" />
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
                        <td><span style={{ fontWeight: 600, color: 'var(--color-primary-text)' }}>{rec.type}</span></td>
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
          serviceIcon={<Mail size={18} color="var(--color-primary-text)" />}
          description={t('apiConfig.resend.desc')}
          status={resendStatus}
          isComplete={isResendComplete}
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
                <Mail size={16} color="var(--color-primary-text)" />
                {t('step4.subdomain')}
              </div>
              <CopyRow label={t('step4.subdomain')} content={mailSubdomain} />
            </div>

              <FormField id="from-email" label={t('apiConfig.supabase.fromEmail')} value={config.FROM_EMAIL} onChange={v => setField('FROM_EMAIL', v)} placeholder="Hackathon Team <onboarding@mail.domain.com>" />
              <FormField id="allowed-emails" label={t('apiConfig.supabase.allowedEmails')} value={config.ALLOWED_EMAILS} onChange={v => setField('ALLOWED_EMAILS', v)} placeholder="*" />
            </div>
          </details>
        </ServiceConfigBlock>

      </div>
    </WizardLayout>
  )
}
