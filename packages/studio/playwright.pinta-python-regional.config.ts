import { defineConfig } from '@playwright/test'

const port = process.env.PYTHON_PROBE_PORT ?? '5569'
export default defineConfig({
  testDir: './e2e-runtime',
  testMatch: 'python-pinta-regional.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 20000 },
  outputDir: '.cache/pinta-python-regional-results',
  reporter: [
    ['list'],
    ['json', { outputFile: '.cache/pinta-python-regional-results/report.json' }],
  ],
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true, trace: 'retain-on-failure' },
  projects: [{ name: 'chrome', use: { channel: 'chrome' } }, { name: 'chromium' }],
})
