/**
 * Política PURA do decaimento de frequência da coleta de métricas (plano
 * mestre): post novo muda rápido, post velho quase não muda — coletar tudo na
 * mesma cadência desperdiça quota e polui as séries.
 */
const HOUR_MS = 60 * 60_000
const DAY_MS = 24 * HOUR_MS

/**
 * Delay até a PRÓXIMA coleta, pela idade da publicação:
 * <48h → 1h · <14d → 6h · <90d → 24h · <maxAgeDays → 7d · além → null
 * (fora do radar — a publicação para de ser coletada).
 */
export function nextCollectDelayMs(
  publishedAt: Date,
  now: Date,
  maxAgeDays: number,
): number | null {
  const ageMs = now.getTime() - publishedAt.getTime()
  if (ageMs < 48 * HOUR_MS) return HOUR_MS
  if (ageMs < 14 * DAY_MS) return 6 * HOUR_MS
  if (ageMs < 90 * DAY_MS) return DAY_MS
  if (ageMs < maxAgeDays * DAY_MS) return 7 * DAY_MS
  return null
}

/** Data da próxima coleta (ou null quando o post saiu do radar). */
export function nextCollectAt(publishedAt: Date, now: Date, maxAgeDays: number): Date | null {
  const delay = nextCollectDelayMs(publishedAt, now, maxAgeDays)
  return delay === null ? null : new Date(now.getTime() + delay)
}
