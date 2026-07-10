import type {
  SubscriptionAdminReadRepository,
  SubscriptionStats,
} from '../../domain/ports/subscription-admin-read.port'

const DEFAULT_WINDOW_DAYS = 30

/**
 * Agregado de RECORRÊNCIA do painel: ativas por periodicidade + MRR (Σ do valor
 * mensalizado das ativas — a anual entra com 1/12) + fluxo (novas/canceladas)
 * na janela + churn simples = canceladas / (ativas no fim + canceladas).
 */
export class GetSubscriptionStatsService {
  constructor(private readonly subscriptions: SubscriptionAdminReadRepository) {}

  async execute(input: {
    from?: Date
    to?: Date
  }): Promise<SubscriptionStats & { churnRate: number; from: string; to: string }> {
    const to = input.to ?? new Date()
    const from = input.from ?? new Date(to.getTime() - DEFAULT_WINDOW_DAYS * 86_400_000)
    const stats = await this.subscriptions.stats({ from, to })
    const denominator = stats.active.total + stats.canceledInWindow
    const churnRate = denominator > 0 ? stats.canceledInWindow / denominator : 0
    return { ...stats, churnRate, from: from.toISOString(), to: to.toISOString() }
  }
}
