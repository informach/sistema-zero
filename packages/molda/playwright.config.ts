import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.E2E_PORT ?? 5198)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  outputDir: './.cache/playwright-results',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  expect: {
    toHaveScreenshot: {
      pathTemplate:
        '{testDir}/../../../docs/plans/references/2026-10-15-molda-fidelidade/implemented/{arg}{ext}',
      maxDiffPixels: 100,
      animations: 'disabled',
    },
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], hasTouch: true } },
    {
      name: 'firefox',
      testMatch: /(scene-workshop|simple-uv|pixel-cutouts|gallery-model-import)\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: /(scene-workshop|simple-uv|pixel-cutouts|gallery-model-import)\.spec\.ts/,
      use: { ...devices['Desktop Safari'], hasTouch: true },
    },
  ],
  webServer: {
    command: 'bun run serve:e2e',
    env: { E2E_PORT: String(port) },
    url: baseURL,
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
    timeout: 120_000,
  },
})
