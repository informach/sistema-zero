import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev server LOCAL do package (não deployado). Adaptado do vite.config do repo
// de origem (sistema-zero-studio/apps/studio): mantém plugins, optimizeDeps,
// worker es e os headers de cross-origin isolation que o WebContainer (aba
// Terminal) exige; dropa o bloco build/manualChunks e a CSP de preview, que
// eram otimizações do deploy standalone — a CSP de produção é responsabilidade
// do app consumidor (ver docs/embedding.md).
const here = import.meta.dirname
// Forward slashes: paths com backslash (Windows) não casam no glob de
// optimizeDeps.entries — o crawl silenciosamente não acha nada e o Vite
// re-otimiza (com full reload) na primeira navegação ao editor.
const r = (p: string) => resolve(here, p).replace(/\\/g, '/')

export default defineConfig({
  root: here,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@sistemazero/studio/styles.css': r('../src/styles/studio.css'),
      '@sistemazero/studio': r('../src/index.ts'),
    },
  },
  optimizeDeps: {
    // `entries` define os PONTOS DE PARTIDA do crawl de dependências no cold
    // start. Os modos (Código/Ponte/Blocos) entram via import() dinâmico (ver
    // src/modes/lazyModes.ts), então as deps pesadas deles (Monaco
    // deep-imports, Blockly, workers e o @babel/parser do worker de
    // reverse-parse) só seriam descobertas na primeira navegação ao editor —
    // forçando um full reload no meio do caminho. Listando os modos + o worker
    // como entries, o Vite descobre tudo no start.
    entries: [
      r('index.html'),
      r('../src/modes/CodeMode.tsx'),
      r('../src/modes/BridgeMode.tsx'),
      r('../src/modes/BlocksMode.tsx'),
      r('../src/modes/bridgeReverseParseWorker.ts'),
    ],
    // Pré-empacota TODOS os specifiers profundos do Monaco que src/monaco
    // importa (ver src/monaco/workers.ts), além de Blockly e do parser usado
    // dentro do worker. Redundante com `entries` para deps já alcançadas pelo
    // crawl, mas mantém o pré-bundle determinístico.
    // Specifiers EXATOS como aparecem nos imports do src (incl. sufixo .js dos
    // deep imports do Monaco — sem ele o pre-bundle não casa e o Vite
    // re-otimiza com full reload na primeira entrada no modo).
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
      'monaco-editor/esm/vs/editor/editor.api.js',
      'monaco-editor/esm/vs/basic-languages/css/css.contribution.js',
      'monaco-editor/esm/vs/basic-languages/html/html.contribution.js',
      'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js',
      'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController.js',
      'monaco-editor/esm/vs/editor/contrib/snippet/browser/snippetController2.js',
      'monaco-editor/esm/vs/editor/contrib/format/browser/formatActions.js',
      'monaco-editor/esm/vs/editor/contrib/parameterHints/browser/parameterHints.js',
      'monaco-editor/esm/vs/editor/contrib/hover/browser/hoverContribution.js',
      'monaco-editor/esm/vs/editor/contrib/bracketMatching/browser/bracketMatching.js',
      'monaco-editor/esm/vs/language/css/monaco.contribution.js',
      'monaco-editor/esm/vs/language/html/monaco.contribution.js',
      'monaco-editor/esm/vs/language/typescript/monaco.contribution.js',
    ],
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    // O WebContainer (Terminal) exige cross-origin isolation no documento host.
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
})
