import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const require = createRequire(import.meta.url)

export default defineConfig({
  root: resolve(import.meta.dirname, 'fixtures'),
  plugins: [react(), tailwindcss()],
  // Next App Router aliases this entry during its build. Vite must use the same
  // implementation: the Pages Router loader owns `ref` and exposes only retry().
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, '../../community-kids/src'),
      'next/dynamic': require.resolve('next/dist/api/app-dynamic', {
        paths: [resolve(import.meta.dirname, '../../member-shell')],
      }),
    },
  },
  worker: { format: 'es' },
  build: {
    outDir: resolve(import.meta.dirname, '../../../.cache/studio-python-editor-ui'),
    emptyOutDir: false,
    rollupOptions: {
      input: {
        editor: resolve(import.meta.dirname, 'fixtures/index.html'),
        public: resolve(import.meta.dirname, 'fixtures/public.html'),
      },
    },
  },
  server: { host: '127.0.0.1', port: 5298 },
  preview: {
    host: '127.0.0.1',
    port: 5298,
    proxy: {
      '/configuration': 'http://127.0.0.1:5297',
      '/distribution': 'http://127.0.0.1:5297',
      '/project/': 'http://127.0.0.1:5297',
      '/api/studio/python-language': 'http://127.0.0.1:5297',
      '/authoring-probe/': 'http://127.0.0.1:5297',
      '/live-probe/': 'http://127.0.0.1:5297',
      '/free-probe/': 'http://127.0.0.1:5297',
      '/public-probe/': 'http://127.0.0.1:5297',
      '/api/studio/public-runtime': 'http://127.0.0.1:5297',
      '/api/studio/publish-standalone': 'http://127.0.0.1:5297',
      '/api/studio/publication': 'http://127.0.0.1:5297',
      '/api/studio/play/': 'http://127.0.0.1:5297',
      '/api/studio/free-options': 'http://127.0.0.1:5297',
      '/api/studio/free-runtime': 'http://127.0.0.1:5297',
      '/api/live/': 'http://127.0.0.1:5297',
      '/api/admin/live/': 'http://127.0.0.1:5297',
      '/api/members/studio/authoring-runtime': 'http://127.0.0.1:5297',
    },
  },
})
