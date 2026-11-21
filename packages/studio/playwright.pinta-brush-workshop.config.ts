import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-terrain.config'

const port = Number(process.env.PINTA_E2E_PORT ?? 5535)
export default defineConfig({
  ...base,
  testMatch: [
    'pinta-terrain-scenes.flow.ts',
    'pinta-keyboard-scenes.flow.ts',
    'pinta-library-scenes.flow.ts',
    'pinta-level-design-scenes.flow.ts',
    'pinta-brush-workshop-scenes.flow.ts',
  ],
  outputDir: './.cache/pinta-brush-workshop-results',
  reporter: [
    ['list'],
    ['json', { outputFile: './.cache/pinta-brush-workshop-results/report.json' }],
  ],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    ...base.webServer,
    env: { PINTA_E2E_PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
  },
})
