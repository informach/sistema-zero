import type { APIRoute } from 'astro'
import { pixStatus } from '../../../server/checkout'
import { getDeps } from '../../../server/deps'
import { makeFulfill } from '../../../server/fulfillment'
import { makeGrantMembers } from '../../../server/members-grant'

export const prerender = false

export const GET: APIRoute = ({ request, params }) => {
  const { repo, gateway, env } = getDeps()
  return pixStatus(request, params.paymentId ?? '', {
    repo,
    gateway,
    offerSlug: env.CATALOG_OFFER_SLUG,
    productName: env.PRODUCT_NAME,
    productSku: env.PRODUCT_SKU,
    fulfill: makeFulfill({ repo, gateway }),
    grantMembers: makeGrantMembers({ gateway, offerRef: env.CATALOG_OFFER_SLUG }),
  })
}
