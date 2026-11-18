import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'pinta-studio.flow.ts',
  workers: 1,
  retries: 0,
  outputDir: '.cache/pinta-integration-results',
  reporter: [['list'], ['json', { outputFile: '.cache/pinta-integration-results/report.json' }]],
  use: {
    actionTimeout: 15000,
    baseURL: 'http://127.0.0.1:5403',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: {
    command: 'bun scripts/serve-pinta-integration-e2e.ts',
    url: 'http://127.0.0.1:5403',
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
    timeout: 120000,
  },
})
