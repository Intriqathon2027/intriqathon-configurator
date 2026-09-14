import { Rocket } from 'lucide-react'
import { WarningDialog } from '../ui/WarningDialog'
import type { PreDeployGap } from '../../utils/preDeployChecks'

interface PreDeployWarningProps {
  gaps: PreDeployGap[]
  isEn: boolean
  onCancel: () => void
  onProceed: () => void
}

/**
 * Shown when the deployment is started with steps 2 or 3 left unfinished:
 * the .env is written from those values, and what is missing ships empty.
 */
export function PreDeployWarning({ gaps, isEn, onCancel, onProceed }: PreDeployWarningProps) {
  const stepLabel = (step: PreDeployGap['step']) =>
    step === 'api'
      ? (isEn ? 'Step 2' : 'Étape 2')
      : (isEn ? 'Step 3' : 'Étape 3')

  return (
    <WarningDialog
      idPrefix="predeploy"
      title={isEn ? 'Some steps are unfinished' : 'Certaines étapes sont incomplètes'}
      intro={isEn
        ? 'The deployment writes the .env from these values. What is missing below will be deployed empty:'
        : "Le déploiement écrit le .env à partir de ces valeurs. Ce qui manque ci-dessous sera déployé vide :"}
      items={gaps.map(gap => ({
        key: `${gap.step}-${gap.label}`,
        chip: stepLabel(gap.step),
        label: gap.label,
      }))}
      note={isEn
        ? 'You can deploy anyway and fill these in later — a second deployment rewrites the .env.'
        : 'Vous pouvez déployer quand même et compléter plus tard — un second déploiement réécrit le .env.'}
      cancelLabel={isEn ? 'Go back' : 'Revenir'}
      proceedLabel={isEn ? 'Deploy anyway' : 'Déployer quand même'}
      proceedIcon={<Rocket size={14} />}
      onCancel={onCancel}
      onProceed={onProceed}
    />
  )
}
