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
  SubscriptionStatsView,
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

// Micro-cache da lista de ofertas usada SÓ p/ resolver a garantia exibida: cada
// page view de transações refazia `listOffers(limit:100)` (1 hop ao catálogo). TTL
// curto POR RÉPLICA (staleness máxima = TTL; garantia é informativa). 0 fora de
// produção (testes/edição veem sempre fresco). Falha/vazio NÃO é cacheado — não
// congela um mapa vazio quando o catálogo se recupera.
const OFFERS_CACHE_TTL_MS = process.env.NODE_ENV === 'production' ? 60_000 : 0
let offersCache: { at: number; map: Map<string, number | null> } | null = null

/**
 * Mapa `offerId → guaranteeDays` do catálogo (limit 100 — suficiente p/ o
 * catálogo atual; ofertas além disso degradam p/ `null`), com micro-cache TTL.
 * Best-effort: catálogo indisponível → mapa vazio (transações seguem úteis).
 */
async function loadGuaranteeMap(): Promise<Map<string, number | null>> {
  const now = Date.now()
  if (offersCache && now - offersCache.at < OFFERS_CACHE_TTL_MS) return offersCache.map
  const map = new Map<string, number | null>()
  try {
    const res = await listOffers({ limit: 100 })
    if (res.status === 200)
      for (const offer of res.body.items) map.set(offer.id, offer.guaranteeDays)
  } catch {
    // best-effort: sem catálogo, sem garantia exibida.
  }
  if (map.size > 0) offersCache = { at: now, map }
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
  // Só toca o catálogo se ALGUMA linha tem oferta (sem isso, página sem garantia).
  const hasOffers = res.body.items.some((p) => offerIdOf(p) !== null)
  const guarantees = hasOffers ? await loadGuaranteeMap() : new Map<string, number | null>()
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
  const guarantees = offerId ? await loadGuaranteeMap() : new Map<string, number | null>()
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

/** Recorrência (ativas por intervalo + MRR + churn na janela) — cards do painel. */
export function getSubscriptionStats(p: {
  from?: string
  to?: string
}): Promise<GatewayResponse<SubscriptionStatsView>> {
  return gatewayFetch('/payments/admin/stats/subscriptions', {
    query: { from: p.from, to: p.to },
  })
}

// ── Série diária ("Gestão de vendas") ──
// (densificação/agregação/clamp são puras e vivem em `@/lib/sales-series` —
// unit-testadas via bun test.)

const OFFERS_PAGE = 100 // tamanho de página ao resolver as ofertas do produto
const OFFERS_MAX = 1000 // teto de ofertas varridas (10 páginas) — backstop anti-loop

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
    // Pagina TODAS as ofertas do produto: uma única página de 100 truncava
    // silenciosamente a série/totais de um produto com >100 ofertas (a venda
    // referencia a oferta via `metadata.offerId`). Teto de segurança em
    // OFFERS_MAX páginas (produto realista tem punhado de ofertas; o teto evita
    // loop infinito se o upstream devolver páginas cheias p/ sempre).
    const ids: string[] = []
    for (let offset = 0; offset < OFFERS_MAX; offset += OFFERS_PAGE) {
      const offers = await listOffers({ productId: p.productId, limit: OFFERS_PAGE, offset })
      if (offers.status !== 200) {
        // Falha do catálogo → código ESTÁVEL do domínio de stats (não o status/
        // code cru do catálogo, que daria um toast confuso); `forwardUpstream`
        // normaliza o corpo na borda (sem vazar interno).
        return {
          status: 502,
          body: {
            error: {
              code: 'STATS_UNAVAILABLE',
              message: 'Não foi possível resolver as ofertas do produto.',
            },
          },
        } as unknown as GatewayResponse<DailyPaymentStats>
      }
      ids.push(...offers.body.items.map((o) => o.id))
      if (offers.body.items.length < OFFERS_PAGE) break
    }
    offerIds = ids
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
