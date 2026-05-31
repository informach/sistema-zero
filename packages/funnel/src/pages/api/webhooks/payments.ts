import type { APIRoute } from 'astro'
import { getDeps } from '../../../server/deps'
import { handlePaymentWebhook } from '../../../server/webhook'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { repo, env } = getDeps()
  return handlePaymentWebhook(request, { repo, internalToken: env.FUNNEL_INTERNAL_TOKEN })
}
