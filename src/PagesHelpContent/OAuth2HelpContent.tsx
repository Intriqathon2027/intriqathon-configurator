import { Shield } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { HelpFlow, type HelpFlowStep } from '../components/ui/HelpFlow'
import { HelpService } from '../components/ui/HelpService'

export function OAuth2HelpContent() {
  const { state, config } = useApp();
  const isEn = state.language === "en";
  const domain = config.DOMAIN || "<DOMAIN>";

  const discord: HelpFlowStep[] = [
    {
      key: "app",
      title: "New Application",
      desc: isEn ? (
        <>
          <code>New Application</code> on the Discord Developer Portal, then a
          name.{" "}
          <strong>
            One application can carry both the OAuth2 login and the bot.
          </strong>
        </>
      ) : (
        <>
          <code>New Application</code> sur le Discord Developer Portal, puis un
          nom.{" "}
          <strong>
            Une seule application peut porter la connexion OAuth2 et le bot.
          </strong>
        </>
      ),
      url: "https://discord.com/developers/applications",
    },
    {
      key: "redirect",
      title: "OAuth2 ➔ Redirects",
      desc: isEn ? (
        <>
          <code>OAuth2</code> ➔ <code>Redirects</code> ➔{" "}
          <code>Add Redirect</code>, then <code>Save Changes</code>. Paste the
          callback URL shown in the form, character for character.
        </>
      ) : (
        <>
          <code>OAuth2</code> ➔ <code>Redirects</code> ➔{" "}
          <code>Add Redirect</code>, puis <code>Save Changes</code>. Collez
          l'URL de callback affichée dans le formulaire, à l'identique.
        </>
      ),
      copyValues: [{ value: `https://${domain}/api/auth/discord/callback` }],
    },
    {
      key: "creds",
      title: isEn ? "Copy the ID and the secret" : "Copier l'ID et le secret",
      desc: isEn ? (
        <>
          Client ID = the <code>Application ID</code> under{" "}
          <code>General Information</code>. The secret comes from{" "}
          <code>OAuth2</code> ➔ <code>Reset Secret</code> —{" "}
          <strong>shown only once</strong>.
        </>
      ) : (
        <>
          Client ID = l'<code>Application ID</code> de{" "}
          <code>General Information</code>. Le secret vient de{" "}
          <code>OAuth2</code> ➔ <code>Reset Secret</code> —{" "}
          <strong>affiché une seule fois</strong>.
        </>
      ),
    },
  ];

  const bot: HelpFlowStep[] = [
    {
      key: "bot",
      title: isEn
        ? "Add a bot to the application"
        : "Ajouter un bot à l'application",
      desc: isEn ? (
        <>
          <code>Your application</code> ➔ <code>Bot</code>. Reuse the OAuth2
          application above, or create a second one for the bot.
        </>
      ) : (
        <>
          <code>Votre application</code> ➔ <code>Bot</code>. Reprenez
          l'application OAuth2 ci-dessus, ou créez-en une seconde dédiée au bot.
        </>
      ),
      url: "https://discord.com/developers/applications",
    },
    {
      key: "intents",
      title: "Privileged Gateway Intents",
      desc: isEn ? (
        <>
          Still under <code>Bot</code>, enable{" "}
          <strong>Server Members Intent</strong> and{" "}
          <strong>Message Content Intent</strong>. Without them the bot connects
          but stays deaf.
        </>
      ) : (
        <>
          Toujours dans <code>Bot</code>, activez{" "}
          <strong>Server Members Intent</strong> et{" "}
          <strong>Message Content Intent</strong>. Sans elles, le bot se
          connecte mais reste sourd.
        </>
      ),
    },
    {
      key: "token",
      title: "Reset Token",
      desc: isEn ? (
        <>
          <code>Bot</code> ➔ <code>Reset Token</code>. Shown once and never
          shareable: it grants full control over the bot.
        </>
      ) : (
        <>
          <code>Bot</code> ➔ <code>Reset Token</code>. Affiché une seule fois et
          jamais partageable : il donne un contrôle total sur le bot.
        </>
      ),
    },
    {
      key: "invite",
      title: isEn
        ? "Invite the bot to your server"
        : "Inviter le bot sur votre serveur",
      desc: isEn ? (
        <>
          <code>OAuth2</code> ➔ <code>URL Generator</code> ➔ scopes{" "}
          <code>bot</code> and <code>applications.commands</code>. Pick the
          permissions, then open the generated URL.
        </>
      ) : (
        <>
          <code>OAuth2</code> ➔ <code>URL Generator</code> ➔ scopes{" "}
          <code>bot</code> et <code>applications.commands</code>. Choisissez les
          permissions, puis ouvrez l'URL générée.
        </>
      ),
    },
    {
      key: "ids",
      title: isEn ? "Copy the server IDs" : "Copier les IDs de serveur",
      desc: isEn ? (
        <>
          Discord <code>User Settings</code> ➔ <code>Advanced</code> ➔ enable{" "}
          <code>Developer Mode</code>, then right-click the server ➔{" "}
          <code>Copy Server ID</code>.
        </>
      ) : (
        <>
          Discord <code>Paramètres utilisateur</code> ➔ <code>Avancé</code> ➔
          activez le <code>Mode développeur</code>, puis clic droit sur le
          serveur ➔ <code>Copier l'identifiant du serveur</code>.
        </>
      ),
      extra: (
        <p className="help-note">
          {isEn ? (
            <>
              <strong>GUILD_ID</strong> is the production server,{" "}
              <strong>DEV_SERVER_ID</strong> the test one. One server only? Put
              the same value in both.
            </>
          ) : (
            <>
              <strong>GUILD_ID</strong> est le serveur de production,{" "}
              <strong>DEV_SERVER_ID</strong> celui de test. Un seul serveur ?
              Mettez la même valeur dans les deux.
            </>
          )}
        </p>
      ),
    },
  ];

  const github: HelpFlowStep[] = [
    {
      key: "new",
      title: "New OAuth App",
      desc: isEn ? (
        <>
          Profile photo (top right) ➔ <code>Settings</code> ➔{" "}
          <code>Developer settings</code> ➔ <code>OAuth Apps</code> ➔{" "}
          <code>New OAuth App</code>.
        </>
      ) : (
        <>
          Photo de profil (haut droite) ➔ <code>Settings</code> ➔{" "}
          <code>Developer settings</code> ➔ <code>OAuth Apps</code> ➔{" "}
          <code>New OAuth App</code>.
        </>
      ),
      url: "https://github.com/settings/applications/new",
      linkLabel: isEn ? "Create the app" : "Créer l'app",
    },
    {
      key: "urls",
      title: isEn ? "Fill in the two URLs" : "Renseigner les deux URLs",
      desc: isEn ? (
        <>
          Copy the <code>Homepage URL</code> and the{" "}
          <code>Authorization callback URL</code> exactly as the form shows
          them, then <code>Register application</code>.
        </>
      ) : (
        <>
          Recopiez la <code>Homepage URL</code> et l'
          <code>Authorization callback URL</code> exactement comme le formulaire
          les affiche, puis <code>Register application</code>.
        </>
      ),
      copyValues: [
        { value: `https://${domain}`, note: "Homepage URL" },
        {
          value: `https://${domain}/api/auth/github/callback`,
          note: "Authorization callback URL",
        },
      ],
    },
    {
      key: "creds",
      title: isEn
        ? "Copy the ID and generate the secret"
        : "Copier l'ID et générer le secret",
      desc: isEn ? (
        <>
          The Client ID sits on the app page. Click{" "}
          <code>Generate a new client secret</code> for the secret — shown only
          once.
        </>
      ) : (
        <>
          Le Client ID est affiché sur la page de l'app. Cliquez sur{" "}
          <code>Generate a new client secret</code> pour le secret — affiché une
          seule fois.
        </>
      ),
      url: "https://github.com/settings/developers",
    },
    {
      key: "org",
      title: isEn ? "GitHub organization" : "Organisation GitHub",
      desc: isEn ? (
        <>
          Team repositories go into a GitHub{" "}
          <strong>organization named after your hackathon</strong>. Create it
          beforehand — the platform looks it up, never creates it.
        </>
      ) : (
        <>
          Les dépôts des équipes atterrissent dans une{" "}
          <strong>organisation GitHub portant le nom de votre hackathon</strong>
          . Créez-la au préalable — la plateforme la recherche, elle ne la crée
          jamais.
        </>
      ),
      url: "https://github.com/account/organizations/new",
      extra: (
        <p className="help-note">
          {isEn ? (
            <>
              At sign-in, the organizer must{" "}
              <strong>grant the app access to that organization</strong> —
              otherwise repository creation fails.
            </>
          ) : (
            <>
              À la connexion, l'organisateur doit{" "}
              <strong>accorder à l'app l'accès à cette organisation</strong> —
              sinon la création des dépôts échoue.
            </>
          )}
        </p>
      ),
    },
  ];

  return (
    <>
      <HelpService
        id="svc-discord"
        icon={<Shield size={15} />}
        title="Discord OAuth2"
      >
        <HelpFlow steps={discord} />
      </HelpService>

      <HelpService
        id="svc-bot"
        icon={<Shield size={15} />}
        title={isEn ? "Discord Bot" : "Bot Discord"}
      >
        <HelpFlow steps={bot} />
      </HelpService>

      <HelpService
        id="svc-github"
        icon={<Shield size={15} />}
        title="GitHub OAuth2"
      >
        <HelpFlow steps={github} />
      </HelpService>
    </>
  );
}
