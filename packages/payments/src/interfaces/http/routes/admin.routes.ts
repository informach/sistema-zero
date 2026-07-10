import { Elysia } from 'elysia'
import type { CancelSubscriptionService } from '../../../application/cancel-subscription/cancel-subscription.service'
import type { GetAdminPaymentService } from '../../../application/get-admin-payment/get-admin-payment.service'
import type { GetAdminSubscriptionService } from '../../../application/get-admin-subscription/get-admin-subscription.service'
import type { ListPaymentsService } from '../../../application/list-payments/list-payments.service'
import type { ListSubscriptionsService } from '../../../application/list-subscriptions/list-subscriptions.service'
import type { GetPaymentsOpsService } from '../../../application/payments-ops/get-payments-ops.service'
import type { GetDailyPaymentsStatsService } from '../../../application/payments-stats/get-daily-payments-stats.service'
import type { GetPaymentsStatsService } from '../../../application/payments-stats/get-payments-stats.service'
import type { GetSubscriptionStatsService } from '../../../application/payments-stats/get-subscription-stats.service'
import type { RefundPaymentService } from '../../../application/refund-payment/refund-payment.service'
import { requireAdmin, requireAdminWrite } from '../admin-auth'
import {
  AdminIdParam,
  ListPaymentsQuery,
  ListSubscriptionsQuery,
  PaymentsDailyStatsQuery,
  PaymentsStatsQuery,
} from '../dtos'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface AdminRoutesDeps {
  /** Liga a checagem de role (`X-Auth-User-*`). Desligável em dev fora do gateway. */
  requireAdminEnabled: boolean
  /**
   * Token interno do gateway (`x-internal-token`) — prova de que os X-Auth-User-*
   * vieram de lá. Ausente (dev/local sem gateway) = checagem desligada.
   */
  internalToken?: string
  listPayments: ListPaymentsService
  getPayment: GetAdminPaymentService
  listSubscriptions: ListSubscriptionsService
  getSubscription: GetAdminSubscriptionService
  getStats: GetPaymentsStatsService
  getDailyStats: GetDailyPaymentsStatsService
  getSubscriptionStats: GetSubscriptionStatsService
  getOps: GetPaymentsOpsService
  // Escrita admin
  refundPayment: RefundPaymentService
  cancelSubscription: CancelSubscriptionService
}

/**
 * Rotas de LEITURA admin (painel @sistemazero/admin). O RBAC real é do gateway
 * (JWT + role admin/staff para leitura); aqui conferimos os headers `X-Auth-User-*` confiáveis
 * (`requireAdmin`, defesa em profundidade). Caminho `/payments/admin/*` distinto
 * das rotas consumer (`/payments`, `/payments/:id`) p/ gating inequívoco no gateway.
 * Sem auth de consumidor (HMAC) — só chega aqui quem passou pelo gateway.
 */
export function adminRoutes(deps: AdminRoutesDeps) {
  return (
    new Elysia({ prefix: '/payments/admin' })
      .get(
        '/payments',
        async ({ query, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled, deps.internalToken)
          return deps.listPayments.execute({
            q: query.q,
            status: query.status,
            method: query.method,
            consumerId: query.consumerId,
            from: parseDate(query.from),
            to: parseDate(query.to),
            limit: clampLimit(query.limit),
            offset: query.offset ?? 0,
          })
        },
        { query: ListPaymentsQuery },
      )
      .get(
        '/payments/:id',
        async ({ params, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled, deps.internalToken)
          return deps.getPayment.execute(params.id)
        },
        { params: AdminIdParam },
      )
      .get(
        '/subscriptions',
        async ({ query, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled, deps.internalToken)
          return deps.listSubscriptions.execute({
            q: query.q,
            status: query.status,
            consumerId: query.consumerId,
            limit: clampLimit(query.limit),
            offset: query.offset ?? 0,
          })
        },
        { query: ListSubscriptionsQuery },
      )
      .get(
        '/subscriptions/:id',
        async ({ params, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled, deps.internalToken)
          return deps.getSubscription.execute(params.id)
        },
        { params: AdminIdParam },
      )
      .get(
        '/stats',
        async ({ query, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled, deps.internalToken)
          return deps.getStats.execute({ from: parseDate(query.from), to: parseDate(query.to) })
        },
        { query: PaymentsStatsQuery },
      )
      .get(
        '/stats/daily',
        async ({ query, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled, deps.internalToken)
          // Janela default: últimos 30 dias (o BFF normalmente manda explícito).
          const to = parseDate(query.to) ?? new Date()
          const from = parseDate(query.from) ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
          const offerIds = query.offerIds
            ?.split(',')
            .map((id) => id.trim())
            .filter(Boolean)
          return deps.getDailyStats.execute({
            from,
            to,
            ...(offerIds?.length ? { offerIds } : {}),
          })
        },
        { query: PaymentsDailyStatsQuery },
      )
      // Recorrência (cards do painel): ativas/MRR agora + fluxo na janela.
      .get(
        '/stats/subscriptions',
        async ({ query, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled, deps.internalToken)
          return deps.getSubscriptionStats.execute({
            from: parseDate(query.from),
            to: parseDate(query.to),
          })
        },
        { query: PaymentsStatsQuery },
      )
      .get('/ops', async ({ headers }) => {
        requireAdmin(headers, deps.requireAdminEnabled, deps.internalToken)
        return deps.getOps.execute()
      })
      // ── Escrita admin (POST/DELETE não-idempotentes → o gateway não faz retry) ──
      .post(
        '/payments/:id/refund',
        async ({ params, headers }) => {
          requireAdminWrite(headers, deps.requireAdminEnabled, deps.internalToken)
          return deps.refundPayment.execute(params.id)
        },
        { params: AdminIdParam },
      )
      .delete(
        '/subscriptions/:id',
        async ({ params, headers }) => {
          requireAdminWrite(headers, deps.requireAdminEnabled, deps.internalToken)
          return deps.cancelSubscription.executeAdmin(params.id)
        },
        { params: AdminIdParam },
      )
  )
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT
  return Math.min(Math.max(1, limit), MAX_LIMIT)
}

/** Parseia uma data ISO da query; string ausente/ inválida → undefined (sem filtro). */
function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}
