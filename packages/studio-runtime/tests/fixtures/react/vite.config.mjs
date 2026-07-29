import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    sourcemap: false,
    rolldownOptions: { output: { codeSplitting: false } },
  },
})
