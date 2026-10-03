import type { APIRoute } from 'astro'
import { communityQuizFeedback } from '../../../server/community-quiz-feedback'
import { getDeps } from '../../../server/deps'

export const prerender = false
export const POST: APIRoute = ({ request }) => {
  const { repo, env } = getDeps()
  return communityQuizFeedback(request, { repo, secureCookie: env.NODE_ENV === 'production' })
}
