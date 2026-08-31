import type { APIRoute } from 'astro'
import { getDeps } from '../../../server/deps'
import { postAmbassadorInvite } from '../../../server/referrals'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { gateway, log } = getDeps()
  return postAmbassadorInvite(request, { gateway, log })
}
