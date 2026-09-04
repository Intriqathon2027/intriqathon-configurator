import { useEffect } from 'react'
import { Globe, CheckCircle, Info, Database, Check, Terminal, KeyRound, UserPlus, AlertTriangle } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { ExternalLinkBtn } from '../components/ui/ExternalLinkBtn'
import { ServiceConfigBlock } from '../components/ui/ServiceConfigBlock'
import { SqlBlock } from '../components/ui/SqlBlock'
import { DockerBlock } from '../components/ui/DockerBlock'
import { useApp } from '../context/AppContext'
import { useDockerRestart } from '../hooks/useDockerRestart'
import { HelpFlow, type HelpFlowStep } from '../components/ui/HelpFlow'
import { HelpService } from '../components/ui/HelpService'
import { CopyRow } from '../components/ui/CopyBlock'

const SQL_COMMANDS = `GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon,
    authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon,
    authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO
    postgres, anon, authenticated, service_role;`

function HelpContent() {
  const { state, config } = useApp()
  const isEn = state.language === 'en'
  const domain = config.DOMAIN || '<DOMAIN>'

  const supabase: HelpFlowStep[] = [
    {
      key: 'sql',
      title: 'SQL Editor ➔ Run',
      desc: isEn
        ? <>Paste the SQL block from the page into a new query and click <code>Run</code>. It grants the schema privileges the API roles need.</>
        : <>Collez le bloc SQL de la page dans une nouvelle requête et cliquez sur <code>Run</code>. Il octroie au schéma les privilèges dont les rôles de l'API ont besoin.</>,
      url: 'https://supabase.com/dashboard/project/_/sql/new',
      linkLabel: 'SQL Editor',
    },
    {
      key: 'dataapi',
      title: isEn ? 'Expose the public schema' : 'Exposer le schéma public',
      desc: isEn
        ? <><code>Project Settings</code> ➔ <code>Data API</code> ➔ <code>Exposed schemas</code>. Make sure the Data API is enabled and that <code>public</code> is in the list.</>
        : <><code>Project Settings</code> ➔ <code>Data API</code> ➔ <code>Exposed schemas</code>. Vérifiez que la Data API est activée et que <code>public</code> figure dans la liste.</>,
      url: 'https://supabase.com/dashboard/project/_/integrations/data_api/settings',
      extra: (
        <p className="help-note">
          {isEn
            ? 'On recent projects, tables are no longer exposed to the Data API automatically — check that the app tables are toggled on here.'
            : "Sur les projets récents, les tables ne sont plus exposées automatiquement à la Data API — vérifiez ici que les tables de l'application sont bien activées."}
        </p>
      ),
    },
    {
      key: 'realtime',
      title: isEn ? 'Enable Realtime on Announcement' : 'Activer le Realtime sur Announcement',
      desc: isEn
        ? <><code>Database</code> ➔ <code>Publications</code> ➔ <code>supabase_realtime</code>, then toggle the <code>Announcement</code> table on. The same switch sits in the Table Editor, top right of the table.</>
        : <><code>Database</code> ➔ <code>Publications</code> ➔ <code>supabase_realtime</code>, puis activez la table <code>Announcement</code>. Le même interrupteur existe dans le Table Editor, en haut à droite de la table.</>,
      url: 'https://supabase.com/dashboard/project/_/database/publications',
      extra: (
        <p className="help-note">
          {isEn
            ? 'Without it, the Discord bot never receives new announcements.'
            : "Sans cela, le bot Discord ne reçoit jamais les nouvelles annonces."}
        </p>
      ),
    },
    {
      key: 'auth',
      title: isEn ? 'Disable email confirmation' : "Désactiver la confirmation d'email",
      desc: isEn
        ? <><code>Authentication</code> ➔ <code>Sign In / Providers</code> ➔ <code>Email</code> ➔ turn <code>Confirm email</code> off.</>
        : <><code>Authentication</code> ➔ <code>Sign In / Providers</code> ➔ <code>Email</code> ➔ désactivez <code>Confirm email</code>.</>,
      url: 'https://supabase.com/dashboard/project/_/auth/providers',
      extra: (
        <p className="help-note">
          {isEn
            ? 'Otherwise the organizer account created just below can never sign in.'
            : "Sans cela, le compte organisateur créé juste après ne pourra jamais se connecter."}
        </p>
      ),
    },
    {
      key: 'rls',
      title: isEn ? 'Enable RLS on every table' : 'Activer la RLS sur chaque table',
      desc: isEn
        ? <><code>Table Editor</code> ➔ select a table ➔ <code>Enable RLS</code> (top right). The backend uses the service_role key, so it keeps working; the browser stops being able to read the tables directly.</>
        : <><code>Table Editor</code> ➔ sélectionnez une table ➔ <code>Enable RLS</code> (en haut à droite). Le backend utilise la clé service_role et continue de fonctionner ; le navigateur, lui, ne peut plus lire les tables directement.</>,
      url: 'https://supabase.com/dashboard/project/_/editor',
      linkLabel: 'Table Editor',
    },
  ]

  const site: HelpFlowStep[] = [
    {
      key: 'panel',
      title: isEn ? 'Open the configuration panel' : 'Ouvrir le panneau de configuration',
      desc: isEn
        ? <>Go to <code>config.{domain}</code>. It asks for an <strong>Instance URL</strong> and an <strong>Instance Service Key</strong> — both are already in your configuration and are shown, ready to copy, in the Next steps block.</>
        : <>Rendez-vous sur <code>config.{domain}</code>. Il demande une <strong>Instance URL</strong> et une <strong>Instance Service Key</strong> — les deux sont déjà dans votre configuration et sont affichées, prêtes à copier, dans le bloc Prochaines étapes.</>,
    },
    {
      key: 'admin',
      title: 'Create Admin User',
      desc: isEn
        ? <>The next screen asks for an email and a password (8 characters minimum). It creates the account and gives it the <code>ORGANIZER</code> role — this is the only way an organizer is created.</>
        : <>L'écran suivant demande un email et un mot de passe (8 caractères minimum). Il crée le compte et lui attribue le rôle <code>ORGANIZER</code> — c'est la seule façon de créer un organisateur.</>,
      extra: (
        <p className="help-note">
          {isEn
            ? 'The remaining screens (Discord, Deploying) are informational — click Continue through them.'
            : "Les écrans suivants (Discord, Deploying) sont purement informatifs : cliquez sur Continue."}
        </p>
      ),
    },
    {
      key: 'texts',
      title: isEn ? 'Name the hackathon' : 'Nommer le hackathon',
      desc: isEn
        ? <>Sign in on <code>{domain}</code> with that account, then <code>Settings</code> ➔ <code>Texts</code> and fill in the hackathon name (60 characters max).</>
        : <>Connectez-vous sur <code>{domain}</code> avec ce compte, puis <code>Paramètres</code> ➔ <code>Textes</code> et renseignez le nom du hackathon (60 caractères max).</>,
      extra: (
        <p className="help-note">
          {isEn
            ? 'That name, with spaces replaced by dashes, is the GitHub organization the team repositories are created in. The organization must already exist on GitHub — the platform never creates it.'
            : "Ce nom, espaces remplacés par des tirets, désigne l'organisation GitHub dans laquelle les dépôts des équipes sont créés. L'organisation doit déjà exister sur GitHub : la plateforme ne la crée jamais."}
        </p>
      ),
    },
  ]

  return (
    <>
      <HelpService
        id="svc-supabase"
        icon={<Database size={15} />}
        title={isEn ? 'Supabase — final setup' : 'Supabase — configuration finale'}
      >
        <HelpFlow steps={supabase} />
      </HelpService>

      <HelpService
        id="svc-site"
        icon={<Globe size={15} />}
        title={isEn ? 'Site configuration' : 'Configuration du site'}
      >
        <HelpFlow steps={site} />
      </HelpService>
    </>
  )
}

export function ConfigSite() {
  const { t, config, state, markStepDone } = useApp()
  const { status, logs, progress, start, cancel } = useDockerRestart()
  const domain = config.DOMAIN || '<DOMAIN>'
  const ipv4 = config.IPV4_INSTANCE || '<IPV4>'
  const isEn = state.language === 'en'
  // The two values config.<domain> asks for on its first screen
  const supabaseUrl = config.SUPABASE_URL
  const serviceKey = config.SUPABASE_SERVICE_ROLE_KEY

  const checklist = [
    { key: 'realtime', title: t('step7.realtime.title'), desc: t('step7.realtime.desc') },
    { key: 'dataApi', title: t('step7.dataApi.title'), desc: t('step7.dataApi.desc') },
    { key: 'auth', title: t('step7.auth.title'), desc: t('step7.auth.desc') },
  ]

  const handleRestart = () => {
    start({ ipv4 })
  }

  // Validate the site-config step once the Docker restart succeeds
  useEffect(() => {
    if (status === 'completed') markStepDone(4)
  }, [status])

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
          serviceIcon={<Database size={18} color="var(--color-primary-text)" />}
          description={isEn ? 'Configure your Supabase database.' : 'Configurez votre base de données Supabase.'}
          status="idle"
          btnStartLabel={isEn ? 'Launch' : 'Lancer'}
          btnCancelLabel={isEn ? 'Cancel' : 'Annuler'}
          statusLabels={statusLabels}
          helpAnchor="svc-supabase"
          helpHint={isEn
            ? 'SQL, exposed schemas, Realtime, email confirmation and RLS.'
            : "SQL, schémas exposés, Realtime, confirmation d'email et RLS."}
          manualLabel={isEn ? 'Manual Configuration' : 'Configuration manuelle'}
        >
          <div className="form-section">
            <div style={{ marginBottom: '8px', fontSize: 'var(--font-size-md)', lineHeight: '1.5' }}>
              <strong>{isEn ? "1. Inject this SQL directly in your Supabase SQL Editor:" : "1. Injectez ce SQL directement dans le SQL Editor de Supabase :"}</strong>
              <p className="text-muted" style={{ margin: '4px 0 0' }}>
                {isEn ? "Go to SQL Editor ➔ Paste and Run. This ensures your database has the proper default privileges." : "Allez dans SQL Editor ➔ Coller et Run. Permet d'octroyer les permissions adéquates sur la base de données."}
              </p>
            </div>
            <SqlBlock sql={SQL_COMMANDS} />

            <div style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <Check size={16} color="var(--color-primary-text)" />
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
        </ServiceConfigBlock>

        {/* Docker Restart */}
        <ServiceConfigBlock
          stepNumber={2}
          serviceName="DOCKER RESTART"
          serviceIcon={<Terminal size={18} color="var(--color-primary-text)" />}
          description={t('step7.docker.desc')}
          status={serviceStatus}
          onStart={handleRestart}
          onCancel={cancel}
          logs={logs.map(l => l.message)}
          progress={progress}
          btnStartLabel={isEn ? 'Restart Docker' : 'Redémarrer Docker'}
          btnCancelLabel={isEn ? 'Cancel' : 'Annuler'}
          statusLabels={statusLabels}
          manualLabel={isEn ? 'Manual Configuration' : 'Configuration manuelle'}
        >
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
        </ServiceConfigBlock>

        {/* Links & Next Steps */}
        <ServiceConfigBlock
          stepNumber={3}
          serviceName={isEn ? 'NEXT STEPS' : 'PROCHAINES ÉTAPES'}
          serviceIcon={<Globe size={18} color="var(--color-primary-text)" />}
          description={isEn ? 'Access your platforms and finish the setup.' : 'Accédez à vos plateformes et terminez la configuration.'}
          status="none"
          btnStartLabel=""
          btnCancelLabel=""
          statusLabels={statusLabels}
        >
          <div className="form-section">
            <p className="text-muted" style={{ margin: '0 0 12px', fontSize: 'var(--font-size-base)', lineHeight: 1.5 }}>
              {t('step8.tip')}
            </p>
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

            {/* The config.<domain> wizard, screen by screen */}
            <div className="config-screens">
              <div className="config-screens__title">
                <KeyRound size={16} color="var(--color-primary-text)" />
                {isEn ? `What config.${domain} asks for` : `Ce que demande config.${domain}`}
              </div>

              <ol className="config-screens__list">
                <li className="config-screen">
                  <span className="config-screen__index">1</span>
                  <div className="config-screen__body">
                    <div className="config-screen__name">Connect to Supabase</div>
                    <p className="config-screen__desc">
                      {isEn
                        ? 'Two fields. Both values are already in your configuration:'
                        : 'Deux champs. Les deux valeurs sont déjà dans votre configuration :'}
                    </p>
                    {supabaseUrl
                      ? <CopyRow label="Instance URL" content={supabaseUrl} />
                      : <div className="info-box warning">
                          <AlertTriangle size={15} className="info-box-icon" />
                          <div className="info-box-text">
                            {isEn
                              ? 'SUPABASE_URL is still empty — fill it in at step 2 (API configuration).'
                              : "SUPABASE_URL est encore vide — renseignez-la à l'étape 2 (Configuration par API)."}
                          </div>
                        </div>}
                    {serviceKey
                      ? <CopyRow label="Instance Service Key" content={serviceKey} />
                      : <div className="info-box warning">
                          <AlertTriangle size={15} className="info-box-icon" />
                          <div className="info-box-text">
                            {isEn
                              ? 'SUPABASE_SERVICE_ROLE_KEY is still empty — fill it in at step 2 (API configuration).'
                              : "SUPABASE_SERVICE_ROLE_KEY est encore vide — renseignez-la à l'étape 2 (Configuration par API)."}
                          </div>
                        </div>}
                    <p className="config-screen__note">
                      {isEn
                        ? 'If the project already holds data, the panel offers to download a backup and reset it before continuing.'
                        : 'Si le projet contient déjà des données, le panneau propose de les télécharger puis de les réinitialiser avant de continuer.'}
                    </p>
                  </div>
                </li>

                <li className="config-screen">
                  <span className="config-screen__index">2</span>
                  <div className="config-screen__body">
                    <div className="config-screen__name">Create Admin User</div>
                    <p className="config-screen__desc">
                      {isEn
                        ? 'Email address, password and confirmation — your choice, 8 characters minimum.'
                        : 'Adresse email, mot de passe et confirmation — à votre convenance, 8 caractères minimum.'}
                    </p>
                    <div className="info-box info">
                      <UserPlus size={15} className="info-box-icon" />
                      <div className="info-box-text">
                        {isEn
                          ? 'This is what creates the ORGANIZER account you then sign in with on the site — nothing else does.'
                          : "C'est ce qui crée le compte ORGANIZER avec lequel vous vous connecterez ensuite au site — rien d'autre ne le fait."}
                      </div>
                    </div>
                  </div>
                </li>

                <li className="config-screen">
                  <span className="config-screen__index">3</span>
                  <div className="config-screen__body">
                    <div className="config-screen__name">Discord Setup</div>
                    <p className="config-screen__desc">
                      {isEn
                        ? 'Informational only — the bot was already configured at step 3. Click Continue.'
                        : "Purement informatif — le bot a déjà été configuré à l'étape 3. Cliquez sur Continue."}
                    </p>
                  </div>
                </li>

                <li className="config-screen">
                  <span className="config-screen__index">4</span>
                  <div className="config-screen__body">
                    <div className="config-screen__name">Deploying</div>
                    <p className="config-screen__desc">
                      {isEn
                        ? 'Informational only — the deployment already ran at step 4. Click Continue.'
                        : "Purement informatif — le déploiement a déjà été fait à l'étape 4. Cliquez sur Continue."}
                    </p>
                  </div>
                </li>

                <li className="config-screen">
                  <span className="config-screen__index">5</span>
                  <div className="config-screen__body">
                    <div className="config-screen__name">Setup Complete</div>
                    <p className="config-screen__desc">
                      {isEn
                        ? 'Recap of the four steps. Close Configuration ends the wizard — you can then sign in on the site with the account from screen 2.'
                        : "Récapitulatif des quatre étapes. Close Configuration termine l'assistant — vous pouvez alors vous connecter au site avec le compte de l'écran 2."}
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                    ? 'Once signed in on the site, go to Settings > Texts to set the hackathon name. Spaces become dashes, and the result must match an existing GitHub organization — the platform never creates it.'
                    : 'Une fois connecté au site, allez dans Paramètres > Textes pour définir le nom du hackathon. Les espaces deviennent des tirets, et le résultat doit correspondre à une organisation GitHub existante — la plateforme ne la crée jamais.'
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
          background: 'var(--color-primary-light)', color: 'var(--color-primary-text)',
          padding: '16px 28px', borderRadius: '12px', fontWeight: 700, fontSize: 'var(--font-size-lg)',
          border: '1px solid rgba(29,180,138,0.3)'
        }}>
          <CheckCircle size={22} />
          {isEn ? 'Your hackathon infrastructure is configured!' : 'Votre infrastructure hackathon est configurée !'}
        </div>
      </div>
    </WizardLayout>
  )
}
