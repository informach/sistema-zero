import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-authority.config'

export default defineConfig({
  ...base,
  testMatch: 'pinta-future-recovery.flow.ts',
  outputDir: './.cache/pinta-future-recovery-results',
  reporter: [
    ['list'],
    ['json', { outputFile: './.cache/pinta-future-recovery-results/report.json' }],
  ],
})
