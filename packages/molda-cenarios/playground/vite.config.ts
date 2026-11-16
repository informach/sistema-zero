import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 4531,
    strictPort: true,
    watch: { ignored: ['**/output/**', '**/dist/**', '**/.cache/**'] },
    proxy: {
      '/api/molda-cenarios': 'http://127.0.0.1:4533',
      '/runtime': 'http://127.0.0.1:4533',
      '/api/avatar3d': 'http://127.0.0.1:4530',
      '/api/morada3d': 'http://127.0.0.1:4530',
    },
  },
  optimizeDeps: { exclude: ['@sistemazero/molda', '@sistemazero/molda-cenarios-core'] },
})
