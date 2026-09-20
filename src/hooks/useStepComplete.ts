import { useApp } from '../context/AppContext'
import { useSession } from '../context/SessionContext'
import { steps } from '../components/layout/steps'
import type { CredentialService } from '../types/credentials'

const CREDENTIAL_SERVICES: CredentialService[] = ['supabase', 'scaleway', 'spaceship', 'resend']

/**
 * Whether a wizard step is finished — the rule the sidebar tick is drawn from.
 *
 * It has to answer exactly what the step's own page shows, which is why it
 * cannot live in `AppContext` alone: three of the five steps are carried in
 * part by work that leaves nothing in the config — buckets created at Supabase,
 * DNS records added at Spaceship, a deployment run — and whose only record is a
 * run in this session or a ticked box. A tick drawn from stored state alone
 * reported those steps as done while their cards were still grey, which is
 * precisely what a persisted "step 4 was validated once" flag used to do.
 */
export function useStepComplete(): (step: number) => boolean {
  const { state } = useApp()
  const { isRunDone, isManualChecked, isCredentialRefused } = useSession()

  return (step: number): boolean => {
    const fields = steps[step]?.requiredFields ?? []
    const fieldsFilled = fields.every(key => (state.config[key] ?? '').trim() !== '')

    switch (step) {
      /**
       * Création de comptes — the fields being filled is half of it. A key its
       * own provider refuses is not an account that has been set up, and a
       * tick here would send the reader on to steps whose automations that
       * very key is about to fail.
       */
      case 0:
        return fieldsFilled && !CREDENTIAL_SERVICES.some(isCredentialRefused)

      // Configuration par API — four services, each with a manual half
      case 1: {
        // The automation creates and verifies the buckets; short of that, the
        // checkbox is the only thing that can speak for them.
        const buckets = isRunDone('api-supabase') || isManualChecked('supabase-buckets')
        return fieldsFilled
          && buckets
          && isManualChecked('spaceship-dns')
          && isManualChecked('resend-subdomain')
      }

      // Déploiement SSH — the run, or the box saying it was done by hand
      case 3:
        return isRunDone('deploy') || isManualChecked('deploy-manual')

      // Configuration du site — the settings run, then the bot restart
      case 4: {
        const settings = isRunDone('site-supabase')
          || (isManualChecked('site-supabase-sql') && isManualChecked('site-supabase-actions'))
        const restarted = isRunDone('site-docker') || isManualChecked('docker-manual')
        return settings && restarted
      }

      default:
        return fieldsFilled
    }
  }
}
