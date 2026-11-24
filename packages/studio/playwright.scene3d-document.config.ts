import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.SCENE3D_PROOF_PORT ?? 5417)
export default defineConfig({
  testDir: './e2e',
  testMatch: 'scene3d-document.flow.ts',
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  outputDir: '.cache/mission/scene3d-document-results',
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
  ],
  webServer: {
    command: 'bun scripts/serve-scene3d-public-proof.ts',
    url: `http://127.0.0.1:${port}`,
    timeout: 120_000,
  },
})
