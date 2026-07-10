import { Bot } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { FormField } from '../components/ui/FormField'
import { ExternalLinkBtn } from '../components/ui/ExternalLinkBtn'
import { useApp } from '../context/AppContext'

function HelpContent() {
  const { state } = useApp()
  const isEn = state.language === 'en'
  return <>
    <h3><Bot size={15} /> {isEn ? 'Creating a Discord Bot' : 'Créer un Bot Discord'}</h3>
    <p><strong>{isEn ? 'Prerequisite' : 'Prérequis'}</strong> : {isEn ? 'Create a fresh Discord server dedicated to the hackathon.' : 'Créez un serveur Discord vierge dédié au hackathon.'}</p>
    <ol>
      <li>{isEn ? 'Go to discord.com/developers/applications' : 'Allez sur discord.com/developers/applications'}</li>
      <li>{isEn ? 'Click "New Application" and name it' : 'Cliquez "New Application" et nommez-le'}</li>
      <li>{isEn ? 'In General Information: copy the Application ID → CLIENT_ID' : 'Dans General Information : copiez l\'Application ID → CLIENT_ID'}</li>
      <li>{isEn ? 'In Installation: check "Guild Install" only in Installation Contexts' : 'Dans Installation : cochez "Guild Install" seulement dans Installation Contexts'}</li>
      <li>{isEn ? 'In Default Install Settings: add scopes "application.commands" and "bot", set permissions to "Administrator"' : 'Dans Default Install Settings : ajoutez les scopes "application.commands" et "bot", mettez les permissions à "Administrator"'}</li>
      <li>{isEn ? 'Copy the install link and open it in your browser to invite the bot to your server' : 'Copiez le lien d\'installation et ouvrez-le dans votre navigateur pour inviter le bot sur votre serveur'}</li>
      <li>{isEn ? 'Go to Bot > Reset Token → BOT_TOKEN (save it immediately!)' : 'Allez dans Bot > Reset Token → BOT_TOKEN (sauvegardez-le immédiatement !)'}</li>
      <li>{isEn ? 'Enable "Presence Intent" and "Server Members Intent" in Privileged Gateway Intents' : 'Activez "Presence Intent" et "Server Members Intent" dans Privileged Gateway Intents'}</li>
    </ol>
    <h3>{isEn ? 'Getting the Server ID' : 'Obtenir l\'ID du serveur'}</h3>
    <ol>
      <li>{isEn ? 'Enable Developer Mode in Discord: Settings > Advanced > Developer Mode' : 'Activez le mode développeur dans Discord : Paramètres > Avancé > Mode développeur'}</li>
      <li>{isEn ? 'Right-click on your server icon > Copy ID → GUILD_ID and DEV_SERVER_ID' : 'Clic droit sur l\'icône du serveur > Copier l\'identifiant → GUILD_ID et DEV_SERVER_ID'}</li>
    </ol>
  </>
}

export function Step5DiscordBot() {
  const { t, config, setField } = useApp()

  return (
    <WizardLayout
      title={t('step5.title')}
      stepBadge={`${t('nav.step')} 5 — ${t('step5.label')}`}
      description={t('step5.desc')}
      helpContent={<HelpContent />}
    >
      <div className="link-buttons-row">
        <ExternalLinkBtn url="https://discord.com/developers/applications" label={t('step5.discord.btn')} />
      </div>

      <div className="card">
        <div className="form-section">
          <div className="form-row">
            <FormField id="bot-client-id" label={t('step5.clientId')} envKey="CLIENT_ID"
              value={config.CLIENT_ID} onChange={v => setField('CLIENT_ID', v)}
              placeholder="1234567890123456789" hint={t('step5.clientId.hint')} />
            <FormField id="bot-token" label={t('step5.botToken')} envKey="BOT_TOKEN"
              value={config.BOT_TOKEN} onChange={v => setField('BOT_TOKEN', v)}
              placeholder="MTIz..." hint={t('step5.botToken.hint')} type="password" />
          </div>
          <div className="form-row">
            <FormField id="dev-server-id" label={t('step5.devServerId')} envKey="DEV_SERVER_ID"
              value={config.DEV_SERVER_ID} onChange={v => setField('DEV_SERVER_ID', v)}
              placeholder="987654321098765432" hint={t('step5.devServerId.hint')} />
            <FormField id="guild-id" label={t('step5.guildId')} envKey="GUILD_ID"
              value={config.GUILD_ID} onChange={v => setField('GUILD_ID', v)}
              placeholder="987654321098765432" hint={t('step5.guildId.hint')} />
          </div>
        </div>
      </div>
    </WizardLayout>
  )
}
