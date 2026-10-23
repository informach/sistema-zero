import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: 'pro-candidate-preview.spec.ts',
  workers: 1,
  outputDir: '../.cache/pro-candidate-browser',
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
})
