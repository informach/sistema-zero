import type { APIRoute } from 'astro'
import { startBoleto } from '../../../server/checkout'
import { getDeps } from '../../../server/deps'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { repo, gateway, env } = getDeps()
  return startBoleto(request, {
    repo,
    gateway,
    productPriceCents: env.PRODUCT_PRICE_CENTS,
    productName: env.PRODUCT_NAME,
    productSku: env.PRODUCT_SKU,
  })
}
