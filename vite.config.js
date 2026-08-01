import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2019',
    cssTarget: 'chrome80',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'react'
          if (id.includes('/@supabase/') || id.includes('/@supabase\\')) return 'supabase'
          if (id.includes('/lucide-react/')) return 'icons'
          return undefined
        },
      },
    },
  },
})
