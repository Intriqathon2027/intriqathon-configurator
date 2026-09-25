import { Database, Mail, Globe, Server } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { HelpFlow, type HelpFlowStep } from '../components/ui/HelpFlow'
import { HelpService } from '../components/ui/HelpService'
import { STORAGE_BUCKETS } from '../shared/supabaseBuckets'
import {
  BUCKETS_URL,
  SPACESHIP_LAUNCHPAD_URL,
  SPACESHIP_DNS_HELP_URL,
} from '../shared/apiConfigLinks'

export function ApiConfigurationHelpContent() {
  const { state, config } = useApp();
  const isEn = state.language === "en";
  const domain = config.DOMAIN || "votredomaine.fr";
  const mailSubdomain = config.MAIL_SUBDOMAIN || `mail.${domain}`;
  /** What Spaceship's `Host` field takes: the subdomain without the domain. */
  const mailHost = mailSubdomain.endsWith(`.${domain}`)
    ? mailSubdomain.slice(0, -(domain.length + 1))
    : mailSubdomain;

  const supabase: HelpFlowStep[] = [
    {
      key: "buckets",
      title: isEn
        ? "Create the storage buckets"
        : "Créer les buckets de stockage",
      desc: isEn ? (
        <>
          <code>Storage</code> (left sidebar) ➔ <code>New bucket</code>. The app
          reads and writes <strong>five separate buckets</strong> — create them
          all, exactly with these names.
        </>
      ) : (
        <>
          <code>Storage</code> (barre latérale gauche) ➔ <code>New bucket</code>
          . L'application lit et écrit dans{" "}
          <strong>cinq buckets distincts</strong> — créez-les tous, avec
          exactement ces noms.
        </>
      ),
      url: BUCKETS_URL,
      extra: (
        <p className="help-note">
          {isEn ? (
            <>
              Nothing about a bucket reaches your configuration, so the card
              asks Supabase instead:{" "}
              <strong>the box below ticks itself</strong> once the five exist,
              and unticks if one is renamed or deleted.
            </>
          ) : (
            <>
              Rien d'un bucket n'atterrit dans votre configuration : la carte le
              demande donc à Supabase.{" "}
              <strong>La case ci-dessous se coche d'elle-même</strong> dès que
              les cinq existent, et se décoche si l'un est renommé ou supprimé.
            </>
          )}
        </p>
      ),
      copyValues: STORAGE_BUCKETS.map((b) => ({
        value: b.name,
        note: b.isPublic ? (
          <>
            {isEn ? "tick " : "cochez "}
            <strong>Public bucket</strong> — {isEn ? b.en : b.fr}
          </>
        ) : (
          <>
            {isEn ? "private — " : "privé — "}
            {isEn ? b.en : b.fr}
          </>
        ),
      })),
    },
    {
      key: "connect",
      title: "Connect to your project",
      desc: isEn ? (
        <>
          The <strong>Connect</strong> button in the project header is the
          shortest route to every connection value. <code>App Frameworks</code>{" "}
          holds the Project URL and the anon key; <code>ORMs</code> holds the
          two Postgres URLs.
        </>
      ) : (
        <>
          Le bouton <strong>Connect</strong> de l'en-tête du projet est le
          chemin le plus court vers toutes les valeurs de connexion.{" "}
          <code>App Frameworks</code> contient la Project URL et la clé anon ;{" "}
          <code>ORMs</code> contient les deux URLs Postgres.
        </>
      ),
      url: "https://supabase.com/dashboard/project/_?showConnect=true",
      linkLabel: isEn ? "Open Connect" : "Ouvrir Connect",
      extra: (
        <ul className="help-note">
          <li>
            {isEn ? (
              <>
                <strong>Transaction mode</strong> (port 6543) is DATABASE_URL,{" "}
                <strong>Session mode</strong> (port 5432) is DIRECT_URL.
              </>
            ) : (
              <>
                <strong>Transaction mode</strong> (port 6543) = DATABASE_URL,{" "}
                <strong>Session mode</strong> (port 5432) = DIRECT_URL.
              </>
            )}
          </li>
          <li>
            {isEn ? (
              <>
                Both arrive with a <code>[YOUR-PASSWORD]</code> placeholder —
                replace it with the database password chosen at step 1.
              </>
            ) : (
              <>
                Les deux arrivent avec un <code>[YOUR-PASSWORD]</code> —
                remplacez-le par le mot de passe de base choisi à l'étape 1.
              </>
            )}
          </li>
        </ul>
      ),
    },
    {
      key: "keys",
      title: isEn ? "Copy the API keys" : "Copier les clés API",
      desc: isEn ? (
        <>
          <code>Project Settings</code> ➔ <code>API Keys</code> ➔{" "}
          <code>Legacy API keys</code>. The deployment expects the{" "}
          <strong>JWT-format legacy keys</strong>: copy <code>anon public</code>{" "}
          and <code>service_role</code>.
        </>
      ) : (
        <>
          <code>Project Settings</code> ➔ <code>API Keys</code> ➔{" "}
          <code>Legacy API keys</code>. Le déploiement attend les{" "}
          <strong>clés legacy au format JWT</strong> : copiez{" "}
          <code>anon public</code> et <code>service_role</code>.
        </>
      ),
      url: "https://supabase.com/dashboard/project/_/settings/api-keys",
      extra: (
        <p className="help-note">
          {isEn ? (
            <>
              <strong>service_role bypasses RLS.</strong> It stays on the server
              — never in the browser, never in a commit.
            </>
          ) : (
            <>
              <strong>service_role contourne la RLS.</strong> Elle reste côté
              serveur — jamais dans le navigateur, jamais dans un commit.
            </>
          )}
        </p>
      ),
    },
  ];

  const scaleway: HelpFlowStep[] = [
    {
      key: "create",
      title: "Create an Instance",
      desc: isEn ? (
        <>
          <code>Console</code> ➔ <code>Compute</code> ➔ <code>Instances</code> ➔{" "}
          <code>Create Instance</code>, in the Project whose ID you filled in at
          step 1.
        </>
      ) : (
        <>
          <code>Console</code> ➔ <code>Compute</code> ➔ <code>Instances</code> ➔{" "}
          <code>Create Instance</code>, dans le Projet dont vous avez renseigné
          l'ID à l'étape 1.
        </>
      ),
      url: "https://console.scaleway.com/instance/servers",
    },
    {
      key: "settings",
      title: isEn
        ? "Set the mandatory options"
        : "Renseigner les options obligatoires",
      desc: isEn
        ? "The whole stack runs on this single machine — size it accordingly."
        : "Toute la stack tourne sur cette seule machine — dimensionnez-la en conséquence.",
      extra: (
        <ul className="help-note">
          <li>
            <strong>Image :</strong> Ubuntu 24.04 LTS
          </li>
          <li>
            <strong>{isEn ? "Specs" : "Ressources"} :</strong>{" "}
            {isEn ? "at least" : "au minimum"} 4 vCPU / 16 {isEn ? "GB" : "Go"}{" "}
            RAM
          </li>
          <li>
            <strong>{isEn ? "Storage" : "Stockage"} :</strong> block storage 10{" "}
            {isEn ? "GB" : "Go"}+
          </li>
          <li>
            <strong>{isEn ? "Network" : "Réseau"} :</strong>{" "}
            {isEn ? "enable a public IPv4" : "activer une IPv4 publique"}
          </li>
          <li>
            <strong>{isEn ? "Security" : "Sécurité"} :</strong>{" "}
            {isEn
              ? "add your SSH public key"
              : "ajouter votre clé publique SSH"}
          </li>
        </ul>
      ),
      copyValues: [
        {
          value: "cat ~/.ssh/id_ed25519.pub",
          note: isEn ? "prints your public key" : "affiche votre clé publique",
        },
      ],
    },
    {
      key: "ipv4",
      title: isEn ? "Copy the public IPv4" : "Copier l'IPv4 publique",
      desc: isEn ? (
        <>
          <code>Instances</code> ➔ your instance ➔ <code>Overview</code>. Every
          DNS A record points at it, and the deployment SSHes into it.
        </>
      ) : (
        <>
          <code>Instances</code> ➔ votre instance ➔ <code>Overview</code>. Tous
          les enregistrements DNS A pointent dessus, et c'est là que le
          déploiement se connecte en SSH.
        </>
      ),
      url: "https://console.scaleway.com/instance/servers",
      extra: (
        <p className="help-note">
          {isEn ? (
            <>
              An address typed here names no server on its own, so the card
              looks for it among your instances and{" "}
              <strong>ticks the box below when it finds one</strong>. It never
              unticks it: the search covers the zone this app creates instances
              in, and yours may live elsewhere.
            </>
          ) : (
            <>
              Une adresse saisie ici ne désigne aucun serveur par elle-même : la
              carte la cherche parmi vos instances et{" "}
              <strong>coche la case ci-dessous si elle la trouve</strong>. Elle
              ne la décoche jamais : la recherche porte sur la zone où cette
              application crée ses instances, et la vôtre peut être ailleurs.
            </>
          )}
        </p>
      ),
    },
  ];

  const resend: HelpFlowStep[] = [
    {
      key: "add",
      title: isEn ? "Add the sending domain" : "Ajouter le domaine d'envoi",
      desc: isEn ? (
        <>
          <code>Domains</code> (left menu) ➔ <code>Add Domain</code>. Use a
          dedicated subdomain, and pick the region closest to your participants.
        </>
      ) : (
        <>
          <code>Domains</code> (menu gauche) ➔ <code>Add Domain</code>. Utilisez
          un sous-domaine dédié, et choisissez la région la plus proche de vos
          participants.
        </>
      ),
      url: "https://resend.com/domains",
      copyValues: [
        {
          value: mailSubdomain,
          note: isEn ? "sending subdomain" : "sous-domaine d'envoi",
        },
      ],
    },
    {
      key: "records",
      title: isEn
        ? "Publish the records it asks for"
        : "Publier les enregistrements demandés",
      desc: isEn ? (
        <>
          Resend asks for one MX and several TXT records (DKIM, SPF), which only
          exist once the domain does — the DKIM key is minted with it. When
          Spaceship holds the zone,{" "}
          <strong>the run publishes them itself</strong>. At any other registrar
          it stops once they are known, and they appear in the{" "}
          <strong>step 4 table</strong> alongside the deployment's own records,
          to be copied across.
        </>
      ) : (
        <>
          Resend demande un enregistrement MX et des TXT (DKIM, SPF), qui
          n'existent qu'une fois le domaine créé — la clé DKIM est générée avec
          lui. Quand Spaceship détient la zone,{" "}
          <strong>l'automatisation les publie elle-même</strong>. Chez un autre
          registrar, elle s'arrête une fois qu'ils sont connus, et ils
          apparaissent dans le <strong>tableau de l'étape 4</strong> avec ceux
          du déploiement, à recopier.
        </>
      ),
      extra: (
        <ul className="help-note">
          <li>
            {isEn ? (
              <>
                The <code>Host</code> field takes the name without the domain:{" "}
                <code>{mailSubdomain}</code> is written{" "}
                <code>{mailHost}</code>. The table already shows them that way.
              </>
            ) : (
              <>
                Le champ <code>Host</code> attend le nom sans le domaine :{" "}
                <code>{mailSubdomain}</code> s'écrit <code>{mailHost}</code>. Le
                tableau les affiche déjà sous cette forme.
              </>
            )}
          </li>
          <li>
            {isEn ? (
              <>
                Added the subdomain at Resend a moment ago?{" "}
                <strong>Refresh from Resend</strong> (step 4) reads its records
                back — nothing here can guess a DKIM key.
              </>
            ) : (
              <>
                Sous-domaine ajouté à l'instant chez Resend ?{" "}
                <strong>Actualiser depuis Resend</strong> (étape 4) relit ses
                enregistrements — rien ici ne peut deviner une clé DKIM.
              </>
            )}
          </li>
        </ul>
      ),
    },
    {
      key: "verify",
      title: isEn ? "Verify the domain" : "Vérifier le domaine",
      desc: isEn ? (
        <>
          Resend's dashboard checks on its own schedule, with no button to ask
          it sooner — a domain can sit at <code>Pending</code> for hours.{" "}
          <strong>Re-check Resend verification</strong>, in step 4's manual
          configuration, asks for the check now.{" "}
          <strong>Until the domain turns Verified, every send fails.</strong>
        </>
      ) : (
        <>
          Le tableau de bord Resend vérifie de lui-même, à son rythme, sans
          bouton pour le presser — un domaine peut rester <code>Pending</code>{" "}
          des heures. <strong>Relancer la vérification Resend</strong>, dans la
          configuration manuelle de l'étape 4, demande le contrôle tout de
          suite.{" "}
          <strong>
            Tant que le domaine n'est pas Verified, les envois échouent.
          </strong>
        </>
      ),
      url: "https://resend.com/domains",
      extra: (
        <p className="help-note">
          {isEn ? (
            <>
              The run does not wait for it: once the records are published and
              the check requested, <strong>the step is finished</strong> and the
              card says propagation is under way. DNS can take up to fifteen
              minutes — carry on with the next step and come back to it.
            </>
          ) : (
            <>
              L'automatisation ne l'attend pas : une fois les enregistrements
              publiés et le contrôle demandé,{" "}
              <strong>l'étape est terminée</strong> et la carte indique que la
              propagation est en cours. Le DNS peut prendre jusqu'à quinze
              minutes — passez à la suite et revenez-y.
            </>
          )}
        </p>
      ),
    },
  ];

  const spaceship: HelpFlowStep[] = [
    {
      key: "launchpad",
      title: isEn ? "Open Advanced DNS" : "Ouvrir Advanced DNS",
      desc: isEn ? (
        <>
          On Spaceship, DNS is{" "}
          <strong>an app of its own, not a tab inside a domain's page</strong>.
          Open the <code>Launchpad</code> (top bar, or <code>/</code> /{" "}
          <code>⌘ K</code>) and type <code>Advanced DNS</code>.
        </>
      ) : (
        <>
          Chez Spaceship, le DNS est{" "}
          <strong>
            une application à part, pas un onglet dans la page d'un domaine
          </strong>
          . Ouvrez le <code>Launchpad</code> (barre du haut, ou <code>/</code> /{" "}
          <code>⌘ K</code>) et tapez <code>Advanced DNS</code>.
        </>
      ),
      url: SPACESHIP_LAUNCHPAD_URL,
      linkLabel: "Launchpad",
    },
    {
      key: "dns",
      title: isEn
        ? "Pick the domain and open its records"
        : "Choisir le domaine et ouvrir ses enregistrements",
      desc: isEn ? (
        <>
          Select <code>{domain}</code>, then <code>DNS records</code> ➔{" "}
          <code>Custom records</code> ➔ <code>Add record</code>. Each row is
          saved with <code>Add</code>.
        </>
      ) : (
        <>
          Sélectionnez <code>{domain}</code>, puis <code>DNS records</code> ➔{" "}
          <code>Custom records</code> ➔ <code>Add record</code>. Chaque ligne se
          valide avec <code>Add</code>.
        </>
      ),
      url: SPACESHIP_DNS_HELP_URL,
      linkLabel: isEn ? "Spaceship DNS help" : "Aide DNS Spaceship",
      extra: (
        <p className="help-note">
          {isEn ? (
            <>
              <strong>
                Custom nameservers (Cloudflare and the like) override this.
              </strong>{" "}
              If the domain uses them, the records belong there, not here.
            </>
          ) : (
            <>
              <strong>
                Des serveurs de noms personnalisés (Cloudflare et consorts)
                priment.
              </strong>{" "}
              Si le domaine en utilise, c'est là qu'il faut créer les
              enregistrements.
            </>
          )}
        </p>
      ),
    },
    {
      key: "records",
      title: isEn ? "Add the DNS records" : "Ajouter les enregistrements DNS",
      desc: isEn ? (
        <>
          Two A records pointing at the Scaleway IPv4 — the site and the admin
          panel — plus Resend's MX and TXT records, all in the same table. The{" "}
          <code>Host</code> field takes the name{" "}
          <strong>without the domain</strong>.
        </>
      ) : (
        <>
          Deux enregistrements A vers l'IPv4 Scaleway — le site et le panneau
          admin — plus les enregistrements MX et TXT de Resend, réunis dans le
          même tableau. Le champ <code>Host</code> attend le nom{" "}
          <strong>sans le domaine</strong>.
        </>
      ),
      copyValues: [
        {
          value: "@",
          note: isEn ? "A record — the site" : "Enregistrement A — le site",
        },
        {
          value: "config",
          note: isEn
            ? "A record — the admin panel"
            : "Enregistrement A — le panneau d'administration",
        },
      ],
      extra: (
        <ul className="help-note">
          <li>
            {isEn ? (
              <>
                Typing <code>config.{domain}</code> there would create{" "}
                <code>
                  config.{domain}.{domain}
                </code>
                .
              </>
            ) : (
              <>
                Saisir <code>config.{domain}</code> ici créerait{" "}
                <code>
                  config.{domain}.{domain}
                </code>
                .
              </>
            )}
          </li>
          <li>
            {isEn ? (
              <>
                Propagation takes a few minutes;{" "}
                <strong>
                  HTTPS certificates are only issued once the A records resolve
                </strong>
                .
              </>
            ) : (
              <>
                La propagation prend quelques minutes ;{" "}
                <strong>
                  les certificats HTTPS ne sont émis qu'une fois les
                  enregistrements A résolus
                </strong>
                .
              </>
            )}
          </li>
          <li>
            {isEn ? (
              <>
                The run reads the zone back afterwards, Resend's records
                included: <strong>anything missing is published again</strong>,
                and the box below is ticked or unticked from what it found.
              </>
            ) : (
              <>
                L'automatisation relit ensuite la zone, enregistrements Resend
                compris : <strong>ce qui manque est republié</strong>, et la
                case ci-dessous est cochée ou décochée selon ce qu'elle y
                trouve.
              </>
            )}
          </li>
        </ul>
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
