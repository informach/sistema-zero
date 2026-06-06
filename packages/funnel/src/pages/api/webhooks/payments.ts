import type { APIRoute } from 'astro'
import { redeemCouponBestEffort } from '../../../server/catalog'
import { getDeps } from '../../../server/deps'
import { makeFulfill } from '../../../server/fulfillment'
import { makeGrantMembers } from '../../../server/members-grant'
import { handlePaymentWebhook } from '../../../server/webhook'
import { makeSendWelcome } from '../../../server/welcome-email'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { repo, gateway, env, log } = getDeps()
  return handlePaymentWebhook(request, {
    repo,
    internalToken: env.FUNNEL_INTERNAL_TOKEN,
    fulfill: makeFulfill({ repo, gateway, log }),
    redeemCoupon: (code) => redeemCouponBestEffort(gateway, code, log),
    grantMembers: makeGrantMembers({ gateway, offerRef: env.CATALOG_OFFER_SLUG, repo, log }),
    sendWelcome: makeSendWelcome({ gateway, communityUrl: env.COMMUNITY_URL, repo, log }),
  })
}
