import { resolve, sep } from 'node:path'
import { defineConfig } from 'vite'

const raiz = resolve(import.meta.dirname, '../../../..')
const destino = resolve(
  process.env.CENARIOS_ACERVO_BUILD_DIR ?? 'output/cenarios-reforma/processador-acervo',
)
if (!destino.startsWith(resolve(raiz, 'output') + sep))
  throw Error('O processador local precisa ficar em output')

export default defineConfig({
  root: import.meta.dirname,
  publicDir: false,
  envDir: false,
  build: {
    outDir: destino,
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'entrada.ts'),
      formats: ['es'],
      fileName: () => 'processador.js',
    },
  },
})
