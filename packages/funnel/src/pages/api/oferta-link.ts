import type { APIRoute } from 'astro'
import { resolveCouponOfferPath } from '../../server/coupon-link'
import { getDeps } from '../../server/deps'

export const prerender = false
export const GET: APIRoute = async ({ url }) => {
  const { gateway } = getDeps()
  const path = await resolveCouponOfferPath(
    gateway,
    url.searchParams.get('oferta') ?? '',
    url.searchParams.get('publico') ?? '',
  )
  return Response.json({ available: Boolean(path) }, { headers: { 'cache-control': 'no-store' } })
}
