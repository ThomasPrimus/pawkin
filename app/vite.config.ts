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
