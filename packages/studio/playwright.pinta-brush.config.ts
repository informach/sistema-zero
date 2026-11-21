import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-minimap.config'

const port = Number(process.env.PINTA_BRUSH_PORT ?? 5533)
export default defineConfig({
  ...base,
  testMatch: 'pinta-brush-regions.flow.ts',
  outputDir: './.cache/pinta-brush-regions-results',
  reporter: [
    ['list'],
    ['json', { outputFile: './.cache/pinta-brush-regions-results/report.json' }],
  ],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    ...base.webServer,
    command: 'node scripts/serve-brush-e2e.ts',
    env: { PINTA_BRUSH_PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
  },
})
