import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-minimap.config'

const port = Number(process.env.PINTA_MAP_GRID_PORT ?? 5560)
export default defineConfig({
  ...base,
  testMatch: 'pinta-map-grid.flow.ts',
  outputDir: './.cache/pinta-map-grid-results',
  reporter: [['list'], ['json', { outputFile: './.cache/pinta-map-grid-results/report.json' }]],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: 'bun scripts/serve-map-grid-e2e.ts',
    cwd: '../pinta',
    env: { PINTA_MAP_GRID_PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
    timeout: 120000,
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
  },
})
