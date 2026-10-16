import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  root: 'src/renderer',
  base: './',
  plugins:[tailwindcss()],
  resolve: { dedupe: ['react', 'react-dom', 'remotion', '@remotion/player'] },
  build: { outDir: '../../dist/renderer', emptyOutDir: true },
})
