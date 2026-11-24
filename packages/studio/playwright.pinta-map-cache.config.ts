import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-map-grid.config'

const port = Number(process.env.PINTA_MAP_GRID_PORT ?? 5564)
export default defineConfig({
  ...base,
  testMatch: 'pinta-map-cache.flow.ts',
  outputDir: './.cache/pinta-map-cache-results',
  reporter: [['list'], ['json', { outputFile: './.cache/pinta-map-cache-results/report.json' }]],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: 'bun scripts/serve-map-grid-e2e.ts',
    cwd: '../pinta',
    env: {
      PINTA_MAP_GRID_PORT: String(port),
      PINTA_MAP_GRID_BASELINE: '47e21b13a0fb94995d24bf4d0fc041af2d0de952',
      PINTA_MAP_GRID_MODULE: 'cache',
    },
    url: `http://127.0.0.1:${port}`,
    timeout: 120000,
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
  },
})
