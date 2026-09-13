import { createPortal } from 'react-dom'
import { AlertTriangle, Rocket, X } from 'lucide-react'
import type { PreDeployGap } from '../../utils/preDeployChecks'

interface PreDeployWarningProps {
  gaps: PreDeployGap[]
  isEn: boolean
  onCancel: () => void
  onProceed: () => void
}

/**
 * Shown when the deployment is started with steps 2 or 3 left unfinished.
 *
 * Deliberately a warning and not a gate: some of these values are legitimately
 * filled in later — a hackathon deployed before its Discord app exists is a
 * real sequence — and a reader who knows that should not have to fake a ticked
 * box to get past this screen. What the dialog owes them is an accurate list
 * and a way through it.
 */
export function PreDeployWarning({ gaps, isEn, onCancel, onProceed }: PreDeployWarningProps) {
  const stepLabel = (step: PreDeployGap['step']) =>
    step === 'api'
      ? (isEn ? 'Step 2' : 'Étape 2')
      : (isEn ? 'Step 3' : 'Étape 3')

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal deploy-dialog">
        <div className="modal-header">
          <div className="modal-title">
            <AlertTriangle size={18} color="var(--color-warning)" />
            {isEn ? 'Some steps are unfinished' : 'Certaines étapes sont incomplètes'}
          </div>
        </div>

        <div className="modal-body">
          <p className="predeploy-warning__intro">
            {isEn
              ? 'The deployment writes the .env from these values. What is missing below will be deployed empty:'
              : "Le déploiement écrit le .env à partir de ces valeurs. Ce qui manque ci-dessous sera déployé vide :"}
          </p>

          <ul className="predeploy-warning__list">
            {gaps.map(gap => (
              <li key={`${gap.step}-${gap.label}`} className="predeploy-warning__item">
                <span className="predeploy-warning__step">{stepLabel(gap.step)}</span>
                <span>{gap.label}</span>
              </li>
            ))}
          </ul>

          <p className="predeploy-warning__note">
            {isEn
              ? 'You can deploy anyway and fill these in later — a second deployment rewrites the .env.'
              : 'Vous pouvez déployer quand même et compléter plus tard — un second déploiement réécrit le .env.'}
          </p>
        </div>

        <div className="deploy-dialog-footer">
          <button className="btn btn-secondary" onClick={onCancel} id="btn-predeploy-cancel">
            <X size={14} />
            {isEn ? 'Go back' : 'Revenir'}
          </button>
          <button className="btn btn-primary" onClick={onProceed} id="btn-predeploy-proceed">
            <Rocket size={14} />
            {isEn ? 'Deploy anyway' : 'Déployer quand même'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
