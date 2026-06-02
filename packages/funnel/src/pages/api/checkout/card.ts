import type { APIRoute } from 'astro'
import { startCard } from '../../../server/checkout'
import { getDeps } from '../../../server/deps'
import { makeFulfill } from '../../../server/fulfillment'
import { makeGrantMembers } from '../../../server/members-grant'

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
    grantMembers: makeGrantMembers({ gateway, offerRef: env.CATALOG_OFFER_SLUG }),
  })
}
