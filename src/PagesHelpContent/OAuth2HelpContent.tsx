import { Shield } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { HelpFlow, type HelpFlowStep } from '../components/ui/HelpFlow'
import { HelpService } from '../components/ui/HelpService'
import { ShotMarker as M } from '../components/ui/HelpScreenshot'

import discordNewApp from '../assets/help/oauth2/discord-new-app.jpg'
import discordGeneralInfo from '../assets/help/oauth2/discord-general-info.jpg'
import discordOAuth2 from '../assets/help/oauth2/discord-oauth2.jpg'
import discordInstallContexts from '../assets/help/oauth2/discord-install-contexts.jpg'
import discordInstallSettings from '../assets/help/oauth2/discord-install-settings.jpg'
import discordBotToken from '../assets/help/oauth2/discord-bot-token.jpg'
import discordIntents from '../assets/help/oauth2/discord-intents.jpg'
import discordDevMode from '../assets/help/oauth2/discord-dev-mode.jpg'
import discordCopyServerId from '../assets/help/oauth2/discord-copy-server-id.jpg'
import githubDevSettings from '../assets/help/oauth2/github-dev-settings.jpg'
import githubOAuthApps from '../assets/help/oauth2/github-oauth-apps.jpg'
import githubNewAppForm from '../assets/help/oauth2/github-new-app-form.jpg'
import githubRegister from '../assets/help/oauth2/github-register.jpg'
import githubAppCreds from '../assets/help/oauth2/github-app-creds.jpg'
import githubNewOrg from '../assets/help/oauth2/github-new-org.jpg'

const DISCORD_PORTAL = 'https://discord.com/developers/applications'

/**
 * Walkthroughs for the three services of step 3, written for someone who has
 * never opened the Discord Developer Portal nor GitHub's developer settings.
 * Every action names the button as it reads on screen — Discord shows its
 * portal in the user's language, so French labels come with their English
 * counterpart — and the captures carry numbered markers the text refers to.
 */
export function OAuth2HelpContent() {
  const { state, config } = useApp()
  const isEn = state.language === 'en'
  const L = <T,>(fr: T, en: T): T => (isEn ? en : fr)
  const domain = config.DOMAIN || '<DOMAIN>'

  const discord: HelpFlowStep[] = [
    {
      key: 'app',
      title: L('Créer une application Discord', 'Create a Discord application'),
      desc: L(
        <>
          Ouvrez le portail développeur de Discord et connectez-vous avec votre
          compte Discord habituel. Cliquez sur <code>Nouvelle application</code>{' '}
          (<code>New Application</code>) <M n={1} />, donnez-lui un nom — par exemple{' '}
          <code>Hackathon_Auth</code> <M n={2} /> —, cochez l'acceptation des conditions <M n={3} />
          puis cliquez sur <code>Créer</code> <M n={4} />.
        </>,
        <>
          Open Discord's developer portal and sign in with your usual Discord
          account. Click <code>New Application</code> <M n={1} />, give it a name — for
          example <code>Hackathon_Auth</code> <M n={2} /> —, tick the terms checkbox <M n={3} />,
          then click <code>Create</code> <M n={4} />.
        </>,
      ),
      url: DISCORD_PORTAL,
      linkLabel: L('Ouvrir le portail Discord', 'Open the Discord portal'),
      shots: [{
        src: discordNewApp,
        alt: L('Fenêtre de création d\'une application Discord', 'Discord new application dialog'),
      }],
    },
    {
      key: 'id',
      title: L('Copier le Client ID', 'Copy the Client ID'),
      desc: L(
        <>
          Une fois l'application créée, Discord ouvre l'onglet{' '}
          <code>Informations générales</code> (<code>General Information</code>) <M n={1} />.
          Repérez <code>Identifiant d'application</code> (<code>Application ID</code>) <M n={2} />,
          cliquez sur <code>Copier</code> et collez la valeur dans le champ{' '}
          <strong>Discord Client ID</strong> du formulaire.
        </>,
        <>
          Once the application exists, Discord opens the{' '}
          <code>General Information</code> tab <M n={1} />. Find the{' '}
          <code>Application ID</code> <M n={2} />, click <code>Copy</code> and paste it
          into the <strong>Discord Client ID</strong> field of the form.
        </>,
      ),
      shots: [{
        src: discordGeneralInfo,
        alt: L('Onglet Informations générales et Application ID', 'General Information tab and Application ID'),
      }],
    },
    {
      key: 'secret',
      title: L('Générer le Client Secret', 'Generate the Client Secret'),
      desc: L(
        <>
          Dans le menu de gauche, ouvrez l'onglet <code>OAuth2</code> <M n={1} />. Sous{' '}
          <code>Informations du client</code>, cliquez sur{' '}
          <code>Réinitialiser la clé secrète</code> (<code>Reset Secret</code>) <M n={3} />
          et confirmez. Copiez la clé qui apparaît et collez-la dans le champ{' '}
          <strong>Discord Client Secret</strong>.
        </>,
        <>
          In the left menu, open the <code>OAuth2</code> tab <M n={1} />. Under{' '}
          <code>Client Information</code>, click <code>Reset Secret</code> <M n={3} />
          and confirm. Copy the key that appears and paste it into the{' '}
          <strong>Discord Client Secret</strong> field.
        </>,
      ),
      extra: (
        <p className="help-note">
          {L(
            <>
              <strong>Discord n'affiche ce secret qu'une seule fois.</strong> Si vous
              le perdez, cliquez à nouveau sur Reset Secret et remplacez l'ancienne
              valeur dans le formulaire.
            </>,
            <>
              <strong>Discord shows this secret only once.</strong> If you lose it,
              click Reset Secret again and replace the old value in the form.
            </>,
          )}
        </p>
      ),
      shots: [{
        src: discordOAuth2,
        alt: L('Onglet OAuth2 du portail Discord', 'OAuth2 tab of the Discord portal'),
        caption: L(
          <><M n={1} /> onglet OAuth2 · <M n={2} /> Client ID (déjà copié) · <M n={3} /> Reset Secret · <M n={4} /> URL de redirection · <M n={5} /> ajouter une redirection</>,
          <><M n={1} /> OAuth2 tab · <M n={2} /> Client ID (already copied) · <M n={3} /> Reset Secret · <M n={4} /> redirect URL · <M n={5} /> add a redirect</>,
        ),
      }],
    },
    {
      key: 'redirect',
      title: L('Ajouter l\'URL de redirection', 'Add the redirect URL'),
      desc: L(
        <>
          Sur la même page, descendez jusqu'à <code>Redirections</code>{' '}
          (<code>Redirects</code>). Cliquez sur <code>Ajouter une redirection</code>{' '}
          (<code>Add Redirect</code>, ou <code>Ajouter un autre</code> s'il y en a déjà une) <M n={5} /> et collez l'URL ci-dessous <M n={4} /> —{' '}
          <strong>au caractère près</strong>. C'est l'adresse vers laquelle
          Discord renvoie le participant une fois connecté.
        </>,
        <>
          On the same page, scroll down to <code>Redirects</code>. Click{' '}
          <code>Add Redirect</code> <M n={5} /> and paste the URL below <M n={4} /> —{' '}
          <strong>character for character</strong>. It is where Discord sends
          the participant back once signed in.
        </>,
      ),
      copyValues: [{ value: `https://${domain}/api/auth/discord/callback` }],
      extra: (
        <p className="help-note">
          {L(
            <>
              Terminez en cliquant sur <strong>Enregistrer les modifications</strong>{' '}
              (<code>Save Changes</code>) dans la barre qui apparaît en bas de
              l'écran — sans cela, rien n'est pris en compte.
            </>,
            <>
              Finish by clicking <strong>Save Changes</strong> in the bar that
              appears at the bottom of the screen — without it nothing is kept.
            </>,
          )}
        </p>
      ),
    },
  ]

  const bot: HelpFlowStep[] = [
    {
      key: 'server',
      title: L('Préparer un serveur Discord vierge', 'Prepare an empty Discord server'),
      desc: L(
        <>
          Le bot a besoin d'un serveur où vivre : ce sera le serveur de
          communication du hackathon. Dans Discord, cliquez sur le{' '}
          <code>+</code> en bas de la liste des serveurs ➔{' '}
          <code>Créer le mien</code>. Un serveur existant fait aussi l'affaire,
          mais le bot y aura les droits d'administrateur.
        </>,
        <>
          The bot needs a server to live in: it becomes the hackathon's
          communication server. In Discord, click the <code>+</code> at the
          bottom of the server list ➔ <code>Create My Own</code>. An existing
          server works too, but the bot will be an administrator there.
        </>,
      ),
    },
    {
      key: 'app',
      title: L('Créer l\'application du bot', 'Create the bot\'s application'),
      desc: L(
        <>
          Retournez sur le portail développeur et créez une{' '}
          <strong>deuxième application</strong>, par exemple{' '}
          <code>HackathonBot</code>, comme à l'étape 1 de Discord OAuth2. Dans{' '}
          <code>Informations générales</code>, copiez l'
          <code>Identifiant d'application</code> et collez-le dans le champ{' '}
          <strong>Application ID (Client ID)</strong> du bloc Bot.
        </>,
        <>
          Back on the developer portal, create a{' '}
          <strong>second application</strong>, for example{' '}
          <code>HackathonBot</code>, as in step 1 of Discord OAuth2. Under{' '}
          <code>General Information</code>, copy the{' '}
          <code>Application ID</code> and paste it into the{' '}
          <strong>Application ID (Client ID)</strong> field of the Bot block.
        </>,
      ),
      url: DISCORD_PORTAL,
      linkLabel: L('Ouvrir le portail Discord', 'Open the Discord portal'),
    },
    {
      key: 'context',
      title: L('Installation : serveurs uniquement', 'Installation: servers only'),
      desc: L(
        <>
          Ouvrez l'onglet <code>Installation</code> <M n={1} />. Dans{' '}
          <code>Contextes d'installation</code>, ne laissez cochée que{' '}
          <code>Installation pour une guilde</code> (<code>Guild Install</code>) <M n={2} />
          — décochez l'installation pour un utilisateur.
        </>,
        <>
          Open the <code>Installation</code> tab <M n={1} />. Under{' '}
          <code>Installation Contexts</code>, keep only <code>Guild Install</code>{' '}
          <M n={2} /> ticked — untick <code>User Install</code>.
        </>,
      ),
      shots: [{
        src: discordInstallContexts,
        alt: L('Onglet Installation du portail Discord', 'Installation tab of the Discord portal'),
        caption: L(
          <><M n={1} /> onglet Installation · <M n={2} /> Guild Install seul · <M n={3} /> lien d'installation (utilisé plus bas)</>,
          <><M n={1} /> Installation tab · <M n={2} /> Guild Install only · <M n={3} /> install link (used further down)</>,
        ),
      }],
    },
    {
      key: 'scopes',
      title: L('Droits demandés par le bot', 'Permissions the bot asks for'),
      desc: L(
        <>
          Plus bas, dans <code>Paramètres d'installation par défaut</code>{' '}
          (<code>Default Install Settings</code>) ➔{' '}
          <code>Installation pour une guilde</code> :
        </>,
        <>
          Further down, under <code>Default Install Settings</code> ➔{' '}
          <code>Guild Install</code>:
        </>,
      ),
      extra: (
        <ul className="help-note">
          <li>
            {L(
              <>Champ <strong>Scopes</strong> <M n={1} /> : tapez chacune des deux valeurs ci-dessus puis <code>Entrée</code>.</>,
              <><strong>Scopes</strong> field <M n={1} />: type each of the two values above, then <code>Enter</code>.</>,
            )}
          </li>
          <li>
            {L(
              <>Champ <strong>Permissions</strong> <M n={2} /> : choisissez <code>Administrateur</code> (<code>Administrator</code>).</>,
              <><strong>Permissions</strong> field <M n={2} />: pick <code>Administrator</code>.</>,
            )}
          </li>
          <li>
            {L(
              <>Cliquez sur <strong>Enregistrer les modifications</strong> en bas de l'écran.</>,
              <>Click <strong>Save Changes</strong> at the bottom of the screen.</>,
            )}
          </li>
        </ul>
      ),
      copyValues: [{ value: 'applications.commands' }, { value: 'bot' }],
      shots: [{
        src: discordInstallSettings,
        alt: L('Scopes et permissions par défaut du bot', 'Default scopes and permissions of the bot'),
        caption: L('Résultat attendu.', 'Expected result.'),
      }],
    },
    {
      key: 'invite',
      title: L('Inviter le bot sur votre serveur', 'Invite the bot to your server'),
      desc: L(
        <>
          Remontez à <code>Lien d'installation</code> (<code>Install Link</code>)
          <M n={3} /> et copiez le lien avec le bouton à sa droite. Collez-le dans un nouvel
          onglet de votre navigateur, choisissez le <strong>serveur vierge</strong>{' '}
          préparé plus haut, puis cliquez sur <code>Continuer</code> et{' '}
          <code>Autoriser</code>. Le bot apparaît alors (hors ligne) dans la liste
          des membres du serveur.
        </>,
        <>
          Scroll back up to <code>Install Link</code> <M n={3} /> and copy the link with the
          button on its right. Paste it into a new browser tab, pick the{' '}
          <strong>empty server</strong> prepared earlier, then click{' '}
          <code>Continue</code> and <code>Authorize</code>. The bot then shows up
          (offline) in the server's member list.
        </>,
      ),
    },
    {
      key: 'token',
      title: L('Récupérer le token du bot', 'Get the bot token'),
      desc: L(
        <>
          Ouvrez l'onglet <code>Bot</code> <M n={1} />, cliquez sur{' '}
          <code>Réinitialiser le token</code> (<code>Reset Token</code>) <M n={2} /> et
          confirmez (Discord peut redemander votre mot de passe ou votre code
          2FA). Copiez le token et collez-le dans le champ{' '}
          <strong>Bot Token</strong>.
        </>,
        <>
          Open the <code>Bot</code> tab <M n={1} />, click <code>Reset Token</code> <M n={2} /> and
          confirm (Discord may ask for your password or 2FA code again). Copy the
          token and paste it into the <strong>Bot Token</strong> field.
        </>,
      ),
      extra: (
        <p className="help-note">
          {L(
            <>
              <strong>Affiché une seule fois, et à ne jamais partager</strong> :
              quiconque le possède contrôle totalement le bot. En cas de fuite,
              réinitialisez-le.
            </>,
            <>
              <strong>Shown only once, and never to be shared</strong>: anyone
              holding it fully controls the bot. If it leaks, reset it.
            </>,
          )}
        </p>
      ),
      shots: [{
        src: discordBotToken,
        alt: L('Onglet Bot et bouton Reset Token', 'Bot tab and Reset Token button'),
      }],
    },
    {
      key: 'intents',
      title: 'Privileged Gateway Intents',
      desc: L(
        <>
          Toujours dans l'onglet <code>Bot</code>, descendez jusqu'à{' '}
          <code>Privileged Gateway Intents</code> et activez{' '}
          <strong>Presence Intent</strong> <M n={1} /> et{' '}
          <strong>Server Members Intent</strong> <M n={2} />. Ces autorisations
          permettent au bot de voir les membres du serveur et leur statut.
          Enregistrez les modifications.
        </>,
        <>
          Still on the <code>Bot</code> tab, scroll down to{' '}
          <code>Privileged Gateway Intents</code> and turn on{' '}
          <strong>Presence Intent</strong> <M n={1} /> and{' '}
          <strong>Server Members Intent</strong> <M n={2} />. They let the bot see the
          server's members and their status. Save the changes.
        </>,
      ),
      shots: [{
        src: discordIntents,
        alt: L('Intents Presence et Server Members activées', 'Presence and Server Members intents turned on'),
      }],
    },
    {
      key: 'devmode',
      title: L('Activer le mode développeur', 'Turn on Developer Mode'),
      desc: L(
        <>
          Dans l'application Discord (pas le portail), ouvrez les{' '}
          <code>Paramètres utilisateur</code> (roue dentée en bas à gauche, à côté
          de votre pseudo) ➔ <code>Développeur</code> (<code>Avancés</code> sur
          les anciennes versions) et activez <code>Mode développeur</code>. Ce
          mode ajoute l'option « Copier l'identifiant » aux menus clic droit.
        </>,
        <>
          In the Discord app (not the portal), open <code>User Settings</code>{' '}
          (the gear at the bottom left, next to your name) ➔{' '}
          <code>Developer</code> (<code>Advanced</code> on older versions) and
          turn on <code>Developer Mode</code>. It adds a « Copy ID » option to
          right-click menus.
        </>,
      ),
      shots: [{
        src: discordDevMode,
        alt: L('Réglage Mode développeur de Discord', 'Discord Developer Mode setting'),
      }],
    },
    {
      key: 'ids',
      title: L('Copier l\'ID du serveur', 'Copy the server ID'),
      desc: L(
        <>
          Faites un clic droit sur l'icône de votre serveur, dans la colonne de
          gauche, puis <code>Copier l'identifiant du serveur</code>{' '}
          (<code>Copy Server ID</code>) — tout en bas du menu. Collez cette valeur
          dans <strong>Guild ID</strong> <em>et</em> dans{' '}
          <strong>ID du serveur de dev</strong>.
        </>,
        <>
          Right-click your server's icon in the left column, then{' '}
          <code>Copy Server ID</code> — at the very bottom of the menu. Paste
          that value into <strong>Guild ID</strong> <em>and</em> into{' '}
          <strong>Dev server ID</strong>.
        </>,
      ),
      extra: (
        <p className="help-note">
          {L(
            <>
              <strong>GUILD_ID</strong> est le serveur de production,{' '}
              <strong>DEV_SERVER_ID</strong> celui de test. Avec un seul serveur,
              mettez la même valeur dans les deux.
            </>,
            <>
              <strong>GUILD_ID</strong> is the production server,{' '}
              <strong>DEV_SERVER_ID</strong> the test one. With a single server,
              put the same value in both.
            </>,
          )}
        </p>
      ),
      shots: [{
        src: discordCopyServerId,
        alt: L('Menu clic droit d\'un serveur Discord', 'Right-click menu of a Discord server'),
      }],
    },
  ]

  const github: HelpFlowStep[] = [
    {
      key: 'settings',
      title: L('Ouvrir les Developer settings', 'Open Developer settings'),
      desc: L(
        <>
          Connectez-vous à GitHub. Cliquez sur votre photo de profil en haut à
          droite ➔ <code>Settings</code>, puis faites défiler la barre latérale
          gauche <strong>tout en bas</strong> jusqu'à{' '}
          <code>Developer settings</code>.
        </>,
        <>
          Sign in to GitHub. Click your profile picture at the top right ➔{' '}
          <code>Settings</code>, then scroll the left sidebar{' '}
          <strong>all the way down</strong> to <code>Developer settings</code>.
        </>,
      ),
      url: 'https://github.com/settings/developers',
      linkLabel: L('Ouvrir directement', 'Open directly'),
      shots: [{
        src: githubDevSettings,
        alt: L('Lien Developer settings en bas des paramètres GitHub', 'Developer settings link at the bottom of GitHub settings'),
      }],
    },
    {
      key: 'new',
      title: 'New OAuth App',
      desc: L(
        <>
          Dans le menu de gauche, choisissez <code>OAuth Apps</code> <M n={1} />, puis
          cliquez sur <code>New OAuth App</code> <M n={2} /> (le bouton s'appelle{' '}
          <code>Register a new application</code> si c'est votre première app).
        </>,
        <>
          In the left menu, pick <code>OAuth Apps</code> <M n={1} />, then click{' '}
          <code>New OAuth App</code> <M n={2} /> (the button reads{' '}
          <code>Register a new application</code> if it is your first app).
        </>,
      ),
      url: 'https://github.com/settings/applications/new',
      linkLabel: L('Créer l\'app', 'Create the app'),
      shots: [{
        src: githubOAuthApps,
        alt: L('Liste des OAuth Apps GitHub', 'GitHub OAuth Apps list'),
      }],
    },
    {
      key: 'form',
      title: L('Remplir le formulaire', 'Fill in the form'),
      desc: L(
        <>Trois champs suffisent :</>,
        <>Three fields are enough:</>,
      ),
      extra: (
        <ul className="help-note">
          <li>
            {L(
              <><strong>Application name</strong> <M n={1} /> : le nom que verront les participants au moment de se connecter (ex. le nom du hackathon).</>,
              <><strong>Application name</strong> <M n={1} />: the name participants see when they sign in (e.g. the hackathon's name).</>,
            )}
          </li>
          <li>
            {L(
              <><strong>Homepage URL</strong> <M n={2} /> : l'adresse principale du site, ci-dessus.</>,
              <><strong>Homepage URL</strong> <M n={2} />: the site's main address, above.</>,
            )}
          </li>
          <li>
            {L(
              <>
                <strong>Redirect URI</strong> <M n={3} /> (appelé <code>Authorization callback URL</code>{' '}
                sur les anciennes versions) : l'adresse où GitHub renvoie le participant
                après connexion. Elle doit correspondre <strong>exactement</strong>.
              </>,
              <>
                <strong>Redirect URI</strong> <M n={3} /> (named <code>Authorization callback URL</code>{' '}
                on older versions): where GitHub sends the participant back after
                signing in. It must match <strong>exactly</strong>.
              </>,
            )}
          </li>
          <li>
            {L(
              <>Laissez le reste tel quel, puis cliquez sur <code>Register application</code>.</>,
              <>Leave the rest as is, then click <code>Register application</code>.</>,
            )}
          </li>
        </ul>
      ),
      copyValues: [
        { value: `https://${domain}`, note: 'Homepage URL' },
        { value: `https://${domain}/api/auth/github/callback`, note: 'Redirect URI' },
      ],
      shots: [
        {
          src: githubNewAppForm,
          alt: L('Formulaire Register a new OAuth app', 'Register a new OAuth app form'),
        },
        {
          src: githubRegister,
          alt: L('Bouton Register application', 'Register application button'),
        },
      ],
    },
    {
      key: 'creds',
      title: L('Copier l\'ID et générer le secret', 'Copy the ID and generate the secret'),
      desc: L(
        <>
          GitHub ouvre la page de l'app. Le <code>Client ID</code> <M n={1} /> y est
          affiché : copiez-le dans <strong>GitHub Client ID</strong>. Cliquez
          ensuite sur <code>Generate a new client secret</code> <M n={2} /> (GitHub peut
          redemander votre mot de passe) et copiez le secret dans{' '}
          <strong>GitHub Client Secret</strong>.
        </>,
        <>
          GitHub opens the app's page. The <code>Client ID</code> <M n={1} /> is shown
          there: copy it into <strong>GitHub Client ID</strong>. Then click{' '}
          <code>Generate a new client secret</code> <M n={2} /> (GitHub may ask for your
          password again) and copy the secret into{' '}
          <strong>GitHub Client Secret</strong>.
        </>,
      ),
      extra: (
        <p className="help-note">
          {L(
            <><strong>Le secret n'est affiché qu'une seule fois.</strong> Perdu ? Générez-en un nouveau et remplacez l'ancien.</>,
            <><strong>The secret is shown only once.</strong> Lost it? Generate a new one and replace the old value.</>,
          )}
        </p>
      ),
      url: 'https://github.com/settings/developers',
      shots: [{
        src: githubAppCreds,
        alt: L('Page de l\'OAuth App : Client ID et secrets', 'OAuth App page: Client ID and secrets'),
      }],
    },
    {
      key: 'org',
      title: L('Créer l\'organisation GitHub', 'Create the GitHub organization'),
      desc: L(
        <>
          Les dépôts des équipes sont créés dans une{' '}
          <strong>organisation GitHub portant le nom de votre hackathon</strong>{' '}
          — le même nom que celui saisi plus tard dans les paramètres du site.
          Créez-la au préalable (offre gratuite) : la plateforme la recherche,
          elle ne la crée jamais.
        </>,
        <>
          Team repositories are created in a{' '}
          <strong>GitHub organization named after your hackathon</strong> — the
          same name you enter later in the site's settings. Create it beforehand
          (free plan): the platform looks it up, it never creates it.
        </>,
      ),
      url: 'https://github.com/account/organizations/new?plan=free',
      linkLabel: L('Créer l\'organisation', 'Create the organization'),
      extra: (
        <p className="help-note">
          {L(
            <>
              À sa première connexion, l'organisateur doit{' '}
              <strong>accorder à l'app l'accès à cette organisation</strong>{' '}
              (bouton <code>Grant</code>) — sinon la création des dépôts échoue.
            </>,
            <>
              On first sign-in, the organizer must{' '}
              <strong>grant the app access to that organization</strong>{' '}
              (<code>Grant</code> button) — otherwise repository creation fails.
            </>,
          )}
        </p>
      ),
      shots: [{
        src: githubNewOrg,
        alt: L('Formulaire de création d\'organisation GitHub', 'GitHub new organization form'),
      }],
    },
  ]

  return (
    <>
      <HelpService id="svc-discord" icon={<Shield size={15} />} title="Discord OAuth2">
        <p className="help-note">
          {L(
            <>
              Permet aux participants de <strong>se connecter avec leur compte Discord</strong>.
              Vous allez créer une « application » sur le portail développeur de
              Discord, qui vous fournira un identifiant (Client ID) et un mot de
              passe (Client Secret) à reporter dans le formulaire.
            </>,
            <>
              Lets participants <strong>sign in with their Discord account</strong>.
              You will create an "application" on Discord's developer portal, which
              gives you an identifier (Client ID) and a password (Client Secret) to
              copy into the form.
            </>,
          )}
        </p>
        <HelpFlow steps={discord} />
      </HelpService>

      <HelpService id="svc-bot" icon={<Shield size={15} />} title={L('Bot Discord', 'Discord Bot') }>
        <p className="help-note">
          {L(
            <>
              Le bot relaie les annonces du hackathon sur votre serveur Discord. Il s'agit d'une seconde application Discord, à laquelle
              on ajoute un utilisateur « bot ».
            </>,
            <>
              The bot relays the hackathon's announcements on your Discord server. It is a second Discord application, to which a
              "bot" user is added.
            </>,
          )}
        </p>
        <HelpFlow steps={bot} />
      </HelpService>

      <HelpService id="svc-github" icon={<Shield size={15} />} title="GitHub OAuth2">
        <p className="help-note">
          {L(
            <>
              Permet aux participants de <strong>se connecter avec GitHub</strong> et à
              la plateforme de créer les dépôts des équipes. Vous allez enregistrer une
              « OAuth App » dans les paramètres développeur de votre compte GitHub.
            </>,
            <>
              Lets participants <strong>sign in with GitHub</strong> and the platform
              create team repositories. You will register an "OAuth App" in your
              GitHub account's developer settings.
            </>,
          )}
        </p>
        <HelpFlow steps={github} />
      </HelpService>
    </>
  )
}
