import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3001'
const wsProxyTarget = process.env.WS_PROXY_TARGET ?? 'http://localhost:3001'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.json',
      manifest: {
        name: 'Поясни',
        short_name: 'Поясни',
        description: 'Командная игра в слова в вашем браузере.',
        theme_color: '#1A1D29',
        background_color: '#1A1D29',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'ru',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        navigateFallback: '/offline.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }: { request: Request }) =>
              ['style', 'script', 'image', 'font'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/socket.io': {
        target: wsProxyTarget,
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
