import type { GatewayClient } from '../lib/gateway-client'

/**
 * Acesso ao catálogo (@sistemazero/catalog) via gateway. O catálogo é a FONTE DA
 * VERDADE do preço e do que está incluído. O valor cobrado no checkout vem SEMPRE
 * da cotação (servidor, autoritativo) — nunca de preço vindo do cliente.
 */

/** Resumo da oferta ativa para exibição (preço, inclusos, condições). */
export interface CatalogOfferView {
  offerId: string
  slug: string
  name: string
  priceCents: number
  compareAtPriceCents: number | null
  currency: string
  guaranteeDays: number | null
  installmentsMax: number | null
  productName: string
  /** Opt-in (de `offer.content.allowsCoupon`): se o checkout deve exibir o cupom. */
  allowsCoupon: boolean
  /** `one_time` (pagamento único) ou `subscription` (recorrente). */
  pricingMode: string
  /** Periodicidade da assinatura em meses (mensal=1, anual=12); null em one_time. */
  billingIntervalMonths: number | null
  /** Oferta IRMÃ do alternador mensal↔anual (de `content.altOffer`); null = sem alternador. */
  altOffer: { slug: string; label: string | null } | null
  includes: { name: string; isPrimary: boolean }[]
}

export type ChargeResolution =
  | { ok: true; amountInCents: number; offerId: string; couponCode: string | null }
  | { ok: false; status: number; code: string; message: string }

/** Cotação para PREVIEW na UI (cupom): preço cheio, desconto e final. */
export interface QuotePreview {
  ok: boolean
  priceCents: number
  discountCents: number
  finalPriceCents: number
  couponCode: string | null
  code?: string
  message?: string
}

/**
 * Resolve o valor AUTORITATIVO a cobrar (preço da oferta ativa, com cupom opcional).
 * Cupom informado mas inválido → erro 422 (o usuário vê "cupom inválido"); catálogo
 * fora/oferta inexistente → 502.
 */
export async function resolveCharge(
  gateway: GatewayClient,
  offerSlug: string,
  couponCode?: string,
): Promise<ChargeResolution> {
  const code = couponCode?.trim() || undefined
  const { status, body } = await gateway.quoteOffer(offerSlug, code)
  if (status === 200) {
    const q = body as {
      offerId?: unknown
      finalPriceCents?: unknown
      coupon?: { code?: string } | null
    }
    if (typeof q.offerId !== 'string' || typeof q.finalPriceCents !== 'number') {
      return {
        ok: false,
        status: 502,
        code: 'CATALOG_ERROR',
        message: 'Resposta inválida do catálogo.',
      }
    }
    return {
      ok: true,
      amountInCents: q.finalPriceCents,
      offerId: q.offerId,
      couponCode: q.coupon?.code ?? null,
    }
  }
  const errorCode = readErrorCode(body)
  // Oferta pausada/arquivada/fora da janela: o catálogo recusa a cotação (gate de
  // cobrança). Não é erro de cupom nem falha de infra — é "venda indisponível".
  if (errorCode === 'OFFER_NOT_AVAILABLE') {
    return {
      ok: false,
      status: 409,
      code: 'OFFER_UNAVAILABLE',
      message: 'Esta oferta não está disponível no momento.',
    }
  }
  if (code && errorCode !== 'OFFER_NOT_FOUND') {
    return { ok: false, status: 422, code: 'INVALID_COUPON', message: couponMessage(errorCode) }
  }
  return {
    ok: false,
    status: 502,
    code: 'CATALOG_ERROR',
    message: 'Não foi possível obter o preço da oferta.',
  }
}

/** Cotação de PREVIEW (endpoint do cupom na UI). Cupom inválido → ok:false + message. */
export async function quotePreview(
  gateway: GatewayClient,
  offerSlug: string,
  couponCode?: string,
): Promise<{ status: number; preview: QuotePreview } | { status: number; error: string }> {
  const code = couponCode?.trim() || undefined
  const { status, body } = await gateway.quoteOffer(offerSlug, code)
  if (status === 200) {
    const q = body as {
      priceCents?: number
      discountCents?: number
      finalPriceCents?: number
      coupon?: { code?: string } | null
    }
    return {
      status: 200,
      preview: {
        ok: true,
        priceCents: q.priceCents ?? 0,
        discountCents: q.discountCents ?? 0,
        finalPriceCents: q.finalPriceCents ?? q.priceCents ?? 0,
        couponCode: q.coupon?.code ?? null,
      },
    }
  }
  const errorCode = readErrorCode(body)
  if (errorCode === 'OFFER_NOT_AVAILABLE') {
    return { status: 409, error: 'Esta oferta não está disponível no momento.' }
  }
  if (code && errorCode !== 'OFFER_NOT_FOUND') {
    return {
      status: 200,
      preview: {
        ok: false,
        priceCents: 0,
        discountCents: 0,
        finalPriceCents: 0,
        couponCode: null,
        code: errorCode ?? 'INVALID_COUPON',
        message: couponMessage(errorCode),
      },
    }
  }
  return { status: 502, error: 'Não foi possível cotar a oferta.' }
}

// Cache simples da oferta ativa (exibição), isolado por slug. TTL curto — dados
// de catálogo mudam raramente. O isolamento por oferta evita servir preço/copy de
// outro funil quando o catálogo falha para um slug específico.
const offerCache = new Map<string, { view: CatalogOfferView; at: number }>()

/** Limpa o cache da oferta ativa (hook de TESTE — configs por slug mudam entre casos). */
export function clearOfferCache(): void {
  offerCache.clear()
}

/**
 * Busca a oferta ativa (com cache TTL). Em falha do catálogo, serve a última
 * conhecida (stale) ou null — a página de checkout cai para os rótulos do env.
 */
export async function getActiveOffer(
  gateway: GatewayClient,
  offerSlug: string,
  opts?: { ttlMs?: number; now?: number },
): Promise<CatalogOfferView | null> {
  const ttlMs = opts?.ttlMs ?? 60_000
  const now = opts?.now ?? Date.now()
  const cached = offerCache.get(offerSlug)
  if (cached && now - cached.at < ttlMs) {
    return cached.view
  }
  const { status, body } = await gateway.getOffer(offerSlug)
  if (status !== 200) return cached?.view ?? null
  const view = mapOffer(body)
  if (view) offerCache.set(offerSlug, { view, at: now })
  return view ?? cached?.view ?? null
}

function mapOffer(body: unknown): CatalogOfferView | null {
  if (!body || typeof body !== 'object') return null
  const o = body as Record<string, unknown>
  if (typeof o.id !== 'string' || typeof o.priceCents !== 'number') return null
  const product = (o.product ?? {}) as Record<string, unknown>
  const content = (o.content ?? {}) as Record<string, unknown>
  const includesRaw = Array.isArray(o.includes) ? (o.includes as Record<string, unknown>[]) : []
  const altRaw = (content.altOffer ?? null) as Record<string, unknown> | null
  const altOffer =
    altRaw && typeof altRaw === 'object' && typeof altRaw.slug === 'string' && altRaw.slug
      ? { slug: altRaw.slug, label: typeof altRaw.label === 'string' ? altRaw.label : null }
      : null
  return {
    offerId: o.id,
    slug: typeof o.slug === 'string' ? o.slug : '',
    name: typeof o.name === 'string' ? o.name : '',
    priceCents: o.priceCents,
    compareAtPriceCents: typeof o.compareAtPriceCents === 'number' ? o.compareAtPriceCents : null,
    currency: typeof o.currency === 'string' ? o.currency : 'BRL',
    guaranteeDays: typeof o.guaranteeDays === 'number' ? o.guaranteeDays : null,
    installmentsMax: typeof o.installmentsMax === 'number' ? o.installmentsMax : null,
    productName: typeof product.name === 'string' ? product.name : '',
    allowsCoupon: content.allowsCoupon === true,
    pricingMode: typeof o.pricingMode === 'string' ? o.pricingMode : 'one_time',
    billingIntervalMonths:
      typeof o.billingIntervalMonths === 'number' ? o.billingIntervalMonths : null,
    altOffer,
    includes: includesRaw.map((i) => ({
      name: typeof i.name === 'string' ? i.name : '',
      isPrimary: i.isPrimary === true,
    })),
  }
}

function couponMessage(code: string | null): string {
  switch (code) {
    case 'COUPON_EXHAUSTED':
      return 'Cupom esgotado.'
    case 'COUPON_NOT_APPLICABLE':
      return 'Cupom não aplicável a esta oferta.'
    default:
      return 'Cupom inválido.'
  }
}

function readErrorCode(body: unknown): string | null {
  if (body && typeof body === 'object' && 'error' in body) {
    const err = (body as { error?: unknown }).error
    if (err && typeof err === 'object' && 'code' in err) {
      const code = (err as { code?: unknown }).code
      if (typeof code === 'string') return code
    }
  }
  return null
}

/** Marca um uso do cupom (best-effort, na confirmação). Erros são engolidos. */
export async function redeemCouponBestEffort(
  gateway: GatewayClient,
  couponCode: string | null,
  idempotencyKey?: string,
  log?: (msg: string, meta?: Record<string, unknown>) => void,
): Promise<void> {
  if (!couponCode) return
  try {
    const { status } = await gateway.redeemCoupon(couponCode, idempotencyKey)
    log?.('coupon.redeem', { couponCode, idempotencyKey, status })
  } catch {
    /* contagem de uso é best-effort; o desconto já foi aplicado na cobrança */
  }
}

/** Lê um `couponCode` opcional de um corpo JSON arbitrário. */
export function readCouponCode(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'couponCode' in body) {
    const code = (body as { couponCode?: unknown }).couponCode
    if (typeof code === 'string' && code.trim()) return code.trim()
  }
  return undefined
}
