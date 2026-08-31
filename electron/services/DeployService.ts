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
  SessionDisposedError,
  SshAuthError,
  SshHostKeyError,
  SshSession,
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

    const total = job.kind === 'deploy' ? 4 : 2
    let step = 0
    const nextStep = (label: string) => {
      step += 1
      emit({ jobId: job.jobId, type: 'step', label, index: step, total })
    }

    try {
      // ── 1. Connexion ────────────────────────────────────────────────────
      nextStep(`Connexion à ${request.credentials.username}@${request.ipv4}`)
      await job.session.connect({
        host: request.ipv4,
        username: request.credentials.username,
        password: request.credentials.password,
        onLog: log,
      })
      log('Connexion établie')

      if (job.kind === 'deploy') {
        await this.runDeploy(job, request, nextStep, log, emit)
      } else {
        await this.runRestart(job, nextStep, log, emit)
      }
    } catch (error) {
      if (job.cancelled || error instanceof SessionDisposedError) {
        emit({ jobId: job.jobId, type: 'failed', reason: 'cancelled', message: 'Job annulé' })
      } else {
        const { reason, message } = classify(error)
        emit({ jobId: job.jobId, type: 'failed', reason, message })
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
    nextStep: (label: string) => void,
    log: (line: string) => void,
    emit: (event: DeployEvent) => void,
  ): Promise<void> {
    if (!request.sourceDir) {
      throw new Error('Dossier source manquant')
    }

    // ── 2. Envoi des fichiers ─────────────────────────────────────────────
    nextStep('Envoi des fichiers vers le serveur')
    let lastPercent = -1
    const count = await job.session.uploadDirectory(request.sourceDir, REMOTE_DIR, (relative, index, fileTotal) => {
      const percent = Math.floor((index / fileTotal) * 100)
      // Une ligne par tranche de 10 % plutôt qu'une ligne par fichier.
      if (percent >= lastPercent + 10 || index === fileTotal) {
        lastPercent = percent
        log(`  ${percent}% — ${relative}`)
      }
    })
    log(`${count} fichier(s) transféré(s) vers ~/${REMOTE_DIR}`)

    // ── 3. Préparation du script distant ──────────────────────────────────
    nextStep('Préparation du script d\'installation')
    const prepare = await job.session.exec(
      `cd ${REMOTE_DIR} && sed -i 's/\\r$//' ${INSTALL_SCRIPT} && chmod +x ${INSTALL_SCRIPT}`,
      { onStdout: log, onStderr: (line) => emit({ jobId: job.jobId, type: 'stderr', line }) },
    )
    if (prepare !== 0) {
      throw new RemoteFailure(`Préparation du script échouée (code ${prepare})`, prepare)
    }

    // ── 4. Installation ───────────────────────────────────────────────────
    nextStep('Exécution de l\'installation sur le serveur')
    const code = await job.session.exec(`cd ${REMOTE_DIR} && ./${INSTALL_SCRIPT}`, {
      onStdout: log,
      onStderr: (line) => emit({ jobId: job.jobId, type: 'stderr', line }),
    })
    if (code !== 0) {
      throw new RemoteFailure(`L'installation distante a échoué (code ${code})`, code)
    }

    emit({ jobId: job.jobId, type: 'done', exitCode: 0 })
  }

  private async runRestart(
    job: ActiveJob,
    nextStep: (label: string) => void,
    log: (line: string) => void,
    emit: (event: DeployEvent) => void,
  ): Promise<void> {
    nextStep(`Redémarrage du conteneur ${RESTART_CONTAINER}`)
    const code = await job.session.exec(`docker restart ${RESTART_CONTAINER}`, {
      onStdout: log,
      onStderr: (line) => emit({ jobId: job.jobId, type: 'stderr', line }),
    })
    if (code !== 0) {
      throw new RemoteFailure(`Le redémarrage a échoué (code ${code})`, code)
    }
    emit({ jobId: job.jobId, type: 'done', exitCode: 0 })
  }

  private emit(win: BrowserWindow, event: DeployEvent): void {
    if (win.isDestroyed()) return
    win.webContents.send(IpcChannel.DeployEvent, event)
  }
}

class RemoteFailure extends Error {
  readonly exitCode: number

  constructor(message: string, exitCode: number) {
    super(message)
    this.name = 'RemoteFailure'
    this.exitCode = exitCode
  }
}

function classify(error: unknown): { reason: DeployFailureReason; message: string } {
  if (error instanceof SshAuthError) return { reason: 'auth-required', message: error.message }
  if (error instanceof SshHostKeyError) return { reason: 'host-changed', message: error.message }
  if (error instanceof SshUnreachableError) return { reason: 'unreachable', message: error.message }
  if (error instanceof RemoteFailure) return { reason: 'remote-failure', message: error.message }
  return { reason: 'internal', message: error instanceof Error ? error.message : String(error) }
}
