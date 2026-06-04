import 'server-only'
import type {
  DailyPaymentBucket,
  DailyPaymentStats,
  Paginated,
  PaymentOps,
  PaymentStats,
  PaymentView,
  SubscriptionView,
} from '@/lib/types'
import { listOffers } from './catalog'
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

// ── Série diária ("Gestão de vendas") ──

/** Mesmo fuso do bucket no payments — o calendário denso precisa casar. */
const REPORT_TZ = 'America/Sao_Paulo'
const DAY_MS = 24 * 60 * 60 * 1000

// en-CA → YYYY-MM-DD (chave lexicograficamente ordenável).
const dayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: REPORT_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function zeroBucket(day: string): DailyPaymentBucket {
  return {
    day,
    grossAmountInCents: '0',
    refundedAmountInCents: '0',
    netAmountInCents: '0',
    transactions: 0,
    cancellations: 0,
  }
}

/**
 * Densifica a série: o payments devolve buckets esparsos (só dias com movimento);
 * aqui geramos TODOS os dias civis (BRT) da janela, com zeros nos vazios, e
 * somamos os totais do período (BigInt — os valores são bigint serializado).
 */
function densify(from: Date, to: Date, sparse: DailyPaymentBucket[]): DailyPaymentStats {
  const byDay = new Map(sparse.map((b) => [b.day, b]))
  const days: DailyPaymentBucket[] = []
  const lastKey = dayFmt.format(to)
  // Passos de 24h são seguros: o Brasil não tem mais horário de verão (UTC-3 fixo).
  for (let t = from.getTime(); ; t += DAY_MS) {
    const key = dayFmt.format(new Date(t))
    if (days.length === 0 || days[days.length - 1]?.day !== key) {
      days.push(byDay.get(key) ?? zeroBucket(key))
    }
    if (key >= lastKey) break
  }

  let gross = 0n
  let refunded = 0n
  let transactions = 0
  let cancellations = 0
  for (const b of days) {
    gross += BigInt(b.grossAmountInCents)
    refunded += BigInt(b.refundedAmountInCents)
    transactions += b.transactions
    cancellations += b.cancellations
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    days,
    totals: {
      netAmountInCents: (gross - refunded).toString(),
      grossAmountInCents: gross.toString(),
      refundedAmountInCents: refunded.toString(),
      transactions,
      cancellations,
    },
  }
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

/**
 * Série diária densa p/ o painel. Com `productId`, resolve as ofertas do produto
 * no catálogo e filtra as vendas por `offerIds` (a venda referencia a oferta via
 * `metadata.offerId`); produto sem ofertas → série zerada (sem ir ao payments).
 */
export async function getDailyPaymentsStats(p: {
  from?: string
  to?: string
  productId?: string
}): Promise<GatewayResponse<DailyPaymentStats>> {
  const to = parseDate(p.to) ?? new Date()
  const from = parseDate(p.from) ?? new Date(to.getTime() - 30 * DAY_MS)

  let offerIds: string[] | undefined
  if (p.productId) {
    const offers = await listOffers({ productId: p.productId, limit: 100 })
    if (offers.status !== 200) {
      return offers as unknown as GatewayResponse<DailyPaymentStats>
    }
    offerIds = offers.body.items.map((o) => o.id)
    if (offerIds.length === 0) return { status: 200, body: densify(from, to, []) }
  }

  const res = await gatewayFetch<{ days: DailyPaymentBucket[] }>('/payments/admin/stats/daily', {
    query: {
      from: from.toISOString(),
      to: to.toISOString(),
      // `undefined` = sem filtro (o gatewayFetch descarta valores vazios).
      offerIds: offerIds?.length ? offerIds.join(',') : undefined,
    },
  })
  if (res.status !== 200) return res as unknown as GatewayResponse<DailyPaymentStats>
  return { status: 200, body: densify(from, to, res.body.days ?? []) }
}
