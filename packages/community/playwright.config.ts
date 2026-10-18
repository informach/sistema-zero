import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.COMMUNITY_PARITY_BASE_URL ?? 'http://127.0.0.1:43107'
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(baseURL).hostname))
  throw new Error('Parity E2E requires an isolated local community and synthetic account.')

export default defineConfig({
  testDir: './e2e',
  outputDir: './.cache/playwright-results',
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  timeout: 90_000,
  expect: { timeout: 30_000 },
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
