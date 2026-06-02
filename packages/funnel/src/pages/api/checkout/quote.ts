import type { APIRoute } from 'astro'
import { quoteCheckout } from '../../../server/checkout'
import { getDeps } from '../../../server/deps'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { gateway, env } = getDeps()
  return quoteCheckout(request, { gateway, offerSlug: env.CATALOG_OFFER_SLUG })
}
