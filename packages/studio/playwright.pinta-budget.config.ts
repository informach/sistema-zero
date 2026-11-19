import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PINTA_BUDGET_PORT ?? 5403)
export default defineConfig({
  testDir: './e2e',
  testMatch: 'pinta-budget.flow.ts',
  outputDir: './.cache/pinta-budget-results',
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: './.cache/pinta-budget-results/report.json' }]],
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'touch', use: { ...devices['Pixel 7'] } },
    { name: 'cpu-4x', metadata: { cpuSlowdown: 4 }, use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'bun scripts/serve-map-budget-e2e.ts',
    cwd: '../pinta',
    env: { PINTA_BUDGET_PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
    timeout: 30_000,
  },
})
