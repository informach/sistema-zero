import type { APIRoute } from 'astro'
import { getDeps } from '../../server/deps'
import { recordEvent } from '../../server/leads'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { repo, env } = getDeps()
  return recordEvent(request, { repo, secureCookie: env.NODE_ENV === 'production' })
}
