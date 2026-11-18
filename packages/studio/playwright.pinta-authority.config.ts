import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PINTA_AUTHORITY_PORT ?? 5401)
export default defineConfig({
  testDir: './e2e',
  testMatch: 'pinta-authority.flow.ts',
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  outputDir: './.cache/pinta-authority-results',
  reporter: [['list'], ['json', { outputFile: './.cache/pinta-authority-results/report.json' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun scripts/serve-authority-e2e.ts',
    cwd: '../pinta',
    env: { PINTA_AUTHORITY_PORT: String(port) },
    url: `http://127.0.0.1:${port}/proof/current.html`,
    timeout: 120_000,
  },
})
