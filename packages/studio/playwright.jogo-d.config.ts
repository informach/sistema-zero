import { defineConfig, devices } from '@playwright/test'

/**
 * Prova do jogo D (lote 8 da conclusão do plano do Estúdio, 22/11/2026): recibo na prévia e no
 * site exportado, desempenho nas condições de referência (Chromium do Playwright, 1280 × 720,
 * palco 640 × 480, DPR 1), sessão longa com o robô (JOGO_D_SESSAO_MS, 10 minutos no CI), volta
 * com o estado, cama que guarda e destino quebrado. Roda no `studio-engines.yml`.
 */
const port = Number(process.env.JOGO_D_PROOF_PORT ?? 5421)
/** O Estúdio do playground (o mesmo do `serve:e2e`), para abrir o jogo D nos blocos. */
export const JOGO_D_EDITOR_PORT = Number(process.env.JOGO_D_EDITOR_PORT ?? 5196)
export default defineConfig({
  testDir: './e2e',
  testMatch: 'jogo-d.flow.ts',
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: Number(process.env.JOGO_D_SESSAO_MS ?? 120_000) + 180_000,
  outputDir: '.cache/mission/jogo-d-results',
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        launchOptions: { executablePath: process.env.PW_CHROMIUM },
      },
    },
  ],
  webServer: [
    {
      command: 'bun scripts/serve-jogo-d-proof.ts',
      url: `http://127.0.0.1:${port}`,
      timeout: 180_000,
    },
    {
      command: 'bun run serve:e2e',
      env: { E2E_PORT: String(JOGO_D_EDITOR_PORT) },
      url: `http://127.0.0.1:${JOGO_D_EDITOR_PORT}`,
      timeout: 420_000,
    },
  ],
})
