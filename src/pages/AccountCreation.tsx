import { useEffect } from 'react'
import { Database, Mail, Globe, Server, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { WizardLayout } from '../components/layout/WizardLayout'
import { FormField } from '../components/ui/FormField'
import { ServiceAccountCard } from '../components/ui/ServiceAccountCard'
import { useApp } from '../context/AppContext'
import { FieldHelpSections } from '../components/ui/HelpSection'
import { HelpFlow, type HelpFlowStep } from '../components/ui/HelpFlow'
import { HelpService } from '../components/ui/HelpService'

function HelpContent() {
  const { state } = useApp()
  const isEn = state.language === 'en'

  const supabase: HelpFlowStep[] = [
    {
      key: 'account',
      title: isEn ? 'Create a Supabase account' : 'Créer un compte Supabase',
      desc: isEn
        ? 'Sign up on supabase.com — GitHub sign-in is the quickest route.'
        : "Inscrivez-vous sur supabase.com — la connexion via GitHub est la voie la plus rapide.",
      url: 'https://supabase.com/dashboard/sign-up',
    },
    {
      key: 'project',
      title: isEn ? 'New Project' : 'New Project',
      desc: isEn
        ? 'From the dashboard, click New project. Pick a name, a region close to your participants, and a strong database password without the "?" character.'
        : "Depuis le dashboard, cliquez sur New project. Choisissez un nom, une région proche de vos participants et un mot de passe de base de données fort, sans caractère \"?\".",
      url: 'https://supabase.com/dashboard/new',
      extra: (
        <p className="help-note">
          {isEn
            ? 'Keep that password: it goes back into DATABASE_URL and DIRECT_URL in step 2.'
            : "Conservez ce mot de passe : il est réinjecté dans DATABASE_URL et DIRECT_URL à l'étape 2."}
        </p>
      ),
    },
    {
      key: 'pat',
      title: isEn ? 'Generate an access token' : "Générer un jeton d'accès",
      desc: isEn
        ? <>Profile icon (top right) ➔ <code>Account</code> ➔ <code>Access Tokens</code> ➔ <code>Generate new token</code>.</>
        : <>Icône de profil (haut droite) ➔ <code>Account</code> ➔ <code>Access Tokens</code> ➔ <code>Generate new token</code>.</>,
      url: 'https://supabase.com/dashboard/account/tokens',
    },
    {
      key: 's3',
      title: isEn ? 'Create an S3 access key' : "Créer une clé d'accès S3",
      desc: isEn
        ? <>In your project: <code>Storage</code> ➔ <code>S3 Configuration</code> ➔ <code>Access keys</code> ➔ <code>New access key</code>. Both S3 values below come from that single key pair.</>
        : <>Dans votre projet : <code>Storage</code> ➔ <code>S3 Configuration</code> ➔ <code>Access keys</code> ➔ <code>New access key</code>. Les deux valeurs S3 ci-dessous proviennent de cette même paire.</>,
      url: 'https://supabase.com/dashboard/project/_/storage/s3',
    },
  ]

  const resend: HelpFlowStep[] = [
    {
      key: 'account',
      title: isEn ? 'Create a Resend account' : 'Créer un compte Resend',
      desc: isEn
        ? 'Sign up on resend.com and confirm the verification email.'
        : "Inscrivez-vous sur resend.com et validez l'email de vérification.",
      url: 'https://resend.com/signup',
    },
    {
      key: 'key',
      title: isEn ? 'Create an API key' : 'Créer une clé API',
      desc: isEn
        ? <><code>API Keys</code> (left menu) ➔ <code>Create API Key</code>. Full access is enough; the sending domain is added in step 2.</>
        : <><code>API Keys</code> (menu gauche) ➔ <code>Create API Key</code>. L'accès complet suffit ; le domaine d'envoi s'ajoute à l'étape 2.</>,
      url: 'https://resend.com/api-keys',
    },
  ]

  const spaceship: HelpFlowStep[] = [
    {
      key: 'account',
      title: isEn ? 'Create a Spaceship account' : 'Créer un compte Spaceship',
      desc: isEn
        ? 'Sign up on spaceship.com, then sign in.'
        : "Créez un compte sur spaceship.com, puis connectez-vous.",
      url: 'https://www.spaceship.com/auth/',
    },
    {
      key: 'domain',
      title: isEn ? 'Buy the domain' : 'Acheter le domaine',
      desc: isEn
        ? 'One domain is enough: the site, the admin panel (config.yourdomain) and the mail subdomain all derive from it.'
        : "Un seul domaine suffit : le site, le panneau admin (config.votredomaine) et le sous-domaine mail en découlent.",
      url: 'https://www.spaceship.com/domain-search/',
    },
    {
      key: 'launchpad',
      title: 'Launchpad',
      desc: isEn
        ? <>The <strong>Launchpad</strong> is Spaceship's app launcher — everything else is reached through it. Open it with the <code>Launchpad</code> button in the top navigation bar, or with the <code>/</code> or <code>⌘ K</code> shortcut, then type the name of the app you want.</>
        : <>Le <strong>Launchpad</strong> est le lanceur d'applications de Spaceship : tout le reste passe par lui. Ouvrez-le avec le bouton <code>Launchpad</code> de la barre de navigation, ou par le raccourci <code>/</code> ou <code>⌘ K</code>, puis tapez le nom de l'app voulue.</>,
    },
    {
      key: 'apikey',
      title: 'API Manager ➔ New API key',
      desc: isEn
        ? <><code>Launchpad</code> ➔ <code>API Manager</code> ➔ <code>New API key</code>. Accept the terms, then copy the key and its secret — the secret is shown only once.</>
        : <><code>Launchpad</code> ➔ <code>API Manager</code> ➔ <code>New API key</code>. Acceptez les conditions, puis copiez la clé et son secret — le secret n'est affiché qu'une seule fois.</>,
      url: 'https://www.spaceship.com/application/api-manager/',
      extra: (
        <p className="help-note">
          {isEn
            ? 'Enable at least the domains:read, dnsrecords:read and dnsrecords:write scopes so the DNS records can be created for you.'
            : "Activez au minimum les scopes domains:read, dnsrecords:read et dnsrecords:write pour que les enregistrements DNS puissent être créés automatiquement."}
        </p>
      ),
    },
  ]

  const scaleway: HelpFlowStep[] = [
    {
      key: 'account',
      title: isEn ? 'Create a Scaleway account' : 'Créer un compte Scaleway',
      desc: isEn
        ? 'Sign up on console.scaleway.com and confirm your email.'
        : "Inscrivez-vous sur console.scaleway.com et confirmez votre email.",
      url: 'https://console.scaleway.com/register',
    },
    {
      key: 'payment',
      title: isEn ? 'Add a payment method' : 'Ajouter un moyen de paiement',
      desc: isEn
        ? <><code>Billing</code> ➔ <code>Payment and billing</code> ➔ <code>Add a credit card</code>. No instance can be created in step 2 without it.</>
        : <><code>Billing</code> ➔ <code>Payment and billing</code> ➔ <code>Add a credit card</code>. Sans cela, aucune instance ne peut être créée à l'étape 2.</>,
      url: 'https://console.scaleway.com/billing/payment',
    },
    {
      key: 'apikey',
      title: isEn ? 'Generate an API key' : 'Générer une clé API',
      desc: isEn
        ? <>Profile menu (top right) ➔ <code>IAM &amp; API keys</code> ➔ <code>API keys</code> tab ➔ <code>Generate API key</code>.</>
        : <>Menu de profil (haut droite) ➔ <code>IAM &amp; API keys</code> ➔ onglet <code>API keys</code> ➔ <code>Generate API key</code>.</>,
      url: 'https://console.scaleway.com/iam/api-keys',
    },
    {
      key: 'project',
      title: isEn ? 'Copy the Project ID' : 'Copier le Project ID',
      desc: isEn
        ? <><code>Organization</code> ➔ <code>Projects</code> ➔ your project. The instance will be created inside it.</>
        : <><code>Organization</code> ➔ <code>Projects</code> ➔ votre projet. C'est là que l'instance sera créée.</>,
      url: 'https://console.scaleway.com/organization/projects',
    },
  ]

  return <>
    <HelpService id="svc-supabase" icon={<Database size={15} />} title="Supabase">
      <HelpFlow steps={supabase} />
      <FieldHelpSections step={0} group="SUPABASE" />
    </HelpService>

    <HelpService id="svc-resend" icon={<Mail size={15} />} title="Resend">
      <HelpFlow steps={resend} />
      <FieldHelpSections step={0} group="RESEND" />
    </HelpService>

    <HelpService id="svc-spaceship" icon={<Globe size={15} />} title="Spaceship">
      <HelpFlow steps={spaceship} />
      <FieldHelpSections step={0} group="SPACESHIP" />
    </HelpService>

    <HelpService id="svc-scaleway" icon={<Server size={15} />} title="Scaleway">
      <HelpFlow steps={scaleway} />
      <FieldHelpSections step={0} group="SCALEWAY" />
    </HelpService>
  </>
}

export function AccountCreation() {
  const { t, config, setField, hasSavedConfig } = useApp()

  useEffect(() => {
    if (!hasSavedConfig) {
      toast(t('accountCreation.help.toast'), {
        icon: '💡',
        duration: 6000,
        id: 'help-toast'
      })
    }
  }, [hasSavedConfig, t])

  const openFolderDialog = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.openFolderDialog()
      if (path) setField('DEPLOY_PATH', path)
    }
  }

  // Completion checks
  const isSupabaseComplete = !!(
    config.SUPABASE_ACCESS_TOKEN &&
    config.S3_ACCESS_KEY_ID &&
    config.S3_SECRET_ACCESS_KEY
  )
  const isResendComplete = !!config.RESEND_API_KEY
  const isSpaceshipComplete = !!(
    config.DOMAIN &&
    config.SPACESHIP_API_KEY &&
    config.SPACESHIP_API_SECRET
  )
  const isScalewayComplete = !!(
    config.SCW_SECRET_KEY &&
    config.SCW_DEFAULT_PROJECT_ID &&
    config.DEPLOY_PATH
  )

  return (
    <WizardLayout
      title={t('accountCreation.title')}
      description={t('accountCreation.desc')}
      helpContent={<HelpContent />}
    >
      <div className="service-account-grid">
        {/* Supabase */}
        <ServiceAccountCard
          serviceName={t('accountCreation.supabase.title')}
          serviceIcon={<Database size={16} color="var(--color-primary-text)" />}
          helpAnchor="svc-supabase"
          isComplete={isSupabaseComplete}
        >
          <div className="form-section">
            <FormField
              id="supabase-pat"
              label={t('accountCreation.supabase.pat')}
              value={config.SUPABASE_ACCESS_TOKEN}
              onChange={v => setField('SUPABASE_ACCESS_TOKEN', v)}
              placeholder="sbp_abc123..."
              type="password"
            />
            <FormField
              id="s3-access-key"
              label={t('accountCreation.supabase.s3AccessKey')}
              value={config.S3_ACCESS_KEY_ID}
              onChange={v => setField('S3_ACCESS_KEY_ID', v)}
              placeholder="625b..."
            />
            <FormField
              id="s3-secret"
              label={t('accountCreation.supabase.s3SecretKey')}
              value={config.S3_SECRET_ACCESS_KEY}
              onChange={v => setField('S3_SECRET_ACCESS_KEY', v)}
              placeholder="5w36..."
              type="password"
            />
          </div>
        </ServiceAccountCard>

        {/* Resend */}
        <ServiceAccountCard
          serviceName={t('accountCreation.resend.title')}
          serviceIcon={<Mail size={16} color="var(--color-primary-text)" />}
          helpAnchor="svc-resend"
          isComplete={isResendComplete}
        >
          <div className="form-section">
            <FormField
              id="resend-api-key"
              label={t('accountCreation.resend.apiKey')}
              value={config.RESEND_API_KEY}
              onChange={v => setField('RESEND_API_KEY', v)}
              placeholder="re_abc123..."
              type="password"
            />
          </div>
        </ServiceAccountCard>

        {/* Spaceship */}
        <ServiceAccountCard
          serviceName={t('accountCreation.spaceship.title')}
          serviceIcon={<Globe size={16} color="var(--color-primary-text)" />}
          helpAnchor="svc-spaceship"
          isComplete={isSpaceshipComplete}
        >
          <div className="form-section">
            <FormField
              id="domain"
              label={t('accountCreation.spaceship.domain')}
              value={config.DOMAIN}
              onChange={v => setField('DOMAIN', v)}
              placeholder={t('accountCreation.spaceship.domain.placeholder')}
            />
            <FormField
              id="spaceship-api-key"
              label={t('accountCreation.spaceship.apiKey')}
              value={config.SPACESHIP_API_KEY}
              onChange={v => setField('SPACESHIP_API_KEY', v)}
              placeholder="sk_abc123..."
            />
            <FormField
              id="spaceship-api-secret"
              label={t('accountCreation.spaceship.apiSecret')}
              value={config.SPACESHIP_API_SECRET}
              onChange={v => setField('SPACESHIP_API_SECRET', v)}
              placeholder="ss_xyz789..."
              type="password"
            />
          </div>
        </ServiceAccountCard>

        {/* Scaleway */}
        <ServiceAccountCard
          serviceName={t('accountCreation.scaleway.title')}
          serviceIcon={<Server size={16} color="var(--color-primary-text)" />}
          helpAnchor="svc-scaleway"
          isComplete={isScalewayComplete}
        >
          <div className="form-section">
            <FormField
              id="scw-secret-key"
              label={t('accountCreation.scaleway.secretKey')}
              value={config.SCW_SECRET_KEY}
              onChange={v => setField('SCW_SECRET_KEY', v)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              type="password"
            />
            <FormField
              id="scw-project-id"
              label={t('accountCreation.scaleway.projectId')}
              value={config.SCW_DEFAULT_PROJECT_ID}
              onChange={v => setField('SCW_DEFAULT_PROJECT_ID', v)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
            <FormField
              id="deploy-path"
              label={t('accountCreation.scaleway.deployPath')}
              value={config.DEPLOY_PATH}
              onChange={v => setField('DEPLOY_PATH', v)}
              placeholder={t('accountCreation.scaleway.deployPath.placeholder')}
              rightElement={
                <button className="btn btn-secondary" onClick={openFolderDialog} id="btn-browse-folder">
                  <FolderOpen size={14} />
                  {t('btn.browse')}
                </button>
              }
            />
          </div>
        </ServiceAccountCard>
      </div>
    </WizardLayout>
  )
}
