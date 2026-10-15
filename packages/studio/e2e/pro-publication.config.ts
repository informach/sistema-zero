import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: '.',
  testMatch: 'pro-publication.spec.ts',
  workers: 1,
  outputDir: '../.cache/pro-publication-browser',
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
})
