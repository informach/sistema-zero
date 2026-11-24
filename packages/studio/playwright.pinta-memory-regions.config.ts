import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-minimap.config'

const port = Number(process.env.PINTA_MEMORY_PORT ?? 5570)
export default defineConfig({
  ...base,
  testMatch: 'pinta-memory-regions.flow.ts',
  outputDir: './.cache/pinta-memory-regions-results',
  reporter: [
    ['list'],
    ['json', { outputFile: './.cache/pinta-memory-regions-results/report.json' }],
  ],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: 'bun scripts/serve-memory-regions-e2e.ts',
    cwd: '../pinta',
    env: { PINTA_MEMORY_PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
    timeout: 120000,
    reuseExistingServer: false,
  },
})
