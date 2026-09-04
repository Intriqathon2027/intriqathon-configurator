import { useState } from 'react'
import { Database, Mail, Globe, Server, Info, AlertTriangle, Cpu, MemoryStick, HardDrive, Monitor } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { ServiceConfigBlock } from '../components/ui/ServiceConfigBlock'
import { FormField } from '../components/ui/FormField'
import { CopyRow } from '../components/ui/CopyBlock'
import { useApp } from '../context/AppContext'
import { FieldHelpSections } from '../components/ui/HelpSection'
import { IconRowList, type IconRowItem } from '../components/ui/IconRowList'
import { HelpFlow, type HelpFlowStep } from '../components/ui/HelpFlow'
import { HelpService } from '../components/ui/HelpService'

type Status = 'idle' | 'running' | 'done' | 'error'

function HelpContent() {
  const { state, config } = useApp()
  const isEn = state.language === 'en'
  const domain = config.DOMAIN || 'votredomaine.fr'

  const supabase: HelpFlowStep[] = [
    {
      key: 'buckets',
      title: isEn ? 'Create the storage buckets' : 'Créer les buckets de stockage',
      desc: isEn
        ? <><code>Storage</code> (left sidebar) ➔ <code>New bucket</code>. The app reads and writes <strong>five separate buckets</strong> — create them all, exactly with these names.</>
        : <><code>Storage</code> (barre latérale gauche) ➔ <code>New bucket</code>. L'application lit et écrit dans <strong>cinq buckets distincts</strong> — créez-les tous, avec exactement ces noms.</>,
      url: 'https://supabase.com/dashboard/project/_/storage/buckets',
      copyValues: [
        { value: 'public_files', note: <>{isEn ? 'tick ' : 'cochez '}<strong>Public bucket</strong> — {isEn ? 'logo, partner logos, media' : 'logo, logos partenaires, médias'}</> },
        { value: 'annonces', note: isEn ? 'private — announcement attachments' : 'privé — pièces jointes des annonces' },
        { value: 'users', note: isEn ? 'private — profile pictures' : 'privé — photos de profil' },
        { value: 'submissions', note: isEn ? 'private — project submissions' : 'privé — livrables des équipes' },
        { value: 'evaluations', note: isEn ? 'private — jury evaluation files' : "privé — fichiers d'évaluation du jury" },
      ],
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
      title: 'Launchpad',
      desc: isEn
        ? <>Everything in Spaceship is reached through the <strong>Launchpad</strong>, its app launcher: the <code>Launchpad</code> button in the top navigation bar, or the <code>/</code> or <code>⌘ K</code> shortcut. Type <code>Domain Portfolio</code> to open the list of your domains.</>
        : <>Tout, chez Spaceship, passe par le <strong>Launchpad</strong>, son lanceur d'applications : bouton <code>Launchpad</code> dans la barre de navigation, ou raccourci <code>/</code> ou <code>⌘ K</code>. Tapez <code>Domain Portfolio</code> pour ouvrir la liste de vos domaines.</>,
    },
    {
      key: 'dns',
      title: 'Advanced DNS',
      desc: isEn
        ? <><code>Domain Portfolio</code> ➔ click <code>{domain}</code> ➔ <code>Manage</code> ➔ <code>Advanced DNS</code>. This is where the records below are added.</>
        : <><code>Domain Portfolio</code> ➔ cliquez sur <code>{domain}</code> ➔ <code>Manage</code> ➔ <code>Advanced DNS</code>. C'est ici que s'ajoutent les enregistrements ci-dessous.</>,
    },
    {
      key: 'records',
      title: isEn ? 'Add the DNS records' : 'Ajouter les enregistrements DNS',
      desc: isEn
        ? <>Two A records pointing at the Scaleway IPv4 — the site and the admin panel — plus the MX and TXT records Resend hands you below.</>
        : <>Deux enregistrements A vers l'IPv4 Scaleway — le site et le panneau admin — plus les enregistrements MX et TXT fournis par Resend ci-dessous.</>,
      copyValues: [
        { value: domain, note: isEn ? 'A record — the site' : 'Enregistrement A — le site' },
        { value: `config.${domain}`, note: isEn ? 'A record — the admin panel' : "Enregistrement A — le panneau d'administration" },
      ],
      extra: (
        <p className="help-note">
          {isEn
            ? 'Propagation can take a few minutes; HTTPS certificates are only issued once the A records resolve.'
            : "La propagation peut prendre quelques minutes ; les certificats HTTPS ne sont émis qu'une fois les enregistrements A résolus."}
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
      copyValues: [{ value: `mail.${domain}`, note: isEn ? 'sending subdomain' : "sous-domaine d'envoi" }],
    },
    {
      key: 'records',
      title: isEn ? 'Copy the records into Spaceship' : 'Copier les enregistrements dans Spaceship',
      desc: isEn
        ? <>Resend then displays a MX record and TXT records (DKIM, SPF). Copy them character for character into <code>Advanced DNS</code> on Spaceship.</>
        : <>Resend affiche alors un enregistrement MX et des enregistrements TXT (DKIM, SPF). Recopiez-les à l'identique dans <code>Advanced DNS</code> chez Spaceship.</>,
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
          helpAnchor="svc-supabase"
          helpHint={t('apiConfig.supabase.helpHint')}
          manualLabel={t('apiConfig.manualConfig')}
        >
          <div className="form-section">
            <FormField id="supabase-url" label={t('apiConfig.supabase.url')} value={config.SUPABASE_URL} onChange={v => setField('SUPABASE_URL', v)} placeholder="https://xyz.supabase.co" />
            <FormField id="supabase-anon" label={t('apiConfig.supabase.anonKey')} value={config.SUPABASE_ANON_KEY} onChange={v => setField('SUPABASE_ANON_KEY', v)} placeholder="eyJhbG..." multiline />
            <FormField id="supabase-service" label={t('apiConfig.supabase.serviceKey')} value={config.SUPABASE_SERVICE_ROLE_KEY} onChange={v => setField('SUPABASE_SERVICE_ROLE_KEY', v)} placeholder="eyJhbG..." type="password" multiline />
            <FormField id="database-url" label={t('apiConfig.supabase.databaseUrl')} value={config.DATABASE_URL} onChange={v => setField('DATABASE_URL', v)} placeholder="postgresql://..." type="password" multiline />
            <FormField id="direct-url" label={t('apiConfig.supabase.directUrl')} value={config.DIRECT_URL} onChange={v => setField('DIRECT_URL', v)} placeholder="postgresql://..." type="password" multiline />


          </div>
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
          helpAnchor="svc-scaleway"
          helpHint={t('apiConfig.scaleway.helpHint')}
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
          </div>

            <FormField id="from-email" label={t('apiConfig.supabase.fromEmail')} value={config.FROM_EMAIL} onChange={v => setField('FROM_EMAIL', v)} placeholder="Hackathon Team <onboarding@mail.domain.com>" />
            <FormField id="allowed-emails" label={t('apiConfig.supabase.allowedEmails')} value={config.ALLOWED_EMAILS} onChange={v => setField('ALLOWED_EMAILS', v)} placeholder="*" />
          </div>
        </ServiceConfigBlock>

      </div>
    </WizardLayout>
  )
}
