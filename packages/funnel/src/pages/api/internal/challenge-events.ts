import type { APIRoute } from 'astro'
import { ingestChallengeEvents } from '../../../server/challenge-events'
import { getDeps } from '../../../server/deps'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { repo, env } = getDeps()
  return ingestChallengeEvents(request, { repo, internalToken: env.FUNNEL_INTERNAL_TOKEN })
}
