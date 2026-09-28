import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
  build: {
    target: 'es2019',
    cssTarget: 'chrome80',
    rollupOptions: {
      output: {
        // Keep release assets on fresh URLs so a previously cached failed module
        // response cannot strand the app on the static loading shell.
        entryFileNames: 'assets/[name]-[hash]-r3.js',
        chunkFileNames: 'assets/[name]-[hash]-r3.js',
        assetFileNames: 'assets/[name]-[hash]-r3[extname]',
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
