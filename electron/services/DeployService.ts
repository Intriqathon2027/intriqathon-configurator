// ============================================================================
// Orchestration des jobs de déploiement.
//
// Invariants tenus par ce service :
//  1. Un seul job à la fois (single-flight). Un second départ est refusé
//     explicitement au lieu d'interrompre le premier en silence.
//  2. Chaque événement porte le `jobId` de son job. Deux écrans abonnés au
//     même canal ne peuvent plus mélanger leurs sorties.
//  3. Le nettoyage d'un job ne touche jamais l'état d'un job plus récent :
//     toute écriture sur `current` est conditionnée à l'identité du jobId.
// ============================================================================

import type { BrowserWindow } from 'electron'
import {
  IpcChannel,
  type DeployEvent,
  type DeployFailureReason,
  type DeployJobKind,
  type DeployRequest,
  type DeployStartResult,
} from '../../shared/ipc'
import { KnownHostsStore } from './KnownHostsStore'
import {
  DEPLOY_WEIGHTS,
  PhaseProgress,
  RESTART_WEIGHTS,
  trackInstallProgress,
} from './DeployProgress'
import {
  SessionDisposedError,
  SshAuthError,
  SshHostKeyError,
  SshSession,
  SshTransferError,
  SshUnreachableError,
} from './SshSession'

const REMOTE_DIR = 'hackathon-deploy'
const INSTALL_SCRIPT = 'install_hackathon.sh'
const RESTART_CONTAINER = 'discord_bot'

interface ActiveJob {
  jobId: string
  kind: DeployJobKind
  session: SshSession
  cancelled: boolean
}

export class DeployService {
  private current: ActiveJob | null = null
  private readonly knownHosts: KnownHostsStore

  constructor(knownHosts: KnownHostsStore = new KnownHostsStore()) {
    this.knownHosts = knownHosts
  }

  isRunning(): boolean {
    return this.current !== null
  }

  // ── API publique ─────────────────────────────────────────────────────────

  start(kind: DeployJobKind, request: DeployRequest, win: BrowserWindow): DeployStartResult {
    if (this.current) {
      return {
        accepted: false,
        reason: 'busy',
        message: `Un job est déjà en cours (${this.current.kind}). Annulez-le avant d'en lancer un autre.`,
      }
    }

    const job: ActiveJob = {
      jobId: request.jobId,
      kind,
      session: new SshSession(this.knownHosts),
      cancelled: false,
    }
    this.current = job

    // Le job tourne en tâche de fond : l'invoke IPC répond immédiatement avec
    // l'acceptation, la progression passe par les événements.
    void this.run(job, request, win)

    return { accepted: true }
  }

  /**
   * Annule le job dont l'identifiant est fourni. Sans identifiant, annule le
   * job courant. Un jobId périmé est ignoré — c'est ce qui empêche l'annulation
   * tardive d'un ancien job de tuer celui qui vient de démarrer.
   */
  cancel(jobId?: string): boolean {
    const job = this.current
    if (!job) return false
    if (jobId && job.jobId !== jobId) return false

    job.cancelled = true
    job.session.dispose()
    return true
  }

  // ── Déroulé d'un job ─────────────────────────────────────────────────────

  private async run(job: ActiveJob, request: DeployRequest, win: BrowserWindow): Promise<void> {
    const emit = (event: DeployEvent) => this.emit(win, event)
    const log = (line: string) => emit({ jobId: job.jobId, type: 'stdout', line })
    const progress = new PhaseProgress((percent) => emit({ jobId: job.jobId, type: 'progress', percent }))

    const total = job.kind === 'deploy' ? 4 : 2
    let step = 0
    const nextStep = (label: string, weight: number) => {
      step += 1
      progress.enter(weight)
      emit({ jobId: job.jobId, type: 'step', label, index: step, total })
    }

    try {
      // ── 1. Connexion ────────────────────────────────────────────────────
      const weights = job.kind === 'deploy' ? DEPLOY_WEIGHTS : RESTART_WEIGHTS
      nextStep(`Connexion à ${request.credentials.username}@${request.ipv4}`, weights.connect)
      await job.session.connect({
        host: request.ipv4,
        username: request.credentials.username,
        password: request.credentials.password,
        onLog: log,
      })
      log('Connexion établie')
      progress.advance(1)

      if (job.kind === 'deploy') {
        await this.runDeploy(job, request, nextStep, log, emit, progress)
      } else {
        await this.runRestart(job, nextStep, log, emit, progress)
      }
    } catch (error) {
      if (job.cancelled || error instanceof SessionDisposedError) {
        emit({ jobId: job.jobId, type: 'failed', reason: 'cancelled', message: 'Job annulé' })
      } else {
        emit({ jobId: job.jobId, type: 'failed', ...classify(error) })
      }
    } finally {
      job.session.dispose()
      // Ne libère le créneau que si ce job est toujours le job courant.
      if (this.current?.jobId === job.jobId) {
        this.current = null
      }
    }
  }

  private async runDeploy(
    job: ActiveJob,
    request: DeployRequest,
    nextStep: (label: string, weight: number) => void,
    log: (line: string) => void,
    emit: (event: DeployEvent) => void,
    progress: PhaseProgress,
  ): Promise<void> {
    if (!request.sourceDir) {
      throw new Error('Dossier source manquant')
    }

    // ── 2. Envoi des fichiers ─────────────────────────────────────────────
    nextStep('Envoi des fichiers vers le serveur', DEPLOY_WEIGHTS.upload)
    let lastLogged = -1
    const count = await job.session.uploadDirectory(request.sourceDir, REMOTE_DIR, (relative, index, fileTotal) => {
      progress.advance(index / fileTotal)
      const percent = Math.floor((index / fileTotal) * 100)
      // Une ligne par tranche de 10 % plutôt qu'une ligne par fichier.
      if (percent >= lastLogged + 10 || index === fileTotal) {
        lastLogged = percent
        log(`  ${percent}% — ${relative} (${index}/${fileTotal})`)
      }
    })
    log(`${count} fichier(s) transféré(s) vers ~/${REMOTE_DIR}`)

    // ── 3. Préparation du script distant ──────────────────────────────────
    nextStep('Préparation du script d\'installation', DEPLOY_WEIGHTS.prepare)
    const prepareErrors: string[] = []
    const prepare = await job.session.exec(
      `cd ${REMOTE_DIR} && sed -i 's/\\r$//' ${INSTALL_SCRIPT} && chmod +x ${INSTALL_SCRIPT}`,
      {
        onStdout: log,
        onStderr: (line) => { prepareErrors.push(line); emit({ jobId: job.jobId, type: 'stderr', line }) },
      },
    )
    if (prepare !== 0) {
      throw new RemoteFailure(
        `La préparation de ${INSTALL_SCRIPT} a échoué sur le serveur`,
        prepare,
        prepareErrors,
      )
    }
    progress.advance(1)

    // ── 4. Installation ───────────────────────────────────────────────────
    nextStep('Exécution de l\'installation sur le serveur', DEPLOY_WEIGHTS.install)
    const installErrors: string[] = []
    const code = await job.session.exec(`cd ${REMOTE_DIR} && ./${INSTALL_SCRIPT}`, {
      onStdout: (line) => {
        log(line)
        trackInstallProgress(line, progress)
      },
      onStderr: (line) => { installErrors.push(line); emit({ jobId: job.jobId, type: 'stderr', line }) },
    })
    if (code !== 0) {
      throw new RemoteFailure(`${INSTALL_SCRIPT} a échoué sur le serveur`, code, installErrors)
    }

    progress.advance(1)
    emit({ jobId: job.jobId, type: 'done', exitCode: 0 })
  }

  private async runRestart(
    job: ActiveJob,
    nextStep: (label: string, weight: number) => void,
    log: (line: string) => void,
    emit: (event: DeployEvent) => void,
    progress: PhaseProgress,
  ): Promise<void> {
    nextStep(`Redémarrage du conteneur ${RESTART_CONTAINER}`, RESTART_WEIGHTS.restart)
    const errors: string[] = []
    const code = await job.session.exec(`docker restart ${RESTART_CONTAINER}`, {
      onStdout: (line) => { log(line); progress.creep(1, 0.15) },
      onStderr: (line) => { errors.push(line); emit({ jobId: job.jobId, type: 'stderr', line }) },
    })
    if (code !== 0) {
      throw new RemoteFailure(`Le redémarrage du conteneur ${RESTART_CONTAINER} a échoué`, code, errors)
    }
    progress.advance(1)
    emit({ jobId: job.jobId, type: 'done', exitCode: 0 })
  }

  private emit(win: BrowserWindow, event: DeployEvent): void {
    if (win.isDestroyed()) return
    win.webContents.send(IpcChannel.DeployEvent, event)
  }
}

class RemoteFailure extends Error {
  readonly exitCode: number
  readonly stderrLines: string[]

  constructor(message: string, exitCode: number, stderrLines: string[] = []) {
    super(message)
    this.name = 'RemoteFailure'
    this.exitCode = exitCode
    this.stderrLines = stderrLines
  }
}

/**
 * Traduit une exception en événement `failed` exploitable par l'UI :
 * un titre lisible, le détail technique, et une piste de résolution.
 */
function classify(error: unknown): {
  reason: DeployFailureReason
  message: string
  details?: string
  hint?: string
} {
  if (error instanceof SshAuthError) {
    return { reason: 'auth-required', message: error.message }
  }

  if (error instanceof SshHostKeyError) {
    return {
      reason: 'host-changed',
      message: "L'empreinte du serveur ne correspond plus à celle mémorisée",
      details: error.message,
      hint: 'Si le serveur a été réinstallé, supprimez son entrée de known-hosts.json '
        + "dans le dossier de données de l'application. Sinon, ne vous connectez pas.",
    }
  }

  if (error instanceof SshUnreachableError) {
    return {
      reason: 'unreachable',
      message: 'Impossible de joindre le serveur',
      details: error.message,
      hint: "Vérifiez l'adresse IP, que le serveur est démarré, et que le port 22 est ouvert.",
    }
  }

  if (error instanceof SshTransferError) {
    return {
      reason: 'transfer-failed',
      message: error.message,
      details: [
        error.localPath ? `Fichier local : ${error.localPath}` : null,
        `Destination : ~/${error.remotePath}`,
        error.statusCode !== undefined ? `Code SFTP : ${error.statusCode}` : null,
      ].filter(Boolean).join('\n'),
      hint: error.hint,
    }
  }

  if (error instanceof RemoteFailure) {
    return {
      reason: 'remote-failure',
      message: `${error.message} (code ${error.exitCode})`,
      details: error.stderrLines.length > 0
        ? error.stderrLines.slice(-12).join('\n')
        : "Le script distant n'a rien écrit sur sa sortie d'erreur.",
      hint: 'Les lignes ci-dessus viennent du serveur. '
        + `Vous pouvez rejouer l'étape à la main : ssh puis cd ${REMOTE_DIR} && ./${INSTALL_SCRIPT}`,
    }
  }

  return {
    reason: 'internal',
    message: error instanceof Error ? error.message : String(error),
    details: error instanceof Error && error.stack ? error.stack.split('\n').slice(0, 5).join('\n') : undefined,
  }
}
