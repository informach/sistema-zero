import type { APIRoute } from 'astro'
import { pixStatus } from '../../../server/checkout'
import { getDeps } from '../../../server/deps'

export const prerender = false

export const GET: APIRoute = ({ request, params }) => {
  const { repo, gateway, env } = getDeps()
  return pixStatus(request, params.paymentId ?? '', {
    repo,
    gateway,
    productPriceCents: env.PRODUCT_PRICE_CENTS,
    productName: env.PRODUCT_NAME,
    productSku: env.PRODUCT_SKU,
  })
}
