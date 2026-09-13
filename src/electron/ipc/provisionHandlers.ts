import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import { SupabaseProvisionService, type SupabaseProvisionRequest } from '../services/SupabaseProvisionService'

/**
 * IPC surface for the "Configuration par API" automations.
 *
 * Same shape as the deploy handlers: the renderer starts and cancels, the main
 * process streams progress back over `provision:*` events. Every call is
 * wrapped so a provider error reaches the card as a message instead of an
 * unhandled rejection in the main process.
 */
export function registerProvisionHandlers(getWin: () => BrowserWindow | null): void {
  const supabase = new SupabaseProvisionService()

  const requireWin = (): BrowserWindow => {
    const win = getWin()
    if (!win) throw new Error('No active window')
    return win
  }

  ipcMain.handle('provision:supabase:start', (_event, req: SupabaseProvisionRequest) => {
    // Fire and forget: progress travels over the event channels, so the
    // renderer is not left awaiting a promise for several minutes.
    void supabase.start(requireWin(), req)
  })

  ipcMain.handle('provision:supabase:organizations', async (_event, accessToken: string) => {
    try {
      return { success: true, data: await supabase.listOrganizations(accessToken) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('provision:supabase:projects', async (_event, accessToken: string) => {
    try {
      return { success: true, data: await supabase.listProjects(accessToken) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('provision:supabase:verify-project', async (_event, accessToken: string, ref: string) => {
    try {
      return { success: true, data: await supabase.verifyProject(accessToken, ref) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('provision:cancel', (_event, service: string) => {
    if (service === 'supabase') supabase.cancel()
  })
}
