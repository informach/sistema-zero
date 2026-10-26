import { defineConfig } from '@playwright/test'

// Start experiments/studio-python-runtime/server.ts before running this suite.
const port = process.env.PYTHON_PROBE_PORT ?? '5298'
const outputDirectory =
  process.env.PYTHON_PROBE_OUTPUT_DIR ??
  `../../.cache/studio-python-runtime/pygame/${new Date().toISOString().replaceAll(':', '-')}`
export default defineConfig({
  testDir: './e2e-runtime',
  testMatch: ['python-pygame.spec.ts', 'python-pygame-performance.spec.ts'],
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  outputDir: `${outputDirectory}/artifacts`,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true, trace: 'retain-on-failure' },
  projects: [{ name: 'chrome', use: { channel: 'chrome' } }],
})
