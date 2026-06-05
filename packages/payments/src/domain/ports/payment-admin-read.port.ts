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

/** Janela da série diária (obrigatória — o chamador define defaults). */
export interface PaymentDailyRange {
  from: Date
  to: Date
  /** Restringe às vendas destas ofertas (`metadata->>'offerId'`, vindo do funil). */
  offerIds?: string[]
}

/** Bucket de um dia civil (fuso do relatório) da série de vendas. */
export interface PaymentDailyBucket {
  /** Dia civil em `America/Sao_Paulo` (YYYY-MM-DD). */
  day: string
  /** Recebido no dia: soma dos pagamentos CONFIRMADOS naquele dia (`paid_at`),
   *  mesmo que estornados depois — o estorno desconta no dia em que ocorreu. */
  grossAmountInCents: string
  /** Estornado no dia (REFUNDED por dia do estorno: `metadata.refundedAt`). */
  refundedAmountInCents: string
  /** Líquido = recebido − estornado. Pode ser NEGATIVO (estorno de venda antiga). */
  netAmountInCents: string
  /** Cobranças criadas no dia (qualquer status — volume de entrada). */
  transactions: number
  /** Estornos no dia (contagem dos REFUNDED). */
  cancellations: number
}

/** Série temporal diária p/ o gráfico "Gestão de vendas" (buckets esparsos —
 *  dias sem movimento não aparecem; o BFF densifica). */
export interface PaymentDailyStats {
  from: string
  to: string
  days: PaymentDailyBucket[]
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
  /** Idade (s) do item PENDING mais antigo do outbox — null sem backlog. Alerte
   *  na IDADE, não na contagem: 5 itens parados há 1h é pior que 500 de 2s
   *  (pega um poller morto na hora). */
  outboxOldestPendingAgeSeconds: number | null
  /** Idade (s) da entrega PENDING mais antiga — null sem backlog. */
  webhookDeliveriesOldestPendingAgeSeconds: number | null
  /** PENDING com divergência de valor pago (metadata.amountMismatch) — revisão
   *  manual pendente. Sinal de fraude/erro: alerte em > 0. */
  amountMismatchPending: number
}

export interface PaymentAdminReadRepository {
  list(filters: AdminPaymentListFilters): Promise<{ items: PaymentAggregate[]; total: number }>
  stats(range: PaymentStatsRange): Promise<PaymentStats>
  statsDaily(range: PaymentDailyRange): Promise<PaymentDailyStats>
  ops(): Promise<PaymentOpsSnapshot>
}
