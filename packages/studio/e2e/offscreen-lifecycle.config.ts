import { defineConfig, devices } from '@playwright/test'

// The lifecycle fixture is self-contained; it does not need an app build/server.
export default defineConfig({
  testDir: '.',
  testMatch: 'offscreen-lifecycle.spec.ts',
  outputDir: '../.cache/offscreen-lifecycle',
  retries: 0,
  workers: 1,
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
  ],
})
