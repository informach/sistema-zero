import { defineConfig } from '@playwright/test'
import base from './playwright.config'

/** Serial qualification of the page-free basic 3D gallery; no hidden retry. */
export default defineConfig({
  ...base,
  testMatch: ['examples-gallery.spec.ts', 'three-native-kits.spec.ts'],
  grep: /game-3d:|Jogo 3D nativo:/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  globalTimeout: 12 * 60_000,
  projects: [{ name: 'chrome', use: { channel: 'chrome' } }],
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile: `${process.env.PLAYWRIGHT_OUTPUT_DIR ?? '.cache/three-page-free'}/report.json`,
      },
    ],
  ],
})
