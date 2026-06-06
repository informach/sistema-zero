import type { APIRoute } from 'astro'
import { startCard } from '../../../server/checkout'
import { getDeps } from '../../../server/deps'
import { makeFulfill } from '../../../server/fulfillment'
import { makeGrantMembers } from '../../../server/members-grant'
import { makeSendWelcome } from '../../../server/welcome-email'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { repo, gateway, env, log } = getDeps()
  return startCard(request, {
    repo,
    gateway,
    offerSlug: env.CATALOG_OFFER_SLUG,
    productName: env.PRODUCT_NAME,
    productSku: env.PRODUCT_SKU,
    fulfill: makeFulfill({ repo, gateway, log }),
    grantMembers: makeGrantMembers({ gateway, offerRef: env.CATALOG_OFFER_SLUG, repo, log }),
    sendWelcome: makeSendWelcome({ gateway, communityUrl: env.COMMUNITY_URL, repo, log }),
    log,
  })
}
