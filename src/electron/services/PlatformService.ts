import fs from 'node:fs'
import path from 'node:path'

export class PlatformService {
  static getPlatform(): string {
    return process.platform
  }

  static isWindows(): boolean {
    return process.platform === 'win32'
  }

  static writeEnvFile(dirPath: string, content: string): { success: boolean; error?: string } {
    try {
      fs.writeFileSync(path.join(dirPath, '.env'), content)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}
