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

export interface SubscriptionAdminReadRepository {
  list(
    filters: AdminSubscriptionListFilters,
  ): Promise<{ items: SubscriptionAggregate[]; total: number }>
}
