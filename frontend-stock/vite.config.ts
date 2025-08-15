/*import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/auth':         { target: 'http://backend:3000', changeOrigin: true },
      '/machines':     { target: 'http://backend:3000', changeOrigin: true },
      '/destinations': { target: 'http://backend:3000', changeOrigin: true },
      '/history':      { target: 'http://backend:3000', changeOrigin: true },
    },

  },
})*/
// vite.config.ts
// vite.config.ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/auth':         { target: 'http://backend:3000', changeOrigin: true },
      '/machines':     { target: 'http://backend:3000', changeOrigin: true },
      '/destinations': { target: 'http://backend:3000', changeOrigin: true },
      '/history':      { target: 'http://backend:3000', changeOrigin: true },
    },
  },
})




