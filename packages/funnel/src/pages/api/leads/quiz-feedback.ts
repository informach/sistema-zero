import type { APIRoute } from 'astro'
import { getDeps } from '../../../server/deps'
import { quizFeedback } from '../../../server/quiz-feedback'

export const prerender = false
export const POST: APIRoute = ({ request }) => {
  const { repo, env } = getDeps()
  return quizFeedback(request, { repo, secureCookie: env.NODE_ENV === 'production' })
}
