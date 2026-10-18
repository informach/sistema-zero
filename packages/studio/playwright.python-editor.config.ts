import { defineConfig, devices } from '@playwright/test'

export const pythonEditorWebServer = {
  command: 'node scripts/python-editor-web-server.mjs',
  url: 'http://127.0.0.1:5298',
  reuseExistingServer: false,
  timeout: 120_000,
}

export default defineConfig({
  testDir: './e2e-python-editor',
  testMatch: ['source-editor.spec.ts'],
  outputDir: '../../.cache/studio-python-editor-results',
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5298', trace: 'retain-on-failure' },
  projects: ['chrome', 'msedge'].map((channel) => ({
    name: channel,
    use: { ...devices['Desktop Chrome'], channel },
  })),
  webServer: pythonEditorWebServer,
})
