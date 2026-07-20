import { useEffect } from 'react'
import { Database, Mail, Globe, Server, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { WizardLayout } from '../components/layout/WizardLayout'
import { FormField } from '../components/ui/FormField'
import { ServiceAccountCard } from '../components/ui/ServiceAccountCard'
import { useApp } from '../context/AppContext'

function HelpContent() {
  const { state } = useApp()
  const isEn = state.language === 'en'

  if (isEn) {
    return <>
      <h3><Database size={15} /> Supabase</h3>
      <ol>
        <li>Go to <strong>supabase.com</strong> and create an account</li>
        <li>Create a new project (choose a name, password, and region)</li>
        <li>Go to <strong>Account &gt; Access Tokens</strong> to generate a Personal Access Token</li>
        <li>Go to <strong>Project Settings &gt; Storage &gt; S3 Access Keys</strong> to generate S3 credentials</li>
      </ol>
      <h3><Mail size={15} /> Resend</h3>
      <ol>
        <li>Go to <strong>resend.com</strong> and create an account</li>
        <li>Verify your email address</li>
        <li>Go to <strong>API Keys &gt; Create API Key</strong> and copy the key (shown only once!)</li>
      </ol>
      <h3><Globe size={15} /> Spaceship</h3>
      <ol>
        <li>Go to <strong>spaceship.com</strong> and create an account</li>
        <li>Purchase or transfer your domain name</li>
        <li>Go to <strong>API Management</strong> to generate your API Key and Secret</li>
      </ol>
      <h3><Server size={15} /> Scaleway</h3>
      <ol>
        <li>Go to <strong>console.scaleway.com</strong> and create an account</li>
        <li>Set up a payment method</li>
        <li>Go to <strong>IAM &gt; API Keys</strong> to generate an Access Key and Secret Key</li>
        <li>Go to <strong>Project &gt; Settings</strong> to copy your Project ID</li>
      </ol>
    </>
  }

  return <>
    <h3><Database size={15} /> Supabase</h3>
    <ol>
      <li>Allez sur <strong>supabase.com</strong> et créez un compte</li>
      <li>Créez un nouveau projet (choisissez un nom, un mot de passe et une région)</li>
      <li>Allez dans <strong>Account &gt; Access Tokens</strong> pour générer un Personal Access Token</li>
      <li>Allez dans <strong>Project Settings &gt; Storage &gt; S3 Access Keys</strong> pour générer les clés S3</li>
    </ol>
    <h3><Mail size={15} /> Resend</h3>
    <ol>
      <li>Allez sur <strong>resend.com</strong> et créez un compte</li>
      <li>Vérifiez votre adresse email</li>
      <li>Allez dans <strong>API Keys &gt; Create API Key</strong> et copiez la clé (affichée une seule fois !)</li>
    </ol>
    <h3><Globe size={15} /> Spaceship</h3>
    <ol>
      <li>Allez sur <strong>spaceship.com</strong> et créez un compte</li>
      <li>Achetez ou transférez votre nom de domaine</li>
      <li>Allez dans <strong>API Management</strong> pour générer votre API Key et Secret</li>
    </ol>
    <h3><Server size={15} /> Scaleway</h3>
    <ol>
      <li>Allez sur <strong>console.scaleway.com</strong> et créez un compte</li>
      <li>Configurez un moyen de paiement</li>
      <li>Allez dans <strong>IAM &gt; API Keys</strong> pour générer un Access Key et Secret Key</li>
      <li>Allez dans <strong>Project &gt; Settings</strong> pour copier votre Project ID</li>
    </ol>
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
          serviceIcon={<Database size={16} />}
          externalUrl="https://supabase.com/dashboard/account/tokens"
          externalLabel={t('accountCreation.supabase.link')}
          isComplete={isSupabaseComplete}
        >
          <div className="form-section">
            <FormField
              id="supabase-pat"
              label={t('accountCreation.supabase.pat')}
              envKey="SUPABASE_ACCESS_TOKEN"
              value={config.SUPABASE_ACCESS_TOKEN}
              onChange={v => setField('SUPABASE_ACCESS_TOKEN', v)}
              placeholder="sbp_abc123..."
              hint={t('accountCreation.supabase.pat.hint')}
              type="password"
            />
            <FormField
              id="s3-access-key"
              label={t('accountCreation.supabase.s3AccessKey')}
              envKey="S3_ACCESS_KEY_ID"
              value={config.S3_ACCESS_KEY_ID}
              onChange={v => setField('S3_ACCESS_KEY_ID', v)}
              placeholder="625b..."
              hint={t('accountCreation.supabase.s3AccessKey.hint')}
            />
            <FormField
              id="s3-secret"
              label={t('accountCreation.supabase.s3SecretKey')}
              envKey="S3_SECRET_ACCESS_KEY"
              value={config.S3_SECRET_ACCESS_KEY}
              onChange={v => setField('S3_SECRET_ACCESS_KEY', v)}
              placeholder="5w36..."
              hint={t('accountCreation.supabase.s3SecretKey.hint')}
              type="password"
            />
          </div>
        </ServiceAccountCard>

        {/* Resend */}
        <ServiceAccountCard
          serviceName={t('accountCreation.resend.title')}
          serviceIcon={<Mail size={16} />}
          externalUrl="https://resend.com/api-keys"
          externalLabel={t('accountCreation.resend.link')}
          isComplete={isResendComplete}
        >
          <div className="form-section">
            <FormField
              id="resend-api-key"
              label={t('accountCreation.resend.apiKey')}
              envKey="RESEND_API_KEY"
              value={config.RESEND_API_KEY}
              onChange={v => setField('RESEND_API_KEY', v)}
              placeholder="re_abc123..."
              hint={t('accountCreation.resend.apiKey.hint')}
              type="password"
            />
          </div>
        </ServiceAccountCard>

        {/* Spaceship */}
        <ServiceAccountCard
          serviceName={t('accountCreation.spaceship.title')}
          serviceIcon={<Globe size={16} />}
          externalUrl="https://www.spaceship.com"
          externalLabel={t('accountCreation.spaceship.link')}
          isComplete={isSpaceshipComplete}
        >
          <div className="form-section">
            <FormField
              id="domain"
              label={t('accountCreation.spaceship.domain')}
              envKey="DOMAIN"
              value={config.DOMAIN}
              onChange={v => setField('DOMAIN', v)}
              placeholder={t('accountCreation.spaceship.domain.placeholder')}
              hint={t('accountCreation.spaceship.domain.hint')}
            />
            <FormField
              id="spaceship-api-key"
              label={t('accountCreation.spaceship.apiKey')}
              envKey="SPACESHIP_API_KEY"
              value={config.SPACESHIP_API_KEY}
              onChange={v => setField('SPACESHIP_API_KEY', v)}
              placeholder="sk_abc123..."
              hint={t('accountCreation.spaceship.apiKey.hint')}
            />
            <FormField
              id="spaceship-api-secret"
              label={t('accountCreation.spaceship.apiSecret')}
              envKey="SPACESHIP_API_SECRET"
              value={config.SPACESHIP_API_SECRET}
              onChange={v => setField('SPACESHIP_API_SECRET', v)}
              placeholder="ss_xyz789..."
              hint={t('accountCreation.spaceship.apiSecret.hint')}
              type="password"
            />
          </div>
        </ServiceAccountCard>

        {/* Scaleway */}
        <ServiceAccountCard
          serviceName={t('accountCreation.scaleway.title')}
          serviceIcon={<Server size={16} />}
          externalUrl="https://console.scaleway.com/iam/api-keys"
          externalLabel={t('accountCreation.scaleway.link')}
          isComplete={isScalewayComplete}
        >
          <div className="form-section">
            <FormField
              id="scw-secret-key"
              label={t('accountCreation.scaleway.secretKey')}
              envKey="SCW_SECRET_KEY"
              value={config.SCW_SECRET_KEY}
              onChange={v => setField('SCW_SECRET_KEY', v)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              hint={t('accountCreation.scaleway.secretKey.hint')}
              type="password"
            />
            <FormField
              id="scw-project-id"
              label={t('accountCreation.scaleway.projectId')}
              envKey="SCW_DEFAULT_PROJECT_ID"
              value={config.SCW_DEFAULT_PROJECT_ID}
              onChange={v => setField('SCW_DEFAULT_PROJECT_ID', v)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              hint={t('accountCreation.scaleway.projectId.hint')}
            />
            <FormField
              id="deploy-path"
              label={t('accountCreation.scaleway.deployPath')}
              value={config.DEPLOY_PATH}
              onChange={v => setField('DEPLOY_PATH', v)}
              placeholder={t('accountCreation.scaleway.deployPath.placeholder')}
              hint={t('accountCreation.scaleway.deployPath.hint')}
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
