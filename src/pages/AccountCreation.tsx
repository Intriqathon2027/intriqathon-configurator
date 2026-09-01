import { useEffect } from 'react'
import { Database, Mail, Globe, Server, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { WizardLayout } from '../components/layout/WizardLayout'
import { FormField } from '../components/ui/FormField'
import { ServiceAccountCard } from '../components/ui/ServiceAccountCard'
import { useApp } from '../context/AppContext'
import { FieldHelpSections } from '../components/ui/HelpSection'

function HelpContent() {
  const { state } = useApp()
  const isEn = state.language === 'en'

  if (isEn) {
    return <>
      <h3><Database size={15} /> Supabase</h3>
      <div className="help-block">
        <p><strong>Account & project:</strong></p>
        <p className="step-schema"><code>supabase.com</code> ➔ <code>Sign Up / Sign In</code> ➔ <code>New Project</code></p>
        <p className="help-note">Choose a name, a strong password (no "?" character), and your region. The three values below are then collected from that project.</p>
      </div>
      <FieldHelpSections step={0} group="SUPABASE" />

      <h3><Mail size={15} /> Resend</h3>
      <div className="help-block">
        <p><strong>Account creation:</strong></p>
        <p className="step-schema"><code>resend.com</code> ➔ <code>Sign Up</code> ➔ <code>Verify Email</code></p>
        <p className="help-note">The sending domain is configured in the next step — only the API key is needed here.</p>
      </div>
      <FieldHelpSections step={0} group="RESEND" />

      <h3><Globe size={15} /> Spaceship</h3>
      <div className="help-block">
        <p><strong>Domain registration:</strong></p>
        <p className="step-schema"><code>spaceship.com</code> ➔ <code>Sign Up</code> ➔ <code>Purchase Domain</code></p>
        <p className="help-note">One domain is enough: the site, the admin panel and the mail subdomains all derive from it.</p>
      </div>
      <FieldHelpSections step={0} group="SPACESHIP" />

      <h3><Server size={15} /> Scaleway</h3>
      <div className="help-block">
        <p><strong>Setup:</strong></p>
        <p className="step-schema"><code>console.scaleway.com</code> ➔ <code>Sign Up</code> ➔ <code>Add Payment Method</code></p>
        <p className="help-note">A payment method is required before an instance can be created in step 2.</p>
      </div>
      <FieldHelpSections step={0} group="SCALEWAY" />
    </>
  }

  return <>
    <h3><Database size={15} /> Supabase</h3>
    <div className="help-block">
      <p><strong>Compte & projet :</strong></p>
      <p className="step-schema"><code>supabase.com</code> ➔ <code>S'inscrire / Se connecter</code> ➔ <code>New Project</code></p>
      <p className="help-note">Choisissez un nom, un mot de passe fort (sans caractère "?") et une région. Les trois valeurs ci-dessous se récupèrent ensuite dans ce projet.</p>
    </div>
    <FieldHelpSections step={0} group="SUPABASE" />

    <h3><Mail size={15} /> Resend</h3>
    <div className="help-block">
      <p><strong>Création du compte :</strong></p>
      <p className="step-schema"><code>resend.com</code> ➔ <code>S'inscrire</code> ➔ <code>Vérifier l'email</code></p>
      <p className="help-note">Le domaine d'envoi se configure à l'étape suivante : ici, seule la clé API est nécessaire.</p>
    </div>
    <FieldHelpSections step={0} group="RESEND" />

    <h3><Globe size={15} /> Spaceship</h3>
    <div className="help-block">
      <p><strong>Achat du nom de domaine :</strong></p>
      <p className="step-schema"><code>spaceship.com</code> ➔ <code>S'inscrire</code> ➔ <code>Acheter un domaine</code></p>
      <p className="help-note">Un seul domaine suffit : les sous-domaines du site, du panneau admin et des emails en découlent.</p>
    </div>
    <FieldHelpSections step={0} group="SPACESHIP" />

    <h3><Server size={15} /> Scaleway</h3>
    <div className="help-block">
      <p><strong>Initialisation :</strong></p>
      <p className="step-schema"><code>console.scaleway.com</code> ➔ <code>S'inscrire</code> ➔ <code>Moyen de paiement</code></p>
      <p className="help-note">Un moyen de paiement est obligatoire avant de pouvoir créer une instance à l'étape 2.</p>
    </div>
    <FieldHelpSections step={0} group="SCALEWAY" />
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
          externalUrl="https://supabase.com/dashboard/account/tokens"
          externalLabel={t('accountCreation.supabase.link')}
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
          externalUrl="https://resend.com/api-keys"
          externalLabel={t('accountCreation.resend.link')}
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
          externalUrl="https://www.spaceship.com"
          externalLabel={t('accountCreation.spaceship.link')}
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
          externalUrl="https://console.scaleway.com/iam/api-keys"
          externalLabel={t('accountCreation.scaleway.link')}
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
