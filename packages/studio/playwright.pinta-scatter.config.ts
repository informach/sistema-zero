import { defineConfig } from '@playwright/test'
import authoring from './playwright.pinta-terrain.config'

const outputDir = process.env.PINTA_SCATTER_OUTPUT_DIR ?? './.cache/pinta-scatter-results'
export default defineConfig({
  ...authoring,
  testMatch: 'pinta-object-scatter-scenes.flow.ts',
  outputDir,
  reporter: [['list'], ['json', { outputFile: `${outputDir}/report.json` }]],
})
