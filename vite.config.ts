import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'path'

// `ssh2` reste externe : c'est une dépendance de production, embarquée telle
// quelle par electron-builder dans app.asar. La bundler ferait échouer le build
// sur ses require() d'accélérateurs natifs optionnels (cpu-features), qui ne
// sont ni compilés ni nécessaires — ssh2 retombe sur son implémentation JS.
const mainExternals = ['ssh2']

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          // Vite 8 lit `rolldownOptions` ; `rollupOptions` y serait ignoré.
          build: { rolldownOptions: { external: mainExternals } },
        },
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      renderer: process.env.NODE_ENV === 'test' ? undefined : {},
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
})
