import { Shield } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { FormField } from '../components/ui/FormField'
import { ServiceAccountCard } from '../components/ui/ServiceAccountCard'
import { CopyRow } from '../components/ui/CopyBlock'
import { useApp } from '../context/AppContext'
import { FieldHelpSections } from '../components/ui/HelpSection'
import { HelpFlow, type HelpFlowStep } from '../components/ui/HelpFlow'
import { HelpService } from '../components/ui/HelpService'

function HelpContent() {
  const { state, config } = useApp()
  const isEn = state.language === 'en'
  const domain = config.DOMAIN || '<DOMAIN>'

  const discord: HelpFlowStep[] = [
    {
      key: 'app',
      title: 'New Application',
      desc: isEn
        ? <>On the Discord Developer Portal, click <code>New Application</code> and name it (e.g. "Hackathon"). The same application can carry both the OAuth2 login and the bot.</>
        : <>Sur le Discord Developer Portal, cliquez sur <code>New Application</code> et donnez-lui un nom (ex : "Hackathon"). La même application peut porter la connexion OAuth2 et le bot.</>,
      url: 'https://discord.com/developers/applications',
    },
    {
      key: 'redirect',
      title: 'OAuth2 ➔ Redirects',
      desc: isEn
        ? <><code>OAuth2</code> ➔ <code>Redirects</code> ➔ <code>Add Redirect</code>, then <code>Save Changes</code>. Paste the callback URL shown in the form, character for character.</>
        : <><code>OAuth2</code> ➔ <code>Redirects</code> ➔ <code>Add Redirect</code>, puis <code>Save Changes</code>. Collez l'URL de callback affichée dans le formulaire, à l'identique.</>,
      copyValues: [{ value: `https://${domain}/api/auth/discord/callback` }],
    },
    {
      key: 'creds',
      title: isEn ? 'Copy the ID and the secret' : "Copier l'ID et le secret",
      desc: isEn
        ? <>The Client ID is the <code>Application ID</code> under <code>General Information</code>. The secret is under <code>OAuth2</code> ➔ <code>Reset Secret</code>, and is shown only once.</>
        : <>Le Client ID est l'<code>Application ID</code> de <code>General Information</code>. Le secret s'obtient dans <code>OAuth2</code> ➔ <code>Reset Secret</code>, et n'est affiché qu'une seule fois.</>,
    },
  ]

  const github: HelpFlowStep[] = [
    {
      key: 'new',
      title: 'New OAuth App',
      desc: isEn
        ? <>Profile photo (top right) ➔ <code>Settings</code> ➔ <code>Developer settings</code> ➔ <code>OAuth Apps</code> ➔ <code>New OAuth App</code>.</>
        : <>Photo de profil (haut droite) ➔ <code>Settings</code> ➔ <code>Developer settings</code> ➔ <code>OAuth Apps</code> ➔ <code>New OAuth App</code>.</>,
      url: 'https://github.com/settings/applications/new',
      linkLabel: isEn ? 'Create the app' : "Créer l'app",
    },
    {
      key: 'urls',
      title: isEn ? 'Fill in the two URLs' : 'Renseigner les deux URLs',
      desc: isEn
        ? <>Copy the <code>Homepage URL</code> and the <code>Authorization callback URL</code> exactly as the form shows them, then <code>Register application</code>.</>
        : <>Recopiez la <code>Homepage URL</code> et l'<code>Authorization callback URL</code> exactement comme le formulaire les affiche, puis <code>Register application</code>.</>,
      copyValues: [
        { value: `https://${domain}`, note: 'Homepage URL' },
        { value: `https://${domain}/api/auth/github/callback`, note: 'Authorization callback URL' },
      ],
    },
    {
      key: 'creds',
      title: isEn ? 'Copy the ID and generate the secret' : 'Copier l\'ID et générer le secret',
      desc: isEn
        ? <>The Client ID sits on the app page. Click <code>Generate a new client secret</code> for the secret — shown only once.</>
        : <>Le Client ID est affiché sur la page de l'app. Cliquez sur <code>Generate a new client secret</code> pour le secret — affiché une seule fois.</>,
      url: 'https://github.com/settings/developers',
    },
    {
      key: 'org',
      title: isEn ? 'GitHub organization' : 'Organisation GitHub',
      desc: isEn
        ? <>Team repositories are created inside a GitHub <strong>organization named after your hackathon</strong>. Create it beforehand on GitHub — the platform looks it up, it never creates it.</>
        : <>Les dépôts des équipes sont créés dans une <strong>organisation GitHub portant le nom de votre hackathon</strong>. Créez-la au préalable sur GitHub : la plateforme la recherche, elle ne la crée jamais.</>,
      url: 'https://github.com/account/organizations/new',
      extra: (
        <p className="help-note">
          {isEn
            ? 'When the organizer signs in with GitHub, they must grant the app access to that organization, otherwise repository creation fails.'
            : "Lors de la connexion GitHub de l'organisateur, il faut accorder à l'app l'accès à cette organisation, sinon la création des dépôts échoue."}
        </p>
      ),
    },
  ]

  const bot: HelpFlowStep[] = [
    {
      key: 'bot',
      title: isEn ? 'Add a bot to the application' : "Ajouter un bot à l'application",
      desc: isEn
        ? <><code>Your application</code> ➔ <code>Bot</code>. Reuse the OAuth2 application above, or create a second one for the bot.</>
        : <><code>Votre application</code> ➔ <code>Bot</code>. Reprenez l'application OAuth2 ci-dessus, ou créez-en une seconde dédiée au bot.</>,
      url: 'https://discord.com/developers/applications',
    },
    {
      key: 'intents',
      title: 'Privileged Gateway Intents',
      desc: isEn
        ? <>Still under <code>Bot</code>, enable <strong>Server Members Intent</strong> and <strong>Message Content Intent</strong>. Without them the bot connects but stays deaf.</>
        : <>Toujours dans <code>Bot</code>, activez <strong>Server Members Intent</strong> et <strong>Message Content Intent</strong>. Sans elles, le bot se connecte mais reste sourd.</>,
    },
    {
      key: 'token',
      title: 'Reset Token',
      desc: isEn
        ? <><code>Bot</code> ➔ <code>Reset Token</code>. Shown once and never shareable: it grants full control over the bot.</>
        : <><code>Bot</code> ➔ <code>Reset Token</code>. Affiché une seule fois et jamais partageable : il donne un contrôle total sur le bot.</>,
    },
    {
      key: 'invite',
      title: isEn ? 'Invite the bot to your server' : 'Inviter le bot sur votre serveur',
      desc: isEn
        ? <><code>OAuth2</code> ➔ <code>URL Generator</code> ➔ scopes <code>bot</code> and <code>applications.commands</code>, pick the permissions, then open the generated URL and authorize the bot on your server.</>
        : <><code>OAuth2</code> ➔ <code>URL Generator</code> ➔ scopes <code>bot</code> et <code>applications.commands</code>, choisissez les permissions, puis ouvrez l'URL générée et autorisez le bot sur votre serveur.</>,
    },
    {
      key: 'ids',
      title: isEn ? 'Copy the server IDs' : 'Copier les IDs de serveur',
      desc: isEn
        ? <>Discord <code>User Settings</code> ➔ <code>Advanced</code> ➔ enable <code>Developer Mode</code>, then right-click the server ➔ <code>Copy Server ID</code>.</>
        : <>Discord <code>Paramètres utilisateur</code> ➔ <code>Avancé</code> ➔ activez le <code>Mode développeur</code>, puis clic droit sur le serveur ➔ <code>Copier l'identifiant du serveur</code>.</>,
      extra: (
        <p className="help-note">
          {isEn
            ? 'GUILD_ID is the production server, DEV_SERVER_ID the test one. Put the same value in both if you only run one server.'
            : "GUILD_ID est le serveur de production, DEV_SERVER_ID celui de test. Mettez la même valeur dans les deux si vous n'avez qu'un serveur."}
        </p>
      ),
    },
  ]

  return <>
    <HelpService id="svc-discord" icon={<Shield size={15} />} title="Discord OAuth2">
      <HelpFlow steps={discord} />
      <FieldHelpSections step={2} group="DISCORD OAUTH2" />
    </HelpService>

    <HelpService id="svc-github" icon={<Shield size={15} />} title="GitHub OAuth2">
      <HelpFlow steps={github} />
      <FieldHelpSections step={2} group="GITHUB OAUTH2" />
    </HelpService>

    <HelpService id="svc-bot" icon={<Shield size={15} />} title={isEn ? 'Discord Bot' : 'Bot Discord'}>
      <HelpFlow steps={bot} />
      <FieldHelpSections step={2} group="BOT DISCORD" />
    </HelpService>
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
          helpAnchor="svc-discord"
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
          helpAnchor="svc-github"
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
          helpAnchor="svc-bot"
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
