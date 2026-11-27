import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-memory-regions.config'

const port = Number(process.env.PINTA_PROJECTED_PORT ?? 5586)
export default defineConfig({
  ...base,
  testMatch: 'pinta-projected.flow.ts',
  outputDir: './.cache/pinta-projected-results',
  reporter: [['list'], ['json', { outputFile: './.cache/pinta-projected-results/report.json' }]],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  projects: [
    {
      name: 'desktop',
      use: {
        viewport: { width: 1280, height: 850 },
        launchOptions: { executablePath: process.env.PW_CHROMIUM },
      },
    },
    {
      name: 'touch',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        launchOptions: { executablePath: process.env.PW_CHROMIUM },
      },
    },
  ],
  webServer: {
    command: 'bun scripts/serve-projected-e2e.ts',
    cwd: '../pinta',
    env: { PINTA_PROJECTED_PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
    timeout: 120000,
    reuseExistingServer: false,
  },
})
