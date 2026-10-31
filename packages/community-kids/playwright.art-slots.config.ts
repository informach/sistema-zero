import { defineConfig } from '@playwright/test'

const port = Number(process.env.ART_SLOTS_PORT ?? 5207)
export default defineConfig({
  testDir: './e2e-art-slots',
  testMatch: 'art-slots.spec.ts',
  outputDir: './.cache/art-slots-results',
  workers: 1,
  retries: 0,
  timeout: 420_000,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    // Fora do CI, o Chromium do executor (`SZ_CHECK_CHROMIUM`) também abre a página.
    ...(process.env.SZ_CHECK_CHROMIUM
      ? { launchOptions: { executablePath: process.env.SZ_CHECK_CHROMIUM } }
      : {}),
  },
  webServer: {
    command: 'bun e2e-art-slots/fixtures/serve.ts',
    env: { ART_SLOTS_PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
    timeout: 180_000,
    reuseExistingServer: false,
  },
})
