import { Terminal } from 'lucide-react'
import { WarningDialog } from '../ui/WarningDialog'

interface PreRestartWarningProps {
  isEn: boolean
  onCancel: () => void
  onProceed: () => void
}

/**
 * Shown when the Docker restart is started while the deployment step has
 * neither run nor been ticked off.
 *
 * The restart SSHes into the instance and restarts `discord_bot` — a container
 * the deployment is what puts there. Run before it, the command reaches a
 * server where nothing is installed and fails on a name Docker has never seen,
 * which says nothing about the actual cause.
 */
export function PreRestartWarning({ isEn, onCancel, onProceed }: PreRestartWarningProps) {
  return (
    <WarningDialog
      idPrefix="prerestart"
      title={isEn ? 'The deployment is unfinished' : "Le déploiement n'est pas terminé"}
      intro={isEn
        ? 'Restarting Docker connects to the instance and restarts the containers the deployment installs there:'
        : "Le redémarrage Docker se connecte à l'instance et relance les conteneurs que le déploiement y installe :"}
      items={[
        {
          key: 'deploy',
          chip: isEn ? 'Step 4' : 'Étape 4',
          label: isEn
            ? 'SSH deployment — neither run nor confirmed'
            : 'Déploiement SSH — ni lancé ni confirmé',
        },
      ]}
      note={isEn
        ? 'Run the deployment first. Started before it, the restart fails on a container that does not exist yet.'
        : "Lancez d'abord le déploiement. Avant lui, le redémarrage échoue sur un conteneur qui n'existe pas encore."}
      cancelLabel={isEn ? 'Go back' : 'Revenir'}
      proceedLabel={isEn ? 'Restart anyway' : 'Redémarrer quand même'}
      proceedIcon={<Terminal size={14} />}
      onCancel={onCancel}
      onProceed={onProceed}
    />
  )
}
