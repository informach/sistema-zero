import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev server LOCAL do package (não deployado) — QA em browser real do Pinta
// sem subir o community-kids inteiro. Mesmo padrão do playground do studio.
const here = import.meta.dirname
const r = (p: string) => resolve(here, p).replace(/\\/g, '/')

export default defineConfig({
  root: here,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@sistemazero/pinta/styles.css': r('../src/styles/pinta.css'),
      '@sistemazero/pinta': r('../src/index.ts'),
    },
  },
  server: { port: 5199 },
})
