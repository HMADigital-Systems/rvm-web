import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 1. Change to function syntax to access 'mode'
export default defineConfig(({ mode }) => {
  return {
    plugins: [vue()],
    
    server: {
      port: 5173,      
      strictPort: true, 
      
      proxy: {
        '/api': {
          // FIX: Point to backend port (3000), NOT frontend port (5173)
          target: 'http://localhost:3000', 
          changeOrigin: true,
          secure: false, 
        }
      }
    },

    // 2. Add esbuild to strip logs in production
    esbuild: {
      pure: mode === 'production' ? ['console.log', 'console.debug', 'console.info'] : [],
      drop: mode === 'production' ? ['debugger'] : [],
    },
  };
});