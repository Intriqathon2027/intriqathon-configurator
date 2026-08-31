// ============================================================================
// Persistance des fichiers JSON de l'application dans userData.
// Isole main.ts de toute manipulation de disque.
// ============================================================================

import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

export class ConfigStore {
  private resolve(name: string): string {
    return path.join(app.getPath('userData'), name)
  }

  readJson<T>(name: string, fallback: T): T {
    try {
      return JSON.parse(fs.readFileSync(this.resolve(name), 'utf-8')) as T
    } catch {
      return fallback
    }
  }

  writeJson(name: string, value: unknown): void {
    const target = this.resolve(name)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, JSON.stringify(value, null, 2), 'utf-8')
  }

  static readJsonAt<T>(filePath: string, fallback: T): T {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
    } catch {
      return fallback
    }
  }

  static writeTextAt(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, 'utf-8')
  }
}
