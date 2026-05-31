import type { APIRoute } from 'astro'
import { getDeps } from '../../server/deps'
import { saveContact } from '../../server/leads'

export const prerender = false

export const POST: APIRoute = ({ request }) => {
  const { repo, env } = getDeps()
  return saveContact(request, { repo, secureCookie: env.NODE_ENV === 'production' })
}
