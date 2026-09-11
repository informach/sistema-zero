import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev server LOCAL do package (não deployado): QA em browser real do Pensa sem subir o
// community-kids inteiro (que exige banco e login). Mesmo padrão dos playgrounds do Pinta e
// do Estúdio. O Pensa não usa Tailwind (o CSS é o `pensa.css` puro), então não há plugin dele.
const here = import.meta.dirname
const r = (p: string) => resolve(here, p).replace(/\\/g, '/')

export default defineConfig({
  root: here,
  plugins: [react()],
  resolve: {
    alias: {
      '@sistemazero/pensa/styles.css': r('../src/styles/pensa.css'),
      '@sistemazero/pensa': r('../src/index.ts'),
    },
  },
  server: { port: 5201 },
})
