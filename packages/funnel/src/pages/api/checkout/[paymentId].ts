import type { APIRoute } from 'astro'
import { pixStatus } from '../../../server/checkout'
import { getDeps } from '../../../server/deps'
import { makeFulfill } from '../../../server/fulfillment'
import { makeGrantMembers } from '../../../server/members-grant'
import { makeResolveOffer } from '../../../server/offer'
import { makeSendWelcome } from '../../../server/welcome-email'

export const prerender = false

export const GET: APIRoute = ({ request, params }) => {
  const { repo, gateway, env, log } = getDeps()
  return pixStatus(request, params.paymentId ?? '', {
    repo,
    gateway,
    resolveOffer: makeResolveOffer(env),
    fulfill: makeFulfill({ repo, gateway, log }),
    grantMembers: makeGrantMembers({ gateway, resolveOffer: makeResolveOffer(env), repo, log }),
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
