import { Database, Globe, Mail, Server } from "lucide-react";
import { useApp } from "../context/AppContext";
import { HelpFlow, type HelpFlowStep } from "../components/ui/HelpFlow";
import { HelpService } from "../components/ui/HelpService";

/**
 * Help for "Arrêt du site". Each block says what the card deletes, what it
 * deliberately leaves behind, and how to do the same by hand from the
 * provider's console — the way out when a key has expired since the hackathon.
 */
export function SiteShutdownHelpContent() {
  const { state, config } = useApp();
  const isEn = state.language === "en";
  const L = <T,>(fr: T, en: T): T => (isEn ? en : fr);

  const ref = config.SUPABASE_PROJECT_REF;
  const usesOtherDomainProvider = config.USE_OTHER_DOMAIN_PROVIDER === "true";

  const supabase: HelpFlowStep[] = [
    {
      key: "settings",
      title: L("Ouvrir les réglages du projet", "Open the project settings"),
      desc: L(
        <>
          Dans le tableau de bord Supabase, ouvrez le projet puis{" "}
          <code>Project Settings</code> ➔ <code>General</code>.
        </>,
        <>
          In the Supabase dashboard, open the project, then{" "}
          <code>Project Settings</code> ➔ <code>General</code>.
        </>,
      ),
      url: ref
        ? `https://supabase.com/dashboard/project/${ref}/settings/general`
        : "https://supabase.com/dashboard/projects",
    },
    {
      key: "delete",
      title: L("Supprimer le projet", "Delete the project"),
      desc: L(
        <>
          Tout en bas, section <code>Delete Project</code> : cliquez sur{" "}
          <code>Delete project</code> et confirmez en tapant son nom.
        </>,
        <>
          At the very bottom, under <code>Delete Project</code>: click{" "}
          <code>Delete project</code> and confirm by typing its name.
        </>,
      ),
    },
  ];

  const scaleway: HelpFlowStep[] = [
    {
      key: "instances",
      title: L("Ouvrir la liste des instances", "Open the instance list"),
      desc: L(
        <>
          Console Scaleway ➔ <code>Compute</code> ➔ <code>Instances</code>.
          Repérez l'instance dont l'IPv4 est{" "}
          <code>{config.IPV4_INSTANCE || "<IPV4_INSTANCE>"}</code>.
        </>,
        <>
          Scaleway console ➔ <code>Compute</code> ➔ <code>Instances</code>. Find
          the instance whose IPv4 is{" "}
          <code>{config.IPV4_INSTANCE || "<IPV4_INSTANCE>"}</code>.
        </>,
      ),
      url: "https://console.scaleway.com/instance/servers",
    },
    {
      key: "delete",
      title: L("Supprimer l'instance", "Delete the instance"),
      desc: L(
        <>
          Menu <code>⋯</code> ➔ <code>Delete</code>, puis confirmez. Les disques
          locaux partent avec l'instance ; les volumes Block Storage et les IP
          flexibles restent — voir les deux étapes suivantes.
        </>,
        <>
          Menu <code>⋯</code> ➔ <code>Delete</code>, then confirm. Local disks
          go with the instance; Block Storage volumes and flexible IPs stay —
          see the next two steps.
        </>,
      ),
    },
    {
      key: "volumes",
      title: L(
        "Supprimer les volumes Block Storage",
        "Delete the Block Storage volumes",
      ),
      desc: L(
        <>
          Les volumes Block Storage sont seulement <strong>détachés</strong> :
          ils gardent leurs données et restent facturés. Juste après la
          suppression de l'instance, une fenêtre de cette page propose de les
          supprimer. Sinon, ou après un rechargement de la page :{" "}
          <code>Storage</code> ➔ <code>Block Storage</code>, repérez les volumes
          au statut <code>Available</code> qui appartenaient à l'instance, puis{" "}
          <code>⋯</code> ➔ <code>Delete</code>.
        </>,
        <>
          Block Storage volumes are only <strong>detached</strong>: they keep
          their data and are still billed. Right after the instance is deleted,
          a dialog on this page offers to delete them. Otherwise, or after the
          page is reloaded: <code>Storage</code> ➔ <code>Block Storage</code>,
          find the volumes in <code>Available</code> status that belonged to the
          instance, then <code>⋯</code> ➔ <code>Delete</code>.
        </>,
      ),
      url: "https://console.scaleway.com/block-storage/volumes",
    },
    {
      key: "ips",
      title: L("Libérer les IP flexibles", "Release the flexible IPs"),
      desc: L(
        <>
          Une IP flexible reste sur le compte, facturée, après la suppression de
          l'instance — la carte les liste si c'est le cas. <code>Compute</code>{" "}
          ➔ <code>Instances</code> ➔ onglet <code>Flexible IPs</code>, puis{" "}
          <code>⋯</code> ➔ <code>Delete</code> sur chacune dont vous n'avez plus
          besoin.
        </>,
        <>
          A flexible IP stays on the account, billed, after the instance is
          deleted — the card lists them when that happens. <code>Compute</code>{" "}
          ➔ <code>Instances</code> ➔ <code>Flexible IPs</code> tab, then{" "}
          <code>⋯</code> ➔ <code>Delete</code> on each one you no longer need.
        </>,
      ),
      url: "https://console.scaleway.com/instance/ips",
    },
  ];

  const resend: HelpFlowStep[] = [
    {
      key: "domains",
      title: L("Ouvrir les domaines", "Open the domains"),
      desc: L(
        <>
          Tableau de bord Resend ➔ <code>Domains</code>, puis ouvrez{" "}
          <code>{config.MAIL_SUBDOMAIN || "mail.<domaine>"}</code>.
        </>,
        <>
          Resend dashboard ➔ <code>Domains</code>, then open{" "}
          <code>{config.MAIL_SUBDOMAIN || "mail.<domain>"}</code>.
        </>,
      ),
      url: "https://resend.com/domains",
    },
    {
      key: "delete",
      title: L("Supprimer le domaine", "Delete the domain"),
      desc: L(
        <>
          En haut à droite, <code>⋯</code> ➔ <code>Delete domain</code>.
        </>,
        <>
          Top right, <code>⋯</code> ➔ <code>Delete domain</code>.
        </>,
      ),
    },
  ];

  const spaceship: HelpFlowStep[] = usesOtherDomainProvider
    ? [
        {
          key: "registrar",
          title: L(
            "Ouvrir la zone DNS chez votre registrar",
            "Open the DNS zone at your registrar",
          ),
          desc: L(
            <>
              Retirez chaque entrée listée dans la carte, puis cochez la case :
              le configurateur n'a pas accès à ce registrar et ne peut pas le
              vérifier lui-même.
            </>,
            <>
              Remove every record listed in the card, then tick the box: the
              configurator has no access to that registrar and cannot check it
              for you.
            </>,
          ),
        },
      ]
    : [
        {
          key: "dns",
          title: L("Ouvrir la zone DNS", "Open the DNS zone"),
          desc: L(
            <>
              Spaceship ➔ <code>Domain List</code> ➔{" "}
              <code>{config.DOMAIN || "<domaine>"}</code> ➔{" "}
              <code>Advanced DNS</code>.
            </>,
            <>
              Spaceship ➔ <code>Domain List</code> ➔{" "}
              <code>{config.DOMAIN || "<domain>"}</code> ➔{" "}
              <code>Advanced DNS</code>.
            </>,
          ),
          url: "https://www.spaceship.com/application/domain-list-application/",
        },
        {
          key: "remove",
          title: L(
            "Retirer les entrées du déploiement",
            "Remove the deployment's records",
          ),
          desc: L(
            <>
              Supprimez les entrées <code>A @</code>, <code>A config</code>, le{" "}
              <code>TXT _dmarc</code> du sous-domaine d'envoi et celles ajoutées
              pour Resend (<code>send</code>, <code>resend._domainkey</code>).
            </>,
            <>
              Delete the <code>A @</code> and <code>A config</code> records, the
              sending subdomain's <code>TXT _dmarc</code> and the ones added for
              Resend (<code>send</code>, <code>resend._domainkey</code>).
            </>,
          ),
        },
      ];

  return (
    <>
      <HelpService
        id="shutdown-spaceship"
        icon={<Globe size={15} />}
        title={usesOtherDomainProvider ? "DNS" : "Spaceship"}
      >
        <p className="help-service__intro">
          {usesOtherDomainProvider
            ? L(
                <>
                  Vous gérez le DNS chez un autre registrar :{" "}
                  <strong>rien n'est supprimé automatiquement</strong>.
                </>,
                <>
                  You manage DNS at another registrar:{" "}
                  <strong>nothing is removed automatically</strong>.
                </>,
              )
            : L(
                <>
                  Retire de la zone{" "}
                  <strong>
                    uniquement les entrées ajoutées pour le déploiement
                  </strong>
                  . Le nom de domaine reste à vous, et ses autres entrées (boîte
                  mail, autres sites) ne sont pas touchées. L'API Spaceship ne
                  permet pas de supprimer ou de rembourser un domaine.
                </>,
                <>
                  Removes{" "}
                  <strong>only the records added for the deployment</strong>{" "}
                  from the zone. The domain name stays yours, and its other
                  records (mailbox, other sites) are left alone. The Spaceship
                  API cannot delete or refund a domain.
                </>,
              )}
        </p>
        <HelpFlow steps={spaceship} />
      </HelpService>

      <HelpService
        id="shutdown-resend"
        icon={<Mail size={15} />}
        title="Resend"
      >
        <p className="help-service__intro">
          {L(
            <>
              Retire le <strong>sous-domaine d'envoi</strong> du compte : la
              plateforme ne peut plus envoyer d'emails depuis ce sous-domaine.
              Le compte Resend et la clé API sont conservés.
            </>,
            <>
              Removes the <strong>sending subdomain</strong> from the account:
              the platform can no longer send email from it. The Resend account
              and API key are kept.
            </>,
          )}
        </p>
        <HelpFlow steps={resend} />
      </HelpService>

      <HelpService
        id="shutdown-scaleway"
        icon={<Server size={15} />}
        title="Scaleway"
      >
        <p className="help-service__intro">
          {L(
            <>
              Supprime le <strong>serveur</strong> et ses disques locaux : la
              plateforme s'arrête et sa facturation aussi.
            </>,
            <>
              Deletes the <strong>server</strong> and its local disks: the
              platform stops, and so does its billing.
            </>,
          )}
        </p>
        <HelpFlow steps={scaleway} />
      </HelpService>

      <HelpService
        id="shutdown-supabase"
        icon={<Database size={15} />}
        title="Supabase"
      >
        <p className="help-service__intro">
          {L(
            <>
              Supprime le <strong>projet entier</strong> : base de données,
              comptes des participants, fichiers. À faire en dernier.
            </>,
            <>
              Deletes the <strong>whole project</strong>: database, participant
              accounts, files. Do it last.
            </>,
          )}
        </p>
        {config.SUPABASE_PROJECT_MODE !== "create" && (
          <ul className="help-note">
            <li>
              {L(
                <>
                  Ce projet a été <strong>repris</strong> à l'étape 1, pas créé
                  par le configurateur. Assurez-vous qu'il ne sert à rien
                  d'autre avant de le supprimer.
                </>,
                <>
                  This project was <strong>adopted</strong> in step 1, not
                  created by the configurator. Make sure nothing else uses it
                  before deleting it.
                </>,
              )}
            </li>
          </ul>
        )}
        <HelpFlow steps={supabase} />
      </HelpService>
    </>
  );
}
