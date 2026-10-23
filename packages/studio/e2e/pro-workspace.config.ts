import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: '.',
  testMatch: ['pro-workspace.spec.ts', 'pro-builder-review.spec.ts', 'zappy-assistance.spec.ts'],
  workers: 1,
  outputDir: '../.cache/pro-workspace-browser',
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    viewport: { width: 1440, height: 1000 },
  },
})
