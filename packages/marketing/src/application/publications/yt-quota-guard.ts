import type { QuotaUsageRepository } from '../../domain/ports/quota-usage-repository.port'

/**
 * Orçamento de quota do YouTube Data API. O dia de quota vira à MEIA-NOITE PT
 * (America/Los_Angeles — fuso do Google, não o nosso). Dois tetos: unidades
 * (`YT_QUOTA_BUDGET_UNITS`, com folga p/ métricas) e uploads/dia
 * (`YT_UPLOAD_DAILY_CAP`). Estouro → o publisher adia (`deferred`) para depois
 * da virada, SEM gastar tentativa.
 */
const PROVIDER = 'youtube'

const PT_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Dia de quota corrente (YYYY-MM-DD em PT). */
export function quotaDayPt(now: Date): string {
  return PT_DAY.format(now)
}

/**
 * Próxima virada do dia de quota. `T08:00:00Z` do dia PT seguinte é sempre
 * >= meia-noite PT (exato em PST; até 1h depois em PDT — folga aceitável) +
 * jitter para não estourar tudo no mesmo segundo.
 */
export function nextQuotaResetPt(now: Date, jitterMs: number): Date {
  const today = quotaDayPt(now)
  const next = new Date(`${today}T08:00:00Z`)
  // Se 08:00Z de hoje (PT) já passou, o reset é o de amanhã.
  while (next.getTime() <= now.getTime() || quotaDayPt(next) === today) {
    next.setUTCDate(next.getUTCDate() + 1)
  }
  return new Date(next.getTime() + jitterMs)
}

export interface QuotaGuardConfig {
  budgetUnits: number
  uploadDailyCap: number
}

export class YtQuotaGuard {
  constructor(
    private readonly usage: QuotaUsageRepository,
    private readonly config: QuotaGuardConfig,
    private readonly now: () => Date,
  ) {}

  /**
   * Reserva `units` (e 1 upload quando `isUpload`). Devolve false quando o
   * orçamento do dia não comporta — o chamador adia p/ a virada. Leitura →
   * incremento (worker único e serial; corrida teórica só superestima o gasto).
   */
  async tryReserve(input: { units: number; isUpload: boolean }): Promise<boolean> {
    const day = quotaDayPt(this.now())
    const current = await this.usage.get(PROVIDER, day)
    if (current.units + input.units > this.config.budgetUnits) return false
    if (input.isUpload && current.uploads + 1 > this.config.uploadDailyCap) return false
    await this.usage.add(PROVIDER, day, input.units, input.isUpload ? 1 : 0)
    return true
  }
}
