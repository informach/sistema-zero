import type { APIRoute } from 'astro'
import { resolveCouponOfferPath } from '../../server/coupon-link'
import { getDeps } from '../../server/deps'
import { PageOfferUnavailableError } from '../../server/page-offer'

export const prerender = false
export const GET: APIRoute = async ({ url }) => {
  const { gateway } = getDeps()
  const headers = { 'cache-control': 'no-store' }
  try {
    const path = await resolveCouponOfferPath(
      gateway,
      url.searchParams.get('oferta') ?? '',
      url.searchParams.get('publico') ?? '',
    )
    return Response.json({ available: Boolean(path) }, { headers })
  } catch (error) {
    // Catálogo fora: "não sei agora" (503), nunca "esta oferta não tem página".
    if (!(error instanceof PageOfferUnavailableError)) throw error
    return Response.json(
      { available: null, error: 'CATALOG_UNAVAILABLE' },
      { status: 503, headers },
    )
  }
}
