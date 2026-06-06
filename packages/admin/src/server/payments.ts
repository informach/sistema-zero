import 'server-only'
import { computeGuarantee } from '@/lib/guarantee'
import { buildStats, clampWindow, DAY_MS } from '@/lib/sales-series'
import type {
  DailyPaymentBucket,
  DailyPaymentStats,
  Paginated,
  PaymentOps,
  PaymentRow,
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

// ── Garantia (oferta comprada) ──

/** `metadata.offerId` da venda (gravado pelo funil) — ausente em vendas antigas/manuais. */
function offerIdOf(p: PaymentView): string | null {
  const v = p.metadata?.offerId
  return typeof v === 'string' && v.length > 0 ? v : null
}

/**
 * Resolve `offerId → guaranteeDays` em LOTE (1 chamada ao catálogo, limit 100 —
 * suficiente p/ o catálogo atual; ofertas além disso degradam p/ `null`).
 * Best-effort: catálogo indisponível → mapa vazio (transações seguem úteis).
 */
async function buildGuaranteeMap(offerIds: string[]): Promise<Map<string, number | null>> {
  const map = new Map<string, number | null>()
  if (offerIds.length === 0) return map
  try {
    const res = await listOffers({ limit: 100 })
    if (res.status !== 200) return map
    for (const offer of res.body.items) map.set(offer.id, offer.guaranteeDays)
  } catch {
    // best-effort: sem catálogo, sem garantia exibida.
  }
  return map
}

/** Anexa a garantia a cada transação (lista paginada). */
export async function listPaymentsWithGuarantee(
  p: ListPaymentsParams,
): Promise<GatewayResponse<Paginated<PaymentRow>>> {
  const res = await listPayments(p)
  if (res.status !== 200 || !Array.isArray(res.body?.items)) {
    return res as unknown as GatewayResponse<Paginated<PaymentRow>>
  }
  const offerIds = [...new Set(res.body.items.map(offerIdOf).filter((v): v is string => !!v))]
  const guarantees = await buildGuaranteeMap(offerIds)
  const now = new Date()
  const items: PaymentRow[] = res.body.items.map((payment) => {
    const offerId = offerIdOf(payment)
    return {
      ...payment,
      guarantee: offerId ? computeGuarantee(payment.paidAt, guarantees.get(offerId), now) : null,
    }
  })
  return { status: 200, body: { ...res.body, items } }
}

/** Detalhe da transação com a garantia anexada. */
export async function getPaymentWithGuarantee(id: string): Promise<GatewayResponse<PaymentRow>> {
  const res = await getPayment(id)
  if (res.status !== 200 || !res.body) return res as unknown as GatewayResponse<PaymentRow>
  const offerId = offerIdOf(res.body)
  const guarantees = await buildGuaranteeMap(offerId ? [offerId] : [])
  return {
    status: 200,
    body: {
      ...res.body,
      guarantee: offerId ? computeGuarantee(res.body.paidAt, guarantees.get(offerId)) : null,
    },
  }
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
// (densificação/agregação/clamp são puras e vivem em `@/lib/sales-series` —
// unit-testadas via bun test.)

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

/**
 * Série diária densa p/ o painel. Com `productId`, resolve as ofertas do produto
 * no catálogo e filtra as vendas por `offerIds` (a venda referencia a oferta via
 * `metadata.offerId`); produto sem ofertas → série zerada (sem ir ao payments).
 * A janela é SANEADA (`clampWindow`) — query é input mesmo vindo de admin.
 */
export async function getDailyPaymentsStats(p: {
  from?: string
  to?: string
  productId?: string
}): Promise<GatewayResponse<DailyPaymentStats>> {
  const rawTo = parseDate(p.to) ?? new Date()
  const rawFrom = parseDate(p.from) ?? new Date(rawTo.getTime() - 30 * DAY_MS)
  const { from, to } = clampWindow(rawFrom, rawTo)

  let offerIds: string[] | undefined
  if (p.productId) {
    const offers = await listOffers({ productId: p.productId, limit: 100 })
    if (offers.status !== 200) {
      return offers as unknown as GatewayResponse<DailyPaymentStats>
    }
    offerIds = offers.body.items.map((o) => o.id)
    if (offerIds.length === 0) return { status: 200, body: buildStats(from, to, []) }
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
  return { status: 200, body: buildStats(from, to, res.body.days ?? []) }
}
