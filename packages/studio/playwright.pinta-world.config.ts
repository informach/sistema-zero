import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PINTA_WORLD_PROOF_PORT ?? 5405)
export default defineConfig({
  testDir: './e2e',
  testMatch: 'pinta-world-compatibility.flow.ts',
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  outputDir: './.cache/pinta-world-proof-results',
  reporter: [['list'], ['json', { outputFile: './.cache/pinta-world-proof-results/report.json' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun scripts/serve-pinta-world-proof.ts',
    url: `http://127.0.0.1:${port}/current.html`,
    timeout: 120_000,
  },
})
