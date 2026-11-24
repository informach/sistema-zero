import { defineConfig } from '@playwright/test'

const port = process.env.PYTHON_PROBE_PORT ?? '5579'
const output = process.env.PYTHON_PROBE_OUTPUT_DIR ?? '../../.cache/pinta-python-2d-browser'

export default defineConfig({
  testDir: './e2e-runtime',
  testMatch: ['python-pinta-2d-browser.spec.ts', 'pinta-project-regional-js.spec.ts'],
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  outputDir: `${output}/artifacts`,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true, trace: 'retain-on-failure' },
  projects: [{ name: 'chrome', use: { channel: 'chrome' } }, { name: 'chromium' }],
})
