import { defineConfig, devices } from '@playwright/test'

/**
 * As medidas dos motores (lote 4 da missão, seção 8, 21/11/2026): a GPU em 10 recomeços
 * (`engine-gpu-cycles.spec.ts`) e o custo de desenhar sprites fora do palco
 * (`engine-2d-offscreen.spec.ts`), e o custo das abas Desempenho e Investigar no processo do jogo
 * (`devtools-cost.spec.ts`, lote 3 da conclusão, 22/11/2026). Esperas fixas sobre a GPU emulada não entram na suíte que barra
 * o merge (`playwright.config.ts` as ignora); rodam no workflow `studio-engines.yml` e localmente
 * com `bunx playwright test --config playwright.engines.config.ts`.
 */
const port = Number(process.env.E2E_PORT ?? 5195)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  testMatch: [
    /engine-gpu-cycles\.spec\.ts/,
    /engine-2d-offscreen\.spec\.ts/,
    /devtools-cost\.spec\.ts/,
    /engine-regions\.spec\.ts/,
  ],
  outputDir: './.cache/engines-results',
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PW_CHROMIUM
          ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } }
          : {}),
      },
    },
  ],
  webServer: {
    command: 'bun run serve:e2e',
    env: { E2E_PORT: String(port) },
    url: baseURL,
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120_000,
  },
})
