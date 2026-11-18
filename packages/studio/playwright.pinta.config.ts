import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PINTA_E2E_PORT ?? 5294)
export default defineConfig({
  testDir: './e2e',
  testMatch: '*-scenes.flow.ts',
  outputDir: './.cache/pinta-scenes-results',
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: './.cache/pinta-scenes-results/report.json' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'touch', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'bun scripts/serve-e2e.ts',
      cwd: '../pinta',
      env: { PINTA_E2E_PORT: String(port) },
      url: `http://127.0.0.1:${port}`,
      reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
      timeout: 120_000,
    },
    {
      command: 'bun scripts/serve-pinta-scene-package.ts',
      url: 'http://127.0.0.1:5293',
      reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
      timeout: 120_000,
    },
  ],
})
