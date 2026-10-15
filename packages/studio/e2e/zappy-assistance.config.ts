import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: '.',
  testMatch: 'zappy-assistance.spec.ts',
  workers: 1,
  outputDir: '../.cache/zappy-assistance-browser',
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
  },
})
