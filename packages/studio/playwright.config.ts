import { defineConfig, devices } from '@playwright/test'

/**
 * Roda contra um build de produção próprio servido pelo Vite Preview. Isso
 * remove reotimizações e full reloads do dev server no meio de uma interação.
 *
 * Além do boot, a suíte percorre criação/reabertura de projetos, colagem e
 * arrasto de blocos, instalação de extensões, Ponte, preview e interações reais,
 * inclusive em layouts estreitos. O projeto Firefox cobre diferenças reais de
 * CSP/SRI que já quebraram a execução inteira do código do aluno.
 */
const e2ePort = Number(process.env.E2E_PORT ?? 5195)
const baseURL = `http://127.0.0.1:${e2ePort}`
const reuseExistingServer = process.env.PW_REUSE_SERVER === '1'
const outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR ?? './.cache/playwright-results'

export default defineConfig({
  testDir: './e2e',
  outputDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
    {
      name: 'firefox',
      // Firefox existe para o risco que justificou o segundo engine: CSP/SRI e
      // execução no documento isolado. A galeria completa já é coberta pelo
      // Chromium e duplicá-la adicionava centenas de casos sem sinal novo.
      testMatch: [/preview-security\.spec\.ts/, /preview-executes-user-code\.spec\.ts/],
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'bun run serve:e2e',
    env: { E2E_PORT: String(e2ePort) },
    url: baseURL,
    reuseExistingServer,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 120_000,
  },
})
