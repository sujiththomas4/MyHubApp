import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    // When you add a backend, proxy /api to it so you avoid CORS in dev:
    // proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } },
  },
})
