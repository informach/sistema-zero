import { defineConfig } from '@playwright/test'

const port = Number(process.env.LESSON_LAYOUT_PORT ?? 5203)
export default defineConfig({
  testDir: './e2e-lesson-layout',
  testMatch: 'lesson-layout.spec.ts',
  outputDir: './.cache/lesson-layout-results',
  workers: 1,
  retries: 0,
  globalTimeout: 240_000,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: process.env.CI ? undefined : 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'bun e2e-lesson-layout/fixtures/serve.ts',
    env: { LESSON_LAYOUT_PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
    timeout: 120_000,
    reuseExistingServer: false,
  },
})
