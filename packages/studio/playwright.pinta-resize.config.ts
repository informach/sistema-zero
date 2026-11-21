import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-memory-regions.config'

const port = Number(process.env.PINTA_RESIZE_PORT ?? 5578)
export default defineConfig({
  ...base,
  testMatch: 'pinta-resize.flow.ts',
  outputDir: './.cache/pinta-resize-results',
  reporter: [['list'], ['json', { outputFile: './.cache/pinta-resize-results/report.json' }]],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: 'bun scripts/serve-resize-e2e.ts',
    cwd: '../pinta',
    env: { PINTA_RESIZE_PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
    timeout: 120000,
    reuseExistingServer: false,
  },
})
