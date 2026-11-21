import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.SCENE2D_PROOF_PORT ?? 5418)
export default defineConfig({
  testDir: './e2e',
  testMatch: 'scene2d-export.flow.ts',
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  outputDir: '.cache/mission/scene2d-export-results',
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { executablePath: process.env.PW_CHROMIUM },
      },
    },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'bun scripts/serve-scene2d-export-proof.ts',
    url: `http://127.0.0.1:${port}`,
    timeout: 120_000,
  },
})
