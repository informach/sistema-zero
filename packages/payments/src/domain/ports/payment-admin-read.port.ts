import type { PaymentAggregate } from '../payment/payment.aggregate'
import type { PaymentStatus } from '../payment/payment.status'
import type { PaymentMethodType } from '../value-objects/payment-method'

/**
 * Port (driven) de LEITURA admin de pagamentos. Separado do `PaymentRepository`
 * (escrita, hot-path dos workers) para não inchar o caminho crítico. Devolve
 * agregados de domínio (a aplicação mapeia para a view), além de agregações
 * (stats/ops) puras para o painel.
 */

export interface AdminPaymentListFilters {
  status?: PaymentStatus
  method?: PaymentMethodType
  consumerId?: string
  /** Busca livre: id, txid, providerPaymentId ou e-mail do cliente (ILIKE). */
  q?: string
  /** Janela em `created_at` (inclusive). */
  from?: Date
  to?: Date
  limit: number
  offset: number
}

export interface PaymentStatsRange {
  from?: Date
  to?: Date
}

export interface PaymentStatusBucket {
  status: PaymentStatus
  count: number
  /** Soma de `amount_in_cents` (string — bigint serializado). */
  amountInCents: string
}

export interface PaymentMethodBucket {
  method: PaymentMethodType
  count: number
  amountInCents: string
}

/** Agregações para os cards do painel (receita / contagens). */
export interface PaymentStats {
  totalCount: number
  paidCount: number
  /** Receita confirmada (soma dos PAID). */
  paidAmountInCents: string
  /** Total estornado (soma dos REFUNDED). */
  refundedAmountInCents: string
  byStatus: PaymentStatusBucket[]
  byMethod: PaymentMethodBucket[]
}

/** Saúde das filas/lag (mesmos contadores do /metrics + fila de reconciliação). */
export interface PaymentOpsSnapshot {
  outboxPending: number
  outboxDead: number
  paymentsAwaitingCharge: number
  webhookDeliveriesPending: number
  webhookDeliveriesDead: number
  /** PENDING com cobrança já criada aguardando confirmação (fila de reconciliação). */
  reconcilePending: number
}

export interface PaymentAdminReadRepository {
  list(filters: AdminPaymentListFilters): Promise<{ items: PaymentAggregate[]; total: number }>
  stats(range: PaymentStatsRange): Promise<PaymentStats>
  ops(): Promise<PaymentOpsSnapshot>
}
