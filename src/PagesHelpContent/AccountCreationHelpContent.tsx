import { Database, Mail, Globe, Server } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { HelpFlow, type HelpFlowStep } from '../components/ui/HelpFlow'
import { HelpService } from '../components/ui/HelpService'

export function AccountCreationHelpContent() {
  const { state } = useApp();
  const isEn = state.language === "en";

  const supabase: HelpFlowStep[] = [
    {
      key: "account",
      title: isEn ? "Create a Supabase account" : "Créer un compte Supabase",
      desc: isEn
        ? "Sign up on supabase.com — GitHub sign-in is the quickest route."
        : "Inscrivez-vous sur supabase.com — la connexion via GitHub est la voie la plus rapide.",
      url: "https://supabase.com/dashboard/sign-up",
    },
    {
      key: "pat",
      title: isEn ? "Generate an access token" : "Générer un jeton d'accès",
      desc: isEn ? (
        <>
          Profile icon (top right) ➔ <code>Account</code> ➔{" "}
          <code>Access Tokens</code> ➔ <code>Generate new token</code>.{" "}
          <strong>Copy the value straight away</strong> — it is shown only once.
        </>
      ) : (
        <>
          Icône de profil (haut droite) ➔ <code>Account</code> ➔{" "}
          <code>Access Tokens</code> ➔ <code>Generate new token</code>.{" "}
          <strong>Copiez la valeur immédiatement</strong> — elle n'est affichée
          qu'une seule fois.
        </>
      ),
      url: "https://supabase.com/dashboard/account/tokens",
      extra: (
        <ul className="help-note">
          <li>
            {isEn ? (
              <>
                The token carries <strong>full access to the account</strong> —
                every organization, every project. Keep it in this vault and
                nowhere else.
              </>
            ) : (
              <>
                Le jeton donne un <strong>accès complet au compte</strong> —
                toutes les organisations, tous les projets. Conservez-le dans ce
                coffre et nulle part ailleurs.
              </>
            )}
          </li>
          <li>
            {isEn ? (
              <>
                Generating a new one <strong>revokes the previous one</strong>,
                so an older value pasted here comes back refused — the card
                stays grey and step 2 keeps its button locked.
              </>
            ) : (
              <>
                En générer un nouveau <strong>révoque le précédent</strong> :
                une ancienne valeur collée ici revient refusée — la carte reste
                grise et l'étape 2 garde son bouton verrouillé.
              </>
            )}
          </li>
        </ul>
      ),
    },
  ];

  const scaleway: HelpFlowStep[] = [
    {
      key: "account",
      title: isEn ? "Create a Scaleway account" : "Créer un compte Scaleway",
      desc: isEn
        ? "Sign up on console.scaleway.com and confirm your email."
        : "Inscrivez-vous sur console.scaleway.com et confirmez votre email.",
      url: "https://console.scaleway.com/register",
      extra: (
        <p className="help-note">
          {isEn ? (
            <>
              <strong>Add a payment method</strong> during onboarding, or via{" "}
              <code>Billing</code> ➔ <code>Payment and billing</code>. Without
              it, step 2 cannot create the instance.
            </>
          ) : (
            <>
              <strong>Ajoutez un moyen de paiement</strong> pendant
              l'onboarding, ou via <code>Billing</code> ➔{" "}
              <code>Payment and billing</code>. Sans lui, l'étape 2 ne peut pas
              créer l'instance.
            </>
          )}
        </p>
      ),
    },
    {
      key: "apikey",
      title: isEn ? "Generate an API key" : "Générer une clé API",
      desc: isEn ? (
        <>
          Profile menu (top right) ➔ <code>IAM &amp; API keys</code> ➔{" "}
          <code>API keys</code> tab ➔ <code>Generate API key</code>.
        </>
      ) : (
        <>
          Menu de profil (haut droite) ➔ <code>IAM &amp; API keys</code> ➔
          onglet <code>API keys</code> ➔ <code>Generate API key</code>.
        </>
      ),
      url: "https://console.scaleway.com/iam/api-keys",
    },
    {
      key: "project",
      title: isEn ? "Copy the Project ID" : "Copier le Project ID",
      desc: isEn ? (
        <>
          <code>Organization</code> ➔ <code>Projects</code> ➔ your project. The
          instance will be created inside it.
        </>
      ) : (
        <>
          <code>Organization</code> ➔ <code>Projects</code> ➔ votre projet.
          C'est là que l'instance sera créée.
        </>
      ),
      url: "https://console.scaleway.com/organization/projects",
      extra: (
        <p className="help-note">
          {isEn ? (
            <>
              Only the <strong>secret key</strong> is checked against Scaleway.
              A Project ID that does not exist is a different mistake, and the
              step 2 run names it with the context that makes it fixable.
            </>
          ) : (
            <>
              Seule la <strong>clé secrète</strong> est contrôlée auprès de
              Scaleway. Un Project ID inexistant est une autre erreur, que
              l'automatisation de l'étape 2 signale avec le contexte qui permet
              de la corriger.
            </>
          )}
        </p>
      ),
    },
  ];

  const resend: HelpFlowStep[] = [
    {
      key: "account",
      title: isEn ? "Create a Resend account" : "Créer un compte Resend",
      desc: isEn
        ? "Sign up on resend.com and confirm the verification email."
        : "Inscrivez-vous sur resend.com et validez l'email de vérification.",
      url: "https://resend.com/signup",
    },
    {
      key: "key",
      title: isEn ? "Create an API key" : "Créer une clé API",
      desc: isEn ? (
        <>
          <code>API Keys</code> (left menu) ➔ <code>Create API Key</code>. Full
          access is enough; the sending domain is added in step 2.
        </>
      ) : (
        <>
          <code>API Keys</code> (menu gauche) ➔ <code>Create API Key</code>.
          L'accès complet suffit ; le domaine d'envoi s'ajoute à l'étape 2.
        </>
      ),
      url: "https://resend.com/api-keys",
      extra: (
        <p className="help-note">
          {isEn ? (
            <>
              It needs <strong>Full access</strong>: a sending-only key cannot
              create or verify a domain, and Resend refuses it. The card checks
              the key as you paste it and greys itself if it comes back refused.
            </>
          ) : (
            <>
              Elle doit être en <strong>Full access</strong> : une clé d'envoi
              seul ne peut ni créer ni vérifier un domaine, et Resend la refuse.
              La carte contrôle la clé dès qu'elle est collée et se grise si
              elle revient refusée.
            </>
          )}
        </p>
      ),
    },
  ];

  const spaceship: HelpFlowStep[] = [
    {
      key: "account",
      title: isEn ? "Create a Spaceship account" : "Créer un compte Spaceship",
      desc: isEn
        ? "Sign up on spaceship.com, then sign in."
        : "Créez un compte sur spaceship.com, puis connectez-vous.",
      url: "https://www.spaceship.com/auth/",
    },
    {
      key: "domain",
      title: isEn ? "Buy the domain" : "Acheter le domaine",
      desc: isEn
        ? "One domain is enough: the site, the admin panel (config.yourdomain) and the mail subdomain all derive from it."
        : "Un seul domaine suffit : le site, le panneau admin (config.votredomaine) et le sous-domaine mail en découlent.",
      url: "https://www.spaceship.com/domain-search/",
    },
    {
      key: "launchpad",
      title: "Launchpad",
      desc: isEn ? (
        <>
          Spaceship's app launcher —{" "}
          <strong>everything else is reached through it</strong>. The{" "}
          <code>Launchpad</code> button in the top bar, or <code>/</code> /{" "}
          <code>⌘ K</code>, then type the app's name.
        </>
      ) : (
        <>
          Le lanceur d'applications de Spaceship —{" "}
          <strong>tout le reste passe par lui</strong>. Bouton{" "}
          <code>Launchpad</code> dans la barre du haut, ou <code>/</code> /{" "}
          <code>⌘ K</code>, puis tapez le nom de l'app.
        </>
      ),
      url: "https://www.spaceship.com/application/launchpad/",
      linkLabel: "Launchpad",
    },
    {
      key: "apikey",
      title: "API Manager ➔ New API key",
      desc: isEn ? (
        <>
          <code>Launchpad</code> ➔ <code>API Manager</code> ➔{" "}
          <code>New API key</code>. Accept the terms, then copy the key and its
          secret — the secret is shown only once.
        </>
      ) : (
        <>
          <code>Launchpad</code> ➔ <code>API Manager</code> ➔{" "}
          <code>New API key</code>. Acceptez les conditions, puis copiez la clé
          et son secret — le secret n'est affiché qu'une seule fois.
        </>
      ),
      url: "https://www.spaceship.com/application/api-manager/",
      extra: (
        <p className="help-note">
          {isEn ? (
            <>
              Enable at least the <strong>domains:read</strong>,{" "}
              <strong>dnsrecords:read</strong> and{" "}
              <strong>dnsrecords:write</strong> scopes — without them the DNS
              records cannot be created for you. The card
              <strong> checks the key and the secret together</strong>: until
              both are pasted, it says nothing.
            </>
          ) : (
            <>
              Activez au minimum les scopes <strong>domains:read</strong>,{" "}
              <strong>dnsrecords:read</strong> et{" "}
              <strong>dnsrecords:write</strong> — sans eux, les enregistrements
              DNS ne peuvent pas être créés automatiquement. La carte
              <strong> contrôle la clé et le secret ensemble</strong> : tant que
              les deux ne sont pas collés, elle ne dit rien.
            </>
          )}
        </p>
      ),
    },
  ];

  return (
    <>
      <HelpService
        id="svc-supabase"
        icon={<Database size={15} />}
        title="Supabase"
      >
        <HelpFlow steps={supabase} />
      </HelpService>

      <HelpService
        id="svc-scaleway"
        icon={<Server size={15} />}
        title="Scaleway"
      >
        <HelpFlow steps={scaleway} />
      </HelpService>

      <HelpService id="svc-resend" icon={<Mail size={15} />} title="Resend">
        <HelpFlow steps={resend} />
      </HelpService>

      <HelpService
        id="svc-spaceship"
        icon={<Globe size={15} />}
        title="Spaceship"
      >
        <HelpFlow steps={spaceship} />
      </HelpService>
    </>
  );
}
