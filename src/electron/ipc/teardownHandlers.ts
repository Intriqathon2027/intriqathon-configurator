import { ipcMain } from 'electron'
import { TeardownService } from '../services/TeardownService'
import type {
  BlockVolumeDeleteRequest,
  TeardownRequest,
  TeardownService as TeardownServiceName,
} from '../../types/teardown'

/**
 * IPC surface for "Arrêt du site".
 *
 * Both calls answer a promise rather than streaming over events: a probe is a
 * question, and a deletion is one call per service followed by a read-back —
 * the card that asked is waiting on the answer, nothing longer-lived.
 */
export function registerTeardownHandlers(): void {
  const teardown = new TeardownService()

  /** Read-only: runs every time the page is opened. */
  ipcMain.handle('teardown:probe', async (_event, req: TeardownRequest) => {
    try {
      return { success: true, data: await teardown.probe(req) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('teardown:run', async (_event, service: TeardownServiceName, req: TeardownRequest) => {
    try {
      return { success: true, data: await teardown.run(service, req) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  /** The Block Storage volumes a deleted instance left detached — on request only. */
  ipcMain.handle('teardown:delete-volumes', async (_event, req: BlockVolumeDeleteRequest) => {
    try {
      return { success: true, data: await teardown.deleteBlockVolumes(req) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
