import type { APIRoute } from 'astro'
import { startCard } from '../../../server/checkout'
import { getDeps } from '../../../server/deps'
import { makeFulfill } from '../../../server/fulfillment'
import { makeGrantMembers } from '../../../server/members-grant'
import { makeResolveOffer } from '../../../server/offer'
import { makeSendWelcome } from '../../../server/welcome-email'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { repo, gateway, env, log } = getDeps()
  return startCard(request, {
    repo,
    gateway,
    resolveOffer: makeResolveOffer(gateway, log),
    fulfill: makeFulfill({ repo, gateway, log }),
    grantMembers: makeGrantMembers({
      gateway,
      resolveOffer: makeResolveOffer(gateway, log),
      repo,
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
