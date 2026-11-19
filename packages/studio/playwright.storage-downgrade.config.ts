import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.STORAGE_DOWNGRADE_PORT ?? 5406)
const browser = process.env.STORAGE_DOWNGRADE_BROWSER ?? 'chromium'
const projects = {
  chromium: {
    ...devices['Desktop Chrome'],
    ...(process.env.PW_CHROMIUM
      ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } }
      : {}),
  },
  firefox: devices['Desktop Firefox'],
  webkit: devices['Desktop Safari'],
} as const
export default defineConfig({
  testDir: './e2e',
  testMatch: 'storage-downgrade.flow.ts',
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  outputDir: './.cache/storage-downgrade-results',
  reporter: [['list'], ['json', { outputFile: './.cache/storage-downgrade-results/report.json' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  projects: (browser === 'all'
    ? (Object.keys(projects) as Array<keyof typeof projects>)
    : [browser as keyof typeof projects]
  ).map((name) => ({ name, use: projects[name] })),
  webServer: {
    command: 'bun scripts/serve-storage-downgrade-proof.ts',
    url: `http://127.0.0.1:${port}/current.html`,
    timeout: 120_000,
  },
})
