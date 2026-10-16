import { defineConfig } from 'vite'
export default defineConfig({
  root: 'src/renderer',
  base: './',
  resolve: { dedupe: ['react', 'react-dom', 'remotion'] },
  build: { outDir: '../../dist/renderer', emptyOutDir: true },
})
