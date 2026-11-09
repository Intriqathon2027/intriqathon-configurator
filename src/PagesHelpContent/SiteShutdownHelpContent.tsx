import { Database, Globe, Mail, Server, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { HelpFlow, type HelpFlowStep } from '../components/ui/HelpFlow'
import { HelpService } from '../components/ui/HelpService'

/**
 * Help for "Arrêt du site". Each block says what the card deletes, what it
 * deliberately leaves behind, and how to do the same by hand from the
 * provider's console — the way out when a key has expired since the hackathon.
 */
export function SiteShutdownHelpContent() {
  const { state, config } = useApp()
  const isEn = state.language === 'en'
  const L = <T,>(fr: T, en: T): T => (isEn ? en : fr)

  const ref = config.SUPABASE_PROJECT_REF
  const usesOtherDomainProvider = config.USE_OTHER_DOMAIN_PROVIDER === 'true'

  const supabase: HelpFlowStep[] = [
    {
      key: 'settings',
      title: L('Ouvrir les réglages du projet', 'Open the project settings'),
      desc: L(
        <>Dans le tableau de bord Supabase, ouvrez le projet puis <code>Project Settings</code> ➔ <code>General</code>.</>,
        <>In the Supabase dashboard, open the project, then <code>Project Settings</code> ➔ <code>General</code>.</>,
      ),
      url: ref
        ? `https://supabase.com/dashboard/project/${ref}/settings/general`
        : 'https://supabase.com/dashboard/projects',
    },
    {
      key: 'delete',
      title: L('Supprimer le projet', 'Delete the project'),
      desc: L(
        <>Tout en bas, section <code>Delete Project</code> : cliquez sur <code>Delete project</code> et confirmez en tapant son nom.</>,
        <>At the very bottom, under <code>Delete Project</code>: click <code>Delete project</code> and confirm by typing its name.</>,
      ),
    },
  ]

  const scaleway: HelpFlowStep[] = [
    {
      key: 'instances',
      title: L('Ouvrir la liste des instances', 'Open the instance list'),
      desc: L(
        <>Console Scaleway ➔ <code>Compute</code> ➔ <code>Instances</code>. Repérez l'instance dont l'IPv4 est{' '}
          <code>{config.IPV4_INSTANCE || '<IPV4_INSTANCE>'}</code>.</>,
        <>Scaleway console ➔ <code>Compute</code> ➔ <code>Instances</code>. Find the instance whose IPv4 is{' '}
          <code>{config.IPV4_INSTANCE || '<IPV4_INSTANCE>'}</code>.</>,
      ),
      url: 'https://console.scaleway.com/instance/servers',
    },
    {
      key: 'delete',
      title: L('Supprimer l\'instance', 'Delete the instance'),
      desc: L(
        <>Menu <code>⋯</code> ➔ <code>Delete</code>. Cochez la suppression des volumes et de l'IP si la console le
          propose.</>,
        <>Menu <code>⋯</code> ➔ <code>Delete</code>. Tick the deletion of volumes and IP if the console offers it.</>,
      ),
    },
  ]

  const resend: HelpFlowStep[] = [
    {
      key: 'domains',
      title: L('Ouvrir les domaines', 'Open the domains'),
      desc: L(
        <>Tableau de bord Resend ➔ <code>Domains</code>, puis ouvrez{' '}
          <code>{config.MAIL_SUBDOMAIN || 'mail.<domaine>'}</code>.</>,
        <>Resend dashboard ➔ <code>Domains</code>, then open{' '}
          <code>{config.MAIL_SUBDOMAIN || 'mail.<domain>'}</code>.</>,
      ),
      url: 'https://resend.com/domains',
    },
    {
      key: 'delete',
      title: L('Supprimer le domaine', 'Delete the domain'),
      desc: L(
        <>En haut à droite, <code>⋯</code> ➔ <code>Delete domain</code>.</>,
        <>Top right, <code>⋯</code> ➔ <code>Delete domain</code>.</>,
      ),
    },
  ]

  const spaceship: HelpFlowStep[] = usesOtherDomainProvider
    ? [
        {
          key: 'registrar',
          title: L('Ouvrir la zone DNS chez votre registrar', 'Open the DNS zone at your registrar'),
          desc: L(
            <>Retirez chaque entrée listée dans la carte, puis cochez la case : le configurateur n'a pas accès à ce
              registrar et ne peut pas le vérifier lui-même.</>,
            <>Remove every record listed in the card, then tick the box: the configurator has no access to that
              registrar and cannot check it for you.</>,
          ),
        },
      ]
    : [
        {
          key: 'dns',
          title: L('Ouvrir la zone DNS', 'Open the DNS zone'),
          desc: L(
            <>Spaceship ➔ <code>Domain List</code> ➔ <code>{config.DOMAIN || '<domaine>'}</code> ➔{' '}
              <code>Advanced DNS</code>.</>,
            <>Spaceship ➔ <code>Domain List</code> ➔ <code>{config.DOMAIN || '<domain>'}</code> ➔{' '}
              <code>Advanced DNS</code>.</>,
          ),
          url: 'https://www.spaceship.com/application/domain-list-application/',
        },
        {
          key: 'remove',
          title: L('Retirer les entrées du déploiement', 'Remove the deployment\'s records'),
          desc: L(
            <>Supprimez les entrées <code>A @</code>, <code>A config</code>, le <code>TXT _dmarc</code> du
              sous-domaine d'envoi et celles ajoutées pour Resend (<code>send</code>, <code>resend._domainkey</code>).</>,
            <>Delete the <code>A @</code> and <code>A config</code> records, the sending subdomain's{' '}
              <code>TXT _dmarc</code> and the ones added for Resend (<code>send</code>,{' '}
              <code>resend._domainkey</code>).</>,
          ),
        },
      ]

  return (
    <>
      <section className="help-section">
        <h3><AlertTriangle size={15} /> {L('Avant de commencer', 'Before you start')}</h3>
        <ul className="help-note">
          <li>
            {L(
              <>Chaque suppression est <strong>définitive</strong>. Exportez ce que vous voulez garder — résultats,
                comptes des participants — avant de supprimer la base Supabase.</>,
              <>Every deletion is <strong>permanent</strong>. Export what you want to keep — results, participant
                accounts — before deleting the Supabase database.</>,
            )}
          </li>
          <li>
            {L(
              <>Une carte ne passe au vert que lorsque le <strong>fournisseur confirme</strong> que la ressource
                n'existe plus. <code>Revérifier</code> repose la question à tous.</>,
              <>A card only turns green once the <strong>provider confirms</strong> the resource no longer exists.{' '}
                <code>Re-check</code> asks all of them again.</>,
            )}
          </li>
          <li>
            {L(
              <>Ordre conseillé : DNS, Resend, Scaleway, puis Supabase. Retirer le DNS en premier évite que le
                domaine pointe vers une IP rendue à Scaleway et réattribuée à quelqu'un d'autre.</>,
              <>Suggested order: DNS, Resend, Scaleway, then Supabase. Removing DNS first keeps the domain from
                pointing at an IP handed back to Scaleway and reassigned to someone else.</>,
            )}
          </li>
        </ul>
      </section>

      <HelpService id="shutdown-spaceship" icon={<Globe size={15} />} title={usesOtherDomainProvider ? 'DNS' : 'Spaceship'}>
        <p className="help-service__intro">
          {usesOtherDomainProvider
            ? L(
                <>Vous gérez le DNS chez un autre registrar : <strong>rien n'est supprimé automatiquement</strong>.</>,
                <>You manage DNS at another registrar: <strong>nothing is removed automatically</strong>.</>,
              )
            : L(
                <>Retire de la zone <strong>uniquement les entrées ajoutées pour le déploiement</strong>. Le nom de
                  domaine reste à vous, et ses autres entrées (boîte mail, autres sites) ne sont pas touchées.
                  L'API Spaceship ne permet pas de supprimer ou de rembourser un domaine.</>,
                <>Removes <strong>only the records added for the deployment</strong> from the zone. The domain name
                  stays yours, and its other records (mailbox, other sites) are left alone. The Spaceship API cannot
                  delete or refund a domain.</>,
              )}
        </p>
        <HelpFlow steps={spaceship} />
      </HelpService>

      <HelpService id="shutdown-resend" icon={<Mail size={15} />} title="Resend">
        <p className="help-service__intro">
          {L(
            <>Retire le <strong>sous-domaine d'envoi</strong> du compte : la plateforme ne peut plus envoyer
              d'emails depuis ce sous-domaine. Le compte Resend et la clé API sont conservés.</>,
            <>Removes the <strong>sending subdomain</strong> from the account: the platform can no longer send
              email from it. The Resend account and API key are kept.</>,
          )}
        </p>
        <HelpFlow steps={resend} />
      </HelpService>

      <HelpService id="shutdown-scaleway" icon={<Server size={15} />} title="Scaleway">
        <p className="help-service__intro">
          {L(
            <>Supprime le <strong>serveur</strong> et ses disques locaux : la plateforme s'arrête et sa
              facturation aussi.</>,
            <>Deletes the <strong>server</strong> and its local disks: the platform stops, and so does its
              billing.</>,
          )}
        </p>
        <ul className="help-note">
          <li>
            {L(
              <>Les <strong>volumes Block Storage</strong> sont seulement détachés, et les <strong>IP
                flexibles</strong> restent sur le compte. Les deux restent facturés : la carte les liste après la
                suppression pour que vous décidiez.</>,
              <><strong>Block Storage volumes</strong> are only detached, and <strong>flexible IPs</strong> stay on
                the account. Both are still billed: the card lists them after the deletion so you can decide.</>,
            )}
          </li>
          <li>
            {L(
              <>Si l'instance n'a pas été créée par le configurateur, elle est retrouvée par son adresse IPv4 dans
                toutes les zones Scaleway.</>,
              <>If the instance was not created by the configurator, it is found by its IPv4 address across every
                Scaleway zone.</>,
            )}
          </li>
        </ul>
        <HelpFlow steps={scaleway} />
      </HelpService>

      <HelpService id="shutdown-supabase" icon={<Database size={15} />} title="Supabase">
        <p className="help-service__intro">
          {L(
            <>Supprime le <strong>projet entier</strong> : base de données, comptes des participants, fichiers.
              À faire en dernier.</>,
            <>Deletes the <strong>whole project</strong>: database, participant accounts, files. Do it last.</>,
          )}
        </p>
        {config.SUPABASE_PROJECT_MODE !== 'create' && (
          <ul className="help-note">
            <li>
              {L(
                <>Ce projet a été <strong>repris</strong> à l'étape 1, pas créé par le configurateur. Assurez-vous
                  qu'il ne sert à rien d'autre avant de le supprimer.</>,
                <>This project was <strong>adopted</strong> in step 1, not created by the configurator. Make sure
                  nothing else uses it before deleting it.</>,
              )}
            </li>
          </ul>
        )}
        <HelpFlow steps={supabase} />
      </HelpService>
    </>
  )
}
