import { defineConfig } from '@playwright/test'

// This spec owns its Vite build/server. The server adapter is controlled;
// actual Chrome/Edge exercise React/Monaco/IndexedDB, not BFF/SDK authentication.
export default defineConfig({
  testDir: './e2e',
  testMatch: 'pro-builder-review.spec.ts',
  outputDir: '../../.cache/studio-python-l0/builder-review-browser',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'chrome', use: { browserName: 'chromium', channel: 'chrome' } },
    { name: 'edge', use: { browserName: 'chromium', channel: 'msedge' } },
  ],
})
