import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// Waehrend der Migration liegt die neue App unter /app/ neben der alten.
// Beim Umschalten wird daraus '/'.
const BASE = '/app/'

export default defineConfig({
  base: BASE,
  // Hostinger liefert das Repo-Verzeichnis direkt aus, deshalb muss der Build
  // im Repo landen: Quelle in frontend/, Ergebnis in app/ (= pawkin.eu/app/).
  // Erzeugt und committet wird das ausschliesslich von der GitHub Action.
  build: {
    outDir: '../app',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Vendor vom App-Code trennen: ein Update an unseren Screens laedt
        // dann nicht Supabase und React erneut mit herunter. Zaehlt bei einer
        // PWA doppelt, weil der Service Worker jede Datei einzeln versioniert.
        manualChunks: (id: string) => {
          if (id.includes('node_modules/@supabase')) return 'supabase'
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler'))
            return 'react'
          if (id.includes('node_modules/@tanstack') || id.includes('node_modules/zod'))
            return 'daten'
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt', // kein stiller Austausch – der Nutzer bestaetigt
      manifest: {
        name: 'Pawkin – Tierbetreuung ohne Gebühren',
        short_name: 'Pawkin',
        description: 'Tierbetreuung ohne Gebühren – und die Akte, die mit deinem Tier mitreist.',
        lang: 'de',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        background_color: '#F6FAF9',
        theme_color: '#0E7C6B',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Der gesamte App-Code wird vorgeladen und versioniert ausgeliefert.
        // Damit ist das Cache-Problem der alten Auslieferung strukturell weg.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: { provider: 'v8', include: ['src/domain/**'] },
  },
})
