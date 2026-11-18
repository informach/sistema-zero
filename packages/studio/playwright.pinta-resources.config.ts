import { defineConfig, devices } from '@playwright/test'
import base from './playwright.pinta.config'

export default defineConfig({
  ...base,
  testMatch: 'pinta-resources-scenes.flow.ts',
  outputDir: './.cache/pinta-resources-cpu-results',
  reporter: [
    ['list'],
    ['json', { outputFile: './.cache/pinta-resources-cpu-results/report.json' }],
  ],
  projects: [
    {
      name: 'cpu4x',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } },
    },
  ],
})
