import type { APIRoute } from 'astro'
import { getDb } from '../../../../db/client'
import { getFunnelByKey } from '../../../../funnels/registry'
import { getDeps } from '../../../../server/deps'
import { makeFulfill } from '../../../../server/fulfillment'
import { handleMemberCommerce } from '../../../../server/member-commerce'
import { createMemberCommerceStore } from '../../../../server/member-commerce-store'
import { makeGrantMembers } from '../../../../server/members-grant'
import { makeResolveOffer } from '../../../../server/offer'
import { makeSendWelcome } from '../../../../server/welcome-email'

export const prerender = false
export const POST: APIRoute = ({ request, params }) => {
  const { repo, gateway, env, log } = getDeps()
  return handleMemberCommerce(request, params.action ?? '', {
    internalToken: env.FUNNEL_INTERNAL_TOKEN,
    repo,
    gateway,
    store: createMemberCommerceStore(getDb()),
    funnelUrl: process.env.FUNNEL_PUBLIC_URL ?? new URL(request.url).origin,
    defaultOfferRef: (audience) =>
      env.offerByFunnel[`${audience === 'kids' ? 'kids' : 'pro'}/comunidade-dos-criadores`],
    termsForOffer: (offer, audience) => {
      const key = Object.entries(env.offerByFunnel).find(
        ([, slug]) => slug === offer.slug || slug === offer.content?.altOffer?.slug,
      )?.[0]
      const funnel = key ? getFunnelByKey(key) : null
      if (!funnel || (funnel.audience === 'kids' ? 'kids' : 'adult') !== audience) return null
      return {
        url: new URL(`${funnel.basePath}/termos`, process.env.FUNNEL_PUBLIC_URL ?? request.url)
          .href,
        version: funnel.legal.termsVersion,
      }
    },
    checkout: {
      log,
      fulfill: makeFulfill({ repo, gateway, log }),
      grantMembers: makeGrantMembers({ gateway, resolveOffer: makeResolveOffer(env), repo, log }),
      sendWelcome: makeSendWelcome({
        gateway,
        communityUrl: env.COMMUNITY_URL,
        kidsCommunityUrl: env.KIDS_COMMUNITY_URL,
        repo,
        log,
      }),
    },
  })
}
