// ============================================================================
// Déploiement complet (envoi des fichiers + installation distante).
// Fine couche au-dessus de useSshJob, qui porte toute la mécanique.
// ============================================================================

import { useCallback } from 'react'
import { useSshJob, type SshJobInput } from './useSshJob'

export type {
  JobStatus as DeploymentStatus,
  JobLogEntry as DeployLogEntry,
  DialogData,
  DialogResponse,
  AuthDialogData,
  ConfirmDialogData,
  ChoiceDialogData,
} from './useSshJob'

export interface DeploymentConfig {
  deployPath: string
  ipv4: string
  domain: string
  envContent: string
}

export function useDeployment() {
  const job = useSshJob('deploy')
  const { start } = job

  const startDeployment = useCallback((config: DeploymentConfig) => {
    const input: SshJobInput = {
      ipv4: config.ipv4,
      sourceDir: config.deployPath,
      envContent: config.envContent,
    }
    start(input)
  }, [start])

  return { ...job, start: startDeployment }
}
