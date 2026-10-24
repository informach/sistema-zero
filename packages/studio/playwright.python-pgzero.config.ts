import { defineConfig } from '@playwright/test'

// Pygame Zero runtime proofs. Start the probe server first (one worker: the games are heavy).
const port = process.env.PYTHON_PROBE_PORT ?? '5297'
const outputDirectory =
  process.env.PYTHON_PROBE_OUTPUT_DIR ??
  `../../.cache/studio-python-runtime/pgzero/${new Date().toISOString().replaceAll(':', '-')}`
export default defineConfig({
  testDir: './e2e-runtime',
  testMatch: ['python-pgzero.spec.ts'],
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  outputDir: `${outputDirectory}/artifacts`,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true, trace: 'retain-on-failure' },
  projects: [{ name: 'chrome', use: { channel: 'chrome' } }],
})
