import { useEffect } from 'react'
import { Database, Mail, Globe, Server, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { WizardLayout } from '../components/layout/WizardLayout'
import { FormField } from '../components/ui/FormField'
import { ServiceAccountCard } from '../components/ui/ServiceAccountCard'
import { useApp } from '../context/AppContext'
import { HelpFlow, type HelpFlowStep } from '../components/ui/HelpFlow'
import { HelpService } from '../components/ui/HelpService'
import { SupabaseProjectSetup } from '../components/provision/SupabaseProjectSetup'
import { isAccountComplete } from '../utils/serviceCompletion'

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
      key: 'pat',
      title: isEn ? 'Generate an access token' : "Générer un jeton d'accès",
      desc: isEn
        ? <>Profile icon (top right) ➔ <code>Account</code> ➔ <code>Access Tokens</code> ➔ <code>Generate new token</code>. <strong>Copy the value straight away</strong> — it is shown only once.</>
        : <>Icône de profil (haut droite) ➔ <code>Account</code> ➔ <code>Access Tokens</code> ➔ <code>Generate new token</code>. <strong>Copiez la valeur immédiatement</strong> — elle n'est affichée qu'une seule fois.</>,
      url: 'https://supabase.com/dashboard/account/tokens',
      extra: (
        <p className="help-note">
          {isEn
            ? <>The token carries <strong>full access to the account</strong> — every organization, every project. Keep it in this vault and nowhere else.</>
            : <>Le jeton donne un <strong>accès complet au compte</strong> — toutes les organisations, tous les projets. Conservez-le dans ce coffre et nulle part ailleurs.</>}
        </p>
      ),
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
        ? <>Spaceship's app launcher — <strong>everything else is reached through it</strong>. The <code>Launchpad</code> button in the top bar, or <code>/</code> / <code>⌘ K</code>, then type the app's name.</>
        : <>Le lanceur d'applications de Spaceship — <strong>tout le reste passe par lui</strong>. Bouton <code>Launchpad</code> dans la barre du haut, ou <code>/</code> / <code>⌘ K</code>, puis tapez le nom de l'app.</>,
      url: 'https://www.spaceship.com/application/launchpad/',
      linkLabel: 'Launchpad',
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
            ? <>Enable at least the <strong>domains:read</strong>, <strong>dnsrecords:read</strong> and <strong>dnsrecords:write</strong> scopes — without them the DNS records cannot be created for you.</>
            : <>Activez au minimum les scopes <strong>domains:read</strong>, <strong>dnsrecords:read</strong> et <strong>dnsrecords:write</strong> — sans eux, les enregistrements DNS ne peuvent pas être créés automatiquement.</>}
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
      extra: (
        <p className="help-note">
          {isEn
            ? <><strong>Add a payment method</strong> during onboarding, or via <code>Billing</code> ➔ <code>Payment and billing</code>. Without it, step 2 cannot create the instance.</>
            : <><strong>Ajoutez un moyen de paiement</strong> pendant l'onboarding, ou via <code>Billing</code> ➔ <code>Payment and billing</code>. Sans lui, l'étape 2 ne peut pas créer l'instance.</>}
        </p>
      ),
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
    </HelpService>

    <HelpService id="svc-resend" icon={<Mail size={15} />} title="Resend">
      <HelpFlow steps={resend} />
    </HelpService>

    <HelpService id="svc-spaceship" icon={<Globe size={15} />} title="Spaceship">
      <HelpFlow steps={spaceship} />
    </HelpService>

    <HelpService id="svc-scaleway" icon={<Server size={15} />} title="Scaleway">
      <HelpFlow steps={scaleway} />
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

  // Completion checks — the rule itself lives in `serviceCompletion`, where the
  // automations of steps 2 and 8 read it to decide whether they may run at all.
  const defaultMailSubdomain = `mail.${config.DOMAIN || 'votredomaine.fr'}`

  const isSupabaseComplete = isAccountComplete(config, 'supabase')
  const isResendComplete = isAccountComplete(config, 'resend')
  const isSpaceshipComplete = isAccountComplete(config, 'spaceship')
  const isScalewayComplete = isAccountComplete(config, 'scaleway')

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

            {/* The project itself: adopted or created from here, plus the
                database password that makes step 2 fully automatic. */}
            <SupabaseProjectSetup />

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
            {/* Pre-filled with `mail.<domain>` as soon as the domain is known,
                and editable from here: the DNS records, the Resend domain and
                the sender address are all built from this value. */}
            <FormField
              id="mail-subdomain"
              label={t('accountCreation.resend.mailSubdomain')}
              value={config.MAIL_SUBDOMAIN}
              onChange={v => setField('MAIL_SUBDOMAIN', v)}
              placeholder={defaultMailSubdomain}
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
