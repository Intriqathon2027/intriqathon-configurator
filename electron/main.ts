// ============================================================================
// Bootstrap du process principal : fenêtre, sécurité, enregistrement IPC.
// Aucune logique métier ici — elle vit dans electron/services et electron/ipc.
// ============================================================================

import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { registerIpcHandlers } from './ipc'
import { applyWindowGuards } from './security/windowGuards'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Chemins de build ────────────────────────────────────────────────────────
process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// ── Trousseau système ───────────────────────────────────────────────────────
// Au démarrage, Chromium tente de dériver une clé de chiffrement depuis le
// trousseau de l'OS (« <app> Safe Storage ») pour ses cookies et mots de passe
// web. Comme l'ACL du trousseau est liée à la signature du binaire, chaque
// rebuild non signé produit une nouvelle demande — d'où les invites répétées,
// même après « Toujours autoriser ».
//
// Cette application ne stocke aucun secret via safeStorage (sa configuration
// est un JSON dans userData) : on coupe donc l'accès au trousseau. Chromium
// bascule sur une clé interne et ne sollicite plus l'OS.
// À réévaluer uniquement si l'app se met à utiliser safeStorage.
app.commandLine.appendSwitch('use-mock-keychain')          // macOS / Windows
app.commandLine.appendSwitch('password-store', 'basic')     // Linux (gnome-keyring / kwallet)

let win: BrowserWindow | null = null

function createWindow(): void {
  win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#F8FAF9',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      // sandbox laissé à sa valeur par défaut (true) : le preload n'utilise que
      // contextBridge/ipcRenderer, et tout le code Node (ssh2, fs) vit côté main.
      // Le passer à false ferait charger dist-electron/preload.mjs par le loader
      // ESM, alors que vite-plugin-electron y émet du CommonJS — le preload ne
      // se chargerait plus et window.electronAPI serait undefined.
    },
    icon: path.join(process.env.VITE_PUBLIC!, 'favicon.svg'),
  })

  applyWindowGuards(win, VITE_DEV_SERVER_URL)

  win.on('closed', () => { win = null })

  if (VITE_DEV_SERVER_URL) {
    void win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    void win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

registerIpcHandlers(() => win)
void app.whenReady().then(createWindow)
