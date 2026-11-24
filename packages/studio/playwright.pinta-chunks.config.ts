import { defineConfig, devices } from '@playwright/test'
import base from './playwright.pinta-authority.config'

export default defineConfig({
  ...base,
  testMatch: 'pinta-local-chunks.flow.ts',
  outputDir: './.cache/pinta-local-chunks-results',
  reporter: [['list'], ['json', { outputFile: './.cache/pinta-local-chunks-results/report.json' }]],
  projects: [
    {
      name: 'desktop',
      testMatch: ['pinta-local-chunks.flow.ts', 'pinta-authority.flow.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    { name: 'cpu-4x', use: { ...devices['Desktop Chrome'] } },
  ],
})
