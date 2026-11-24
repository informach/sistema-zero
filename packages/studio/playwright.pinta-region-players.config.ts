import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'pinta-region-players.flow.ts',
  outputDir: process.env.PINTA_REGION_PLAYER_OUTPUT_DIR ?? './.cache/pinta-region-players-results',
  workers: 1,
  retries: 0,
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'touch', use: { ...devices['Pixel 7'] } },
  ],
})
