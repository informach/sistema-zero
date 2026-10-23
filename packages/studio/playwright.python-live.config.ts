import { defineConfig, devices } from '@playwright/test'
import { pythonEditorWebServer } from './playwright.python-editor.config'

const directory = process.env.PYTHON_LIVE_OUTPUT_DIR ?? '../../.cache/studio-python-live-results'
export default defineConfig({
  testDir: './e2e-python-editor',
  testMatch: ['live-runtime.spec.ts', 'live-performance.spec.ts'],
  outputDir: `${directory}/artifacts`,
  workers: 1,
  retries: 0,
  timeout: 90000,
  reporter: [
    ['list'],
    ['json', { outputFile: `${directory}/report.json` }],
    // Discovery collects no samples and must not pretend to run the budget gate.
    ...(process.env.PYTHON_LIVE_WORKLOAD === 'f1' && !process.argv.includes('--list')
      ? ([['./e2e-python-editor/f1AcceptanceReporter.ts']] as [string][])
      : []),
  ],
  use: { baseURL: 'http://127.0.0.1:5298', trace: 'retain-on-failure' },
  projects: ['chrome', 'msedge'].map((channel) => ({
    name: channel,
    use: { ...devices['Desktop Chrome'], channel },
  })),
  webServer: [
    {
      command: 'bun ../../experiments/studio-python-runtime/server.ts',
      url: 'http://127.0.0.1:5297',
      reuseExistingServer: false,
      timeout: 60000,
      env: { PYTHON_PROBE_EDITOR: '1' },
    },
    pythonEditorWebServer,
  ],
})
