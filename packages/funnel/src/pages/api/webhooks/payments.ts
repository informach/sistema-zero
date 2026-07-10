import type { APIRoute } from 'astro'
import { redeemCouponBestEffort } from '../../../server/catalog'
import { getDeps } from '../../../server/deps'
import { makeSendChargeFailed } from '../../../server/dunning'
import { makeFulfill } from '../../../server/fulfillment'
import { makeExtendMembersForCycle, makeGrantMembers } from '../../../server/members-grant'
import { makeResolveOffer } from '../../../server/offer'
import { handlePaymentWebhook } from '../../../server/webhook'
import { makeSendWelcome } from '../../../server/welcome-email'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { repo, gateway, env, log } = getDeps()
  const grantDeps = { gateway, resolveOffer: makeResolveOffer(env), repo, log }
  return handlePaymentWebhook(request, {
    repo,
    internalToken: env.FUNNEL_INTERNAL_TOKEN,
    fulfill: makeFulfill({ repo, gateway, log }),
    redeemCoupon: (code, paymentId) => redeemCouponBestEffort(gateway, code, paymentId, log),
    grantMembers: makeGrantMembers(grantDeps),
    extendMembersForCycle: makeExtendMembersForCycle(grantDeps),
    sendChargeFailed: makeSendChargeFailed({
      gateway,
      communityUrl: env.COMMUNITY_URL,
      kidsCommunityUrl: env.KIDS_COMMUNITY_URL,
      log,
    }),
    sendWelcome: makeSendWelcome({
      gateway,
      communityUrl: env.COMMUNITY_URL,
      kidsCommunityUrl: env.KIDS_COMMUNITY_URL,
      repo,
      log,
    }),
    log,
  })
}
