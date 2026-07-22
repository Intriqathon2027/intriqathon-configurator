import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { BrowserWindow } from 'electron'
import { PlatformService } from './PlatformService'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export class DeployService {
  private childProcess: ChildProcess | null = null

  getScriptPath(): string {
    const isWin = PlatformService.isWindows()
    const scriptName = isWin ? 'script.bat' : 'script.sh'

    if (__dirname.includes('app.asar') && process.resourcesPath) {
      return path.join(process.resourcesPath, 'src/cmd_scripts', scriptName)
    }

    return path.join(process.env.APP_ROOT!, 'src/cmd_scripts', scriptName)
  }

  // Helper: emit a debug line to the frontend console
  private debug(win: BrowserWindow, msg: string) {
    win.webContents.send('deploy:stdout', `[DEBUG] ${msg}`)
  }

  start(ipv4: string, sourceDir: string, win: BrowserWindow, sshPassword?: string): void {
    this.cancel()

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

    const args = isWin
      ? ['cmd.exe', ['/c', scriptPath, ipv4, sourceDir]]
      : ['bash', [scriptPath, ipv4, sourceDir]]

    this.debug(win, `Commande : ${args[0]} ${(args[1] as string[]).join(' ')}`)

    const spawnOpts = { env, stdio: ['pipe', 'pipe', 'pipe'] as const }

    this.childProcess = spawn(args[0] as string, args[1] as string[], spawnOpts)

    this.debug(win, `PID : ${this.childProcess.pid ?? 'N/A'}`)

    this.childProcess.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n')
      for (const line of lines) {
        if (line.trim()) {
          win.webContents.send('deploy:stdout', line.trimEnd())
        }
      }
    })

    this.childProcess.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n')
      for (const line of lines) {
        if (line.trim()) {
          win.webContents.send('deploy:stderr', line.trimEnd())
        }
      }
    })

    this.childProcess.on('close', (code, signal) => {
      this.debug(win, `Processus terminé — code: ${code}, signal: ${signal}`)
      win.webContents.send('deploy:exit', code)
      this.childProcess = null
    })

    this.childProcess.on('error', (err) => {
      this.debug(win, `Erreur spawn : ${err.message}`)
      win.webContents.send('deploy:error', err.message)
      this.childProcess = null
    })
  }

  cancel(): void {
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
