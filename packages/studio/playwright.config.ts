import { defineConfig, devices } from '@playwright/test'

/**
 * Roda contra um build de produção próprio servido pelo Vite Preview. Isso
 * remove reotimizações e full reloads do dev server no meio de uma interação.
 *
 * Além do boot, a suíte percorre criação/reabertura de projetos, colagem e
 * arrasto de blocos, instalação de extensões, Ponte, preview e interações reais,
 * inclusive em layouts estreitos. O projeto Firefox cobre diferenças reais de
 * CSP/SRI que já quebraram a execução inteira do código do aluno, e o WebKit
 * (o motor do iPad) cobre a gravação de quando a página vai embora.
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
    {
      name: 'webkit',
      // WebKit existe para o motor do iPad, onde a gravação de SAÍDA era a mais frágil: antes do
      // commit explícito (11/09/2026), recarregando logo depois de trazer os arquivos do Molda,
      // a mudança voltou em 0 de 10 recargas. Só os specs dessa gravação: o resto da suíte é
      // coberto pelo Chromium, e duplicá-lo não traria sinal novo.
      testMatch: [/reload-flush\.spec\.ts/],
      use: { ...devices['Desktop Safari'] },
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
