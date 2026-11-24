import { defineConfig } from '@playwright/test'
import runtime from './playwright.python-runtime.config'

/**
 * As regiões no Raylib 3D do Python (lote 7b da conclusão, 22/11/2026): só a prova da rota pelas
 * regiões do `python-raylib.spec.ts` e, desde o lote 6 dos mundos de 2 km (23/11/2026), a do relevo
 * de mundo grande, com o servidor de provas e a distribuição montada daqui.
 * Roda no job `python-browser-isolation` do `studio-mission.yml` (no Windows o servidor exige
 * Bun 1.4).
 */
export default defineConfig(runtime, {
  testMatch: ['python-raylib.spec.ts'],
  grep: /cenário com regiões|relevo de mundo grande/,
  retries: 0,
  projects: [{ name: 'chromium', use: { channel: 'chromium' } }],
})
