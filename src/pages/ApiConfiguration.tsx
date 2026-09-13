import { useEffect, useRef, useState } from 'react'
import { Database, Mail, Globe, Server, Info, AlertTriangle, Cpu, MemoryStick, HardDrive, Monitor, FolderPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { WizardLayout } from '../components/layout/WizardLayout'
import { ServiceConfigBlock } from '../components/ui/ServiceConfigBlock'
import { FormField } from '../components/ui/FormField'
import { CopyRow, CopyChip } from '../components/ui/CopyBlock'
import { ExternalLinkBtn } from '../components/ui/ExternalLinkBtn'
import { useApp } from '../context/AppContext'
import { FieldHelpSections } from '../components/ui/HelpSection'
import { IconRowList, type IconRowItem } from '../components/ui/IconRowList'
import { HelpFlow, type HelpFlowStep } from '../components/ui/HelpFlow'
import { HelpService } from '../components/ui/HelpService'
import { useScalewayInstance } from '../hooks/useScalewayInstance'
import { SshKeySelector, type SshKeySelectorHandle } from '../components/ui/SshKeySelector'
import type { SshKeyInfo } from '../types/electron'
import { useServiceProvision } from '../hooks/useServiceProvision'
import { useSession } from '../context/SessionContext'
import { ManualCheck } from '../components/ui/ManualCheck'
import { STORAGE_BUCKETS } from '../shared/supabaseBuckets'
import { isAccountComplete } from '../utils/serviceCompletion'
import type { Config } from '../context/AppContext'

type Status = 'idle' | 'running' | 'done' | 'error'

const BUCKETS_URL = 'https://supabase.com/dashboard/project/_/storage/buckets'

/**
 * Spaceship's entry points. Everything in the account is reached through the
 * Launchpad — DNS included: `Advanced DNS` is an app of its own there, not a
 * tab inside a domain's page, which is where the previous instructions sent
 * the reader.
 */
const SPACESHIP_LAUNCHPAD_URL = 'https://www.spaceship.com/application/launchpad/'
const SPACESHIP_DNS_HELP_URL = 'https://www.spaceship.com/knowledgebase/category/knowledgebase-dns/'

function HelpContent() {
  const { state, config } = useApp()
  const isEn = state.language === 'en'
  const domain = config.DOMAIN || 'votredomaine.fr'
  const mailSubdomain = config.MAIL_SUBDOMAIN || `mail.${domain}`

  const supabase: HelpFlowStep[] = [
    {
      key: 'buckets',
      title: isEn ? 'Create the storage buckets' : 'Créer les buckets de stockage',
      desc: isEn
        ? <><code>Storage</code> (left sidebar) ➔ <code>New bucket</code>. The app reads and writes <strong>five separate buckets</strong> — create them all, exactly with these names.</>
        : <><code>Storage</code> (barre latérale gauche) ➔ <code>New bucket</code>. L'application lit et écrit dans <strong>cinq buckets distincts</strong> — créez-les tous, avec exactement ces noms.</>,
      url: BUCKETS_URL,
      copyValues: STORAGE_BUCKETS.map(b => ({
        value: b.name,
        note: b.isPublic
          ? <>{isEn ? 'tick ' : 'cochez '}<strong>Public bucket</strong> — {isEn ? b.en : b.fr}</>
          : <>{isEn ? 'private — ' : 'privé — '}{isEn ? b.en : b.fr}</>,
      })),
    },
    {
      key: 'connect',
      title: 'Connect to your project',
      desc: isEn
        ? <>The <strong>Connect</strong> button at the top of the project header opens the <em>Connect to your project</em> panel — the fastest way to collect the connection values. <code>App Frameworks</code> shows the Project URL and the publishable/anon key; <code>ORMs</code> shows the two Postgres URLs.</>
        : <>Le bouton <strong>Connect</strong>, en haut de l'en-tête du projet, ouvre le panneau <em>Connect to your project</em> — c'est le chemin le plus court pour récupérer les valeurs de connexion. L'onglet <code>App Frameworks</code> affiche la Project URL et la clé publishable/anon ; l'onglet <code>ORMs</code> affiche les deux URLs Postgres.</>,
      url: 'https://supabase.com/dashboard/project/_?showConnect=true',
      linkLabel: isEn ? 'Open Connect' : 'Ouvrir Connect',
      extra: (
        <p className="help-note">
          {isEn
            ? 'In the ORMs tab: Transaction mode (port 6543) is DATABASE_URL, Session mode (port 5432) is DIRECT_URL. Both come with a [YOUR-PASSWORD] placeholder to replace with the database password you chose in step 1.'
            : "Dans l'onglet ORMs : Transaction mode (port 6543) correspond à DATABASE_URL, Session mode (port 5432) à DIRECT_URL. Les deux contiennent un [YOUR-PASSWORD] à remplacer par le mot de passe de base de données choisi à l'étape 1."}
        </p>
      ),
    },
    {
      key: 'keys',
      title: isEn ? 'Copy the API keys' : 'Copier les clés API',
      desc: isEn
        ? <><code>Project Settings</code> ➔ <code>API Keys</code>. The deployment expects the JWT-format legacy keys: open the <code>Legacy API keys</code> tab and copy <code>anon public</code> and <code>service_role</code>.</>
        : <><code>Project Settings</code> ➔ <code>API Keys</code>. Le déploiement attend les clés legacy au format JWT : ouvrez l'onglet <code>Legacy API keys</code> et copiez <code>anon public</code> et <code>service_role</code>.</>,
      url: 'https://supabase.com/dashboard/project/_/settings/api-keys',
      extra: (
        <p className="help-note">
          {isEn
            ? 'The service_role key bypasses RLS — it stays on the server, never in the browser and never in a commit.'
            : "La clé service_role contourne les règles RLS : elle reste côté serveur, jamais dans le navigateur ni dans un commit."}
        </p>
      ),
    },
  ]

  const scaleway: HelpFlowStep[] = [
    {
      key: 'create',
      title: 'Create an Instance',
      desc: isEn
        ? <><code>Console</code> ➔ <code>Compute</code> ➔ <code>Instances</code> ➔ <code>Create Instance</code>, in the Project whose ID you filled in at step 1.</>
        : <><code>Console</code> ➔ <code>Compute</code> ➔ <code>Instances</code> ➔ <code>Create Instance</code>, dans le Projet dont vous avez renseigné l'ID à l'étape 1.</>,
      url: 'https://console.scaleway.com/instance/servers',
    },
    {
      key: 'settings',
      title: isEn ? 'Set the mandatory options' : 'Renseigner les options obligatoires',
      desc: isEn
        ? 'The whole stack (backend, front, config app, bot, Postgres tooling, Grafana, Prometheus) runs on this single machine.'
        : "Toute la stack (backend, front, app de config, bot, outils Postgres, Grafana, Prometheus) tourne sur cette seule machine.",
      extra: (
        <ul className="help-note">
          <li><strong>Image :</strong> Ubuntu 24.04 LTS</li>
          <li><strong>{isEn ? 'Specs' : 'Ressources'} :</strong> {isEn ? 'at least' : 'au minimum'} 4 vCPU / 16 {isEn ? 'GB' : 'Go'} RAM</li>
          <li><strong>{isEn ? 'Storage' : 'Stockage'} :</strong> block storage 10 {isEn ? 'GB' : 'Go'}+</li>
          <li><strong>{isEn ? 'Network' : 'Réseau'} :</strong> {isEn ? 'enable a public IPv4' : 'activer une IPv4 publique'}</li>
          <li><strong>{isEn ? 'Security' : 'Sécurité'} :</strong> {isEn ? 'add your SSH public key' : 'ajouter votre clé publique SSH'}</li>
        </ul>
      ),
      copyValues: [{ value: 'cat ~/.ssh/id_ed25519.pub', note: isEn ? 'prints your public key' : 'affiche votre clé publique' }],
    },
    {
      key: 'ipv4',
      title: isEn ? 'Copy the public IPv4' : "Copier l'IPv4 publique",
      desc: isEn
        ? <><code>Instances</code> ➔ your instance ➔ <code>Overview</code>. Every DNS A record points at it, and the deployment SSHes into it.</>
        : <><code>Instances</code> ➔ votre instance ➔ <code>Overview</code>. Tous les enregistrements DNS A pointent dessus, et c'est là que le déploiement se connecte en SSH.</>,
      url: 'https://console.scaleway.com/instance/servers',
    },
  ]

  const spaceship: HelpFlowStep[] = [
    {
      key: 'launchpad',
      title: isEn ? 'Open Advanced DNS' : 'Ouvrir Advanced DNS',
      desc: isEn
        ? <>DNS is its own app on Spaceship, reached from the <strong>Launchpad</strong>: the <code>Launchpad</code> button in the top navigation bar, or the search icon (<code>/</code> or <code>⌘ K</code>). Type <code>Advanced DNS</code> and open it — it is not a tab inside a domain's page.</>
        : <>Le DNS est une application à part entière chez Spaceship, ouverte depuis le <strong>Launchpad</strong> : bouton <code>Launchpad</code> dans la barre de navigation, ou icône de recherche (<code>/</code> ou <code>⌘ K</code>). Tapez <code>Advanced DNS</code> et ouvrez-la — ce n'est pas un onglet dans la page d'un domaine.</>,
      url: SPACESHIP_LAUNCHPAD_URL,
      linkLabel: 'Launchpad',
    },
    {
      key: 'dns',
      title: isEn ? 'Pick the domain and open its records' : 'Choisir le domaine et ouvrir ses enregistrements',
      desc: isEn
        ? <>In <code>Advanced DNS</code>, select <code>{domain}</code>, then <code>DNS records</code> ➔ <code>Custom records</code>. <code>Add record</code> opens the type list; each row is then filled in and saved with <code>Add</code>.</>
        : <>Dans <code>Advanced DNS</code>, sélectionnez <code>{domain}</code>, puis <code>DNS records</code> ➔ <code>Custom records</code>. <code>Add record</code> ouvre la liste des types ; chaque ligne se remplit puis se valide avec <code>Add</code>.</>,
      url: SPACESHIP_DNS_HELP_URL,
      linkLabel: isEn ? 'Spaceship DNS help' : 'Aide DNS Spaceship',
      extra: (
        <p className="help-note">
          {isEn
            ? 'These records only take effect while the domain uses Spaceship\'s own nameservers. If you pointed it at custom nameservers (Cloudflare, for one), the records have to be created there instead.'
            : "Ces enregistrements ne s'appliquent que si le domaine utilise les serveurs de noms de Spaceship. Si vous l'avez basculé sur des serveurs de noms personnalisés (Cloudflare, par exemple), c'est là qu'il faut créer les enregistrements."}
        </p>
      ),
    },
    {
      key: 'records',
      title: isEn ? 'Add the DNS records' : 'Ajouter les enregistrements DNS',
      desc: isEn
        ? <>Two A records pointing at the Scaleway IPv4 — the site and the admin panel — plus the MX and TXT records Resend hands you below. The <code>Host</code> field takes the name <strong>without the domain</strong>: <code>@</code> for the site itself, <code>config</code> for the admin panel.</>
        : <>Deux enregistrements A vers l'IPv4 Scaleway — le site et le panneau admin — plus les enregistrements MX et TXT fournis par Resend ci-dessous. Le champ <code>Host</code> attend le nom <strong>sans le domaine</strong> : <code>@</code> pour le site lui-même, <code>config</code> pour le panneau d'administration.</>,
      copyValues: [
        { value: '@', note: isEn ? 'A record — the site' : 'Enregistrement A — le site' },
        { value: 'config', note: isEn ? 'A record — the admin panel' : "Enregistrement A — le panneau d'administration" },
      ],
      extra: (
        <p className="help-note">
          {isEn
            ? <>Typing <code>config.{domain}</code> in that field would create <code>config.{domain}.{domain}</code>. Propagation can take a few minutes; HTTPS certificates are only issued once the A records resolve.</>
            : <>Saisir <code>config.{domain}</code> dans ce champ créerait <code>config.{domain}.{domain}</code>. La propagation peut prendre quelques minutes ; les certificats HTTPS ne sont émis qu'une fois les enregistrements A résolus.</>}
        </p>
      ),
    },
  ]

  const resend: HelpFlowStep[] = [
    {
      key: 'add',
      title: isEn ? 'Add the sending domain' : "Ajouter le domaine d'envoi",
      desc: isEn
        ? <><code>Domains</code> (left menu) ➔ <code>Add Domain</code>. Use a dedicated subdomain, and pick the region closest to your participants.</>
        : <><code>Domains</code> (menu gauche) ➔ <code>Add Domain</code>. Utilisez un sous-domaine dédié, et choisissez la région la plus proche de vos participants.</>,
      url: 'https://resend.com/domains',
      copyValues: [{ value: mailSubdomain, note: isEn ? 'sending subdomain' : "sous-domaine d'envoi" }],
    },
    {
      key: 'records',
      title: isEn ? 'Copy the records into Spaceship' : 'Copier les enregistrements dans Spaceship',
      desc: isEn
        ? <>Resend then displays a MX record and TXT records (DKIM, SPF). Copy their values character for character into <code>Advanced DNS</code> on Spaceship — dropping the domain from each host, as Spaceship's <code>Host</code> field expects (<code>{mailSubdomain}</code> becomes <code>{mailSubdomain.endsWith(`.${domain}`) ? mailSubdomain.slice(0, -(domain.length + 1)) : mailSubdomain}</code>).</>
        : <>Resend affiche alors un enregistrement MX et des enregistrements TXT (DKIM, SPF). Recopiez leurs valeurs à l'identique dans <code>Advanced DNS</code> chez Spaceship — en retirant le domaine de chaque hôte, comme l'attend le champ <code>Host</code> de Spaceship (<code>{mailSubdomain}</code> devient <code>{mailSubdomain.endsWith(`.${domain}`) ? mailSubdomain.slice(0, -(domain.length + 1)) : mailSubdomain}</code>).</>,
    },
    {
      key: 'verify',
      title: isEn ? 'Verify the domain' : 'Vérifier le domaine',
      desc: isEn
        ? <>Back on Resend, click <code>Verify DNS Records</code> and wait for the domain to turn <strong>Verified</strong>. Until then, every send fails.</>
        : <>De retour sur Resend, cliquez sur <code>Verify DNS Records</code> et attendez que le domaine passe en <strong>Verified</strong>. Tant que ce n'est pas le cas, les envois échouent.</>,
      url: 'https://resend.com/domains',
    },
  ]

  return (
    <>
      <HelpService id="svc-supabase" icon={<Database size={15} />} title="Supabase">
        <HelpFlow steps={supabase} />
        <FieldHelpSections step={1} group="SUPABASE" />
      </HelpService>

      <HelpService id="svc-scaleway" icon={<Server size={15} />} title="Scaleway">
        <HelpFlow steps={scaleway} />
        <FieldHelpSections step={1} group="SCALEWAY" />
      </HelpService>

      <HelpService id="svc-spaceship" icon={<Globe size={15} />} title="Spaceship">
        <HelpFlow steps={spaceship} />
      </HelpService>

      <HelpService id="svc-resend" icon={<Mail size={15} />} title="Resend">
        <HelpFlow steps={resend} />
        <FieldHelpSections step={1} group="RESEND" />
      </HelpService>
    </>
  )
}

export function ApiConfiguration() {
  const { t, config, setField, setFields, saveConfig, state } = useApp()
  const { isRunDone, markRunDone, isManualChecked } = useSession()
  const isEn = state.language === 'en'

  // The automation pre-fills the very same fields the manual fallback edits, so
  // a partial or wrong result can always be corrected by hand afterwards.
  const applyPatch = (patch: Record<string, string>) => {
    const typed = patch as Partial<Config>
    setFields(typed)
    // Values obtained from a provider are worth persisting immediately: they
    // may not be retrievable a second time (a secret key is revealed once).
    // The patch is passed explicitly — `saveConfig` alone would write the
    // pre-dispatch config and drop everything that was just retrieved.
    void saveConfig(typed)
  }

  const supabase = useServiceProvision('supabase', applyPatch)

  const domain = config.DOMAIN || '<DOMAIN>'
  const ipv4 = config.IPV4_INSTANCE || '<IPV4_INSTANCE>'
  const mailSubdomain = config.MAIL_SUBDOMAIN || `mail.${domain}`

  /**
   * Spaceship's Host field takes the name *without* the domain — `@` for the
   * apex, `config` for the admin panel — which is also what its API documents
   * ("name of resource record excluding domain name part"). Pasting the full
   * hostname there creates `config.domain.fr.domain.fr`, a record that resolves
   * for nobody and looks right in the table.
   */
  const mailHost = mailSubdomain.endsWith(`.${domain}`)
    ? mailSubdomain.slice(0, -(domain.length + 1))
    : mailSubdomain

  const dnsRecords = [
    { type: 'TXT', host: `_dmarc.${mailHost}`, answer: 'v=DMARC1;p=none;', ttl: '3600' },
    { type: 'A', host: '@', answer: ipv4, ttl: '3600' },
    { type: 'A', host: 'config', answer: ipv4, ttl: '3600' },
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
  const isResendComplete = !!(config.FROM_EMAIL && config.ALLOWED_EMAILS && isManualChecked('resend-subdomain'))

  // Supabase copies its Postgres URLs out with `[YOUR-PASSWORD]` still in them;
  // both fields offer to substitute the database password on the spot.
  const pwFill = {
    token: '[YOUR-PASSWORD]',
    label: t('apiConfig.supabase.pwFill.label'),
    inputPlaceholder: t('apiConfig.supabase.pwFill.placeholder'),
    btnLabel: t('apiConfig.supabase.pwFill.btn'),
  }

  // Not yet automated — these two still run on the manual fallback, and their
  // checkboxes are what say the work was done.
  const [spaceshipStatus] = useState<Status>('idle')
  const [resendStatus] = useState<Status>('idle')

  const {
    status: scalewayStatus,
    logs: scwLogs,
    progress: scwProgress,
    start: startScaleway,
    cancel: cancelScaleway,
  } = useScalewayInstance()

  const { selectedSshKey } = useApp()
  const sshSelectorRef = useRef<SshKeySelectorHandle>(null)

  const statusLabels = {
    done: t('apiConfig.status.done'),
    running: t('apiConfig.status.running'),
    error: t('apiConfig.status.error'),
  }

  /**
   * A run that succeeded earlier in this session keeps its block green after
   * the page is remounted — leaving step 2 and coming back resets the hooks,
   * not what happened. The config the run brought back is already persisted;
   * this only concerns how the block reads.
   */
  const supabaseStatus: Status = supabase.status === 'idle' && isRunDone('api-supabase')
    ? 'done'
    : supabase.status
  const scwStatus: Status = scalewayStatus === 'idle' && isRunDone('api-scaleway')
    ? 'done'
    : scalewayStatus

  useEffect(() => {
    if (supabase.status === 'done') markRunDone('api-supabase')
  }, [supabase.status])

  useEffect(() => {
    if (scalewayStatus === 'done') markRunDone('api-scaleway')
  }, [scalewayStatus])

  const handleStartScaleway = async (keyToUse: SshKeyInfo | null = selectedSshKey) => {
    if (!config.SCW_SECRET_KEY || !config.SCW_DEFAULT_PROJECT_ID) {
      toast.error(
        isEn
          ? 'Please provide your Scaleway Secret Key and Project ID in step 1.'
          : "Veuillez renseigner votre clé secrète Scaleway et votre Project ID à l'étape 1."
      )
      return
    }

    if (!keyToUse) {
      sshSelectorRef.current?.openModal()
      toast(
        isEn
          ? 'Please select an SSH key, then click Launch.'
          : 'Veuillez choisir une clé SSH, puis cliquez sur Lancer.'
      )
      return
    }

    const res = await startScaleway({
      secretKey: config.SCW_SECRET_KEY,
      projectId: config.SCW_DEFAULT_PROJECT_ID,
      sshPublicKey: keyToUse.publicKey,
      sshKeyName: keyToUse.name || 'intriqathon-key',
    })

    if (res.success && res.ipv4) {
      setField('IPV4_INSTANCE', res.ipv4)
      toast.success(
        isEn
          ? `Scaleway instance ready! IP: ${res.ipv4}`
          : `Instance Scaleway prête ! IP : ${res.ipv4}`
      )
      if (window.electronAPI?.vaultSave) {
        await window.electronAPI.vaultSave({ ...config, IPV4_INSTANCE: res.ipv4 })
      }
    } else if (res.error) {
      toast.error(res.error, { duration: 6000 })
    }
  }

  /**
   * What each automation needs before it can run.
   *
   * Supabase depends only on step 1. The other three form a chain — Scaleway
   * produces the IPv4 the DNS records point at, and Resend cannot verify its
   * domain until those records exist — so their buttons stay locked until the
   * value they consume is there. Locking the button never locks the manual
   * fields below it: when the chain is stuck, filling them in by hand is the
   * way forward.
   */
  const supabaseLock = !config.SUPABASE_ACCESS_TOKEN
    ? t('apiConfig.locked.supabaseToken')
    : !config.SUPABASE_DB_PASSWORD
      ? t('apiConfig.locked.supabasePassword')
      : !isAccountComplete(config, 'supabase')
        ? t('apiConfig.locked.accountSupabase')
        : null

  const scalewayLock = !config.SCW_SECRET_KEY || !config.SCW_DEFAULT_PROJECT_ID
    ? t('apiConfig.locked.scalewayKeys')
    : !isAccountComplete(config, 'scaleway')
      ? t('apiConfig.locked.accountScaleway')
      : null

  const spaceshipLock = !config.DOMAIN
    ? t('apiConfig.locked.needsDomain')
    : !isAccountComplete(config, 'spaceship')
      ? t('apiConfig.locked.accountSpaceship')
      : !config.IPV4_INSTANCE
        ? t('apiConfig.locked.needsIpv4')
        : null

  const resendLock = !isAccountComplete(config, 'resend')
    ? t('apiConfig.locked.accountResend')
    : !config.DOMAIN
      ? t('apiConfig.locked.needsDomain')
      : !config.IPV4_INSTANCE
        ? t('apiConfig.locked.needsDns')
        : null

  const handleStartSupabase = () => {
    if (supabaseLock) return
    void supabase.startSupabase({
      accessToken: config.SUPABASE_ACCESS_TOKEN,
      dbPassword: config.SUPABASE_DB_PASSWORD,
      mode: config.SUPABASE_PROJECT_MODE === 'create' ? 'create' : 'existing',
      // Present once a project has been resolved — reusing it is what stops a
      // second click from creating a second project.
      ref: config.SUPABASE_PROJECT_REF || undefined,
      projectName: config.SUPABASE_PROJECT_NAME,
      organizationSlug: config.SUPABASE_ORG_SLUG,
      regionCode: config.SUPABASE_REGION,
    })
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
          logs={supabase.logs}
          progress={supabase.progress}
          locked={!!supabaseLock}
          lockedReason={supabaseLock ?? undefined}
          errorMessage={supabase.error}
          onStart={handleStartSupabase}
          onCancel={supabase.cancel}
          btnStartLabel={t('apiConfig.btnStart')}
          btnRetryLabel={t('apiConfig.btnRetry')}
          btnRerunLabel={t('apiConfig.btnRerun')}
          btnCancelLabel={t('apiConfig.btnCancel')}
          statusLabels={statusLabels}
          helpAnchor="svc-supabase"
          helpHint={t('apiConfig.supabase.helpHint')}
          manualLabel={t('apiConfig.manualConfig')}
        >
          <div className="form-section">
            {/* The buckets have to exist before anything is uploaded — same
                walkthrough as the help panel, kept at hand in the card. */}
            <div>
              <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderPlus size={16} color="var(--color-primary-text)" />
                {t('apiConfig.supabase.buckets.title')}
              </div>
              <p className="text-muted" style={{ margin: '0 0 12px', fontSize: 'var(--font-size-base)', lineHeight: 1.5 }}>
                {t('apiConfig.supabase.buckets.desc')}
              </p>
              <ul className="bucket-list">
                {STORAGE_BUCKETS.map(b => (
                  <li key={b.name}>
                    <CopyChip value={b.name} />
                    <span className="bucket-list__note">
                      {b.isPublic
                        ? <><strong>{t('apiConfig.supabase.buckets.public')}</strong> — {isEn ? b.en : b.fr}</>
                        : <>{t('apiConfig.supabase.buckets.private')} — {isEn ? b.en : b.fr}</>}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="link-buttons-row" style={{ margin: '12px 0 8px' }}>
                <ExternalLinkBtn url={BUCKETS_URL} label={t('apiConfig.supabase.buckets.btn')} />
              </div>
              {/* The buckets leave nothing in the config — without this box,
                  nothing downstream can tell they exist. */}
              <ManualCheck
                checkKey="supabase-buckets"
                label={isEn
                  ? `I created the ${STORAGE_BUCKETS.length} buckets with these exact names`
                  : `J'ai créé les ${STORAGE_BUCKETS.length} buckets avec exactement ces noms`}
                hint={isEn
                  ? 'Not needed when the automatic run above succeeded — it creates them itself.'
                  : "Inutile si le lancement automatique ci-dessus a réussi — il les crée lui-même."}
              />
            </div>

            <FormField id="supabase-url" label={t('apiConfig.supabase.url')} value={config.SUPABASE_URL} onChange={v => setField('SUPABASE_URL', v)} placeholder="https://xyz.supabase.co" />
            <FormField id="supabase-anon" label={t('apiConfig.supabase.anonKey')} value={config.SUPABASE_ANON_KEY} onChange={v => setField('SUPABASE_ANON_KEY', v)} placeholder="eyJhbG..." multiline />
            <FormField id="supabase-service" label={t('apiConfig.supabase.serviceKey')} value={config.SUPABASE_SERVICE_ROLE_KEY} onChange={v => setField('SUPABASE_SERVICE_ROLE_KEY', v)} placeholder="eyJhbG..." type="password" multiline />
            <FormField id="database-url" label={t('apiConfig.supabase.databaseUrl')} value={config.DATABASE_URL} onChange={v => setField('DATABASE_URL', v)} placeholder="postgresql://..." type="password" multiline tokenFill={pwFill} />
            <FormField id="direct-url" label={t('apiConfig.supabase.directUrl')} value={config.DIRECT_URL} onChange={v => setField('DIRECT_URL', v)} placeholder="postgresql://..." type="password" multiline tokenFill={pwFill} />


          </div>
        </ServiceConfigBlock>

        {/* Scaleway */}
        <ServiceConfigBlock
          stepNumber={2}
          serviceName="SCALEWAY"
          serviceIcon={<Server size={18} color="var(--color-primary-text)" />}
          description={t('apiConfig.scaleway.desc')}
          status={scwStatus}
          isComplete={isScalewayComplete}
          locked={!!scalewayLock}
          lockedReason={scalewayLock ?? undefined}
          onStart={() => handleStartScaleway()}
          onCancel={cancelScaleway}
          logs={scwLogs}
          progress={scwProgress}
          btnStartLabel={t('apiConfig.btnStart')}
          btnRerunLabel={t('apiConfig.btnRerun')}
          btnCancelLabel={t('apiConfig.btnCancel')}
          statusLabels={statusLabels}
          helpAnchor="svc-scaleway"
          helpHint={t('apiConfig.scaleway.helpHint')}
          extra={
            <SshKeySelector
              ref={sshSelectorRef}
              label={isEn ? 'Authentication SSH key' : "Clé SSH d'authentification"}
            />
          }
          manualLabel={t('apiConfig.manualConfig')}
        >
          <div className="form-section">
            <FormField id="ipv4" label={t('apiConfig.spaceship.ipv4')} value={config.IPV4_INSTANCE} onChange={v => setField('IPV4_INSTANCE', v)} placeholder="198.51.100.1" />

            <div style={{ fontWeight: 600, marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={16} color="var(--color-primary-text)" />
              {t('step1.specs.title')}
            </div>
            <IconRowList className="icon-row-list--spaced" items={specs} />
          </div>
        </ServiceConfigBlock>

        {/* Spaceship */}
        <ServiceConfigBlock
          stepNumber={3}
          serviceName="SPACESHIP"
          serviceIcon={<Globe size={18} color="var(--color-primary-text)" />}
          description={t('apiConfig.spaceship.desc')}
          status={spaceshipStatus}
          locked={!!spaceshipLock}
          lockedReason={spaceshipLock ?? undefined}
          onStart={() => handleStart('Spaceship')}
          onCancel={() => handleCancel('Spaceship')}
          btnStartLabel={t('apiConfig.btnStart')}
          btnCancelLabel={t('apiConfig.btnCancel')}
          statusLabels={statusLabels}
          helpAnchor="svc-spaceship"
          helpHint={t('apiConfig.spaceship.helpHint')}
          manualLabel={t('apiConfig.manualConfig')}
        >
          <div className="form-section">
            <div>
              <div style={{ fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={16} color="var(--color-primary-text)" />
                {t('step4.dns.title')}
              </div>
              <p className="text-muted" style={{ margin: '0 0 12px', fontSize: 'var(--font-size-base)', lineHeight: 1.5 }}>
                {t('apiConfig.spaceship.dnsPath')}
              </p>
              <p className="text-muted" style={{ margin: '0 0 12px', fontSize: 'var(--font-size-base)', lineHeight: 1.5 }}>
                {t('apiConfig.spaceship.hostNote')}
              </p>
              <div className="link-buttons-row" style={{ marginBottom: '16px' }}>
                <ExternalLinkBtn url={SPACESHIP_LAUNCHPAD_URL} label="Launchpad" />
                <ExternalLinkBtn url={SPACESHIP_DNS_HELP_URL} label={isEn ? 'Spaceship DNS help' : 'Aide DNS Spaceship'} />
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
              <ManualCheck
                checkKey="spaceship-dns"
                label={isEn
                  ? 'I added these records in Advanced DNS'
                  : "J'ai ajouté ces enregistrements dans Advanced DNS"}
                hint={isEn
                  ? 'The two A records and the DMARC record, plus the MX and TXT records Resend hands you.'
                  : 'Les deux enregistrements A et le DMARC, plus les MX et TXT fournis par Resend.'}
              />
            </div>
          </div>
        </ServiceConfigBlock>

        {/* Resend */}
        <ServiceConfigBlock
          stepNumber={4}
          serviceName="RESEND"
          serviceIcon={<Mail size={18} color="var(--color-primary-text)" />}
          description={t('apiConfig.resend.desc')}
          status={resendStatus}
          isComplete={isResendComplete}
          locked={!!resendLock}
          lockedReason={resendLock ?? undefined}
          onStart={() => handleStart('Resend')}
          onCancel={() => handleCancel('Resend')}
          btnStartLabel={t('apiConfig.btnStart')}
          btnCancelLabel={t('apiConfig.btnCancel')}
          statusLabels={statusLabels}
          helpAnchor="svc-resend"
          helpHint={t('apiConfig.resend.helpHint')}
          manualLabel={t('apiConfig.manualConfig')}
        >
          <div className="form-section">
            <div>
            <div style={{ fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={16} color="var(--color-primary-text)" />
              {t('step4.subdomain')}
            </div>
            <CopyRow label={t('step4.subdomain')} content={mailSubdomain} />
            <ManualCheck
              checkKey="resend-subdomain"
              label={isEn
                ? 'I added this subdomain in Resend and verified it'
                : "J'ai ajouté ce sous-domaine dans Resend et l'ai vérifié"}
              hint={isEn
                ? 'Resend then hands you the MX and TXT records to add at Spaceship; the domain must read Verified before a single email goes out.'
                : "Resend fournit ensuite les enregistrements MX et TXT à ajouter chez Spaceship ; le domaine doit afficher Verified avant tout envoi."}
            />
          </div>

            <FormField id="from-email" label={t('apiConfig.supabase.fromEmail')} value={config.FROM_EMAIL} onChange={v => setField('FROM_EMAIL', v)} placeholder="Hackathon Team <onboarding@mail.domain.com>" />
            <FormField id="allowed-emails" label={t('apiConfig.supabase.allowedEmails')} value={config.ALLOWED_EMAILS} onChange={v => setField('ALLOWED_EMAILS', v)} placeholder="*" />
          </div>
        </ServiceConfigBlock>

      </div>
    </WizardLayout>
  )
}
