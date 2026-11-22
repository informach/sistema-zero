import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-memory-regions.config'

const port = Number(process.env.PINTA_METADATA_PORT ?? 5582)
export default defineConfig({
  ...base,
  testMatch: 'pinta-metadata.flow.ts',
  outputDir: './.cache/pinta-metadata-results',
  reporter: [['list'], ['json', { outputFile: './.cache/pinta-metadata-results/report.json' }]],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: 'bun scripts/serve-memory-regions-e2e.ts',
    cwd: '../pinta',
    env: { PINTA_MEMORY_PORT: String(port), PINTA_MEMORY_PROBE: 'metadata' },
    url: `http://127.0.0.1:${port}`,
    timeout: 120000,
    reuseExistingServer: false,
  },
})
