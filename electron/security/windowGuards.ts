// ============================================================================
// Garde-fous appliqués à chaque BrowserWindow : la fenêtre ne doit jamais
// pouvoir naviguer ailleurs que vers l'application, ni ouvrir de popup.
// ============================================================================

import { shell, type BrowserWindow } from 'electron'
import { isSafeExternalUrl } from './validate'

export function applyWindowGuards(win: BrowserWindow, allowedOrigin: string | undefined): void {
  // Toute tentative d'ouverture de fenêtre part dans le navigateur système,
  // et seulement si l'URL est http(s).
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  // Une navigation hors de l'app (lien externe cliqué dans la page) est
  // bloquée puis redirigée vers le navigateur système.
  win.webContents.on('will-navigate', (event, url) => {
    const isInternal = allowedOrigin
      ? url.startsWith(allowedOrigin)
      : url.startsWith('file://')
    if (isInternal) return
    event.preventDefault()
    if (isSafeExternalUrl(url)) void shell.openExternal(url)
  })

  // Aucune permission web (caméra, géoloc, notifications…) n'est nécessaire.
  win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
}
