import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e-journey',
  outputDir: './.cache/creator-journey-results',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4394',
    ...devices['Desktop Chrome'],
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'bun ../member-shell/qa/creator-journey-serve.ts',
    url: 'http://127.0.0.1:4394',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
