import 'server-only'
import type {
  DailyPaymentBucket,
  DailyPaymentStats,
  Paginated,
  PaymentGuarantee,
  PaymentOps,
  PaymentRow,
  PaymentStats,
  PaymentView,
  SalesGranularity,
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

/** paidAt + guaranteeDays → janela de garantia. `null` sem paidAt/garantia configurada. */
function computeGuarantee(
  paidAt: string | null,
  guaranteeDays: number | null | undefined,
  now = new Date(),
): PaymentGuarantee | null {
  if (!paidAt || guaranteeDays == null || guaranteeDays <= 0) return null
  const paid = new Date(paidAt)
  if (Number.isNaN(paid.getTime())) return null
  const until = new Date(paid.getTime() + guaranteeDays * DAY_MS)
  const msLeft = until.getTime() - now.getTime()
  return {
    until: until.toISOString(),
    daysLeft: Math.max(0, Math.ceil(msLeft / DAY_MS)),
    expired: msLeft < 0,
    guaranteeDays,
  }
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
    granularity: 'day',
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

/** Janela longa → buckets maiores p/ o gráfico ficar legível (>90d semana, >270d mês). */
function pickGranularity(from: Date, to: Date): SalesGranularity {
  const spanDays = Math.round((to.getTime() - from.getTime()) / DAY_MS)
  if (spanDays > 270) return 'month'
  if (spanDays > 90) return 'week'
  return 'day'
}

/**
 * Início do bucket de um rótulo `YYYY-MM-DD`. A conta é UTC-pura sobre o RÓTULO
 * de dia civil (que já saiu do `dayFmt` em BRT) — sem reconversão de fuso.
 */
function bucketStart(day: string, g: SalesGranularity): string {
  if (g === 'month') return `${day.slice(0, 7)}-01`
  // Semana começa na segunda-feira (getUTCDay: 0=dom … 6=sáb).
  const d = new Date(`${day}T00:00:00Z`)
  const offset = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - offset)
  return d.toISOString().slice(0, 10)
}

/**
 * Agrega a série DENSA diária em buckets semanais/mensais. Valores monetários
 * são bigint serializado → soma via BigInt. `day` = início do bucket;
 * `periodEnd` = último dia coberto (p/ o tooltip mostrar o intervalo).
 * Os `totals` do período não mudam (já somados sobre os dias densos).
 */
function aggregate(days: DailyPaymentBucket[], g: SalesGranularity): DailyPaymentBucket[] {
  if (g === 'day') return days
  const out: DailyPaymentBucket[] = []
  let current: DailyPaymentBucket | null = null
  let gross = 0n
  let refunded = 0n
  const flush = () => {
    if (!current) return
    current.grossAmountInCents = gross.toString()
    current.refundedAmountInCents = refunded.toString()
    current.netAmountInCents = (gross - refunded).toString()
    out.push(current)
  }
  for (const b of days) {
    const key = bucketStart(b.day, g)
    if (!current || current.day !== key) {
      flush()
      current = { ...zeroBucket(key), periodEnd: b.day }
      gross = 0n
      refunded = 0n
    }
    gross += BigInt(b.grossAmountInCents)
    refunded += BigInt(b.refundedAmountInCents)
    current.transactions += b.transactions
    current.cancellations += b.cancellations
    current.periodEnd = b.day
  }
  flush()
  return out
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

/** Densifica e, em janela longa, agrega (semana/mês) — os totais não mudam. */
function buildStats(from: Date, to: Date, sparse: DailyPaymentBucket[]): DailyPaymentStats {
  const stats = densify(from, to, sparse)
  const granularity = pickGranularity(from, to)
  return { ...stats, granularity, days: aggregate(stats.days, granularity) }
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
