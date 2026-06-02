import type { APIRoute } from 'astro'
import { redeemCouponBestEffort } from '../../../server/catalog'
import { getDeps } from '../../../server/deps'
import { makeFulfill } from '../../../server/fulfillment'
import { makeGrantMembers } from '../../../server/members-grant'
import { handlePaymentWebhook } from '../../../server/webhook'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { repo, gateway, env } = getDeps()
  return handlePaymentWebhook(request, {
    repo,
    internalToken: env.FUNNEL_INTERNAL_TOKEN,
    fulfill: makeFulfill({ repo, gateway }),
    redeemCoupon: (code) => redeemCouponBestEffort(gateway, code),
    grantMembers: makeGrantMembers({ gateway, offerRef: env.CATALOG_OFFER_SLUG }),
  })
}
