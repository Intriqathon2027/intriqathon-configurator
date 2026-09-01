import { Shield } from 'lucide-react'
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
      <p className="help-note">{isEn
        ? 'Give it a name (e.g. "Hackathon_Auth"). The same application can serve both the OAuth2 login and the bot.'
        : 'Donnez-lui un nom (ex : "Hackathon_Auth"). La même application peut servir à la connexion OAuth2 et au bot.'}</p>

      <p><strong>{isEn ? 'Register the callback URL:' : "Déclarer l'URL de callback :"}</strong></p>
      <p className="step-schema"><code>OAuth2</code> ➔ <code>Redirects</code> ➔ <code>Add Redirect</code></p>
      <p className="help-note">{isEn ? 'Paste the callback URL shown in the form, character for character.' : "Collez l'URL de callback affichée dans le formulaire, à l'identique."}</p>
    </div>
    <FieldHelpSections step={2} group="DISCORD OAUTH2" />
    <h3><Shield size={15} /> GitHub OAuth2</h3>
    <div className="help-block">
      <p><strong>{isEn ? 'Create the OAuth App:' : "Créer l'OAuth App :"}</strong></p>
      <p className="step-schema"><code>{isEn ? 'Profile photo (top right)' : 'Photo profil (haut droite)'}</code> ➔ <code>Settings</code> ➔ <code>Developer settings</code> ➔ <code>OAuth Apps</code> ➔ <code>New OAuth App</code></p>
      <p className="help-note">{isEn
        ? 'Fill in the name, plus the Homepage URL and Callback URL shown in the form.'
        : 'Renseignez le nom, ainsi que la Homepage URL et la Callback URL affichées dans le formulaire.'}</p>
    </div>
    <FieldHelpSections step={2} group="GITHUB OAUTH2" />
    <h3><Shield size={15} /> {isEn ? 'Discord Bot' : 'Bot Discord'}</h3>
    <div className="help-block">
      <p><strong>{isEn ? 'Add a bot to the application:' : "Ajouter un bot à l'application :"}</strong></p>
      <p className="step-schema"><code>discord.com/developers/applications</code> ➔ <code>{isEn ? 'Your application' : 'Votre application'}</code> ➔ <code>Bot</code></p>
      <p className="help-note">{isEn
        ? 'A bot lives inside a Discord application: reuse the OAuth2 one above, or create a second application for it.'
        : "Le bot vit dans une application Discord : reprenez celle de l'OAuth2 ci-dessus, ou créez-en une seconde."}</p>
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
