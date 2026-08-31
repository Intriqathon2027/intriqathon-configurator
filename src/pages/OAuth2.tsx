import { Shield, AlertTriangle } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { FormField } from '../components/ui/FormField'
import { ServiceAccountCard } from '../components/ui/ServiceAccountCard'
import { CopyRow } from '../components/ui/CopyBlock'
import { useApp } from '../context/AppContext'
import { FieldHelpSections } from '../components/ui/HelpSection'

function HelpContent() {
  const { state } = useApp()
  const isEn = state.language === 'en'
  return <>
    <h3><Shield size={15} /> Discord OAuth2</h3>
    <div className="help-block">
      <p><strong>{isEn ? 'Create the application:' : "Créer l'application :"}</strong></p>
      <p className="step-schema"><code>discord.com/developers/applications</code> ➔ <code>New Application</code></p>
      <p className="help-note">{isEn ? 'Give it a name (e.g. "Hackathon_Auth").' : 'Donnez un nom (ex: "Hackathon_Auth").'}</p>

      <p><strong>{isEn ? 'Client ID:' : 'Client ID :'}</strong></p>
      <p className="step-schema"><code>General Information</code> ➔ <code>Application ID</code></p>

      <p><strong>{isEn ? 'Client Secret:' : 'Client Secret :'}</strong></p>
      <p className="step-schema"><code>OAuth2</code> ➔ <code>Reset Secret</code></p>
      <p className="help-note">{isEn ? 'Shown only once — copy it immediately!' : 'Affiché une seule fois — copiez-le immédiatement !'}</p>

      <p><strong>{isEn ? 'Callback URL:' : 'URL de callback :'}</strong></p>
      <p className="step-schema"><code>OAuth2</code> ➔ <code>Redirects</code> ➔ <code>Add Redirect</code></p>
      <p className="help-note">{isEn ? 'Paste the callback URL shown in the form below.' : "Collez l'URL de callback affichée dans le formulaire ci-dessous."}</p>
    </div>
    <FieldHelpSections step={2} group="DISCORD OAUTH2" />
    <div className="info-box warning" style={{ marginTop: '12px' }}>
      <AlertTriangle size={15} className="info-box-icon" />
      <div className="info-box-text">
        <strong>{isEn ? 'Warning' : 'Attention'}</strong> : {isEn
          ? 'Discord only shows the secret once. Copy it immediately!'
          : "Discord n'affiche le secret qu'une seule fois. Copiez-le immédiatement !"
        }
      </div>
    </div>
    <h3><Shield size={15} /> GitHub OAuth2</h3>
    <div className="help-block">
      <p><strong>{isEn ? 'Navigate to OAuth Apps:' : 'Accéder aux OAuth Apps :'}</strong></p>
      <p className="step-schema"><code>{isEn ? 'Profile photo (top right)' : 'Photo profil (haut droite)'}</code> ➔ <code>Settings</code> ➔ <code>Developer settings</code> ➔ <code>OAuth Apps</code></p>
      <p className="help-note">{isEn ? 'Or go directly to github.com/settings/developers' : 'Ou accédez directement à github.com/settings/developers'}</p>

      <p><strong>{isEn ? 'Create the app:' : "Créer l'app :"}</strong></p>
      <p className="step-schema"><code>New OAuth App</code></p>
      <p className="help-note">{isEn ? 'Fill in the name, Homepage URL, and Callback URL shown below.' : 'Remplissez le nom, Homepage URL et Callback URL affichés ci-dessous.'}</p>

      <p><strong>{isEn ? 'Credentials:' : 'Identifiants :'}</strong></p>
      <p className="help-note">{isEn ? 'Copy the Client ID, then click "Generate a new client secret" to get the secret (shown only once).' : 'Copiez le Client ID, puis cliquez "Generate a new client secret" pour obtenir le secret (affiché une seule fois).'}</p>
    </div>
    <FieldHelpSections step={2} group="GITHUB OAUTH2" />
    <div className="info-box warning" style={{ marginTop: '12px' }}>
      <AlertTriangle size={15} className="info-box-icon" />
      <div className="info-box-text">
        <strong>{isEn ? 'Warning' : 'Attention'}</strong> : {isEn
          ? 'GitHub also only shows the secret once!'
          : "GitHub n'affiche lui aussi le secret qu'une seule fois !"
        }
      </div>
    </div>
    <h3><Shield size={15} /> {isEn ? 'Discord Bot' : 'Bot Discord'}</h3>
    <div className="help-block">
      <p><strong>{isEn ? 'Bot Token:' : 'Token Bot :'}</strong></p>
      <p className="step-schema"><code>{isEn ? 'Your Discord Application' : 'Votre application Discord'}</code> ➔ <code>Bot</code> ➔ <code>Reset Token</code></p>
      <p className="help-note">{isEn ? 'Shown only once — copy it immediately!' : 'Affiché une seule fois — copiez-le immédiatement !'}</p>

      <p><strong>{isEn ? 'Server / Guild ID:' : 'ID Serveur / Guild :'}</strong></p>
      <p className="help-note">{isEn
        ? 'Right-click your server icon in Discord → "Copy Server ID" (requires Developer Mode enabled in Settings → Advanced).'
        : "Clic droit sur l'icône du serveur dans Discord → \"Copier l'identifiant du serveur\" (nécessite le Mode Développeur activé dans Paramètres → Avancé)."
      }</p>
    </div>
    <FieldHelpSections step={2} group="BOT DISCORD" />
  </>
}

export function OAuth2() {
  const { t, config, setField } = useApp()
  const domain = config.DOMAIN || '<DOMAIN>'

  const discordCallback = `https://${domain}/api/auth/discord/callback`
  const githubHomepage = `https://${domain}`
  const githubCallback = `https://${domain}/api/auth/github/callback`

  const isDiscordComplete = !!(config.DISCORD_CLIENT_ID && config.OAUTH2_DISCORD_CLIENT_SECRET)
  const isGithubComplete = !!(config.GITHUB_CLIENT_ID && config.OAUTH2_GITHUB_CLIENT_SECRET)
  const isBotComplete = !!(config.CLIENT_ID && config.BOT_TOKEN && config.DEV_SERVER_ID && config.GUILD_ID)

  return (
    <WizardLayout
      title={t('step3.title')}
      stepBadge={`${t('nav.step')} 3 — ${t('step3.label')}`}
      description={t('step3.desc')}
      helpContent={<HelpContent />}
    >
      <div className="service-account-grid">
        {/* Discord */}
        <ServiceAccountCard
          serviceName={t('step3.section.discord')}
          serviceIcon={<Shield size={16} color="var(--color-primary-text)" />}
          externalUrl="https://discord.com/developers/applications"
          externalLabel={t('step3.discord.btn')}
          isComplete={isDiscordComplete}
        >
          <div style={{ marginBottom: '16px' }}>
            <CopyRow label={t('step3.discord.callback')} content={discordCallback} />
          </div>
          <div className="form-section">
            <FormField id="discord-client-id" label={t('step3.discordClientId')}
              value={config.DISCORD_CLIENT_ID} onChange={v => setField('DISCORD_CLIENT_ID', v)}
              placeholder="1234567890123456789" />
            <FormField id="discord-secret" label={t('step3.discordSecret')}
              value={config.OAUTH2_DISCORD_CLIENT_SECRET} onChange={v => setField('OAUTH2_DISCORD_CLIENT_SECRET', v)}
              placeholder="abc123..." type="password" />
          </div>
        </ServiceAccountCard>

        {/* GitHub */}
        <ServiceAccountCard
          serviceName={t('step3.section.github')}
          serviceIcon={<Shield size={16} color="var(--color-primary-text)" />}
          externalUrl="https://github.com/settings/developers"
          externalLabel={t('step3.github.btn')}
          isComplete={isGithubComplete}
        >
          <div style={{ marginBottom: '16px' }}>
            <CopyRow label={t('step3.github.homepage')} content={githubHomepage} />
            <CopyRow label={t('step3.github.callback')} content={githubCallback} />
          </div>
          <div className="form-section">
            <FormField id="github-client-id" label={t('step3.githubClientId')}
              value={config.GITHUB_CLIENT_ID} onChange={v => setField('GITHUB_CLIENT_ID', v)}
              placeholder="Iv1.abc123..." />
            <FormField id="github-secret" label={t('step3.githubSecret')}
              value={config.OAUTH2_GITHUB_CLIENT_SECRET} onChange={v => setField('OAUTH2_GITHUB_CLIENT_SECRET', v)}
              placeholder="ghp_abc123..." type="password" />
          </div>
        </ServiceAccountCard>

        {/* Discord Bot */}
        <ServiceAccountCard
          serviceName={t('step3.section.bot')}
          serviceIcon={<Shield size={16} color="var(--color-primary-text)" />}
          externalUrl="https://discord.com/developers/applications"
          externalLabel={t('step3.bot.btn')}
          isComplete={isBotComplete}
        >
          <div className="form-section">
            <FormField id="bot-client-id" label={t('step3.botClientId')}
              value={config.CLIENT_ID} onChange={v => setField('CLIENT_ID', v)}
              placeholder="1234567890123456789" />
            <FormField id="bot-token" label={t('step3.botToken')}
              value={config.BOT_TOKEN} onChange={v => setField('BOT_TOKEN', v)}
              placeholder="MTIzNDU..." type="password" />
            <FormField id="dev-server-id" label={t('step3.devServerId')}
              value={config.DEV_SERVER_ID} onChange={v => setField('DEV_SERVER_ID', v)}
              placeholder="1234567890123456789" />
            <FormField id="guild-id" label={t('step3.guildId')}
              value={config.GUILD_ID} onChange={v => setField('GUILD_ID', v)}
              placeholder="1234567890123456789" />
          </div>
        </ServiceAccountCard>
      </div>
    </WizardLayout>
  )
}
