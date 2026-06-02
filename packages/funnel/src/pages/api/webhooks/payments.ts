import type { APIRoute } from 'astro'
import { getDeps } from '../../../server/deps'
import { makeFulfill } from '../../../server/fulfillment'
import { handlePaymentWebhook } from '../../../server/webhook'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { repo, gateway, env } = getDeps()
  return handlePaymentWebhook(request, {
    repo,
    internalToken: env.FUNNEL_INTERNAL_TOKEN,
    fulfill: makeFulfill({ repo, gateway }),
  })
}
