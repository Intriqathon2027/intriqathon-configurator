// ============================================================================
// Contrat IPC — source unique de vérité partagée par main, preload et renderer.
// Toute modification d'un canal se fait ici, jamais dans une chaîne littérale.
// ============================================================================

export const IpcChannel = {
  // ── Système ──────────────────────────────────────────────────────────────
  OpenExternalUrl: 'app:open-external-url',
  GetPlatform: 'app:get-platform',

  // ── Fichiers & configuration ─────────────────────────────────────────────
  OpenFolderDialog: 'config:open-folder-dialog',
  SaveEnvFile: 'config:save-env-file',
  WriteEnvToDir: 'config:write-env-to-dir',
  SaveLocalConfig: 'config:save-local',
  LoadLocalConfig: 'config:load-local',
  ExportConfig: 'config:export',
  ImportConfig: 'config:import',
  SaveRecentConfigs: 'config:save-recent',
  LoadRecentConfigs: 'config:load-recent',
  ReadConfigFile: 'config:read-file',

  // ── Déploiement ──────────────────────────────────────────────────────────
  DeployStart: 'deploy:start',
  DeployRestart: 'deploy:restart',
  DeployCancel: 'deploy:cancel',
  DeployEvent: 'deploy:event',
} as const

// ============================================================================
// Types de payload
// ============================================================================

export interface SshCredentials {
  username: string
  password?: string
}

export interface DeployRequest {
  /** Généré par le renderer AVANT l'appel, pour qu'aucun événement ne puisse
   *  arriver avant que l'appelant connaisse son identifiant. */
  jobId: string
  ipv4: string
  /** Dossier local à envoyer. Uniquement pour un job de type `deploy`. */
  sourceDir?: string
  credentials: SshCredentials
}

export type DeployJobKind = 'deploy' | 'restart'

/** Raison d'arrêt d'un job, interprétable par l'UI sans parser de texte. */
export type DeployFailureReason =
  | 'auth-required'   // identifiants manquants ou refusés → demander le mot de passe
  | 'host-changed'    // empreinte du serveur différente de celle mémorisée
  | 'unreachable'
  | 'busy'            // un autre job est déjà en cours
  | 'invalid-input'
  | 'remote-failure'  // le script distant a renvoyé un code ≠ 0
  | 'cancelled'
  | 'internal'

export interface DeployStartResult {
  accepted: boolean
  reason?: DeployFailureReason
  message?: string
}

/** Tout événement porte son jobId : deux jobs concurrents ne peuvent plus
 *  mélanger leurs sorties dans deux consoles différentes. */
export type DeployEvent =
  | { jobId: string; type: 'stdout'; line: string }
  | { jobId: string; type: 'stderr'; line: string }
  | { jobId: string; type: 'step'; label: string; index: number; total: number }
  | { jobId: string; type: 'done'; exitCode: number }
  | { jobId: string; type: 'failed'; reason: DeployFailureReason; message: string }

export interface RecentConfig {
  name: string
  path: string
  savedAt: string
}

export interface WriteResult {
  success: boolean
  error?: string
}

export interface SavePathResult {
  success: boolean
  path?: string
}
