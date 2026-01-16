import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/kult-planning-engine/',
  server: {
    port: 3000,
    host: '0.0.0.0',
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    },
    allowedHosts: [
      '3002-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai',
      '3002-ii2u2a7dw2eck8g09a9sb-cc2fbc16.sandbox.novita.ai',
      '3002-ii2u2a7dw2eck8g09a9sb-583b4d74.sandbox.novita.ai',
      '3004-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai',
      '3004-ii2u2a7dw2eck8g09a9sb-cc2fbc16.sandbox.novita.ai',
      '.sandbox.novita.ai',
      'localhost'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    }
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    cors: true,
    allowedHosts: [
      '3002-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai',
      '.sandbox.novita.ai',
      'localhost'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          utils: ['axios']
        }
      }
    }
  }
})
