import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { HARNESS_HOST, HARNESS_PORT } from '../src/steps/04-tela/config'

// Dev server do HARNESS de gravação (não deployado). Espelha o vite.config do
// playground do Estúdio: alias do pacote para o SOURCE (uma só cópia de Blockly,
// deduplicada → `Blockly.getMainWorkspace()` da automação enxerga o workspace do
// editor) + os mesmos optimizeDeps para o Vite não re-otimizar (full reload) ao
// entrar no modo Blocos no meio de uma gravação.
const here = import.meta.dirname
const r = (p: string) => resolve(here, p).replace(/\\/g, '/')
const studio = (p: string) => r(`../../studio/${p}`)

export default defineConfig({
  root: here,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@sistemazero/studio/styles.css': studio('src/styles/studio.css'),
      '@sistemazero/studio': studio('src/index.ts'),
    },
  },
  optimizeDeps: {
    entries: [
      r('index.html'),
      studio('src/modes/CodeMode.tsx'),
      studio('src/modes/BridgeMode.tsx'),
      studio('src/modes/BlocksMode.tsx'),
      studio('src/modes/bridgeReverseParseWorker.ts'),
    ],
    include: [
      'idb-keyval',
      'react-resizable-panels',
      'ulid',
      'zod',
      'zustand',
      'zustand/react/shallow',
      'monaco-editor',
      'blockly',
      'blockly/core',
      'blockly/blocks',
      'blockly/msg/pt-br',
      '@blockly/field-colour',
      '@blockly/toolbox-search',
      'react-blockly',
      '@monaco-editor/react',
      '@babel/parser',
    ],
  },
  worker: { format: 'es' },
  server: {
    port: HARNESS_PORT,
    host: HARNESS_HOST,
    strictPort: true,
    // Igual ao playground: o Estúdio pode pedir cross-origin isolation.
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
})
