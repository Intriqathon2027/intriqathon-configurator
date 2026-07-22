import { Globe, CheckCircle, Info, Database, Check, Terminal } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { ExternalLinkBtn } from '../components/ui/ExternalLinkBtn'
import { ServiceConfigBlock } from '../components/ui/ServiceConfigBlock'
import { SqlBlock } from '../components/ui/SqlBlock'
import { DockerBlock } from '../components/ui/DockerBlock'
import { useApp } from '../context/AppContext'
import { useDockerRestart } from '../hooks/useDockerRestart'

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

  if (isEn) return (
    <>
      <h3><Database size={15} /> Supabase Additional Config</h3>
      <div className="help-block">
        <p><strong>1. Realtime setup:</strong></p>
        <p className="step-schema"><code>Table Editor</code> ➔ <code>Announcement</code> ➔ <code>Enable Realtime</code></p>
        
        <p><strong>2. Inject SQL commands:</strong></p>
        <p className="step-schema"><code>SQL Editor</code> ➔ <code>Paste and Run</code></p>
        <p className="help-note">This ensures your database has the proper default privileges.</p>
        
        <p><strong>3. Expose schemas:</strong></p>
        <p className="step-schema"><code>Project Settings</code> ➔ <code>API</code> ➔ <code>Exposed schemas</code></p>
        <p className="help-note">Make sure to add "public".</p>
        
        <p><strong>4. Disable email confirmation:</strong></p>
        <p className="step-schema"><code>Authentication</code> ➔ <code>Providers</code> ➔ <code>Email</code></p>
        <p className="help-note">Disable "Confirm email".</p>
        
        <p><strong>5. Add RLS Security:</strong></p>
        <p className="step-schema"><code>Table Editor</code> ➔ <code>Select Table</code> ➔ <code>Enable RLS</code></p>
        <p className="help-note">Enable Row Level Security on each table.</p>
      </div>
      <h3><Globe size={15} /> Site Configuration</h3>
      <div className="help-block">
        <p><strong>1. First connection:</strong></p>
        <p className="help-note">Go to your domain and connect for the first time. You will be registered as an organizer.</p>
        
        <p><strong>2. Hackathon settings:</strong></p>
        <p className="help-note">In the Admin Panel under Text settings, set the hackathon name which will be used for your GitHub organization.</p>
      </div>
    </>
  )

  return (
    <>
      <h3><Database size={15} /> Configuration Supabase</h3>
      <div className="help-block">
        <p><strong>1. Activer le Realtime :</strong></p>
        <p className="step-schema"><code>Table Editor</code> ➔ <code>Announcement</code> ➔ <code>Enable Realtime</code></p>
        
        <p><strong>2. Injecter le SQL :</strong></p>
        <p className="step-schema"><code>SQL Editor</code> ➔ <code>Coller & Run</code></p>
        <p className="help-note">Permet d'octroyer les permissions adéquates sur la base de données.</p>
        
        <p><strong>3. Schémas exposés :</strong></p>
        <p className="step-schema"><code>Project Settings</code> ➔ <code>API</code> ➔ <code>Exposed schemas</code></p>
        <p className="help-note">Assurez-vous que "public" est bien sélectionné.</p>
        
        <p><strong>4. Désactiver la confirmation d'email :</strong></p>
        <p className="step-schema"><code>Authentication</code> ➔ <code>Providers</code> ➔ <code>Email</code></p>
        <p className="help-note">Désactivez "Confirm email".</p>
        
        <p><strong>5. Sécurité RLS :</strong></p>
        <p className="step-schema"><code>Table Editor</code> ➔ <code>Sélectionner la Table</code> ➔ <code>Enable RLS</code></p>
        <p className="help-note">Activez la Row Level Security sur chaque table (bouton en haut à droite).</p>
      </div>
      <h3><Globe size={15} /> Configuration du site</h3>
      <div className="help-block">
        <p><strong>1. Première connexion :</strong></p>
        <p className="help-note">Allez sur votre site et connectez-vous. La première personne à se connecter devient organisateur.</p>
        
        <p><strong>2. Paramètres du hackathon :</strong></p>
        <p className="help-note">Dans le panneau d'administration, onglet Texte, donnez le nom du hackathon qui servira pour l'organisation GitHub.</p>
      </div>
    </>
  )
}


export function ConfigSite() {
  const { t, config, state } = useApp()
  const { status, logs, progress, start, cancel } = useDockerRestart()
  const domain = config.DOMAIN || '<DOMAIN>'
  const ipv4 = config.IPV4_INSTANCE || '<IPV4>'
  const isEn = state.language === 'en'

  const checklist = [
    { key: 'realtime', title: t('step7.realtime.title'), desc: t('step7.realtime.desc') },
    { key: 'dataApi', title: t('step7.dataApi.title'), desc: t('step7.dataApi.desc') },
    { key: 'auth', title: t('step7.auth.title'), desc: t('step7.auth.desc') },
  ]

  const handleRestart = () => {
    start({ ipv4 })
  }

  // map hook status to ServiceConfigBlock status
  let serviceStatus: 'idle' | 'running' | 'done' | 'error' = 'idle'
  if (status === 'running') serviceStatus = 'running'
  else if (status === 'completed') serviceStatus = 'done'
  else if (status === 'error') serviceStatus = 'error'

  const statusLabels = {
    done: isEn ? 'Done' : 'Fait',
    running: isEn ? 'Running' : 'En cours',
    error: isEn ? 'Error' : 'Erreur',
  }

  return (
    <WizardLayout
      title={t('step8.title')}
      stepBadge={`${t('nav.step')} 8 — ${t('step8.label')}`}
      description={t('step8.desc')}
      helpContent={<HelpContent />}
    >
      <div className="api-config-list">
        {/* Supabase Actions & SQL */}
        <ServiceConfigBlock
          stepNumber={1}
          serviceName="SUPABASE"
          serviceIcon={<Database size={18} color="var(--color-primary)" />}
          description={isEn ? 'Configure your Supabase database.' : 'Configurez votre base de données Supabase.'}
          status="idle"
          btnStartLabel={isEn ? 'Launch' : 'Lancer'}
          btnCancelLabel={isEn ? 'Cancel' : 'Annuler'}
          statusLabels={statusLabels}
        >
          <details className="manual-config-details">
            <summary>{isEn ? 'Manual Configuration' : 'Configuration manuelle'}</summary>
            <div className="form-section">
              <div style={{ marginBottom: '8px', fontSize: '14px', lineHeight: '1.5' }}>
                <strong>{isEn ? "1. Inject this SQL directly in your Supabase SQL Editor:" : "1. Injectez ce SQL directement dans le SQL Editor de Supabase :"}</strong>
                <p className="text-muted" style={{ margin: '4px 0 0' }}>
                  {isEn ? "Go to SQL Editor ➔ Paste and Run. This ensures your database has the proper default privileges." : "Allez dans SQL Editor ➔ Coller et Run. Permet d'octroyer les permissions adéquates sur la base de données."}
                </p>
              </div>
              <SqlBlock sql={SQL_COMMANDS} />

              <div style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                <Check size={16} color="var(--color-primary)" />
                {isEn ? '2. Other Supabase Actions' : '2. Autres Actions Supabase'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
          </details>
        </ServiceConfigBlock>

        {/* Docker Restart */}
        <ServiceConfigBlock
          stepNumber={2}
          serviceName="DOCKER RESTART"
          serviceIcon={<Terminal size={18} color="var(--color-primary)" />}
          description={t('step7.docker.desc')}
          status={serviceStatus}
          onStart={handleRestart}
          onCancel={cancel}
          logs={logs.map(l => l.message)}
          progress={progress}
          btnStartLabel={isEn ? 'Restart Docker' : 'Redémarrer Docker'}
          btnCancelLabel={isEn ? 'Cancel' : 'Annuler'}
          statusLabels={statusLabels}
        >
          <details className="manual-config-details">
            <summary>{isEn ? 'Manual Configuration' : 'Configuration manuelle'}</summary>
            <div className="form-section">
              <div style={{ marginBottom: '8px' }}>
                <strong>{isEn ? "Connect via SSH:" : "Connectez-vous en SSH :"}</strong>
              </div>
              <DockerBlock command={`ssh root@${ipv4}`} />
              
              <div style={{ marginBottom: '8px', marginTop: '12px' }}>
                <strong>{isEn ? "Restart command:" : "Commande de redémarrage :"}</strong>
              </div>
              <DockerBlock command="docker restart discord_bot" />
            </div>
          </details>
        </ServiceConfigBlock>
      </div>

      {/* Links & Next Steps */}
      <div className="api-config-list" style={{ marginTop: '24px' }}>
        <ServiceConfigBlock
          stepNumber={3}
          serviceName={isEn ? 'NEXT STEPS' : 'PROCHAINES ÉTAPES'}
          serviceIcon={<Globe size={18} color="var(--color-primary)" />}
          description={isEn ? 'Access your platforms and finish the setup.' : 'Accédez à vos plateformes et terminez la configuration.'}
          status="none"
          btnStartLabel=""
          btnCancelLabel=""
          statusLabels={statusLabels}
        >
          <div className="form-section">
            <div className="link-buttons-row" style={{ marginBottom: '24px' }}>
              <ExternalLinkBtn
                url={`https://config.${domain}/`}
                label={`${t('step8.config.btn')} — config.${domain}`}
                variant="primary"
              />
              <ExternalLinkBtn
                url={`https://${domain}/`}
                label={`${t('step8.site.btn')} — ${domain}`}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="info-box info">
                <CheckCircle size={15} className="info-box-icon" />
                <div className="info-box-text">
                  <div className="info-box-title">{isEn ? 'Admin Panel' : 'Panneau d\'administration'}</div>
                  {t('step8.tip')}
                </div>
              </div>
              <div className="info-box warning">
                <Info size={15} className="info-box-icon" />
                <div className="info-box-text">
                  <div className="info-box-title">{isEn ? 'Email sending' : 'Envoi d\'emails'}</div>
                  {t('step8.tip2')}
                </div>
              </div>
              <div className="info-box tip">
                <CheckCircle size={15} className="info-box-icon" />
                <div className="info-box-text">
                  <div className="info-box-title">{isEn ? 'Hackathon name' : 'Nom du hackathon'}</div>
                  {isEn
                    ? 'Go to Settings > Text in the admin panel to set the hackathon name and create the GitHub organization.'
                    : 'Allez dans Paramètres > Texte dans le panneau admin pour définir le nom du hackathon et créer l\'organisation GitHub.'
                  }
                </div>
              </div>
              <div className="info-box tip">
                <CheckCircle size={15} className="info-box-icon" />
                <div className="info-box-text">
                  <div className="info-box-title">{isEn ? 'Supabase security (RLS)' : 'Sécurité Supabase (RLS)'}</div>
                  {isEn
                    ? 'In Supabase Table Editor, enable Row Level Security (RLS) on each table for production-level security.'
                    : 'Dans le Table Editor Supabase, activez la protection Row Level Security (RLS) sur chaque table pour une sécurité optimale.'
                  }
                </div>
              </div>
            </div>
          </div>
        </ServiceConfigBlock>
      </div>

      {/* Done badge */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          background: 'var(--color-primary-light)', color: 'var(--color-primary)',
          padding: '16px 28px', borderRadius: '12px', fontWeight: 700, fontSize: '16px',
          border: '1px solid rgba(29,180,138,0.3)'
        }}>
          <CheckCircle size={22} />
          {isEn ? 'Your hackathon infrastructure is configured!' : 'Votre infrastructure hackathon est configurée !'}
        </div>
      </div>
    </WizardLayout>
  )
}
