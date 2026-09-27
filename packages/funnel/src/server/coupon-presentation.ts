import { type CouponPresentation, couponRequestFromSearchParams } from '../lib/coupon-query'
import type { GatewayClient } from '../lib/gateway-client'
import { quotePreview } from './catalog'

/** Resolve uma campanha da URL sem permitir que a camada visual invente desconto. */
export async function resolveCouponPresentation(
  gateway: GatewayClient,
  offerSlug: string,
  searchParams: Pick<URLSearchParams, 'get'>,
): Promise<CouponPresentation> {
  const request = couponRequestFromSearchParams(searchParams)
  if (!request.requested) return { status: 'none' }
  if (request.invalid) {
    return {
      status: 'invalid',
      code: request.code,
      message: 'Não encontramos esse cupom para esta oferta. Confira o código.',
    }
  }

  const result = await quotePreview(gateway, offerSlug, request.code)
  if ('error' in result) {
    return {
      status: 'error',
      code: request.code,
      message: 'Não foi possível validar o cupom agora. Nenhuma cobrança foi feita.',
    }
  }

  const quote = result.preview
  if (!quote.ok || !quote.couponCode) {
    return {
      status: 'invalid',
      code: request.code,
      message: quote.message ?? 'Não encontramos esse cupom para esta oferta. Confira o código.',
    }
  }

  return {
    status: 'valid',
    code: quote.couponCode,
    listPriceCents: quote.priceCents,
    discountCents: quote.discountCents,
    finalPriceCents: quote.finalPriceCents,
  }
}
