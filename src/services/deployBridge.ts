export interface DeployBridge {
  getPlatform(): Promise<string>
  writeEnvToDir(dir: string, content: string): Promise<{ success: boolean; error?: string }>
  startDeploy(ipv4: string, sourceDir: string, sshPassword?: string): Promise<void>
  cancelDeploy(): Promise<void>
  sendInput(text: string): Promise<void>
  onStdout(cb: (line: string) => void): () => void
  onStderr(cb: (line: string) => void): () => void
  onExit(cb: (code: number | null) => void): () => void
  onError(cb: (error: string) => void): () => void
}

class ElectronDeployBridge implements DeployBridge {
  getPlatform() {
    return window.electronAPI.getPlatform()
  }
  writeEnvToDir(dir: string, content: string) {
    return window.electronAPI.writeEnvToDir(dir, content)
  }
  startDeploy(ipv4: string, sourceDir: string, sshPassword?: string) {
    return window.electronAPI.startDeploy(ipv4, sourceDir, sshPassword)
  }
  cancelDeploy() {
    return window.electronAPI.cancelDeploy()
  }
  sendInput(text: string) {
    return window.electronAPI.sendDeployInput(text)
  }
  onStdout(cb: (line: string) => void) {
    return window.electronAPI.onDeployStdout(cb)
  }
  onStderr(cb: (line: string) => void) {
    return window.electronAPI.onDeployStderr(cb)
  }
  onExit(cb: (code: number | null) => void) {
    return window.electronAPI.onDeployExit(cb)
  }
  onError(cb: (error: string) => void) {
    return window.electronAPI.onDeployError(cb)
  }
}

class MockDeployBridge implements DeployBridge {
  private stdoutCbs: ((line: string) => void)[] = []
  private stderrCbs: ((line: string) => void)[] = []
  private exitCbs: ((code: number | null) => void)[] = []
  
  private timeouts: ReturnType<typeof setTimeout>[] = []
  private cancelled = false
  
  private currentIpv4 = ''
  private currentSourceDir = ''
  
  private resolveInput: ((val: string) => void) | null = null

  async getPlatform() {
    return 'darwin'
  }
  
  async writeEnvToDir(_dir: string, _content: string) {
    await this.wait(500)
    return { success: true }
  }
  
  async startDeploy(ipv4: string, sourceDir: string, _sshPassword?: string) {
    this.cancelled = false
    this.currentIpv4 = ipv4
    this.currentSourceDir = sourceDir
    
    try {
      this.stdout(`Connexion SSH à root@${ipv4}…`)
      await this.wait(800)
      if (this.cancelled) return
      
      this.stderr(`root@${ipv4}'s password:`)
      await this.waitForInput()
      if (this.cancelled) return
      
      this.stdout(`Connexion SSH à root@${ipv4}… Authentifié`)
      await this.wait(600)
      if (this.cancelled) return
      
      this.stdout('Upload du fichier .env…')
      await this.wait(1200)
      if (this.cancelled) return
      this.stdout('Upload du fichier .env : Done')
      
      this.stdout(`Synchronisation des fichiers depuis ${sourceDir}…`)
      await this.wait(1500)
      if (this.cancelled) return
      this.stdout('Synchronisation des fichiers : Done')
      
      await this.wait(500)
      if (this.cancelled) return
      this.stderr('Are you sure you want to continue connecting (yes/no)?')
      await this.waitForInput()
      if (this.cancelled) return
      
      this.stdout('Configuration de la base de données…')
      await this.wait(1800)
      if (this.cancelled) return
      this.stdout('Configuration de la base de données : Done')
      
      this.stdout('Configuration de l\'API…')
      await this.wait(1400)
      if (this.cancelled) return
      this.stdout('Configuration de l\'API : Done')
      
      this.stdout('Configuration SSL / Nginx…')
      await this.wait(2000)
      if (this.cancelled) return
      this.stdout('Configuration SSL / Nginx : Done')
      
      this.stdout('Démarrage des services Docker…')
      await this.wait(1600)
      if (this.cancelled) return
      this.stdout('Démarrage des services Docker : Done')
      
      await this.wait(500)
      if (this.cancelled) return
      this.stdout(`Déploiement terminé avec succès !`)
      
      this.exitCbs.forEach(cb => cb(0))
    } catch {
      if (!this.cancelled) {
        this.exitCbs.forEach(cb => cb(1))
      }
    }
  }
  
  async cancelDeploy() {
    this.cancelled = true
    this.timeouts.forEach(clearTimeout)
    this.timeouts = []
    if (this.resolveInput) {
      this.resolveInput('')
      this.resolveInput = null
    }
  }
  
  async sendInput(text: string) {
    if (this.resolveInput) {
      this.resolveInput(text)
      this.resolveInput = null
    }
  }
  
  onStdout(cb: (line: string) => void) {
    this.stdoutCbs.push(cb)
    return () => {
      this.stdoutCbs = this.stdoutCbs.filter(fn => fn !== cb)
    }
  }
  
  onStderr(cb: (line: string) => void) {
    this.stderrCbs.push(cb)
    return () => {
      this.stderrCbs = this.stderrCbs.filter(fn => fn !== cb)
    }
  }
  
  onExit(cb: (code: number | null) => void) {
    this.exitCbs.push(cb)
    return () => {
      this.exitCbs = this.exitCbs.filter(fn => fn !== cb)
    }
  }
  
  onError(_cb: (error: string) => void) {
    return () => {}
  }
  
  private stdout(msg: string) {
    this.stdoutCbs.forEach(cb => cb(msg))
  }
  
  private stderr(msg: string) {
    this.stderrCbs.forEach(cb => cb(msg))
  }
  
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timeout = setTimeout(resolve, ms)
      this.timeouts.push(timeout)
    })
  }
  
  private waitForInput(): Promise<string> {
    return new Promise(resolve => {
      this.resolveInput = resolve
    })
  }
}

export function createDeployBridge(): DeployBridge {
  if (window.electronAPI?.startDeploy) {
    return new ElectronDeployBridge()
  }
  return new MockDeployBridge()
}
