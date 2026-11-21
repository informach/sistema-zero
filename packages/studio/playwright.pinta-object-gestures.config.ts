import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-brush.config'

const port = Number(process.env.PINTA_BRUSH_PORT ?? 5537)
export default defineConfig({
  ...base,
  testMatch: 'pinta-object-gestures.flow.ts',
  outputDir: './.cache/pinta-object-gestures-results',
  reporter: [
    ['list'],
    ['json', { outputFile: './.cache/pinta-object-gestures-results/report.json' }],
  ],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    ...base.webServer,
    env: { PINTA_BRUSH_PORT: String(port), PINTA_GESTURE_LAB: 'objects' },
    url: `http://127.0.0.1:${port}`,
  },
})
