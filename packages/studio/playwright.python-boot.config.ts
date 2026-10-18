import { defineConfig, devices } from '@playwright/test'

const directory = process.env.PYTHON_BOOT_OUTPUT_DIR ?? '../../.cache/studio-python-boot-results'
export default defineConfig({
  testDir: './e2e-runtime',
  testMatch: ['python-boot-store.spec.ts'],
  outputDir: `${directory}/artifacts`,
  workers: 1,
  retries: 0,
  timeout: 30000,
  reporter: [['list'], ['json', { outputFile: `${directory}/report.json` }]],
  use: { baseURL: 'http://127.0.0.1:5311', trace: 'retain-on-failure' },
  projects: ['chrome', 'msedge'].map((channel) => ({
    name: channel,
    use: { ...devices['Desktop Chrome'], channel },
  })),
  webServer: {
    command: 'bun ../../experiments/studio-python-runtime/bootStoreServer.ts',
    url: 'http://127.0.0.1:5311',
    reuseExistingServer: false,
    timeout: 30000,
  },
})
