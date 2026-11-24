import { defineConfig } from '@playwright/test'
import authoring from './playwright.pinta-terrain.config'

const outputDir = process.env.PINTA_LEVEL_DESIGN_OUTPUT_DIR ?? './.cache/pinta-level-design-results'
export default defineConfig({
  ...authoring,
  testMatch: 'pinta-level-design-scenes.flow.ts',
  outputDir,
  reporter: [['list'], ['json', { outputFile: `${outputDir}/report.json` }]],
})
