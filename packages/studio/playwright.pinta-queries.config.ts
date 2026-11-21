import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-memory-regions.config'

const port = Number(process.env.PINTA_QUERIES_PORT ?? 5576)
export default defineConfig({
  ...base,
  testMatch: 'pinta-queries.flow.ts',
  outputDir: './.cache/pinta-queries-results',
  reporter: [['list'], ['json', { outputFile: './.cache/pinta-queries-results/report.json' }]],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: 'bun scripts/serve-memory-regions-e2e.ts',
    cwd: '../pinta',
    env: { PINTA_MEMORY_PORT: String(port), PINTA_MEMORY_PROBE: 'queries' },
    url: `http://127.0.0.1:${port}`,
    timeout: 120000,
    reuseExistingServer: false,
  },
})
