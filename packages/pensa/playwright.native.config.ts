import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'native.spec.ts',
  outputDir: './.cache/playwright-native-results',
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5203', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'bun e2e/native-server.ts', url: 'http://127.0.0.1:5202/health', timeout: 60_000 },
    {
      command: 'bun run dev -- --port 5203 --strictPort',
      url: 'http://localhost:5203',
      env: { PENSA_NATIVE_E2E: '1' },
      timeout: 60_000,
    },
  ],
})
