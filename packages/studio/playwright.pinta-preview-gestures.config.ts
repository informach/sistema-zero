import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-brush.config'

const port = Number(process.env.PINTA_BRUSH_PORT ?? 5554)
const outputDir = process.env.PINTA_PREVIEW_OUTPUT_DIR ?? './.cache/pinta-preview-gestures-results'
export default defineConfig({
  ...base,
  testMatch: 'pinta-preview-gestures.flow.ts',
  outputDir,
  reporter: [['list'], ['json', { outputFile: `${outputDir}/report.json` }]],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: 'node scripts/serve-brush-e2e.ts',
    cwd: '../pinta',
    timeout: 120_000,
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
    env: { PINTA_BRUSH_PORT: String(port), PINTA_GESTURE_LAB: 'previews' },
    url: `http://127.0.0.1:${port}`,
  },
})
