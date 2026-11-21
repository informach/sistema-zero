import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-budget.config'

const port = Number(process.env.PINTA_RENDER_PORT ?? 5492)
export default defineConfig({
  ...base,
  testMatch: ['pinta-render-pressure.flow.ts', 'pinta-region-render.flow.ts'],
  outputDir: './.cache/pinta-render-pressure-results',
  reporter: [
    ['list'],
    ['json', { outputFile: './.cache/pinta-render-pressure-results/report.json' }],
  ],
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  webServer: {
    ...base.webServer,
    command: 'bun scripts/serve-map-budget-e2e.ts',
    cwd: '../pinta',
    env: { PINTA_BUDGET_PORT: String(port), PINTA_RENDER_PROOF: '1' },
    url: `http://127.0.0.1:${port}`,
  },
})
