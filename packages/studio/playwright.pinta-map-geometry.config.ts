import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-minimap.config'

const port = Number(process.env.PINTA_MAP_GEOMETRY_PORT ?? 5543)
export default defineConfig({
  ...base,
  testMatch: 'pinta-map-geometry.flow.ts',
  outputDir: './.cache/pinta-map-geometry-results',
  reporter: [['list'], ['json', { outputFile: './.cache/pinta-map-geometry-results/report.json' }]],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    ...base.webServer,
    command: 'bun scripts/serve-map-geometry-e2e.ts',
    env: { PINTA_MAP_GEOMETRY_PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
  },
})
