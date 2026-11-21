import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-minimap.config'

const port = Number(process.env.PINTA_MAP_IMAGES_PORT ?? 5530)
export default defineConfig({
  ...base,
  testMatch: 'pinta-map-images-regions.flow.ts',
  outputDir: './.cache/pinta-map-images-regions-results',
  reporter: [
    ['list'],
    ['json', { outputFile: './.cache/pinta-map-images-regions-results/report.json' }],
  ],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    ...base.webServer,
    command: 'bun scripts/serve-map-images-regions-e2e.ts',
    env: { PINTA_MAP_IMAGES_PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
  },
})
