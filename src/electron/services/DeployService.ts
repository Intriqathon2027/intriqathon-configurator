import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import type { BrowserWindow } from 'electron'
import { PlatformService } from './PlatformService'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** How long to wait for the instance's SSH port before giving up. */
const SSH_WAIT_TIMEOUT_MS = 3 * 60 * 1000
const SSH_PROBE_INTERVAL_MS = 3000
const SSH_PROBE_TIMEOUT_MS = 3000

/**
 * Whether something accepts TCP connections on `host:port` — the same check
 * as `nc -vz`. No SSH handshake: a listening sshd is all the script needs.
 */
function probePort(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port })
    const done = (ok: boolean) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(timeoutMs, () => done(false))
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })
}

export class DeployService {
  private childProcess: ChildProcess | null = null
  /**
   * Bumped by every start and cancel: a run still waiting for SSH compares it
   * with the value it started with, and stops instead of spawning once a
   * cancel or a newer run has superseded it.
   */
  private runId = 0

  getScriptPath(scriptNameBase: 'script' | 'restart_docker' = 'script'): string {
    const isWin = PlatformService.isWindows()
    const scriptName = isWin ? `${scriptNameBase}.bat` : `${scriptNameBase}.sh`

    if (__dirname.includes('app.asar') && process.resourcesPath) {
      return path.join(process.resourcesPath, 'src/cmd_scripts', scriptName)
    }

    return path.join(process.env.APP_ROOT!, 'src/cmd_scripts', scriptName)
  }

  // Helper: emit a debug line to the frontend console
  private debug(win: BrowserWindow, msg: string) {
    win.webContents.send('deploy:stdout', `[DEBUG] ${msg}`)
  }

  /**
   * Wait until the instance accepts connections on port 22. Scaleway reports
   * a server `running` as soon as the VM boots, well before sshd listens: a
   * script started in that window fails with "Connection refused".
   * Resolves false when the run was cancelled or the wait timed out (the
   * error is then already reported).
   */
  private async waitForSsh(ipv4: string, win: BrowserWindow, runId: number): Promise<boolean> {
    const maxAttempts = Math.ceil(SSH_WAIT_TIMEOUT_MS / SSH_PROBE_INTERVAL_MS)

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (runId !== this.runId) return false
      if (await probePort(ipv4, 22, SSH_PROBE_TIMEOUT_MS)) {
        if (runId !== this.runId) return false
        win.webContents.send('deploy:stdout', `Serveur SSH joignable sur ${ipv4}:22`)
        return true
      }
      if (runId !== this.runId) return false
      // One line on the first miss, then one every ~15 s: enough to show the
      // wait is alive without flooding the console.
      if (attempt === 1 || attempt % 5 === 0) {
        win.webContents.send(
          'deploy:stdout',
          `En attente du serveur SSH sur ${ipv4}:22 (tentative ${attempt}/${maxAttempts})…`,
        )
      }
      await new Promise((r) => setTimeout(r, SSH_PROBE_INTERVAL_MS))
    }

    if (runId !== this.runId) return false
    win.webContents.send(
      'deploy:error',
      `Le serveur ${ipv4} n'accepte pas de connexion SSH (port 22) après ${SSH_WAIT_TIMEOUT_MS / 60000} min. ` +
        `Vérifiez que l'instance est démarrée, que l'IPv4 est correcte et que le port 22 n'est pas bloqué (pare-feu, VPN).`,
    )
    return false
  }

  async start(ipv4: string, sourceDir: string, win: BrowserWindow, sshPassword?: string, sshKeyPath?: string): Promise<void> {
    this.cancel()
    const runId = this.runId

    const scriptPath = this.getScriptPath()
    const isWin = PlatformService.isWindows()

    // ── Pre-flight diagnostics ─────────────────────────────────────────────
    this.debug(win, `Plateforme : ${process.platform}`)
    this.debug(win, `Script : ${scriptPath}`)
    this.debug(win, `Existe : ${fs.existsSync(scriptPath)}`)
    this.debug(win, `IPV4 : ${ipv4}`)
    this.debug(win, `SOURCE_DIR : ${sourceDir}`)

    if (!fs.existsSync(scriptPath)) {
      win.webContents.send('deploy:error', `Script introuvable : ${scriptPath}`)
      return
    }

    // Ensure script is executable on Unix
    if (!isWin) {
      try {
        fs.chmodSync(scriptPath, 0o755)
        this.debug(win, 'chmod 755 appliqué au script')
      } catch (e) {
        this.debug(win, `chmod échoué (non bloquant) : ${String(e)}`)
      }
    }

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      DISPLAY: '',
    }
    
    if (sshPassword) {
      env.SSHPASS = sshPassword
      this.debug(win, `SSHPASS configuré pour l'authentification`)
    }
    if (sshKeyPath) {
      env.SSH_KEY_PATH = sshKeyPath
      this.debug(win, `SSH_KEY_PATH configuré : ${sshKeyPath}`)
    }

    if (!(await this.waitForSsh(ipv4, win, runId))) return

    const args = isWin
      ? ['cmd.exe', ['/c', scriptPath, ipv4, sourceDir]]
      : ['bash', [scriptPath, ipv4, sourceDir]]

    this.debug(win, `Commande : ${args[0]} ${(args[1] as string[]).join(' ')}`)

    const spawnOpts = { env, stdio: ['pipe', 'pipe', 'pipe'] as ['pipe', 'pipe', 'pipe'] }

    this.childProcess = spawn(args[0] as string, args[1] as string[], spawnOpts)

    this.debug(win, `PID : ${this.childProcess?.pid ?? 'N/A'}`)

    this.childProcess?.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n')
      for (const line of lines) {
        if (line.trim()) {
          win.webContents.send('deploy:stdout', line.trimEnd())
        }
      }
    })

    this.childProcess?.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n')
      for (const line of lines) {
        if (line.trim()) {
          win.webContents.send('deploy:stderr', line.trimEnd())
        }
      }
    })

    this.childProcess?.on('close', (code, signal) => {
      this.debug(win, `Processus terminé — code: ${code}, signal: ${signal}`)
      win.webContents.send('deploy:exit', code)
      this.childProcess = null
    })

    this.childProcess?.on('error', (err) => {
      this.debug(win, `Erreur spawn : ${err.message}`)
      win.webContents.send('deploy:error', err.message)
      this.childProcess = null
    })
  }

  async startRestart(ipv4: string, win: BrowserWindow, sshPassword?: string, sshKeyPath?: string): Promise<void> {
    this.cancel()
    const runId = this.runId

    const scriptPath = this.getScriptPath('restart_docker')
    const isWin = PlatformService.isWindows()

    this.debug(win, `Plateforme : ${process.platform}`)
    this.debug(win, `Script : ${scriptPath}`)
    this.debug(win, `Existe : ${fs.existsSync(scriptPath)}`)
    this.debug(win, `IPV4 : ${ipv4}`)

    if (!fs.existsSync(scriptPath)) {
      win.webContents.send('deploy:error', `Script introuvable : ${scriptPath}`)
      return
    }

    if (!isWin) {
      try {
        fs.chmodSync(scriptPath, 0o755)
        this.debug(win, 'chmod 755 appliqué au script')
      } catch (e) {
        this.debug(win, `chmod échoué (non bloquant) : ${String(e)}`)
      }
    }

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      DISPLAY: '',
    }
    
    if (sshPassword) {
      env.SSHPASS = sshPassword
      this.debug(win, `SSHPASS configuré pour l'authentification`)
    }
    if (sshKeyPath) {
      env.SSH_KEY_PATH = sshKeyPath
      this.debug(win, `SSH_KEY_PATH configuré : ${sshKeyPath}`)
    }

    if (!(await this.waitForSsh(ipv4, win, runId))) return

    const args = isWin
      ? ['cmd.exe', ['/c', scriptPath, ipv4]]
      : ['bash', [scriptPath, ipv4]]

    this.debug(win, `Commande : ${args[0]} ${(args[1] as string[]).join(' ')}`)

    const spawnOpts = { env, stdio: ['pipe', 'pipe', 'pipe'] as ['pipe', 'pipe', 'pipe'] }
    this.childProcess = spawn(args[0] as string, args[1] as string[], spawnOpts)

    this.debug(win, `PID : ${this.childProcess?.pid ?? 'N/A'}`)

    this.childProcess?.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n')
      for (const line of lines) {
        if (line.trim()) {
          win.webContents.send('deploy:stdout', line.trimEnd())
        }
      }
    })

    this.childProcess?.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n')
      for (const line of lines) {
        if (line.trim()) {
          win.webContents.send('deploy:stderr', line.trimEnd())
        }
      }
    })

    this.childProcess?.on('close', (code, signal) => {
      this.debug(win, `Processus terminé — code: ${code}, signal: ${signal}`)
      win.webContents.send('deploy:exit', code)
      this.childProcess = null
    })

    this.childProcess?.on('error', (err) => {
      this.debug(win, `Erreur spawn : ${err.message}`)
      win.webContents.send('deploy:error', err.message)
      this.childProcess = null
    })
  }

  cancel(): void {
    this.runId++
    if (this.childProcess) {
      this.childProcess.kill('SIGTERM')
      this.childProcess = null
    }
  }

  sendInput(text: string): void {
    if (this.childProcess?.stdin?.writable) {
      this.childProcess.stdin.write(text)
    }
  }

  isRunning(): boolean {
    return this.childProcess !== null
  }
}
