import type { APIRoute } from 'astro'
import { startBoleto } from '../../../server/checkout'
import { getDeps } from '../../../server/deps'
import { makeResolveOffer } from '../../../server/offer'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { repo, gateway, env, log } = getDeps()
  return startBoleto(request, {
    repo,
    gateway,
    resolveOffer: makeResolveOffer(env),
    log,
  })
}
