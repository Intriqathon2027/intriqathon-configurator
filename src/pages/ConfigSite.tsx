import { useEffect, useRef } from 'react'
import { Globe, CheckCircle, Info, Database, Check, Terminal, KeyRound, UserPlus, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { WizardLayout } from '../components/layout/WizardLayout'
import { ExternalLinkBtn } from '../components/ui/ExternalLinkBtn'
import { ServiceConfigBlock } from '../components/ui/ServiceConfigBlock'
import { SqlBlock } from '../components/ui/SqlBlock'
import { DockerBlock } from '../components/ui/DockerBlock'
import { useApp, type Config } from '../context/AppContext'
import { useSession } from '../context/SessionContext'
import { ManualCheck } from '../components/ui/ManualCheck'
import { useDockerRestart } from '../hooks/useDockerRestart'
import { useServiceProvision } from '../hooks/useServiceProvision'
import { GRANTS_SQL, REALTIME_TABLE } from '../shared/supabaseSiteSetup'
import { isAccountComplete } from '../utils/serviceCompletion'
import { HelpFlow, type HelpFlowStep } from '../components/ui/HelpFlow'
import { HelpService } from '../components/ui/HelpService'
import { CopyRow } from '../components/ui/CopyBlock'
import { SshKeySelector, type SshKeySelectorHandle } from '../components/ui/SshKeySelector'

/**
 * The very statements the automation runs — imported rather than restated, so
 * the manual fallback can never fall behind what the "Lancer" button does.
 */
const SQL_COMMANDS = GRANTS_SQL

/** Deep link to the SQL editor, next to the block the reader has to paste. */
const SQL_EDITOR_URL = 'https://supabase.com/dashboard/project/_/sql/new'

/** Where the config panel's admin account is created. */
const ADMIN_LOGIN_URL = 'https://unheard.cfd/admin-login'

/** The project's API keys — the `Legacy API keys` tab is the one that matters here. */
const API_KEYS_URL = 'https://supabase.com/dashboard/project/_/settings/api-keys'

/** Prefix of the new-generation secret keys, the ones a browser may not use. */
const SECRET_KEY_PREFIX = 'sb_secret_'

/**
 * The Supabase settings that have to be flipped by hand once the stack is up.
 * They live in the card itself — each one is a click away in the dashboard, so
 * burying them behind the help panel only added a detour.
 */
function supabaseFinalSteps(isEn: boolean): HelpFlowStep[] {
  return [
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
}

function HelpContent() {
  const { state, config } = useApp()
  const isEn = state.language === 'en'
  const domain = config.DOMAIN || '<DOMAIN>'

  const site: HelpFlowStep[] = [
    {
      key: 'panel',
      title: isEn ? 'Open the configuration panel' : 'Ouvrir le panneau de configuration',
      desc: isEn
        ? <>Go to <code>config.{domain}</code>. It asks for an <strong>Instance URL</strong> and an <strong>Instance Service Key</strong> — both are already in your configuration and are shown, ready to copy, in the Next steps block.</>
        : <>Rendez-vous sur <code>config.{domain}</code>. Il demande une <strong>Instance URL</strong> et une <strong>Instance Service Key</strong> — les deux sont déjà dans votre configuration et sont affichées, prêtes à copier, dans le bloc Prochaines étapes.</>,
      extra: (
        <p className="help-note">
          {isEn
            ? 'The service key has to be the JWT-format legacy one: the panel is a browser app, and Supabase refuses a sb_secret_… key on any request that carries an Origin. It is read back from the project as soon as the project is resolved — at step 1, when the project is created or adopted, and again by the card above — so the Next steps block shows the value that works.'
            : "La clé de service doit être celle au format JWT legacy : le panneau est une application navigateur, et Supabase refuse une clé sb_secret_… sur toute requête portant une origine. Elle est récupérée depuis le projet dès qu'il est résolu — à l'étape 1, à la création ou à l'adoption du projet, puis de nouveau par la carte ci-dessus — de sorte que le bloc Prochaines étapes affiche la valeur qui fonctionne."}
        </p>
      ),
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
  const { t, config, state, markStepDone, unmarkStepDone, selectedSshKey, setFields, saveConfig } = useApp()
  const { isRunDone, markRunDone, isManualChecked } = useSession()
  const { status, logs, progress, start, cancel } = useDockerRestart()
  const sshSelectorRef = useRef<SshKeySelectorHandle>(null)

  /**
   * The run reports when it finished; recording it is what keeps the card green
   * after the app is reopened. Persisted straight away, like every other value
   * an automation brings back.
   */
  const applyPatch = (patch: Record<string, string>) => {
    const typed = patch as Partial<Config>
    setFields(typed)
    void saveConfig(typed)
  }

  const siteSetup = useServiceProvision('supabase-site', applyPatch)

  const domain = config.DOMAIN || '<DOMAIN>'
  const ipv4 = config.IPV4_INSTANCE || '<IPV4>'
  const isEn = state.language === 'en'
  // The two values config.<domain> asks for on its first screen
  const supabaseUrl = config.SUPABASE_URL
  const serviceKey = config.SUPABASE_SERVICE_ROLE_KEY

  /**
   * Supabase answers 401 "Forbidden use of secret API key in browser" to any
   * request that carries an Origin header and a `sb_secret_…` key. config.<domain>
   * is a browser app that queries the Data API with this very key, so the only
   * value that works there is the JWT-format legacy service_role key — the
   * secret key stays the right thing to keep in the server-side .env, which is
   * why the two can legitimately differ.
   *
   * The card above reads that legacy key back from the Management API, so what
   * is offered to copy is its result when it has one, and the stored key
   * otherwise — which is correct on every project whose service key is legacy
   * to begin with, and on those the card has never run against.
   */
  const serviceKeyIsSecret = serviceKey.startsWith(SECRET_KEY_PREFIX)
  const panelServiceKey = config.SUPABASE_PANEL_SERVICE_KEY || (serviceKeyIsSecret ? '' : serviceKey)

  const handleRestart = () => {
    if (!selectedSshKey) {
      sshSelectorRef.current?.openModal()
      toast(
        isEn
          ? 'Please select an SSH key to connect to the server.'
          : 'Veuillez sélectionner une clé SSH pour vous connecter au serveur.'
      )
      return
    }
    start({ ipv4, sshKeyPath: selectedSshKey.privateKeyPath })
  }

  /**
   * Same gate as the step 2 automations: nothing runs while the Supabase card
   * of step 1 is still grey. The manual walkthrough below stays available
   * either way — when the chain is stuck, the dashboard is the way out.
   */
  const supabaseLock = !config.SUPABASE_ACCESS_TOKEN
    ? t('apiConfig.locked.supabaseToken')
    : !isAccountComplete(config, 'supabase')
      ? t('apiConfig.locked.accountSupabase')
      : null

  const handleSupabaseSetup = () => {
    if (supabaseLock) return
    void siteSetup.startSiteSetup({
      accessToken: config.SUPABASE_ACCESS_TOKEN,
      ref: config.SUPABASE_PROJECT_REF,
    })
  }

  // Validate the site-config step once the Docker restart succeeds, and record
  // the run so the block stays green across a remount of this page.
  useEffect(() => {
    if (status === 'completed') {
      markStepDone(4)
      markRunDone('site-docker')
    }
  }, [status])

  useEffect(() => {
    if (siteSetup.status === 'done') markRunDone('site-supabase')
  }, [siteSetup.status])

  // map hook status to ServiceConfigBlock status
  let serviceStatus: 'idle' | 'running' | 'done' | 'error' = 'idle'
  if (status === 'running') serviceStatus = 'running'
  else if (status === 'completed') serviceStatus = 'done'
  else if (status === 'error') serviceStatus = 'error'
  if (serviceStatus === 'idle' && isRunDone('site-docker')) serviceStatus = 'done'

  /**
   * Session state only. `SUPABASE_SITE_SETUP_AT` records that a run happened
   * once against some project, which is worth keeping in the config but is not
   * an answer about *this* session: a config reopened weeks later, or restored
   * on another machine, used to show the step already done before anything had
   * been looked at.
   */
  const siteSetupStatus = siteSetup.status === 'idle' && isRunDone('site-supabase')
    ? 'done'
    : siteSetup.status

  /**
   * What the reader ticked in the manual fallback. The API run does both halves
   * at once; by hand they are two separate errands — the SQL editor, then four
   * settings pages — so they are acknowledged separately and the block is only
   * confirmed when both are.
   */
  const sqlDone = isManualChecked('site-supabase-sql')
  const settingsDone = isManualChecked('site-supabase-actions')
  const siteSetupManualDone = sqlDone && settingsDone
  const dockerManualDone = isManualChecked('docker-manual')
  const manualDoneLabel = isEn ? 'Confirmed manually' : 'Confirmé manuellement'

  const statusLabels = {
    done: isEn ? 'Done' : 'Fait',
    running: isEn ? 'Running' : 'En cours',
    error: isEn ? 'Error' : 'Erreur',
  }

  /**
   * The Instance Service Key row, in its three states: a value ready to paste,
   * a secret key the panel cannot use, or nothing configured at all. A secret
   * key is deliberately not offered to copy — pasting it leads straight to the
   * panel's "invalid value" message, with nothing on screen saying why.
   */
  const serviceKeyField = panelServiceKey ? (
    <CopyRow label="Instance Service Key" content={panelServiceKey} />
  ) : serviceKeyIsSecret ? (
    <>
      <div className="info-box warning">
        <AlertTriangle size={15} className="info-box-icon" />
        <div className="info-box-text">
          <div className="info-box-title">
            {isEn ? 'This field needs the legacy key' : 'Ce champ attend la clé legacy'}
          </div>
          {isEn
            ? <>Your configuration holds a new-generation secret key (<code>{SECRET_KEY_PREFIX}…</code>), which Supabase refuses as soon as the request comes from a browser — the panel then reports an invalid value. Run step 1 above and it reads the legacy <code>service_role</code> key back for you; failing that, copy it from <code>Legacy API keys</code> (<code>eyJ…</code> format).</>
            : <>Votre configuration contient une clé secret de nouvelle génération (<code>{SECRET_KEY_PREFIX}…</code>), que Supabase refuse dès que la requête vient d'un navigateur — le panneau signale alors une valeur invalide. Lancez l'étape 1 ci-dessus : elle récupère pour vous la clé <code>service_role</code> legacy. À défaut, copiez-la depuis <code>Legacy API keys</code> (format <code>eyJ…</code>).</>}
        </div>
      </div>
      <p className="config-screen__note">
        {isEn
          ? 'Only this field is concerned: the deployed stack keeps using the key from its .env, which stays on the server. If the legacy keys are disabled on the project, step 1 switches them back on.'
          : "Seul ce champ est concerné : la stack déployée continue d'utiliser la clé de son .env, qui reste côté serveur. Si les clés legacy sont désactivées sur le projet, l'étape 1 les réactive."}
      </p>
      <div className="link-buttons-row" style={{ marginTop: '8px' }}>
        <ExternalLinkBtn url={API_KEYS_URL} label="Legacy API keys" />
      </div>
    </>
  ) : (
    <div className="info-box warning">
      <AlertTriangle size={15} className="info-box-icon" />
      <div className="info-box-text">
        {isEn
          ? 'SUPABASE_SERVICE_ROLE_KEY is still empty — fill it in at step 2 (API configuration).'
          : "SUPABASE_SERVICE_ROLE_KEY est encore vide — renseignez-la à l'étape 2 (Configuration par API)."}
      </div>
    </div>
  )

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
          description={isEn
            ? `Privileges, exposed schema, Realtime on ${REALTIME_TABLE}, email confirmation off and RLS on every table — applied through the Supabase API.`
            : `Privilèges, schéma exposé, Realtime sur ${REALTIME_TABLE}, confirmation d'email désactivée et RLS sur chaque table — appliqués via l'API Supabase.`}
          status={siteSetupStatus}
          isComplete={siteSetupStatus === 'done'}
          manuallyConfirmed={siteSetupManualDone}
          manualDoneLabel={manualDoneLabel}
          logs={siteSetup.logs}
          progress={siteSetup.progress}
          locked={!!supabaseLock}
          lockedReason={supabaseLock ?? undefined}
          errorMessage={siteSetup.error}
          onStart={handleSupabaseSetup}
          onCancel={siteSetup.cancel}
          btnStartLabel={isEn ? 'Launch' : 'Lancer'}
          btnRetryLabel={isEn ? 'Retry' : 'Réessayer'}
          btnRerunLabel={isEn ? 'Run again' : 'Relancer'}
          btnCancelLabel={isEn ? 'Cancel' : 'Annuler'}
          statusLabels={statusLabels}
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
            <div className="link-buttons-row" style={{ marginTop: '12px' }}>
              <ExternalLinkBtn url={SQL_EDITOR_URL} label="SQL Editor" />
            </div>
            <ManualCheck
              checkKey="site-supabase-sql"
              label={isEn
                ? 'I ran this SQL in the SQL Editor'
                : "J'ai exécuté ce SQL dans le SQL Editor"}
              hint={isEn
                ? 'Not needed when the automatic run above succeeded — it applies the same statements.'
                : "Inutile si le lancement automatique ci-dessus a réussi — il applique les mêmes instructions."}
            />

            <div style={{ fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
              <Check size={16} color="var(--color-primary-text)" />
              {isEn ? '2. Other Supabase Actions' : '2. Autres Actions Supabase'}
            </div>
            <HelpFlow steps={supabaseFinalSteps(isEn)} />
            <ManualCheck
              checkKey="site-supabase-actions"
              label={isEn
                ? 'I applied these four settings in the dashboard'
                : "J'ai appliqué ces quatre réglages dans le dashboard"}
              hint={isEn
                ? 'Exposed schema, Realtime, email confirmation off and RLS on every table.'
                : "Schéma exposé, Realtime, confirmation d'email désactivée et RLS sur chaque table."}
            />
          </div>
        </ServiceConfigBlock>

        {/* Docker Restart */}
        <ServiceConfigBlock
          stepNumber={2}
          serviceName="DOCKER RESTART"
          serviceIcon={<Terminal size={18} color="var(--color-primary-text)" />}
          description={t('step7.docker.desc')}
          status={serviceStatus}
          manuallyConfirmed={dockerManualDone}
          manualDoneLabel={manualDoneLabel}
          onStart={handleRestart}
          onCancel={cancel}
          logs={logs.map(l => l.message)}
          progress={progress}
          btnStartLabel={isEn ? 'Restart Docker' : 'Redémarrer Docker'}
          btnRerunLabel={isEn ? 'Restart again' : 'Relancer'}
          btnCancelLabel={isEn ? 'Cancel' : 'Annuler'}
          statusLabels={statusLabels}
          extra={
            <SshKeySelector
              ref={sshSelectorRef}
              label={isEn ? 'Authentication SSH key' : "Clé SSH d'authentification"}
            />
          }
          manualLabel={isEn ? 'Manual Configuration' : 'Configuration manuelle'}
        >
          <div className="form-section">
            <div style={{ marginBottom: '8px' }}>
              <strong>{isEn ? "Connect via SSH:" : "Connectez-vous en SSH :"}</strong>
            </div>
            <DockerBlock command={selectedSshKey?.privateKeyPath ? `ssh -i "${selectedSshKey.privateKeyPath}" root@${ipv4}` : `ssh root@${ipv4}`} />
            
            <div style={{ marginBottom: '8px', marginTop: '12px' }}>
              <strong>{isEn ? "Restart command:" : "Commande de redémarrage :"}</strong>
            </div>
            <DockerBlock command="docker restart discord_bot" />

            {/* The restart leaves no trace in the config either — run by hand,
                this box is what validates the step. */}
            <ManualCheck
              checkKey="docker-manual"
              label={isEn ? 'I restarted the bot over SSH myself' : "J'ai redémarré le bot moi-même en SSH"}
              hint={isEn
                ? 'Validates this step, exactly as a successful automatic restart would.'
                : "Valide cette étape, comme le ferait un redémarrage automatique réussi."}
              onChange={checked => (checked ? markStepDone(4) : unmarkStepDone(4))}
            />
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
              <ExternalLinkBtn
                url={ADMIN_LOGIN_URL}
                label={t('step8.adminLogin.btn')}
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
                    {serviceKeyField}
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
                    <div className="link-buttons-row" style={{ marginTop: '8px' }}>
                      <ExternalLinkBtn url={ADMIN_LOGIN_URL} label={t('step8.adminLogin.btn')} />
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
