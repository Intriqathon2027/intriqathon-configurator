import { Database, Mail, Globe, Server } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { HelpFlow, type HelpFlowStep } from '../components/ui/HelpFlow'
import { HelpService } from '../components/ui/HelpService'
import { ShotMarker as M } from '../components/ui/HelpScreenshot'

import supabaseTokens from '../assets/help/accounts/supabase-tokens.jpg'
import supabaseGenerate from '../assets/help/accounts/supabase-generate.jpg'
import supabaseLegacy from '../assets/help/accounts/supabase-legacy.jpg'
import supabaseLegacyBtn from '../assets/help/accounts/supabase-legacy-btn.jpg'
import scalewayApiKeys from '../assets/help/accounts/scaleway-apikeys.jpg'
import scalewayGenerate from '../assets/help/accounts/scaleway-generate.jpg'
import scalewayProjects from '../assets/help/accounts/scaleway-projects.jpg'
import resendApiKeys from '../assets/help/accounts/resend-apikeys.jpg'
import resendCreate from '../assets/help/accounts/resend-create.jpg'
import spaceshipLaunchpad from '../assets/help/accounts/spaceship-launchpad.jpg'
import spaceshipApiManager from '../assets/help/accounts/spaceship-apimanager.jpg'
import spaceshipNewKey from '../assets/help/accounts/spaceship-newkey.jpg'

/**
 * Walkthroughs for the four accounts of step 1, written for someone who has
 * never used these consoles. Each line is led by the marker drawn on the
 * capture beside it; the manual parts of the deployment guide (instance, DNS,
 * buckets) are left out because step 2 automates them.
 */
export function AccountCreationHelpContent() {
  const { state } = useApp()
  const isEn = state.language === 'en'
  const L = <T,>(fr: T, en: T): T => (isEn ? en : fr)

  const supabase: HelpFlowStep[] = [
    {
      key: 'account',
      title: L('Créer un compte Supabase', 'Create a Supabase account'),
      desc: L(
        <>
          Inscrivez-vous sur supabase.com — la connexion via GitHub est la voie
          la plus rapide. Un compte gratuit suffit.
        </>,
        <>
          Sign up on supabase.com — GitHub sign-in is the quickest route. A free
          account is enough.
        </>,
      ),
      url: 'https://supabase.com/dashboard/sign-up',
    },
    {
      key: 'tokens',
      title: L('Ouvrir les jetons d\'accès', 'Open the access tokens'),
      desc: L(
        <>
          Icône de profil (en haut à droite) ➔ <code>Account preferences</code>,
          ou le bouton ci-dessous.<br />
          <M n={1} /> Dans le menu de gauche, ouvrez <code>Access Tokens</code><br />
          <M n={2} /> Cliquez sur <code>Generate new token</code>.
        </>,
        <>
          Profile icon (top right) ➔ <code>Account preferences</code>, or the
          button below.<br />
          <M n={1} /> In the left menu, open <code>Access Tokens</code><br />
          <M n={2} /> Click <code>Generate new token</code>.
        </>,
      ),
      url: 'https://supabase.com/dashboard/account/tokens',
      shots: [{
        src: supabaseTokens,
        alt: L('Page Access Tokens de Supabase', 'Supabase Access Tokens page'),
      }],
    },
    {
      key: 'legacy',
      title: L('Choisir un jeton à accès complet', 'Pick a full-access token'),
      desc: L(
        <>
          Supabase propose par défaut des jetons limités à certains projets. Le
          configurateur doit pouvoir lister vos organisations et y créer le
          projet : il lui faut un jeton qui couvre tout le compte.<br />
          <M n={1} /> Sous <code>Resource access</code>, cliquez sur{' '}
          <code>Create legacy token</code>.
        </>,
        <>
          By default Supabase offers tokens limited to some projects. The
          configurator has to list your organizations and create the project in
          one: it needs a token covering the whole account.<br />
          <M n={1} /> Under <code>Resource access</code>, click{' '}
          <code>Create legacy token</code>.
        </>,
      ),
      shots: [{
        src: supabaseGenerate,
        alt: L('Panneau Generate token et lien Create legacy token', 'Generate token panel and Create legacy token link'),
      }],
    },
    {
      key: 'generate',
      title: L('Générer et copier le jeton', 'Generate and copy the token'),
      desc: L(
        <>
          <M n={1} /> <code>Name</code> : un nom qui vous parle, par exemple{' '}
          <code>intriqathon</code><br />
          <M n={2} /> <code>Expires in</code> : une durée qui couvre toute la
          préparation du hackathon, par exemple <code>30 days</code><br />
          <M n={3} /> Cliquez sur <code>Generate token</code>, en bas du panneau.<br />
          Copiez le jeton affiché et collez-le dans le champ{' '}
          <strong>Personal Access Token</strong>.
        </>,
        <>
          <M n={1} /> <code>Name</code>: a name you will recognise, for example{' '}
          <code>intriqathon</code><br />
          <M n={2} /> <code>Expires in</code>: long enough to cover the whole
          hackathon preparation, for example <code>30 days</code><br />
          <M n={3} /> Click <code>Generate token</code>, at the bottom of the panel.<br />
          Copy the token shown and paste it into the{' '}
          <strong>Personal Access Token</strong> field.
        </>,
      ),
      extra: (
        <ul className="help-note">
          <li>
            {L(
              <>
                <strong>Copiez-le immédiatement</strong> : Supabase ne l'affiche
                qu'une seule fois.
              </>,
              <>
                <strong>Copy it straight away</strong>: Supabase shows it only
                once.
              </>,
            )}
          </li>
          <li>
            {L(
              <>
                Il donne un <strong>accès complet au compte</strong> — toutes les
                organisations, tous les projets. Conservez-le dans ce coffre et
                nulle part ailleurs.
              </>,
              <>
                It carries <strong>full access to the account</strong> — every
                organization, every project. Keep it in this vault and nowhere
                else.
              </>,
            )}
          </li>
          <li>
            {L(
              <>
                Un jeton expiré ou supprimé revient refusé : la carte reste grise
                et l'étape 2 garde son bouton verrouillé. Générez-en un nouveau.
              </>,
              <>
                An expired or deleted token comes back refused: the card stays
                grey and step 2 keeps its button locked. Generate a new one.
              </>,
            )}
          </li>
        </ul>
      ),
      shots: [
        {
          src: supabaseLegacy,
          alt: L('Formulaire du jeton legacy', 'Legacy token form'),
        },
        {
          src: supabaseLegacyBtn,
          alt: L('Bouton Generate token', 'Generate token button'),
        },
      ],
    },
    {
      key: 'project',
      title: L('Le projet Supabase', 'The Supabase project'),
      desc: L(
        <>
          Une fois le jeton collé, le configurateur charge vos organisations et
          vos projets. Choisissez un projet existant, ou{' '}
          <strong>Créer le projet depuis le configurateur</strong> : nom,
          organisation, région, puis <code>Créer le projet maintenant</code>.
        </>,
        <>
          Once the token is pasted, the configurator loads your organizations and
          projects. Pick an existing project, or{' '}
          <strong>Create the project from the configurator</strong>: name,
          organization, region, then <code>Create the project now</code>.
        </>,
      ),
      extra: (
        <p className="help-note">
          {L(
            <>
              Le <strong>mot de passe de la base</strong> est la seule valeur que
              Supabase ne restitue jamais : notez-le, ou utilisez{' '}
              <code>Générer</code>. Évitez <code>$</code>, <code>`</code>,{' '}
              <code>"</code>, <code>'</code> et <code>\</code>.
            </>,
            <>
              The <strong>database password</strong> is the one value Supabase
              never gives back: write it down, or use <code>Generate</code>.
              Avoid <code>$</code>, <code>`</code>, <code>"</code>,{' '}
              <code>'</code> and <code>\</code>.
            </>,
          )}
        </p>
      ),
    },
  ]

  const scaleway: HelpFlowStep[] = [
    {
      key: 'account',
      title: L('Créer un compte Scaleway', 'Create a Scaleway account'),
      desc: L(
        <>Inscrivez-vous sur console.scaleway.com et confirmez votre email.</>,
        <>Sign up on console.scaleway.com and confirm your email.</>,
      ),
      url: 'https://console.scaleway.com/register',
      extra: (
        <p className="help-note">
          {L(
            <>
              <strong>Ajoutez un moyen de paiement</strong> pendant l'inscription,
              ou via <code>Billing</code> ➔ <code>Payment and billing</code>. Sans
              lui, l'étape 2 ne peut pas créer le serveur.
            </>,
            <>
              <strong>Add a payment method</strong> during sign-up, or via{' '}
              <code>Billing</code> ➔ <code>Payment and billing</code>. Without
              it, step 2 cannot create the server.
            </>,
          )}
        </p>
      ),
    },
    {
      key: 'apikeys',
      title: L('Ouvrir les clés API', 'Open the API keys'),
      desc: L(
        <>
          Menu de profil (en haut à droite) ➔ <code>IAM &amp; API keys</code>, ou
          le bouton ci-dessous.<br />
          <M n={1} /> Ouvrez l'onglet <code>API keys</code><br />
          <M n={2} /> Cliquez sur <code>Generate API key</code>.
        </>,
        <>
          Profile menu (top right) ➔ <code>IAM &amp; API keys</code>, or the
          button below.<br />
          <M n={1} /> Open the <code>API keys</code> tab<br />
          <M n={2} /> Click <code>Generate API key</code>.
        </>,
      ),
      url: 'https://console.scaleway.com/iam/api-keys',
      shots: [{
        src: scalewayApiKeys,
        alt: L('Onglet API keys de la console Scaleway', 'API keys tab of the Scaleway console'),
      }],
    },
    {
      key: 'generate',
      title: L('Générer la clé', 'Generate the key'),
      desc: L(
        <>
          <M n={1} /> Porteur de la clé : <code>Myself (IAM user)</code><br />
          <M n={2} /> Description : par exemple <code>intriqathon</code><br />
          <M n={3} /> Expiration : <code>1 year</code><br />
          <M n={4} /> Object Storage : <code>No, skip for now</code><br />
          <M n={5} /> Cliquez sur <code>Generate API key</code>.<br />
          Scaleway affiche une <em>Access Key</em> et une <em>Secret Key</em> :
          copiez la <strong>Secret Key</strong> dans le champ{' '}
          <strong>Secret Key</strong>.
        </>,
        <>
          <M n={1} /> Key bearer: <code>Myself (IAM user)</code><br />
          <M n={2} /> Description: for example <code>intriqathon</code><br />
          <M n={3} /> Expiration: <code>1 year</code><br />
          <M n={4} /> Object Storage: <code>No, skip for now</code><br />
          <M n={5} /> Click <code>Generate API key</code>.<br />
          Scaleway shows an <em>Access Key</em> and a <em>Secret Key</em>: copy
          the <strong>Secret Key</strong> into the <strong>Secret Key</strong>{' '}
          field.
        </>,
      ),
      extra: (
        <p className="help-note">
          {L(
            <>
              <strong>La Secret Key n'est affichée qu'une seule fois.</strong>{' '}
              Perdue ? Générez une nouvelle clé.
            </>,
            <>
              <strong>The Secret Key is shown only once.</strong> Lost it?
              Generate a new key.
            </>,
          )}
        </p>
      ),
      shots: [{
        src: scalewayGenerate,
        alt: L('Fenêtre Generate an API key', 'Generate an API key dialog'),
      }],
    },
    {
      key: 'project',
      title: L('Copier le Project ID', 'Copy the Project ID'),
      desc: L(
        <>
          Menu <code>Organization Dashboard</code>, ou le bouton ci-dessous.<br />
          <M n={1} /> Ouvrez l'onglet <code>Projects</code><br />
          <M n={2} /> Copiez l'<code>ID</code> de votre projet (bouton à sa
          droite) et collez-le dans le champ <strong>Project ID</strong>. C'est
          là que le serveur sera créé.
        </>,
        <>
          <code>Organization Dashboard</code> menu, or the button below.<br />
          <M n={1} /> Open the <code>Projects</code> tab<br />
          <M n={2} /> Copy your project's <code>ID</code> (button on its right)
          and paste it into the <strong>Project ID</strong> field. The server
          will be created there.
        </>,
      ),
      url: 'https://console.scaleway.com/organization/projects',
      extra: (
        <p className="help-note">
          {L(
            <>
              Seule la <strong>clé secrète</strong> est contrôlée auprès de
              Scaleway. Un Project ID inexistant est une autre erreur, que
              l'automatisation de l'étape 2 signale avec le contexte qui permet
              de la corriger.
            </>,
            <>
              Only the <strong>secret key</strong> is checked against Scaleway. A
              Project ID that does not exist is a different mistake, and the step
              2 run names it with the context that makes it fixable.
            </>,
          )}
        </p>
      ),
      shots: [{
        src: scalewayProjects,
        alt: L('Onglet Projects et ID du projet', 'Projects tab and project ID'),
      }],
    },
    {
      key: 'folder',
      title: L('Le dossier hackathon-deploy', 'The hackathon-deploy folder'),
      desc: L(
        <>
          Cliquez sur <code>Parcourir</code> et sélectionnez le dossier{' '}
          <code>hackathon-deploy</code> sur votre machine : c'est son contenu qui
          sera envoyé sur le serveur lors du déploiement.
        </>,
        <>
          Click <code>Browse</code> and pick the <code>hackathon-deploy</code>{' '}
          folder on your machine: its content is what gets sent to the server at
          deployment.
        </>,
      ),
    },
  ]

  const resend: HelpFlowStep[] = [
    {
      key: 'account',
      title: L('Créer un compte Resend', 'Create a Resend account'),
      desc: L(
        <>
          Sur resend.com, cliquez sur <code>Sign up</code> et créez un compte avec
          une adresse email valide (ou via GitHub / Google), puis validez le lien
          de confirmation reçu par email.
        </>,
        <>
          On resend.com, click <code>Sign up</code> and create an account with a
          valid email address (or via GitHub / Google), then open the
          confirmation link sent by email.
        </>,
      ),
      url: 'https://resend.com/signup',
    },
    {
      key: 'apikeys',
      title: L('Ouvrir les clés API', 'Open the API keys'),
      desc: L(
        <>
          <M n={1} /> Dans le menu de gauche, ouvrez <code>API keys</code><br />
          <M n={2} /> Cliquez sur <code>Create API key</code>.
        </>,
        <>
          <M n={1} /> In the left menu, open <code>API keys</code><br />
          <M n={2} /> Click <code>Create API key</code>.
        </>,
      ),
      url: 'https://resend.com/api-keys',
      shots: [{
        src: resendApiKeys,
        alt: L('Page API keys de Resend', 'Resend API keys page'),
      }],
    },
    {
      key: 'create',
      title: L('Créer la clé', 'Create the key'),
      desc: L(
        <>
          <M n={1} /> <code>Name</code> : un nom explicite, par exemple{' '}
          <code>Intriqathon Backend</code><br />
          <M n={2} /> <code>Permission</code> : <code>Full access</code><br />
          <M n={3} /> <code>Domain</code> : laissez <code>All domains</code><br />
          <M n={4} /> Cliquez sur <code>Add</code>.<br />
          Copiez la clé affichée (elle commence par <code>re_</code>) dans le
          champ <strong>Clé API Resend</strong>.
        </>,
        <>
          <M n={1} /> <code>Name</code>: an explicit name, for example{' '}
          <code>Intriqathon Backend</code><br />
          <M n={2} /> <code>Permission</code>: <code>Full access</code><br />
          <M n={3} /> <code>Domain</code>: leave <code>All domains</code><br />
          <M n={4} /> Click <code>Add</code>.<br />
          Copy the key shown (it starts with <code>re_</code>) into the{' '}
          <strong>Resend API Key</strong> field.
        </>,
      ),
      extra: (
        <ul className="help-note">
          <li>
            {L(
              <>
                <strong>Copiez-la immédiatement</strong> : Resend ne l'affiche
                qu'une seule fois.
              </>,
              <>
                <strong>Copy it straight away</strong>: Resend shows it only once.
              </>,
            )}
          </li>
          <li>
            {L(
              <>
                Elle doit être en <strong>Full access</strong> : une clé d'envoi
                seul ne peut ni créer ni vérifier un domaine, et Resend la refuse.
                La carte contrôle la clé dès qu'elle est collée et se grise si
                elle revient refusée.
              </>,
              <>
                It needs <strong>Full access</strong>: a sending-only key cannot
                create or verify a domain, and Resend refuses it. The card checks
                the key as you paste it and greys itself if it comes back refused.
              </>,
            )}
          </li>
        </ul>
      ),
      shots: [{
        src: resendCreate,
        alt: L('Fenêtre Add API Key de Resend', 'Resend Add API Key dialog'),
      }],
    },
    {
      key: 'subdomain',
      title: L('Le sous-domaine d\'envoi', 'The sending subdomain'),
      desc: L(
        <>
          Les emails partent d'un sous-domaine dédié, pré-rempli avec{' '}
          <code>mail.votredomaine</code>. Gardez-le, sauf si ce sous-domaine sert
          déjà à autre chose. Rien à faire dans Resend : l'étape 2 y ajoute le
          domaine et crée ses enregistrements DNS.
        </>,
        <>
          Emails go out from a dedicated subdomain, pre-filled with{' '}
          <code>mail.yourdomain</code>. Keep it, unless that subdomain is already
          used for something else. Nothing to do in Resend: step 2 adds the
          domain there and creates its DNS records.
        </>,
      ),
    },
  ]

  const spaceship: HelpFlowStep[] = [
    {
      key: 'account',
      title: L('Créer un compte Spaceship', 'Create a Spaceship account'),
      desc: L(
        <>Créez un compte sur spaceship.com, puis connectez-vous.</>,
        <>Sign up on spaceship.com, then sign in.</>,
      ),
      url: 'https://www.spaceship.com/auth/',
    },
    {
      key: 'domain',
      title: L('Acheter le domaine', 'Buy the domain'),
      desc: L(
        <>
          Un seul domaine suffit : le site, le panneau admin (
          <code>config.votredomaine</code>) et le sous-domaine mail en découlent.
          Saisissez-le ensuite dans le champ <strong>Nom de domaine</strong>, sans{' '}
          <code>https://</code>.
        </>,
        <>
          One domain is enough: the site, the admin panel (
          <code>config.yourdomain</code>) and the mail subdomain all derive from
          it. Then type it into the <strong>Domain name</strong> field, without{' '}
          <code>https://</code>.
        </>,
      ),
      url: 'https://www.spaceship.com/domain-search/',
      extra: (
        <p className="help-note">
          {L(
            <>
              Domaine déjà acheté ailleurs ? Cochez{' '}
              <strong>J'utiliserai un autre fournisseur</strong> : les
              enregistrements DNS seront alors à créer chez lui, et les étapes
              suivantes ne vous concernent pas.
            </>,
            <>
              Domain bought elsewhere? Tick{' '}
              <strong>I will use another domain provider</strong>: the DNS records
              will then be yours to create there, and the next steps do not apply.
            </>,
          )}
        </p>
      ),
    },
    {
      key: 'launchpad',
      title: L('Ouvrir l\'API Manager', 'Open the API Manager'),
      desc: L(
        <>
          Sur Spaceship, toutes les applications passent par le Launchpad.<br />
          <M n={1} /> Cliquez sur <code>Launchpad</code> dans la barre du haut
          (ou tapez <code>/</code>)<br />
          <M n={2} /> Tapez <code>API Manager</code><br />
          <M n={3} /> Ouvrez l'application <code>API Manager</code>.
        </>,
        <>
          On Spaceship, every app is reached through the Launchpad.<br />
          <M n={1} /> Click <code>Launchpad</code> in the top bar (or type{' '}
          <code>/</code>)<br />
          <M n={2} /> Type <code>API Manager</code><br />
          <M n={3} /> Open the <code>API Manager</code> app.
        </>,
      ),
      url: 'https://www.spaceship.com/application/api-manager/',
      linkLabel: 'API Manager',
      shots: [{
        src: spaceshipLaunchpad,
        alt: L('Launchpad de Spaceship', 'Spaceship Launchpad'),
      }],
    },
    {
      key: 'newkey',
      title: 'New API key',
      desc: L(
        <>
          <M n={1} /> Vérifiez que <code>API access</code> est{' '}
          <code>ENABLED</code> — sinon activez-le<br />
          <M n={2} /> Cliquez sur <code>New API key</code>.
        </>,
        <>
          <M n={1} /> Check that <code>API access</code> reads{' '}
          <code>ENABLED</code> — turn it on otherwise<br />
          <M n={2} /> Click <code>New API key</code>.
        </>,
      ),
      shots: [{
        src: spaceshipApiManager,
        alt: L('Page API Manager de Spaceship', 'Spaceship API Manager page'),
      }],
    },
    {
      key: 'create',
      title: L('Créer la clé et son secret', 'Create the key and its secret'),
      desc: L(
        <>
          <M n={1} /> <code>API key name</code> : par exemple{' '}
          <code>intriqathon</code><br />
          <M n={2} /> Laissez <code>Full access</code> sélectionné<br />
          <M n={3} /> Cliquez sur <code>Create API key</code>, acceptez les
          conditions.<br />
          Copiez la clé dans <strong>API Key</strong> et le secret dans{' '}
          <strong>API Secret</strong>.
        </>,
        <>
          <M n={1} /> <code>API key name</code>: for example{' '}
          <code>intriqathon</code><br />
          <M n={2} /> Keep <code>Full access</code> selected<br />
          <M n={3} /> Click <code>Create API key</code>, accept the terms.<br />
          Copy the key into <strong>API Key</strong> and the secret into{' '}
          <strong>API Secret</strong>.
        </>,
      ),
      extra: (
        <ul className="help-note">
          <li>
            {L(
              <>
                <strong>Le secret n'est affiché qu'une seule fois.</strong> Perdu ?
                Bouton <code>Add secret</code> sous la clé pour en créer un autre.
              </>,
              <>
                <strong>The secret is shown only once.</strong> Lost it? The{' '}
                <code>Add secret</code> button under the key creates another.
              </>,
            )}
          </li>
          <li>
            {L(
              <>
                En <code>Custom access</code>, activez au minimum{' '}
                <strong>domains:read</strong>, <strong>dnsrecords:read</strong> et{' '}
                <strong>dnsrecords:write</strong> — sans eux, les enregistrements
                DNS ne peuvent pas être créés automatiquement.
              </>,
              <>
                With <code>Custom access</code>, enable at least{' '}
                <strong>domains:read</strong>, <strong>dnsrecords:read</strong> and{' '}
                <strong>dnsrecords:write</strong> — without them the DNS records
                cannot be created for you.
              </>,
            )}
          </li>
          <li>
            {L(
              <>
                La carte <strong>contrôle la clé et le secret ensemble</strong> :
                tant que les deux ne sont pas collés, elle ne dit rien.
              </>,
              <>
                The card <strong>checks the key and the secret together</strong>:
                until both are pasted, it says nothing.
              </>,
            )}
          </li>
        </ul>
      ),
      shots: [{
        src: spaceshipNewKey,
        alt: L('Formulaire Create new API key de Spaceship', 'Spaceship Create new API key form'),
      }],
    },
  ]

  return (
    <>
      <HelpService id="svc-supabase" icon={<Database size={15} />} title="Supabase">
        <p className="help-service__intro">
          {L(
            <>
              La <strong>base de données</strong> de la plateforme, avec
              l'authentification et le stockage des fichiers. Il vous faut un
              compte et un jeton d'accès : le configurateur crée ou reprend le
              projet pour vous.
            </>,
            <>
              The platform's <strong>database</strong>, with authentication and
              file storage. You need an account and an access token: the
              configurator creates or adopts the project for you.
            </>,
          )}
        </p>
        <HelpFlow steps={supabase} />
      </HelpService>

      <HelpService id="svc-scaleway" icon={<Server size={15} />} title="Scaleway">
        <p className="help-service__intro">
          {L(
            <>
              L'hébergeur du <strong>serveur</strong> sur lequel tourne la
              plateforme. L'étape 2 crée ce serveur automatiquement à partir de
              la clé API et du projet renseignés ici.
            </>,
            <>
              The host of the <strong>server</strong> the platform runs on. Step 2
              creates that server automatically from the API key and project
              entered here.
            </>,
          )}
        </p>
        <HelpFlow steps={scaleway} />
      </HelpService>

      <HelpService id="svc-resend" icon={<Mail size={15} />} title="Resend">
        <p className="help-service__intro">
          {L(
            <>
              Le service qui <strong>envoie les emails</strong> : invitations,
              réinitialisation de mot de passe. Une clé API suffit ici ; le
              domaine d'envoi est configuré à l'étape 2.
            </>,
            <>
              The service that <strong>sends the emails</strong>: invitations,
              password resets. An API key is all it takes here; the sending
              domain is set up in step 2.
            </>,
          )}
        </p>
        <HelpFlow steps={resend} />
      </HelpService>

      <HelpService id="svc-spaceship" icon={<Globe size={15} />} title="Spaceship">
        <p className="help-service__intro">
          {L(
            <>
              Le registrar où vous achetez le <strong>nom de domaine</strong>. Sa
              clé API permet à l'étape 2 de créer les enregistrements DNS à votre
              place.
            </>,
            <>
              The registrar where you buy the <strong>domain name</strong>. Its API
              key lets step 2 create the DNS records for you.
            </>,
          )}
        </p>
        <HelpFlow steps={spaceship} />
      </HelpService>
    </>
  )
}
