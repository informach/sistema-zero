import { defineConfig, devices } from '@playwright/test'
import base from './playwright.pinta-authority.config'

const port = Number(process.env.PINTA_MINIMAP_PORT ?? 5495)
export default defineConfig({
  ...base,
  testMatch: 'pinta-minimap.flow.ts',
  outputDir: './.cache/pinta-minimap-results',
  reporter: [['list'], ['json', { outputFile: './.cache/pinta-minimap-results/report.json' }]],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'touch', use: { ...devices['Pixel 7'] } },
    { name: 'cpu-4x', metadata: { cpuSlowdown: 4 }, use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    ...base.webServer,
    command: 'bun scripts/serve-authority-e2e.ts',
    cwd: '../pinta',
    env: { PINTA_AUTHORITY_PORT: String(port) },
    url: `http://127.0.0.1:${port}/proof/current.html`,
  },
})
