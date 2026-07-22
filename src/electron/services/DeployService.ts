import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import type { BrowserWindow } from 'electron'
import { PlatformService } from './PlatformService'

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

  start(ipv4: string, sourceDir: string, win: BrowserWindow): void {
    this.cancel()

    const scriptPath = this.getScriptPath()
    const isWin = PlatformService.isWindows()

    const env = {
      ...process.env,
      SSH_ASKPASS: '',
      DISPLAY: '',
    }

    if (isWin) {
      this.childProcess = spawn('cmd.exe', ['/c', scriptPath, ipv4, sourceDir], { env })
    } else {
      this.childProcess = spawn('bash', [scriptPath, ipv4, sourceDir], { env })
    }

    this.childProcess.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n')
      for (const line of lines) {
        if (line.trim()) {
          win.webContents.send('deploy:stdout', line)
        }
      }
    })

    this.childProcess.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n')
      for (const line of lines) {
        if (line.trim()) {
          win.webContents.send('deploy:stderr', line)
        }
      }
    })

    this.childProcess.on('close', (code) => {
      win.webContents.send('deploy:exit', code)
      this.childProcess = null
    })

    this.childProcess.on('error', (err) => {
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
    if (this.childProcess && this.childProcess.stdin) {
      this.childProcess.stdin.write(text)
    }
  }

  isRunning(): boolean {
    return this.childProcess !== null
  }
}
