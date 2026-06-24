import type { APIRoute } from 'astro'
import { quoteCheckout } from '../../../server/checkout'
import { getDeps } from '../../../server/deps'
import { makeResolveOffer } from '../../../server/offer'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { repo, gateway, env } = getDeps()
  return quoteCheckout(request, { gateway, repo, resolveOffer: makeResolveOffer(env) })
}
