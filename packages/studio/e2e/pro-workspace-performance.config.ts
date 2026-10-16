import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: '.',
  testMatch: 'pro-workspace-performance.spec.ts',
  workers: 1,
  outputDir: '../.cache/pro-performance-browser',
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1366, height: 768 },
    trace: 'retain-on-failure',
  },
})
