import type { APIRoute } from 'astro'
import { redeemCouponBestEffort } from '../../../server/catalog'
import { getDeps } from '../../../server/deps'
import { makeFulfill } from '../../../server/fulfillment'
import { makeGrantMembers } from '../../../server/members-grant'
import { makeResolveOffer } from '../../../server/offer'
import { handlePaymentWebhook } from '../../../server/webhook'
import { makeSendWelcome } from '../../../server/welcome-email'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { repo, gateway, env, log } = getDeps()
  return handlePaymentWebhook(request, {
    repo,
    internalToken: env.FUNNEL_INTERNAL_TOKEN,
    fulfill: makeFulfill({ repo, gateway, log }),
    redeemCoupon: (code, paymentId) => redeemCouponBestEffort(gateway, code, paymentId, log),
    grantMembers: makeGrantMembers({ gateway, resolveOffer: makeResolveOffer(env), repo, log }),
    sendWelcome: makeSendWelcome({
      gateway,
      communityUrl: env.COMMUNITY_URL,
      kidsCommunityUrl: env.KIDS_COMMUNITY_URL,
      repo,
      log,
    }),
  })
}
