import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev server LOCAL do package (não deployado) — QA em browser real do Molda
// sem subir o community-kids inteiro. Mesmo padrão do playground do Pinta.
const here = import.meta.dirname
const r = (p: string) => resolve(here, p).replace(/\\/g, '/')

export default defineConfig({
  root: here,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@sistemazero/molda/styles.css': r('../src/styles/molda.css'),
      '@sistemazero/molda': r('../src/index.ts'),
    },
  },
  server: { host: '127.0.0.1', port: 5198, strictPort: true },
})
