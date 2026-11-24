import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-map-cache.config'

const port = Number(process.env.PINTA_MAP_GRID_PORT ?? 5567)
export default defineConfig({
  ...base,
  testMatch: 'pinta-map-pressure.flow.ts',
  outputDir: './.cache/pinta-map-pressure-results',
  reporter: [['list'], ['json', { outputFile: './.cache/pinta-map-pressure-results/report.json' }]],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: 'bun scripts/serve-map-grid-e2e.ts',
    cwd: '../pinta',
    env: {
      PINTA_MAP_GRID_PORT: String(port),
      PINTA_MAP_GRID_BASELINE: '822462a4858fb3224434147f7f8b814189d40373',
      PINTA_MAP_GRID_MODULE: 'cache',
    },
    url: `http://127.0.0.1:${port}`,
    timeout: 120000,
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
  },
})
