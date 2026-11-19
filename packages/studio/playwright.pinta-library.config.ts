import { defineConfig } from '@playwright/test'
import authoring from './playwright.pinta-terrain.config'

const outputDir = process.env.PINTA_LIBRARY_OUTPUT_DIR ?? './.cache/pinta-library-results'
export default defineConfig({
  ...authoring,
  testMatch: 'pinta-library-scenes.flow.ts',
  outputDir,
  reporter: [['list'], ['json', { outputFile: `${outputDir}/report.json` }]],
})
