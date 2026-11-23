import { defineConfig, devices } from '@playwright/test'

/**
 * A medida dos mundos grandes na placa de vídeo desta máquina (plano "Mundos de 2 km", lote 0,
 * 23/11/2026; `e2e/grande-gpu.spec.ts`). Só local, COM janela: sem janela o Chromium cai na placa
 * emulada. A janela coberta por outra é estrangulada pelo navegador (4 a 5 quadros em 2 s, ver
 * `docs/estudio-evolucao/guia-desempenho-e-depuracao.md`); as três primeiras opções desligam isso.
 * Sem a trava de 60 quadros por padrão, para medir a folga (`MUNDO_GPU_VSYNC=1` a devolve).
 *
 * `bunx playwright test --config playwright.gpu.config.ts`
 */
const semTrava =
  process.env.MUNDO_GPU_VSYNC === '1' ? [] : ['--disable-gpu-vsync', '--disable-frame-rate-limit']

export default defineConfig({
  testDir: './e2e',
  testMatch: /grande-gpu\.spec\.ts/,
  outputDir: './.cache/gpu-results',
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
        launchOptions: {
          args: [
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-background-timer-throttling',
            ...semTrava,
          ],
          ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
        },
      },
    },
  ],
})
