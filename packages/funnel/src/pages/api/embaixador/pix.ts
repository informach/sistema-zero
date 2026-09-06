import type { APIRoute } from 'astro'
import { getDeps } from '../../../server/deps'
import { postAmbassadorPix } from '../../../server/referrals'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { gateway, log } = getDeps()
  return postAmbassadorPix(request, { gateway, log })
}
