import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-minimap.config'

const port = Number(process.env.PINTA_MINIMAP_REGIONS_PORT ?? 5528)
export default defineConfig({
  ...base,
  testMatch: 'pinta-minimap-regions.flow.ts',
  outputDir: './.cache/pinta-minimap-regions-results',
  reporter: [
    ['list'],
    ['json', { outputFile: './.cache/pinta-minimap-regions-results/report.json' }],
  ],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    ...base.webServer,
    command: 'bun scripts/serve-minimap-regions-e2e.ts',
    env: { PINTA_MINIMAP_REGIONS_PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
  },
})
