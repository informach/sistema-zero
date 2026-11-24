import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-memory-regions.config'

const port = Number(process.env.PINTA_BACKUP_PORT ?? 5584)
export default defineConfig({
  ...base,
  testMatch: 'pinta-backup-regions.flow.ts',
  outputDir: './.cache/pinta-backup-regions-results',
  reporter: [
    ['list'],
    ['json', { outputFile: './.cache/pinta-backup-regions-results/report.json' }],
  ],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: 'bun scripts/serve-memory-regions-e2e.ts',
    cwd: '../pinta',
    env: { PINTA_MEMORY_PORT: String(port), PINTA_MEMORY_PROBE: 'backup' },
    url: `http://127.0.0.1:${port}`,
    timeout: 120000,
    reuseExistingServer: false,
  },
})
