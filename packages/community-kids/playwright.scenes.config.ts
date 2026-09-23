import { defineConfig } from '@playwright/test'

const port = Number(process.env.SCENE_E2E_PORT ?? 5198)

export default defineConfig({
  testDir: './e2e-scenes',
  outputDir: './.cache/scene-results',
  workers: 1,
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  webServer: {
    command: 'bun e2e-scenes/fixtures/serve.ts',
    env: { SCENE_E2E_PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
    timeout: 120_000,
  },
})
