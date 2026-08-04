import { defineConfig, devices } from '@playwright/test'

/**
 * Configuração mínima Playwright. Roda contra uma instância própria do Vite
 * para evitar testes contra servidores antigos de desenvolvimento.
 *
 * Além do boot, a suíte percorre criação/reabertura de projetos, colagem e
 * arrasto de blocos, instalação de extensões, Ponte, preview e interações reais,
 * inclusive em layouts estreitos.
 *
 * ⚠️ O projeto `firefox` existe porque o preview JÁ QUEBROU inteiro fora do
 * Chromium sem ninguém perceber: a CSP do srcdoc autorizava o JS do aluno por
 * hash SHA-256 + `integrity`, e casar fonte de hash com script EXTERNO é CSP
 * nível 3 que só o Chromium implementa (bug 1409200 do Firefox). O preview
 * carregava vivo e o programa nunca rodava. Rodar SÓ em Chromium não enxerga
 * essa classe de bug. O CI segue no subconjunto Chromium (ver ci.yml); os dois
 * navegadores rodam no `bun run e2e` manual — instale o Firefox uma vez com
 * `bunx playwright install firefox`.
 */
const e2ePort = Number(process.env.E2E_PORT ?? 5195)
const baseURL = `http://127.0.0.1:${e2ePort}`
const reuseExistingServer = process.env.PW_REUSE_SERVER === '1'
const outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR ?? './.cache/playwright-results'

export default defineConfig({
  testDir: './e2e',
  outputDir,
  fullyParallel: false,
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
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    // Sobe o playground do package (ver playground/vite.config.ts).
    command: `bun run dev --host 127.0.0.1 --port ${e2ePort} --strictPort`,
    url: baseURL,
    reuseExistingServer,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 60_000,
  },
})
