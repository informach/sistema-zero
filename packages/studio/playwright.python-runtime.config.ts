import { defineConfig } from '@playwright/test'

const port = process.env.PYTHON_PROBE_PORT ?? '5297'
process.env.PYTHON_PROBE_OUTPUT_DIR ??= `../../.cache/studio-python-runtime/runs/${new Date().toISOString().replaceAll(':', '-')}`
const outputDirectory = process.env.PYTHON_PROBE_OUTPUT_DIR
export default defineConfig({
  testDir: './e2e-runtime',
  testMatch:
    process.env.PYTHON_PROBE_NETWORK === 'reference'
      ? ['python-network.spec.ts']
      : [
          'python-runtime.spec.ts',
          'python-bootstrap.spec.ts',
          'python-host-isolation.spec.ts',
          'python-boot-reuse.spec.ts',
          'python-http-compression.spec.ts',
          'python-supervisor.spec.ts',
          'python-provider.spec.ts',
          'python-lifecycle.spec.ts',
          'python-profile.spec.ts',
          'python-turtle.spec.ts',
          'python-games.spec.ts',
          'python-material-profile.spec.ts',
          'python-analysis.spec.ts',
          'python-inspection.spec.ts',
          'python-analysis-controller.spec.ts',
          'python-blockly-editor.spec.ts',
          'python-classic.spec.ts',
          'python-capture-profile.spec.ts',
          'python-controller.spec.ts',
          'python-preview.spec.ts',
          'python-lesson-runtime.spec.ts',
        ],
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 20_000 },
  outputDir: `${outputDirectory}/artifacts`,
  reporter: [['list'], ['json', { outputFile: `${outputDirectory}/report.json` }]],
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true, trace: 'retain-on-failure' },
  projects: [
    { name: 'chrome', use: { channel: 'chrome' } },
    { name: 'edge', use: { channel: 'msedge' } },
  ],
  webServer: {
    command: 'bun ../../experiments/studio-python-runtime/server.ts',
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
