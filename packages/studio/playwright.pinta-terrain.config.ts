import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PINTA_E2E_PORT ?? 5398)
const outputDir = process.env.PINTA_TERRAIN_OUTPUT_DIR ?? './.cache/pinta-terrain-results'
export default defineConfig({
  testDir: './e2e',
  testMatch: 'pinta-terrain-scenes.flow.ts',
  outputDir,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['json', { outputFile: `${outputDir}/report.json` }]],
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'touch', use: { ...devices['Pixel 7'] } },
    { name: 'cpu-4x', metadata: { cpuSlowdown: 4 }, use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'node scripts/serve-e2e.ts',
    cwd: '../pinta',
    env: { PINTA_E2E_PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
    timeout: 120_000,
  },
})
