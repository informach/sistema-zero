import { defineConfig, devices } from '@playwright/test'

/**
 * Homologação local do Estúdio Completo Pro: WebContainer real, `npm install`,
 * Vite, edição sem reiniciar o dev-server, terminal e reabertura. Fica fora do CI porque baixa o runtime do
 * WebContainer e os pacotes npm a cada execução (minutos e rede externa); roda
 * sob demanda antes de liberar gravações:
 *
 *   node node_modules/@playwright/test/cli.js test --config=playwright.pro-full.config.ts
 *
 * Usa o Chrome instalado, um worker e nenhum retry: falha de rede ou de memória
 * aparece como falha, não some numa repetição.
 */
const e2ePort = Number(process.env.E2E_PORT ?? 5197)
const baseURL = `http://127.0.0.1:${e2ePort}`

export default defineConfig({
  testDir: './e2e-pro-full',
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? './.cache/playwright-pro-full',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  webServer: {
    command: 'bun run serve:e2e',
    env: { E2E_PORT: String(e2ePort), E2E_OUT_DIR: `.cache/e2e-dist-pro-full-${e2ePort}` },
    url: baseURL,
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 120_000,
  },
})
