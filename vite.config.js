import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 🟢 1. Lock the Port (So it doesn't conflict with Admin Panel)
    port: 5173,      
    strictPort: true, 

    // 🟢 2. Keep your existing Proxy (For AutoGCM / Vercel connection)
    proxy: {
      '/api': {
        target: 'https://rvm-web.vercel.app', 
        changeOrigin: true,
        secure: false, 
      }
    }
  }
})