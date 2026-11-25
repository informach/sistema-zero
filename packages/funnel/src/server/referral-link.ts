import { sanitizeReferralCode } from '@sistemazero/core/referrals'
import type { Env } from '../lib/env'
import type { GatewayClient } from '../lib/gateway-client'
import { originCookie } from '../lib/lead-origin'
import { resolveOfferFunnel } from './coupon-link'

export interface ReferralLinkDeps {
  env: Env
  gateway: GatewayClient
  secureCookie: boolean
  log?: (event: string, meta?: Record<string, unknown>) => void
}

/** O que o referrals devolve para um link (`GET /referrals/internal/links/...`). */
export interface ReferralLinkView {
  code: string
  audience: 'kids' | 'adult'
  sourceKind: 'ambassador' | 'campaign'
  mode: 'gift' | 'sale'
  offerSlug: string
  target: 'page' | 'checkout'
  couponCode: string | null
}

const SLUG = /^(?=.{1,80}$)[a-z0-9]+(?:-[a-z0-9]+)*$/
const COUPON = /^[A-Za-z0-9][A-Za-z0-9._-]{0,59}$/
const TOKEN = /^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,99}$/
const CHECKOUT = 'pagamento'
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'event_code'] as const
const HEADERS = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }

function text(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { ...HEADERS, 'content-type': 'text/plain; charset=utf-8' },
  })
}

export function parseReferralLinkView(body: unknown): ReferralLinkView | null {
  if (!body || typeof body !== 'object') return null
  const raw = body as Record<string, unknown>
  const code = sanitizeReferralCode(raw.code)
  if (
    !code ||
    (raw.audience !== 'kids' && raw.audience !== 'adult') ||
    (raw.sourceKind !== 'ambassador' && raw.sourceKind !== 'campaign') ||
    (raw.mode !== 'gift' && raw.mode !== 'sale') ||
    (raw.target !== 'page' && raw.target !== 'checkout') ||
    typeof raw.offerSlug !== 'string' ||
    !SLUG.test(raw.offerSlug)
  )
    return null
  const coupon =
    typeof raw.couponCode === 'string' && COUPON.test(raw.couponCode)
      ? raw.couponCode.toUpperCase()
      : null
  return {
    code,
    audience: raw.audience,
    sourceKind: raw.sourceKind,
    mode: raw.mode,
    offerSlug: raw.offerSlug,
    target: raw.target,
    couponCode: coupon,
  }
}

/**
 * `GET /i/<código>[/<oferta>][/pagamento]` (25/11/2026): o link de indicação. Resolve no
 * referrals, grava a ORIGEM no cookie (vai ao metadata do pagamento) e manda à página certa:
 * - presente → a página do presente (`/bolsa/<código>`, que mostra o estado da campanha);
 * - venda → a página da oferta ou direto o checkout (sempre com `?indicacao=` e o cupom da
 *   campanha); a irmã do alternador vai ao checkout, onde o plano se escolhe.
 * Código inexistente ou oferta fora da lista do público: 404 uniforme. Referrals fora: 502.
 */
export async function referralLinkRedirect(
  url: URL,
  params: { code?: string; offer?: string; target?: string },
  deps: ReferralLinkDeps,
): Promise<Response> {
  const code = sanitizeReferralCode(params.code)
  let offer = params.offer ?? null
  let checkout = false
  if (params.target !== undefined) {
    if (params.target !== CHECKOUT) return text('Link não encontrado.', 404)
    checkout = true
  } else if (offer === CHECKOUT) {
    offer = null
    checkout = true
  }
  if (!code || (offer !== null && !SLUG.test(offer))) return text('Link não encontrado.', 404)

  const { status, body } = await deps.gateway.resolveReferralLink(code, offer, checkout)
  // 4xx do referrals (404, validação) é link que não existe; só 5xx/timeout é "tente de novo".
  if (status >= 400 && status < 500)
    return text('Este link não existe ou não está mais ativo.', 404)
  const link = status === 200 ? parseReferralLinkView(body) : null
  if (!link) {
    deps.log?.('referral_link.resolve_failed', { status })
    return text('Não foi possível abrir este link agora. Tente de novo em instantes.', 502)
  }

  let target: URL
  if (link.mode === 'gift') {
    // Presente de oferta com página de venda: a página dela no modo presente. Sem página (o Cadê,
    // por enquanto): a página do presente, com a escolha do embaixador quando ela veio no link.
    const funnel = await resolveOfferFunnel(deps.env, deps.gateway, link.offerSlug, link.audience)
    if (funnel && !funnel.alt) {
      target = new URL(`${funnel.basePath}/oferta`, url)
      target.searchParams.set('presente', link.code)
    } else {
      target = new URL(`/bolsa/${encodeURIComponent(link.code)}`, url)
      if (offer) target.searchParams.set('oferta', link.offerSlug)
    }
  } else {
    const funnel = await resolveOfferFunnel(deps.env, deps.gateway, link.offerSlug, link.audience)
    if (!funnel) return text('Esta oferta não tem uma página de compra disponível.', 404)
    // A irmã do alternador (o anual da Comunidade, por exemplo) só se escolhe no checkout: a
    // página da oferta mostra e cota a principal (mesma régua do `/cupom`).
    const toCheckout = link.target === 'checkout' || funnel.alt
    target = new URL(`${funnel.basePath}/${toCheckout ? 'checkout' : 'oferta'}`, url)
    if (funnel.alt) target.searchParams.set('oferta', link.offerSlug)
    // O código também na URL: a página regrava o cookie (link copiado e aberto em outro
    // navegador) e o endereço antigo não redireciona de volta (sem laço).
    target.searchParams.set('indicacao', link.code)
    if (link.couponCode) target.searchParams.set('cupom', link.couponCode)
  }
  for (const key of UTM_KEYS) {
    const value = url.searchParams.get(key)
    if (value && TOKEN.test(value)) target.searchParams.set(key, value)
  }
  return new Response(null, {
    status: 302,
    headers: {
      ...HEADERS,
      location: `${target.pathname}${target.search}`,
      'set-cookie': originCookie({ version: 1, code: link.code, place: null }, deps.secureCookie),
    },
  })
}
