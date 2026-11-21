import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-memory-regions.config'

const port = Number(process.env.PINTA_REMAP_PORT ?? 5574)
export default defineConfig({
  ...base,
  testMatch: 'pinta-remap.flow.ts',
  outputDir: './.cache/pinta-remap-results',
  reporter: [['list'], ['json', { outputFile: './.cache/pinta-remap-results/report.json' }]],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: 'bun scripts/serve-tileset-remap-e2e.ts',
    cwd: '../pinta',
    env: { PINTA_REMAP_PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
    timeout: 120000,
    reuseExistingServer: false,
  },
})
