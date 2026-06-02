import type { APIRoute } from 'astro'
import { startCard } from '../../../server/checkout'
import { getDeps } from '../../../server/deps'
import { makeFulfill } from '../../../server/fulfillment'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { repo, gateway, env } = getDeps()
  return startCard(request, {
    repo,
    gateway,
    offerSlug: env.CATALOG_OFFER_SLUG,
    productName: env.PRODUCT_NAME,
    productSku: env.PRODUCT_SKU,
    fulfill: makeFulfill({ repo, gateway }),
  })
}
