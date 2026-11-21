import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-memory-regions.config'

const port = Number(process.env.PINTA_LAYERS_PORT ?? 5572)
export default defineConfig({
  ...base,
  testMatch: 'pinta-layers-regions.flow.ts',
  outputDir: './.cache/pinta-layers-regions-results',
  reporter: [
    ['list'],
    ['json', { outputFile: './.cache/pinta-layers-regions-results/report.json' }],
  ],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: 'bun scripts/serve-memory-regions-e2e.ts',
    cwd: '../pinta',
    env: { PINTA_MEMORY_PORT: String(port), PINTA_MEMORY_PROBE: 'layers' },
    url: `http://127.0.0.1:${port}`,
    timeout: 120000,
    reuseExistingServer: false,
  },
})
