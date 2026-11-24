import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: 'preview-input-probe.spec.ts',
  outputDir: '../.cache/playwright-input-probe',
  workers: 1,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], channel: 'chromium', trace: 'retain-on-failure' },
})
