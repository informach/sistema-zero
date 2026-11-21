import type { Page } from '@playwright/test'

/**
 * Aparelho modesto EMULADO (frente 5 da evolução do Estúdio, 21/11/2026; decisão da dona: só
 * emulação no CI). Com `STUDIO_CPU_THROTTLE=4` (ou 6), a CPU do editor é desacelerada pelo CDP
 * (`Emulation.setCPUThrottlingRate`). Só o Chromium tem essa emulação: nos outros motores, e sem a
 * variável, devolve 1 e nada muda. Os números medidos assim valem como "emulado, não conferido em
 * aparelho físico".
 */
export async function applyCpuThrottle(page: Page, browserName: string): Promise<number> {
  const rate = Number(process.env.STUDIO_CPU_THROTTLE ?? 1)
  if (!Number.isFinite(rate) || rate < 1 || rate > 20)
    throw new Error('STUDIO_CPU_THROTTLE deve ser um número de 1 a 20.')
  if (rate === 1 || browserName !== 'chromium') return 1
  const session = await page.context().newCDPSession(page)
  await session.send('Emulation.setCPUThrottlingRate', { rate })
  return rate
}

/** Sufixo dos arquivos de resultado medidos com a CPU desacelerada (`-cpu4`), vazio sem ela. */
export function cpuSuffix(rate: number): string {
  return rate > 1 ? `-cpu${rate}` : ''
}
