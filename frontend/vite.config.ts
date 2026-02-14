import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3001'
const wsProxyTarget = process.env.WS_PROXY_TARGET ?? 'http://localhost:3001'

export default defineConfig({
  plugins: [react()],
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
