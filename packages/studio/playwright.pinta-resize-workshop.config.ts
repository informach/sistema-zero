import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-terrain.config'

const port = Number(process.env.PINTA_E2E_PORT ?? 5580)
export default defineConfig({
  ...base,
  testMatch: 'pinta-resize-workshop-scenes.flow.ts',
  outputDir: './.cache/pinta-resize-workshop-results',
  reporter: [
    ['list'],
    ['json', { outputFile: './.cache/pinta-resize-workshop-results/report.json' }],
  ],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: 'node scripts/serve-e2e.ts',
    cwd: '../pinta',
    env: { PINTA_E2E_PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120000,
  },
})
