import type { SubscriptionAggregate } from '../subscription/subscription.aggregate'
import type { SubscriptionStatus } from '../subscription/subscription.status'

/** Port (driven) de LEITURA admin de assinaturas (separado da escrita). */
export interface AdminSubscriptionListFilters {
  status?: SubscriptionStatus
  consumerId?: string
  /** Busca livre: id, providerSubscriptionId ou e-mail do cliente (ILIKE). */
  q?: string
  limit: number
  offset: number
}

/** Janela das contagens de fluxo (novas/canceladas). MRR/ativas são o AGORA. */
export interface SubscriptionStatsWindow {
  from: Date
  to: Date
}

/** Agregado de recorrência do painel (cards do "Gestão de vendas"). */
export interface SubscriptionStats {
  /** Assinaturas ATIVAS agora, por periodicidade. */
  active: { total: number; monthly: number; annual: number; other: number }
  /**
   * MRR em CENTAVOS (bigint como string): Σ(amount / intervalMonths) das
   * ativas — a anual contribui 1/12 do valor por mês.
   */
  mrrCents: string
  /** Assinaturas CRIADAS na janela. */
  newInWindow: number
  /** Assinaturas CANCELADAS na janela (canceled_at). */
  canceledInWindow: number
}

export interface SubscriptionAdminReadRepository {
  list(
    filters: AdminSubscriptionListFilters,
  ): Promise<{ items: SubscriptionAggregate[]; total: number }>
  stats(window: SubscriptionStatsWindow): Promise<SubscriptionStats>
}
