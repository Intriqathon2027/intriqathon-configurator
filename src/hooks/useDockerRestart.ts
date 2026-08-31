// ============================================================================
// Redémarrage du conteneur Docker distant.
// Même mécanique que le déploiement, sans transfert de fichiers.
// ============================================================================

import { useCallback } from 'react'
import { useSshJob } from './useSshJob'

export interface DockerRestartConfig {
  ipv4: string
}

export function useDockerRestart() {
  const job = useSshJob('restart')
  const { start } = job

  const startRestart = useCallback((config: DockerRestartConfig) => {
    start({ ipv4: config.ipv4 })
  }, [start])

  return { ...job, start: startRestart }
}
