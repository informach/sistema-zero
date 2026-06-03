import 'server-only'
import type {
  Paginated,
  PaymentOps,
  PaymentStats,
  PaymentView,
  SubscriptionView,
} from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from './gateway'

export interface ListPaymentsParams {
  q?: string
  status?: string
  method?: string
  consumerId?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export interface ListSubscriptionsParams {
  q?: string
  status?: string
  consumerId?: string
  limit?: number
  offset?: number
}

function paymentsQuery(p: ListPaymentsParams): Record<string, string | number | undefined> {
  return {
    q: p.q,
    status: p.status,
    method: p.method,
    consumerId: p.consumerId,
    from: p.from,
    to: p.to,
    limit: p.limit,
    offset: p.offset,
  }
}

// ── Transações (pagamentos) ──
export function listPayments(
  p: ListPaymentsParams,
): Promise<GatewayResponse<Paginated<PaymentView>>> {
  return gatewayFetch('/payments/admin/payments', { query: paymentsQuery(p) })
}

export function getPayment(id: string): Promise<GatewayResponse<PaymentView>> {
  return gatewayFetch(`/payments/admin/payments/${encodeURIComponent(id)}`)
}

export function refundPayment(id: string): Promise<GatewayResponse<PaymentView>> {
  return gatewayFetch(`/payments/admin/payments/${encodeURIComponent(id)}/refund`, {
    method: 'POST',
  })
}

// ── Assinaturas ──
export function listSubscriptions(
  p: ListSubscriptionsParams,
): Promise<GatewayResponse<Paginated<SubscriptionView>>> {
  return gatewayFetch('/payments/admin/subscriptions', {
    query: { q: p.q, status: p.status, consumerId: p.consumerId, limit: p.limit, offset: p.offset },
  })
}

export function getSubscription(id: string): Promise<GatewayResponse<SubscriptionView>> {
  return gatewayFetch(`/payments/admin/subscriptions/${encodeURIComponent(id)}`)
}

export function cancelSubscription(id: string): Promise<GatewayResponse<SubscriptionView>> {
  return gatewayFetch(`/payments/admin/subscriptions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

// ── Stats / Operações ──
export function getPaymentsStats(p: {
  from?: string
  to?: string
}): Promise<GatewayResponse<PaymentStats>> {
  return gatewayFetch('/payments/admin/stats', { query: { from: p.from, to: p.to } })
}

export function getPaymentsOps(): Promise<GatewayResponse<PaymentOps>> {
  return gatewayFetch('/payments/admin/ops')
}
