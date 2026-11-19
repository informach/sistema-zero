import { defineConfig } from '@playwright/test'
import authoring from './playwright.pinta-terrain.config'

const outputDir = process.env.PINTA_KEYBOARD_OUTPUT_DIR ?? './.cache/pinta-keyboard-results'
export default defineConfig({
  ...authoring,
  testMatch: 'pinta-keyboard-scenes.flow.ts',
  outputDir,
  reporter: [['list'], ['json', { outputFile: `${outputDir}/report.json` }]],
})
