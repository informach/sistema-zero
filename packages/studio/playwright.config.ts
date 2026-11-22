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
      // As medidas dos motores (lote 4) têm config e workflow próprios: esperas fixas sobre a GPU
      // emulada não entram na suíte que barra o merge (`playwright.engines.config.ts`).
      testIgnore: [
        /engine-gpu-cycles\.spec\.ts/,
        /engine-2d-offscreen\.spec\.ts/,
        /devtools-cost\.spec\.ts/,
      ],
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['clipboard-read', 'clipboard-write'],
        // Ambiente com um Chromium próprio já instalado (outra revisão que a do pacote):
        // `PW_CHROMIUM=/caminho/do/chrome`. Sem a variável, nada muda.
        ...(process.env.PW_CHROMIUM
          ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } }
          : {}),
      },
    },
    {
      name: 'firefox',
      // Firefox existe para o risco que justificou o segundo engine: CSP/SRI e
      // execução no documento isolado. A galeria completa já é coberta pelo
      // Chromium e duplicá-la adicionava centenas de casos sem sinal novo.
      // A casca em outro site (lote 3.2) existe por causa do Firefox: o arranjo que o isolou.
      // A lixeira e o zoom do Blockly (desenho em vetor, a lixeira por cima, a tampa): cada motor
      // desenha o SVG à sua maneira, e foi no desenho que os ícones sumiram (20/11/2026).
      // Meus testes: o piloto do teste roda dentro do documento da prévia, sob a CSP dele.
      // A execução leve do Pro: módulos em blob e mapa de importação inserido por script, num
      // quadro de origem opaca, é arranjo que cada motor implementa à sua maneira.
      testMatch: [
        /preview-security\.spec\.ts/,
        /preview-executes-user-code\.spec\.ts/,
        /preview-shell(?:-performance|-hostile)?\.spec\.ts/,
        /blockly-media\.spec\.ts/,
        /student-tests\.spec\.ts/,
        /pro-light-runtime\.spec\.ts/,
      ],
      use: {
        ...devices['Desktop Firefox'],
        // O Firefox do Playwright vem com `fission.webContentIsolationStrategy = 0` (iframes de
        // outro site no MESMO processo da página); o Firefox de mesa usa 1 (isolar todo site).
        // Sem devolver o 1, o ensaio media o navegador de teste e não o das famílias: foi assim
        // que a casca pareceu exigir COEP no host (docs/qa/2026-11-20-studio-firefox-site-isolation.md).
        launchOptions: { firefoxUserPrefs: { 'fission.webContentIsolationStrategy': 1 } },
      },
    },
    {
      name: 'webkit',
      // WebKit existe para o motor do iPad, onde a gravação de SAÍDA era a mais frágil: antes do
      // commit explícito (11/09/2026), recarregando logo depois de trazer os arquivos do Molda,
      // a mudança voltou em 0 de 10 recargas. Só os specs dessa gravação: o resto da suíte é
      // coberto pelo Chromium, e duplicá-lo não traria sinal novo.
      // A casca: só o funcionamento (nenhum arranjo de iframe isolou o WebKit na medição).
      // E a lixeira e o zoom do Blockly, como no Firefox (o desenho do SVG é de cada motor), e
      // Meus testes (o palco escondido do teste no motor do iPad).
      // A migração da lista interrompida por recarga (lote 1, item 7): o IndexedDB do iPad.
      testMatch: [
        /reload-flush\.spec\.ts/,
        /migration-interrupted\.spec\.ts/,
        /preview-shell(?:-performance)?\.spec\.ts/,
        /blockly-media\.spec\.ts/,
        /student-tests\.spec\.ts/,
        /pro-light-runtime\.spec\.ts/,
      ],
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'bun run serve:e2e',
    env: { E2E_PORT: String(e2ePort) },
    url: baseURL,
    reuseExistingServer,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120_000,
  },
})
